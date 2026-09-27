-- ============================================================================
-- Ishmaverse · Step 7: Tier-based audio track path
-- ----------------------------------------------------------------------------
-- Stores the tier-selected audio asset path on each greeting card so the
-- viewer can play tier-appropriate music during the "tap to open" experience.
-- Values are validated as strict /audio/<tier>/... paths by the create-greeting
-- Edge Function before they are ever written.
-- ============================================================================

alter table public.greeting_cards
  add column if not exists audio_track text;
