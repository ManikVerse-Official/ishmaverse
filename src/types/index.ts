export interface SiteSettings {
  id: string;
  site_name: string;
  brand_tagline: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accept_custom_orders: boolean;
  unavailable_days: number;
  minimum_budget_threshold: number;
  admin_notification_webhook: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  price_inr?: number; // Base price in INR
  /** Price in USD for non-India visitors; set manually in the Admin Panel. */
  price_usd?: number;
  currency?: 'INR' | 'USD';
  product_file_url?: string; // External URL (Google Drive, Mega, etc.)
  download_url?: string; // Legacy field
  image_url: string; // Display thumbnail (from Supabase Storage)
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  product_id: string;
  amount: number;
  currency: string;
  transaction_id: string;
  ip_address: string;
  created_at: string;
}

export interface GreetingCard {
  id: string;
  sender_name: string;
  receiver_name: string;
  message: string;
  theme: string; // GreetingTheme id (legacy cards used 'Birthday' | 'Valentine')
  external_image_url: string;
  /** Typography id chosen by the sender (see data/fonts.ts). */
  font?: string;
  /** Optional custom text colour (hex) chosen by the sender overrides the theme ink. */
  text_color?: string;
  /** Optional custom title/heading colour (hex) that overrides the theme accent. */
  title_color?: string;
  /** Optional custom message/body colour (hex) that overrides the theme ink. */
  message_color?: string;
  /** Optional custom signature/sign-off colour (hex) that overrides the theme accent. */
  signature_color?: string;
  /** Optional custom background colour (hex) chosen by the sender overrides the theme surface. */
  background_color?: string;
  /** Optional custom background gradient start (hex). */
  background_color_start?: string;
  /** Optional custom background gradient end (hex). */
  background_color_end?: string;
  /** Optional background gradient angle in degrees (0–359). */
  background_gradient_angle?: number;
  /** Optional sender-authored heading that replaces the theme's occasion headline. */
  title?: string;
  /** Optional sender-authored eyebrow label shown above the heading. */
  eyebrow?: string;
  /** Optional sender-authored sign-off that replaces "With love,". */
  signoff?: string;
  /** Audio track asset path (e.g. /audio/romantic.mp3). */
  audio_track?: string;
  created_at: string;
  expires_at?: string; // ISO timestamp, card self-destructs after this
  amount?: number; // Amount paid in INR (0 for admin generated cards)
  paid?: boolean;
  /**
   * Secret token that authorizes the sender to manage/delete this card.
   * Server-only: it is never returned by any public client read.
   */
  management_token?: string;
}

export type GreetingTier = 'basic' | 'plus' | 'premium' | 'elite';

/** A selectable typography style for greeting cards. */
export interface GreetingFont {
  id: string;
  label: string;
  /** CSS font-family stack. */
  family: string;
  /** Preview sentence shown in the selector. */
  sample: string;
  /** Short hint about the best-fit occasions. */
  mood: string;
}

/** Stylised photo treatments that match the theme's mood and tier. */
export type GreetingFrame = 'soft' | 'elegant' | 'polaroid' | 'gold' | 'neon' | 'vintage';

/** Entrance choreography for the rendered card. */
export type GreetingMotion = 'fade' | 'rise' | 'zoom' | 'cinematic';

/**
 * Design tokens that drive the rendered card (viewer + live preview).
 * Keeping these in the catalog means a theme looks identical everywhere it
 * appears, and premium/elite themes can carry richer treatments than basics.
 */
export interface GreetingThemeDesign {
  /** Card surface gradient stops (hex). */
  surface: [string, string, ...string[]];
  /** Primary text colour on the surface. */
  ink: string;
  /** Secondary / muted text colour. */
  inkSoft: string;
  /** Card shell border colour. */
  border: string;
  /** Glow/shadow colour (rgba string). */
  glow: string;
  /** Photo framing style. */
  frame: GreetingFrame;
  /** Entrance motion style. */
  motion: GreetingMotion;
  /** 'light' surfaces render on cream/ivory with minimal vignette. */
  mode?: 'dark' | 'light';
  /** Decorative emoji used as tier ornaments (premium/elite show more). */
  ornaments: string[];
  /** Recommended default typography id (see data/fonts.ts). */
  defaultFont: string;
}

export interface GreetingTheme {
  id: string;
  category_id: string;
  name: string;
  tagline: string;
  price: number; // Base price in INR; editable from the Admin Panel
  /** Price in USD shown to visitors outside India; set manually in the Admin Panel. */
  price_usd: number;
  tier: GreetingTier;
  emoji: string;
  accent: string; // hex accent used for glow / borders
  gradient: string; // tailwind gradient classes for the preview tile
  animation: 'confetti' | 'hearts' | 'petals' | 'sparkles' | 'fireworks' | 'stars';
  tags: string[]; // search keywords
  design: GreetingThemeDesign;
  /**
   * Optional full-bleed background artwork (illustration/photo) uploaded from
   * the Admin Panel. When set, the card renders it behind the text with a
   * readability scrim.
   */
  artwork_url?: string;
}

export interface GreetingThemeCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  keywords: string[];
}

export interface MallSection {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  accent: string;
  gradient: string;
  available: boolean;
}

export interface Transaction {
  id: string;
  client_name: string;
  client_email: string | null;
  payment_id: string;
  provider?: 'razorpay' | 'paypal' | 'stripe' | 'demo' | 'admin' | 'unknown';
  product_name: string;
  amount?: number;
  currency?: 'INR' | 'USD' | string;
  status?: string;
  created_at: string;
}

export type PaymentProvider = 'razorpay' | 'paypal' | 'stripe' | 'demo';

/** Gateway-verified payment proof sent to the secure create-greeting function. */
export interface PaymentProof {
  provider: PaymentProvider;
  order_id?: string;
  payment_id?: string;
  signature?: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  transaction_id: string | null;
  client_name: string;
  client_email: string | null;
  product_name: string | null;
  amount: number;
  currency: string;
  payment_id: string | null;
  issued_at: string;
  payload: Record<string, unknown>;
}
