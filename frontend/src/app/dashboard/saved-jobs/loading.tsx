import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SavedJobsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-48 h-7" />
          <Skeleton variant="text" className="w-72 h-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="rectangular" className="w-10 h-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" className="w-40 h-4" />
                  <Skeleton variant="text" className="w-28 h-3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
