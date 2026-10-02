-- ============================================================================
-- Ishmaverse · Step 9: Free-usage limits (IP + email) & ReportCard Studio plans
-- ----------------------------------------------------------------------------
-- Goals
--   1. Track every free use so trial-farming is stopped server-side:
--        • one free greeting card per email,
--        • at most two distinct emails may claim a free card from the same IP.
--   2. Record ReportCard Studio usage (the "5 free generations") and active
--      subscriptions so the browser can't reset them.
--   3. Keep a log of the transactional emails we send (welcome / receipt / plan)
--      for support and idempotency.
--
-- These tables are written ONLY by the service-role Edge Functions, so RLS is
-- enabled with NO policies for anon/authenticated. The service role bypasses
-- RLS; normal clients get nothing.
--
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Free-usage events
-- ----------------------------------------------------------------------------
-- One row per consumed free use. We store the IP so limits can be applied
-- per-network, and the email so a single address can't start a second trial.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  -- Logical product surface: 'free_greeting' | 'studio_generation' | ...
  feature text not null,
  -- Lower-cased email that claimed the use (may be empty for anonymous use).
  email text,
  -- Best-effort client IP from the request headers.
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_feature_email_idx
  on public.usage_events (feature, email);
create index if not exists usage_events_feature_ip_idx
  on public.usage_events (feature, ip);

-- ----------------------------------------------------------------------------
-- 2. ReportCard Studio subscriptions
-- ----------------------------------------------------------------------------
-- One active subscription per email. `expires_at` drives entitlement.
create table if not exists public.studio_subscriptions (
  email text primary key,
  plan_id text not null,
  price_inr integer not null default 0,
  price_usd numeric(10, 2) not null default 0,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_subscriptions_expires_idx
  on public.studio_subscriptions (expires_at);

-- ----------------------------------------------------------------------------
-- 3. Transactional email log
-- ----------------------------------------------------------------------------
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  template text not null,          -- 'welcome' | 'purchase' | 'subscription'
  to_email text not null,
  subject text,
  status text not null default 'sent',  -- 'sent' | 'failed'
  error text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_to_email_idx
  on public.email_log (to_email, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Lock the tables down
-- ----------------------------------------------------------------------------
alter table public.usage_events enable row level security;
alter table public.studio_subscriptions enable row level security;
alter table public.email_log enable row level security;

-- No policies are created: only the service role (Edge Functions) may read or
-- write these tables. Explicitly revoke any inherited privileges too.
revoke all on public.usage_events from anon, authenticated;
revoke all on public.studio_subscriptions from anon, authenticated;
revoke all on public.email_log from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Helper: active studio subscription for an email
-- ----------------------------------------------------------------------------
create or replace function public.studio_subscription_active(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.studio_subscriptions s
    where lower(s.email) = lower(p_email)
      and s.expires_at > now()
  );
$$;

revoke all on function public.studio_subscription_active(text) from public;
