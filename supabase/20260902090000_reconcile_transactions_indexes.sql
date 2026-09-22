-- Reconcile transactions unique indexes (defuse partial-index mine from 20260824).
-- On a clean replay 20260824 may create a PARTIAL (account_id, external_id) index, which
-- PostgREST cannot use as an ON CONFLICT arbiter -> manual entry / import breaks.
-- This migration runs last and authoritatively pins the correct state.

drop index if exists public.transactions_account_ext_uq;
create unique index if not exists transactions_account_ext_uq
  on public.transactions (account_id, external_id);            -- FULL: inferable for ON CONFLICT

create unique index if not exists transactions_source_ext_uq
  on public.transactions (source, external_id)
  where external_id is not null;                                -- ensure it exists on fresh env too
