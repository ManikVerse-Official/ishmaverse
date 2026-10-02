-- ============================================================================
-- Ishmaverse · Step 10: Audience analytics (visits, visitors & location)
-- ----------------------------------------------------------------------------
-- Goals
--   1. Record every real visitor (page view) with its location, device and
--      referring page.
--   2. Never store the raw IP: only a salted SHA-256 hash, used to count unique
--      visitors without keeping personal data.
--   3. Admin traffic is EXCLUDED (the track-visit function skips verified
--      admins), so the numbers reflect real customers only.
--   4. Only admins can read the rows.
--
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

create table if not exists public.site_visits (
  id           uuid primary key default gen_random_uuid(),
  -- Page path + query the visitor opened, e.g. "/section/greetings?q=diwali".
  path         text not null default '/',
  referrer     text,
  -- Location, resolved from CDN headers (Cloudflare/Vercel) with a best-effort
  -- IP lookup fallback.
  country      text,
  region       text,
  city         text,
  -- Lightweight device parsing from the user agent.
  device       text,   -- 'mobile' | 'tablet' | 'desktop'
  browser      text,
  -- Random per-tab id, so repeat views in one session can be grouped.
  session_id   text,
  -- Salted SHA-256 of the IP — used only to count unique visitors.
  visitor_hash text,
  created_at   timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx
  on public.site_visits (created_at desc);
create index if not exists site_visits_visitor_hash_idx
  on public.site_visits (visitor_hash);
create index if not exists site_visits_country_idx
  on public.site_visits (country);

-- ----------------------------------------------------------------------------
-- Lock down: service role writes, admins read.
-- ----------------------------------------------------------------------------
alter table public.site_visits enable row level security;

-- Only admins may read the analytics.
drop policy if exists "admins can read site visits" on public.site_visits;
create policy "admins can read site visits"
  on public.site_visits
  for select
  to authenticated
  using (public.is_admin());

-- Clients never write directly; only the track-visit Edge Function does.
revoke insert, update, delete on public.site_visits from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Convenience: a lightweight audience summary for the dashboard.
-- ----------------------------------------------------------------------------
create or replace function public.audience_summary(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with windowed as (
    select *
    from public.site_visits
    where created_at >= now() - (greatest(p_days, 1) || ' days')::interval
  )
  select jsonb_build_object(
    'totalVisits',       (select count(*) from windowed),
    'uniqueVisitors',    (select count(distinct visitor_hash) from windowed),
    'todayVisits',       (select count(*) from windowed where created_at >= date_trunc('day', now())),
    'byCountry',         coalesce((
                           select jsonb_object_agg(country, count)
                           from (
                             select coalesce(country, 'Unknown') as country, count(*) as count
                             from windowed group by 1 order by 2 desc limit 12
                           ) c
                         ), '{}'::jsonb),
    'byCity',            coalesce((
                           select jsonb_object_agg(city, count)
                           from (
                             select coalesce(city, 'Unknown') as city, count(*) as count
                             from windowed group by 1 order by 2 desc limit 12
                           ) c
                         ), '{}'::jsonb),
    'byPath',            coalesce((
                           select jsonb_object_agg(path, count)
                           from (
                             select path, count(*) as count
                             from windowed group by 1 order by 2 desc limit 12
                           ) p
                         ), '{}'::jsonb)
  );
$$;

revoke all on function public.audience_summary(integer) from public;
grant execute on function public.audience_summary(integer) to authenticated;
