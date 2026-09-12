'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import {
  User as UserIcon,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronDown,
  FileText,
  Bookmark,
  Award,
} from 'lucide-react';

export const AccountMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const isEmployer = user.role === 'employer';
  const isAdmin = user.role === 'admin';

  return (
    <div className="relative font-sans" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-2 p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors outline-none focus:outline-none focus:ring-0"
      >
        <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-subtle">
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-3.5 h-3.5" />
          )}
        </div>
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 hidden md:inline truncate max-w-[120px]">
          {user.fullName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-elevated z-50 py-2 text-xs text-zinc-800 dark:text-zinc-200 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Identity Header */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-white truncate">{user.fullName}</span>
              <Badge variant={isEmployer ? 'info' : isAdmin ? 'danger' : 'default'} size="sm">
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
            <span className="text-zinc-500 dark:text-zinc-400 block truncate text-[11px] font-normal">
              {user.email}
            </span>
          </div>

          {/* Navigation Options */}
          <div className="py-1 border-b border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-500" />
              <span>Dashboard Overview</span>
            </Link>

            {!isAdmin && !isEmployer && (
              <Link
                href="/dashboard/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium transition-colors"
              >
                <UserIcon className="w-4 h-4 text-zinc-500" />
                <span>My Profile & Resume</span>
              </Link>
            )}

            {isEmployer && (
              <>
                <Link
                  href="/dashboard/company/setup"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium transition-colors"
                >
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span>Company Profile</span>
                </Link>
                <Link
                  href="/dashboard/company/verification"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-zinc-500" />
                  <span>Verification Status</span>
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-zinc-500" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium transition-colors"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              <span>Account & Security Settings</span>
            </Link>
          </div>

          {/* Account Footer */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
