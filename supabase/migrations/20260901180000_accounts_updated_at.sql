-- Applied manually on remote before this file. Idempotent: safe to replay via db push.
alter table public.accounts
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_accounts_updated_at on public.accounts;
drop trigger if exists accounts_set_updated_at on public.accounts;

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row
  execute function public.set_accounts_updated_at();

update public.accounts
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
