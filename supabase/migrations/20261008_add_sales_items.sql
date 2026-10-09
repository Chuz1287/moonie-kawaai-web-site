alter table public.sales
  add column if not exists items jsonb not null default '[]'::jsonb;
