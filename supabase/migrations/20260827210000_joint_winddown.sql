-- Joint BofA 5927 wind-down checklist (move autopays to 8541 before close).
create table if not exists public.joint_winddown (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric,
  currency text not null default 'USD',
  split text not null default '50/50' check (split in ('50/50', '100% Dima')),
  target_account text,
  status text not null default 'todo' check (status in ('todo', 'moved', 'na')),
  moved_on date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.joint_winddown enable row level security;

create policy "authenticated_all_joint_winddown" on public.joint_winddown
  for all to authenticated using (true) with check (true);

insert into public.joint_winddown (label, amount, currency, split, target_account, status)
select v.label, v.amount, 'USD', v.split, 'Bank of America — 8541', 'todo'
from (values
  ('Bilt rent', 2039.66::numeric, '50/50'),
  ('LA Care (health insurance)', 386.17::numeric, '50/50'),
  ('Apple/Microsoft subs', 21.96::numeric, '50/50'),
  ('Dog walking (Zelle Oliinyk)', 115::numeric, '100% Dima')
) as v(label, amount, split)
where not exists (select 1 from public.joint_winddown limit 1);
