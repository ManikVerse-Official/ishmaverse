import { supabase, isSupabaseConfigured } from './supabase';

export interface AdminIdentity {
  userId: string;
  email: string;
  provider: 'supabase';
}

const VERIFIED_ADMIN_EMAIL = 'deym85810@gmail.com';

/**
 * True only when Supabase is properly configured.
 */
export const isSupabaseAuthAvailable = (): boolean =>
  isSupabaseConfigured();

/**
 * Email shown as the admin login hint.
 */
export const getAdminEmailHint = (): string =>
  VERIFIED_ADMIN_EMAIL;

/**
 * Returns the currently signed-in Supabase user.
 *
 * IMPORTANT:
 * We do NOT use localStorage/password fallback here.
 * The backend needs the real Supabase JWT.
 */
export const getAdminSession =
  async (): Promise<AdminIdentity | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (error || !data.session?.user) {
        return null;
      }

      return {
        userId: data.session.user.id,
        email: data.session.user.email ?? '',
        provider: 'supabase',
      };
    } catch {
      return null;
    }
  };

/**
 * Checks whether the currently authenticated Supabase user is an admin.
 *
 * Primary admin account:
 *   deym85810@gmail.com
 *
 * The backend performs the same verification from the JWT.
 */
export const checkIsAdmin =
  async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session?.user
      ) {
        return false;
      }

      const email =
        sessionData.session.user.email
          ?.trim()
          .toLowerCase() ?? '';

      // Verified Supabase Auth admin account.
      if (email === VERIFIED_ADMIN_EMAIL) {
        return true;
      }

      // Optional database-based admin allow-list.
      try {
        const {
          data,
          error,
        } = await supabase.rpc('is_admin');

        if (!error && data === true) {
          return true;
        }
      } catch {
        // If RPC is unavailable, verified email remains the admin check.
      }

      return false;
    } catch {
      return false;
    }
  };

/**
 * Signs the admin in through Supabase Auth ONLY.
 *
 * No VITE_ADMIN_PASSWORD fallback is used.
 * This guarantees that a successful admin login has a real
 * Supabase access token available to create-greeting.
 */
export const signInAdmin = async (
  email: string,
  password: string,
): Promise<AdminIdentity> => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase authentication is not configured.',
    );
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Please enter your email address.');
  }

  if (!password) {
    throw new Error('Please enter your password.');
  }

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message,
    );
  }

  if (!data.user || !data.session) {
    throw new Error(
      'Supabase login succeeded but no active session was created.',
    );
  }

  const signedInEmail =
    data.user.email
      ?.trim()
      .toLowerCase() ?? '';

  /*
   * Only the verified Supabase Auth admin account
   * gets admin access.
   */
  if (signedInEmail === VERIFIED_ADMIN_EMAIL) {
    return {
      userId: data.user.id,
      email: data.user.email ?? normalizedEmail,
      provider: 'supabase',
    };
  }

  /*
   * Allow other users only when the server-side
   * admin allow-list says they are admins.
   */
  try {
    const {
      data: adminFlag,
      error: rpcError,
    } = await supabase.rpc('is_admin');

    if (!rpcError && adminFlag === true) {
      return {
        userId: data.user.id,
        email: data.user.email ?? normalizedEmail,
        provider: 'supabase',
      };
    }
  } catch {
    // Continue to the rejection below.
  }

  // Authenticated successfully, but not an admin.
  await supabase.auth.signOut();

  throw new Error(
    'This account does not have administrator access.',
  );
};

/**
 * Signs the current admin out of Supabase.
 */
export const signOutAdmin =
  async (): Promise<void> => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Already signed out / session unavailable.
    }
  };

/**
 * Watches Supabase login/logout/token-refresh events.
 */
export const subscribeToAuthChanges =
  (
    onChange: () => void,
  ): (() => void) => {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    try {
      const {
        data,
      } = supabase.auth.onAuthStateChange(
        () => {
          onChange();
        },
      );

      return () =>
        data.subscription.unsubscribe();
    } catch {
      return () => {};
    }
  };