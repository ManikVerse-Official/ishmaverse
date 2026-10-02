// @ts-nocheck
//
// entitlement — ReportCard Studio free uses, subscriptions & free-trial limits
// ---------------------------------------------------------------------------
// Single server-side source of truth so the browser cannot reset the counters.
//
// POST body:
//   { action: "state",    email }                          -> plan + free uses left
//   { action: "consume",  email, feature }                 -> records one use
//   { action: "subscribe", email, planId, name? }          -> activates a plan
//
// The client's IP is read from the request headers and never trusted from the
// body. Admin access is granted by email OR IP (see _shared/admin.ts), and an
// admin consume never counts against the free tries.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { checkAndConsumeTrial, clientIp, studioState } from "../_shared/entitlement.ts";
import { getStudioPlan } from "../_shared/plans.ts";
import { isAdminRequest, adminNotifyEmails } from "../_shared/admin.ts";
import { isEmailConfigured, sendEmail } from "../_shared/email.ts";
import { subscriptionEmail } from "../_shared/templates.ts";

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
};

serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const ip = clientIp(req);
  const supabase = createAdminClient();

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = clean(body.action, 20);
    const email = clean(body.email, 150).toLowerCase();
    const admin = isAdminRequest(email, ip);

    /* -------------------------------- state ------------------------------- */
    if (action === "state") {
      const state = await studioState(supabase, email, admin);
      return jsonResponse({ success: true, ...state });
    }

    /* ------------------------------- consume ------------------------------ */
    if (action === "consume") {
      const feature = clean(body.feature, 40) || "studio_generation";
      const decision = await checkAndConsumeTrial(supabase, feature, email, ip, admin);
      return jsonResponse({ success: true, ...decision });
    }

    /* ------------------------------ subscribe ----------------------------- */
    if (action === "subscribe") {
      const plan = getStudioPlan(clean(body.planId, 40));
      if (!plan) return errorResponse("Unknown plan", 400);
      if (!isEmail(email)) return errorResponse("A valid email is required", 400);

      const name = clean(body.name, 80);
      const startedAt = new Date();
      const expiresAt = addMonths(startedAt, plan.durationMonths);

      const { error } = await supabase.from("studio_subscriptions").upsert(
        [
          {
            email,
            name: name || null,
            plan_id: plan.id,
            // The price is resolved here, never from the request, so a tampered
            // request cannot buy the Holistic plan for Rs.1.
            price_inr: plan.priceInr,
            price_usd: plan.priceUsd,
            started_at: startedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            status: "active",
            renewal_warned_at: null,
            admin_granted: admin,
            ip: ip || null,
            updated_at: startedAt.toISOString(),
          },
        ],
        { onConflict: "email" },
      );

      if (error) {
        console.error("subscribe failed:", error.message);
        return errorResponse("Could not activate the subscription", 500);
      }

      /*
       * Confirmation / bill email. The bill always states the product's real
       * COST — an admin comp is billed at list price rather than labelled
       * "free", and a genuinely free product simply costs 0.
       */
      if (isEmailConfigured()) {
        const amount = `₹${plan.priceInr}`;
        const rendered = subscriptionEmail({
          name,
          planName: plan.name,
          amount,
          durationMonths: plan.durationMonths,
          expiresAt: expiresAt.toDateString(),
        });

        const sent = await sendEmail({ to: email, subject: rendered.subject, html: rendered.html });
        await supabase.from("email_log").insert([
          {
            template: "subscription",
            to_email: email,
            subject: rendered.subject,
            status: sent ? "sent" : "failed",
            ip: ip || null,
          },
        ]);

        // Keep the owner in the loop for every activation (incl. admin comps).
        for (const adminEmail of adminNotifyEmails()) {
          if (adminEmail === email) continue;
          const copy = subscriptionEmail({
            name: name || email,
            planName: `${plan.name} · ${email}`,
            amount,
            durationMonths: plan.durationMonths,
            expiresAt: expiresAt.toDateString(),
          });
          const stored = await sendEmail({
            to: adminEmail,
            subject: `[Admin copy] ${copy.subject}`,
            html: copy.html,
          });
          await supabase.from("email_log").insert([
            {
              template: "subscription_admin_copy",
              to_email: adminEmail,
              subject: copy.subject,
              status: stored ? "sent" : "failed",
              ip: ip || null,
            },
          ]);
        }
      }

      return jsonResponse({
        success: true,
        planActive: true,
        planId: plan.id,
        expiresAt: expiresAt.toISOString(),
        isAdmin: admin,
      });
    }

    return errorResponse("Unknown action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("entitlement failed:", message);
    return errorResponse(message, 500);
  }
});
