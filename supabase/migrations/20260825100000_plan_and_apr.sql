-- Plan table (source of truth for monthly budgets)
create table if not exists plan (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  category_id uuid references categories(id) on delete cascade,
  planned_amount numeric not null,
  currency text not null check (currency in ('RUB','USD')),
  unique (month, category_id, currency)
);

-- Reconciliation category for balance adjustments
insert into categories (name, kind, zone)
select 'Reconciliation', 'expense', 'both'
where not exists (select 1 from categories where name = 'Reconciliation');

-- APR backfill (known values)
update obligations set apr = 24.99 where name ilike '%alfa%потреб%' and apr is null;
update obligations set apr = 28.49 where name ilike '%amex%' and apr is null;
update obligations set apr = 59.8 where name ilike '%0685%' and apr is null;
update obligations set apr = 9 where kind = 'loan' and name ilike '%ипотек%' and apr is null;
update obligations set apr = 11 where kind = 'loan' and name ilike '%авто%' and apr is null;
