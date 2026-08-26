-- Компас · finance agent · схема (уже применена к проекту twlksroujucxdlyaaqkp)

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null check (currency in ('RUB','USD')),
  type text not null,                 -- checking/cash/savings/brokerage/credit_card/real_estate/vehicle/receivable
  zone text not null check (zone in ('RF','US')),
  balance numeric not null default 0,
  credit_limit numeric,
  in_net_worth boolean not null default true,
  balance_date date,
  notes text,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('income','expense','transfer','obligation')),
  zone text not null check (zone in ('RF','US','both')),
  merchant_patterns text[],           -- автокатегоризация
  notes text
);

create table obligations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('loan','credit_card','tax_rf','tax_us','other')),
  currency text not null check (currency in ('RUB','USD')),
  balance numeric not null default 0,
  apr numeric,
  min_payment numeric,
  monthly_payment numeric,
  due_date date,
  payoff_date date,
  periodicity text,                   -- once/monthly/quarterly/yearly
  account_id uuid references accounts(id),
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  ts date not null,
  amount numeric not null,
  currency text not null check (currency in ('RUB','USD')),
  type text not null check (type in ('income','expense','conversion','transfer')),
  account_id uuid references accounts(id),
  category_id uuid references categories(id),
  merchant text,
  fx_rate numeric,                    -- для конвертаций
  fee numeric,                        -- для конвертаций
  source text,                        -- statement/manual/teller
  external_id text,                   -- дедуп из источника
  reconciled boolean default false,
  notes text,
  created_at timestamptz default now()
);
create unique index transactions_source_ext_uq
  on transactions (source, external_id) where external_id is not null;

create table fx_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  rub_per_usd numeric not null,
  kind text not null check (kind in ('cbr','effective','spot')),
  notes text
);

create table agent_memory (
  id uuid primary key default gen_random_uuid(),
  mem_key text,
  content text,
  created_at timestamptz default now()
);

create table sync_state (
  id uuid primary key default gen_random_uuid(),
  connector text not null,            -- import connector id (e.g. pdf_import)
  cursor text,
  last_synced_at timestamptz,
  status text
);
