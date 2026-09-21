-- RLS for sinking funds (table public.funds must already exist).

alter table funds enable row level security;

drop policy if exists "authenticated_all_funds" on funds;
create policy "authenticated_all_funds" on funds
  for all to authenticated using (true) with check (true);
