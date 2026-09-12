import React from 'react';
import { SkeletonDashboard } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="min-h-[70vh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-4 md:p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      <SkeletonDashboard />
    </div>
  );
}
