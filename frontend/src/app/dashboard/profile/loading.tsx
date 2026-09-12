import React from 'react';
import { SkeletonProfile } from '@/components/ui/Skeleton';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <SkeletonProfile />
      </div>
    </div>
  );
}
