create table if not exists public.catalog_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  percentage_adjustment numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_templates_percentage_valid check (
    percentage_adjustment is null or percentage_adjustment >= -100
  )
);

create table if not exists public.catalog_template_prices (
  template_id uuid not null references public.catalog_templates (id) on delete cascade,
  product_code text not null references public.products ("Codigo") on update cascade on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (template_id, product_code)
);

create index if not exists idx_catalog_template_prices_product_code
  on public.catalog_template_prices (product_code);

grant select, insert, update, delete on public.catalog_templates to anon, authenticated;
grant select, insert, update, delete on public.catalog_template_prices to anon, authenticated;
grant select, insert, update, delete on public.catalog_templates, public.catalog_template_prices to service_role;

alter table public.catalog_templates enable row level security;
alter table public.catalog_template_prices enable row level security;

drop policy if exists "Public can manage catalog templates" on public.catalog_templates;
create policy "Public can manage catalog templates" on public.catalog_templates
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public can manage catalog template prices" on public.catalog_template_prices;
create policy "Public can manage catalog template prices" on public.catalog_template_prices
  for all to anon, authenticated
  using (true)
  with check (true);

insert into public.catalog_templates (name)
values ('Público')
on conflict (name) do nothing;
