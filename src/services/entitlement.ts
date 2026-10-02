import { supabase, isSupabaseConfigured } from './supabase';

/**
 * ReportCard Studio entitlement client.
 *
 * Thin wrapper over the `entitlement` Edge Function, which is the server-side
 * source of truth for free uses and subscriptions. When Supabase is not
 * configured every call resolves to null so callers can fall back to the local
 * (dev) entitlement store.
 */

export interface StudioEntitlement {
  planActive: boolean;
  planId: string | null;
  expiresAt: string | null;
  freeUsed: number;
  freeRemaining: number;
}

export interface ConsumeResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
}

/** Reads the current plan + free uses left for an email. */
export const fetchStudioEntitlement = async (email: string): Promise<StudioEntitlement | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('entitlement', {
      body: { action: 'state', email },
    });
    if (error || !data?.success) return null;
    return {
      planActive: Boolean(data.planActive),
      planId: data.planId ?? null,
      expiresAt: data.expiresAt ?? null,
      freeUsed: Number(data.freeUsed ?? 0),
      freeRemaining: Number(data.freeRemaining ?? 0),
    };
  } catch {
    return null;
  }
};

/** Records one paid/free use and returns whether it was allowed. */
export const consumeStudioUse = async (
  email: string,
  feature: 'studio_generation' | 'free_greeting' = 'studio_generation',
): Promise<ConsumeResult | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('entitlement', {
      body: { action: 'consume', email, feature },
    });
    if (error || !data?.success) return null;
    return {
      allowed: Boolean(data.allowed),
      reason: data.reason,
      remaining: Number(data.remaining ?? 0),
    };
  } catch {
    return null;
  }
};

/**
 * Activates a plan after payment. The server records the subscription and
 * sends the confirmation/bill email; the client never sets prices.
 */
export const activateStudioSubscription = async (
  email: string,
  planId: string,
  name?: string,
): Promise<StudioEntitlement | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('entitlement', {
      body: { action: 'subscribe', email, planId, name },
    });
    if (error || !data?.success) return null;
    return {
      planActive: Boolean(data.planActive),
      planId: data.planId ?? planId,
      expiresAt: data.expiresAt ?? null,
      freeUsed: 0,
      freeRemaining: 0,
    };
  } catch {
    return null;
  }
};
