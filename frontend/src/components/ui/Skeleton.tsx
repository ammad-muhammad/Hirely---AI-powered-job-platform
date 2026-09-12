import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'text', ...props }) => {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'h-24 w-full rounded-xl',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-zinc-200/80 dark:bg-zinc-800/80 motion-reduce:animate-none',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*                        REUSABLE SKELETON PRESETS                          */
/* -------------------------------------------------------------------------- */

/**
 * Generic Skeleton Card
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3', className)}>
    <div className="flex items-center gap-3">
      <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="space-y-1.5 flex-1 min-w-0">
        <Skeleton variant="text" className="w-3/5 h-4" />
        <Skeleton variant="text" className="w-2/5 h-3" />
      </div>
    </div>
    <Skeleton variant="text" className="w-full h-3" />
    <Skeleton variant="text" className="w-4/5 h-3" />
  </div>
);

/**
 * Job Posting Card Skeleton
 */
export const SkeletonJobCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs', className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton variant="rectangular" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-44 h-4" />
          <Skeleton variant="text" className="w-28 h-3" />
        </div>
      </div>
      <Skeleton variant="rectangular" className="w-16 h-6 rounded-full shrink-0" />
    </div>
    <div className="flex items-center gap-2 pt-1">
      <Skeleton variant="rectangular" className="w-20 h-5 rounded-md" />
      <Skeleton variant="rectangular" className="w-24 h-5 rounded-md" />
      <Skeleton variant="rectangular" className="w-16 h-5 rounded-md" />
    </div>
  </div>
);

/**
 * Candidate Profile Card Skeleton
 */
export const SkeletonCandidateCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4', className)}>
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" className="w-12 h-12 shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" className="w-36 h-4" />
        <Skeleton variant="text" className="w-24 h-3" />
      </div>
    </div>
    <Skeleton variant="text" className="w-full h-3" />
    <div className="flex gap-2">
      <Skeleton variant="rectangular" className="w-14 h-5 rounded-md" />
      <Skeleton variant="rectangular" className="w-16 h-5 rounded-md" />
    </div>
  </div>
);

/**
 * Data Table Skeleton (for Admin, Users, Verifications, Applications)
 */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({
  rows = 5,
  cols = 4,
  className,
}) => (
  <div className={cn('w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden', className)}>
    {/* Table Header */}
    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" className="h-4 flex-1" style={{ maxWidth: `${100 / cols - 5}%` }} />
      ))}
    </div>
    {/* Table Rows */}
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-6 py-4 flex items-center justify-between gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" className="h-4 flex-1" style={{ maxWidth: `${100 / cols - 5}%` }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/**
 * Profile Header & Section Skeleton
 */
export const SkeletonProfile: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center md:items-start gap-5">
      <Skeleton variant="circular" className="w-20 h-20 shrink-0" />
      <div className="space-y-3 flex-1 text-center md:text-left w-full">
        <Skeleton variant="text" className="w-48 h-6 mx-auto md:mx-0" />
        <Skeleton variant="text" className="w-32 h-4 mx-auto md:mx-0" />
        <Skeleton variant="text" className="w-full h-3" />
      </div>
    </div>
    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
      <Skeleton variant="text" className="w-36 h-5" />
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-5/6 h-4" />
    </div>
  </div>
);

/**
 * Form Field Skeleton
 */
export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className,
}) => (
  <div className={cn('p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5', className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton variant="text" className="w-28 h-4" />
        <Skeleton variant="rectangular" className="h-10 rounded-xl" />
      </div>
    ))}
    <Skeleton variant="rectangular" className="w-32 h-10 rounded-xl pt-2" />
  </div>
);

/**
 * List Item Skeleton (for Notifications, Support Messages, Inbox)
 */
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
  count = 4,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <Skeleton variant="circular" className="w-9 h-9 shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton variant="text" className="w-2/5 h-4" />
          <Skeleton variant="text" className="w-4/5 h-3" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Full Dashboard Overview Skeleton
 */
export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="space-y-2">
      <Skeleton variant="text" className="w-52 h-7" />
      <Skeleton variant="text" className="w-80 h-4" />
    </div>

    {/* Metric Cards Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="text" className="w-16 h-7" />
        </div>
      ))}
    </div>

    {/* Main Data Section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonTable rows={4} cols={3} />
      </div>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  </div>
);
