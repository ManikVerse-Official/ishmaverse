-- ============================================================================
-- Ishmaverse · Step 4: Dual-currency pricing
-- ----------------------------------------------------------------------------
-- 1. theme_prices — admin-managed INR + USD price for every greeting theme...
-- 2. products.price_usd — the manual USD price for store products...
-- ============================================================================

create table if not exists public.theme_prices (
  theme_id   text primary key,
  price_inr  numeric not null default 0 check (price_inr >= 0),
  price_usd  numeric not null default 0 check (price_usd >= 0),
  updated_at timestamptz not null default now()
);

alter table public.theme_prices enable row level security;

-- The storefront may read prices (public), but only admins may change them.
drop policy if exists "theme_prices public read" on public.theme_prices;
create policy "theme_prices public read" on public.theme_prices
  for select using (true);

drop policy if exists "theme_prices admin write" on public.theme_prices;
create policy "theme_prices admin write" on public.theme_prices
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ✅ FIX: Creating the missing products table first
create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Product USD price (manual, so admins can cover international gateway fees).
alter table public.products
  add column if not exists price_usd numeric;