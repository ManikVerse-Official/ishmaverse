-- ============================================================================
-- Ishmaverse · Step 3: Payment idempotency
-- ----------------------------------------------------------------------------
-- Links a card to the payment that created it. Combined with the unique index
-- on transactions.payment_id, this lets create-greeting return the *same* card
-- when a retry arrives for a payment that already settled, instead of charging
-- again or failing with a duplicate error.
-- ============================================================================

alter table public.greeting_cards
  add column if not exists payment_id text;

create index if not exists greeting_cards_payment_id_idx
  on public.greeting_cards (payment_id);
