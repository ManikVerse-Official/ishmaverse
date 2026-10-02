import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Audience analytics.
 *
 * `trackVisit` records one page view through the `track-visit` Edge Function,
 * which excludes admin traffic server-side. `fetchAudienceVisits` reads the
 * recorded rows for the admin dashboard (RLS allows admins only).
 */

const SESSION_KEY = 'ishmaverse:visit-session';

const getSessionId = (): string => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
};

/** Records a page view. Best-effort: never throws, never blocks the UI. */
export const trackVisit = async (path: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.functions.invoke('track-visit', {
      body: {
        path,
        referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
        session_id: getSessionId(),
      },
    });
  } catch {
    /* analytics must never break the app */
  }
};

export interface AudienceVisit {
  id: string;
  path: string;
  referrer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  visitor_hash: string | null;
  created_at: string;
}

/** Latest visits for the dashboard. Returns null when unavailable. */
export const fetchAudienceVisits = async (limit = 1000): Promise<AudienceVisit[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('site_visits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return null;
    return (data ?? []) as AudienceVisit[];
  } catch {
    return null;
  }
};

export interface AudienceStats {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  last7Visits: number;
  countries: { name: string; count: number }[];
  cities: { name: string; count: number }[];
  pages: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  /** Visitors per day for the last 14 days (oldest → newest). */
  days: { label: string; count: number }[];
  /** Which part of the site drew the most traffic. */
  sections: { name: string; count: number }[];
}

/** Friendly names for the mall sections used in the "top sections" view. */
const SECTION_LABELS: Record<string, string> = {
  greetings: 'Digital Greetings',
  'tech-ai': 'Tech & AI',
  education: 'Education',
  originals: 'Originals',
  'ui-themes': 'UI Themes & Scripts',
  'fx-studios': 'FX / Studios',
  comics: 'Comics',
};

/** Maps a visited path to the site area it belongs to. */
const sectionForPath = (path: string): string => {
  const section = path.match(/^\/section\/([^/?#]+)/);
  if (section) return SECTION_LABELS[section[1]] ?? section[1];
  if (path === '/' || path.startsWith('/?')) return 'Home';
  if (path.startsWith('/greet/')) return 'Shared greeting cards';
  if (path.startsWith('/create-greeting')) return 'Card builder';
  if (path.startsWith('/manage')) return 'Manage card';
  if (path.startsWith('/checkout')) return 'Checkout';
  if (path.startsWith('/terms')) return 'Terms';
  if (path.startsWith('/privacy')) return 'Privacy';
  if (path.startsWith('/admin')) return 'Admin';
  return 'Other';
};

const tally = (values: (string | null)[]): { name: string; count: number }[] => {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = (value ?? '').trim() || 'Unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};

/** Derives the dashboard summary from raw visit rows. */
export const summariseAudience = (visits: AudienceVisit[]): AudienceStats => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  // Visitors per day for the last 14 days.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    days.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      count: visits.filter((v) => {
        const t = new Date(v.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      }).length,
    });
  }

  return {
    totalVisits: visits.length,
    uniqueVisitors: new Set(visits.map((v) => v.visitor_hash ?? v.id)).size,
    todayVisits: visits.filter((v) => new Date(v.created_at).getTime() >= todayMs).length,
    last7Visits: visits.filter((v) => now - new Date(v.created_at).getTime() <= 7 * dayMs).length,
    countries: tally(visits.map((v) => v.country)).slice(0, 8),
    cities: tally(visits.map((v) => v.city)).slice(0, 8),
    pages: tally(visits.map((v) => v.path)).slice(0, 8),
    devices: tally(visits.map((v) => v.device)),
    days,
    sections: tally(visits.map((v) => sectionForPath(v.path))).slice(0, 8),
  };
};
