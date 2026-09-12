'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Users,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';
import { getResumeViewUrl, triggerFileDownload } from '@/utils/fileHelpers';

interface ApplicantData {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  bio?: string;
  experienceLevel?: string;
  education?: string;
  skills?: string[];
}

interface ApplicationItem {
  _id: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  resumeUrl?: string;
  resumeOriginalFileName?: string;
  coverLetter?: string;
  appliedAt: string;
  updatedAt: string;
  applicantId?: ApplicantData;
  jobId?: {
    _id: string;
    title: string;
    category?: string;
    location?: string;
    jobType?: string;
    status?: string;
  };
}

interface JobFilterOption {
  id: string;
  title: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  applied: {
    label: 'Applied',
    bg: 'bg-zinc-100 dark:bg-zinc-800/80',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-300 dark:border-zinc-700',
    dot: 'bg-zinc-400',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  shortlisted: {
    label: 'Shortlisted',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  interview: {
    label: 'Interview',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  hired: {
    label: 'Hired',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50 dark:bg-red-950/60',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-800',
    dot: 'bg-red-500',
  },
};

function CandidateStatusDropdown({
  status,
  isUpdating,
  onSelect,
}: {
  status: string;
  isUpdating: boolean;
  onSelect: (newStatus: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 6,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentConfig = STATUS_CONFIG[status] || STATUS_CONFIG.applied;

  const menuElement = isOpen && coords ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        bottom: `${coords.bottom}px`,
        zIndex: 99999,
      }}
      className="w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1.5 font-sans animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
        const isSelected = key === status;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              onSelect(key);
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
              isSelected
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span>{cfg.label}</span>
            </div>
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={isUpdating}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none shadow-subtle ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border} hover:brightness-95 disabled:opacity-50`}
      >
        <span className={`w-2 h-2 rounded-full ${currentConfig.dot} shrink-0`} />
        <span>{currentConfig.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {typeof window !== 'undefined' && menuElement && createPortal(menuElement, document.body)}
    </>
  );
}

import { Pagination } from '@/components/ui/Pagination';

export default function EmployerCandidatesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [jobOptions, setJobOptions] = useState<JobFilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Detail Modal State
  const [activeCandidateApp, setActiveCandidateApp] = useState<ApplicationItem | null>(null);

  const fetchCandidates = useCallback(async (targetPage = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '10');
      if (selectedJobId !== 'all') params.set('jobId', selectedJobId);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const res = await api.get(`/applications/all-candidates?${params.toString()}`);
      if (res.data?.success) {
        setApplications(res.data.data || []);
        if (res.data.jobs) {
          setJobOptions(res.data.jobs);
        }
        if (res.data.pagination) {
          setPage(res.data.pagination.currentPage || targetPage);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load candidate applications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, selectedStatus]);

  useEffect(() => {
    if (user?.role === 'employer') {
      fetchCandidates(page);
    }
  }, [user, fetchCandidates, page]);

  // Real-time Socket.io listener for new applications, withdrawals & status changes
  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('new_application', () => {
        fetchCandidates();
      });

      socketInstance.on('application_withdrawn', ({ applicationId }: { applicationId: string }) => {
        setApplications((prev) => prev.filter((a) => a._id !== applicationId));
      });

      socketInstance.on('application_status_updated', ({ applicationId, newStatus }: { applicationId: string; newStatus: string }) => {
        setApplications((prev) =>
          prev.map((app) => (app._id === applicationId ? { ...app, status: newStatus as any } : app))
        );
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('new_application');
        socketInstance.off('application_withdrawn');
        socketInstance.off('application_status_updated');
      }
    };
  }, [fetchCandidates]);

  // Handle Status Update
  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      setUpdatingId(appId);
      const res = await api.put(`/applications/${appId}/status`, { status: newStatus });
      if (res.data?.success) {
        setApplications((prev) =>
          prev.map((app) => (app._id === appId ? { ...app, status: newStatus as any } : app))
        );
        if (activeCandidateApp && activeCandidateApp._id === appId) {
          setActiveCandidateApp((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter Logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const candidateName = app.applicantId?.fullName || '';
      const candidateEmail = app.applicantId?.email || '';
      const jobTitle = app.jobId?.title || '';

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        candidateName.toLowerCase().includes(q) ||
        candidateEmail.toLowerCase().includes(q) ||
        jobTitle.toLowerCase().includes(q);

      // Job match
      const matchesJob = selectedJobId === 'all' || (app.jobId && app.jobId._id === selectedJobId);

      // Status match
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;

      // Date match
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const appliedDate = new Date(app.appliedAt).getTime();
        const now = Date.now();
        if (dateFilter === '7days') {
          matchesDate = now - appliedDate <= 7 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === '30days') {
          matchesDate = now - appliedDate <= 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesJob && matchesStatus && matchesDate;
    });
  }, [applications, searchQuery, selectedJobId, selectedStatus, dateFilter]);

  if (user?.role !== 'employer') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-xs font-semibold text-zinc-500">
          Employer access required.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="space-y-6">
          {/* HEADER & TOP SUMMARY */}
          <GSAPReveal direction="down" distance={16}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="w-6 h-6 text-zinc-500" />
                  <span>Employer Candidates Pipeline</span>
                  <Badge variant="outline" size="sm" className="font-extrabold text-[11px]">
                    {filteredApplications.length} Applicant(s)
                  </Badge>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Unified view of all candidate applications across all active and published job listings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/jobs/post')}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Post New Job
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/dashboard/messages')}
                  className="text-xs font-bold gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Candidate Messages
                </Button>
              </div>
            </div>
          </GSAPReveal>

          {/* SEARCH & FILTER CONTROLS */}
          <GSAPReveal direction="up" distance={16} delay={0.05} className="relative z-30">
            <Card className="p-4 md:p-6 space-y-4 relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Input
                    placeholder="Search candidate name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>

                {/* Job Filter */}
                <Select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Posted Jobs' },
                    ...jobOptions.map((j) => ({ value: j.id, label: j.title })),
                  ]}
                />

                {/* Status Filter */}
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Application Statuses' },
                    { value: 'applied', label: 'Applied' },
                    { value: 'under_review', label: 'Under Review' },
                    { value: 'shortlisted', label: 'Shortlisted' },
                    { value: 'interview', label: 'Interview Scheduled' },
                    { value: 'hired', label: 'Hired' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                />

                {/* Date Filter */}
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: '7days', label: 'Last 7 Days' },
                    { value: '30days', label: 'Last 30 Days' },
                  ]}
                />
              </div>
            </Card>
          </GSAPReveal>

          {/* CANDIDATES TABLE / LIST */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="rectangular" className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton variant="text" className="w-40 h-4" />
                      <Skeleton variant="text" className="w-28 h-3" />
                    </div>
                  </div>
                  <Skeleton variant="rectangular" className="w-24 h-8 rounded-lg" />
                </Card>
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Candidates Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No job applications match your filter criteria or no candidates have applied yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedJobId('all');
                  setSelectedStatus('all');
                  setDateFilter('all');
                }}
                className="text-xs font-semibold"
              >
                Reset All Filters
              </Button>
            </Card>
          ) : (
            <GSAPReveal direction="up" distance={20} delay={0.1}>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <th className="py-3.5 px-4">Candidate</th>
                        <th className="py-3.5 px-4">Applied Position</th>
                        <th className="py-3.5 px-4">Date Applied</th>
                        <th className="py-3.5 px-4">Current Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs font-normal">
                      {filteredApplications.map((app) => {
                        const candidate = app.applicantId;
                        const job = app.jobId;
                        const isUpdating = updatingId === app._id;
                        const isUnreviewed = app.status === 'applied';

                        return (
                          <tr
                            key={app._id}
                            className={`transition-colors ${
                              isUnreviewed
                                ? 'bg-amber-50/30 dark:bg-amber-950/20 border-l-4 border-l-amber-500 hover:bg-amber-50/60 dark:hover:bg-amber-950/40'
                                : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                            }`}
                          >
                            {/* Candidate Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-subtle">
                                  {candidate?.avatarUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={candidate.avatarUrl} alt={candidate.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {candidate?._id ? (
                                      <Link
                                        href={`/dashboard/candidates/${candidate._id}`}
                                        className="font-extrabold text-zinc-900 dark:text-zinc-100 hover:underline block truncate"
                                      >
                                        {candidate.fullName}
                                      </Link>
                                    ) : (
                                      <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block truncate">
                                        {candidate?.fullName || 'Candidate'}
                                      </span>
                                    )}
                                    {isUnreviewed && (
                                      <Badge variant="warning" size="sm" className="font-extrabold text-[9px] uppercase py-0 px-1.5 shrink-0">
                                        New Applicant
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-zinc-500 block truncate">
                                    {candidate?.email || 'No email provided'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Job Title */}
                            <td className="py-3.5 px-4">
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate max-w-[200px]">
                                  {job?.title || 'Unknown Job'}
                                </span>
                                {job?.category && (
                                  <span className="text-[10px] text-zinc-500 block">{job.category}</span>
                                )}
                              </div>
                            </td>

                            {/* Applied Date */}
                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                              {new Date(app.appliedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>

                            {/* Status Selector Dropdown */}
                            <td className="py-3.5 px-4">
                              <CandidateStatusDropdown
                                status={app.status}
                                isUpdating={isUpdating}
                                onSelect={(newStatus) => handleUpdateStatus(app._id, newStatus)}
                              />
                            </td>

                            {/* Quick Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (app.status === 'applied') {
                                      handleUpdateStatus(app._id, 'under_review');
                                    }
                                    const candidateId = candidate?._id || (candidate as any)?.id;
                                    if (candidateId) {
                                      router.push(`/dashboard/candidates/${candidateId}`);
                                    } else {
                                      setActiveCandidateApp(app);
                                    }
                                  }}
                                  className="text-[11px] font-semibold px-2.5 py-1"
                                >
                                  View Details
                                </Button>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push('/dashboard/messages')}
                                  className="text-[11px] font-semibold px-2 py-1 gap-1"
                                  title="Message Candidate"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </GSAPReveal>
          )}

          {/* PAGINATION */}
          {!isLoading && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}

          {/* CANDIDATE DETAIL MODAL */}
          {activeCandidateApp && (
            <Modal
              isOpen={Boolean(activeCandidateApp)}
              onClose={() => setActiveCandidateApp(null)}
              title={`Candidate Profile — ${activeCandidateApp.applicantId?.fullName || 'Applicant'}`}
              maxWidth="lg"
            >
              <div className="space-y-6 text-xs font-sans">
                {/* Top Profile Card */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-subtle">
                    {activeCandidateApp.applicantId?.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={activeCandidateApp.applicantId.avatarUrl} alt={activeCandidateApp.applicantId.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                      {activeCandidateApp.applicantId?.fullName}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-400" /> {activeCandidateApp.applicantId?.email}
                      </span>
                      {activeCandidateApp.applicantId?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-400" /> {activeCandidateApp.applicantId.phone}
                        </span>
                      )}
                      {activeCandidateApp.applicantId?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" /> {activeCandidateApp.applicantId.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Application Information */}
                <div className="space-y-3">
                  <h5 className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                    Application Requisition Meta
                  </h5>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <div>
                      Applied Position: <span className="font-bold text-zinc-900 dark:text-zinc-100">{activeCandidateApp.jobId?.title}</span>
                    </div>
                    <div>
                      Applied Date: <span className="font-bold text-zinc-900 dark:text-zinc-100">{new Date(activeCandidateApp.appliedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Submitted Resume Document */}
                {activeCandidateApp.resumeUrl && (
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                      Submitted Resume Document
                    </h5>
                    <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {activeCandidateApp.resumeOriginalFileName || `${activeCandidateApp.applicantId?.fullName || 'Candidate'}_Resume.pdf`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={getResumeViewUrl(activeCandidateApp.resumeUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800"
                        >
                          View PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => triggerFileDownload(activeCandidateApp.resumeUrl, activeCandidateApp.resumeOriginalFileName || `${activeCandidateApp.applicantId?.fullName || 'Candidate'}_Resume.pdf`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                {activeCandidateApp.coverLetter && (
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                      Cover Letter / Statement
                    </h5>
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                      "{activeCandidateApp.coverLetter}"
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          )}
        </div>
  );
}
