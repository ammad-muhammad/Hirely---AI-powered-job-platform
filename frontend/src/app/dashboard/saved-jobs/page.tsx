'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { JobCard } from '@/components/jobs/JobCard';
import { WorkspaceNav } from '@/components/navigation/WorkspaceNav';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { Bookmark, Search, ArrowRight, AlertCircle, Filter, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

interface SavedJobItem {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  location: string;
  status?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryDisclosed: boolean;
  experienceLevel: string;
  skillsRequired: string[];
  applicationDeadline?: string | null;
  createdAt: string;
  companyId: {
    _id: string;
    companyName: string;
    logoUrl?: string;
    isVerified?: boolean;
  };
}

const JOB_TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Job Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

const EXPERIENCE_LEVEL_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Experience Levels' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
];

export default function SavedJobsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<SavedJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [expLevelFilter, setExpLevelFilter] = useState('all');

  // Redirect non-jobseekers away
  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadSavedJobs = useCallback(async (targetPage = 1) => {
    try {
      setIsLoading(true);
      setHasError(false);
      const response = await api.get(`/saved-jobs?page=${targetPage}&limit=12`);
      if (response.data?.success && response.data?.data) {
        setJobs(response.data.data);
        if (response.data.pagination) {
          setPage(response.data.pagination.currentPage || targetPage);
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.totalCount || 0);
        }
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Failed to load saved jobs:', err);
      setHasError(true);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSavedJobs(page);
    }
  }, [user, loadSavedJobs, page]);

  // Real-time Socket.io listener for saved jobs sync across tabs
  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('saved_jobs_updated', () => {
        loadSavedJobs();
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('saved_jobs_updated');
      }
    };
  }, [loadSavedJobs]);

  const handleApplyClick = (job: SavedJobItem) => {
    router.push(`/jobs/${job._id}/apply`);
  };

  // Optimistic Bookmark Removal & Revert on Failure
  const handleSaveToggle = (jobId: string, nowSaved: boolean) => {
    if (!nowSaved) {
      const originalJobs = [...jobs];
      setJobs((prev) => prev.filter((j) => j._id !== jobId));

      // Attempt unsave API request
      api.post(`/saved-jobs/${jobId}/toggle`).catch((err) => {
        console.error('Failed to unsave job:', err);
        setJobs(originalJobs); // Revert optimistic removal
        setToastError('Failed to remove bookmark. Please try again.');
        setTimeout(() => setToastError(null), 4000);
      });
    }
  };

  // Filtered Jobs Memoization
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const title = job.title?.toLowerCase() || '';
      const company = job.companyId?.companyName?.toLowerCase() || '';
      const location = job.location?.toLowerCase() || '';
      const skills = (job.skillsRequired || []).join(' ').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        company.includes(query) ||
        location.includes(query) ||
        skills.includes(query);

      const matchesJobType = jobTypeFilter === 'all' || job.jobType === jobTypeFilter;
      const matchesExpLevel = expLevelFilter === 'all' || job.experienceLevel === expLevelFilter;

      return matchesSearch && matchesJobType && matchesExpLevel;
    });
  }, [jobs, searchQuery, jobTypeFilter, expLevelFilter]);

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans">
        {/* Workspace Contextual Navigation */}
        <WorkspaceNav />

        {/* PAGE HEADER */}
        <GSAPReveal direction="up" distance={20}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Saved Jobs
                </h1>
                {!isLoading && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {jobs.length} {jobs.length === 1 ? 'opportunity' : 'opportunities'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Keep track of opportunities you&apos;re interested in and come back to them when you&apos;re ready to apply.
              </p>
            </div>

            <Link href="/jobs">
              <Button variant="primary" size="sm" className="font-bold text-xs shrink-0">
                <Search className="w-3.5 h-3.5 mr-1" />
                <span>Find Jobs</span>
              </Button>
            </Link>
          </div>
        </GSAPReveal>

        {/* TOAST ERROR ALERT */}
        {toastError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{toastError}</span>
            </div>
            <button onClick={() => setToastError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SEARCH & STYLED CUSTOM DROPDOWN FILTERS BAR */}
        {!isLoading && !hasError && jobs.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.05} className="relative z-30">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-subtle relative z-30">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search Input */}
                <div className="md:col-span-6">
                  <SearchInput
                    placeholder="Search by job title, company, skills, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Job Type Custom SearchableSelect */}
                <div className="md:col-span-3">
                  <SearchableSelect
                    options={JOB_TYPE_OPTIONS}
                    value={jobTypeFilter}
                    onChange={(val) => setJobTypeFilter(val)}
                    placeholder="Filter by Job Type..."
                  />
                </div>

                {/* Experience Level Custom SearchableSelect */}
                <div className="md:col-span-3">
                  <SearchableSelect
                    options={EXPERIENCE_LEVEL_FILTER_OPTIONS}
                    value={expLevelFilter}
                    onChange={(val) => setExpLevelFilter(val)}
                    placeholder="Filter by Experience..."
                  />
                </div>
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* ERROR STATE */}
        {hasError && (
          <Card className="p-8 text-center space-y-4 border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load your saved jobs</h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                Please check your network connection and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSavedJobs(page)} className="font-semibold text-xs">
              Try Again
            </Button>
          </Card>
        )}

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton variant="rectangular" className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton variant="text" className="w-56 h-5" />
                    <Skeleton variant="text" className="w-36 h-4" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton variant="rectangular" className="w-20 h-6 rounded-md" />
                  <Skeleton variant="rectangular" className="w-24 h-6 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !hasError && jobs.length === 0 && (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No saved jobs yet
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Save opportunities you&apos;re interested in while exploring the marketplace and they&apos;ll appear here.
              </p>
            </div>
            <Link href="/jobs" className="inline-block pt-1">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                <span>Explore Jobs</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </Card>
        )}

        {/* NO FILTER MATCHES STATE */}
        {!isLoading && !hasError && jobs.length > 0 && filteredJobs.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Filter className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No matching saved jobs found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Try clearing your search term or resetting your job type filter.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setJobTypeFilter('all');
                setExpLevelFilter('all');
              }}
              className="text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </Card>
        )}

        {/* SAVED JOBS RECORD LIST */}
        {!isLoading && !hasError && filteredJobs.length > 0 && (
          <GSAPReveal direction="up" distance={20} stagger={0.06}>
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={{
                    ...job,
                    isSaved: true,
                  }}
                  onApplyClick={() => handleApplyClick(job)}
                  onSaveToggle={handleSaveToggle}
                />
              ))}
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
