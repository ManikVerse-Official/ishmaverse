import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

/**
 * True only when a real Supabase project is configured.
 *
 * The client always needs *some* URL to exist, so we fall back to a placeholder.
 * That placeholder previously passed the old `.includes('supabase.co')` check,
 * which made the app believe it was connected and then blow up with a
 * "Failed to fetch" network error on the first auth/storage call. This guard
 * rejects the placeholder (and empty values) so callers can fall back safely.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  if (!url || url.includes('placeholder')) return false;
  return /^https?:\/\/[^/\s]+\.supabase\.(co|in)/i.test(url);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
