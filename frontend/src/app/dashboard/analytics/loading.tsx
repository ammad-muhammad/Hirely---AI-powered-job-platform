import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-64 h-7" />
          <Skeleton variant="text" className="w-96 h-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton variant="text" className="w-24 h-3" />
              <Skeleton variant="text" className="w-16 h-7" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <Skeleton variant="text" className="w-48 h-5" />
            <Skeleton variant="rectangular" className="h-64 rounded-xl" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton variant="text" className="w-48 h-5" />
            <Skeleton variant="rectangular" className="h-64 rounded-xl" />
          </Card>
        </div>
      </main>
    </div>
  );
}
