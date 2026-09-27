import { useState } from 'react';
import { Lock, Unlock, ShieldCheck, Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
import { useGreeting } from '../context/GreetingContext';
import {
  getAdminEmailHint,
  isPasswordFallbackEnabled,
  isSupabaseAuthAvailable,
  signInAdmin,
} from '../services/adminAuth';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { refreshAdmin } = useGreeting();
  const [email, setEmail] = useState(getAdminEmailHint());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const supabaseReady = isSupabaseAuthAvailable();
  const passwordReady = isPasswordFallbackEnabled();
  const showEmailField = supabaseReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      // Supabase Auth first; if it is unavailable the local password fallback
      // (VITE_ADMIN_PASSWORD) takes over. Either way, admin status is verified
      // before any dashboard content is shown.
      await signInAdmin(email, password);
      await refreshAdmin();
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = password.length > 0 && (!showEmailField || email.trim().length > 0);

  if (!supabaseReady && !passwordReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b0514] to-[#1a0b2e] flex items-center justify-center pt-24 p-4">
        <div className="w-full max-w-md bg-bg-dark-end border border-yellow-500/40 rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-full mb-4">
            <KeyRound className="w-8 h-8 text-yellow-300" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Admin sign-in is not configured</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Add <code className="text-neon-purple">VITE_ADMIN_PASSWORD</code> to your{' '}
            <code className="text-neon-purple">.env</code> file (or connect a Supabase project) and
            restart the dev server to enable the Admin Portal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0514] to-[#1a0b2e] flex items-center justify-center pt-24 pb-12 p-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-dark-end border border-neon-purple/40 rounded-2xl p-8 shadow-neon">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-neon-purple/10 rounded-full mb-4">
              <ShieldCheck className="w-10 h-10 text-neon-purple" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-gray-400">
              {showEmailField ? 'Sign in with your administrator account' : 'Enter your admin password'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {showEmailField && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@ishmaverse.com"
                    autoComplete="username"
                    className="w-full bg-bg-dark-start border border-neon-purple/40 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoFocus={!showEmailField}
                  className="w-full bg-bg-dark-start border border-neon-purple/40 rounded-xl pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-purple"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full bg-neon-purple hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-neon flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Unlock className="w-5 h-5" />
              )}
              {isLoading ? 'Verifying…' : 'Enter Admin Panel'}
            </button>

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {showEmailField
                ? 'Access is restricted to accounts on the admin allow-list and verified server-side on every action.'
                : 'Signed in with the local admin password. Your session is hashed and expires automatically after 12 hours.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
