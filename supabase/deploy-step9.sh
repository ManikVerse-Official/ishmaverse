#!/usr/bin/env bash
#
# Ishmaverse · Step 9 — one-shot deploy
# ---------------------------------------------------------------------------
# Applies the migration and deploys the new Edge Functions.
#
# Prerequisites:
#   1. Supabase CLI installed  (https://supabase.com/docs/guides/cli)
#   2. `supabase login`
#   3. `supabase link --project-ref <your-project-ref>` (run once, from repo root)
#   4. RESEND_API_KEY set as a secret BEFORE running (see below)
#
# Usage:
#   bash supabase/deploy-step9.sh
#
# Secrets (set these first — the script warns if RESEND_API_KEY is missing):
#   supabase secrets set \
#     RESEND_API_KEY=re_xxxxxxxx \
#     RECEIPT_FROM_EMAIL="Ishmaverse <receipts@yourdomain.com>" \
#     PUBLIC_SITE_URL=https://ishmaverse.com
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "▶ Ishmaverse Step 9 deploy"
echo "  project: $ROOT_DIR"
echo

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "⚠  RESEND_API_KEY is not set in this shell."
  echo "   Emails will be logged as 'skipped' until you run:"
  echo "     supabase secrets set RESEND_API_KEY=re_xxxxxxxx"
  echo
fi

echo "▶ 1/2  Applying database migration (supabase db push)…"
supabase db push

echo
echo "▶ 2/2  Deploying Edge Functions…"
for fn in send-email entitlement create-free-greeting track-visit; do
  echo "   • $fn"
  supabase functions deploy "$fn"
done

echo
echo "✅ Done."
echo
echo "Next, add the browser env vars and restart the dev servers:"
echo "  Ishmaverse  (.env):        VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_REPORTCARD_URL"
echo "  ReportCard Studio (.env):  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"
echo "  Edge secret (optional):    VISIT_HASH_SALT"
echo
echo "Then follow the QA checklist in HANDOFF_STEP9.md."
