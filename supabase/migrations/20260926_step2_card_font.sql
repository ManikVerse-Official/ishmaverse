-- ============================================================================
-- Ishmaverse · Step 2: Card typography
-- ----------------------------------------------------------------------------
-- Stores the typography style chosen by the sender so the viewer and the live
-- preview render the same font. Values are validated against the allow-list in
-- the create-greeting Edge Function before being written.
-- ============================================================================

alter table public.greeting_cards
  add column if not exists font text;
