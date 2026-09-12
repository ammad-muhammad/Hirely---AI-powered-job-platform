'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Settings,
  User as UserIcon,
  Mail,
  Lock,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Sliders,
  Sparkles,
  Bot,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import gsap from 'gsap';

interface PlatformConfigData {
  signupsEnabled: boolean;
  jobPostingEnabled: boolean;
  aiRateLimits: {
    resumeAnalysisLimit: number;
    coverLetterGenLimit: number;
    mockInterviewLimit: number;
  };
}

interface AdminAccountItem {
  _id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const { user, refreshUser, logout } = useAuth();

  // Tabs: 'platform' | 'account' | 'email' | 'password' | 'notifications'
  const [activeTab, setActiveTab] = useState<string>('platform');

  // Platform Maintenance & AI Config State
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [jobPostingEnabled, setJobPostingEnabled] = useState(true);
  const [resumeLimit, setResumeLimit] = useState(10);
  const [coverLetterLimit, setCoverLetterLimit] = useState(10);
  const [mockInterviewLimit, setMockInterviewLimit] = useState(5);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountItem[]>([]);
  const [isSavingPlatform, setIsSavingPlatform] = useState(false);
  const [platformMsg, setPlatformMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Email State
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification Preferences State
  const [newVerificationSubmitted, setNewVerificationSubmitted] = useState(true);
  const [verificationReviewed, setVerificationReviewed] = useState(true);
  const [newUserRegistered, setNewUserRegistered] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPlatformConfig = async () => {
    try {
      const res = await api.get('/admin/settings/platform');
      if (res.data?.success && res.data?.data) {
        const { config, adminAccounts: admins } = res.data.data;
        if (config) {
          setSignupsEnabled(config.signupsEnabled ?? true);
          setJobPostingEnabled(config.jobPostingEnabled ?? true);
          if (config.aiRateLimits) {
            setResumeLimit(config.aiRateLimits.resumeAnalysisLimit ?? 10);
            setCoverLetterLimit(config.aiRateLimits.coverLetterGenLimit ?? 10);
            setMockInterviewLimit(config.aiRateLimits.mockInterviewLimit ?? 5);
          }
        }
        if (admins) {
          setAdminAccounts(admins);
        }
      }
    } catch (err) {
      console.error('Error fetching platform config:', err);
    }
  };

  useEffect(() => {
    fetchPlatformConfig();
  }, []);

  useEffect(() => {
    if (user?.adminNotificationPrefs) {
      setNewVerificationSubmitted(user.adminNotificationPrefs.newVerificationSubmitted ?? true);
      setVerificationReviewed(user.adminNotificationPrefs.verificationReviewed ?? true);
      setNewUserRegistered(user.adminNotificationPrefs.newUserRegistered ?? true);
      setSecurityAlerts(user.adminNotificationPrefs.securityAlerts ?? true);
    }
  }, [user]);

  // GSAP entrance animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (containerRef.current && !prefersReducedMotion) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  const handlePlatformConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformMsg(null);
    setIsSavingPlatform(true);

    try {
      const res = await api.put('/admin/settings/platform', {
        signupsEnabled,
        jobPostingEnabled,
        aiRateLimits: {
          resumeAnalysisLimit: Number(resumeLimit),
          coverLetterGenLimit: Number(coverLetterLimit),
          mockInterviewLimit: Number(mockInterviewLimit),
        },
      });

      if (res.data?.success) {
        setPlatformMsg({ type: 'success', text: 'Platform configuration and AI limits updated successfully!' });
      }
    } catch (err: any) {
      setPlatformMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update platform configuration.',
      });
    } finally {
      setIsSavingPlatform(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);

    if (!newEmail.trim() || !emailCurrentPassword) {
      setEmailMsg({ type: 'error', text: 'Please enter both new email and current password.' });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await api.put('/admin/settings/email', {
        newEmail: newEmail.trim(),
        currentPassword: emailCurrentPassword,
      });

      if (res.data?.success) {
        setEmailMsg({ type: 'success', text: 'Admin email updated successfully!' });
        setNewEmail('');
        setEmailCurrentPassword('');
        await refreshUser();
      }
    } catch (err: any) {
      setEmailMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update email address.',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await api.put('/admin/settings/password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        setPasswordMsg({ type: 'success', text: 'Admin password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update password.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleNotificationPrefsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsMsg(null);
    setIsSavingPrefs(true);

    try {
      const res = await api.put('/admin/settings/notification-prefs', {
        newVerificationSubmitted,
        verificationReviewed,
        newUserRegistered,
        securityAlerts,
      });

      if (res.data?.success) {
        setPrefsMsg({ type: 'success', text: 'Notification preferences saved!' });
        await refreshUser();
      }
    } catch (err: any) {
      setPrefsMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save notification preferences.',
      });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const tabs = [
    { id: 'platform', label: 'Platform & AI Config', icon: Sliders },
    { id: 'account', label: 'Account Info', icon: UserIcon },
    { id: 'email', label: 'Change Email', icon: Mail },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div ref={containerRef} className="space-y-8 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#1f1f1f] text-white shadow-sm">
              <Settings className="w-5 h-5 text-zinc-300" />
            </div>
            <h1 className="text-2xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
              Platform Settings & Maintenance
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure platform switches, AI rate limits, admin accounts, and security preferences
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-3 ${
                  isTabActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3">
          {/* TAB 1: PLATFORM CONFIG & MAINTENANCE */}
          {activeTab === 'platform' && (
            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Platform Maintenance & Feature Switches
                </h2>
                <p className="text-xs text-zinc-500">Temporarily restrict new user signups or job postings for maintenance</p>
              </div>

              {platformMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
                  platformMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {platformMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{platformMsg.text}</span>
                </div>
              )}

              <form onSubmit={handlePlatformConfigSubmit} className="space-y-6">
                {/* Maintenance Switches */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <strong className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        Allow New User Registrations
                      </strong>
                      <span className="text-[11px] text-zinc-500 block">
                        When disabled, new job seekers and employers will see a maintenance message on signup.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={signupsEnabled}
                      onChange={(e) => setSignupsEnabled(e.target.checked)}
                      className="w-5 h-5 accent-zinc-900 rounded cursor-pointer shrink-0"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <strong className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        Allow New Job Postings
                      </strong>
                      <span className="text-[11px] text-zinc-500 block">
                        When disabled, employers cannot publish new job listings on the platform.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={jobPostingEnabled}
                      onChange={(e) => setJobPostingEnabled(e.target.checked)}
                      className="w-5 h-5 accent-zinc-900 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </div>

                {/* AI Rate Limits Section */}
                <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>AI Quota & Rate Limit Configurations</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500">Adjust max usage limits per user without redeploying backend code</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                        Resume Analysis Max Limit
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={resumeLimit}
                        onChange={(e) => setResumeLimit(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                        Cover Letter Gen Max Limit
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={coverLetterLimit}
                        onChange={(e) => setCoverLetterLimit(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                        Mock Interview Max Sessions
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={mockInterviewLimit}
                        onChange={(e) => setMockInterviewLimit(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Admin Accounts List */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
                    Registered System Administrators ({adminAccounts.length})
                  </span>

                  <div className="space-y-2">
                    {adminAccounts.map((adm) => (
                      <div key={adm._id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <strong className="text-zinc-900 dark:text-zinc-100 block">{adm.fullName}</strong>
                          <span className="text-[11px] text-zinc-400">{adm.email}</span>
                        </div>
                        <Badge variant="primary" size="sm">System Admin</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isSavingPlatform} className="text-xs font-bold">
                    Save Platform Settings
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: ACCOUNT SUMMARY */}
          {activeTab === 'account' && (
            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Administrator Account Dossier
                </h2>
                <p className="text-xs text-zinc-500">Your current system administrator credentials and access authority</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Administrator Name</span>
                  <strong className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{user?.fullName || 'System Administrator'}</strong>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Primary Admin Email</span>
                  <strong className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{user?.email}</strong>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Security Privilege Level</span>
                  <Badge variant="primary" size="md">FULL SUPERADMIN</Badge>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Account Status</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated & Active
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: CHANGE EMAIL */}
          {activeTab === 'email' && (
            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Update Administrator Email
                </h2>
                <p className="text-xs text-zinc-500">Requires current password verification for security approval</p>
              </div>

              {emailMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
                  emailMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {emailMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{emailMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Current Admin Email</label>
                  <input type="text" disabled value={user?.email || ''} className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-medium cursor-not-allowed" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">New Email Address</label>
                  <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="newadmin@hirely.com" className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Confirm Current Password</label>
                  <input type="password" required value={emailCurrentPassword} onChange={(e) => setEmailCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingEmail} className="text-xs font-bold">
                    Update Admin Email
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 4: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Update Admin Password
                </h2>
                <p className="text-xs text-zinc-500">Ensure strong password standards (minimum 6 characters)</p>
              </div>

              {passwordMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
                  passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Current Password</label>
                  <input type={showPasswords ? 'text' : 'password'} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">New Password</label>
                  <input type={showPasswords ? 'text' : 'password'} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Confirm New Password</label>
                  <input type={showPasswords ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showPass" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} className="rounded text-zinc-900" />
                  <label htmlFor="showPass" className="text-xs font-bold text-zinc-600 dark:text-zinc-400 cursor-pointer">Show Passwords</label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingPassword} className="text-xs font-bold">
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-6">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Admin Real-Time Notification Preferences
                </h2>
                <p className="text-xs text-zinc-500">Configure alert rules for live events across the platform</p>
              </div>

              {prefsMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
                  prefsMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {prefsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{prefsMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleNotificationPrefsSubmit} className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">New Employer Verification Submitted</strong>
                    <span className="text-[11px] text-zinc-500 block">Receive instant notification when an employer submits verification documents</span>
                  </div>
                  <input type="checkbox" checked={newVerificationSubmitted} onChange={(e) => setNewVerificationSubmitted(e.target.checked)} className="w-5 h-5 accent-zinc-900 rounded cursor-pointer" />
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Verification Status Reviewed</strong>
                    <span className="text-[11px] text-zinc-500 block">Notify when an admin approves or rejects an employer verification</span>
                  </div>
                  <input type="checkbox" checked={verificationReviewed} onChange={(e) => setVerificationReviewed(e.target.checked)} className="w-5 h-5 accent-zinc-900 rounded cursor-pointer" />
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">New User Registrations</strong>
                    <span className="text-[11px] text-zinc-500 block">Notify on new employer and candidate account creations</span>
                  </div>
                  <input type="checkbox" checked={newUserRegistered} onChange={(e) => setNewUserRegistered(e.target.checked)} className="w-5 h-5 accent-zinc-900 rounded cursor-pointer" />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={isSavingPrefs} className="text-xs font-bold">
                    Save Notification Rules
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
