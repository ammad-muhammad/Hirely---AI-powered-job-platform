import React from 'react';
import { cn } from '@/lib/utils';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'centered' | 'card' | 'fullscreen' | 'overlay';
  className?: string;
  label?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'centered',
  className,
  label,
}) => {
  const sizeConfig = {
    sm: {
      container: 'px-2.5 py-1 text-[11px] gap-1.5 rounded-md',
      bar: 'w-1 h-3',
      text: 'text-[11px]',
    },
    md: {
      container: 'px-3.5 py-1.5 text-xs gap-2 rounded-lg',
      bar: 'w-1 h-4',
      text: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2 text-xs gap-2.5 rounded-xl',
      bar: 'w-1.5 h-5',
      text: 'text-xs font-extrabold',
    },
  };

  const loaderBadge = (
    <div
      role="status"
      aria-label={label || 'Loading...'}
      className={cn(
        'inline-flex items-center font-extrabold tracking-tight select-none border transition-all',
        'bg-zinc-900 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200 shadow-xs',
        sizeConfig[size].container,
        className
      )}
    >
      {/* Minimal Solid Dual-Bar Pulse Indicator (No gradients, no glow, no spinning ring) */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className={cn(
            'bg-white dark:bg-zinc-900 rounded-full animate-pulse',
            sizeConfig[size].bar
          )}
          style={{ animationDuration: '0.8s', animationDelay: '0s' }}
        />
        <span
          className={cn(
            'bg-white/60 dark:bg-zinc-900/60 rounded-full animate-pulse',
            sizeConfig[size].bar
          )}
          style={{ animationDuration: '0.8s', animationDelay: '0.2s' }}
        />
        <span
          className={cn(
            'bg-white/35 dark:bg-zinc-900/35 rounded-full animate-pulse',
            sizeConfig[size].bar
          )}
          style={{ animationDuration: '0.8s', animationDelay: '0.4s' }}
        />
      </div>

      <span className={cn('font-bold truncate', sizeConfig[size].text)}>
        {label || 'Hirely'}
      </span>
    </div>
  );

  if (variant === 'inline') {
    return loaderBadge;
  }

  if (variant === 'card') {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        {loaderBadge}
      </div>
    );
  }

  if (variant === 'fullscreen' || variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-50/85 dark:bg-zinc-950/85 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
        {loaderBadge}
      </div>
    );
  }

  // Default 'centered'
  return (
    <div className="w-full py-6 flex items-center justify-center font-sans">
      {loaderBadge}
    </div>
  );
};
