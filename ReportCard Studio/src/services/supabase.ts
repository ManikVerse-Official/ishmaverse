/**
 * Tiny Supabase Edge Function client.
 *
 * ReportCard Studio talks to the Ishmaverse `entitlement` function with plain
 * `fetch` (no supabase-js dependency) so the app stays lightweight. When the
 * two env vars are absent every call resolves to null and the app falls back to
 * its local entitlement store.
 *
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon key>
 */

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

const baseUrl = rawUrl.replace(/\/$/, '');

export const isSupabaseConfigured = (): boolean => Boolean(baseUrl && anonKey);

/** Invokes an Edge Function. Returns null on any failure (never throws). */
export const invokeFunction = async <T>(name: string, body: unknown): Promise<T | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The anon key is public; the function enforces everything server-side.
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
};
