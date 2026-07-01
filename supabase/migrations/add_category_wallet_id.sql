-- Run in Supabase SQL Editor if you already created the database before wallet linking
alter table public.categories add column if not exists wallet_id text;
