-- Monthly obligations: day-of-month for projected payment calendar.
alter table public.obligations add column if not exists due_day smallint
  check (due_day between 1 and 31);

-- Known due days (others filled manually in dashboard).
update obligations set due_day = 10
where status = 'active' and due_day is null
  and (name ilike '%рсхб%' or name ilike '%rshb%' or name ilike '%ипотек%');

update obligations set due_day = 14
where status = 'active' and due_day is null
  and name ilike '%bridgecrest%';

update obligations set due_day = 1
where status = 'active' and due_day is null
  and name ilike '%apple%' and name not ilike '%card%';

update obligations set apr = 58.49
where name ilike '%1916%' and (apr is null or apr < 58);
