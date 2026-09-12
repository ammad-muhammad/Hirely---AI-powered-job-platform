import React from 'react';
import { SkeletonList, Skeleton } from '@/components/ui/Skeleton';

export default function ApplicationsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-6 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-48 h-7" />
          <Skeleton variant="text" className="w-72 h-4" />
        </div>
        <SkeletonList count={5} />
      </div>
    </div>
  );
}
