// @ts-nocheck
//
// subscription-maintenance — renewal reminders & automatic switch-off
// ---------------------------------------------------------------------------
// Meant to be called once a day by a cron job (pg_cron + pg_net, or any
// scheduler). It:
//   1. emails a renewal warning to every plan that lapses within WARN_DAYS;
//   2. switches off (status = 'expired') every plan that has already lapsed and
//      emails the subscriber that it ended;
//   3. keeps the owner in the loop with a copy of every notice.
//
// Auth: the caller must present `x-maintenance-secret` matching the
// MAINTENANCE_SECRET secret. Refuses to run when that secret is unset, so the
// endpoint can never be left wide open.
//
//   supabase secrets set MAINTENANCE_SECRET=<long-random-string>
//   supabase functions deploy subscription-maintenance

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { adminNotifyEmails } from "../_shared/admin.ts";
import { isEmailConfigured, sendEmail } from "../_shared/email.ts";
import { getStudioPlan } from "../_shared/plans.ts";
import { renewalWarningEmail, subscriptionExpiredEmail } from "../_shared/templates.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_DAYS = Number(Deno.env.get("RENEWAL_WARN_DAYS") ?? "7");

interface Row {
  email: string;
  name: string | null;
  plan_id: string;
  expires_at: string;
  status: string | null;
  renewal_warned_at: string | null;
}

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const expected = Deno.env.get("MAINTENANCE_SECRET") ?? "";
  const supplied = req.headers.get("x-maintenance-secret") ?? "";
  if (!expected || supplied !== expected) {
    return errorResponse("Not authorised", 401);
  }

  const supabase = createAdminClient();
  const summary = { warned: 0, expired: 0, emails: 0, skipped: 0 };

  try {
    const { data, error } = await supabase
      .from("studio_subscriptions")
      .select("email, name, plan_id, expires_at, status, renewal_warned_at")
      .eq("status", "active");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    const now = Date.now();

    for (const row of rows) {
      const expiresAt = new Date(row.expires_at).getTime();
      const daysLeft = Math.ceil((expiresAt - now) / DAY_MS);
      const planName = getStudioPlan(row.plan_id)?.name ?? "ReportCard Studio";

      /* ── Lapsed → switch the plan off and tell the subscriber ───────── */
      if (expiresAt <= now) {
        const { error: updateError } = await supabase
          .from("studio_subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("email", row.email);
        if (updateError) {
          console.error("expire failed:", row.email, updateError.message);
          continue;
        }
        summary.expired += 1;

        if (isEmailConfigured()) {
          const rendered = subscriptionExpiredEmail({
            name: row.name ?? "",
            planName,
            expiresAt: new Date(row.expires_at).toDateString(),
            daysLeft: 0,
          });
          await deliver(supabase, row.email, rendered.subject, rendered.html, "subscription_expired");
          summary.emails += 1;
          await adminCopies(supabase, row.email, rendered.subject, rendered.html);
        }
        continue;
      }

      /* ── Lapsing soon → one warning per subscription ───────────────── */
      if (daysLeft <= WARN_DAYS && !row.renewal_warned_at) {
        const { error: updateError } = await supabase
          .from("studio_subscriptions")
          .update({ renewal_warned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("email", row.email);
        if (updateError) {
          console.error("warn update failed:", row.email, updateError.message);
          continue;
        }
        summary.warned += 1;

        if (isEmailConfigured()) {
          const rendered = renewalWarningEmail({
            name: row.name ?? "",
            planName,
            expiresAt: new Date(row.expires_at).toDateString(),
            daysLeft,
          });
          await deliver(supabase, row.email, rendered.subject, rendered.html, "renewal_warning");
          summary.emails += 1;
          await adminCopies(supabase, row.email, rendered.subject, rendered.html);
        }
        continue;
      }

      summary.skipped += 1;
    }

    // Safety net: flip anything the loop missed (also covers rows added with a
    // past expiry).
    await supabase.rpc("expire_studio_subscriptions");

    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("subscription-maintenance failed:", message);
    return errorResponse(message, 500);
  }
});

const deliver = async (
  supabase: ReturnType<typeof createAdminClient>,
  to: string,
  subject: string,
  html: string,
  template: string,
) => {
  const sent = await sendEmail({ to, subject, html });
  await supabase.from("email_log").insert([
    { template, to_email: to, subject, status: sent ? "sent" : "failed" },
  ]);
};

const adminCopies = async (
  supabase: ReturnType<typeof createAdminClient>,
  customer: string,
  subject: string,
  html: string,
) => {
  for (const adminEmail of adminNotifyEmails()) {
    if (adminEmail === customer) continue;
    const sent = await sendEmail({
      to: adminEmail,
      subject: `[Admin copy] ${subject} — ${customer}`,
      html,
    });
    await supabase.from("email_log").insert([
      {
        template: "subscription_notice_admin_copy",
        to_email: adminEmail,
        subject,
        status: sent ? "sent" : "failed",
      },
    ]);
  }
};
