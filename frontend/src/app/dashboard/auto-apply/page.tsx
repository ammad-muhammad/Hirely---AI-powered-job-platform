'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { api } from '@/lib/api';
import {
  Wand2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Briefcase,
  MapPin,
  DollarSign,
  Building2,
  ExternalLink,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  ShieldCheck,
  FileText,
  Send,
  HelpCircle,
  Info,
  Calendar,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AutoApplySettings {
  autoApplyEnabled: boolean;
  autoApplyPreferences: {
    jobTypes: string[];
    minSalary: number | null;
    maxSalary?: number | null;
    locations: string[];
    maxDailyDrafts: number;
    targetJobTitles?: string[];
    targetSkills?: string[];
    jobRecencyWindow?: string;
  };
  lastAutoApplyRunAt: string | null;
  todayDraftCount: number;
  pendingCount: number;
  approvedCount: number;
  hasResume: boolean;
}

interface DraftJob {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  experienceLevel: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  applicationDeadline?: string;
  status: string;
  description?: string;
  companyId?: {
    _id: string;
    companyName: string;
    logoUrl?: string;
    industry?: string;
    location?: string;
  };
}

interface DraftScreeningAnswer {
  questionId?: string;
  questionText: string;
  answerText: string;
  source?: 'ai_generated' | 'user_edited' | 'manual';
  isMissing?: boolean;
}

interface AutoApplyDraft {
  _id: string;
  userId: string;
  jobId: DraftJob;
  generatedCoverLetter: string;
  screeningAnswers?: DraftScreeningAnswer[];
  matchScore: number;
  matchReason: string;
  status: 'pending_review' | 'approved_and_applied' | 'rejected' | 'expired';
  rejectionReason?: string;
  applicationId?: string;
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
}

const AVAILABLE_JOB_TYPES = [
  { id: 'full-time', label: 'Full Time' },
  { id: 'part-time', label: 'Part Time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
];

const PRESET_LOCATIONS = ['Remote', 'Karachi', 'Lahore', 'Islamabad', 'Hybrid'];

export default function AutoApplyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<AutoApplySettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [minSalaryInput, setMinSalaryInput] = useState<string>('');
  const [maxSalaryInput, setMaxSalaryInput] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState<string>('');
  const [maxDrafts, setMaxDrafts] = useState<number>(3);
  const [targetJobTitles, setTargetJobTitles] = useState<string[]>([]);
  const [customJobTitle, setCustomJobTitle] = useState<string>('');
  const [targetSkills, setTargetSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState<string>('');
  const [jobRecencyWindow, setJobRecencyWindow] = useState<string>('any_time');
  const [isRecencyDropdownOpen, setIsRecencyDropdownOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Drafts State
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'approved_and_applied' | 'rejected' | 'expired'>('all');
  const [pendingDrafts, setPendingDrafts] = useState<AutoApplyDraft[]>([]);
  const [historyDrafts, setHistoryDrafts] = useState<AutoApplyDraft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);

  // Pagination for history
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Expanded & Edited Cover Letters & Screening Answers
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({});
  const [editedLetters, setEditedLetters] = useState<Record<string, string>>({});
  const [editedScreeningAnswers, setEditedScreeningAnswers] = useState<Record<string, DraftScreeningAnswer[]>>({});
  const [isSubmittingDraft, setIsSubmittingDraft] = useState<Record<string, boolean>>({});

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    draftId: string | null;
    jobTitle: string;
    reason: string;
  }>({
    isOpen: false,
    draftId: null,
    jobTitle: '',
    reason: '',
  });

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/auto-apply/settings');
      if (res.data?.success) {
        const data: AutoApplySettings = res.data.data;
        setSettings(data);
        setEnabled(data.autoApplyEnabled);
        setSelectedJobTypes(data.autoApplyPreferences.jobTypes || []);
        setMinSalaryInput(data.autoApplyPreferences.minSalary ? String(data.autoApplyPreferences.minSalary) : '');
        setMaxSalaryInput(data.autoApplyPreferences.maxSalary ? String(data.autoApplyPreferences.maxSalary) : '');
        setSelectedLocations(data.autoApplyPreferences.locations || []);
        setMaxDrafts(data.autoApplyPreferences.maxDailyDrafts || 3);
        setTargetJobTitles(data.autoApplyPreferences.targetJobTitles || []);
        setTargetSkills(data.autoApplyPreferences.targetSkills || []);
        setJobRecencyWindow(data.autoApplyPreferences.jobRecencyWindow || 'any_time');
      }
    } catch (err) {
      console.error('Failed to load auto-apply settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Fetch Pending Drafts
  const fetchPendingDrafts = useCallback(async () => {
    try {
      const res = await api.get('/auto-apply/drafts?status=pending_review&limit=20');
      if (res.data?.success) {
        setPendingDrafts(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load pending drafts:', err);
    }
  }, []);

  // Fetch History Drafts
  const fetchHistoryDrafts = useCallback(async (targetPage = 1, filter = 'all') => {
    try {
      const statusParam = filter === 'all' ? 'resolved' : filter;
      const res = await api.get(`/auto-apply/drafts?status=${statusParam}&page=${targetPage}&limit=10`);
      if (res.data?.success) {
        setHistoryDrafts(res.data.data || []);
        if (res.data.pagination) {
          setHistoryPage(res.data.pagination.currentPage || targetPage);
          setHistoryTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load history drafts:', err);
    }
  }, []);

  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const handleRunScanNow = useCallback(async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await api.post('/auto-apply/scan');
      if (res.data?.success) {
        setScanMessage(res.data.message || 'AI Scan completed.');
        await Promise.all([fetchSettings(), fetchPendingDrafts()]);
      } else {
        setScanMessage(res.data?.message || 'Scan finished. No new matching jobs found right now.');
      }
    } catch (err: any) {
      setScanMessage(err?.response?.data?.message || 'Failed to run AI scan.');
    } finally {
      setIsScanning(false);
    }
  }, [fetchSettings, fetchPendingDrafts]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchPendingDrafts();
      // Auto-sync scan on page load
      api.post('/auto-apply/scan')
        .then((res) => {
          if (res.data?.success && res.data?.data?.createdCount > 0) {
            fetchPendingDrafts();
            fetchSettings();
          }
        })
        .catch(() => {});
    }
  }, [user, fetchSettings, fetchPendingDrafts]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryDrafts(historyPage, historyFilter);
    }
  }, [activeTab, historyPage, historyFilter, fetchHistoryDrafts]);

  // Quick Master Toggle
  const handleToggleMasterSwitch = async (newVal: boolean) => {
    setEnabled(newVal);
    try {
      await api.put('/auto-apply/settings', { autoApplyEnabled: newVal });
      if (settings) {
        setSettings({ ...settings, autoApplyEnabled: newVal });
      }
    } catch (err) {
      console.error('Failed to toggle auto-apply master switch:', err);
      setEnabled(!newVal);
    }
  };

  // Tag/Chip Handlers for Job Titles
  const handleAddJobTitle = () => {
    const val = customJobTitle.trim();
    if (val && !targetJobTitles.includes(val)) {
      setTargetJobTitles((prev) => [...prev, val]);
      setCustomJobTitle('');
    }
  };

  const handleRemoveJobTitle = (title: string) => {
    setTargetJobTitles((prev) => prev.filter((t) => t !== title));
  };

  // Tag/Chip Handlers for Target Skills
  const handleAddSkill = () => {
    const val = customSkill.trim();
    if (val && !targetSkills.includes(val)) {
      setTargetSkills((prev) => [...prev, val]);
      setCustomSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setTargetSkills((prev) => prev.filter((s) => s !== skill));
  };

  // Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const payload = {
        autoApplyEnabled: enabled,
        autoApplyPreferences: {
          jobTypes: selectedJobTypes,
          minSalary: minSalaryInput ? Number(minSalaryInput) : null,
          maxSalary: maxSalaryInput ? Number(maxSalaryInput) : null,
          locations: selectedLocations,
          maxDailyDrafts: maxDrafts,
          targetJobTitles,
          targetSkills,
          jobRecencyWindow,
        },
      };
      const res = await api.put('/auto-apply/settings', payload);
      if (res.data?.success) {
        await fetchSettings();
        setIsPreferencesOpen(false);
      }
    } catch (err) {
      console.error('Failed to save auto-apply preferences:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Approve & Apply
  const handleApproveDraft = async (draft: AutoApplyDraft) => {
    setIsSubmittingDraft((prev) => ({ ...prev, [draft._id]: true }));
    try {
      const finalLetter = editedLetters[draft._id] ?? draft.generatedCoverLetter;
      const finalAnswers = editedScreeningAnswers[draft._id] ?? draft.screeningAnswers ?? [];
      const res = await api.post(`/auto-apply/drafts/${draft._id}/approve`, {
        coverLetter: finalLetter,
        screeningAnswers: finalAnswers,
      });
      if (res.data?.success) {
        // Remove from pending list and refresh
        setPendingDrafts((prev) => prev.filter((d) => d._id !== draft._id));
        await fetchSettings();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit application.');
    } finally {
      setIsSubmittingDraft((prev) => ({ ...prev, [draft._id]: false }));
    }
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectModal.draftId) return;
    try {
      const res = await api.post(`/auto-apply/drafts/${rejectModal.draftId}/reject`, {
        rejectionReason: rejectModal.reason || 'Not interested',
      });
      if (res.data?.success) {
        setPendingDrafts((prev) => prev.filter((d) => d._id !== rejectModal.draftId));
        setRejectModal({ isOpen: false, draftId: null, jobTitle: '', reason: '' });
        await fetchSettings();
      }
    } catch (err) {
      console.error('Failed to dismiss draft:', err);
    }
  };

  // Toggle Location Pill
  const handleToggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleAddCustomLocation = () => {
    if (customLocation.trim() && !selectedLocations.includes(customLocation.trim())) {
      setSelectedLocations((prev) => [...prev, customLocation.trim()]);
      setCustomLocation('');
    }
  };

  // Expiry Countdown Helper
  const getExpiryLabel = (expiresAtStr: string) => {
    try {
      const diffMs = new Date(expiresAtStr).getTime() - Date.now();
      if (diffMs <= 0) return 'Expired';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m left to review`;
    } catch {
      return '48h window';
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Feature Banner & Master Switch */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 border border-indigo-900/40 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI Auto-Apply Assistant</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                AI Auto-Apply Assistant
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                AI continuously monitors new job openings matching your profile, drafts complete customized applications with tailored cover letters, and queues them for your review. <strong className="text-white">Nothing is ever submitted without your explicit approval.</strong>
              </p>
            </div>

            {/* Master Switch Box */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-300">
                  {enabled ? 'Auto-Drafting Active' : 'Auto-Drafting Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleMasterSwitch(!enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                  aria-pressed={enabled}
                  aria-label="Toggle Auto-Apply Assistant"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                  className="bg-white text-zinc-900 hover:bg-zinc-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Preferences</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRunScanNow}
                  disabled={isScanning || !enabled}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 border-none disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning AI...' : 'Scan New Jobs'}</span>
                </Button>
              </div>
            </div>
          </div>

          {scanMessage && (
            <div className="mt-3 p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{scanMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setScanMessage(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quota & Stats Bar */}
        {settings && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">Today&apos;s Quota</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {settings.todayDraftCount} / {settings.autoApplyPreferences.maxDailyDrafts || 3}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">drafts today</span>
              </div>
            </Card>

            <Card className="p-3.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">Pending Review</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {pendingDrafts.length}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">ready to apply</span>
              </div>
            </Card>

            <Card className="p-3.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">Approved & Applied</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {settings.approvedCount}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">applications submitted</span>
              </div>
            </Card>

            <Card className="p-3.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">Safety Guard</span>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>100% User Verified</span>
              </div>
            </Card>
          </div>
        )}

        {/* Preferences Expandable Card */}
        {isPreferencesOpen && (
          <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                  Auto-Apply Matching Preferences
                </h3>
              </div>
              <button
                onClick={() => setIsPreferencesOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-5">
              {/* Target Job Titles */}
              <div>
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                  Target Job Titles
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {targetJobTitles.map((title) => (
                    <span
                      key={title}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs"
                    >
                      <span>{title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveJobTitle(title)}
                        className="text-white hover:text-indigo-200"
                        aria-label={`Remove ${title}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="e.g., Frontend Developer, React Developer"
                    value={customJobTitle}
                    onChange={(e) => setCustomJobTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddJobTitle();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddJobTitle}
                    className="text-xs font-bold"
                  >
                    Add Title
                  </Button>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Leave blank to match based on your general profile skills and experience.
                </span>
              </div>

              {/* Target Skills */}
              <div>
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                  Target Skills
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {targetSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-xs"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-white hover:text-purple-200"
                        aria-label={`Remove ${skill}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="e.g., React, Node.js, TypeScript"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSkill}
                    className="text-xs font-bold"
                  >
                    Add Skill
                  </Button>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Leave blank to match based on your general profile skills and experience.
                </span>
              </div>

              {/* Job Types */}
              <div>
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-2">
                  Target Job Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_JOB_TYPES.map((type) => {
                    const isSelected = selectedJobTypes.includes(type.id);
                    return (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() =>
                          setSelectedJobTypes((prev) =>
                            prev.includes(type.id)
                              ? prev.filter((t) => t !== type.id)
                              : [...prev, type.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected Salary Range (Min - Max), Job Recency & Max Daily Drafts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Minimum Monthly Salary */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Minimum Salary (PKR)
                  </label>
                  <div className="relative">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 select-none">
                      Rs.
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={minSalaryInput}
                      onChange={(e) => setMinSalaryInput(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Min expected salary
                  </span>
                </div>

                {/* Maximum Monthly Salary */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Maximum Salary (PKR)
                  </label>
                  <div className="relative">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 select-none">
                      Rs.
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 250000"
                      value={maxSalaryInput}
                      onChange={(e) => setMaxSalaryInput(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Max expected salary (optional)
                  </span>
                </div>

                {/* Job Posting Recency Custom Dropdown */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Job Posting Recency
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRecencyDropdownOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
                    >
                      <span>
                        {jobRecencyWindow === '24h'
                          ? 'Last 24 hours'
                          : jobRecencyWindow === '3d'
                          ? 'Last 3 days'
                          : jobRecencyWindow === '7d'
                          ? 'Last 7 days'
                          : jobRecencyWindow === '14d'
                          ? 'Last 14 days'
                          : jobRecencyWindow === '30d'
                          ? 'Last 30 days'
                          : 'Any time'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-150 ${
                          isRecencyDropdownOpen ? 'rotate-180 text-indigo-500' : ''
                        }`}
                      />
                    </button>

                    {isRecencyDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsRecencyDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100 font-sans">
                          {[
                            { value: 'any_time', label: 'Any time (All active jobs)' },
                            { value: '24h', label: 'Last 24 hours' },
                            { value: '3d', label: 'Last 3 days' },
                            { value: '7d', label: 'Last 7 days' },
                            { value: '14d', label: 'Last 14 days' },
                            { value: '30d', label: 'Last 30 days' },
                          ].map((option) => {
                            const isSelected = jobRecencyWindow === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setJobRecencyWindow(option.value);
                                  setIsRecencyDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold'
                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                                }`}
                              >
                                <span>{option.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Only consider jobs posted within this timeframe. Leave as &quot;Any time&quot; to consider all active jobs.
                  </span>
                </div>

                {/* Max Daily Drafts */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Max Drafts Per Day
                    </label>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      {maxDrafts} drafts/day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={maxDrafts}
                    onChange={(e) => setMaxDrafts(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5 font-mono">
                    <span>1 draft</span>
                    <span>5 drafts</span>
                    <span>10 drafts</span>
                  </div>
                </div>
              </div>

              {/* Preferred Locations */}
              <div>
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-2">
                  Preferred Locations / Work Mode
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {PRESET_LOCATIONS.map((loc) => {
                    const isSelected = selectedLocations.includes(loc);
                    return (
                      <button
                        type="button"
                        key={loc}
                        onClick={() => handleToggleLocation(loc)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100'
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                  {selectedLocations
                    .filter((loc) => !PRESET_LOCATIONS.includes(loc))
                    .map((loc) => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                      >
                        <span>{loc}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleLocation(loc)}
                          className="text-white hover:text-indigo-200"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                </div>

                {/* Add Custom Location Input */}
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    placeholder="Add custom city/location..."
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomLocation();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomLocation}
                    className="text-xs font-bold"
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingSettings}
                  className="text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tabs: Pending Review vs History */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 text-sm font-extrabold transition-all relative ${
                activeTab === 'pending'
                  ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span>Pending Review</span>
              {pendingDrafts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  {pendingDrafts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 text-sm font-extrabold transition-all relative ${
                activeTab === 'history'
                  ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span>Resolved History</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: PENDING REVIEW DRAFTS */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingDrafts.length === 0 ? (
              <Card className="p-12 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  No applications currently pending review
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  {!enabled
                    ? 'Auto-Apply is currently paused. Enable it above to allow background AI to draft applications for matching jobs.'
                    : 'The server background process automatically monitors new job postings matching your profile. When a qualifying match is found, your drafted application will appear here for review.'}
                </p>
              </Card>
            ) : (
              pendingDrafts.map((draft) => {
                const job = draft.jobId;
                if (!job) return null;

                const isExpanded = expandedDrafts[draft._id] || false;
                const coverLetterText = editedLetters[draft._id] ?? draft.generatedCoverLetter;
                const isSubmitting = isSubmittingDraft[draft._id] || false;

                return (
                  <Card
                    key={draft._id}
                    className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-4"
                  >
                    {/* Header: Company & Job & Match Score */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-zinc-700 dark:text-zinc-300">
                          {job.companyId?.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={job.companyId.logoUrl}
                              alt={job.companyId.companyName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/jobs/${job._id}`}
                              target="_blank"
                              className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1.5"
                            >
                              <span>{job.title}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            </Link>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">
                              {job.companyId?.companyName || 'Verified Employer'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.isRemote ? 'Remote' : job.location || 'Location Not Specified'}
                            </span>
                            {(job.salaryMin || job.salaryMax) && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  Rs. {job.salaryMin?.toLocaleString()} - {job.salaryMax?.toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Badge & Countdown */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{draft.matchScore}% AI Match</span>
                        </div>

                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {getExpiryLabel(draft.expiresAt)}
                        </span>
                      </div>
                    </div>

                    {/* AI Match Reason Banner */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                          Why this matches your profile:
                        </span>
                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {draft.matchReason}
                        </p>
                      </div>
                    </div>

                    {/* AI-Generated Cover Letter Preview & Editor */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDrafts((prev) => ({
                            ...prev,
                            [draft._id]: !prev[draft._id],
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <span>AI-Prepared Cover Letter</span>
                          <span className="text-[10px] text-zinc-400 font-normal">
                            (Click to {isExpanded ? 'collapse' : 'view & edit'})
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 space-y-2 animate-in fade-in-50 duration-150">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>You can refine or customize this letter before submission:</span>
                            <span className="font-mono">{coverLetterText.length} characters</span>
                          </div>
                          <textarea
                            rows={8}
                            value={coverLetterText}
                            onChange={(e) =>
                              setEditedLetters((prev) => ({
                                ...prev,
                                [draft._id]: e.target.value,
                              }))
                            }
                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-sans text-zinc-900 dark:text-zinc-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* AI-Generated & Editable Screening Questions Section */}
                    {(() => {
                      const currentScreeningAnswers =
                        editedScreeningAnswers[draft._id] ?? draft.screeningAnswers ?? [];
                      if (currentScreeningAnswers.length === 0) return null;

                      return (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-black text-zinc-900 dark:text-zinc-100">
                              <HelpCircle className="w-4 h-4 text-indigo-500" />
                              <span>Screening Questions & Pre-filled Answers</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium font-mono">
                              {currentScreeningAnswers.length} question{currentScreeningAnswers.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {currentScreeningAnswers.map((ans, idx) => {
                              const isMissing = ans.isMissing || !ans.answerText || !ans.answerText.trim();
                              return (
                                <div
                                  key={idx}
                                  className={`p-3.5 bg-white dark:bg-zinc-900 border rounded-xl space-y-2 transition-all ${
                                    isMissing
                                      ? 'border-amber-400 dark:border-amber-600/80 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs'
                                      : 'border-zinc-200 dark:border-zinc-800'
                                  }`}
                                >
                                  <label className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 block">
                                    Q{idx + 1}: {ans.questionText}
                                  </label>

                                  <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">
                                      AI-suggested answer — review and edit if needed:
                                    </span>
                                    <textarea
                                      rows={2}
                                      value={ans.answerText}
                                      placeholder="Provide an answer for this question..."
                                      onChange={(e) => {
                                        const newAnswers = [...currentScreeningAnswers];
                                        newAnswers[idx] = {
                                          ...newAnswers[idx],
                                          answerText: e.target.value,
                                          isMissing: !e.target.value.trim(),
                                          source: 'user_edited',
                                        };
                                        setEditedScreeningAnswers((prev) => ({
                                          ...prev,
                                          [draft._id]: newAnswers,
                                        }));
                                      }}
                                      className={`w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border rounded-lg text-xs font-sans text-zinc-900 dark:text-zinc-100 leading-relaxed focus:outline-none focus:ring-1 ${
                                        isMissing
                                          ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-500'
                                          : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
                                      }`}
                                    />
                                  </div>

                                  {isMissing && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400 pt-0.5">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Please provide an answer for this question</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bottom Action Footer */}
                    {(() => {
                      const currentScreeningAnswers =
                        editedScreeningAnswers[draft._id] ?? draft.screeningAnswers ?? [];
                      const hasMissingAnswers = currentScreeningAnswers.some(
                        (ans) => ans.isMissing || !ans.answerText || !ans.answerText.trim()
                      );

                      return (
                        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Drafted {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasMissingAnswers && (
                              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Answer required questions above
                              </span>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRejectModal({
                                  isOpen: true,
                                  draftId: draft._id,
                                  jobTitle: job.title,
                                  reason: '',
                                })
                              }
                              className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              <span>Dismiss</span>
                            </Button>

                            <Button
                              size="sm"
                              disabled={isSubmitting || hasMissingAnswers}
                              onClick={() => handleApproveDraft(draft)}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white shadow-sm flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isSubmitting ? 'Submitting...' : 'Approve & Apply'}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* SECTION 2: RESOLVED HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All History' },
                { id: 'approved_and_applied', label: 'Approved & Applied' },
                { id: 'rejected', label: 'Dismissed' },
                { id: 'expired', label: 'Expired' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setHistoryFilter(pill.id as any);
                    setHistoryPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    historyFilter === pill.id
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {historyDrafts.length === 0 ? (
              <Card className="p-12 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-bold text-zinc-400">
                  No historical application drafts found for this filter.
                </p>
              </Card>
            ) : (
              historyDrafts.map((draft) => {
                const job = draft.jobId;
                if (!job) return null;

                const getStatusBadge = () => {
                  switch (draft.status) {
                    case 'approved_and_applied':
                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Applied
                        </span>
                      );
                    case 'rejected':
                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          Dismissed
                        </span>
                      );
                    case 'expired':
                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                          Expired (48h)
                        </span>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <Card
                    key={draft._id}
                    className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/jobs/${job._id}`}
                          target="_blank"
                          className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                        >
                          {job.title}
                        </Link>
                        {getStatusBadge()}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 flex-wrap">
                        <span>{job.companyId?.companyName || 'Verified Employer'}</span>
                        <span>•</span>
                        <span>{draft.matchScore}% Match</span>
                        {draft.respondedAt && (
                          <>
                            <span>•</span>
                            <span>
                              {draft.status === 'approved_and_applied' ? 'Applied on ' : 'Resolved on '}
                              {format(new Date(draft.respondedAt), 'MMM d, yyyy')}
                            </span>
                          </>
                        )}
                        {draft.rejectionReason && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-500 italic">Reason: {draft.rejectionReason}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {draft.status === 'approved_and_applied' && (
                        <Link href="/dashboard/applications">
                          <Button variant="outline" size="sm" className="text-xs font-bold">
                            View Application
                          </Button>
                        </Link>
                      )}
                      <Link href={`/jobs/${job._id}`} target="_blank">
                        <Button variant="ghost" size="sm" className="text-xs font-bold">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })
            )}

            {historyTotalPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination
                  currentPage={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={(p) => setHistoryPage(p)}
                />
              </div>
            )}
          </div>
        )}

        {/* Reject / Dismiss Reason Modal */}
        {rejectModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  Dismiss Application Draft
                </h3>
                <button
                  onClick={() => setRejectModal({ isOpen: false, draftId: null, jobTitle: '', reason: '' })}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Dismissing <strong className="text-zinc-900 dark:text-zinc-100">&quot;{rejectModal.jobTitle}&quot;</strong>. You can provide an optional reason to help AI fine-tune future recommendations:
              </p>

              {/* Quick Reason Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Not interested in company',
                  'Wrong tech stack / skills',
                  'Salary too low',
                  'Location / Commute mismatch',
                  'Overqualified / Underqualified',
                ].map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => setRejectModal((prev) => ({ ...prev, reason: chip }))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      rejectModal.reason === chip
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Or type custom reason..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectModal({ isOpen: false, draftId: null, jobTitle: '', reason: '' })}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmReject}
                  className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Dismissal
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
