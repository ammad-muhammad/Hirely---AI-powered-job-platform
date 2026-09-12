import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CompanySetupLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton variant="rectangular" className="w-16 h-16 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" className="w-48 h-6" />
              <Skeleton variant="text" className="w-64 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>
          <Skeleton variant="rectangular" className="h-32 rounded-xl" />
        </Card>
      </main>
    </div>
  );
}
