import { invokeFunction, isSupabaseConfigured } from './supabase';

/**
 * Server-side entitlement calls for ReportCard Studio.
 *
 * The `entitlement` Edge Function is the authoritative source for free uses,
 * subscriptions and admin access (by email or IP). When Supabase is not
 * configured every call returns null so the store falls back to its local
 * (dev / offline) behaviour.
 */

export interface ServerEntitlement {
  planActive: boolean;
  planId: string | null;
  expiresAt: string | null;
  freeUsed: number;
  freeRemaining: number;
  isAdmin: boolean;
  freeLimit: number;
}

interface StateResponse {
  success: boolean;
  planActive?: boolean;
  planId?: string | null;
  expiresAt?: string | null;
  freeUsed?: number;
  freeRemaining?: number;
  isAdmin?: boolean;
  freeLimit?: number;
}

const toEntitlement = (data: StateResponse, fallbackPlanId?: string): ServerEntitlement => ({
  planActive: Boolean(data.planActive),
  planId: data.planId ?? fallbackPlanId ?? null,
  expiresAt: data.expiresAt ?? null,
  freeUsed: Number(data.freeUsed ?? 0),
  freeRemaining: Number(data.freeRemaining ?? 0),
  isAdmin: Boolean(data.isAdmin),
  freeLimit: Number(data.freeLimit ?? 0),
});

export const fetchServerEntitlement = async (email: string): Promise<ServerEntitlement | null> => {
  if (!isSupabaseConfigured() || !email) return null;
  const data = await invokeFunction<StateResponse>('entitlement', { action: 'state', email });
  if (!data?.success) return null;
  return toEntitlement(data);
};

export interface ServerConsume {
  allowed: boolean;
  reason?: string;
  remaining: number;
  admin?: boolean;
}

export const consumeServerUse = async (
  email: string,
  feature: 'studio_generation' | 'free_greeting' = 'studio_generation',
): Promise<ServerConsume | null> => {
  if (!isSupabaseConfigured()) return null;
  const data = await invokeFunction<StateResponse & { allowed?: boolean; reason?: string; remaining?: number; admin?: boolean }>(
    'entitlement',
    { action: 'consume', email, feature },
  );
  if (!data?.success) return null;
  return {
    allowed: Boolean(data.allowed),
    reason: data.reason,
    remaining: Number(data.remaining ?? 0),
    admin: Boolean(data.admin),
  };
};

export const subscribeOnServer = async (
  email: string,
  planId: string,
  name?: string,
): Promise<ServerEntitlement | null> => {
  if (!isSupabaseConfigured() || !email) return null;
  const data = await invokeFunction<StateResponse>('entitlement', {
    action: 'subscribe',
    email,
    planId,
    name,
  });
  if (!data?.success) return null;
  return toEntitlement(data, planId);
};
