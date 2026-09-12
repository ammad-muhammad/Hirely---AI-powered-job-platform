'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, INotificationItem } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { api } from '@/lib/api';
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  ShieldCheck,
  Users,
  Briefcase,
  CreditCard,
  MessageSquare,
  Award,
  Clock,
  Sparkles,
  Trash2,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminNotificationsPage() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPageNotifications = useCallback(
    async (targetPage = 1) => {
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
        console.error('Failed to fetch admin notifications page:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchPageNotifications(page);
  }, [fetchPageNotifications, page]);

  if (!user || user.role !== 'admin') return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPageNotifications(page);
  };

  const filterTabs = [
    { id: 'all', label: 'All Notifications', count: notificationsList.length },
    {
      id: 'unread',
      label: 'Unread Only',
      count: notificationsList.filter((n) => !n.isRead).length,
    },
    {
      id: 'security',
      label: 'Fraud & Security',
      count: notificationsList.filter(
        (n) =>
          n.type === 'fraud_alert' ||
          n.type === 'security_alert' ||
          n.type === 'suspicious_activity' ||
          n.title?.toLowerCase().includes('fraud') ||
          n.title?.toLowerCase().includes('security')
      ).length,
    },
    {
      id: 'verifications',
      label: 'Verifications',
      count: notificationsList.filter(
        (n) =>
          n.type === 'verification_status_changed' ||
          n.type === 'verification_requested' ||
          n.relatedEntityType === 'company' ||
          n.title?.toLowerCase().includes('verification')
      ).length,
    },
    {
      id: 'users_jobs',
      label: 'Users & Jobs',
      count: notificationsList.filter(
        (n) =>
          n.type === 'new_application' ||
          n.type === 'user_registered' ||
          n.type === 'job_posted' ||
          n.relatedEntityType === 'job' ||
          n.relatedEntityType === 'user'
      ).length,
    },
  ];

  const filteredNotifications = notificationsList.filter((item) => {
    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchMessage = item.message?.toLowerCase().includes(q);
      if (!matchTitle && !matchMessage) return false;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !item.isRead;
    if (activeFilter === 'security') {
      return (
        item.type === 'fraud_alert' ||
        item.type === 'security_alert' ||
        item.type === 'suspicious_activity' ||
        item.title?.toLowerCase().includes('fraud') ||
        item.title?.toLowerCase().includes('security')
      );
    }
    if (activeFilter === 'verifications') {
      return (
        item.type === 'verification_status_changed' ||
        item.type === 'verification_requested' ||
        item.relatedEntityType === 'company' ||
        item.title?.toLowerCase().includes('verification')
      );
    }
    if (activeFilter === 'users_jobs') {
      return (
        item.type === 'new_application' ||
        item.type === 'user_registered' ||
        item.type === 'job_posted' ||
        item.relatedEntityType === 'job' ||
        item.relatedEntityType === 'user'
      );
    }
    return true;
  });

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await contextDeleteNotification(id);
    setNotificationsList((prev) => prev.filter((item) => item._id !== id));
  };

  const getAdminTargetUrl = (item: INotificationItem): string => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();
    const entityType = item.relatedEntityType;
    const entityId = item.relatedEntityId;

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
  };

  const handleNotificationClick = async (item: INotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item._id);
      setNotificationsList((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
    }
    const url = getAdminTargetUrl(item);
    if (url !== '/admin/notifications') {
      router.push(url);
    }
  };

  const getNotificationIcon = (item: INotificationItem) => {
    const type = item.type || '';
    const title = (item.title || '').toLowerCase();

    if (type === 'fraud_alert' || type === 'security_alert' || title.includes('fraud') || title.includes('security')) {
      return (
        <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
      );
    }
    if (type === 'verification_status_changed' || type === 'verification_requested' || item.relatedEntityType === 'company' || title.includes('verification')) {
      return (
        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
      );
    }
    if (item.relatedEntityType === 'job' || type === 'job_posted') {
      return (
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
          <Briefcase className="w-5 h-5" />
        </div>
      );
    }
    if (item.relatedEntityType === 'user' || type === 'user_registered') {
      return (
        <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Users className="w-5 h-5" />
        </div>
      );
    }
    if (item.relatedEntityType === 'billing' || title.includes('subscription')) {
      return (
        <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
          <CreditCard className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
        <Bell className="w-5 h-5" />
      </div>
    );
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="space-y-6 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1f1f1f] text-white shadow-sm">
              <Bell className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
              Admin Notifications Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            System activity, security alerts, company verification updates, and administrative notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await markAllAsRead();
                setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
              }}
              className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      activeFilter === tab.id
                        ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-12 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Loading administrator notifications...
            </p>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              No notifications found
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matched your search "${searchQuery}".`
                : activeFilter === 'unread'
                ? 'All caught up! There are no unread notifications.'
                : 'No administrative notifications found in this category.'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((item) => {
            const targetUrl = getAdminTargetUrl(item);
            const hasActionUrl = targetUrl !== '/admin/notifications';

            return (
              <Card
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer group shadow-sm ${
                  !item.isRead
                    ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  {getNotificationIcon(item)}

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.title}
                        </h4>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Metadata & Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {item.type && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        )}
                        {item.relatedEntityType && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {item.relatedEntityType}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        {hasActionUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                            <span>Open in Admin</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(item._id, e)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
}
