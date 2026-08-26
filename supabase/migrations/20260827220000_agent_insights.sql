-- Read-only agent observations; deduped notifications for the owner.
create table if not exists public.agent_insights (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  kind text not null check (kind in ('payment', 'coverage', 'fx', 'tax', 'liquidity', 'exposure', 'winddown')),
  severity text not null default 'info' check (severity in ('info', 'warn', 'urgent')),
  title text not null,
  body text,
  action_route text,
  status text not null default 'active' check (status in ('active', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_insights enable row level security;

create policy "authenticated_all_agent_insights" on public.agent_insights
  for all to authenticated using (true) with check (true);

create index if not exists agent_insights_status_updated_idx
  on public.agent_insights (status, updated_at desc);
