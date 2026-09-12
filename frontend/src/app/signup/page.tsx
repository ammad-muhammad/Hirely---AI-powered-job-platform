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
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  User as UserIcon,
  Building2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['job_seeker', 'employer'], {
      required_error: 'Please select an account type',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { user, signup, isLoading: isAuthLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'job_seeker',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await signup({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_authenticated', 'true');
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during signup';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col justify-between selection:bg-zinc-900 selection:text-white">
      {/* Global Header Navigation for easy site access */}
      <Header />

      {/* Main Signup Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT EDITORIAL PANEL */}
          <div className="hidden lg:block lg:col-span-5 space-y-5 pr-4">
            <GSAPReveal direction="up" distance={16}>
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Account Creation
                </span>

                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                  Join Hirely recruitment platform
                </h1>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                  Connect with verified opportunities or build your engineering and product team with AI matching.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Job Seeker & Employer Workspaces</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Transparent Salary & Verified Signals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Free ATS Resume Scoring & Practice Interviews</span>
                </div>
              </div>
            </GSAPReveal>
          </div>

          {/* RIGHT COMPACT SIGNUP FORM CARD */}
          <div className="lg:col-span-7 w-full max-w-md mx-auto">
            <GSAPReveal direction="up" distance={20}>
              <Card className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Create your Account
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select your role and enter your details to get started.
                  </p>
                </div>

                {serverError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{serverError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                  {/* Compact Segmented Role Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                      I want to:
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
                      <button
                        type="button"
                        onClick={() => setValue('role', 'job_seeker')}
                        className={cn(
                          'py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none',
                          selectedRole === 'job_seeker'
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                        )}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Find a Job</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setValue('role', 'employer')}
                        className={cn(
                          'py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none',
                          selectedRole === 'employer'
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                        )}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Hire Talent</span>
                      </button>
                    </div>
                    {errors.role && (
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">{errors.role.message}</span>
                    )}
                  </div>

                  {/* Full Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      autoComplete="name"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle"
                      {...register('fullName')}
                    />
                    {errors.fullName && (
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">{errors.fullName.message}</span>
                    )}
                  </div>

                  {/* Email Address Input */}
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

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Password Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle pr-9"
                          {...register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">{errors.password.message}</span>
                      )}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle pr-9"
                          {...register('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">{errors.confirmPassword.message}</span>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-2.5 text-sm font-semibold mt-1"
                    isLoading={isSubmitting}
                  >
                    <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
                    {!isSubmitting && <ArrowRight className="w-4 h-4 ml-1.5" />}
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
                    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
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

                {/* Navigation to Login */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </Card>
            </GSAPReveal>
          </div>
        </div>
      </main>

      {/* Global Footer Navigation */}
      <Footer />
    </div>
  );
}
