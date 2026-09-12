'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';

interface CinematicEntranceProps {
  children: React.ReactNode;
  isTriggered?: boolean;
}

export function CinematicEntrance({ children, isTriggered = true }: CinematicEntranceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isTriggered || !containerRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const container = containerRef.current;

    const logoEls = container.querySelectorAll('[data-cinematic="logo"], .cinematic-logo');
    const layoutEls = container.querySelectorAll('[data-cinematic="layout"], .cinematic-layout');
    const navEls = container.querySelectorAll('[data-cinematic="nav"], .cinematic-nav');
    const contentEls = container.querySelectorAll('[data-cinematic="content"], .cinematic-content');

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      if (logoEls.length > 0) {
        tl.fromTo(
          logoEls,
          { opacity: 0, scale: 0.95, y: -8 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4 }
        );
      }

      if (layoutEls.length > 0) {
        tl.fromTo(
          layoutEls,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4 },
          logoEls.length > 0 ? '+=0.1' : 0
        );
      }

      if (navEls.length > 0) {
        tl.fromTo(
          navEls,
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.05 },
          '-=0.2'
        );
      }

      if (contentEls.length > 0) {
        tl.fromTo(
          contentEls,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 },
          '-=0.2'
        );
      }

      if (logoEls.length === 0 && layoutEls.length === 0 && navEls.length === 0 && contentEls.length === 0) {
        tl.fromTo(
          container,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
        );
      }
    }, container);

    return () => ctx.revert();
  }, [isTriggered, pathname]);

  return <div ref={containerRef}>{children}</div>;
}
