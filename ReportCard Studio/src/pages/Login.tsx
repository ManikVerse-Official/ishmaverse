import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, ShieldCheck, ArrowRight, LogOut, Crown, Sparkles, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { STUDIO_PLANS, getPlanById, FREE_USE_LIMIT } from '../config/plans';
import { useEntitlement } from '../store/entitlementStore';

/**
 * Sign in and (optionally) subscribe.
 *
 * Signing in is what ties the free tries and the plan to a person, so the owner
 * can see whose plan is running out — and so clearing browser storage cannot
 * hand out another free run. With Supabase connected, the server is the source
 * of truth for admin access, remaining tries and the active plan.
 */
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    signIn,
    signOut,
    activatePlan,
    refreshFromServer,
    account,
    planActive,
    planId,
    planExpiresAt,
    isAdmin,
    freeUsesRemaining,
  } = useEntitlement();

  const nextPath = params.get('next') || '/dashboard';
  const requestedPlan = getPlanById(params.get('plan'))?.id ?? null;

  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [selectedPlan, setSelectedPlan] = useState(requestedPlan ?? STUDIO_PLANS[2].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justSubscribed, setJustSubscribed] = useState(false);

  const activePlan = getPlanById(planId);

  // Keep the plan status fresh whenever this screen is opened.
  useEffect(() => {
    void refreshFromServer();
  }, [refreshFromServer]);

  const submitSignIn = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    signIn(name, email);
    if (requestedPlan) {
      activatePlan(requestedPlan);
      setJustSubscribed(true);
    }
    navigate(nextPath, { replace: true });
  };

  const subscribe = () => {
    setBusy(true);
    activatePlan(selectedPlan);
    setJustSubscribed(true);
    setBusy(false);
  };

  /* ── Signed out: the sign-in form ───────────────────────────────────── */
  if (!account) {
    return (
      <div className="max-w-lg mx-auto mt-6 space-y-4">
        <form onSubmit={submitSignIn} className="card">
          <div className="card-header flex items-center gap-2">
            <LogIn className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-ink-900">Sign in to ReportCard Studio</h2>
          </div>
          <div className="card-body space-y-4">
            <p className="text-sm text-ink-600">
              Your {FREE_USE_LIMIT} free report-card generations, your plan and your receipts are
              tied to this account.
            </p>
            <div>
              <label className="label" htmlFor="login-name">
                Your name *
              </label>
              <input
                id="login-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label" htmlFor="login-email">
                Email *
              </label>
              <input
                id="login-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
                autoComplete="email"
              />
              <p className="text-xs text-ink-500 mt-1">
                Your receipt, renewal reminders and plan notices are sent here.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── Signed in: account, plan status and plan chooser ───────────────── */
  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      <div className="card">
        <div className="card-body flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ink-700 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>
                Signed in as <strong>{account.email}</strong>
              </span>
            </div>
            {isAdmin ? (
              <div className="text-brand-700 font-semibold">Admin access — unlimited &amp; free.</div>
            ) : planActive && activePlan ? (
              <div className="text-emerald-700 font-semibold">
                {activePlan.name} — unlimited report cards until{' '}
                {planExpiresAt ? new Date(planExpiresAt).toLocaleDateString() : '—'}.
              </div>
            ) : (
              <div>
                <strong>{freeUsesRemaining}</strong> of {FREE_USE_LIMIT} free generations left.
              </div>
            )}
          </div>
          <button
            onClick={() => {
              signOut();
              navigate('/login', { replace: true });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {justSubscribed && (
        <div className="card border-emerald-300 bg-emerald-50">
          <div className="card-body text-sm text-emerald-800 flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Your plan is activated. A confirmation with your bill has been emailed to{' '}
            <strong>{account.email}</strong>.
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-ink-900">
              {planActive ? 'Change plan' : 'Subscribe for unlimited report cards'}
            </h3>
            <p className="text-sm text-ink-500 mt-1">
              Each plan runs for {STUDIO_PLANS[0].durationMonths} months. Prices set by Ishmaverse.
            </p>
          </div>
          <div className="card-body space-y-3">
            {STUDIO_PLANS.map((p) => {
              const current = planActive && planId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  disabled={current}
                  className={clsx(
                    'w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                    current
                      ? 'border-emerald-300 bg-emerald-50 cursor-default'
                      : selectedPlan === p.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">
                      {p.name}
                      {p.recommended && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-brand-700">
                          Most popular
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-ink-500">{p.tagline}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-bold text-ink-900">₹{p.priceInr}</span>
                    <span className="block text-[11px] text-ink-500">
                      ${p.priceUsd} · {p.durationMonths} mo
                    </span>
                  </span>
                </button>
              );
            })}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={subscribe}
                disabled={busy || (planActive && planId === selectedPlan)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {planActive ? 'Switch to this plan' : `Subscribe · ₹${getPlanById(selectedPlan)?.priceInr}`}
              </button>
              <button
                onClick={() => void refreshFromServer()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-ink-700 font-semibold hover:bg-slate-50"
                title="Re-check the plan on the server"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-ink-700 font-semibold hover:bg-slate-50"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
