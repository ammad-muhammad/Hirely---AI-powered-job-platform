'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import { Loader } from '@/components/ui/Loader';

function RouteTransitionObserver({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onNavigate();
  }, [pathname, searchParams, onNavigate]);

  return null;
}

export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathname = useRef(pathname);

  // Handle route resolution when pathname changes
  const handleRouteResolved = React.useCallback(() => {
    setIsNavigating(false);

    if (containerRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' }
        );
      } else {
        containerRef.current.style.opacity = '1';
      }
    }
    prevPathname.current = pathname;
  }, [pathname]);

  // Intercept link clicks to trigger route exit transition instantly
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.target &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const url = new URL(target.href);
        if (
          url.pathname !== window.location.pathname ||
          url.search !== window.location.search
        ) {
          setIsNavigating(true);
        }
      }
    };

    window.addEventListener('click', handleAnchorClick, { capture: true });
    return () => window.removeEventListener('click', handleAnchorClick, { capture: true });
  }, []);

  return (
    <div className="relative min-h-full w-full">
      <Suspense fallback={null}>
        <RouteTransitionObserver onNavigate={handleRouteResolved} />
      </Suspense>

      {/* Navigation Loading State - Centered Hirely Transition Loader (Prevents old page lingering) */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9990] bg-zinc-50/85 dark:bg-zinc-950/85 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-150">
          <Loader size="lg" variant="inline" label="Loading page..." />
        </div>
      )}

      {/* Main Page Content Container */}
      <div
        ref={containerRef}
        className={isNavigating ? 'opacity-0 pointer-events-none transition-opacity duration-150' : 'opacity-100'}
      >
        {children}
      </div>
    </div>
  );
}
