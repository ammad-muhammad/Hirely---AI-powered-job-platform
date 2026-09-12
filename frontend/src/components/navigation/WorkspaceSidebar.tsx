'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { BrandLogo } from './BrandLogo';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  FileText,
  Bookmark,
  MessageSquare,
  Award,
  Sparkles,
  Briefcase,
  PlusCircle,
  Building2,
  ShieldCheck,
  User,
  Users,
  BarChart2,
  Star,
} from 'lucide-react';

export const WorkspaceSidebar: React.FC = () => {
  const { user } = useAuth();
  const { totalUnreadCount } = useChat();
  const pathname = usePathname();

  if (!user) return null;

  const isActive = (itemHref: string) => {
    if (itemHref === '/dashboard') return pathname === '/dashboard';
    if (itemHref === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/');
    return pathname === itemHref || pathname.startsWith(itemHref + '/');
  };

  const jobSeekerNav = [
    { name: 'Browse Jobs', href: '/jobs', icon: Search },
    { name: 'Recommended Jobs', href: '/dashboard/recommended', icon: Sparkles },
    { name: 'My Applications', href: '/dashboard/applications', icon: FileText },
    { name: 'Saved Jobs', href: '/dashboard/saved-jobs', icon: Bookmark },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare, badge: totalUnreadCount },
    { name: 'Skill Tests', href: '/dashboard/skill-tests', icon: Award },
    { name: 'AI Interview Practice', href: '/dashboard/mock-interview', icon: Sparkles },
    { name: 'AI Resume Auditor', href: '/dashboard/resume-checker', icon: FileText },
    { name: 'My Profile', href: '/dashboard/profile', icon: User },
  ];

  const employerNav = [
    { name: 'Manage Jobs', href: '/dashboard/jobs', icon: Briefcase },
    { name: 'Post a New Job', href: '/dashboard/jobs/post', icon: PlusCircle },
    { name: 'Candidates', href: '/dashboard/candidates', icon: Users },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    { name: 'Company Reviews', href: '/dashboard/reviews', icon: Star },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare, badge: totalUnreadCount },
    { name: 'Company Profile', href: '/dashboard/company/setup', icon: Building2 },
    { name: 'Verification Status', href: '/dashboard/company/verification', icon: ShieldCheck },
  ];

  const isEmployer = user.role === 'employer';
  const navItems = isEmployer ? employerNav : jobSeekerNav;

  return (
    <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-5 space-y-6 font-sans">
      {/* Brand Mark Header */}
      <div className="px-2 pt-1">
        <BrandLogo href="/dashboard" size="md" />
      </div>

      {/* User Context Card */}
      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-subtle">
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.fullName}</h4>
          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 capitalize block truncate">
            {isEmployer ? 'Employer Workspace' : 'Candidate Workspace'}
          </span>
        </div>
      </div>

      {/* Workspace Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        <div className="px-2 pb-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          {isEmployer ? 'Hiring Tools' : 'Career Tools'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-subtle'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white dark:text-zinc-900' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </div>

              {Boolean(item.badge && item.badge > 0) && (
                <Badge variant={active ? 'outline' : 'primary'} size="sm">
                  {item.badge! > 9 ? '9+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
