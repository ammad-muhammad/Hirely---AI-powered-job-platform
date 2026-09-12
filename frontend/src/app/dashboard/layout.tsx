'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { JobSeekerShell } from '@/components/layout/JobSeekerShell';
import { Header } from '@/components/navigation/Header';
import { CompactFooter } from '@/components/navigation/CompactFooter';

const AIAssistantWidget = dynamic(
  () => import('@/components/AIAssistantWidget').then((mod) => mod.AIAssistantWidget),
  { ssr: false }
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isMessagesPage = pathname === '/dashboard/messages';

  // If user is a Job Seeker, use the clean top-navigation JobSeekerShell
  if (!user || user.role === 'job_seeker') {
    return (
      <ProtectedRoute>
        <JobSeekerShell>{children}</JobSeekerShell>
      </ProtectedRoute>
    );
  }

  // Employer & Admin Layout (Clean top-navigation layout, no left sidebar)
  return (
    <ProtectedRoute>
      <div className={`bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white ${
        isMessagesPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
      }`}>
        <Header />

        <main className={`flex-1 w-full ${
          isMessagesPage
            ? 'p-0 overflow-hidden flex flex-col'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8'
        }`}>
          {children}
        </main>

        {!isMessagesPage && <CompactFooter />}

        {user && user.role === 'employer' && !isMessagesPage && (
          <AIAssistantWidget mode="employer" />
        )}
      </div>
    </ProtectedRoute>
  );
}
