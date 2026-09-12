'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { BrandLogo } from '@/components/navigation/BrandLogo';
import { NotificationMenu } from '@/components/navigation/NotificationMenu';
import { Button } from '@/components/ui/Button';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Briefcase,
  CreditCard,
  Settings,
  LogOut,
  ArrowLeft,
  User as UserIcon,
  Menu,
  X,
  ShieldAlert,
  Bell,
  HelpCircle,
  Shield,
  MessageSquare,
} from 'lucide-react';

import { AIAssistantWidget } from '@/components/AIAssistantWidget';
import { getFirstAllowedAdminPage } from '@/utils/adminPermissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarCounts, setSidebarCounts] = useState<{
    pendingVerifications: number;
    fraudCount: number;
    unreadSupportMessages: number;
  }>({
    pendingVerifications: 0,
    fraudCount: 0,
    unreadSupportMessages: 0,
  });

  const fetchSidebarCounts = async () => {
    try {
      const res = await api.get('/admin/sidebar-counts');
      if (res.data?.success) {
        setSidebarCounts({
          pendingVerifications: res.data.pendingVerifications || 0,
          fraudCount: res.data.fraudCount || 0,
          unreadSupportMessages: res.data.unreadSupportMessages || 0,
        });
      }
    } catch {
      // Ignore if unauthenticated or error
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchSidebarCounts();
    }
  }, [user, pathname]);

  // Real-time socket listener for admin counts & live permission updates
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let socketInstance: any = null;

    const initSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance) return;

      socketInstance.on('new_notification', fetchSidebarCounts);
      socketInstance.on('verification_submitted', fetchSidebarCounts);
      socketInstance.on('verification_updated', fetchSidebarCounts);
      socketInstance.on('admin_badge_update', fetchSidebarCounts);
      socketInstance.on('new_fraud_signal', fetchSidebarCounts);
      socketInstance.on('new_user_registered', fetchSidebarCounts);
      socketInstance.on('admin_user_warned', fetchSidebarCounts);
      socketInstance.on('admin_user_reply', fetchSidebarCounts);
      socketInstance.on('admin_message_received', fetchSidebarCounts);

      socketInstance.on('sub_admin_permissions_updated', (data: any) => {
        const currentUserId = user.id || (user as any)._id;
        if (currentUserId === data.targetUserId) {
          if (data.isRevoked || data.isSuspended) {
            logout();
            router.push('/admin-secret-portal');
          } else {
            refreshUser();
          }
        }
        fetchSidebarCounts();
      });

      socketInstance.on('admin_team_updated', fetchSidebarCounts);
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off('new_notification', fetchSidebarCounts);
        socketInstance.off('verification_submitted', fetchSidebarCounts);
        socketInstance.off('verification_updated', fetchSidebarCounts);
        socketInstance.off('admin_badge_update', fetchSidebarCounts);
        socketInstance.off('new_fraud_signal', fetchSidebarCounts);
        socketInstance.off('new_user_registered', fetchSidebarCounts);
        socketInstance.off('admin_user_warned', fetchSidebarCounts);
        socketInstance.off('admin_user_reply', fetchSidebarCounts);
        socketInstance.off('admin_message_received', fetchSidebarCounts);
        socketInstance.off('sub_admin_permissions_updated');
        socketInstance.off('admin_team_updated');
      }
    };
  }, [user, refreshUser, logout, router]);

  // Lock scroll on mobile menu open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  // Helper check for admin permissions
  const canView = (key: string) => {
    if (user?.isSuperAdmin === true) return true;
    if (user?.isSuperAdmin === false) {
      return Boolean(user.adminPermissions && user.adminPermissions[key] === true);
    }
    return true;
  };

  const getRequiredPermission = (path: string): string | null => {
    if (path.startsWith('/admin/dashboard')) return 'canViewOverview';
    if (path.startsWith('/admin/fraud-detection')) return 'canManageFraudDetection';
    if (path.startsWith('/admin/verifications')) return 'canManageVerifications';
    if (path.startsWith('/admin/users')) return 'canManageUsers';
    if (path.startsWith('/admin/messages')) return 'canManageUsers';
    if (path.startsWith('/admin/jobs')) return 'canManageJobs';
    if (path.startsWith('/admin/billing')) return 'canManageBilling';
    if (path.startsWith('/admin/support')) return 'canManageSupport';
    if (path.startsWith('/admin/team')) return 'canManageAdmins';
    if (path.startsWith('/admin/settings')) return 'canManageSettings';
    return null;
  };

  const requiredKey = getRequiredPermission(pathname);
  const isAccessDenied = requiredKey ? !canView(requiredKey) : false;

  // Auto-redirect sub-admin to their first permitted page if visiting restricted page or dashboard without overview access
  useEffect(() => {
    if (user && user.role === 'admin' && pathname !== '/admin-secret-portal') {
      if (pathname === '/admin' || pathname === '/admin/dashboard' || isAccessDenied) {
        const target = getFirstAllowedAdminPage(user);
        if (target && target !== pathname) {
          router.replace(target);
        }
      }
    }
  }, [user, pathname, isAccessDenied, router]);

  // If on secret portal page, render children directly
  if (pathname === '/admin-secret-portal') {
    return <>{children}</>;
  }

  // Auth & Admin verification
  if (!user || user.role !== 'admin') {
    if (typeof window !== 'undefined') {
      router.push('/admin-secret-portal');
    }
    return (
      <div className="min-h-screen bg-[#f6f7ed] dark:bg-zinc-950 flex items-center justify-center p-4 text-zinc-900 dark:text-zinc-100 text-xs font-semibold font-sans">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/admin-secret-portal');
    } catch (err) {
      console.error('Admin logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const adminNav = [
    canView('canViewOverview') && { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    canView('canManageFraudDetection') && { name: 'Fraud Detection', href: '/admin/fraud-detection', icon: ShieldAlert, badge: sidebarCounts.fraudCount },
    canView('canManageVerifications') && { name: 'Employer Verifications', href: '/admin/verifications', icon: ShieldCheck, badge: sidebarCounts.pendingVerifications },
    canView('canManageUsers') && { name: 'User Management', href: '/admin/users', icon: Users },
    canView('canManageUsers') && { name: 'Support Messages', href: '/admin/messages', icon: MessageSquare, badge: sidebarCounts.unreadSupportMessages },
    canView('canManageJobs') && { name: 'Job Management', href: '/admin/jobs', icon: Briefcase },
    canView('canManageBilling') && { name: 'Billing & Subscriptions', href: '/admin/billing', icon: CreditCard },
    canView('canManageSupport') && { name: 'Support & Recovery', href: '/admin/support', icon: HelpCircle },
    (user.isSuperAdmin === true || canView('canManageAdmins')) && { name: 'Admin Team', href: '/admin/team', icon: Shield },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell, badge: unreadCount },
    canView('canManageSettings') && { name: 'Settings', href: '/admin/settings', icon: Settings },
  ].filter(Boolean) as { name: string; href: string; icon: any; badge?: number }[];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="h-screen bg-[#f6f7ed] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col lg:flex-row font-sans overflow-hidden">
      {/* DESKTOP SIDEBAR */}
      <aside data-cinematic="layout" className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40 h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 p-5 space-y-6 shadow-sm overflow-hidden">
        {/* Brand Header */}
        <div data-cinematic="logo" className="space-y-2 shrink-0">
          <BrandLogo size="md" href="/admin/dashboard" />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Hirely Admin Core</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#1f1f1f] text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-xs">
            {user.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">{user.fullName}</h4>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider">
              {user.isSuperAdmin === true ? 'Super Admin' : 'Sub-Admin'}
            </span>
          </div>
        </div>

        {/* Navigation - Scrollable & Fits all items without cut off */}
        <nav data-cinematic="nav" className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'}`} />
                  <span className="truncate">{item.name}</span>
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm animate-pulse-subtle">
                    {item.badge! > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions - Guaranteed Logout Button at Bottom */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            className="w-full text-xs font-black text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-400 justify-center py-2.5 rounded-xl shadow-xs transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out Admin</span>
          </Button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="lg:hidden sticky top-0 z-40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 px-4 h-14 flex items-center justify-between shrink-0">
        <BrandLogo size="sm" href="/admin/dashboard" />

        <div className="flex items-center gap-2">
          <NotificationMenu />
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden font-sans">
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs" onClick={() => setIsMobileOpen(false)} />

          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-modal z-50 animate-in slide-in-from-right-full duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <BrandLogo href="/admin/dashboard" size="sm" />
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-none">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                        active
                          ? 'bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {Boolean(item.badge && item.badge > 0) && (
                        <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {item.badge! > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                isLoading={isLoggingOut}
                className="w-full text-xs font-bold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-400 justify-center py-2.5 shadow-subtle"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign Out Admin</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE CONTAINER */}
      <main className={`flex-1 lg:pl-64 h-screen flex flex-col min-w-0 ${pathname.startsWith('/admin/messages') ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* DESKTOP TOP UTILITY HEADER - STICKY FIXED AT TOP */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">Admin</span>
            <span>/</span>
            <span className="capitalize text-zinc-900 dark:text-zinc-100 font-extrabold">
              {pathname.replace('/admin/', '').replace('/', ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationMenu />
          </div>
        </header>

        <div className={`flex-1 min-w-0 max-w-full ${pathname.startsWith('/admin/messages') ? 'p-4 sm:p-5 lg:p-5 h-[calc(100vh-57px)] flex flex-col overflow-hidden' : 'p-4 sm:p-6 lg:p-8'}`}>
          {isAccessDenied ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 max-w-lg mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Access Restricted
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  You do not have administrative permission to access this module. Please contact the Super Administrator if you need permission.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(adminNav[0]?.href || '/admin/dashboard')}
                className="text-xs font-bold rounded-xl"
              >
                Return to Available Module
              </Button>
            </div>
          ) : (
            children
          )}
        </div>

        {/* FLOATING ADMIN AI INTELLIGENCE ASSISTANT */}
        <AIAssistantWidget mode="admin" />
      </main>
    </div>
  );
}

