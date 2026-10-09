alter table public.events
  add column if not exists start_date date,
  add column if not exists end_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_date_range_valid'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_date_range_valid
      check (start_date is null or end_date is null or start_date <= end_date);
  end if;
end
$$;
