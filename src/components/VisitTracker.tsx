import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '../services/supabase';
import { trackVisit } from '../services/analytics';

/**
 * Records a page view on every route change.
 *
 * Renders nothing. The server excludes admin traffic, so signed-in admins are
 * never counted as audience. Repeat renders (React StrictMode) for the same
 * path are de-duplicated with a ref.
 */
export const VisitTracker: React.FC = () => {
  const location = useLocation();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const path = `${location.pathname}${location.search}`;
    if (lastPath.current === path) return;
    lastPath.current = path;
    void trackVisit(path);
  }, [location.pathname, location.search]);

  return null;
};
