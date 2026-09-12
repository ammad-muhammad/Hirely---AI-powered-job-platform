'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { BrandLogo } from './BrandLogo';
import { AccountMenu } from './AccountMenu';
import { NotificationMenu } from './NotificationMenu';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Search,
  FileText,
  Bookmark,
  Sparkles,
  MessageSquare,
  Award,
  ChevronDown,
  Menu,
  X,
  User,
  LayoutDashboard,
  Wand2,
} from 'lucide-react';

export const JobSeekerHeader: React.FC = () => {
  const { user } = useAuth();
  const { totalUnreadCount } = useChat();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const toolsRef = useRef<HTMLDivElement>(null);

  // Passive scroll listener for header elevation
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click-outside and Escape key for tools popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsToolsOpen(false);
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock body scroll on mobile drawer open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  const isActive = (itemHref: string) => {
    if (itemHref === '/dashboard') return pathname === '/dashboard';
    if (itemHref === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/');
    return pathname === itemHref || pathname.startsWith(itemHref + '/');
  };

  const isCareerToolsActive =
    pathname.startsWith('/dashboard/resume-checker') ||
    pathname.startsWith('/dashboard/mock-interview') ||
    pathname.startsWith('/dashboard/skill-tests') ||
    pathname.startsWith('/dashboard/auto-apply');

  const mainNav = [
    { name: 'Jobs', href: '/jobs', icon: Search },
    { name: 'Applications', href: '/dashboard/applications', icon: FileText },
    { name: 'Saved', href: '/dashboard/saved-jobs', icon: Bookmark },
    { name: 'Recommended', href: '/dashboard/recommended', icon: Sparkles },
  ];

  const careerTools = [
    { name: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard, desc: 'Candidate command center' },
    { name: 'AI Auto-Apply Assistant', href: '/dashboard/auto-apply', icon: Wand2, desc: 'Semi-autonomous application drafting' },
    { name: 'AI Resume Auditor', href: '/dashboard/resume-checker', icon: FileText, desc: 'ATS score & keyword audit' },
    { name: 'AI Mock Interview', href: '/dashboard/mock-interview', icon: Sparkles, desc: 'Practice role-specific questions' },
    { name: 'Verified Skill Tests', href: '/dashboard/skill-tests', icon: Award, desc: 'Proctored technical badges' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full font-sans transition-colors duration-150 ${
        isScrolled
          ? 'bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-subtle'
          : 'bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* LEFT: Hirely Brand Logo */}
        <div className="flex items-center gap-6">
          <BrandLogo size="md" href="/dashboard" />

          {/* DESKTOP CENTER NAVIGATION */}
          <nav className="hidden lg:flex items-center gap-1">
            {mainNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    active
                      ? 'text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                  <span>{item.name}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
                </Link>
              );
            })}

            {/* CAREER TOOLS DROPDOWN */}
            <div className="relative" ref={toolsRef}>
              <button
                type="button"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  isCareerToolsActive || isToolsOpen
                    ? 'text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <span>Career Tools</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-elevated z-50 py-2 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    AI & Assessment Suite
                  </div>
                  {careerTools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const toolActive = pathname === tool.href;
                    return (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        onClick={() => setIsToolsOpen(false)}
                        className={`flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors ${
                          toolActive ? 'bg-zinc-50 dark:bg-zinc-800/50 font-bold' : ''
                        }`}
                      >
                        <ToolIcon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{tool.name}</span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">{tool.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* RIGHT: Messages & Account Menu */}
        <div className="flex items-center gap-3">
          {/* Direct Socket Messages Link */}
          <Link
            href="/dashboard/messages"
            className="relative p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Messages"
          >
            <MessageSquare className="w-4.5 h-4.5" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </Link>

          {/* Real-time Notifications Bell Menu */}
          <NotificationMenu />

          {/* Account Profile Menu */}
          <AccountMenu />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle Navigation Menu"
            className="lg:hidden p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE NAVIGATION DRAWER */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 font-sans">
          {/* Mobile Overlay */}
          <div
            className="fixed inset-0 bg-zinc-950/60 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Mobile Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-modal z-50 animate-in slide-in-from-right-full duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <BrandLogo href="/dashboard" size="sm" />
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Navigation Links */}
              <div className="space-y-4">
                <div className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Career Workspace
                </div>

                <nav className="space-y-1">
                  {mainNav.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                <div className="px-2 pt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Career Tools
                </div>

                <nav className="space-y-1">
                  {careerTools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const toolActive = pathname === tool.href;
                    return (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          toolActive
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <ToolIcon className="w-4 h-4 shrink-0" />
                        <span>{tool.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Mobile Footer User Info */}
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs">
                <span className="font-bold text-zinc-900 dark:text-white block truncate">{user?.fullName}</span>
                <span className="text-[11px] text-zinc-500 block truncate">{user?.email}</span>
              </div>
              <Link
                href="/dashboard/profile"
                onClick={() => setIsMobileOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold"
              >
                <User className="w-4 h-4" />
                <span>View Profile</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
