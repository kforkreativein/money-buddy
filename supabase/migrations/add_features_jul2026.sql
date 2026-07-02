-- Run in Supabase SQL Editor if database was created before these features
alter table public.category_transfers add column if not exists expense_txn_id text;
alter table public.category_transfers add column if not exists income_txn_id text;
alter table public.user_settings add column if not exists wallet_order text;
alter table public.user_settings add column if not exists notifications_enabled boolean not null default false;
alter table public.transactions add column if not exists recurring_rule_id text;
alter table public.recurring_rules add column if not exists linked_transaction_id text;
