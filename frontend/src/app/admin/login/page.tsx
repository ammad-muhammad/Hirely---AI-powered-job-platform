'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/navigation/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import gsap from 'gsap';

import { getFirstAllowedAdminPage } from '@/utils/adminPermissions';

const ADMIN_SECRET_KEY = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || 'hirely-admin-secure-2026';

function AdminLoginForm() {
  const { user, adminLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Entrance authorization state
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. If already logged in as admin, grant immediate access
    if (user && user.role === 'admin') {
      setIsAuthorized(true);
      const targetPage = getFirstAllowedAdminPage(user);
      router.push(targetPage);
      return;
    }

    // 2. Check secret key from URL search params or sessionStorage
    const providedKey = searchParams.get('secret') || searchParams.get('key');
    const storedVerification = typeof window !== 'undefined' ? sessionStorage.getItem('admin_entrance_verified') : null;

    if (providedKey === ADMIN_SECRET_KEY || storedVerification === 'true') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_entrance_verified', 'true');
      }
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [user, router, searchParams]);

  // Entrance animation respecting prefers-reduced-motion
  useEffect(() => {
    if (isAuthorized && containerRef.current) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
      }
    }
  }, [isAuthorized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await adminLogin({ email, password });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid administrator credentials.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking security clearance
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 text-xs font-semibold text-zinc-500">
        Verifying security clearance...
      </div>
    );
  }

  // 404 NOT FOUND DISPLAY FOR UNAUTHORIZED VISITORS
  if (isAuthorized === false) {
    return (
      <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-7xl font-black tracking-tighter text-zinc-300 dark:text-zinc-800">404</h1>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Page Not Found</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed font-medium">
              The page you are looking for does not exist or has been moved to a different address.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-subtle"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Homepage</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div ref={containerRef} className="max-w-sm w-full space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <BrandLogo size="lg" href="/" />

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Admin Core Portal</span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Secure clearance required for administration.
          </p>
        </div>

        {/* Authentication Card */}
        <Card className="p-6 sm:p-7 space-y-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-card">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-start gap-2.5 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hirely.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 rounded"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-2.5 text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl transition-colors shadow-subtle mt-2"
            >
              Sign in
            </Button>
          </form>
        </Card>

        {/* Footer Navigation */}
        <div className="text-center">
          <Link
            href="/login"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Standard User Sign in</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 text-xs font-semibold text-zinc-500">
          Loading portal...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
