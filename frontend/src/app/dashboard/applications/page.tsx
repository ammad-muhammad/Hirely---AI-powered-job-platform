'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
  Trash2,
  ExternalLink,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Search,
  DollarSign,
  X,
  MessageSquareText,
  Filter,
} from 'lucide-react';

import { Pagination } from '@/components/ui/Pagination';

interface ApplicationItem {
  _id: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  resumeUrl: string;
  coverLetter?: string;
  appliedAt: string;
  jobId: {
    _id: string;
    title: string;
    category?: string;
    jobType?: string;
    location?: string;
    status?: string;
    salaryRange?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    companyId?: {
      _id?: string;
      companyName?: string;
      logoUrl?: string;
    };
  };
}

const STATUS_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Reviewing' },
  { key: 'interview', label: 'Interview' },
  { key: 'hired', label: 'Decision' },
];

export default function JobSeekerApplicationsPage() {
  const { user } = useAuth();
  const { socket } = useChat();
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [coverLetterModal, setCoverLetterModal] = useState<{ title: string; text: string } | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchApplications = useCallback(async (targetPage = 1) => {
    try {
      setIsLoading(true);
      setHasError(false);
      const response = await api.get(`/applications/my-applications?page=${targetPage}&limit=10`);
      if (response.data?.success && response.data?.data) {
        setApplications(response.data.data);
        if (response.data.pagination) {
          setPage(response.data.pagination.currentPage || targetPage);
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.totalCount || 0);
        }
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setHasError(true);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
      return;
    }
    if (user) {
      fetchApplications(page);
    }
  }, [user, router, fetchApplications, page]);

  // Real-Time Socket Listener for Live Application Status Updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: {
      applicationId: string;
      jobId: string;
      jobTitle: string;
      newStatus: string;
    }) => {
      setApplications((prev) =>
        prev.map((app) =>
          app._id === data.applicationId
            ? { ...app, status: data.newStatus as ApplicationItem['status'] }
            : app
        )
      );
    };

    socket.on('application_status_updated', handleStatusUpdate);

    return () => {
      socket.off('application_status_updated', handleStatusUpdate);
    };
  }, [socket]);

  const handleWithdraw = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }
    setWithdrawingId(applicationId);
    try {
      const response = await api.delete(`/applications/${applicationId}`);
      if (response.data?.success) {
        setApplications((prev) => prev.filter((a) => a._id !== applicationId));
      }
    } catch (err) {
      console.error('Withdrawal failed:', err);
    } finally {
      setWithdrawingId(null);
    }
  };

  // Metrics summary calculated from loaded data
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => ['applied', 'under_review', 'shortlisted', 'interview'].includes(a.status)).length;
    const interviews = applications.filter((a) => ['interview', 'shortlisted'].includes(a.status)).length;
    const hired = applications.filter((a) => a.status === 'hired').length;
    const rejected = applications.filter((a) => a.status === 'rejected').length;
    return { total, active, interviews, hired, rejected };
  }, [applications]);

  // Real filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const title = app.jobId?.title?.toLowerCase() || '';
      const company = app.jobId?.companyId?.companyName?.toLowerCase() || '';
      const location = app.jobId?.location?.toLowerCase() || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || company.includes(query) || location.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, searchQuery]);

  const getStatusBadgeVariant = (status: string): 'default' | 'outline' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'applied':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'shortlisted':
      case 'interview':
        return 'default';
      case 'hired':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'outline';
    }
  };

  const getStageStep = (status: string) => {
    switch (status) {
      case 'applied':
        return 0;
      case 'under_review':
        return 1;
      case 'shortlisted':
      case 'interview':
        return 2;
      case 'hired':
        return 3;
      case 'rejected':
        return 3;
      default:
        return 0;
    }
  };

  const formatSalary = (salaryRange?: { min?: number; max?: number; currency?: string }) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) return null;
    const curr = salaryRange.currency || '$';
    if (salaryRange.min && salaryRange.max) {
      return `${curr}${salaryRange.min.toLocaleString()} - ${curr}${salaryRange.max.toLocaleString()}`;
    }
    if (salaryRange.min) return `From ${curr}${salaryRange.min.toLocaleString()}`;
    if (salaryRange.max) return `Up to ${curr}${salaryRange.max.toLocaleString()}`;
    return null;
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans">
        {/* PAGE HEADER */}
        <GSAPReveal direction="up" distance={20}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                My Applications
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track your submitted job applications and follow their real-time recruitment progress.
              </p>
            </div>

            <Link href="/jobs">
              <Button variant="primary" size="sm" className="font-bold text-xs shrink-0">
                <span>Browse Jobs</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </GSAPReveal>

        {/* APPLICATION METRICS SUMMARY BAR */}
        {!isLoading && !hasError && applications.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.05}>
            <div className="flex flex-wrap items-center gap-4 md:gap-8 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-subtle">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Total Submitted</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{stats.total}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">In Review</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{stats.active}</span>
              </div>

              {stats.interviews > 0 && (
                <>
                  <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Interviews</span>
                    <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{stats.interviews}</span>
                  </div>
                </>
              )}

              {stats.hired > 0 && (
                <>
                  <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Hired</span>
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{stats.hired}</span>
                  </div>
                </>
              )}

              {stats.rejected > 0 && (
                <>
                  <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Closed</span>
                    <span className="font-extrabold text-sm text-zinc-500 dark:text-zinc-400">{stats.rejected}</span>
                  </div>
                </>
              )}
            </div>
          </GSAPReveal>
        )}

        {/* SEARCH & FILTER CONTROLS */}
        {!isLoading && !hasError && applications.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.08}>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search applications by position title, company, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter Badges/Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold border-b border-zinc-100 dark:border-zinc-800/80">
                {['all', 'applied', 'under_review', 'shortlisted', 'interview', 'hired', 'rejected'].map((st) => {
                  const isActive = statusFilter === st;
                  const label = st === 'all' ? 'All Applications' : st.replace('_', ' ');
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-all whitespace-nowrap select-none ${
                        isActive
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-subtle'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* ERROR STATE */}
        {hasError && (
          <Card className="p-8 text-center space-y-4 border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load your applications</h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                There was a problem connecting to the server. Please check your network and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchApplications(page)} className="font-semibold text-xs">
              Try Again
            </Button>
          </Card>
        )}

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton variant="rectangular" className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton variant="text" className="w-56 h-5" />
                    <Skeleton variant="text" className="w-40 h-4" />
                  </div>
                  <Skeleton variant="rectangular" className="w-24 h-6 rounded-md shrink-0" />
                </div>
                <Skeleton variant="rectangular" className="w-full h-2 rounded-full" />
              </Card>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !hasError && applications.length === 0 && (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No job applications submitted yet
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Explore thousands of verified job listings on Hirely and submit your resume to start tracking your recruitment status.
              </p>
            </div>
            <Link href="/jobs" className="inline-block pt-1">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                Browse Available Jobs
              </Button>
            </Link>
          </Card>
        )}

        {/* NO FILTER MATCHES STATE */}
        {!isLoading && !hasError && applications.length > 0 && filteredApplications.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No matching applications found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Try adjusting your search criteria or selecting a different status filter.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold"
            >
              Clear Search Filters
            </Button>
          </Card>
        )}

        {/* APPLICATIONS RECORD CARDS */}
        {!isLoading && !hasError && filteredApplications.length > 0 && (
          <GSAPReveal direction="up" distance={20} stagger={0.05}>
            <div className="space-y-4">
              {filteredApplications.map((app) => {
                const currentStep = getStageStep(app.status);
                const isRejected = app.status === 'rejected';
                const isHired = app.status === 'hired';
                const salaryStr = formatSalary(app.jobId?.salaryRange);

                return (
                  <Card key={app._id} className="p-5 md:p-6 space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    {/* Top Info Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        {/* Company Logo Avatar */}
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                          {app.jobId?.companyId?.logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={app.jobId.companyId.logoUrl}
                              alt={app.jobId.companyId.companyName || 'Company'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-zinc-400" />
                          )}
                        </div>

                        {/* Position & Company Information */}
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                            {app.jobId?._id ? (
                              <Link href={`/jobs/${app.jobId._id}`} className="hover:underline flex items-center gap-1.5">
                                <span>{app.jobId.title || 'Untitled Position'}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                              </Link>
                            ) : (
                              <span>{app.jobId?.title || 'Untitled Position'}</span>
                            )}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {app.jobId?.companyId?._id ? (
                                <Link href={`/companies/${app.jobId.companyId._id}`} className="hover:underline">
                                  {app.jobId.companyId.companyName}
                                </Link>
                              ) : (
                                <span>{app.jobId?.companyId?.companyName || 'Company'}</span>
                              )}
                            </span>
                            {app.jobId?.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {app.jobId.location}
                                </span>
                              </>
                            )}
                            {app.jobId?.jobType && (
                              <>
                                <span>•</span>
                                <span className="capitalize">
                                  {Array.isArray(app.jobId.jobType)
                                    ? app.jobId.jobType.map((t: string) => String(t).replace(/_/g, ' ')).join(', ')
                                    : String(app.jobId.jobType).replace(/_/g, ' ')}
                                </span>
                              </>
                            )}
                            {salaryStr && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  {salaryStr}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Applied {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Semantic Status Badges */}
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(app.status)} size="md" className="uppercase font-extrabold tracking-wider text-[10px]">
                          {app.status.replace('_', ' ')}
                        </Badge>
                        {app.jobId?.status && app.jobId.status !== 'active' && (
                          <Badge variant="outline" size="sm" className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 font-bold">
                            Job Closed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stage Stepper Progress */}
                    <div className="pt-2 pb-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold">
                        {STATUS_STAGES.map((stage, idx) => {
                          const isPassed = currentStep > idx;
                          const isCurrent = currentStep === idx;

                          let stepColor = 'text-zinc-400 dark:text-zinc-600';
                          let barColor = 'bg-zinc-200 dark:bg-zinc-800';

                          if (isCurrent) {
                            if (isRejected) {
                              stepColor = 'text-red-600 dark:text-red-400 font-bold';
                              barColor = 'bg-red-500';
                            } else if (isHired) {
                              stepColor = 'text-emerald-600 dark:text-emerald-400 font-bold';
                              barColor = 'bg-emerald-500';
                            } else {
                              stepColor = 'text-zinc-900 dark:text-zinc-100 font-extrabold';
                              barColor = 'bg-zinc-900 dark:bg-zinc-100';
                            }
                          } else if (isPassed) {
                            stepColor = 'text-zinc-700 dark:text-zinc-300';
                            barColor = 'bg-zinc-400 dark:bg-zinc-600';
                          }

                          const labelText = idx === 3 && isRejected ? 'Not Selected' : idx === 3 && isHired ? 'Hired' : stage.label;

                          return (
                            <div key={stage.key} className="space-y-1.5">
                              <div className={`h-1.5 rounded-full ${barColor} transition-all duration-300`} />
                              <span className={`block truncate ${stepColor}`}>{labelText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex flex-wrap items-center gap-3">
                        {app.resumeUrl && (
                          <a
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Submitted Resume</span>
                          </a>
                        )}

                        {app.coverLetter && (
                          <button
                            type="button"
                            onClick={() =>
                              setCoverLetterModal({
                                title: app.jobId?.title || 'Application Cover Letter',
                                text: app.coverLetter || '',
                              })
                            }
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquareText className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Cover Letter</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {['applied', 'under_review'].includes(app.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWithdraw(app._id)}
                            isLoading={withdrawingId === app._id}
                            className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Withdraw
                          </Button>
                        )}

                        {app.jobId?._id && (
                          <Link href={`/jobs/${app.jobId._id}`}>
                            <Button variant="outline" size="sm" className="text-xs font-bold">
                              View Job Posting
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
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

        {/* COVER LETTER DISPLAY MODAL */}
        {coverLetterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-modal">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-zinc-500" />
                  Cover Letter — {coverLetterModal.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setCoverLetterModal(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {coverLetterModal.text}
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setCoverLetterModal(null)} className="text-xs font-semibold">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
