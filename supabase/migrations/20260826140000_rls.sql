-- Enable RLS on all data tables; authenticated users only (no anon policies).
-- Apply ONLY after session auth (A+B) is deployed and verified.

alter table accounts enable row level security;
create policy "authenticated_all_accounts" on accounts
  for all to authenticated using (true) with check (true);

alter table categories enable row level security;
create policy "authenticated_all_categories" on categories
  for all to authenticated using (true) with check (true);

alter table obligations enable row level security;
create policy "authenticated_all_obligations" on obligations
  for all to authenticated using (true) with check (true);

alter table transactions enable row level security;
create policy "authenticated_all_transactions" on transactions
  for all to authenticated using (true) with check (true);

alter table fx_rates enable row level security;
create policy "authenticated_all_fx_rates" on fx_rates
  for all to authenticated using (true) with check (true);

alter table plan enable row level security;
create policy "authenticated_all_plan" on plan
  for all to authenticated using (true) with check (true);

alter table agent_memory enable row level security;
create policy "authenticated_all_agent_memory" on agent_memory
  for all to authenticated using (true) with check (true);

alter table sync_state enable row level security;
create policy "authenticated_all_sync_state" on sync_state
  for all to authenticated using (true) with check (true);
