-- Keep a sale mutation and all of its inventory deltas in one database transaction.
-- The JSON items must carry stable productId values; display names are never used
-- as inventory keys.

create or replace function public.update_sale_with_inventory(
  sale_id text,
  new_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row public.sales%rowtype;
  old_items jsonb;
  item jsonb;
  product_key text;
  old_quantity integer;
  new_quantity integer;
  current_stock integer;
  next_stock integer;
  new_total numeric(12, 2);
begin
  if jsonb_typeof(new_items) <> 'array' or jsonb_array_length(new_items) = 0 then
    raise exception 'La venta debe conservar al menos una pieza.';
  end if;

  select * into sale_row
  from public.sales
  where id::text = sale_id
  for update;

  if not found then
    raise exception 'La venta no existe.';
  end if;

  old_items := coalesce(sale_row.items, '[]'::jsonb);
  if jsonb_array_length(old_items) = 0 then
    -- Support older single-product rows only when the row has a stable product ID.
    product_key := coalesce(to_jsonb(sale_row)->>'productId', to_jsonb(sale_row)->>'product_id');
    if product_key is null and (
      coalesce((to_jsonb(sale_row)->>'cantidad')::integer, 0) > 0
      or coalesce((to_jsonb(sale_row)->>'total')::numeric, 0) > 0
    ) then
      raise exception 'Esta venta antigua no tiene ID de producto; no se puede modificar el inventario de forma segura.';
    end if;
    if product_key is not null then
      old_items := jsonb_build_array(jsonb_build_object(
        'productId', product_key,
        'quantity', coalesce((to_jsonb(sale_row)->>'cantidad')::integer, 0)
      ));
    end if;
  end if;

  for item in select value from jsonb_array_elements(old_items)
  loop
    product_key := coalesce(item->>'productId', item->>'product_id');
    if coalesce((item->>'quantity')::integer, 0) > 0
      and (product_key is null or product_key !~ '^[0-9]+$')
    then
      raise exception 'La venta antigua no tiene IDs de producto para todas sus piezas; no se modificó el inventario.';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(new_items)
  loop
    product_key := coalesce(item->>'productId', item->>'product_id');
    if product_key is null or product_key !~ '^[0-9]+$'
      or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]*$'
      or coalesce(item->>'unitPrice', item->>'precio_venta_unitario', '') !~ '^[0-9]+([.][0-9]{1,2})?$'
    then
      raise exception 'La venta contiene una pieza o un precio inválido.';
    end if;
  end loop;

  -- Lock products in stable order, then apply the net quantity change. The
  -- complete function (including the sale row write) commits or rolls back.
  for product_key in
    select distinct item_id
    from (
      select coalesce(value->>'productId', value->>'product_id') as item_id
      from jsonb_array_elements(old_items)
      union all
      select coalesce(value->>'productId', value->>'product_id') as item_id
      from jsonb_array_elements(new_items)
    ) as all_items
    where item_id is not null
    order by item_id
  loop
    if product_key !~ '^[0-9]+$' then
      raise exception 'La venta contiene un ID de producto inválido.';
    end if;

    select coalesce(sum((value->>'quantity')::integer), 0)::integer
      into old_quantity
    from jsonb_array_elements(old_items)
    where coalesce(value->>'productId', value->>'product_id') = product_key;
    select coalesce(sum((value->>'quantity')::integer), 0)::integer
      into new_quantity
    from jsonb_array_elements(new_items)
    where coalesce(value->>'productId', value->>'product_id') = product_key;

    select stock into current_stock
    from public.products
    where id = product_key::bigint
    for update;
    if not found then
      raise exception 'El producto % ya no existe; no se modificó la venta.', product_key;
    end if;

    next_stock := current_stock + old_quantity - new_quantity;
    if next_stock < 0 then
      raise exception 'No hay existencias suficientes para actualizar la venta del producto %.', product_key;
    end if;
    update public.products set stock = next_stock where id = product_key::bigint;
  end loop;

  select coalesce(sum(
    (coalesce(value->>'unitPrice', value->>'precio_venta_unitario'))::numeric *
    (value->>'quantity')::integer
  ), 0)::numeric(12, 2)
    into new_total
  from jsonb_array_elements(new_items);

  update public.sales
  set items = new_items,
      total = new_total
  where id::text = sale_id;
end;
$$;

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
    if (quantity > 0 or coalesce((to_jsonb(sale_row)->>'total')::numeric, 0) > 0) and product_key is null then
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

revoke all on function public.update_sale_with_inventory(text, jsonb) from public, anon, authenticated;
revoke all on function public.delete_sale_with_inventory(text) from public, anon, authenticated;
grant execute on function public.update_sale_with_inventory(text, jsonb) to service_role;
grant execute on function public.delete_sale_with_inventory(text) to service_role;
