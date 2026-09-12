'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';

interface BrandLogoProps {
  className?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  href = '/',
  size = 'md',
  iconOnly = false,
}) => {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center group select-none outline-none focus:outline-none focus:ring-0 rounded-md transition-opacity hover:opacity-90',
        className
      )}
    >
      <Logo size={size} iconOnly={iconOnly} />
    </Link>
  );
};
