import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Admin authentication.
 *
 * Two paths are supported, in priority order:
 *
 * 1. Supabase Auth (preferred). The browser only ever holds a signed Supabase
 *    session and admin rights are confirmed server-side by the `is_admin()`
 *    database function or the verified admin email.
 * 2. A local password fallback (`VITE_ADMIN_PASSWORD`) so the portal still
 *    works when Supabase Auth is not wired up. The raw password is never
 *    persisted: we store a salted SHA-256 session token that expires, and any
 *    tampering with localStorage simply fails the hash check.
 *
 * The old `.includes('supabase.co')` check treated the placeholder URL as a real
 * project, which produced a "Failed to fetch" error on the very first sign-in
 * attempt. `isSupabaseConfigured()` now rejects placeholders, so a broken/unset
 * Supabase project cleanly routes to the password fallback instead.
 */

export interface AdminIdentity {
  userId: string;
  email: string;
  /** 'supabase' for a real session, 'password' for the local fallback. */
  provider: 'supabase' | 'password';
}

interface PasswordSession {
  v: 1;
  email: string;
  token: string;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_KEY = 'ishmaverse_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const HASH_SALT = 'ishmaverse-admin-v1';

// This must match the verified Supabase Auth admin account.
const VERIFIED_ADMIN_EMAIL = 'deym85810@gmail.com';

const envPassword = (): string =>
  (import.meta.env.VITE_ADMIN_PASSWORD || '').trim();

const envAdminEmail = (): string =>
  (import.meta.env.VITE_ADMIN_EMAIL || '').trim();

/** True when a local password fallback is available. */
export const isPasswordFallbackEnabled = (): boolean =>
  envPassword().length > 0;

/** Email to pre-fill on the login screen (purely a convenience hint). */
export const getAdminEmailHint = (): string => envAdminEmail();

/** True when a real Supabase project is configured. */
export const isSupabaseAuthAvailable = (): boolean =>
  isSupabaseConfigured();

/* ------------------------------------------------------------------ */
/* Hashing helpers                                                     */
/* ------------------------------------------------------------------ */

const fallbackHash = (text: string): string => {
  // Deterministic non-crypto hash for non-secure contexts (e.g. plain http on a
  // LAN). Still irreversible enough to avoid storing the raw password.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);

  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
};

const sha256 = async (text: string): Promise<string> => {
  try {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return fallbackHash(text);
  }
};

/** Constant-ish time comparison to avoid trivial timing leaks. */
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let mismatch = 0;

  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
};

const sessionToken = (
  email: string,
  expiresAt: number,
): Promise<string> =>
  sha256(
    `${HASH_SALT}:${email.toLowerCase()}:${envPassword()}:${expiresAt}`,
  );

/* ------------------------------------------------------------------ */
/* Local password session                                              */
/* ------------------------------------------------------------------ */

const readPasswordSession = (): PasswordSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as PasswordSession;

    if (
      parsed?.v !== 1 ||
      !parsed.token ||
      !parsed.expiresAt
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writePasswordSession = (
  session: PasswordSession,
): void => {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(session),
    );
  } catch {
    /* storage unavailable — session stays in memory for this page only */
  }
};

const clearPasswordSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

/** Verifies a stored hash without ever keeping the plaintext password. */
const isPasswordSessionValid =
  async (): Promise<AdminIdentity | null> => {
    if (!isPasswordFallbackEnabled()) return null;

    const session = readPasswordSession();

    if (!session) return null;

    if (session.expiresAt <= Date.now()) {
      clearPasswordSession();
      return null;
    }

    const expected = await sessionToken(
      session.email,
      session.expiresAt,
    );

    if (!safeEqual(expected, session.token)) {
      clearPasswordSession();
      return null;
    }

    return {
      userId: `local-admin:${session.email}`,
      email: session.email,
      provider: 'password',
    };
  };

const createPasswordSession = async (
  email: string,
): Promise<AdminIdentity> => {
  const expiresAt =
    Date.now() + SESSION_TTL_MS;

  const normalizedEmail = (
    email ||
    envAdminEmail() ||
    'admin'
  )
    .trim()
    .toLowerCase();

  // The token is derived from the configured password, never stored in clear,
  // so it can be re-derived later to validate the session.
  const token = await sessionToken(
    normalizedEmail,
    expiresAt,
  );

  writePasswordSession({
    v: 1,
    email: normalizedEmail,
    token,
    issuedAt: Date.now(),
    expiresAt,
  });

  return {
    userId: `local-admin:${normalizedEmail}`,
    email: normalizedEmail,
    provider: 'password',
  };
};

const matchesEnvPassword = (
  password: string,
): boolean => {
  const configured = envPassword();

  if (!configured) return false;

  return safeEqual(
    fallbackHash(`${HASH_SALT}:${password}`),
    fallbackHash(`${HASH_SALT}:${configured}`),
  );
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Reads the active admin session (Supabase or local password), or null. */
export const getAdminSession =
  async (): Promise<AdminIdentity | null> => {
    if (isSupabaseConfigured()) {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!error && data.session?.user) {
          return {
            userId: data.session.user.id,
            email: data.session.user.email ?? '',
            provider: 'supabase',
          };
        }
      } catch {
        /* fall through to the local session */
      }
    }

    return isPasswordSessionValid();
  };

