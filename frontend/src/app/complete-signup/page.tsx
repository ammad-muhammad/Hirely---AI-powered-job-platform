'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { User as UserIcon, Building2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CompleteSignupPage() {
  const router = useRouter();
  const { user, refreshUser, isLoading: isAuthLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'job_seeker' | 'employer'>('job_seeker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Redirect if user is not authenticated or already has a finalized role
  React.useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'pending') {
        if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setServerError(null);

    try {
      await api.post('/auth/google/complete-signup', { role: selectedRole });
      await refreshUser();
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete signup. Please try again.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col justify-between selection:bg-zinc-900 selection:text-white">
      {/* Global Header */}
      <Header />

      {/* Main Role Selection Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-12 flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto">
          <GSAPReveal direction="up" distance={20}>
            <Card className="p-8 space-y-6">
              <div className="space-y-2 text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Almost there!
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Select Your Account Type
                </h1>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {user?.fullName ? `Welcome, ${user.fullName}! ` : ''}Please choose how you plan to use Hirely to finish creating your account.
                </p>
              </div>

              {serverError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Seeker Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('job_seeker')}
                    className={cn(
                      'p-5 rounded-2xl border text-left transition-all relative space-y-3',
                      selectedRole === 'job_seeker'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900/5 dark:bg-zinc-100/5 shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Job Seeker</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Find verified jobs, build your AI resume profile, and apply with smart matching.
                      </p>
                    </div>
                  </button>

                  {/* Employer Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('employer')}
                    className={cn(
                      'p-5 rounded-2xl border text-left transition-all relative space-y-3',
                      selectedRole === 'employer'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900/5 dark:bg-zinc-100/5 shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Employer</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Post job openings, screen candidate match scores, and manage talent acquisition.
                      </p>
                    </div>
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  isLoading={isSubmitting}
                >
                  <span>{isSubmitting ? 'Completing Account Setup...' : 'Complete Account Setup'}</span>
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            </Card>
          </GSAPReveal>
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
