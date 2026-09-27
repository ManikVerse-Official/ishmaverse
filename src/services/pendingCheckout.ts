import type { CreateGreetingInput } from './greetingService';

/** Everything needed to create the card once a redirect-based payment settles. */
export type PendingGreeting = Omit<CreateGreetingInput, 'payment'>;

const KEY = 'ishmaverse_pending_checkout';

/**
 * Stripe uses a hosted checkout page, so the browser leaves the app and any
 * in-memory state is lost. We stash the greeting payload (never payment data)
 * in sessionStorage and finalize it on the /checkout/return page.
 */
export const savePendingGreeting = (pending: PendingGreeting): void => {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...pending, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable — the redirect flow simply won't have context */
  }
};

export const readPendingGreeting = (): PendingGreeting | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingGreeting) : null;
  } catch {
    return null;
  }
};

export const clearPendingGreeting = (): void => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
