import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MapPin, Loader2, AlertCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function friendlyFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'That email address looks invalid.';
    case 'auth/user-not-found': return 'No account found with that email.';
    case 'auth/wrong-password': return 'Incorrect password. Try again.';
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Sign-in failed. Please try again.';
  }
}

export function LoginPage() {
  const { user, loading, signIn, signInWithGoogle, sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSigningIn(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setError(friendlyFirebaseError(code));
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGoogleError(msg.includes('Sign-in failed:') ? msg.replace('Sign-in failed: ', '') : 'Google sign-in failed. Try the email option below.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!validateEmail(forgotEmail)) {
      setForgotError('Enter a valid email address.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(forgotEmail);
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setForgotError(
        code === 'auth/user-not-found'
          ? 'No account found with that email.'
          : 'Could not send reset email. Try again.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 dark:bg-[#0f1115]">
      <div className="w-full max-w-sm">

        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg">
            <MapPin className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">SafeTrack</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Know where they are, always</p>
          </div>
        </div>

        {/* Forgot-password flow */}
        {showForgot ? (
          <div className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Reset your password</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">We'll send a reset link to your email.</p>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-[13px] text-gray-700 dark:text-gray-300 font-medium">Reset link sent!</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Check your inbox for {forgotEmail}</p>
                <button
                  onClick={() => { setShowForgot(false); setResetSent(false); setForgotEmail(''); }}
                  className="mt-4 text-[13px] text-accent font-medium"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full h-11 pl-9 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1115] text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                {forgotError && (
                  <div className="flex items-center gap-2 text-[12px] text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {forgotError}
                  </div>
                )}
                <Button fullWidth disabled={resetLoading} type="submit">
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="w-full text-center text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Google sign-in (primary quick option at top) */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d23] text-[14px] font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm mb-3 disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            {googleError && (
              <div className="flex items-start gap-2 mb-3 px-1 text-[12px] text-red-500">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {googleError}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-[12px] text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d23] text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent shadow-sm"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1d23] text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                  className="text-[12px] text-accent hover:text-accent-muted font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-[12px] text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button fullWidth disabled={signingIn} type="submit">
                {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-[13px] text-gray-500 dark:text-gray-400 mt-5">
              Don't have an account?{' '}
              <Link to="/signup" className="text-accent font-medium hover:underline">
                Sign Up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
