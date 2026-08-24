-- Idempotent statement import: one row per account + external_id
create unique index if not exists transactions_account_external_uq
  on transactions (account_id, external_id)
  where external_id is not null and account_id is not null;
