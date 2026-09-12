'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'pending') {
        router.push('/complete-signup');
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [isLoading, user, router]);

  // If user is already authenticated in memory with a finalized role, render children immediately
  if (user && user.role !== 'pending') {
    return <>{children}</>;
  }

  // Only render skeleton on initial cold boot when user state is unresolved
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="w-full max-w-xl space-y-4">
          <Card className="p-8 space-y-4">
            <Skeleton variant="text" className="w-48 h-8" />
            <Skeleton variant="text" className="w-72 h-5" />
            <Skeleton variant="rectangular" className="h-32 mt-4" />
          </Card>
        </div>
      </main>
    );
  }

  return null;
};
