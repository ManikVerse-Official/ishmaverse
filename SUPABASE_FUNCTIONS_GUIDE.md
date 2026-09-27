# Supabase Edge Functions Setup Guide

## Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`
3. Link your project: `supabase link --project-ref YOUR_PROJECT_ID`

## 1. Apply the database migration
The Step 1 migration adds the admin allow-list, the sales ledger and the RLS
rules that stop clients from writing cards or transactions directly:

```bash
supabase db push
# or paste supabase/migrations/20260925_step1_security_and_ledger.sql into the SQL editor
```

## 2. Create your first admin
Admin access is a **Supabase Auth user** that is a member of `admin_users`.
It is verified server-side — there is no password in the bundle.

1. Dashboard → Authentication → Users → **Add user** (or `supabase auth admin create-user`).
2. Add them to the allow-list:
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'you@ishmaverse.com'
   on conflict (user_id) do nothing;
   ```
3. Sign in at `/admin` with that email + password.

## 3. Deploy the functions
```bash
supabase functions deploy            # all functions
supabase functions deploy create-greeting
supabase functions deploy create-payment-order
supabase functions deploy accountant-bot
```

| Function | Purpose |
| --- | --- |
| `create-greeting` | The only writer of cards + ledger rows. Verifies the admin JWT **or** a gateway-verified payment (Razorpay signature + lookup, PayPal server capture), derives the price server-side, and rolls the card back if the ledger write fails. |
| `create-payment-order` | Creates a Razorpay/PayPal order at the server-side price so the amount can't be tampered with. |
| `accountant-bot` | Issues an idempotent, printable receipt for a settled payment. |
| `delivery-bot`, `joy-sync` | Existing helpers. |

## 4. Set secrets
Never put gateway secrets in the frontend `.env`. Use Edge Function secrets:

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx
supabase secrets set RAZORPAY_KEY_SECRET=xxx
supabase secrets set PAYPAL_CLIENT_ID=xxx
supabase secrets set PAYPAL_CLIENT_SECRET=xxx
supabase secrets set PAYPAL_MODE=sandbox      # or "live"
# Optional: only for local testing. When set, the server accepts `demo` proof.
supabase secrets set PAYMENT_MODE=demo
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
Supabase platform and are used by the functions to write to the ledger.

## Local development
1. Start the Supabase stack: `supabase start`
2. Serve the functions: `supabase functions serve --env-file ./supabase/.env.local`
