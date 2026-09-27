-- ============================================================================
-- Ishmaverse · Step 5: Live admin catalog (artwork, theme edits, storage)
-- ----------------------------------------------------------------------------
-- 1. theme_overrides — admin edits to the built-in greeting themes, including
--    the per-theme background artwork uploaded from the dashboard. Stored as a
--    JSON patch so new theme fields keep working without another migration.
-- 2. custom_themes — themes created in the dashboard, stored as JSON.
-- 3. Storage buckets for theme artwork and product thumbnails.
--
-- Both tables are public-read (the storefront and the generated cards need
-- them) and admin-only for writes. Without this migration the dashboard still
-- works, but uploaded artwork stays in the admin's own browser.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Theme overrides
-- ----------------------------------------------------------------------------
create table if not exists public.theme_overrides (
  theme_id   text primary key,
  patch      jsonb not null default '{}'::jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.theme_overrides enable row level security;

drop policy if exists "theme_overrides public read" on public.theme_overrides;
create policy "theme_overrides public read" on public.theme_overrides
  for select using (true);

drop policy if exists "theme_overrides admin write" on public.theme_overrides;
create policy "theme_overrides admin write" on public.theme_overrides
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Custom themes
-- ----------------------------------------------------------------------------
create table if not exists public.custom_themes (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_themes enable row level security;

drop policy if exists "custom_themes public read" on public.custom_themes;
create policy "custom_themes public read" on public.custom_themes
  for select using (true);

drop policy if exists "custom_themes admin write" on public.custom_themes;
create policy "custom_themes admin write" on public.custom_themes
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'theme-artwork',
  'theme-artwork',
  true,
  8388608, -- 8 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-thumbnails',
  'product-thumbnails',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 4. Storage policies
-- ----------------------------------------------------------------------------
drop policy if exists "theme artwork public read" on storage.objects;
create policy "theme artwork public read" on storage.objects
  for select
  using (bucket_id in ('theme-artwork', 'product-thumbnails'));

drop policy if exists "theme artwork admin write" on storage.objects;
create policy "theme artwork admin write" on storage.objects
  for insert
  to authenticated
  with check (bucket_id in ('theme-artwork', 'product-thumbnails') and public.is_admin());

drop policy if exists "theme artwork admin update" on storage.objects;
create policy "theme artwork admin update" on storage.objects
  for update
  to authenticated
  using (bucket_id in ('theme-artwork', 'product-thumbnails') and public.is_admin())
  with check (bucket_id in ('theme-artwork', 'product-thumbnails') and public.is_admin());

drop policy if exists "theme artwork admin delete" on storage.objects;
create policy "theme artwork admin delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id in ('theme-artwork', 'product-thumbnails') and public.is_admin());
