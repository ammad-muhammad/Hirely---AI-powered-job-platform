'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, INotificationItem } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/navigation/Header';
import { JobSeekerHeader } from '@/components/navigation/JobSeekerHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  Trash2,
  ExternalLink,
  Filter,
  AlertTriangle,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Pagination } from '@/components/ui/Pagination';
import { api } from '@/lib/api';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification: contextDeleteNotification,
  } = useNotifications();

  const [notificationsList, setNotificationsList] = useState<INotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPageNotifications = async (targetPage = 1) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/notifications?page=${targetPage}&limit=15`);
      if (res.data?.success) {
        setNotificationsList(res.data.data || []);
        if (res.data.pagination) {
          setPage(res.data.pagination.currentPage || targetPage);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications page:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageNotifications(page);
  }, [user, page]);

  if (!user) return null;

  const filterOptions = [
    { id: 'all', label: 'All Notifications' },
    { id: 'application', label: 'Applications' },
    { id: 'new_message', label: 'Messages' },
    { id: 'verification_status_changed', label: 'Verification' },
    { id: 'skill_test_badge_earned', label: 'Skills & Badges' },
  ];

  const filteredNotifications = notificationsList.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'application') {
      return item.type === 'application_status_changed' || item.type === 'new_application';
    }
    return item.type === activeFilter;
  });

  const handleDeleteNotification = async (id: string) => {
    await contextDeleteNotification(id);
    setNotificationsList((prev) => prev.filter((item) => item._id !== id));
  };

  const getTargetUrl = (item: INotificationItem): string => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();
    const entityType = item.relatedEntityType;
    const entityId = item.relatedEntityId;

    if (user?.role === 'admin') {
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

    const isEmployer = user?.role === 'employer';
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
          if (item.type === 'new_company_review') return '/dashboard/reviews';
          if (item.type === 'verification_status_changed') return '/dashboard/company/verification';
          return '/dashboard/company/setup';
        }
        return entityId ? `/companies/${entityId}` : '/jobs';
      default:
        return isEmployer ? '/dashboard/candidates' : '/dashboard/applications';
    }
  };


  const [warningModalItem, setWarningModalItem] = useState<INotificationItem | null>(null);

  const handleNotificationClick = async (item: INotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item._id);
    }

    const titleLower = (item.title || '').toLowerCase();
    const msgLower = (item.message || '').toLowerCase();
    const isWarningOrNotice =
      item.type === 'warning' ||
      item.type === 'security_alert' ||
      item.relatedEntityType === 'warning' ||
      titleLower.includes('warning') ||
      titleLower.includes('suspended') ||
      msgLower.includes('warning');

    if (isWarningOrNotice && user?.role !== 'admin') {
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
      case 'application_status_changed':
        return <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'new_application':
        return <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'verification_status_changed':
        return <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'skill_test_badge_earned':
        return <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      case 'job_closing_soon':
        return <Clock className="w-5 h-5 text-rose-500 dark:text-rose-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />;
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
    <div className="max-w-5xl w-full mx-auto space-y-6">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle">
                <Bell className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Notifications Center
              </h1>
              {unreadCount > 0 && (
                <Badge variant="primary" size="md">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Stay up to date with job applications, candidate updates, and direct messages.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="font-bold text-xs gap-1.5 self-start sm:self-auto"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Mark All as Read</span>
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === opt.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <Card className="p-0 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-zinc-400">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Bell className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No notifications found
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {activeFilter === 'all'
                  ? "You're all caught up! No recent notifications in your inbox."
                  : 'No notifications found matching your selected filter.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item._id}
                className={`p-4 md:p-5 flex items-start justify-between gap-4 transition-colors group ${
                  !item.isRead
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
                    : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50'
                }`}
              >
                <div
                  className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0 mt-0.5 border border-zinc-200 dark:border-zinc-700/60">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          New
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">• {formatTime(item.createdAt)}</span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNotificationClick(item)}
                    className="text-xs font-bold gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDeleteNotification(item._id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* PAGINATION */}
        {!isLoading && totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={(newPage) => setPage(newPage)}
          />
        )}

      {/* OFFICIAL ADMIN WARNING / NOTICE MODAL */}
      {warningModalItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                  Official Warning Notice
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
              <Button
                variant="primary"
                size="sm"
                onClick={() => setWarningModalItem(null)}
                className="w-full sm:w-auto text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
              >
                Acknowledge & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
