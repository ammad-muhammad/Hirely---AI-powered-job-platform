'use client';

import React from 'react';
import Link from 'next/link';

export const CompactFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-4 px-4 sm:px-6 lg:px-8 font-sans text-xs text-zinc-500 dark:text-zinc-400 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
        <div>
          © {new Date().getFullYear()} Hirely. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy-policy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link href="/terms-of-service" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Terms of Service
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
};
