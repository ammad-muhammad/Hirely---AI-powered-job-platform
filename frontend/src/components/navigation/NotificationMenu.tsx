'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, INotificationItem } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  CheckCheck,
  FileText,
  Users,
  MessageSquare,
  ShieldCheck,
  Award,
  Clock,
  Sparkles,
  ChevronRight,
  Trash2,
  Wand2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const NotificationMenu: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [warningModalItem, setWarningModalItem] = useState<INotificationItem | null>(null);

  if (!user) return null;

  const isWarningNotif = (item: INotificationItem): boolean => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();
    const entityType = item.relatedEntityType;
    return (
      type === 'warning' ||
      type === 'security_alert' ||
      entityType === 'warning' ||
      title.includes('warning') ||
      title.includes('suspended')
    );
  };

  const getTargetUrl = (item: INotificationItem): string => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();
    const entityType = item.relatedEntityType;
    const entityId = item.relatedEntityId;

    if (user.role === 'admin') {
      if (entityType === 'admin_message' || type === 'admin_user_reply' || title.includes('reply') || title.includes('support message')) {
        return entityId ? `/admin/messages?userId=${entityId}` : '/admin/messages';
      }
      if (type === 'fraud_alert' || type === 'security_alert' || title.includes('fraud') || title.includes('suspicious')) {
        return '/admin/fraud-detection';
      }
      if (type === 'verification_status_changed' || type === 'verification_requested' || entityType === 'company' || title.includes('verification')) {
        return entityId ? `/admin/verifications/${entityId}` : '/admin/verifications';
      }
      if (entityType === 'user' || type === 'user_registered' || title.includes('user') || title.includes('signup') || title.includes('warning')) {
        return entityId ? `/admin/users/${entityId}` : '/admin/users';
      }
      if (entityType === 'job' || type === 'job_posted' || title.includes('job')) {
        return entityId ? `/admin/jobs/${entityId}` : '/admin/jobs';
      }
      if (entityType === 'billing' || type === 'billing' || title.includes('subscription') || title.includes('payment')) {
        return '/admin/billing';
      }
      return '/admin/notifications';
    }

    // Candidate / Employer Notification Redirect Rules (Admin Direct Messages ONLY)
    if (
      type === 'admin_message' ||
      entityType === 'admin_message' ||
      title.includes('official communication') ||
      title.includes('hirely support')
    ) {
      return '/dashboard/messages?tab=support';
    }

    if (item.type === 'auto_apply_draft_ready' || item.relatedEntityType === 'auto_apply_draft') {
      return '/dashboard/auto-apply';
    }

    if (item.type === 'skill_test_badge_earned' || item.type === 'skill_test') {
      return '/dashboard/skill-tests';
    }

    const isEmployer = user.role === 'employer';
    switch (item.relatedEntityType) {
      case 'application':
        return isEmployer
          ? (entityId ? `/dashboard/candidates?applicationId=${entityId}` : '/dashboard/candidates')
          : '/dashboard/applications';
      case 'job':
        return entityId
          ? (isEmployer ? `/dashboard/jobs` : `/jobs/${entityId}`)
          : (isEmployer ? '/dashboard/jobs' : '/jobs');
      case 'chat_thread':
        return entityId ? `/dashboard/messages?threadId=${entityId}` : '/dashboard/messages';
      case 'company':
        if (isEmployer) {
          if (item.type === 'new_company_review') {
            return '/dashboard/reviews';
          }
          if (item.type === 'verification_status_changed') {
            return '/dashboard/company/verification';
          }
          return '/dashboard/company/setup';
        }
        return entityId ? `/companies/${entityId}` : '/jobs';
      default:
        return isEmployer ? '/dashboard/candidates' : '/dashboard/applications';
    }
  };

  const handleNotificationClick = async (item: INotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item._id);
    }
    setIsOpen(false);

    if (isWarningNotif(item) && user.role !== 'admin') {
      setWarningModalItem(item);
      return;
    }

    const url = getTargetUrl(item);
    if (url) {
      router.push(url);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
      case 'security_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'auto_apply_draft_ready':
        return <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'application_status_changed':
        return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'new_application':
        return <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'verification_status_changed':
        return <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'skill_test_badge_earned':
        return <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'job_closing_soon':
        return <Clock className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title="Notifications"
        aria-label="Open notifications menu"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[100] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  No notifications yet
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Updates on applications and messages will appear here.
                </p>
              </div>
            ) : (
              notifications.slice(0, 10).map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors group relative ${
                    !item.isRead
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Type Icon */}
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2">
                      {item.message}
                    </p>
                  </div>

                  {/* Unread indicator / Delete hover */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item._id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-center">
            <Link
              href={user.role === 'admin' ? '/admin/notifications' : '/dashboard/notifications'}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline inline-flex items-center gap-1"
            >
              <span>View All Notifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* STANDALONE WARNING NOTIFICATION POPUP MODAL */}
      {warningModalItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-sans text-zinc-900 dark:text-zinc-100 relative">
            <button
              type="button"
              onClick={() => setWarningModalItem(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Account Warning from Hirely
                </span>
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                  {warningModalItem.title}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                <span>Hirely Platform Administration</span>
                <span>{formatTime(warningModalItem.createdAt)}</span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-line text-zinc-800 dark:text-zinc-200 font-medium">
                {warningModalItem.message}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setWarningModalItem(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
