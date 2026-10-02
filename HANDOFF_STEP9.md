# Ishmaverse · Step 9 — copy‑paste handoff

Everything below is already written to disk in this repo. This file is the
single place with the env vars, the deploy commands, the full file list and a
QA checklist so you can set it up in one pass.

📄 **`STEP9_CHANGES.patch`** — the complete diff of every file (modified + new),
in one patch you can open in your editor. 44 diffs, ~6.6k lines.

### Audience analytics (new in Step 10)
The dashboard now has an **Audience** tab: total visits, unique visitors, visits
today / last 7 days, a **visitors-per-day chart** (last 14 days), **most visited
sections**, top countries, top cities, top pages and a recent-visits table with
device + browser. It is a sales-tracker-style view of who is coming and which
part of the site draws them.
Admin traffic is excluded **server-side** (verified from the JWT), no raw IP is
stored (only a salted hash), and only admins can read the rows.

---

## 1. Env files (fill these in)

### 1a. Ishmaverse app — `.env` (repo root)

Copy `.env.example` → `.env` and fill:

```
# Supabase (required for cards, auth, ledger, entitlement)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>

# Admin login hint (optional)
VITE_ADMIN_EMAIL=you@example.com

# Payments (existing) — set "demo" to test without real money
VITE_RAZORPAY_KEY_ID=
VITE_PAYPAL_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_PAYMENT_MODE=demo

# Greeting cards
VITE_IMGBB_API_KEY=<imgbb key>          # optional, for photo uploads
VITE_GREETING_DOMAIN=ishmaverse.com      # optional, per-card subdomains

# Where the admin dashboard's "Open ReportCard Studio" button points.
# Leave empty to use the same-origin /reportcard path.
VITE_REPORTCARD_URL=
```

> ⚠️ `RESEND_API_KEY` etc. do **NOT** go here — they are Edge Function secrets
> (next step). Anything with `VITE_` is public in the browser.

### 1b. ReportCard Studio — `ReportCard Studio/.env`

Copy `ReportCard Studio/.env.example` → `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Leave empty to keep ReportCard Studio working fully offline on its local store.

### 1c. Supabase Edge Function secrets (server-only)

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxxxxxxxxxx \
  RECEIPT_FROM_EMAIL="Ishmaverse <receipts@yourdomain.com>" \
  PUBLIC_SITE_URL=https://ishmaverse.com \
  VISIT_HASH_SALT=some-random-string \
  PAYMENT_MODE=demo
# plus your existing payment secrets:
# RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / STRIPE_SECRET_KEY
```

---

## 2. Deploy (run once)

**One command instead of four:**

```bash
bash supabase/deploy-step9.sh
```

Or the individual steps:

```bash
# 1. Create the new tables (usage_events, studio_subscriptions, email_log)
supabase db push

# 2. Deploy the new functions
supabase functions deploy send-email
supabase functions deploy entitlement
supabase functions deploy create-free-greeting
```

Prerequisites (once): install the Supabase CLI, `supabase login`, and
`supabase link --project-ref <your-project-ref>` from the repo root.

Then restart both dev servers so the new env vars load:

```bash
npm run dev                      # Ishmaverse
cd "ReportCard Studio" && npm run dev
```

---

## 3. File manifest

### New — Supabase (server)
| File | Purpose |
|---|---|
| `supabase/migrations/20261003_step9_usage_and_studio.sql` | `usage_events`, `studio_subscriptions`, `email_log` (service-role only) |
| `supabase/functions/_shared/plans.ts` | Server plan prices + free-use limits |
| `supabase/functions/_shared/entitlement.ts` | IP extraction + free-use guard + studio state |
| `supabase/functions/_shared/templates.ts` | Welcome / purchase / subscription email HTML |
| `supabase/functions/send-email/index.ts` | Sends the emails via Resend, logs them |
| `supabase/functions/entitlement/index.ts` | `state` / `consume` / `subscribe` |
| `supabase/functions/create-free-greeting/index.ts` | Mints the free basic card (guarded) |
| `supabase/functions/SETUP_step9_limits_and_emails.md` | Detailed setup notes |
| `supabase/migrations/20261004_step10_site_visits.sql` | `site_visits` analytics table + `audience_summary()` |
| `supabase/functions/_shared/geo.ts` | Country/city + device parsing, visitor hash |
| `supabase/functions/track-visit/index.ts` | Records page views (admins excluded) |

### New — Ishmaverse (frontend)
| File | Purpose |
|---|---|
| `src/pages/Legal.tsx` | Terms & Conditions + Privacy pages |
| `src/services/notify.ts` | Calls `send-email` (welcome / purchase / subscription) |
| `src/services/entitlement.ts` | Calls `entitlement` from the browser |
| `src/services/analytics.ts` | `trackVisit()` + audience summariser |
| `src/components/VisitTracker.tsx` | Records a view on every route change |

### New — ReportCard Studio
| File | Purpose |
|---|---|
| `ReportCard Studio/src/config/plans.ts` | The 3 plans (prices) + admin emails |
| `ReportCard Studio/src/store/entitlementStore.ts` | 5 free uses, login, plan + server sync |
| `ReportCard Studio/src/pages/Pricing.tsx` | Pricing page |
| `ReportCard Studio/src/pages/Login.tsx` | Sign in + subscribe page |
| `ReportCard Studio/src/services/supabase.ts` | Tiny `fetch` Edge Function client |
| `ReportCard Studio/src/services/entitlementApi.ts` | Server entitlement calls |
| `ReportCard Studio/.env.example` | Supabase env var template |
| `ReportCard Studio/public/ishmaverse.png` | Ishmaverse logo asset |

