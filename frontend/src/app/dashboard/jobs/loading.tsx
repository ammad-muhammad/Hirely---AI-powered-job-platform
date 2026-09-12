import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function EmployerJobsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-6" />
        <Skeleton variant="rectangular" className="w-8 h-8 rounded-full" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-48 h-7" />
            <Skeleton variant="text" className="w-72 h-4" />
          </div>
          <Skeleton variant="rectangular" className="w-32 h-10 rounded-xl" />
        </div>

        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>
        </Card>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton variant="text" className="w-56 h-5" />
                  <Skeleton variant="text" className="w-36 h-3" />
                </div>
                <Skeleton variant="rectangular" className="w-20 h-6 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
