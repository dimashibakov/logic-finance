# Migration notes

## `20260824120000_transactions_account_external_uq.sql`

Creates a **partial** unique index on `(account_id, external_id)` where both are non-null.
Index name: `transactions_account_external_uq`.

This is **not** the same as `transactions_source_ext_uq` in `supabase-schema.sql`
(partial unique on `(source, external_id)`). Both indexes can coexist.

If manual/API upserts use `onConflict: "account_id,external_id"` but only `source_ext_uq`
existed in prod, Postgres would not dedupe on account+external — see
`20260901173137_add_unique_transactions_account_external.sql` (non-partial
`transactions_account_ext_uq`), applied on remote 2026-09-01.

## Remote-only history

After syncing local files, if remote already has `20260901173137` and `20260901180000`
objects, run:

```bash
supabase migration repair --status applied 20260901173137
supabase migration repair --status applied 20260901180000
supabase db push --dry-run
```

Do not drop or recreate prod objects — migrations here are idempotent no-ops.
