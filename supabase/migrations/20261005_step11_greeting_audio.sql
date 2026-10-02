-- ============================================================================
-- Ishmaverse · Step 11: Custom background music for Premium & Elite cards
-- ----------------------------------------------------------------------------
-- Premium and Elite greeting themes let the sender upload their own MP3, so the
-- card plays a personal song instead of a stock track. This migration adds a
-- dedicated public bucket for those uploads.
--
-- Public read (the shared card streams the file) and open insert so any visitor
-- can add their own track without an account — the same trade-off already used
-- for card photos. Size and MIME type are enforced by the bucket itself, which
-- is what keeps the endpoint from being abused for arbitrary file hosting.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'greeting-audio',
  'greeting-audio',
  true,
  8388608, -- 8 MB
  array['audio/mpeg', 'audio/mp3']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Storage policies
-- ----------------------------------------------------------------------------
drop policy if exists "greeting audio public read" on storage.objects;
create policy "greeting audio public read" on storage.objects
  for select
  using (bucket_id = 'greeting-audio');

-- Visitors uploading a card's custom song are anonymous, so both the `anon`
-- and `authenticated` roles may insert. Updates/deletes stay closed (the file
-- is immutable once uploaded and expires with the card).
drop policy if exists "greeting audio public upload" on storage.objects;
create policy "greeting audio public upload" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'greeting-audio');
