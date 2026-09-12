'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  User as UserIcon,
  Building2,
  Bell,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  Trash2,
  X,
  Key,
  Globe,
  MapPin,
  Users,
  Save,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface SettingsData {
  email: string;
  phone: string;
  role: 'job_seeker' | 'employer' | 'admin';
  fullName: string;
  twoFactorEnabled: boolean;
  communicationPrefs: {
    showOnlineStatus: boolean;
    showReadReceipts: boolean;
  };
}

interface CompanyData {
  _id?: string;
  companyName: string;
  industry: string;
  companySize: string;
  location: string;
  website: string;
  description: string;
  logoUrl?: string;
  isVerified?: boolean;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'account' | 'company' | 'notifications' | 'security' | 'danger'>('account');

  // Core Settings State
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Company Profile State (for Employers)
  const [company, setCompany] = useState<CompanyData>({
    companyName: '',
    industry: 'Software Engineering',
    companySize: '1-10',
    location: '',
    website: '',
    description: '',
  });
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // Phone Modal State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);

  // 2FA Setup Modal State
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [tempSecret, setTempSecret] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [is2FASubmitting, setIs2FASubmitting] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 2FA Disable Modal State
  const [is2FADisableModalOpen, setIs2FADisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [is2FADisableSubmitting, setIs2FADisableSubmitting] = useState(false);

  // Account Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Fetch Core User Settings
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true);
      const res = await api.get('/settings');
      if (res.data?.success && res.data?.data) {
        setSettings(res.data.data);
        setNewPhone(res.data.data.phone || '');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load user settings.';
      setErrorMsg(msg);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Fetch Employer Company Profile
  const fetchCompanyProfile = useCallback(async () => {
    if (user?.role !== 'employer') return;
    try {
      setIsLoadingCompany(true);
      const res = await api.get('/companies/me').catch(() => null);
      if (res?.data?.success && res.data?.data) {
        const c = res.data.data;
        setCompany({
          _id: c._id,
          companyName: c.companyName || '',
          industry: c.industry || 'Software Engineering',
          companySize: c.companySize || '1-10',
          location: c.location || '',
          website: c.website || '',
          description: c.description || '',
          logoUrl: c.logoUrl,
          isVerified: c.isVerified,
        });
      }
    } catch (err) {
      console.error('Failed to load company profile:', err);
    } finally {
      setIsLoadingCompany(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
    if (user?.role === 'employer') {
      fetchCompanyProfile();
    }
  }, [user, fetchSettings, fetchCompanyProfile]);

  // Flash Success Notice
  const showSuccessNotice = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Save Employer Company Profile
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'employer') return;

    if (!company.companyName.trim()) {
      setErrorMsg('Company name is required.');
      return;
    }

    try {
      setIsSavingCompany(true);
      setErrorMsg(null);

      const res = await api.put('/companies/me', {
        companyName: company.companyName.trim(),
        industry: company.industry,
        companySize: company.companySize,
        location: company.location,
        website: company.website,
        description: company.description,
      });

      if (res.data?.success) {
        showSuccessNotice('Company profile updated successfully!');
        if (res.data.data) {
          const c = res.data.data;
          setCompany({
            _id: c._id,
            companyName: c.companyName || '',
            industry: c.industry || 'Software Engineering',
            companySize: c.companySize || '1-10',
            location: c.location || '',
            website: c.website || '',
            description: c.description || '',
            logoUrl: c.logoUrl,
            isVerified: c.isVerified,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save company profile.';
      setErrorMsg(msg);
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Handle Email Update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) return;

    setIsEmailSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.put('/settings/email', {
        newEmail,
        currentPassword: emailPassword,
      });

      if (res.data?.success) {
        showSuccessNotice('Email updated successfully!');
        setIsEmailModalOpen(false);
        setNewEmail('');
        setEmailPassword('');
        fetchSettings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update email address.';
      setErrorMsg(msg);
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  // Handle Phone Update
  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPhoneSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.put('/settings/phone', { phone: newPhone });
      if (res.data?.success) {
        showSuccessNotice('Phone number updated successfully!');
        setIsPhoneModalOpen(false);
        fetchSettings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update phone number.';
      setErrorMsg(msg);
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  // Start 2FA Setup
  const handleStart2FA = async () => {
    setErrorMsg(null);
    try {
      setIsLoadingSettings(true);
      const res = await api.post('/settings/2fa/setup');
      if (res.data?.success) {
        setQrCodeUrl(res.data.qrCodeUrl);
        setTempSecret(res.data.secret);
        setIs2FASetupModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate 2FA setup.';
      setErrorMsg(msg);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Verify 2FA Token
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyToken || verifyToken.length !== 6) return;

    setIs2FASubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/settings/2fa/verify', { token: verifyToken });
      if (res.data?.success) {
        showSuccessNotice('Two-Factor Authentication is now active!');
        setIs2FASetupModalOpen(false);
        setVerifyToken('');
        fetchSettings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid 2FA code.';
      setErrorMsg(msg);
    } finally {
      setIs2FASubmitting(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    setIs2FADisableSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/settings/2fa/disable', { password: disablePassword });
      if (res.data?.success) {
        showSuccessNotice('Two-Factor Authentication disabled.');
        setIs2FADisableModalOpen(false);
        setDisablePassword('');
        fetchSettings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Incorrect password.';
      setErrorMsg(msg);
    } finally {
      setIs2FADisableSubmitting(false);
    }
  };

  // Toggle Communication Preference
  const handleTogglePref = async (key: 'showOnlineStatus' | 'showReadReceipts', val: boolean) => {
    if (!settings) return;
    const updated = { ...settings.communicationPrefs, [key]: val };

    setSettings({ ...settings, communicationPrefs: updated });

    try {
      await api.put('/settings/communication-prefs', updated);
      showSuccessNotice('Communication preferences updated.');
    } catch {
      fetchSettings();
    }
  };

  // Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return;

    setIsDeleteSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.delete('/settings/account', {
        data: { password: deletePassword },
      });

      if (res.data?.success) {
        await logout();
        router.push('/signup');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Incorrect password or deletion error.';
      setErrorMsg(msg);
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const isEmployer = user?.role === 'employer';

  const NAV_ITEMS = [
    { id: 'account', label: 'Account Overview', icon: UserIcon, desc: 'Profile details & contact info' },
    ...(isEmployer ? [{ id: 'company', label: 'Company Profile', icon: Building2, desc: 'Organization branding & info' }] : []),
    { id: 'notifications', label: 'Communication & Chat', icon: Bell, desc: 'Online status & read receipts' },
    { id: 'security', label: 'Security & 2FA', icon: ShieldCheck, desc: 'TOTP 2FA & protection' },
    { id: 'danger', label: 'Account Controls', icon: AlertTriangle, desc: 'Danger zone & deletion' },
  ];

  return (
    <div className="space-y-6">
          {/* HEADER BANNER */}
          <GSAPReveal direction="down" distance={16}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-zinc-500" />
                  <span>{isEmployer ? 'Employer Workspace Settings' : 'Account & Security Settings'}</span>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Manage organization profile, account credentials, TOTP security, and workspace preferences.
                </p>
              </div>

              {settings && (
                <Badge
                  variant={settings.role === 'employer' ? 'info' : 'default'}
                  size="md"
                  className="capitalize font-bold shrink-0 self-start md:self-auto"
                >
                  {settings.role.replace('_', ' ')} Workspace
                </Badge>
              )}
            </div>
          </GSAPReveal>

          {/* FEEDBACK BANNERS */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* MOBILE TABS SCROLLER */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {NAV_ITEMS.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 shadow-subtle'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN SETTINGS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* DESKTOP SIDEBAR NAVIGATION */}
            <div className="hidden lg:block lg:col-span-3 space-y-2 sticky top-24">
              <Card className="p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const IconComp = item.icon;
                  const isActive = activeTab === item.id;
                  const isDanger = item.id === 'danger';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 text-xs select-none ${
                        isActive
                          ? isDanger
                            ? 'bg-red-600 text-white font-bold shadow-subtle'
                            : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-subtle'
                          : isDanger
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComp className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <span className="block truncate font-bold">{item.label}</span>
                          <span
                            className={`text-[10px] block truncate font-normal ${
                              isActive ? 'opacity-80' : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'translate-x-0.5' : 'opacity-40'}`} />
                    </button>
                  );
                })}
              </Card>

              {/* Quick Summary Box */}
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1.5 text-zinc-500 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Workspace Info</span>
                <p>Logged in as <strong className="text-zinc-800 dark:text-zinc-200">{user?.fullName}</strong> ({user?.role}).</p>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="lg:col-span-9 space-y-6 min-w-0">
              {isLoadingSettings && !settings ? (
                <div className="space-y-4">
                  <Skeleton variant="rectangular" className="w-full h-48 rounded-2xl" />
                  <Skeleton variant="rectangular" className="w-full h-48 rounded-2xl" />
                </div>
              ) : (
                <>
                  {/* TAB 1: ACCOUNT OVERVIEW */}
                  {activeTab === 'account' && (
                    <GSAPReveal direction="up" distance={16}>
                      <Card className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-extrabold text-base shadow-subtle shrink-0">
                              {user?.fullName ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'US'}
                            </div>
                            <div>
                              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                                {settings?.fullName || user?.fullName}
                              </h2>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 block capitalize">
                                {settings?.role.replace('_', ' ')} Account
                              </span>
                            </div>
                          </div>

                          <Badge variant="outline" size="md" className="font-extrabold capitalize text-xs">
                            Active Account
                          </Badge>
                        </div>

                        {/* Account Identifier Items */}
                        <div className="space-y-4">
                          {/* Role Badge */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/80">
                            <div>
                              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block">Workspace Role</span>
                              <span className="text-[11px] text-zinc-500">Controls your feature access across Hirely.</span>
                            </div>
                            <Badge variant={settings?.role === 'employer' ? 'info' : 'default'} size="sm" className="capitalize font-bold">
                              {settings?.role.replace('_', ' ')}
                            </Badge>
                          </div>

                          {/* Email Address */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-zinc-400" /> Registered Email Address
                              </span>
                              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold block">
                                {settings?.email}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewEmail(settings?.email || '');
                                setIsEmailModalOpen(true);
                              }}
                              className="text-xs font-semibold shrink-0 self-start sm:self-auto"
                            >
                              Change Email
                            </Button>
                          </div>

                          {/* Contact Phone */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-zinc-400" /> Contact Phone Number
                              </span>
                              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold block">
                                {settings?.phone || 'No phone number added'}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewPhone(settings?.phone || '');
                                setIsPhoneModalOpen(true);
                              }}
                              className="text-xs font-semibold shrink-0 self-start sm:self-auto"
                            >
                              {settings?.phone ? 'Update Phone' : 'Add Phone'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </GSAPReveal>
                  )}

                  {/* TAB 2: COMPANY PROFILE (EMPLOYERS ONLY) */}
                  {activeTab === 'company' && isEmployer && (
                    <GSAPReveal direction="up" distance={16}>
                      <Card className="p-6 md:p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-zinc-500" />
                            <div>
                              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                                Employer Company Profile
                              </h2>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Organization details displayed on public job requisitions and candidate communications.
                              </p>
                            </div>
                          </div>

                          {company.isVerified ? (
                            <Badge variant="success" size="sm" className="font-bold gap-1 self-start sm:self-auto">
                              <CheckCircle2 className="w-3 h-3" /> Verified Company
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm" className="font-bold gap-1 self-start sm:self-auto">
                              <ShieldAlert className="w-3 h-3" /> Verification Pending
                            </Badge>
                          )}
                        </div>

                        {isLoadingCompany ? (
                          <div className="space-y-4">
                            <Skeleton variant="rectangular" className="w-full h-12 rounded-xl" />
                            <Skeleton variant="rectangular" className="w-full h-24 rounded-xl" />
                          </div>
                        ) : (
                          <form onSubmit={handleSaveCompany} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Input
                                label="Company Name *"
                                placeholder="e.g. Acme Corporation"
                                value={company.companyName}
                                onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                              />

                              <Select
                                label="Industry Category *"
                                value={company.industry}
                                onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                                options={[
                                  { value: 'Software Engineering', label: 'Software & Technology' },
                                  { value: 'Information Technology', label: 'Information Technology' },
                                  { value: 'Finance & Banking', label: 'Finance & Banking' },
                                  { value: 'Healthcare & Life Sciences', label: 'Healthcare & Life Sciences' },
                                  { value: 'E-Commerce & Retail', label: 'E-Commerce & Retail' },
                                  { value: 'Marketing & Advertising', label: 'Marketing & Advertising' },
                                  { value: 'Education & EdTech', label: 'Education & EdTech' },
                                  { value: 'Manufacturing & Engineering', label: 'Manufacturing & Engineering' },
                                ]}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <Select
                                label="Company Size *"
                                value={company.companySize}
                                onChange={(e) => setCompany({ ...company, companySize: e.target.value })}
                                options={[
                                  { value: '1-10', label: '1 - 10 Employees' },
                                  { value: '11-50', label: '11 - 50 Employees' },
                                  { value: '51-200', label: '51 - 200 Employees' },
                                  { value: '201-500', label: '201 - 500 Employees' },
                                  { value: '500+', label: '500+ Employees' },
                                ]}
                              />

                              <Input
                                label="Headquarters Location *"
                                placeholder="e.g. San Francisco, CA or Remote"
                                value={company.location}
                                onChange={(e) => setCompany({ ...company, location: e.target.value })}
                              />

                              <Input
                                label="Company Website"
                                placeholder="https://company.com"
                                value={company.website}
                                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Organization Overview & Mission Summary
                              </label>
                              <textarea
                                rows={4}
                                placeholder="Describe your company culture, mission, and what makes working here great..."
                                value={company.description}
                                onChange={(e) => setCompany({ ...company, description: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-colors"
                              />
                            </div>

                            <div className="pt-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/dashboard/company/verification')}
                                className="text-xs font-semibold gap-1.5"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Company Verification Status
                              </Button>

                              <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                isLoading={isSavingCompany}
                                className="text-xs font-bold gap-1.5"
                              >
                                <Save className="w-3.5 h-3.5" /> Save Company Profile
                              </Button>
                            </div>
                          </form>
                        )}
                      </Card>
                    </GSAPReveal>
                  )}

                  {/* TAB 3: NOTIFICATIONS & COMMUNICATION */}
                  {activeTab === 'notifications' && (
                    <GSAPReveal direction="up" distance={16}>
                      <Card className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                          <MessageSquare className="w-5 h-5 text-zinc-500" />
                          <div>
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                              Communication & Chat Preferences
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Control how candidate messages, typing indicators, and read receipts function across Hirely.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6 text-xs divide-y divide-zinc-200 dark:divide-zinc-800">
                          {/* Show Online Status */}
                          <div className="pt-4 first:pt-0 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs block">
                                Show Online & Typing Activity
                              </span>
                              <p className="text-[11px] text-zinc-500 max-w-lg leading-relaxed">
                                Allow candidates and team members in active messaging threads to see when you are active on the platform.
                              </p>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={settings?.communicationPrefs?.showOnlineStatus}
                              onClick={() => handleTogglePref('showOnlineStatus', !settings?.communicationPrefs?.showOnlineStatus)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                settings?.communicationPrefs?.showOnlineStatus
                                  ? 'bg-zinc-900 dark:bg-zinc-100'
                                  : 'bg-zinc-300 dark:bg-zinc-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                                  settings?.communicationPrefs?.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Show Read Receipts */}
                          <div className="pt-4 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs block">
                                Show Message Read Receipts
                              </span>
                              <p className="text-[11px] text-zinc-500 max-w-lg leading-relaxed">
                                Display read status double-checks when you view incoming candidate messages.
                              </p>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={settings?.communicationPrefs?.showReadReceipts}
                              onClick={() => handleTogglePref('showReadReceipts', !settings?.communicationPrefs?.showReadReceipts)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                settings?.communicationPrefs?.showReadReceipts
                                  ? 'bg-zinc-900 dark:bg-zinc-100'
                                  : 'bg-zinc-300 dark:bg-zinc-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                                  settings?.communicationPrefs?.showReadReceipts ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </GSAPReveal>
                  )}

                  {/* TAB 4: SECURITY & 2FA */}
                  {activeTab === 'security' && (
                    <GSAPReveal direction="up" distance={16}>
                      <Card className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                              Security & Two-Factor Protection (TOTP)
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Fortify your employer account with time-based one-time password (TOTP) authenticator security.
                            </p>
                          </div>
                        </div>

                        {/* Explanation Banner */}
                        <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-1.5 text-xs">
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Why Enable Two-Factor Authentication?
                          </span>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Two-Factor Authentication (2FA) adds a vital security barrier. When logging in, you will provide a 6-digit verification code from your authenticator app (Google Authenticator, Authy, 1Password) in addition to your password.
                          </p>
                        </div>

                        {/* 2FA Control Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                                TOTP Authenticator Protection
                              </span>
                              {settings?.twoFactorEnabled ? (
                                <Badge variant="success" size="sm" className="gap-1 font-bold">
                                  <CheckCircle2 className="w-3 h-3" /> Enabled ✓
                                </Badge>
                              ) : (
                                <Badge variant="default" size="sm" className="font-semibold">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500">
                              {settings?.twoFactorEnabled
                                ? 'Your workspace account is protected with 2FA authenticator verification.'
                                : 'Secure your employer jobs and candidate communications with TOTP 2FA.'}
                            </p>
                          </div>

                          {settings?.twoFactorEnabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIs2FADisableModalOpen(true)}
                              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 shrink-0"
                            >
                              Disable 2FA
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleStart2FA}
                              className="text-xs font-extrabold shrink-0 gap-1.5"
                            >
                              <QrCode className="w-4 h-4" />
                              <span>Enable Two-Factor Auth</span>
                            </Button>
                          )}
                        </div>
                      </Card>
                    </GSAPReveal>
                  )}

                  {/* TAB 5: DANGER ZONE & ACCOUNT CONTROLS */}
                  {activeTab === 'danger' && (
                    <GSAPReveal direction="up" distance={16}>
                      <Card className="p-6 md:p-8 space-y-6 border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10">
                        <div className="flex items-center gap-3 border-b border-red-200 dark:border-red-900/50 pb-4">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <div>
                            <h2 className="text-sm font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider">
                              Account Controls & Danger Zone
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Irreversible account management actions. Proceed with extreme caution.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-zinc-900">
                          <div className="space-y-1">
                            <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block">
                              Permanently Delete Account
                            </span>
                            <p className="text-[11px] text-zinc-500 max-w-md leading-relaxed">
                              Permanently remove your profile, published jobs, candidate applications, and message history. This cannot be undone.
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="text-xs font-bold text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-600 hover:text-white shrink-0 gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Account</span>
                          </Button>
                        </div>
                      </Card>
                    </GSAPReveal>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ================= MODALS ================= */}

          {/* CHANGE EMAIL MODAL */}
          {isEmailModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-modal">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-500" /> Change Email Address
                  </h3>
                  <button onClick={() => setIsEmailModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateEmail} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">New Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="newname@company.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Current Password (Required)</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEmailModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={isEmailSubmitting}>
                      Confirm Email Update
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* UPDATE PHONE MODAL */}
          {isPhoneModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-modal">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-500" /> Update Phone Number
                  </h3>
                  <button onClick={() => setIsPhoneModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdatePhone} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsPhoneModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={isPhoneSubmitting}>
                      Save Phone Number
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2FA SETUP MODAL */}
          {is2FASetupModalOpen && qrCodeUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-modal">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Scan QR Code to Enable 2FA
                  </h3>
                  <button onClick={() => setIs2FASetupModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-4 border border-zinc-200 dark:border-zinc-800">
                    {/* QR Code Image */}
                    <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0 shadow-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="TOTP 2FA QR Code" className="w-36 h-36 object-contain" />
                    </div>

                    <div className="space-y-2 text-center sm:text-left flex-1 min-w-0 w-full">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-xs">
                        Step 1: Scan with Authenticator App
                      </span>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Open Google Authenticator, Authy, or 1Password on your mobile phone and scan this QR code.
                      </p>

                      {tempSecret && (
                        <div className="pt-2 space-y-1">
                          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Or enter secret key manually:
                          </span>
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 max-w-full">
                            <code className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 break-all flex-1 min-w-0 tracking-wider">
                              {tempSecret}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tempSecret)}
                              className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-colors"
                              title="Copy Secret Key"
                            >
                              {copiedSecret ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Form */}
                  <form onSubmit={handleVerify2FA} className="space-y-3 pt-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-center sm:text-left">
                      Step 2: Enter 6-Digit Code from App
                    </span>

                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-lg font-mono tracking-[0.3em] py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIs2FASetupModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={verifyToken.length !== 6 || is2FASubmitting}
                        isLoading={is2FASubmitting}
                      >
                        Verify & Enable 2FA
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* DISABLE 2FA MODAL */}
          {is2FADisableModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-modal">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-red-500" /> Disable Two-Factor Authentication
                  </h3>
                  <button onClick={() => setIs2FADisableModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleDisable2FA} className="space-y-4 text-xs">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Disabling 2FA will remove the extra security layer from your Hirely account. Please confirm your password to proceed.
                  </p>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIs2FADisableModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={is2FADisableSubmitting}>
                      Confirm Disable
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE ACCOUNT CONFIRMATION MODAL */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-6 space-y-5 shadow-modal">
                <div className="flex items-center justify-between border-b border-red-200 dark:border-red-900/60 pb-3">
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Confirm Account Deletion
                  </h3>
                  <button onClick={() => setIsDeleteModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs">
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                    This action is permanent and cannot be undone. All your applications, candidate profile data, messages, and saved jobs will be permanently deleted from Hirely.
                  </p>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-900 dark:text-zinc-100">
                      Enter Password to Confirm
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      isLoading={isDeleteSubmitting}
                    >
                      Permanently Delete Account
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
  );
}
