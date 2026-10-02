-- ============================================================================
-- Ishmaverse · Step 12: Subscription tracker & renewal automation
-- ----------------------------------------------------------------------------
-- Goal: the owner can see WHO subscribed to which ReportCard Studio plan, and
-- the system nudges them before the plan lapses and turns it off if it does.
--
-- Adds to `studio_subscriptions`:
--   name               — subscriber's name (from sign-in)
--   status             — 'active' | 'cancelled' | 'expired'
--   renewal_warned_at  — when the "your plan ends soon" email went out
--   admin_granted      — true when the owner took the plan as a comp
--
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

alter table public.studio_subscriptions
  add column if not exists name text,
  add column if not exists status text not null default 'active',
  add column if not exists renewal_warned_at timestamptz,
  add column if not exists admin_granted boolean not null default false;

create index if not exists studio_subscriptions_status_idx
  on public.studio_subscriptions (status, expires_at);

-- A cancelled plan must not keep granting unlimited access, so the helper now
-- also requires the row to be in the 'active' state.
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
      and coalesce(s.status, 'active') <> 'cancelled'
      and s.expires_at > now()
  );
$$;

revoke all on function public.studio_subscription_active(text) from public;

-- ----------------------------------------------------------------------------
-- Expiry helper: flip every lapsed subscription to 'expired'.
--
-- The Edge Function `subscription-maintenance` calls this (after emailing the
-- renewals) so a lapsed plan stops granting unlimited access immediately.
-- ----------------------------------------------------------------------------
create or replace function public.expire_studio_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.studio_subscriptions
     set status = 'expired',
         updated_at = now()
   where status = 'active'
     and expires_at <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_studio_subscriptions() from public;

-- ----------------------------------------------------------------------------
-- Schedule the maintenance job (optional — needs the pg_cron + pg_net
-- extensions, available on Supabase).
--
-- Uncomment and replace the project ref + secret after deploying the function:
--
--   select cron.schedule(
--     'ishmaverse-subscription-maintenance',
--     '0 6 * * *',                       -- every day at 06:00 UTC
--     $$
--       select net.http_post(
--         url := 'https://<project-ref>.supabase.co/functions/v1/subscription-maintenance',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'x-maintenance-secret', '<MAINTENANCE_SECRET>'
--         ),
--         body := '{}'::jsonb
--       );
--     $$
--   );
-- ----------------------------------------------------------------------------
