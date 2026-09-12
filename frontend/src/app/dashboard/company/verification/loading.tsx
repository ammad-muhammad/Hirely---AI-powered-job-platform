import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function VerificationLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-56 h-7" />
            <Skeleton variant="text" className="w-80 h-4" />
          </div>
          <Skeleton variant="rectangular" className="h-40 rounded-xl" />
        </Card>
      </main>
    </div>
  );
}
