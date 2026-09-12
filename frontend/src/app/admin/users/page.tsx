'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { Pagination } from '@/components/ui/Pagination';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  User as UserIcon,
  AlertTriangle,
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  Building2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Bot,
  Award,
  AlertCircle,
  Clock,
  Globe,
  Laptop,
  MoreVertical,
} from 'lucide-react';
import gsap from 'gsap';
import { getResumeViewUrl } from '@/utils/fileHelpers';

interface UserItem {
  _id: string;
  fullName: string;
  email: string;
  role: 'job_seeker' | 'employer' | 'admin';
  phone?: string;
  location?: string;
  ipAddress?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  createdAt: string;
  quickStats?: {
    applicationsCount?: number;
    profileCompletion?: number;
    companyName?: string;
    postedJobsCount?: number;
    subscriptionTier?: 'free' | 'pro';
    isVerified?: boolean;
  };
}

interface UserDetailData {
  user: UserItem;
  roleProfile?: any;
  postedJobs?: any[];
  userApplications?: any[];
  skillTestAttempts?: any[];
  chatLogs?: any[];
  aiChatLogs?: any[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Confirm Modal States
  const [confirmUser, setConfirmUser] = useState<UserItem | null>(null);
  const [suspensionReasonInput, setSuspensionReasonInput] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserItem | null>(null);

  // User Action Dropdown State
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

  // User Detail Dossier Modal State
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailData | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [dossierTab, setDossierTab] = useState<'profile' | 'messages' | 'chatbot' | 'tests' | 'apps'>('profile');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter !== 'all') params.append('role', roleFilter);
      params.append('page', String(page));
      params.append('limit', '10');

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setUsers(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error('Error fetching admin users list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // GSAP entrance animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isLoading && containerRef.current && !prefersReducedMotion) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  const handleOpenUserDetail = async (userItem: UserItem) => {
    setIsDetailLoading(true);
    setIsDetailOpen(true);
    setDossierTab('profile');
    try {
      const res = await api.get(`/admin/users/${userItem._id}`);
      if (res.data?.success && res.data?.data) {
        setSelectedUserDetail(res.data.data);
      }
    } catch {
      setSelectedUserDetail({ user: userItem });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleExecuteStatusToggle = async () => {
    if (!confirmUser) return;
    const nextState = !confirmUser.isSuspended;
    setUpdatingId(confirmUser._id);

    try {
      const res = await api.put(`/admin/users/${confirmUser._id}/status`, {
        isSuspended: nextState,
        suspensionReason: nextState ? suspensionReasonInput || 'Account suspended for policy violations.' : undefined,
      });

      if (res.data?.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === confirmUser._id
              ? {
                  ...u,
                  isSuspended: nextState,
                  suspensionReason: nextState ? suspensionReasonInput || 'Account suspended for policy violations.' : undefined,
                }
              : u
          )
        );
        if (selectedUserDetail?.user._id === confirmUser._id) {
          setSelectedUserDetail((prev) =>
            prev
              ? {
                  ...prev,
                  user: {
                    ...prev.user,
                    isSuspended: nextState,
                    suspensionReason: nextState ? suspensionReasonInput || 'Account suspended for policy violations.' : undefined,
                  },
                }
              : null
          );
        }
        setConfirmUser(null);
        setSuspensionReasonInput('');
      }
    } catch (err) {
      console.error('Error toggling user suspension status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExecuteDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setUpdatingId(deleteConfirmUser._id);

    try {
      const res = await api.delete(`/admin/users/${deleteConfirmUser._id}`);
      if (res.data?.success) {
        setUsers((prev) => prev.filter((u) => u._id !== deleteConfirmUser._id));
        setDeleteConfirmUser(null);
        if (isDetailOpen && selectedUserDetail?.user._id === deleteConfirmUser._id) {
          setIsDetailOpen(false);
        }
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="primary" size="sm" className="whitespace-nowrap shrink-0">Admin</Badge>;
      case 'employer':
        return <Badge variant="info" size="sm" className="whitespace-nowrap shrink-0">Employer</Badge>;
      default:
        return <Badge variant="default" size="sm" className="whitespace-nowrap shrink-0">Job Seeker</Badge>;
    }
  };

  return (
      <div ref={containerRef} className="space-y-6 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        {/* Header Bar */}
        <div className="anim-nav flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#1f1f1f] text-white shadow-sm">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
                User Management & Account Dossier Center
              </h1>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Real-time user directory, role classification, warning history, and account suspension controls
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs font-extrabold text-[#1f1f1f] dark:text-zinc-300 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              {totalCount} Active Platform Accounts
            </span>
          </div>
        </div>

      {/* Filter & Search Bar */}
      <Card className="anim-hero p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by full name or email address..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'job_seeker', label: 'Job Seekers' },
              { id: 'employer', label: 'Employers' },
              { id: 'admin', label: 'Admins' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  roleFilter === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Data Table */}
      <Card className="anim-main bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle min-h-[360px] pb-16">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
            <div className="w-6 h-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading user accounts and activity metrics...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
            <Users className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No matching user accounts found</p>
            <p>Try adjusting your search criteria or role filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle min-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 text-zinc-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">User Account</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                  {users.map((userItem, idx) => {
                    const isNewUser = userItem.createdAt && Date.now() - new Date(userItem.createdAt).getTime() < 48 * 60 * 60 * 1000;
                    const isOpen = openMenuUserId === userItem._id;
                    const isBottomHalf = users.length >= 4 && idx >= users.length - 2;

                    return (
                      <tr
                        key={userItem._id}
                        className={`transition-colors ${
                          isNewUser
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
                            : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        {/* 1. User Account Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-subtle">
                              {userItem.fullName.charAt(0)}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
                                  {userItem.fullName}
                                </span>
                                {isNewUser && (
                                  <Badge variant="primary" size="sm" className="font-extrabold text-[9px] uppercase py-0 px-1.5">
                                    New Signup
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 block">{userItem.email}</span>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400/80 font-mono">
                                <span>ID: {userItem._id.slice(-6)}</span>
                                {userItem.location && <span>• {userItem.location}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role */}
                        <td className="py-3.5 px-4">{getRoleBadge(userItem.role)}</td>

                        {/* 3. Status */}
                        <td className="py-3.5 px-4">
                          {userItem.isSuspended ? (
                            <Badge variant="danger" size="sm" className="font-bold flex items-center gap-1 w-fit">
                              <UserX className="w-3 h-3" /> Suspended
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm" className="font-bold flex items-center gap-1 w-fit">
                              <UserCheck className="w-3 h-3" /> Active
                            </Badge>
                          )}
                        </td>

                        {/* 4. Actions Dropdown */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenMenuUserId(isOpen ? null : userItem._id)}
                              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-subtle flex items-center gap-1 text-xs font-bold"
                            >
                              <span>Actions</span>
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {isOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenMenuUserId(null)}
                                />
                                <div className={`absolute right-0 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-modal z-[60] py-1 font-sans text-xs divide-y divide-zinc-100 dark:divide-zinc-800 text-left ${
                                  isBottomHalf ? 'bottom-full mb-2' : 'top-full mt-2'
                                }`}>

                                  <div className="py-1">
                                    <Link
                                      href={`/admin/users/${userItem._id}`}
                                      onClick={() => setOpenMenuUserId(null)}
                                      className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                                      <span>Inspect Dossier</span>
                                    </Link>

                                    <Link
                                      href={`/admin/messages?userId=${userItem._id}`}
                                      onClick={() => setOpenMenuUserId(null)}
                                      className="flex items-center gap-2 px-3.5 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold transition-colors"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Message User</span>
                                    </Link>
                                  </div>

                                  {userItem.role !== 'admin' && (
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuUserId(null);
                                          setConfirmUser(userItem);
                                          setSuspensionReasonInput(userItem.suspensionReason || '');
                                        }}
                                        className={`w-full text-left flex items-center gap-2 px-3.5 py-2 font-bold transition-colors ${
                                          userItem.isSuspended
                                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                            : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                        }`}
                                      >
                                        {userItem.isSuspended ? (
                                          <>
                                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Reactivate Account</span>
                                          </>
                                        ) : (
                                          <>
                                            <UserX className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Suspend Account</span>
                                          </>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuUserId(null);
                                          setDeleteConfirmUser(userItem);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3.5 py-2 font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        <span>Delete User</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );

                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((userItem) => (
                <div key={userItem._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {userItem.fullName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-xs">
                          {userItem.fullName}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">{userItem.email}</span>
                      </div>
                    </div>
                    {getRoleBadge(userItem.role)}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-zinc-500">
                      {userItem.isSuspended ? 'Suspended' : 'Active Account'}
                    </span>
                    <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                      <Link href={`/admin/users/${userItem._id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          <span className="whitespace-nowrap">Inspect Dossier</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Dispatch password reset link to ${userItem.email}?`)) return;
                          try {
                            const res = await api.post('/admin/users/send-password-reset', { email: userItem.email });
                            if (res.data?.success) {
                              alert(`Password reset link dispatched to ${userItem.email}`);
                            }
                          } catch (err: any) {
                            alert(err.response?.data?.message || 'Failed to dispatch reset email.');
                          }
                        }}
                        className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 whitespace-nowrap shrink-0"
                      >
                        <span className="whitespace-nowrap">Reset Email</span>
                      </Button>
                      {userItem.role !== 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmUser(userItem);
                            setSuspensionReasonInput(userItem.suspensionReason || '');
                          }}
                          className="text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          <span className="whitespace-nowrap">{userItem.isSuspended ? 'Reactivate' : 'Suspend'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PAGINATION FOOTER */}
        {!isLoading && totalPages > 1 && (
          <div className="px-4 pb-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </Card>

      {/* CONFIRM SUSPEND MODAL WITH CUSTOM REASON MESSAGE */}
      <Modal
        isOpen={Boolean(confirmUser)}
        onClose={() => setConfirmUser(null)}
        title={confirmUser?.isSuspended ? 'Reactivate User Account' : 'Suspend User Account'}
        maxWidth="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Are you sure you want to {confirmUser?.isSuspended ? 'reactivate' : 'suspend'}{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{confirmUser?.fullName}</strong> ({confirmUser?.email})?
            </p>
          </div>

          {!confirmUser?.isSuspended && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 block">
                Suspension Reason Message (Displayed to User on Login):
              </label>
              <textarea
                value={suspensionReasonInput}
                onChange={(e) => setSuspensionReasonInput(e.target.value)}
                placeholder="e.g. Your account has been suspended due to suspicious activity and multiple policy violations."
                className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none h-24 font-medium"
              />
              <span className="text-[10px] text-zinc-400 block">
                This exact message will be shown on the user's login screen when they try to log in.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setConfirmUser(null)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={updatingId === confirmUser?._id}
              onClick={handleExecuteStatusToggle}
              className={`text-xs font-bold ${
                confirmUser?.isSuspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              Confirm {confirmUser?.isSuspended ? 'Reactivation' : 'Suspension'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        title="Permanently Delete User Account"
        maxWidth="sm"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Are you sure you want to permanently delete user{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{deleteConfirmUser?.fullName}</strong> ({deleteConfirmUser?.email})? This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmUser(null)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={updatingId === deleteConfirmUser?._id}
              onClick={handleExecuteDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Confirm Permanent Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
