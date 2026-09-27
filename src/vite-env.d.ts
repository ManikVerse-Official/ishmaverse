/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_PAYPAL_CLIENT_ID: string;
  /** Stripe publishable key — its presence enables the Stripe option for non-India buyers. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  /** Set to "demo" to exercise the flow without real gateway keys. */
  readonly VITE_PAYMENT_MODE: string;
  /** Optional: prefills / hints the admin login screen. */
  readonly VITE_ADMIN_EMAIL: string;
  /**
   * Local admin fallback password. Only used when Supabase Auth is unavailable
   * or unreachable. The session is stored as a salted, expiring hash.
   */
  readonly VITE_ADMIN_PASSWORD: string;
  readonly VITE_IMGBB_API_KEY: string;
  readonly VITE_GREETING_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
