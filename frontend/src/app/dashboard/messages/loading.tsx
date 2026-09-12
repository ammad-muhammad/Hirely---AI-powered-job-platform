import React from 'react';
import { SkeletonList, Skeleton } from '@/components/ui/Skeleton';

export default function MessagesLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 h-[75vh]">
        <div className="md:col-span-1 border-r border-zinc-200 dark:border-zinc-800 pr-6 space-y-4">
          <Skeleton variant="text" className="w-32 h-6" />
          <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          <SkeletonList count={5} />
        </div>
        <div className="hidden md:flex md:col-span-2 flex-col justify-between space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
            <Skeleton variant="text" className="w-40 h-5" />
          </div>
          <div className="space-y-4 flex-1">
            <Skeleton variant="rectangular" className="w-56 h-12 rounded-2xl" />
            <Skeleton variant="rectangular" className="w-64 h-14 rounded-2xl ml-auto" />
            <Skeleton variant="rectangular" className="w-48 h-10 rounded-2xl" />
          </div>
          <Skeleton variant="rectangular" className="h-12 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
