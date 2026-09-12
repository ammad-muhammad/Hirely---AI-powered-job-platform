'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function TopProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);

  // Complete progress smoothly from 0 to 100% on route change
  useEffect(() => {
    setIsLoading(true);
    setOpacity(1);
    setProgress(100);

    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 200);

    const resetTimer = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setOpacity(1);
    }, 380);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(resetTimer);
    };
  }, [pathname, searchParams]);

  // Intercept link clicks for instant visual feedback
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
          setIsLoading(true);
          setProgress(50);
        }
      }
    };

    window.addEventListener('click', handleAnchorClick, { capture: true });
    return () => window.removeEventListener('click', handleAnchorClick, { capture: true });
  }, []);

  if (progress === 0 && !isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-[2.5px] bg-transparent pointer-events-none overflow-hidden select-none">
      {/* Sleek Solid Obsidian/Zinc Progress Line (No gradients, no glow, no blur) */}
      <div
        className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-250 ease-out rounded-r-full"
        style={{ width: `${progress}%`, opacity }}
      />
    </div>
  );
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarContent />
    </Suspense>
  );
}
