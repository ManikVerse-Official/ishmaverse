-- ============================================================================
-- Ishmaverse · Step 1: Security & Sales Ledger
-- ----------------------------------------------------------------------------
-- Goals
--   1. Admin access is a *server-verified* Supabase Auth user (no client flag,
--      no plain-text password).
--   2. Every paid card + transaction is written by an Edge Function using the
--      service-role key. Anonymous clients can no longer INSERT into
--      greeting_cards or transactions, so the payment gateway cannot be bypassed.
--   3. The Sales Ledger always has a matching row per paid card, and receipts
--      can be generated from it.
--
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Admin allow-list (server-verified membership)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- An admin may read their own row; only the service role can add/remove admins.
drop policy if exists "admins can read their own row" on public.admin_users;
create policy "admins can read their own row"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- Server-verifiable admin check. SECURITY DEFINER so it can read admin_users
-- even though RLS only exposes the caller's own row.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Greeting cards
-- ----------------------------------------------------------------------------
create table if not exists public.greeting_cards (
  id                 text primary key,
  sender_name        text not null,
  receiver_name      text not null,
  message            text not null,
  theme              text not null,
  external_image_url text not null default '',
  created_at         timestamptz not null default now(),
  expires_at         timestamptz,
  amount             numeric not null default 0,
  paid               boolean not null default false
);

-- Forward-compatible column additions for databases created before the ledger.
alter table public.greeting_cards add column if not exists amount numeric not null default 0;
alter table public.greeting_cards add column if not exists paid boolean not null default false;
alter table public.greeting_cards add column if not exists expires_at timestamptz;

alter table public.greeting_cards enable row level security;

-- Receivers only ever *read* live cards. All writes happen via the service role
-- inside the create-greeting Edge Function.
drop policy if exists "public can read live cards" on public.greeting_cards;
create policy "public can read live cards"
  on public.greeting_cards
  for select
  to anon, authenticated
  using (expires_at is null or expires_at > now());

-- Admins can list everything (dashboard / operations).
drop policy if exists "admins can read all cards" on public.greeting_cards;
create policy "admins can read all cards"
  on public.greeting_cards
  for select
  to authenticated
  using (public.is_admin());

-- Explicitly deny anonymous/client writes (RLS default-denies, this documents it).
revoke insert, update, delete on public.greeting_cards from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Transactions / Sales Ledger
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  client_name   text not null,
  client_email  text,
  payment_id    text not null,
  provider      text not null default 'unknown',
  product_name  text not null,
  amount        numeric not null default 0,
  currency      text not null default 'INR',
  status        text not null default 'paid',
  created_at    timestamptz not null default now()
);

-- Idempotency: a payment id can only ever settle one transaction. This blocks
-- replaying a captured payment to mint multiple cards.
create unique index if not exists transactions_payment_id_key
  on public.transactions (payment_id);

alter table public.transactions enable row level security;

drop policy if exists "admins can read transactions" on public.transactions;
create policy "admins can read transactions"
  on public.transactions
  for select
  to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.transactions from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Receipts (generated by the accountant-bot Edge Function)
-- ----------------------------------------------------------------------------
create table if not exists public.receipts (
  id             uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  transaction_id uuid references public.transactions (id) on delete set null,
  client_name    text not null,
  client_email   text,
  product_name   text,
  amount         numeric not null default 0,
  currency       text not null default 'INR',
  payment_id     text,
  issued_at      timestamptz not null default now(),
  payload        jsonb not null default '{}'::jsonb
);

alter table public.receipts enable row level security;

drop policy if exists "admins can read receipts" on public.receipts;
create policy "admins can read receipts"
  on public.receipts
  for select
  to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.receipts from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Bootstrap your first admin
-- ----------------------------------------------------------------------------
-- 1. Create the user in Supabase Auth (Dashboard → Authentication → Users →
--    "Add user", or sign them up), then run:
--
--    insert into public.admin_users (user_id, email)
--    select id, email from auth.users where email = 'you@ishmaverse.com'
--    on conflict (user_id) do nothing;
--
-- 2. Set VITE_ADMIN_EMAIL (optional) in .env so the login screen can hint the
--    allowed account. The password is never shipped to the client.
-- ----------------------------------------------------------------------------
