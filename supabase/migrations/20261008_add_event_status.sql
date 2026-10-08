alter table public.events
  add column if not exists is_active boolean not null default true;
