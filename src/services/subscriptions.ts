import { supabase, isSupabaseConfigured } from './supabase';

/**
 * ReportCard Studio subscription tracker (admin only).
 *
 * Reads go through the `admin-subscriptions` Edge Function, because the
 * `studio_subscriptions` / `usage_events` / `email_log` tables are locked to
 * the service role and carry no RLS policies for normal clients.
 */

export type SubscriptionStatus = 'active' | 'expiring' | 'expired' | 'cancelled';

export interface AdminSubscription {
  email: string;
  name: string;
  planId: string;
  planName: string;
  priceInr: number;
  priceUsd: number;
  startedAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
  daysLeft: number;
  adminGranted: boolean;
  renewalWarnedAt: string | null;
  ip: string;
  updatedAt: string | null;
  /** Free generations this account consumed in ReportCard Studio. */
  freeUsed: number;
}

export interface SubscriptionTotals {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  cancelled: number;
  revenueInr: number;
}

export interface SubscriptionEmailLogEntry {
  template: string;
  to_email: string;
  subject: string | null;
  status: string;
  created_at: string;
}

export interface SubscriptionOverview {
  subscriptions: AdminSubscription[];
  totals: SubscriptionTotals;
  emails: SubscriptionEmailLogEntry[];
}

const invoke = async <T>(body: Record<string, unknown>): Promise<T | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('admin-subscriptions', { body });
    if (error || !data?.success) {
      if (error) console.warn('admin-subscriptions failed:', error);
      return null;
    }
    return data as T;
  } catch (error) {
    console.warn('admin-subscriptions threw:', error);
    return null;
  }
};

export const fetchSubscriptionOverview = (): Promise<SubscriptionOverview | null> =>
  invoke<SubscriptionOverview>({ action: 'list' });

export const cancelSubscription = (email: string): Promise<unknown> =>
  invoke({ action: 'cancel', email });

export const renewSubscription = (email: string): Promise<unknown> =>
  invoke({ action: 'renew', email });

export const extendSubscription = (email: string, months = 6): Promise<unknown> =>
  invoke({ action: 'extend', email, months });
