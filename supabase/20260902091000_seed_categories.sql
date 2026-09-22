-- Seed reference categories (idempotent). Keeps fresh environments in sync with prod.
-- Includes categories added during data-entry via SQL editor:
--   Loan repayment (Dina), TVE float (reimbursable), Deposit refund (rental).

insert into public.categories (name, kind, zone) select 'Reconciliation', 'expense', 'both' where not exists (select 1 from public.categories where name = 'Reconciliation');
insert into public.categories (name, kind, zone) select 'Bank fees (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Bank fees (RF)');
insert into public.categories (name, kind, zone) select 'Books & leisure (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Books & leisure (RF)');
insert into public.categories (name, kind, zone) select 'Cafes & restaurants (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Cafes & restaurants (RF)');
insert into public.categories (name, kind, zone) select 'Gifts', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Gifts');
insert into public.categories (name, kind, zone) select 'Groceries (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Groceries (RF)');
insert into public.categories (name, kind, zone) select 'Health & fitness (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Health & fitness (RF)');
insert into public.categories (name, kind, zone) select 'Leisure & entertainment (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Leisure & entertainment (RF)');
insert into public.categories (name, kind, zone) select 'Living in RF (other)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Living in RF (other)');
insert into public.categories (name, kind, zone) select 'Phone (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Phone (RF)');
insert into public.categories (name, kind, zone) select 'Shopping & marketplace (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Shopping & marketplace (RF)');
insert into public.categories (name, kind, zone) select 'Transport (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Transport (RF)');
insert into public.categories (name, kind, zone) select 'Transport & mobility (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Transport & mobility (RF)');
insert into public.categories (name, kind, zone) select 'Travel & tickets (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Travel & tickets (RF)');
insert into public.categories (name, kind, zone) select 'Utilities (RF)', 'expense', 'RF' where not exists (select 1 from public.categories where name = 'Utilities (RF)');
insert into public.categories (name, kind, zone) select 'Auto: gas & repair', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Auto: gas & repair');
insert into public.categories (name, kind, zone) select 'Auto: insurance', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Auto: insurance');
insert into public.categories (name, kind, zone) select 'Cafes & restaurants', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Cafes & restaurants');
insert into public.categories (name, kind, zone) select 'Clothing', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Clothing');
insert into public.categories (name, kind, zone) select 'Connectivity (mobile + internet)', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Connectivity (mobile + internet)');
insert into public.categories (name, kind, zone) select 'Fitness & health', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Fitness & health');
insert into public.categories (name, kind, zone) select 'Groceries & household', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Groceries & household');
insert into public.categories (name, kind, zone) select 'Health insurance', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Health insurance');
insert into public.categories (name, kind, zone) select 'Investment in Zenlo LLC', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Investment in Zenlo LLC');
insert into public.categories (name, kind, zone) select 'Pet & dog walking (US)', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Pet & dog walking (US)');
insert into public.categories (name, kind, zone) select 'Rent LA', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Rent LA');
insert into public.categories (name, kind, zone) select 'Subscriptions & services', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Subscriptions & services');
insert into public.categories (name, kind, zone) select 'Utilities (US)', 'expense', 'US' where not exists (select 1 from public.categories where name = 'Utilities (US)');
insert into public.categories (name, kind, zone) select 'Dividends (TVE LLC)', 'income', 'RF' where not exists (select 1 from public.categories where name = 'Dividends (TVE LLC)');
insert into public.categories (name, kind, zone) select 'Rental income', 'income', 'RF' where not exists (select 1 from public.categories where name = 'Rental income');
insert into public.categories (name, kind, zone) select 'Conversion RUB to USD', 'transfer', 'both' where not exists (select 1 from public.categories where name = 'Conversion RUB to USD');
insert into public.categories (name, kind, zone) select 'Loan repayment (Dina)', 'transfer', 'both' where not exists (select 1 from public.categories where name = 'Loan repayment (Dina)');
insert into public.categories (name, kind, zone) select 'TVE float (reimbursable)', 'transfer', 'both' where not exists (select 1 from public.categories where name = 'TVE float (reimbursable)');
insert into public.categories (name, kind, zone) select 'Deposit refund (rental)', 'transfer', 'RF' where not exists (select 1 from public.categories where name = 'Deposit refund (rental)');
