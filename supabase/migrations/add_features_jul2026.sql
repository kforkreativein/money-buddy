-- Run in Supabase SQL Editor if database was created before these features
alter table public.category_transfers add column if not exists expense_txn_id text;
alter table public.category_transfers add column if not exists income_txn_id text;
alter table public.user_settings add column if not exists streak_count integer not null default 0;
alter table public.user_settings add column if not exists last_visit_date text;