### Modified — Ishmaverse
| File | Change |
|---|---|
| `index.html` | SEO: description, keywords, Open Graph, Twitter, JSON-LD |
| `src/App.tsx` | `/terms` + `/privacy` routes |
| `src/components/Footer.tsx` | Real Terms/Privacy links (were `href="#"`) |
| `src/components/Navbar.tsx` | Responsive: stacks brand + search on phones |
| `src/components/Chatbot.tsx` | Joy proactive welcome + mobile-friendly panel |
| `src/components/ThemeOrderModal.tsx` | Music preview player; free-card path; thank-you/bill email |
| `src/data/greetingThemes.ts` | New free "Free Welcome Card" theme |
| `src/pages/SectionPage.tsx` | Shows **FREE** for the free theme |
| `src/services/catalog.ts` | Price range ignores free themes |
| `src/services/greetingService.ts` | `createFreeGreetingCard` |
| `src/components/CategoryEffects.tsx` | Ambience added for `event` + `family` (the "flat" last themes) |
| `src/components/AdminDashboard.tsx` | New **Audience** tab (visitors, location, pages) + ReportCard Studio link + mobile fix |

### Modified — ReportCard Studio
| File | Change |
|---|---|
| `src/App.tsx` | `/pricing` + `/login` routes |
| `src/components/Layout.tsx` | Ishmaverse logo, mobile header, Plans link |
| `src/components/report/HolisticReportPreview.tsx` | Session centred under the address |
| `src/services/pdf/holisticLayout.ts` | Same session layout in the PDF (preview = result) |
| `src/pages/Dashboard.tsx` | Plan / usage card |
| `src/pages/GenerateReports.tsx` | 5-free-use gate + paywall + banner |
| `index.html` | SEO meta/keywords/OG |

> View the exact diff: `git diff` (root files). ReportCard Studio is currently
> untracked (`?? "ReportCard Studio/"`), so run `git add -A` there when you want
> it under version control.

---

## 4. Plan prices (verify these)

`ReportCard Studio/src/config/plans.ts` and `supabase/functions/_shared/plans.ts`
must stay in sync:

| id | Name | INR | USD | Duration |
|---|---|---|---|---|
| `simple` | Simple Academic | ₹369 | $4.99 | 6 months |
| `modern` | Modern School | ₹578 | $6.99 | 6 months |
| `holistic` | Holistic Progress | ₹859 | $10.99 | 6 months |

**Free limits** (`supabase/functions/_shared/plans.ts`):
`free_greeting` → 1 per email, 2 per IP · `studio_generation` → 5 per email, 2 emails per IP.
Admin emails (always free) → `ReportCard Studio/src/config/plans.ts` (`ADMIN_EMAILS`).

---

## 5. QA checklist

- [ ] **Free card** — Home → Digital Greetings → "Free Welcome Card" shows **FREE**; create one → card link works; a 2nd free card same email/network is blocked.
- [ ] **Paid card** — a paid theme still opens checkout; thank-you/bill email arrives (or is skipped if the receipt was already emailed).
- [ ] **Music preview** — pick a Premium/Elite theme → choose a song → inline player appears and plays.
- [ ] **Card render** — Aurora Nights (event) and family cards now have ambience.
- [ ] **Chatbot** — first visit shows Joy's welcome bubble; panel is usable on a phone.
- [ ] **Terms/Privacy** — footer opens `/terms` and `/privacy` (no jump to top).
- [ ] **ReportCard** — Dashboard shows "X of 5 free"; after 5 generations the paywall appears; `/pricing` + `/login` work; admin email is unlimited.
- [ ] **Holistic theme** — preview and downloaded PDF both show the session centred under the address.
- [ ] **Emails** — welcome: call `sendWelcomeEmail` after signup (helper ready); subscription: activating a plan in `/login` sends the bill email.
- [ ] **Audience** — visit in a normal window → Admin → **Audience** shows total visits, unique visitors, today, a **visitors-per-day** chart (14 days), **most visited sections**, countries/cities/pages and recent visits; your own admin visits are NOT counted; "Open ReportCard Studio" button works.
- [ ] **ReportCard preview** — no placeholder names ("School Name" / "School Logo") appear; empty fields render blank.
- [ ] **English only** — no Hindi/Devanagari text anywhere (verified: none).
- [ ] **UPI** — India checkout lists UPI / PhonePe / Google Pay / BHIM and Razorpay opens with UPI enabled.

---

## 6. Local verification (already green)

```bash
# Ishmaverse
npx tsc --noEmit && npm run check:themes && npm run check:audio && npm run build

# ReportCard Studio
cd "ReportCard Studio" && npx tsc --noEmit && npm test && npm run build
```

---

## 7. One remaining real-world piece

The ReportCard `/login` page currently **activates the plan** (locally + via the
`entitlement` function) but does **not** charge money yet — ReportCard Studio is
a separate app with no payment gateway. To take real payments you need either:

- **(a)** route the subscribe action through the Ishmaverse checkout
  (Razorpay/PayPal/Stripe) with a ReportCard product, then call
  `entitlement { action: "subscribe" }` on success, or
- **(b)** keep it manual (admin activates the email).

Tell me which and I'll wire the gateway.
