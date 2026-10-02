// ReportCard Studio plans — the server-side source of truth.
//
// Keep these ids in sync with the frontend `ReportCard Studio/src/config/plans.ts`.
// The client only ever sends a plan id; the price recorded for a subscription is
// resolved here so a tampered request cannot buy the Holistic plan for ₹1.

export interface StudioPlan {
  id: string;
  name: string;
  priceInr: number;
  priceUsd: number;
  durationMonths: number;
}

export const STUDIO_PLANS: Record<string, StudioPlan> = {
  simple: { id: "simple", name: "Simple Academic", priceInr: 369, priceUsd: 4.99, durationMonths: 6 },
  modern: { id: "modern", name: "Modern School", priceInr: 578, priceUsd: 6.99, durationMonths: 6 },
  holistic: { id: "holistic", name: "Holistic Progress", priceInr: 859, priceUsd: 10.99, durationMonths: 6 },
};

export const getStudioPlan = (id: string): StudioPlan | null =>
  STUDIO_PLANS[id] ?? null;

/**
 * Free-use limits per feature.
 *   perEmail — how many times one email address may claim this feature for free.
 *   perIpEmails — how many DISTINCT emails may claim it from one IP address.
 *   perIpTotal — hard cap on total free claims from one IP (0 = unlimited).
 */
export interface FreeLimit {
  perEmail: number;
  perIpEmails: number;
  perIpTotal: number;
}

export const FREE_LIMITS: Record<string, FreeLimit> = {
  // One free greeting card per email; a network may only produce two free cards.
  free_greeting: { perEmail: 1, perIpEmails: 2, perIpTotal: 2 },
  // ReportCard Studio: seven free generations per email, capped per network.
  studio_generation: { perEmail: 7, perIpEmails: 2, perIpTotal: 14 },
};
