import React from 'react';
import { SkeletonCandidateCard, Skeleton } from '@/components/ui/Skeleton';

export default function CandidatesLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-6 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-64 h-7" />
          <Skeleton variant="text" className="w-96 h-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCandidateCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
