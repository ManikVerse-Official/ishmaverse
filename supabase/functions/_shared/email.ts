// Transactional email via Resend. Optional: when RESEND_API_KEY is not set the
// helper no-ops and callers simply skip the email (the receipt is still issued).
//
// Secrets to set: RESEND_API_KEY, and optionally RECEIPT_FROM_EMAIL
// (defaults to Resend's onboarding sender, which only works for testing).

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export const isEmailConfigured = (): boolean => Boolean(Deno.env.get("RESEND_API_KEY"));

export const defaultFromAddress = (): string =>
  Deno.env.get("RECEIPT_FROM_EMAIL") ?? "Ishmaverse <onboarding@resend.dev>";

/** Sends an HTML email. Returns true when Resend accepted it. */
export const sendEmail = async ({ to, subject, html }: EmailInput): Promise<boolean> => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: defaultFromAddress(), to: [to], subject, html }),
    });

    if (!response.ok) {
      console.error("Resend rejected the email:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
};
