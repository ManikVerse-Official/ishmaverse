-- ============================================================================
-- Ishmaverse · Step 8: Card privacy — 48h auto-delete + manual delete
-- ----------------------------------------------------------------------------
-- Goals
--   1. Every card carries a secret `management_token` (UUID) so its sender can
--      take it down early from /manage/<token>.
--   2. The token must NEVER be readable by clients. We therefore revoke table
--      SELECT from anon/authenticated and grant only the safe columns. Both the
--      viewer and the admin dashboard select explicit columns (never `*`).
--   3. Expired cards are removed automatically by a pg_cron job (with the RLS
--      policy still hiding them if pg_cron is unavailable).
--
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Management token + safety-net expiry
-- ----------------------------------------------------------------------------
alter table public.greeting_cards
  add column if not exists management_token uuid not null default gen_random_uuid();

-- Default the lifetime to 48 hours even if a caller forgets to set expires_at.
alter table public.greeting_cards
  alter column expires_at set default (now() + interval '48 hours');

create unique index if not exists greeting_cards_management_token_key
  on public.greeting_cards (management_token);

-- The two-stop background gradient picked by the sender (mirrors the
-- GreetingCard type and the create-greeting payload). These were referenced by
-- the code but never created by an earlier migration.
alter table public.greeting_cards
  add column if not exists background_color_start text,
  add column if not exists background_color_end text,
  add column if not exists background_gradient_angle integer not null default 135,
  -- Fully-custom card copy: sender-authored heading, small eyebrow label and
  -- signature sign-off. Null keeps the theme's designed wording.
  add column if not exists title text,
  add column if not exists eyebrow text,
  add column if not exists signoff text;

-- ----------------------------------------------------------------------------
-- 2. Never leak the management token to clients
-- ----------------------------------------------------------------------------
-- Table-level SELECT would expose every column (including the token), so drop
-- it and re-grant ONLY the public-safe columns.
revoke select on public.greeting_cards from anon, authenticated;

grant select (
  id,
  sender_name,
  receiver_name,
  message,
  theme,
  external_image_url,
  created_at,
  expires_at,
  amount,
  paid,
  font,
  text_color,
  title_color,
  message_color,
  signature_color,
  background_color,
  background_color_start,
  background_color_end,
  background_gradient_angle,
  title,
  eyebrow,
  signoff,
  audio_track
) on public.greeting_cards to anon, authenticated;

-- Clients still cannot write; all writes happen inside Edge Functions.
revoke insert, update, delete on public.greeting_cards from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Auto-delete function
-- ----------------------------------------------------------------------------
-- Deletes every card whose 48 hours are up. SECURITY DEFINER so the scheduled
-- job / service role can clean up regardless of RLS.
--
-- NOTE: card photos are hosted on ImgBB, which exposes no server-side delete
-- API without the per-upload delete URL, so the row removal is best-effort for
-- the image (it already auto-expires after 48h via the upload `expiration`).
create or replace function public.delete_expired_greeting_cards()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  with expired as (
    delete from public.greeting_cards
    where expires_at is not null and expires_at <= now()
    returning 1
  )
  select count(*) into deleted from expired;

  return deleted;
end;
$$;

revoke all on function public.delete_expired_greeting_cards() from public;

-- ----------------------------------------------------------------------------
-- 4. Schedule the cleanup with pg_cron (best-effort)
-- ----------------------------------------------------------------------------
-- pg_cron is enabled per-project in Supabase. If it is unavailable we simply
-- log a notice — expired cards stay hidden by the RLS policy in the meantime.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron is not available — skipping the cleanup schedule (%).', sqlerrm;
end $$;

-- Remove any previous version of the job so this migration is re-runnable.
do $$
begin
  perform cron.unschedule('delete-expired-greeting-cards');
exception when others then
  null; -- job did not exist yet
end $$;

do $$
begin
  perform cron.schedule(
    'delete-expired-greeting-cards',
    '*/15 * * * *',
    'select public.delete_expired_greeting_cards();'
  );
  raise notice 'Scheduled delete-expired-greeting-cards every 15 minutes.';
exception when others then
  raise notice 'Could not schedule the expired-card cleanup job (%).', sqlerrm;
end $$;
