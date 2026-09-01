-- Applied on remote via MCP (2026-09-01). Idempotent replay for local history sync.
create unique index if not exists transactions_account_ext_uq
  on public.transactions (account_id, external_id);