/** Server- (or hash-) verified admin check. Falls back to false on any error. */
export const checkIsAdmin =
  async (): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      try {
        const {
          data: sessionData,
        } = await supabase.auth.getSession();

        if (sessionData.session?.user) {
          const email =
            sessionData.session.user.email
              ?.trim()
              .toLowerCase() ?? '';

          /*
           * The verified Supabase Auth email is trusted here.
           *
           * IMPORTANT:
           * This is the same email that the Edge Function verifies from
           * the Supabase JWT. We do NOT use client_email or a frontend-only
           * flag for the backend authorization.
           */
          if (email === VERIFIED_ADMIN_EMAIL) {
            return true;
          }

          const {
            data,
            error,
          } = await supabase.rpc('is_admin');

          if (!error && data) {
            return true;
          }

          // A signed-in Supabase user who is not on the allow-list may still
          // match the local fallback password when it is configured.
        }
      } catch {
        /* fall through to the local session */
      }
    }

    return Boolean(
      await isPasswordSessionValid(),
    );
  };

const isNetworkError = (
  message: string,
): boolean =>
  /failed to fetch|networkerror|network request failed|load failed|err_connection/i.test(
    message,
  );

/**
 * Signs in with email + password.
 *
 * Supabase is tried first. If it is not configured, or the request cannot reach
 * the network at all, the local password fallback takes over so the portal is
 * usable. A genuine Supabase "invalid credentials" response only falls back when
 * the local password also matches, so a wrong password still shows an error.
 */
export const signInAdmin = async (
  email: string,
  password: string,
): Promise<AdminIdentity> => {
  const supabaseReady =
    isSupabaseConfigured();

  const passwordReady =
    isPasswordFallbackEnabled();

  if (!supabaseReady && !passwordReady) {
    throw new Error(
      'Admin sign-in is not configured. Set VITE_ADMIN_PASSWORD or connect a Supabase project.',
    );
  }

  if (supabaseReady) {
    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (!error && data.user) {
        const signedInEmail =
          data.user.email
            ?.trim()
            .toLowerCase() ?? '';

        /*
         * IMPORTANT FIX:
         *
         * Keep the real Supabase session for the verified admin account.
         *
         * Previously, if the `is_admin()` RPC returned false/error, the code
         * immediately called supabase.auth.signOut(). That destroyed the JWT
         * session, after which create-greeting could not recognize the admin
         * and returned 402 Payment Required.
         */
        if (
          signedInEmail === VERIFIED_ADMIN_EMAIL
        ) {
          return {
            userId: data.user.id,
            email:
              data.user.email ??
              email.trim(),
            provider: 'supabase',
          };
        }

        const {
          data: adminFlag,
          error: rpcError,
        } =
          await supabase.rpc('is_admin');

        if (!rpcError && adminFlag) {
          return {
            userId: data.user.id,
            email:
              data.user.email ??
              email.trim(),
            provider: 'supabase',
          };
        }

        /*
         * This account authenticated successfully but is not an admin.
         * Only sign it out if it is not our verified admin account.
         */
        await supabase.auth.signOut();

        if (
          passwordReady &&
          matchesEnvPassword(password)
        ) {
          return createPasswordSession(email);
        }

        throw new Error(
          'This account does not have administrator access.',
        );
      }

      // Real credential rejection → only succeed if the local password matches.
      if (error && !isNetworkError(error.message)) {
        if (
          passwordReady &&
          matchesEnvPassword(password)
        ) {
          return createPasswordSession(email);
        }

        throw new Error(
          error.message ===
            'Invalid login credentials'
            ? 'Incorrect email or password.'
            : error.message,
        );
      }

      // Network failure → fall through to the password fallback below.
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '';

      const isAuthError =
        /incorrect|administrator access|invalid/i.test(
          message,
        );

      if (
        isAuthError ||
        !passwordReady
      ) {
        throw err;
      }
    }
  }

  if (passwordReady) {
    if (matchesEnvPassword(password)) {
      return createPasswordSession(email);
    }

    throw new Error(
      'Incorrect password.',
    );
  }

  throw new Error(
    'Unable to reach the authentication server. Please try again.',
  );
};

export const signOutAdmin =
  async (): Promise<void> => {
    clearPasswordSession();

    if (!isSupabaseConfigured()) return;

    try {
      await supabase.auth.signOut();
    } catch {
      /* already signed out */
    }
  };

/** Subscribes to Supabase auth changes (login, logout, token refresh). */
export const subscribeToAuthChanges =
  (
    onChange: () => void,
  ): (() => void) => {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    try {
      const { data } =
        supabase.auth.onAuthStateChange(
          () => onChange(),
        );

      return () =>
        data.subscription.unsubscribe();
    } catch {
      return () => {};
    }
  };