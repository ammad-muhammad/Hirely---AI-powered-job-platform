import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      {/* Header Skeleton */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Back Link Skeleton */}
        <Skeleton variant="text" className="w-36 h-4" />

        {/* Top Header Card Skeleton */}
        <Card className="p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton variant="rectangular" className="w-16 h-16 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" className="w-72 h-8" />
              <Skeleton variant="text" className="w-48 h-4" />
              <div className="flex gap-2 pt-2">
                <Skeleton variant="rectangular" className="w-20 h-6 rounded-full" />
                <Skeleton variant="rectangular" className="w-24 h-6 rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        {/* 2-Column Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 md:p-8 space-y-4">
              <Skeleton variant="text" className="w-40 h-6" />
              <Skeleton variant="rectangular" className="h-44 rounded-xl" />
              <Skeleton variant="rectangular" className="h-32 rounded-xl" />
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <Skeleton variant="rectangular" className="h-12 rounded-xl" />
              <Skeleton variant="rectangular" className="h-10 rounded-xl" />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
