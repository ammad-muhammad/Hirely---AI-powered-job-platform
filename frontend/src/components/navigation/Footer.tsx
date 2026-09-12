'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { CompactFooter } from './CompactFooter';
import { Twitter, Linkedin, Github, Facebook } from 'lucide-react';

export const Footer: React.FC = () => {
  const { user } = useAuth();

  // If user is logged in (Job Seeker or Employer), render the small unobtrusive CompactFooter
  if (user && user.role !== 'admin') {
    return <CompactFooter />;
  }

  return (
    <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 font-sans text-xs text-zinc-600 dark:text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8">
        {/* Brand Overview Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <BrandLogo size="md" href={user ? '/dashboard' : '/'} />
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm text-xs font-normal">
            Hirely is Pakistan&apos;s AI-powered job matching platform connecting top tech talent with verified employers through intelligent resume analysis, skill assessment badges, and AI mock interviews.
          </p>

          {/* Social Media Links */}
          <div className="flex items-center gap-3 pt-2 text-zinc-400 dark:text-zinc-500">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Company Column */}
        <div className="space-y-3">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Company
          </h4>
          <ul className="space-y-2.5 font-medium">
            <li>
              <Link href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                About Hirely
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal Column */}
        <div className="space-y-3">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Legal
          </h4>
          <ul className="space-y-2.5 font-medium">
            <li>
              <Link href="/privacy-policy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* For Job Seekers Column */}
        <div className="space-y-3">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            For Job Seekers
          </h4>
          <ul className="space-y-2.5 font-medium">
            <li>
              <Link href="/jobs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Browse Jobs
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        {/* For Employers Column */}
        <div className="space-y-3">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            For Employers
          </h4>
          <ul className="space-y-2.5 font-medium">
            <li>
              <Link href="/signup" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Post a Job
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Sign Up
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 py-4 px-4 md:px-8 text-center text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
        © 2026 Hirely. All rights reserved.
      </div>
    </footer>
  );
};
