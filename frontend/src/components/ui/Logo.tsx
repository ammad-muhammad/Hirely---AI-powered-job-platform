'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  iconOnly?: boolean;
  className?: string;
  badgeClassName?: string;
  textClassName?: string;
  variant?: 'auto' | 'dark' | 'light';
}

/**
 * Hirely Icon Monogram SVG
 * A rounded square badge containing the signature 'H' monogram
 * with the right stroke terminating in a clean checkmark.
 */
export const LogoIcon: React.FC<{
  className?: string;
  variant?: 'auto' | 'dark' | 'light';
  style?: React.CSSProperties;
}> = ({ className, variant = 'auto', style }) => {
  // Variant styling for the badge background and internal stroke
  const badgeBg =
    variant === 'dark'
      ? 'fill-zinc-950 text-white'
      : variant === 'light'
      ? 'fill-white text-zinc-950'
      : 'fill-zinc-900 dark:fill-zinc-100 text-white dark:text-zinc-900';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={cn('shrink-0 select-none', className)}
      aria-hidden="true"
    >
      {/* Background Rounded Square Badge */}
      <rect x="0" y="0" width="100" height="100" rx="22" className={badgeBg} />

      {/* Monogram 'H' + Checkmark Strokes */}
      <g className={badgeBg}>
        {/* Left vertical stroke */}
        <path
          d="M 28 24 V 76"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Horizontal crossbar */}
        <path
          d="M 28 55 H 50"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Right upper vertical stroke */}
        <path
          d="M 56 24 V 44"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Right checkmark stroke */}
        <path
          d="M 56 55 L 66 67 L 78 52"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  iconOnly = false,
  className,
  badgeClassName,
  textClassName,
  variant = 'auto',
}) => {
  // Preset dimension mappings
  const containerClass = typeof size === 'number' ? '' : {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-9',
    xl: 'h-11',
  }[size];

  const iconClass = typeof size === 'number' ? '' : {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
    xl: 'w-11 h-11',
  }[size];

  const textClass = typeof size === 'number' ? '' : {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[size];

  const customStyle = typeof size === 'number' ? { height: `${size}px` } : undefined;
  const customIconStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div
      style={customStyle}
      className={cn('inline-flex items-center gap-2.5 font-sans select-none', containerClass, className)}
    >
      <LogoIcon
        variant={variant}
        style={customIconStyle}
        className={cn(iconClass, badgeClassName)}
      />

      {!iconOnly && (
        <span
          className={cn(
            'font-black tracking-tight text-zinc-900 dark:text-zinc-100',
            textClass,
            textClassName
          )}
        >
          Hirely
        </span>
      )}
    </div>
  );
};
