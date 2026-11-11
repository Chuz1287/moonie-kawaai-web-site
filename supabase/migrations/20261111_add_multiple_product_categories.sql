alter table public.products
  add column if not exists categorias text[] not null default '{}';

update public.products
set categorias = array[btrim(tipo)]
where cardinality(categorias) = 0
  and nullif(btrim(tipo), '') is not null;

insert into public.product_categories (name)
select distinct category
from public.products
cross join lateral unnest(categorias) as product_category(category)
where nullif(btrim(category), '') is not null
on conflict (name) do nothing;

create index if not exists idx_products_categories
  on public.products using gin (categorias);

grant select, insert, update, delete on public.product_categories to anon, authenticated;
grant select, insert, update, delete on public.product_series to anon, authenticated;

alter table public.product_categories enable row level security;
alter table public.product_series enable row level security;

drop policy if exists "Public can manage product categories" on public.product_categories;
create policy "Public can manage product categories" on public.product_categories
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public can manage product series" on public.product_series;
create policy "Public can manage product series" on public.product_series
  for all to anon, authenticated
  using (true)
  with check (true);

create or replace function public.rename_product_option(
  option_type text,
  old_name text,
  new_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  option_table text;
  option_exists boolean;
  duplicate_exists boolean;
begin
  if option_type = 'category' then
    option_table := 'product_categories';

    select exists(select 1 from public.product_categories where name = old_name)
      or exists(
        select 1 from public.products
        where btrim(tipo) = old_name
          or old_name = any(coalesce(categorias, '{}'::text[]))
      )
      into option_exists;

    if not option_exists then
      raise exception 'No se encontró la opción indicada.' using errcode = 'P0002';
    end if;

    select exists(select 1 from public.product_categories where name = new_name)
      or exists(
        select 1 from public.products
        where btrim(tipo) = new_name
          or new_name = any(coalesce(categorias, '{}'::text[]))
      )
      into duplicate_exists;

    if duplicate_exists then
      raise exception 'Ya existe una opción con ese nombre.' using errcode = '23505';
    end if;

    update public.products
    set tipo = case when btrim(tipo) = old_name then new_name else tipo end,
        categorias = array(
          select mapped.category
          from (
            select
              case when value = old_name then new_name else value end as category,
              min(ordinal) as position
            from unnest(categorias) with ordinality as existing(value, ordinal)
            group by case when value = old_name then new_name else value end
          ) as mapped
          order by mapped.position
        )
    where btrim(tipo) = old_name
      or old_name = any(coalesce(categorias, '{}'::text[]));
  elsif option_type = 'series' then
    option_table := 'product_series';

    select exists(select 1 from public.product_series where name = old_name)
      or exists(select 1 from public.products where btrim(serie) = old_name)
      into option_exists;
    if not option_exists then
      raise exception 'No se encontró la opción indicada.' using errcode = 'P0002';
    end if;

    select exists(select 1 from public.product_series where name = new_name)
      or exists(select 1 from public.products where btrim(serie) = new_name)
      into duplicate_exists;
    if duplicate_exists then
      raise exception 'Ya existe una opción con ese nombre.' using errcode = '23505';
    end if;

    update public.products set serie = new_name where btrim(serie) = old_name;
  else
    raise exception 'Tipo de opción no válido.' using errcode = '22023';
  end if;

  execute format('delete from public.%I where name = $1', option_table) using old_name;
  execute format('insert into public.%I (name) values ($1) on conflict (name) do nothing', option_table)
    using new_name;
end;
$$;

create or replace function public.delete_product_option(
  option_type text,
  option_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  option_table text;
  option_exists boolean;
  is_used boolean;
begin
  if option_type = 'category' then
    option_table := 'product_categories';

    select exists(select 1 from public.product_categories where name = option_name)
      or exists(
        select 1 from public.products
        where btrim(tipo) = option_name
          or option_name = any(coalesce(categorias, '{}'::text[]))
      )
      into option_exists;

    select exists(
      select 1 from public.products
      where btrim(tipo) = option_name
        or option_name = any(coalesce(categorias, '{}'::text[]))
    )
    into is_used;
  elsif option_type = 'series' then
    option_table := 'product_series';

    select exists(select 1 from public.product_series where name = option_name)
      or exists(select 1 from public.products where btrim(serie) = option_name)
      into option_exists;

    select exists(select 1 from public.products where btrim(serie) = option_name)
      into is_used;
  else
    raise exception 'Tipo de opción no válido.' using errcode = '22023';
  end if;

  if not option_exists then
    raise exception 'No se encontró la opción indicada.' using errcode = 'P0002';
  end if;
  if is_used then
    raise exception 'No se puede borrar una opción que está en uso.' using errcode = '23503';
  end if;

  execute format('delete from public.%I where name = $1', option_table) using option_name;
end;
$$;

revoke all on function public.rename_product_option(text, text, text) from public;
revoke all on function public.delete_product_option(text, text) from public;
grant execute on function public.rename_product_option(text, text, text) to anon, authenticated;
grant execute on function public.delete_product_option(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
