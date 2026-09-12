'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { JobSeekerHeader } from '@/components/navigation/JobSeekerHeader';
import { CompactFooter } from '@/components/navigation/CompactFooter';

const AIAssistantWidget = dynamic(
  () => import('@/components/AIAssistantWidget').then((mod) => mod.AIAssistantWidget),
  { ssr: false }
);

export const JobSeekerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const isMessagesPage = pathname === '/dashboard/messages';

  return (
    <ProtectedRoute>
      <div className={`bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white ${
        isMessagesPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
      }`}>
        {/* Modern Top Application Header for Candidates */}
        <JobSeekerHeader />

        {/* Workspace Main Content Container */}
        <main className={`flex-1 w-full ${
          isMessagesPage ? 'p-0 overflow-hidden flex flex-col' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8'
        }`}>
          {children}
        </main>

        {!isMessagesPage && <CompactFooter />}

        {/* Floating AI Career Assistant Widget (Hidden on messages page to avoid overlapping chat input) */}
        {user && user.role === 'job_seeker' && !isMessagesPage && (
          <AIAssistantWidget mode="job_seeker" />
        )}
      </div>
    </ProtectedRoute>
  );
};
