// The ONLY path that can create a greeting card and its ledger entry.
//
// Security model:
//   • Admin        → proven by a Supabase Auth JWT whose user_id is in admin_users.
//   • Everyone else → must present gateway-verified payment proof. The amount is
//                     derived server-side and the payment is re-verified with the
//                     gateway (Razorpay signature + lookup, PayPal server capture).
//   • Anonymous direct table writes are denied by RLS, so this cannot be bypassed.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, getUserFromRequest, isAdminUser } from "../_shared/auth.ts";
import {
  expectedAmount,
  loadThemePrices,
  settlementCurrency,
  type Currency,
} from "../_shared/pricing.ts";
import {
  verifyPayPalPayment,
  verifyRazorpayPayment,
  verifyStripePayment,
  type PaymentProof,
  type VerifiedPayment,
} from "../_shared/payments.ts";

const GREETING_LIFESPAN_HOURS = 48;
const GREETING_LIFESPAN_MS = GREETING_LIFESPAN_HOURS * 60 * 60 * 1000;

interface CreateGreetingRequest {
  sender_name?: string;
  receiver_name?: string;
  message?: string;
  theme?: string;
  font?: string;
  external_image_url?: string;
  /** Optional sender colour overrides (hex) that beat the theme tokens. */
  text_color?: string;
  title_color?: string;
  message_color?: string;
  signature_color?: string;
  background_color?: string;
  background_color_start?: string;
  background_color_end?: string;
  background_gradient_angle?: number;
  title?: string;
  eyebrow?: string;
  signoff?: string;
  audio_track?: string;
  client_email?: string;
  currency?: Currency;
  payment?: PaymentProof;
}

/** Typography allow-list — must mirror src/data/fonts.ts. */
const ALLOWED_FONTS = new Set([
  'classic-serif',
  'elegant-display',
  'luxe-display',
  'editorial',
  'festive-decorative',
  'modern-sans',
  'clean-geometric',
  'bold-display',
  'romantic-script',
  'festive-script',
  'calligraphy',
  'handwritten',
  'playful',
]);
const DEFAULT_FONT = 'classic-serif';

const newCardId = (): string => {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
};

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const isSafeImageUrl = (url: string): boolean =>
  url === "" || /^https?:\/\/.+/i.test(url);

const isEmail = (value: string): boolean =>
  value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Only accept a strict #rrggbb value so no CSS can be injected via colours. */
const safeColor = (value: unknown): string | null => {
  const raw = clean(value, 9).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : null;
};

