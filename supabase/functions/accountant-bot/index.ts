// Accountant Bot — turns a settled ledger row into a durable, printable receipt.
//
// Lookup rules:
//   • Admins may look up any transaction by `transaction_id` or `payment_id`.
//   • A buyer may look up their own receipt by the `payment_id` they were given.
// Receipts are idempotent: re-requesting the same transaction returns the
// existing receipt instead of minting duplicates.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, getUserFromRequest, isAdminUser } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/email.ts";

interface ReceiptRequest {
  payment_id?: string;
  transaction_id?: string;
}

interface LedgerRow {
  id: string;
  client_name: string;
  client_email: string | null;
  payment_id: string;
  provider: string;
  product_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

/** Public site origin used to build the card's management link. */
const siteBaseUrl = (): string =>
  (Deno.env.get("PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? "https://ishmaverse.com")
    .replace(/\/+$/, "");

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (amount: number, currency: string): string => {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const buildReceiptNumber = (row: LedgerRow): string =>
  `ISH-${new Date(row.created_at).getUTCFullYear()}-${row.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

const buildReceiptHtml = (
  row: LedgerRow,
  receiptNumber: string,
  issuedAt: string,
  manageUrl = "",
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${escapeHtml(receiptNumber)} · Ishmaverse</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: 'Segoe UI', Roboto, sans-serif; background: #0b0514; color: #f4f1ff; }
  .card { max-width: 620px; margin: 0 auto; background: linear-gradient(160deg, #1a0b2e, #0f0718); border: 1px solid rgba(139,92,246,0.45); border-radius: 20px; padding: 32px; box-shadow: 0 24px 60px rgba(139,92,246,0.25); }
  .brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
  .brand h1 { font-size: 20px; margin: 0; letter-spacing: 0.08em; text-transform: uppercase; background: linear-gradient(90deg,#a78bfa,#f0abfc); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .badge { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; padding: 6px 12px; border-radius: 999px; background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.4); }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; font-size: 13px; margin-bottom: 24px; }
  .meta span { display: block; color: #a39bc4; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 12px 0; text-align: left; border-bottom: 1px solid rgba(139,92,246,0.2); }
  th { color: #a39bc4; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
  td.amount, th.amount { text-align: right; }
  .total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 20px; font-size: 20px; font-weight: 700; }
  .total strong { background: linear-gradient(90deg,#c4b5fd,#f0abfc); -webkit-background-clip: text; background-clip: text; color: transparent; }
  footer { margin-top: 28px; font-size: 12px; color: #7c7496; line-height: 1.6; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <h1>Ishmaverse</h1>
      <span class="badge">Paid</span>
    </div>
    <div class="meta">
      <div><span>Receipt no.</span>${escapeHtml(receiptNumber)}</div>
      <div><span>Issued</span>${escapeHtml(new Date(issuedAt).toLocaleString("en-IN"))}</div>
      <div><span>Billed to</span>${escapeHtml(row.client_name)}</div>
      <div><span>Email</span>${escapeHtml(row.client_email ?? "—")}</div>
      <div><span>Payment method</span>${escapeHtml(row.provider)}</div>
      <div><span>Payment reference</span>${escapeHtml(row.payment_id)}</div>
    </div>
    <table>
      <thead>
        <tr><th>Description</th><th class="amount">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(row.product_name)}</td>
          <td class="amount">${escapeHtml(formatMoney(Number(row.amount), row.currency))}</td>
        </tr>
      </tbody>
    </table>
    <div class="total">
      <span>Total paid</span>
      <strong>${escapeHtml(formatMoney(Number(row.amount), row.currency))}</strong>
    </div>
    <footer>
      Transaction ID: ${escapeHtml(row.id)}<br />
      This receipt was generated automatically by Ishmaverse. Digital greeting cards
      remain live for 48 hours from creation.<br />
      ${
        manageUrl
          ? `Need to take it down early? <a href="${escapeHtml(manageUrl)}" style="color:#f0abfc;font-weight:600">Manage or delete your card here</a>.<br />`
          : ""
      }
      Questions? Reply to this email and our team will help.
    </footer>
  </div>
</body>
</html>`;

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = (await req.json()) as ReceiptRequest;
    const paymentId = body.payment_id?.trim();
    const transactionId = body.transaction_id?.trim();

    if (!paymentId && !transactionId) {
      return errorResponse("Provide a payment_id or transaction_id", 400);
    }

    const supabase = createAdminClient();
    const user = await getUserFromRequest(req);
    const admin = await isAdminUser(user?.id);

    // Non-admins may only fetch a receipt for the payment they hold.
    if (!admin && !paymentId) {
      return errorResponse("A payment_id is required", 403);
    }

    let query = supabase.from("transactions").select("*").limit(1);
    query = paymentId
      ? query.eq("payment_id", paymentId)
      : query.eq("id", transactionId as string);

    const { data: rows, error: lookupError } = await query;
    if (lookupError) throw new Error(lookupError.message);

    const row = (rows?.[0] ?? null) as LedgerRow | null;
    if (!row) return errorResponse("Transaction not found", 404);

    // Resolve the card's secret token so the buyer can manage/delete it early.
    const { data: cardRow } = await supabase
      .from("greeting_cards")
      .select("management_token")
      .eq("payment_id", row.payment_id)
      .maybeSingle();
    const manageUrl = cardRow?.management_token
      ? `${siteBaseUrl()}/manage/${cardRow.management_token}`
      : "";

    // Reuse an existing receipt when one has already been issued.
    const { data: existing } = await supabase
      .from("receipts")
      .select("*")
      .eq("transaction_id", row.id)
      .maybeSingle();

    if (existing) {
      return jsonResponse({
        success: true,
        receipt: existing,
        html: buildReceiptHtml(row, existing.receipt_number, existing.issued_at, manageUrl),
        emailed: false,
      });
    }

    const receiptNumber = buildReceiptNumber(row);
    const issuedAt = new Date().toISOString();
    const payload = {
      transaction_id: row.id,
      provider: row.provider,
      line_items: [
        {
          description: row.product_name,
          amount: Number(row.amount),
          currency: row.currency,
        },
      ],
    };

    const { data: receipt, error: insertError } = await supabase
      .from("receipts")
      .insert([
        {
          receipt_number: receiptNumber,
          transaction_id: row.id,
          client_name: row.client_name,
          client_email: row.client_email,
          product_name: row.product_name,
          amount: Number(row.amount),
          currency: row.currency,
          payment_id: row.payment_id,
          issued_at: issuedAt,
          payload,
        },
      ])
      .select("*")
      .single();

    if (insertError || !receipt) {
      console.error("Receipt insert failed:", insertError?.message);
      return errorResponse("Could not issue the receipt", 500);
    }

    // Automatically email the receipt to the buyer (best-effort — a missing
    // mail key never blocks the receipt itself).
    const emailed = await sendEmail({
      to: receipt.client_email ?? row.client_email ?? "",
      subject: `Your Ishmaverse receipt · ${receipt.receipt_number}`,
      html: buildReceiptHtml(row, receipt.receipt_number, receipt.issued_at, manageUrl),
    });
    if (!emailed) {
      console.warn("Receipt issued but not emailed (missing RESEND_API_KEY or recipient).");
    }

    return jsonResponse({
      success: true,
      receipt,
      html: buildReceiptHtml(row, receipt.receipt_number, receipt.issued_at, manageUrl),
      emailed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("accountant-bot failed:", message);
    return errorResponse(message, 500);
  }
});
