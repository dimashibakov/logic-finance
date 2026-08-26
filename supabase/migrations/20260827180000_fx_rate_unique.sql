-- Idempotent upsert for CBR spot rates by calendar date.
create unique index if not exists fx_rates_date_kind_uq on public.fx_rates (rate_date, kind);
