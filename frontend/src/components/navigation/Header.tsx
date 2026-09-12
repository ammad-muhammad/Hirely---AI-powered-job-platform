'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { BrandLogo } from './BrandLogo';
import { AccountMenu } from './AccountMenu';
import { NotificationMenu } from './NotificationMenu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  FileText,
  Bookmark,
  MessageSquare,
  Award,
  Briefcase,
  PlusCircle,
  Building2,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Users,
  BarChart2,
  Star,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const { totalUnreadCount } = useChat();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  const isActive = (itemHref: string) => {
    if (itemHref === '/') return pathname === '/';
    if (itemHref === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/');
    if (itemHref === '/dashboard') return pathname === '/dashboard';
    return pathname === itemHref || pathname.startsWith(itemHref + '/');
  };

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  // Define role-based navigation links
  const publicNav: NavItem[] = [
    { name: 'Find Jobs', href: '/jobs', icon: Search },
    { name: 'Browse Companies', href: '/jobs', icon: Building2 },
  ];

  const jobSeekerNav: NavItem[] = [
    { name: 'Find Jobs', href: '/jobs', icon: Search },
    { name: 'My Applications', href: '/dashboard/applications', icon: FileText },
    { name: 'Saved Jobs', href: '/dashboard/saved-jobs', icon: Bookmark },
    { name: 'Skill Tests', href: '/dashboard/skill-tests', icon: Award },
    { name: 'AI Interview', href: '/dashboard/mock-interview', icon: Sparkles },
  ];

  const employerNav: NavItem[] = [
    { name: 'Manage Jobs', href: '/dashboard/jobs', icon: Briefcase },
    { name: 'Post a Job', href: '/dashboard/jobs/post', icon: PlusCircle },
    { name: 'Candidates', href: '/dashboard/candidates', icon: Users },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    { name: 'Company Setup', href: '/dashboard/company/setup', icon: Building2 },
    { name: 'Verification', href: '/dashboard/company/verification', icon: ShieldCheck },
  ];

  const navItems: NavItem[] = user
    ? user.role === 'employer'
      ? employerNav
      : user.role === 'admin'
      ? []
      : jobSeekerNav
    : publicNav;

  return (
    <header
      className={`sticky top-0 z-40 w-full font-sans transition-colors duration-150 ${
        isScrolled
          ? 'bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-subtle'
          : 'bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* LEFT: Brand Logo */}
        <div data-cinematic="logo" className="flex items-center gap-6">
          <BrandLogo size="md" href={user ? '/dashboard' : '/'} />

          {/* DESKTOP CENTER NAVIGATION LINKS */}
          <nav data-cinematic="nav" className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    active
                      ? 'text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                  <span>{item.name}</span>

                  {Boolean(item.badge && item.badge > 0) && (
                    <Badge variant="primary" size="sm" className="ml-1">
                      {item.badge! > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* RIGHT: Actions / Account Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Direct Messages Quick Access */}
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

              {/* Real-Time Notifications Bell Menu */}
              <NotificationMenu />

              {/* Account Dropdown */}
              <AccountMenu />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

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
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Mobile Overlay */}
          <div
            className="fixed inset-0 bg-zinc-950/60 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Mobile Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-modal z-50 animate-in slide-in-from-right-full duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <BrandLogo href={user ? '/dashboard' : '/'} size="sm" />
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="space-y-1">
                {navItems.map((item) => {
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

                      {Boolean(item.badge && item.badge > 0) && (
                        <Badge variant={active ? 'outline' : 'primary'} size="sm">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Auth Actions */}
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
              {user ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs">
                    <span className="font-bold text-zinc-900 dark:text-white block truncate">{user.fullName}</span>
                    <span className="text-[11px] text-zinc-500 block truncate">{user.email}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
