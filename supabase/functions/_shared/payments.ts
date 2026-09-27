// Server-side payment verification. A card is only ever minted after the
// gateway itself confirms the money moved — never on the client's word.

export interface VerifiedPayment {
  provider: "razorpay" | "paypal" | "stripe" | "demo" | "admin";
  paymentId: string;
  amount: number;
  currency: "INR" | "USD";
}

export interface PaymentProof {
  provider: "razorpay" | "paypal" | "stripe" | "demo";
  order_id?: string;
  payment_id?: string;
  signature?: string;
}

const hmacSha256Hex = async (message: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/* ------------------------------------------------------------------ */
/* Razorpay                                                            */
/* ------------------------------------------------------------------ */

export interface RazorpayOrder {
  id: string;
  amount: number; // in paise
  currency: string;
}

const razorpayAuthHeader = (): string => {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured");
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
};

/** Creates the order server-side so the payable amount can never be edited. */
export const createRazorpayOrder = async (
  amountInr: number,
  receipt: string,
  notes: Record<string, string>,
): Promise<RazorpayOrder> => {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description ?? "Could not create Razorpay order");
  }
  return data as RazorpayOrder;
};

/**
 * Verifies a Razorpay callback two ways:
 *   1. HMAC-SHA256 signature of `order_id|payment_id` (proves the gateway sent it).
 *   2. A live payment lookup (proves status + amount).
 */
export const verifyRazorpayPayment = async (
  proof: PaymentProof,
  expectedInr: number,
): Promise<VerifiedPayment> => {
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keySecret) throw new Error("Razorpay is not configured");

  const { order_id: orderId, payment_id: paymentId, signature } = proof;
  if (!orderId || !paymentId || !signature) {
    throw new Error("Incomplete Razorpay payment proof");
  }

  const expectedSignature = await hmacSha256Hex(`${orderId}|${paymentId}`, keySecret);
  if (!constantTimeEqual(expectedSignature, signature)) {
    throw new Error("Razorpay signature verification failed");
  }

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: razorpayAuthHeader() },
  });
  const payment = await response.json();
  if (!response.ok) throw new Error("Could not verify Razorpay payment");

  if (payment.order_id !== orderId) throw new Error("Payment does not match order");
  if (payment.status !== "captured" && payment.status !== "authorized") {
    throw new Error(`Payment is not settled (status: ${payment.status})`);
  }

  const capturedInr = Number(payment.amount) / 100;
  if (Math.abs(capturedInr - expectedInr) > 0.01) {
    throw new Error("Paid amount does not match the selected theme price");
  }

  return {
    provider: "razorpay",
    paymentId: String(payment.id),
    amount: capturedInr,
    currency: "INR",
  };
};

/* ------------------------------------------------------------------ */
/* PayPal                                                              */
/* ------------------------------------------------------------------ */

const paypalBaseUrl = (): string =>
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const getPayPalAccessToken = async (): Promise<string> => {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("PayPal is not configured");

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error("Could not authenticate with PayPal");
  }
  return data.access_token as string;
};

export const createPayPalOrder = async (
  amountUsd: number,
  description: string,
): Promise<{ id: string; amount: number; currency: "USD" }> => {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description,
          amount: { currency_code: "USD", value: amountUsd.toFixed(2) },
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.id) {
    throw new Error(data?.message ?? "Could not create PayPal order");
  }
  return { id: data.id as string, amount: amountUsd, currency: "USD" };
};

/**
 * Captures a PayPal order server-side and validates the captured amount, so the
 * browser cannot fake a successful capture.
 */
export const verifyPayPalPayment = async (
  proof: PaymentProof,
  expectedUsd: number,
): Promise<VerifiedPayment> => {
  const orderId = proof.order_id ?? proof.payment_id;
  if (!orderId) throw new Error("Incomplete PayPal payment proof");

  const token = await getPayPalAccessToken();
  const response = await fetch(
    `${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const order = await response.json();
  if (!response.ok) {
    throw new Error(order?.message ?? "Could not capture PayPal order");
  }

  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  if (order?.status !== "COMPLETED" || !capture) {
    throw new Error(`PayPal order is not completed (status: ${order?.status ?? "unknown"})`);
  }

  const capturedAmount = Number(capture?.amount?.value);
  const capturedCurrency = capture?.amount?.currency_code;
  if (capturedCurrency !== "USD" || Math.abs(capturedAmount - expectedUsd) > 0.01) {
    throw new Error("Captured amount does not match the selected theme price");
  }

  // Use the stable order id as the ledger key: it is known before capture, so a
  // retry can detect an already-settled order instead of capturing it twice.
  return {
    provider: "paypal",
    paymentId: String(orderId),
    amount: capturedAmount,
    currency: "USD",
  };
};

/* ------------------------------------------------------------------ */
/* Stripe (international card payments, settles to your Indian account) */
/* ------------------------------------------------------------------ */

const stripeSecret = (): string => {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) throw new Error("Stripe is not configured");
  return secret;
};

export interface StripeCheckoutSession {
  id: string;
  url: string;
  amount: number;
  currency: "USD";
}

/**
 * Creates a hosted Stripe Checkout session server-side, so the payable amount
 * cannot be tampered with in the browser.
 */
export const createStripeCheckoutSession = async (
  amountUsd: number,
  description: string,
  successUrl: string,
  cancelUrl: string,
): Promise<StripeCheckoutSession> => {
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(amountUsd * 100)),
    "line_items[0][price_data][product_data][name]": description.slice(0, 120),
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok || !data?.id || !data?.url) {
    throw new Error(data?.error?.message ?? "Could not create Stripe checkout session");
  }

  return { id: data.id as string, url: data.url as string, amount: amountUsd, currency: "USD" };
};

/**
 * Verifies a returned Stripe Checkout session: it must be paid and the captured
 * amount must match the expected USD price. The session id is the stable ledger
 * key, so a retry cannot charge twice.
 */
export const verifyStripePayment = async (
  proof: PaymentProof,
  expectedUsd: number,
): Promise<VerifiedPayment> => {
  const sessionId = (proof.payment_id ?? proof.order_id ?? "").trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    throw new Error("Incomplete Stripe payment proof");
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${stripeSecret()}` },
  });
  const session = await response.json();
  if (!response.ok) throw new Error("Could not verify Stripe payment");

  if (session?.payment_status !== "paid") {
    throw new Error(`Stripe payment is not settled (status: ${session?.payment_status ?? "unknown"})`);
  }

  const capturedAmount = Number(session?.amount_total) / 100;
  if (session?.currency !== "usd" || Math.abs(capturedAmount - expectedUsd) > 0.01) {
    throw new Error("Paid amount does not match the selected theme price");
  }

  return {
    provider: "stripe",
    paymentId: sessionId,
    amount: capturedAmount,
    currency: "USD",
  };
};
