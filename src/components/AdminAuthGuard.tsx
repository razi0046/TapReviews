import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { AdminPanel } from './AdminPanel';
import { TapReviewsLogo } from './TapReviewsLogo';
import { Crown, Lock, ArrowLeft, AlertCircle, RefreshCw, Mail, Key } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface AdminAuthGuardProps {
  onNavigateToReview: (slug: string, uuid: string) => void;
  onNavigateHome: () => void;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({
  onNavigateToReview,
  onNavigateHome,
}) => {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>(
    'checking'
  );
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /**
   * Validate session & check database function is_admin()
   */
  const checkAdminAuthorization = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthStatus('unauthenticated');
      return;
    }

    try {
      // 1. Validate signed-in user via getUser()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setAdminUser(null);
        setAuthStatus('unauthenticated');
        return;
      }

      // 2. Authorize strictly through the database function is_admin()
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

      if (rpcError || isAdmin !== true) {
        // Not an approved admin: sign out immediately
        await supabase.auth.signOut();
        setAdminUser(null);
        setAuthStatus('unauthenticated');
        setErrorMessage('This account does not have administrator access.');
        return;
      }

      // Approved admin verified
      setAdminUser(user);
      setAuthStatus('authenticated');
      setErrorMessage(null);
    } catch (err) {
      console.error('Error verifying admin authorization:', err);
      setAdminUser(null);
      setAuthStatus('unauthenticated');
      setErrorMessage('Authorization check failed. Please sign in again.');
    }
  }, []);

  // Check initial session & subscribe to auth state changes
  useEffect(() => {
    let isCancelled = false;

    checkAdminAuthorization();

    const supabase = getSupabase();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (isCancelled) return;
      if (event === 'SIGNED_OUT') {
        setAdminUser(null);
        setAuthStatus('unauthenticated');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await checkAdminAuthorization();
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [checkAdminAuthorization]);

  // Handle Sign In submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const supabase = getSupabase();
    if (!supabase) {
      setIsSubmitting(false);
      setErrorMessage('Supabase is not configured. Please verify environment settings.');
      return;
    }

    try {
      // 1. Sign in through Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !authData?.user) {
        setIsSubmitting(false);
        setErrorMessage('Invalid email or password. Please check your credentials.');
        return;
      }

      // 2. Validate signed-in user with getUser()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        await supabase.auth.signOut();
        setIsSubmitting(false);
        setErrorMessage('Unable to verify user session. Please sign in again.');
        return;
      }

      // 3. Authorize strictly through database function is_admin()
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

      if (rpcError || isAdmin !== true) {
        // If they are signed in but are not an admin, deny access and sign them out immediately
        await supabase.auth.signOut();
        setAdminUser(null);
        setAuthStatus('unauthenticated');
        setIsSubmitting(false);
        setErrorMessage('This account does not have administrator access.');
        return;
      }

      // 4. Approved admin verified
      setAdminUser(user);
      setAuthStatus('authenticated');
      setIsSubmitting(false);
      setErrorMessage(null);
      setPassword('');
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setIsSubmitting(false);
      setErrorMessage('Invalid email or password. Please check your credentials.');
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAdminUser(null);
    setAuthStatus('unauthenticated');
    setErrorMessage(null);
    setPassword('');
  };

  // State 1: Brief loading state while verifying existing session
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] text-[#C5A059] flex items-center justify-center shadow-xs mb-4">
          <Crown className="w-5 h-5 stroke-[1.8]" />
        </div>
        <div className="w-6 h-6 rounded-full border-2 border-[#1C1C1E] border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#1C1C1E]">
          Checking administrator authorization...
        </p>
      </div>
    );
  }

  // State 2: Authenticated approved administrator -> render AdminPanel
  if (authStatus === 'authenticated' && adminUser) {
    return (
      <AdminPanel
        onNavigateToReview={onNavigateToReview}
        onSignOut={handleSignOut}
        adminEmail={adminUser.email}
      />
    );
  }

  // State 3: Clean, minimal Apple-inspired login screen
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1C1E] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Bar with Back-to-home button */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#636366] hover:text-[#1C1C1E] py-2 px-3 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-3xl border border-[#ECEAE4] p-7 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <TapReviewsLogo size="lg" showWordmark={false} className="mx-auto" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E]">
              TapReviews Admin Portal
            </h1>
            <p className="text-xs text-[#8E8E93]">
              Sign in with your administrator credentials to manage businesses and review links on TapReviews.
            </p>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-[#8E8E93]" />
                <span>Email address</span>
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@business.in"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="text-xs font-semibold text-[#1C1C1E] flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-[#8E8E93]" />
                <span>Password</span>
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DA] bg-[#FAF9F5] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#1C1C1E] focus:bg-white transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !email.trim() || !password}
                className="w-full h-12 rounded-full bg-[#1C1C1E] hover:bg-black text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059]" />
                    <span>Signing in to TapReviews Admin...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-[#C5A059]" />
                    <span>Sign in to TapReviews Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Note */}
          <div className="pt-2 text-center border-t border-[#F2EFE8]">
            <p className="text-[11px] text-[#8E8E93] leading-relaxed">
              Protected by Supabase Authentication and database role verification.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8E8E93]">
        <p>© 2026 TapReviews. All rights reserved.</p>
      </footer>
    </div>
  );
};
