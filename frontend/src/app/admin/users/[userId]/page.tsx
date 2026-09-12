'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowLeft,
  User as UserIcon,
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
  AlertTriangle,
  Clock,
  Globe,
  UserX,
  UserCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw,
} from 'lucide-react';
import { getResumeViewUrl } from '@/utils/fileHelpers';
import { ChatAttachmentRenderer } from '@/components/chat/ChatAttachmentRenderer';

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
  warningCount?: number;
  lastWarningAt?: string;
  lastWarningReason?: string;
  warningHistory?: Array<{ reason: string; issuedAt: string; issuedBy?: string }>;
  createdAt: string;
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

export default function AdminUserDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = params?.userId as string;

  // Fraud Context Query Params
  const isFraudContext = searchParams.get('fraudContext') === 'true';
  const signalType = searchParams.get('signalType') || 'Suspicious Activity Detected';

  const [detailData, setDetailData] = useState<UserDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dossierTab, setDossierTab] = useState<'profile' | 'messages' | 'chatbot' | 'tests' | 'apps' | 'warnings'>('profile');

  // Suspension & Delete Modal States
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReasonInput, setSuspensionReasonInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Warning System Modal State
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnReasonInput, setWarnReasonInput] = useState('');
  const [isIssuingWarning, setIsIssuingWarning] = useState(false);

  // Admin Direct Messaging Modal State
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [adminMessagesList, setAdminMessagesList] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);

  const fetchUserDetail = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      if (res.data?.success && res.data?.data) {
        setDetailData(res.data.data);
        if (res.data.data.user?.suspensionReason) {
          setSuspensionReasonInput(res.data.data.user.suspensionReason);
        }
      }
    } catch (err) {
      console.error('Error fetching user detail dossier:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  const handleIssueWarning = async () => {
    if (!warnReasonInput.trim()) return;
    setIsIssuingWarning(true);
    try {
      const res = await api.post(`/admin/users/${userId}/warn`, { reason: warnReasonInput.trim() });
      if (res.data?.success && res.data?.data) {
        setDetailData((prev) => (prev ? { ...prev, user: res.data.data } : null));
        setShowWarnModal(false);
        setWarnReasonInput('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to issue warning.');
    } finally {
      setIsIssuingWarning(false);
    }
  };

  const fetchAdminMessages = useCallback(async () => {
    if (!userId) return;
    setIsLoadingMsgs(true);
    try {
      const res = await api.get(`/admin/messages/${userId}`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setAdminMessagesList(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin user messages:', err);
    } finally {
      setIsLoadingMsgs(false);
    }
  }, [userId]);

  const handleOpenMsgModal = () => {
    setShowMsgModal(true);
    fetchAdminMessages();
  };

  const handleSendAdminMessage = async () => {
    if (!msgInput.trim()) return;
    setIsSendingMsg(true);
    try {
      const res = await api.post(`/admin/messages/${userId}`, { message: msgInput.trim() });
      if (res.data?.success && res.data?.data) {
        setAdminMessagesList((prev) => [...prev, res.data.data]);
        setMsgInput('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleToggleSuspension = async () => {
    if (!detailData?.user) return;
    const nextState = !detailData.user.isSuspended;
    setIsUpdatingStatus(true);

    try {
      const res = await api.put(`/admin/users/${userId}/status`, {
        isSuspended: nextState,
        suspensionReason: nextState ? suspensionReasonInput || 'Account suspended for policy violations.' : undefined,
      });

      if (res.data?.success) {
        setDetailData((prev) =>
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
        setShowSuspendModal(false);
      }
    } catch (err) {
      console.error('Error toggling suspension:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!detailData?.user) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.data?.success) {
        router.push('/admin/users');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setIsUpdatingStatus(false);
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

  if (isLoading) {
    return (
      <div className="p-8 md:p-12 text-center text-xs text-zinc-500 font-sans space-y-3">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Loading full 360° user activity dossier...</p>
        <p className="text-zinc-400">Aggregating chat logs, AI interactions, IP locations, and skill test proctoring metrics.</p>
      </div>
    );
  }

  if (!detailData?.user) {
    return (
      <div className="p-8 md:p-12 text-center text-xs text-zinc-500 font-sans space-y-4">
        <UserX className="w-10 h-10 text-zinc-400 mx-auto opacity-50" />
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">User Account Not Found</h2>
        <Link href="/admin/users">
          <Button variant="outline" size="sm" className="font-bold gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Users List
          </Button>
        </Link>
      </div>
    );
  }

  const { user, roleProfile, postedJobs, userApplications, skillTestAttempts, chatLogs, aiChatLogs } = detailData;

  return (
    <div className="space-y-6 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      {/* FRAUD INVESTIGATION CONTEXT BANNER */}
      {isFraudContext && (
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Fraud Detection Context Mode
              </h3>
              <p className="text-xs font-medium mt-0.5">
                Investigating User <strong>{user.fullName}</strong> under signal: <strong className="underline">{signalType}</strong> (IP: <span className="font-mono font-bold">{user.ipAddress || 'Not recorded'}</span>)
              </p>
            </div>
          </div>

          <Link href="/admin/fraud-detection">
            <Button variant="outline" size="sm" className="text-xs font-extrabold border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100">
              Return to Fraud Investigation Matrix
            </Button>
          </Link>
        </div>
      )}

      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link href="/admin/users">
          <Button variant="outline" size="sm" className="text-xs font-bold gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Back to User Directory
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {user.role !== 'admin' && (
            <>
              {/* Direct Messaging Route Link */}
              <Link href={`/admin/messages?userId=${user._id}`}>
                <Button
                  className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message User</span>
                </Button>
              </Link>

              {/* Warning Trigger */}
              <Button
                onClick={() => setShowWarnModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Send Warning ({user.warningCount || 0}/2)</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSuspendModal(true)}
                className={`text-xs font-bold whitespace-nowrap rounded-xl ${
                  user.isSuspended
                    ? 'text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                    : 'text-red-700 border-red-300 dark:text-red-300 dark:border-red-800 hover:bg-red-50'
                }`}
              >
                {user.isSuspended ? 'Reactivate Account' : 'Suspend Account'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs font-bold text-red-600 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
              >
                Delete Account
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main User Header Hero Card */}
      <Card className="p-6 bg-zinc-900 dark:bg-zinc-950 text-white border-zinc-800 shadow-subtle space-y-4 min-w-0 max-w-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 min-w-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 text-white flex items-center justify-center font-black text-2xl shrink-0 border-2 border-zinc-700 shadow-subtle">
              {user.fullName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-black text-white tracking-tight">{user.fullName}</h1>
                {getRoleBadge(user.role)}
              </div>
              <p className="text-xs text-zinc-400 font-medium flex flex-wrap items-center gap-3">
                <span>Email: <strong className="text-zinc-200">{user.email}</strong></span>
                <span>•</span>
                <span>User ID: <strong className="font-mono text-zinc-300">{user._id}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 space-y-0.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">IP Address</span>
              <strong className="font-mono text-white text-xs">{user.ipAddress || 'Not recorded'}</strong>
            </div>

            <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 space-y-0.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Location</span>
              <strong className="text-white text-xs">{user.location || 'Not set'}</strong>
            </div>

            <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 space-y-0.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Registered</span>
              <strong className="text-white text-xs">{new Date(user.createdAt).toLocaleDateString()}</strong>
            </div>

            <div className="self-center">
              {user.isSuspended ? (
                <Badge variant="danger" size="sm" className="font-extrabold px-3 py-1 text-xs">
                  Account Suspended
                </Badge>
              ) : (
                <Badge variant="success" size="sm" className="font-extrabold px-3 py-1 text-xs">
                  Active Account
                </Badge>
              )}
            </div>
          </div>
        </div>

        {user.isSuspended && user.suspensionReason && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span><strong>Suspension Reason:</strong> "{user.suspensionReason}"</span>
            </div>
            {user.suspendedAt && (
              <span className="text-[10px] text-red-400 shrink-0">Suspended on {new Date(user.suspendedAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </Card>

      {/* Clean Full-Width Tabs Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 w-full">
        <div className="flex flex-wrap items-center gap-2 pb-3 w-full">
          {[
            { id: 'profile', label: 'Profile & Demographics', icon: UserIcon },
            { id: 'messages', label: `Employer-Candidate Chat (${chatLogs?.length || 0})`, icon: MessageSquare },
            { id: 'chatbot', label: `AI Chatbot History (${aiChatLogs?.length || 0})`, icon: Bot },
            { id: 'tests', label: `Skill Tests & Proctoring (${skillTestAttempts?.length || 0})`, icon: Award },
            { id: 'apps', label: user.role === 'employer' ? `Posted Jobs (${postedJobs?.length || 0})` : `Applications (${userApplications?.length || 0})`, icon: Briefcase },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = dossierTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDossierTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Profile & Demographics */}
      {dossierTab === 'profile' && (
        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-6">
          <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            User Demographics & Account Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Full Name</span>
              <strong className="text-zinc-900 dark:text-zinc-100 text-sm block">{user.fullName}</strong>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Email Address</span>
              <strong className="text-zinc-900 dark:text-zinc-100 text-sm block">{user.email}</strong>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Account Phone</span>
              <strong className="text-zinc-900 dark:text-zinc-100 text-sm block">{user.phone || 'Not specified by candidate'}</strong>
            </div>
          </div>

          {user.role === 'job_seeker' && (
            <div className="space-y-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                  Complete Candidate Career & Qualification Profile
                </h3>
                {roleProfile?.profileCompletionPercentage !== undefined && (
                  <Badge variant="primary" size="sm" className="font-extrabold">
                    Profile Completion: {roleProfile.profileCompletionPercentage}%
                  </Badge>
                )}
              </div>

              {!roleProfile ? (
                <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs italic">
                  Candidate has not created a detailed career profile yet.
                </div>
              ) : (
                <>
                  {/* Parse structured JSON from roleProfile.education if present */}
                  {(() => {
                    const parsedQuals = (() => {
                      if (!roleProfile.education) return null;
                      try {
                        const parsed = JSON.parse(roleProfile.education);
                        if (parsed && typeof parsed === 'object') {
                          return {
                            workExperienceList: Array.isArray(parsed.workExperienceList) ? parsed.workExperienceList : [],
                            educationList: Array.isArray(parsed.educationList) ? parsed.educationList : [],
                            certificationList: Array.isArray(parsed.certificationList) ? parsed.certificationList : [],
                            languageList: Array.isArray(parsed.languageList) ? parsed.languageList : [],
                          };
                        }
                      } catch {
                        // Plain text fallback
                      }
                      return {
                        workExperienceList: [],
                        educationList: [{ degree: roleProfile.education, institution: 'Academic Institution' }],
                        certificationList: [],
                        languageList: [],
                      };
                    })();

                    const topDegree = parsedQuals?.educationList?.[0]
                      ? `${parsedQuals.educationList[0].degree || ''} ${parsedQuals.educationList[0].institution ? '— ' + parsedQuals.educationList[0].institution : ''}`.trim()
                      : (typeof roleProfile.education === 'string' && !roleProfile.education.startsWith('{') ? roleProfile.education : 'Not specified by candidate');

                    return (
                      <>
                        {/* Key Profile Attributes Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Highest Qualification</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 block">{topDegree || 'Not specified by candidate'}</strong>
                          </div>

                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Experience Level</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 capitalize block">{roleProfile.experienceLevel || 'Not specified by candidate'}</strong>
                          </div>

                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block">City & Country</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 block">
                              {[roleProfile.city, roleProfile.country].filter(Boolean).join(', ') || 'Not specified by candidate'}
                            </strong>
                          </div>

                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Desired Job Titles</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 block">
                              {roleProfile.desiredJobTitles && roleProfile.desiredJobTitles.length > 0
                                ? roleProfile.desiredJobTitles.join(', ')
                                : 'Not specified by candidate'}
                            </strong>
                          </div>

                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Preferred Job Types</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 capitalize block">
                              {roleProfile.preferredJobTypes && roleProfile.preferredJobTypes.length > 0
                                ? roleProfile.preferredJobTypes.join(', ')
                                : 'Not specified by candidate'}
                            </strong>
                          </div>

                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Minimum Expected Salary</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 block">
                              {roleProfile.minimumExpectedSalary
                                ? (() => {
                                    const num = Number(roleProfile.minimumExpectedSalary);
                                    const c = (roleProfile.country || 'Pakistan').toLowerCase().trim();
                                    const symbol = c === 'united states' || c === 'usa' ? '$' :
                                                   c === 'united kingdom' || c === 'uk' ? '£' :
                                                   c === 'united arab emirates' || c === 'uae' ? 'AED ' :
                                                   c === 'saudi arabia' ? 'SAR ' : 'PKR ';
                                    return `${symbol}${num.toLocaleString()} / month`;
                                  })()
                                : 'Not specified by candidate'}
                            </strong>
                          </div>

                        </div>

                        {/* Structured Work Experience List */}
                        {parsedQuals?.workExperienceList && parsedQuals.workExperienceList.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                              Professional Work History & Experience ({parsedQuals.workExperienceList.length})
                            </span>
                            <div className="space-y-3">
                              {parsedQuals.workExperienceList.map((exp: any, i: number) => (
                                <div key={exp.id || i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5 shadow-subtle text-xs">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{exp.role || 'Position'}</h4>
                                    <span className="text-[11px] font-bold text-zinc-500 font-mono">
                                      {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' - ')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                                  </p>
                                  {exp.description && (
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 pt-1 leading-relaxed whitespace-pre-wrap">
                                      {exp.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Structured Academic Education List */}
                        {parsedQuals?.educationList && parsedQuals.educationList.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                              Academic Degrees & Education History ({parsedQuals.educationList.length})
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {parsedQuals.educationList.map((edu: any, i: number) => (
                                <div key={edu.id || i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-subtle text-xs">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">{edu.degree || 'Degree / Diploma'}</h4>
                                    <span className="text-[10px] font-bold text-zinc-400 font-mono">
                                      {[edu.startDate, edu.isCurrent ? 'Present' : edu.endDate].filter(Boolean).join(' - ')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500">{edu.institution || 'University / Institution'}</p>
                                  {edu.fieldOfStudy && <p className="text-[11px] text-zinc-400">Major: {edu.fieldOfStudy}</p>}
                                  {edu.grade && <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Grade/CGPA: {edu.grade}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Structured Certifications List */}
                        {parsedQuals?.certificationList && parsedQuals.certificationList.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                              Professional Certifications & Licenses ({parsedQuals.certificationList.length})
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {parsedQuals.certificationList.map((cert: any, i: number) => (
                                <div key={cert.id || i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-subtle text-xs">
                                  <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">{cert.name}</h4>
                                  <p className="text-xs text-zinc-500">Issuer: {cert.issuingOrganization}</p>
                                  {cert.credentialId && <p className="text-[10px] text-zinc-400 font-mono">Credential ID: {cert.credentialId}</p>}
                                  {cert.expirationDate && (
                                    <p className="text-[10px] text-zinc-400">
                                      {cert.doesNotExpire ? 'Does not expire' : `Expires: ${cert.expirationDate}`}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Structured Languages List */}
                        {parsedQuals?.languageList && parsedQuals.languageList.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">
                              Spoken Languages & Proficiency
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {parsedQuals.languageList.map((lang: any, i: number) => (
                                <span key={lang.id || i} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                                  <span>{lang.language}</span>
                                  {lang.proficiency && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[9px] font-black uppercase">
                                      {lang.proficiency}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Relocation & Availability Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Open to Relocation</span>
                      <Badge variant={roleProfile.openToRelocate ? 'success' : 'default'} size="sm" className="font-extrabold">
                        {roleProfile.openToRelocate ? 'Yes' : roleProfile.openToRelocate === false ? 'No' : 'Not specified by candidate'}
                      </Badge>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Immediate Availability</span>
                      <Badge variant={roleProfile.availableImmediately ? 'success' : 'default'} size="sm" className="font-extrabold">
                        {roleProfile.availableImmediately ? 'Available Immediately' : roleProfile.availableImmediately === false ? 'Notice Period Required' : 'Not specified by candidate'}
                      </Badge>
                    </div>
                  </div>


                  {/* Bio */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">Professional Bio & Executive Summary</span>
                    {roleProfile.bio ? (
                      <p className="text-zinc-800 dark:text-zinc-200 text-xs italic leading-relaxed">"{roleProfile.bio}"</p>
                    ) : (
                      <p className="text-zinc-400 text-xs italic">Not specified by candidate</p>
                    )}
                  </div>

                  {/* Skills & Verified Skills */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase block">Claimed Skills & Competencies</span>
                      {roleProfile.skills && roleProfile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {roleProfile.skills.map((sk: string, i: number) => (
                            <span key={i} className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                              {sk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-400 text-xs italic">Not specified by candidate</p>
                      )}
                    </div>

                    {roleProfile.verifiedSkills && roleProfile.verifiedSkills.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Platform Verified Skill Badges
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {roleProfile.verifiedSkills.map((vs: any, i: number) => (
                            <span key={i} className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                              <span>{vs.skill}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black">{vs.score}% Score</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">Portfolio & Professional Web Presence</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] text-zinc-400 font-bold block">Portfolio Website</span>
                        {roleProfile.portfolioUrl ? (
                          <a href={roleProfile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline flex items-center gap-1 mt-0.5 truncate">
                            <span>{roleProfile.portfolioUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-zinc-400 italic text-xs">Not specified by candidate</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] text-zinc-400 font-bold block">LinkedIn Profile</span>
                        {roleProfile.linkedinUrl ? (
                          <a href={roleProfile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline flex items-center gap-1 mt-0.5 truncate">
                            <span>{roleProfile.linkedinUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-zinc-400 italic text-xs">Not specified by candidate</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] text-zinc-400 font-bold block">GitHub Profile</span>
                        {roleProfile.githubUrl ? (
                          <a href={roleProfile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline flex items-center gap-1 mt-0.5 truncate">
                            <span>{roleProfile.githubUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-zinc-400 italic text-xs">Not specified by candidate</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resume PDF */}
                  <div className="pt-2">
                    {roleProfile.resumeUrl ? (
                      <a
                        href={getResumeViewUrl(roleProfile.resumeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors shadow-subtle"
                      >
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>View Candidate Resume ({roleProfile.resumeOriginalFileName || 'PDF Document'})</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    ) : (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 text-xs italic">
                        Resume document not uploaded by candidate.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {user.role === 'employer' && roleProfile && (
            <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                Employer Company Dossier
              </h3>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{roleProfile.companyName}</h4>
                  <Badge variant={roleProfile.isVerified ? 'success' : 'default'} size="sm">
                    {roleProfile.isVerified ? 'Verified Organization' : 'Unverified'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500">{roleProfile.industry} • {roleProfile.companySize} employees • {roleProfile.location}</p>
                {roleProfile.description && <p className="text-xs text-zinc-700 dark:text-zinc-300 pt-1 leading-relaxed">{roleProfile.description}</p>}
              </div>
            </div>
          )}
        </Card>
      )}


      {/* TAB 2: Employer-Candidate Direct Chat Logs */}
      {dossierTab === 'messages' && (
        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Employer & Candidate Direct Chat Audit Logs
              </h2>
              <span className="text-xs text-zinc-500">Full transcript of real-time messages exchanged in candidate threads</span>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {chatLogs?.length || 0} Messages
            </span>
          </div>

          {chatLogs && chatLogs.length > 0 ? (
            <div className="space-y-3">
              {chatLogs.map((msg: any) => {
                const isSender = msg.senderId?._id === user._id;
                return (
                  <div key={msg._id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-subtle">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isSender ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {msg.senderId?.fullName || 'System'} ({msg.senderId?.role || 'User'})
                        </span>
                        {msg.threadDetails && (
                          <span className="text-[11px] text-zinc-400">
                            Thread: {msg.threadDetails.jobSeeker} ↔ {msg.threadDetails.employer}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>

                    <p className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-normal">
                      {msg.messageText}
                    </p>

                    {msg.attachmentUrl && (
                      <ChatAttachmentRenderer
                        attachmentUrl={msg.attachmentUrl}
                        fileName={(msg as any).fileName}
                        fileType={(msg as any).fileType}
                        isSelf={false}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No Direct Chat Messages Recorded</p>
              <p className="text-xs text-zinc-400">This user has not sent or received any direct candidate-employer messages.</p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: AI Chatbot Interactions */}
      {dossierTab === 'chatbot' && (
        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Hirely AI Assistant Chatbot Conversation Logs
              </h2>
              <span className="text-xs text-zinc-500">Persistent Groq AI chatbot interaction log for intent and query analysis</span>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              {aiChatLogs?.length || 0} AI Queries
            </span>
          </div>

          {aiChatLogs && aiChatLogs.length > 0 ? (
            <div className="space-y-4">
              {aiChatLogs.map((chat: any) => (
                <div key={chat._id} className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 space-y-3 shadow-subtle">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4" /> Intent: {chat.intent || 'General Query'}
                    </span>
                    <span className="text-[11px] text-zinc-400">{new Date(chat.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                    <strong className="text-[10px] text-zinc-400 block uppercase font-bold">User Prompt:</strong>
                    <p className="text-zinc-900 dark:text-zinc-100 font-medium pt-0.5">"{chat.userMessage}"</p>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-100/60 dark:bg-purple-900/40 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                    <strong className="text-[10px] text-purple-700 dark:text-purple-300 block uppercase font-bold">AI Assistant Response:</strong>
                    <p className="pt-0.5">{chat.assistantResponse}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Bot className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No AI Chatbot Conversations Recorded</p>
              <p className="text-xs text-zinc-400">This user has not asked queries to the Hirely AI Assistant yet.</p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: Skill Tests & Proctoring */}
      {dossierTab === 'tests' && (
        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Skill Assessments & Proctoring Audit Logs
              </h2>
              <span className="text-xs text-zinc-500">Test scores, badges earned, and anti-cheating proctoring violation logs</span>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {skillTestAttempts?.length || 0} Test Attempts
            </span>
          </div>

          {skillTestAttempts && skillTestAttempts.length > 0 ? (
            <div className="space-y-4">
              {skillTestAttempts.map((test: any) => (
                <div key={test._id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-subtle">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      {test.testId?.title || 'Skill Assessment'}
                    </h3>
                    <Badge variant={test.passed ? 'success' : 'danger'} size="sm" className="font-bold text-xs">
                      {test.passed ? `PASSED (${test.score}%)` : `FAILED (${test.score}%)`}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-medium">
                    <span>Category: <strong>{test.testId?.category || 'General'}</strong></span>
                    <span>•</span>
                    <span>Attempted: <strong>{new Date(test.startedAt).toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="capitalize">{test.status}</strong></span>
                  </div>

                  {test.violationLogs && test.violationLogs.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 space-y-1.5">
                      <span className="text-xs font-extrabold text-red-700 dark:text-red-300 flex items-center gap-1.5 uppercase">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Proctoring Anti-Cheating Violations ({test.violationLogs.length})
                      </span>
                      <div className="space-y-1 text-xs text-red-800 dark:text-red-200 font-mono">
                        {test.violationLogs.map((v: any, idx: number) => (
                          <div key={idx}>• {v.reason || v.message || JSON.stringify(v)}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Proctoring Clean: Zero anti-cheating violations detected during test attempt.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Award className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No Skill Test Attempts Recorded</p>
              <p className="text-xs text-zinc-400">This candidate has not attempted any skill tests on Hirely.</p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Applications / Jobs */}
      {dossierTab === 'apps' && (
        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-4">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              {user.role === 'employer' ? 'Company Posted Job Listings' : 'Candidate Job Applications'}
            </h2>
          </div>

          {user.role === 'job_seeker' ? (
            userApplications && userApplications.length > 0 ? (
              <div className="space-y-3">
                {userApplications.map((app: any) => (
                  <div key={app._id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-subtle text-xs">
                    <div className="space-y-0.5">
                      <strong className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 block">{app.jobId?.title || 'Job Listing'}</strong>
                      <span className="text-zinc-500 block">Applied on: {new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="default" size="sm" className="capitalize font-bold text-xs">{app.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No job applications submitted by this candidate.</p>
            )
          ) : (
            postedJobs && postedJobs.length > 0 ? (
              <div className="space-y-3">
                {postedJobs.map((job: any) => (
                  <div key={job._id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-subtle text-xs">
                    <div className="space-y-0.5">
                      <strong className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 block">{job.title}</strong>
                      <span className="text-zinc-500 block">{job.location} • {job.applicantCount || 0} applicants</span>
                    </div>
                    <Badge variant={job.status === 'active' ? 'success' : 'default'} size="sm" className="capitalize font-bold text-xs">{job.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No job listings posted by this employer.</p>
            )
          )}
        </Card>
      )}

      {/* SUSPEND MODAL WITH CUSTOM REASON MESSAGE */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title={user.isSuspended ? 'Reactivate User Account' : 'Suspend User Account'}
        maxWidth="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Are you sure you want to {user.isSuspended ? 'reactivate' : 'suspend'}{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{user.fullName}</strong> ({user.email})?
            </p>
          </div>

          {!user.isSuspended && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 block">
                Suspension Reason Message (Displayed to User on Login):
              </label>
              <textarea
                value={suspensionReasonInput}
                onChange={(e) => setSuspensionReasonInput(e.target.value)}
                placeholder="e.g. Your account has been suspended due to suspicious activity and policy violations."
                className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none h-24 font-medium"
              />
              <span className="text-[10px] text-zinc-400 block">
                This exact message will be shown on the user's login screen when they try to sign in.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setShowSuspendModal(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isUpdatingStatus}
              onClick={handleToggleSuspension}
              className={`text-xs font-bold ${
                user.isSuspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              Confirm {user.isSuspended ? 'Reactivation' : 'Suspension'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Permanently Delete User Account"
        maxWidth="sm"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Are you sure you want to permanently delete user{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{user.fullName}</strong> ({user.email})? This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isUpdatingStatus}
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Confirm Permanent Deletion
            </Button>
          </div>
        </div>
      </Modal>

      {/* SEND WARNING MODAL (PART 8) */}
      <Modal
        isOpen={showWarnModal}
        onClose={() => setShowWarnModal(false)}
        title={`Issue Official Warning to ${user.fullName}`}
        maxWidth="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-black uppercase text-[11px] tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Warning Policy ({user.warningCount || 0}/2 Issued)</span>
            </div>
            <p className="leading-relaxed">
              - <strong>1st Warning</strong>: Sends an official high-priority in-app notification & alert banner.<br />
              - <strong>2nd Warning</strong>: Automatically suspends the account for repeated policy violations.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 block">
              Warning Reason / Violation Detail:
            </label>
            <textarea
              value={warnReasonInput}
              onChange={(e) => setWarnReasonInput(e.target.value)}
              placeholder="e.g. Duplicate account registration from shared IP / posting misleading job descriptions."
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none h-24 font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setShowWarnModal(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isIssuingWarning}
              onClick={handleIssueWarning}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl px-5"
            >
              Issue Warning
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADMIN DIRECT MESSAGING CHAT MODAL (PART 9) */}
      <Modal
        isOpen={showMsgModal}
        onClose={() => setShowMsgModal(false)}
        title={`Official Platform Direct Chat — ${user.fullName}`}
        maxWidth="lg"
      >
        <div className="space-y-4 font-sans text-xs flex flex-col h-[480px]">
          {/* Header Info Banner */}
          <div className="p-3 rounded-xl bg-zinc-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold">Official Hirely Platform Channel</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Target: {user.email}</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#f6f7ed] dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            {isLoadingMsgs ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-500" />
                <span>Loading secure conversation history...</span>
              </div>
            ) : adminMessagesList.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-1">
                <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto opacity-50" />
                <p className="font-bold text-zinc-700 dark:text-zinc-300">No Messages Exchanged Yet</p>
                <p className="text-[11px]">Send an official platform communication directly to this user.</p>
              </div>
            ) : (
              adminMessagesList.map((m: any) => {
                const isAdmin = m.senderRole === 'admin';
                return (
                  <div
                    key={m._id}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl space-y-1 shadow-xs ${
                        isAdmin
                          ? 'bg-[#1f1f1f] text-white rounded-br-none'
                          : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] opacity-80">
                        <span className="font-black uppercase">{m.senderName}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Row */}
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAdminMessage()}
              placeholder={`Write official message to ${user.fullName}...`}
              className="flex-1 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium"
            />
            <Button
              onClick={handleSendAdminMessage}
              isLoading={isSendingMsg}
              className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl px-5 py-3 text-xs font-black flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
