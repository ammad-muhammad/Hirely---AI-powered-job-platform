'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Briefcase,
  Plus,
  Users,
  Calendar,
  Clock,
  Edit3,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Search,
  MapPin,
  ExternalLink,
  AlertCircle,
  X,
  FileEdit,
  Play,
} from 'lucide-react';
import {
  formatContractDuration,
  formatExpectedHours,
  formatJobPostedDate,
} from '@/utils/formatters';

import { Pagination } from '@/components/ui/Pagination';

interface JobItem {
  _id: string;
  title: string;
  category?: string;
  jobType?: string | string[];
  location?: string;
  status: 'active' | 'closed';
  postStatus?: 'draft' | 'published';
  applicantCount: number;
  applicationDeadline?: string;
  contractDuration?: { length: number; unit: string } | null;
  expectedHours?: { type: string; fixedHours?: number; minHours?: number; maxHours?: number } | null;
  createdAt: string;
}

export default function EmployerJobsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');

  const [summaryMetrics, setSummaryMetrics] = useState<{
    totalRequisitions: number;
    publishedCount: number;
    draftsCount: number;
    closedCount: number;
    totalApplicantsCount: number;
  } | null>(null);

  const fetchJobs = useCallback(async (targetPage = 1) => {
    try {
      setIsLoading(true);
      setHasError(false);
      const response = await api.get(`/jobs/my-jobs?page=${targetPage}&limit=10`);
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setJobs(response.data.data);
        if (response.data.summaryMetrics) {
          setSummaryMetrics(response.data.summaryMetrics);
        }
        if (response.data.pagination) {
          setPage(response.data.pagination.currentPage || targetPage);
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.totalCount || 0);
        }
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Failed to fetch employer jobs:', err);
      setHasError(true);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'employer') {
      router.push('/dashboard');
      return;
    }
    if (user) {
      fetchJobs(page);
    }
  }, [user, router, fetchJobs, page]);

  // Real-time Socket.io updates for employer manage jobs
  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('job_published', () => {
        fetchJobs();
      });

      socketInstance.on('job_updated', () => {
        fetchJobs();
      });

      socketInstance.on('job_closed', () => {
        fetchJobs();
      });

      socketInstance.on('new_application', () => {
        fetchJobs();
      });

      socketInstance.on('application_withdrawn', () => {
        fetchJobs();
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('job_published');
        socketInstance.off('job_updated');
        socketInstance.off('job_closed');
        socketInstance.off('new_application');
        socketInstance.off('application_withdrawn');
      }
    };
  }, [fetchJobs]);

  const toggleStatus = async (jobId: string, currentStatus: string) => {
    setTogglingId(jobId);
    try {
      const newStatus = currentStatus === 'active' ? 'closed' : 'active';
      const response = await api.put(`/jobs/${jobId}/status`, { status: newStatus });
      if (response.data?.success) {
        setJobs((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, status: newStatus } : j))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Metrics summary (Always prefers global company summaryMetrics across all pages)
  const metrics = useMemo(() => {
    if (summaryMetrics) {
      return {
        total: summaryMetrics.totalRequisitions,
        published: summaryMetrics.publishedCount,
        drafts: summaryMetrics.draftsCount,
        closed: summaryMetrics.closedCount,
        totalApplicants: summaryMetrics.totalApplicantsCount,
      };
    }
    const total = totalCount || jobs.length;
    const published = jobs.filter((j) => (j.postStatus || 'published') === 'published' && j.status === 'active').length;
    const drafts = jobs.filter((j) => j.postStatus === 'draft').length;
    const closed = jobs.filter((j) => j.status === 'closed').length;
    const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);
    return { total, published, drafts, closed, totalApplicants };
  }, [summaryMetrics, totalCount, jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      let matchesStatus = true;
      if (statusFilter === 'published') {
        matchesStatus = (job.postStatus || 'published') === 'published' && job.status === 'active';
      } else if (statusFilter === 'draft') {
        matchesStatus = job.postStatus === 'draft';
      } else if (statusFilter === 'closed') {
        matchesStatus = job.status === 'closed';
      }

      const title = job.title?.toLowerCase() || '';
      const location = job.location?.toLowerCase() || '';
      const category = job.category?.toLowerCase() || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || location.includes(query) || category.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [jobs, statusFilter, searchQuery]);

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans pb-12">
        {/* HEADER SECTION */}
        <GSAPReveal direction="down" distance={16}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Manage Job Openings
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Monitor candidate applications, resume incomplete drafts, and publish new hiring requisitions.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/jobs/post">
                <Button variant="primary" size="sm" className="font-bold text-xs gap-1.5 shadow-subtle">
                  <Plus className="w-3.5 h-3.5" /> Post a Job
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-xs font-semibold gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
            </div>
          </div>
        </GSAPReveal>

        {/* RECRUITMENT METRICS STRIP */}
        {!isLoading && !hasError && jobs.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.05}>
            <div className="flex flex-wrap items-center gap-4 md:gap-8 py-3.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-subtle">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Total Requisitions</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.total}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Live Published</span>
                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{metrics.published}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Drafts</span>
                <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{metrics.drafts}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Total Applicants</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.totalApplicants}</span>
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* SEARCH & STATUS FILTER BAR */}
        {!isLoading && !hasError && jobs.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.08}>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search job listings by position title, category, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold border-b border-zinc-100 dark:border-zinc-800/80">
                {(['all', 'published', 'draft', 'closed'] as const).map((st) => {
                  const isActive = statusFilter === st;
                  const label =
                    st === 'all'
                      ? 'All Jobs'
                      : st === 'published'
                      ? 'Published'
                      : st === 'draft'
                      ? 'Drafts'
                      : 'Closed';
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3.5 py-1.5 rounded-lg capitalize transition-all whitespace-nowrap select-none ${
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
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Failed to load job listings</h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                There was a problem communicating with the server. Please verify your connection and retry.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchJobs(page)} className="font-semibold text-xs">
              Try Again
            </Button>
          </Card>
        )}

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton variant="text" className="w-48 h-5" />
                  <Skeleton variant="text" className="w-20 h-4" />
                </div>
                <Skeleton variant="text" className="w-36 h-4" />
              </Card>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !hasError && jobs.length > 0 && filteredJobs.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No matching job openings found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Try clearing your search query or switching status filters.
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

        {!isLoading && !hasError && jobs.length === 0 && (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No job openings posted yet
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Create your first job listing using our step-by-step posting wizard to start receiving applications.
              </p>
            </div>
            <Link href="/dashboard/jobs/post" className="inline-block pt-1">
              <Button variant="primary" size="sm" className="font-bold text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Post Your First Job
              </Button>
            </Link>
          </Card>
        )}

        {/* JOB LIST CARDS */}
        {!isLoading && !hasError && filteredJobs.length > 0 && (
          <GSAPReveal direction="up" distance={20} stagger={0.05}>
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const isDraft = job.postStatus === 'draft';
                return (
                  <Card
                    key={job._id}
                    className="p-5 md:p-6 space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2.5">
                          {isDraft ? (
                            <Link
                              href={`/dashboard/jobs/post?draftId=${job._id}`}
                              className="text-base font-bold text-zinc-900 dark:text-zinc-100 hover:underline truncate block"
                            >
                              {job.title}
                            </Link>
                          ) : (
                            <Link
                              href={`/jobs/${job._id}`}
                              className="text-base font-bold text-zinc-900 dark:text-zinc-100 hover:underline truncate block"
                            >
                              {job.title}
                            </Link>
                          )}

                          {isDraft ? (
                            <Badge
                              variant="warning"
                              size="sm"
                              className="capitalize font-extrabold text-[10px] shrink-0 gap-1"
                            >
                              <FileEdit className="w-3 h-3" /> Draft
                            </Badge>
                          ) : (
                            <Badge
                              variant={job.status === 'active' ? 'success' : 'outline'}
                              size="sm"
                              className={`capitalize font-extrabold text-[10px] shrink-0 ${
                                job.status === 'closed' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700' : ''
                              }`}
                            >
                              {job.status}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {job.location}
                            </span>
                          )}
                          {job.jobType && (
                            <>
                              <span>•</span>
                              <span className="capitalize">
                                {Array.isArray(job.jobType)
                                  ? job.jobType.map((t: string) => String(t).replace(/_/g, ' ')).join(', ')
                                  : String(job.jobType).replace(/_/g, ' ')}
                              </span>
                            </>
                          )}
                          {Boolean(formatContractDuration(job.contractDuration)) && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Length: {formatContractDuration(job.contractDuration)}</span>
                            </>
                          )}
                          {Boolean(formatExpectedHours(job.expectedHours)) && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatExpectedHours(job.expectedHours)}</span>
                            </>
                          )}
                          {job.category && (
                            <>
                              <span>•</span>
                              <span>{job.category}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" /> {formatJobPostedDate(job.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDraft ? (
                          <Link href={`/dashboard/jobs/post?draftId=${job._id}`}>
                            <Button variant="primary" size="sm" className="font-bold text-xs gap-1.5 shadow-subtle">
                              <Play className="w-3.5 h-3.5 fill-current" /> Finish Posting
                            </Button>
                          </Link>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-400" /> {job.applicantCount || 0} Applicants
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACTION BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        {isDraft ? (
                          <span className="text-zinc-400 text-xs">Draft posting not visible publicly until published.</span>
                        ) : (
                          <>
                            <Link href={`/dashboard/jobs/${job._id}/applicants`}>
                              <Button variant="primary" size="sm" className="font-bold text-xs gap-1">
                                <Users className="w-3.5 h-3.5" /> View Applicants ({job.applicantCount || 0})
                              </Button>
                            </Link>

                            <Link href={`/jobs/${job._id}`}>
                              <Button variant="outline" size="sm" className="font-semibold text-xs gap-1">
                                <span>View Public Page</span>
                                <ExternalLink className="w-3 h-3 text-zinc-400" />
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isDraft && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(job._id, job.status)}
                            isLoading={togglingId === job._id}
                            className="font-semibold text-xs gap-1"
                            title={job.status === 'active' ? 'Mark job listing as Closed' : 'Re-open job listing as Active'}
                          >
                            {job.status === 'active' ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-emerald-500" /> Close Opening
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-zinc-400" /> Activate Opening
                              </>
                            )}
                          </Button>
                        )}

                        <Link href={`/dashboard/jobs/post?jobId=${job._id}`}>
                          <Button variant="outline" size="sm" className="font-semibold text-xs gap-1">
                            <Edit3 className="w-3.5 h-3.5 text-zinc-400" /> Edit Details
                          </Button>
                        </Link>
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
      </div>
    </ProtectedRoute>
  );
}
