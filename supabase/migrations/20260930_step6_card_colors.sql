-- ============================================================================
-- Ishmaverse · Step 6: Per-card colour overrides
-- ----------------------------------------------------------------------------
-- Senders can now override their card's text and background colours from the
-- creation form. Both are optional: when null the theme's own design tokens are
-- used. Values are validated as strict #rrggbb hex by the create-greeting Edge
-- Function before they are ever written.
-- ============================================================================

alter table public.greeting_cards
  add column if not exists text_color text,
  add column if not exists background_color text,
  add column if not exists title_color text,
  add column if not exists message_color text,
  add column if not exists signature_color text;
