// Creates a payment order whose amount is derived from the server-side price
// table — the client only names the theme, currency and (for USD) the provider.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { expectedAmount, loadThemePrices, type Currency } from "../_shared/pricing.ts";
import {
  createPayPalOrder,
  createRazorpayOrder,
  createStripeCheckoutSession,
} from "../_shared/payments.ts";

interface OrderRequest {
  theme_id?: string;
  currency?: Currency;
  /** Preferred international provider. Defaults to PayPal. */
  provider?: "paypal" | "stripe";
}

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = (await req.json()) as OrderRequest;
    const themeId = body.theme_id?.trim();
    const currency: Currency = body.currency === "USD" ? "USD" : "INR";

    if (!themeId) return errorResponse("Unknown theme", 400);

    // Prices come from the DB (admin-managed), falling back to shipped defaults.
    const supabase = createAdminClient();
    const prices = await loadThemePrices(supabase);
    const amount = expectedAmount(prices, themeId, currency);
    if (amount === null) return errorResponse("Unknown theme", 400);

    // India → Razorpay (UPI, PhonePe, GPay, Amazon Pay, BHIM, netbanking, cards…).
    if (currency === "INR") {
      const keyId = Deno.env.get("RAZORPAY_KEY_ID");
      if (!keyId) return errorResponse("Razorpay is not configured", 503);

      const order = await createRazorpayOrder(amount, `ishmaverse_${themeId}`.slice(0, 40), {
        theme_id: themeId,
      });

      return jsonResponse({
        success: true,
        provider: "razorpay",
        key_id: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    }

    // International → Stripe (hosted card checkout) when requested.
    if (body.provider === "stripe") {
      const origin = (req.headers.get("origin") ?? "").replace(/\/$/, "");
      const base = origin || "https://ishmaverse.com";

      const session = await createStripeCheckoutSession(
        amount,
        `Ishmaverse greeting card (${themeId})`,
        `${base}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        `${base}/section/greetings`,
      );

      return jsonResponse({
        success: true,
        provider: "stripe",
        session_id: session.id,
        url: session.url,
        amount: session.amount,
        currency: "USD",
      });
    }

    // International default → PayPal.
    const order = await createPayPalOrder(amount, `Ishmaverse greeting card (${themeId})`);
    return jsonResponse({
      success: true,
      provider: "paypal",
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-payment-order failed:", message);
    return errorResponse(message, 500);
  }
});
