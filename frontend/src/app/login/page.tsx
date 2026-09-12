'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { AlertCircle, LogIn, CheckCircle2, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, login, login2FAVerify, isLoading: isAuthLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA step state
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [pending2FAUserId, setPending2FAUserId] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!isAuthLoading && user) {
      if (user.role === 'pending') {
        router.push('/complete-signup');
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isAuthLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const [suspendedModalReason, setSuspendedModalReason] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await login({
        email: data.email,
        password: data.password,
      });

      if (res?.requires2FA && res.userId) {
        setPending2FAUserId(res.userId);
        setStep('2fa');
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_authenticated', 'true');
      }
      router.push('/dashboard');
    } catch (err: any) {
      const responseData = err?.response?.data;
      if (responseData?.isSuspended) {
        setSuspendedModalReason(responseData.suspensionReason || 'Your account has been suspended by an administrator.');
      } else {
        const message = responseData?.message || (err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.');
        setServerError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FAVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FAUserId || !twoFactorToken.trim()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await login2FAVerify(pending2FAUserId, twoFactorToken.trim());
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_authenticated', 'true');
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid 2FA verification code.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col justify-between selection:bg-zinc-900 selection:text-white">
      {/* Global Header Navigation for easy site access */}
      <Header />

      {/* Main Login Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT EDITORIAL PANEL */}
          <div className="hidden lg:block lg:col-span-6 space-y-5 pr-4">
            <GSAPReveal direction="up" distance={16}>
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Commercial Recruitment Engine
                </span>

                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                  Sign in to your Hirely workspace
                </h1>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                  Discover verified opportunities, evaluate candidate skill scores, and track applications in real-time.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verified Employer Profiles & Job Listings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>AI Candidate Match Scoring & ATS Resume Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Direct Socket Messaging & Live Status Updates</span>
                </div>
              </div>
            </GSAPReveal>
          </div>

          {/* RIGHT COMPACT LOGIN FORM CARD */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <GSAPReveal direction="up" distance={20}>
              <Card className="p-6 space-y-5">
                {step === 'credentials' ? (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        Welcome Back
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Sign in to continue your Hirely session.
                      </p>
                    </div>

                    {serverError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{serverError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                      {/* Email Input */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="name@company.com"
                          autoComplete="email"
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle"
                          {...register('email')}
                        />
                        {errors.email && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">{errors.email.message}</span>
                        )}
                      </div>

                      {/* Password Input with Toggle */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle pr-10"
                            {...register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">{errors.password.message}</span>
                        )}
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full py-2.5 text-sm font-semibold mt-1"
                        isLoading={isSubmitting}
                      >
                        <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                        {!isSubmitting && <LogIn className="w-4 h-4 ml-1.5" />}
                      </Button>
                    </form>

                    {/* "OR" Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-semibold tracking-wider">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    {/* Continue with Google Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      onClick={() => {
                        const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
                        window.location.href = `${backendUrl}/auth/google`;
                      }}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </Button>

                    {/* Navigation to Signup */}
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      Don&apos;t have an account yet?{' '}
                      <Link
                        href="/signup"
                        className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                      >
                        Create an account
                      </Link>
                    </div>
                  </>
                ) : (
                  /* STEP 2: 2FA VERIFICATION CODE FORM */
                  <form onSubmit={handle2FAVerifySubmit} className="space-y-4">
                    <div className="space-y-1 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        Two-Factor Authentication
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Enter the 6-digit code generated by your authenticator app (Google Authenticator, Authy, etc.).
                      </p>
                    </div>

                    {serverError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{serverError}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide text-center block">
                        6-Digit Authenticator Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={twoFactorToken}
                        onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center text-xl font-mono tracking-[0.4em] py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle"
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-2.5 text-sm font-semibold"
                      disabled={twoFactorToken.length !== 6 || isSubmitting}
                      isLoading={isSubmitting}
                    >
                      <span>Verify & Complete Sign In</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('credentials');
                        setServerError(null);
                      }}
                      className="w-full text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold text-center block pt-1"
                    >
                      ← Back to password sign in
                    </button>
                  </form>
                )}
              </Card>
            </GSAPReveal>
          </div>
        </div>

        {/* ACCOUNT SUSPENDED ALERT MODAL */}
        <Modal
          isOpen={Boolean(suspendedModalReason)}
          onClose={() => setSuspendedModalReason(null)}
          title="Account Access Restricted"
          maxWidth="sm"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-start gap-3 shadow-subtle">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-red-900 dark:text-red-100">
                  Your Account Has Been Suspended
                </h4>
                <p className="text-xs leading-relaxed text-red-700 dark:text-red-300">
                  An administrator has suspended access to your account for policy compliance.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                Reason Provided by Administrator:
              </span>
              <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed italic">
                "{suspendedModalReason}"
              </p>
            </div>

            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              If you believe this suspension was made in error or wish to submit an appeal, please contact support at{' '}
              <a href="mailto:support@hirely.com" className="text-blue-600 font-bold hover:underline">
                support@hirely.com
              </a>.
            </p>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSuspendedModalReason(null)}
                className="text-xs font-bold px-4"
              >
                Acknowledge & Close
              </Button>
            </div>
          </div>
        </Modal>
      </main>

      {/* Global Footer Navigation */}
      <Footer />
    </div>
  );
}
