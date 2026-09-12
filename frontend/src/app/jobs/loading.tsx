import React from 'react';
import { SkeletonJobCard, Skeleton } from '@/components/ui/Skeleton';

export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      {/* Header Skeleton */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <div className="flex items-center gap-3">
          <Skeleton variant="text" className="w-20 h-4" />
          <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
        </div>
      </div>

      {/* Search Header Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton variant="text" className="w-64 h-7" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Main Jobs Layout Skeleton */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonJobCard key={i} />
            ))}
          </div>

          <div className="hidden lg:block lg:col-span-2 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex items-start gap-4">
                <Skeleton variant="rectangular" className="w-14 h-14 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton variant="text" className="w-64 h-6" />
                  <Skeleton variant="text" className="w-40 h-4" />
                </div>
              </div>
              <Skeleton variant="rectangular" className="h-56 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
