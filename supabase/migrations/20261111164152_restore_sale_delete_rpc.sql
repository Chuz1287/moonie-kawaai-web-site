-- Ensure deployments have the transactional function used by DELETE /api/sales/[id].
-- Restocking every sale line and deleting its history row happen in one transaction.
create or replace function public.delete_sale_with_inventory(sale_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row public.sales%rowtype;
  sale_items jsonb;
  item jsonb;
  product_key text;
  quantity integer;
  current_stock integer;
begin
  select * into sale_row
  from public.sales
  where id::text = sale_id
  for update;

  if not found then
    raise exception 'La venta no existe.';
  end if;

  sale_items := coalesce(sale_row.items, '[]'::jsonb);
  if jsonb_array_length(sale_items) = 0 then
    product_key := coalesce(to_jsonb(sale_row)->>'productId', to_jsonb(sale_row)->>'product_id');
    quantity := coalesce((to_jsonb(sale_row)->>'cantidad')::integer, 0);
    if (quantity > 0 or coalesce((to_jsonb(sale_row)->>'total')::numeric, 0) > 0)
      and product_key is null
    then
      raise exception 'Esta venta antigua no tiene ID de producto; no se puede borrar sin arriesgar el inventario.';
    end if;
    if product_key is not null and quantity > 0 then
      sale_items := jsonb_build_array(jsonb_build_object('productId', product_key, 'quantity', quantity));
    end if;
  end if;

  for item in select value from jsonb_array_elements(sale_items)
  loop
    product_key := coalesce(item->>'productId', item->>'product_id');
    if coalesce((item->>'quantity')::integer, 0) > 0
      and (product_key is null or product_key !~ '^[0-9]+$')
    then
      raise exception 'Esta venta no tiene IDs de producto para todas sus piezas; no se borró para proteger el inventario.';
    end if;
  end loop;

  -- Lock product rows in stable order to avoid deadlocks for multi-product sales.
  for product_key in
    select distinct coalesce(value->>'productId', value->>'product_id') as item_id
    from jsonb_array_elements(sale_items)
    where coalesce(value->>'productId', value->>'product_id') is not null
    order by item_id
  loop
    if product_key !~ '^[0-9]+$' then
      raise exception 'La venta contiene un ID de producto inválido.';
    end if;

    select coalesce(sum((value->>'quantity')::integer), 0)::integer
      into quantity
    from jsonb_array_elements(sale_items)
    where coalesce(value->>'productId', value->>'product_id') = product_key;

    select stock into current_stock
    from public.products
    where id = product_key::bigint
    for update;
    if not found then
      raise exception 'El producto % ya no existe; no se borró la venta.', product_key;
    end if;

    update public.products
    set stock = current_stock + quantity
    where id = product_key::bigint;
  end loop;

  delete from public.sales where id::text = sale_id;
end;
$$;

revoke all on function public.delete_sale_with_inventory(text) from public, anon, authenticated;
grant execute on function public.delete_sale_with_inventory(text) to service_role;