/** Clamp a client-supplied gradient angle to 0-359; null when absent/invalid. */
const safeAngle = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(((n % 360) + 360) % 360);
};

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = (await req.json()) as CreateGreetingRequest;

    const senderName = clean(body.sender_name, 80);
    const receiverName = clean(body.receiver_name, 80);
    const message = clean(body.message, 2000);
    const theme = clean(body.theme, 80);
    const requestedFont = clean(body.font, 40);
    const font = ALLOWED_FONTS.has(requestedFont) ? requestedFont : DEFAULT_FONT;
    const imageUrl = clean(body.external_image_url, 500);
    const textColor = safeColor(body.text_color);
    const titleColor = safeColor(body.title_color);
    const messageColor = safeColor(body.message_color);
    const signatureColor = safeColor(body.signature_color);
    const backgroundColor = safeColor(body.background_color);
    const backgroundGradientStart = safeColor(body.background_color_start);
    const backgroundGradientEnd = safeColor(body.background_color_end);
    const backgroundGradientAngle = safeAngle(body.background_gradient_angle);
    const title = clean(body.title, 80);
    const eyebrow = clean(body.eyebrow, 60);
    const signoff = clean(body.signoff, 60);
    const audioTrack = typeof body.audio_track === 'string' && body.audio_track.startsWith('/audio/') ? body.audio_track.trim().slice(0, 200) : null;
    const clientEmail = clean(body.client_email, 150).toLowerCase();
    const currency: Currency = body.currency === "USD" ? "USD" : "INR";

    if (!senderName || !receiverName || !message) {
      return errorResponse("Sender, receiver and message are all required", 400);
    }
    if (!isEmail(clientEmail)) {
      return errorResponse("Please provide a valid email address", 400);
    }
    if (!isSafeImageUrl(imageUrl)) {
      return errorResponse("Image URL must be an http(s) link", 400);
    }

    // --- Who is asking? -------------------------------------------------
    const supabase = createAdminClient();

    // Authoritative prices (DB, admin-managed) with shipped fallbacks.
    const prices = await loadThemePrices(supabase);
    if (!prices.has(theme)) {
      return errorResponse("Unknown theme", 400);
    }

    const user = await getUserFromRequest(req);
    const admin = await isAdminUser(user?.id);

    let settlement: VerifiedPayment;

    if (admin) {
      settlement = {
        provider: "admin",
        paymentId: "",
        amount: 0,
        currency: "INR",
      };
    } else {
      const proof = body.payment;
      if (!proof?.provider) {
        return errorResponse("Payment is required to create this card", 402);
      }

      // Idempotency: if this payment already produced a card (e.g. the first
      // response was lost mid-flight), return that same card rather than
      // re-capturing the payment or failing with a duplicate error.
      const lookupKey = (proof.payment_id ?? proof.order_id ?? "").trim();
      if (lookupKey) {
        const { data: existingTx } = await supabase
          .from("transactions")
          .select("*")
          .eq("payment_id", lookupKey)
          .maybeSingle();

        if (existingTx) {
          const { data: existingCard } = await supabase
            .from("greeting_cards")
            .select("*")
            .eq("payment_id", lookupKey)
            .maybeSingle();

          if (existingCard) {
            return jsonResponse({
              success: true,
              duplicate: true,
              card: existingCard,
              transaction: existingTx,
            });
          }
          return errorResponse("This payment has already been used", 409);
        }
      }

      // The provider decides the currency, never the client.
      const effectiveCurrency = settlementCurrency(proof.provider, currency);
      const amount = expectedAmount(prices, theme, effectiveCurrency);
      if (amount === null) return errorResponse("Unknown theme", 400);

      if (proof.provider === "demo") {
        // Demo bypass is controlled by a server secret, never by the client.
        if (Deno.env.get("PAYMENT_MODE") !== "demo") {
          return errorResponse("Demo payments are disabled", 403);
        }
        settlement = {
          provider: "demo",
          paymentId: proof.payment_id?.trim() || `DEMO-${crypto.randomUUID()}`,
          amount,
          currency: effectiveCurrency,
        };
      } else if (proof.provider === "razorpay") {
        settlement = await verifyRazorpayPayment(proof, amount);
      } else if (proof.provider === "stripe") {
        settlement = await verifyStripePayment(proof, amount);
      } else {
        settlement = await verifyPayPalPayment(proof, amount);
      }
    }

    // --- Persist card + ledger atomically-ish ---------------------------
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + GREETING_LIFESPAN_MS);
    const cardId = newCardId();
    // Secret used by the sender to manage / delete the card early. It is never
    // exposed by a client-side read (see step8 migration column grants).
    const managementToken = crypto.randomUUID();

    const paymentId =
      settlement.provider === "admin" ? `ADMIN-${cardId}` : settlement.paymentId;

    const { data: card, error: cardError } = await supabase
      .from("greeting_cards")
      .insert([
        {
          id: cardId,
          sender_name: senderName,
          receiver_name: receiverName,
          message,
          theme,
          font,
          ...(textColor ? { text_color: textColor } : {}),
          ...(titleColor ? { title_color: titleColor } : {}),
          ...(messageColor ? { message_color: messageColor } : {}),
          ...(signatureColor ? { signature_color: signatureColor } : {}),
          ...(backgroundColor ? { background_color: backgroundColor } : {}),
          ...(backgroundGradientStart ? { background_color_start: backgroundGradientStart } : {}),
          ...(backgroundGradientEnd ? { background_color_end: backgroundGradientEnd } : {}),
          ...(backgroundGradientAngle !== null ? { background_gradient_angle: backgroundGradientAngle } : {}),
          ...(title ? { title } : {}),
          ...(eyebrow ? { eyebrow } : {}),
          ...(signoff ? { signoff } : {}),
          ...(audioTrack ? { audio_track: audioTrack } : {}),
          external_image_url: imageUrl,
          created_at: createdAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          management_token: managementToken,
          amount: settlement.amount,
          paid: true,
          payment_id: paymentId,
        },
      ])
      .select("*")
      .single();

    if (cardError || !card) {
      console.error("Card insert failed:", cardError?.message);
      return errorResponse("Could not create the greeting card", 500);
    }

    // The unique index on payment_id makes replaying a payment a no-op.
    const { data: transaction, error: ledgerError } = await supabase
      .from("transactions")
      .insert([
        {
          client_name: senderName,
          client_email: clientEmail || user?.email || null,
          payment_id: paymentId,
          provider: settlement.provider,
          product_name: `${theme} — Digital Greeting Card`,
          amount: settlement.amount,
          currency: settlement.currency,
          status: "paid",
        },
      ])
      .select("*")
      .single();

    if (ledgerError) {
      console.error("Ledger insert failed:", ledgerError.message);
      // Roll the card back so a card can never exist without a ledger row.
      await supabase.from("greeting_cards").delete().eq("id", cardId);
      if (ledgerError.code === "23505") {
        return errorResponse("This payment has already been used", 409);
      }
      return errorResponse("Could not record the transaction", 500);
    }

    return jsonResponse({ success: true, card, transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-greeting failed:", message);
    return errorResponse(message, 500);
  }
});
