'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { JobCard } from '@/components/jobs/JobCard';
import { WorkspaceNav } from '@/components/navigation/WorkspaceNav';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Filter,
  User as UserIcon,
  Briefcase,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface RecommendedJobItem {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  location: string;
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
  matchScore?: number;
  matchReason?: string;
}

interface UserProfileContext {
  skills: string[];
  experienceLevel?: string;
  desiredJobTitles?: string[];
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

const SORT_OPTIONS: SelectOption[] = [
  { value: 'recommended', label: 'Default (Best Match)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'salary_high', label: 'Highest Salary' },
];

export default function RecommendedJobsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<RecommendedJobItem[]>([]);
  const [profileContext, setProfileContext] = useState<UserProfileContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [expLevelFilter, setExpLevelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');

  // Redirect non-jobseekers away
  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadRecommendedData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      // Fetch recommended jobs and candidate profile context in parallel safely
      const [recRes, profileRes] = await Promise.allSettled([
        api.get('/jobs/recommended'),
        api.get('/job-seeker/profile'),
      ]);

      if (recRes.status === 'fulfilled' && recRes.value.data?.success) {
        if (recRes.value.data.message && recRes.value.data.data.length === 0) {
          setEmptyMessage(recRes.value.data.message);
          setJobs([]);
        } else {
          setJobs(recRes.value.data.data || []);
          setEmptyMessage(null);
        }
      } else {
        setHasError(true);
        setJobs([]);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success && profileRes.value.data?.data?.profile) {
        const p = profileRes.value.data.data.profile;
        setProfileContext({
          skills: p.skills || [],
          experienceLevel: p.experienceLevel || undefined,
          desiredJobTitles: p.desiredJobTitles || [],
        });
      }
    } catch (err) {
      console.error('Failed to load recommended jobs:', err);
      setHasError(true);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      loadRecommendedData();
    }
  }, [user, loadRecommendedData]);

  const handleApplyClick = (job: RecommendedJobItem) => {
    router.push(`/jobs/${job._id}/apply`);
  };

  // Filtered & Sorted Jobs Memoization
  const processedJobs = useMemo(() => {
    let result = jobs.filter((job) => {
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

    if (sortBy === 'newest') {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'salary_high') {
      result = [...result].sort((a, b) => (b.salaryMin || 0) - (a.salaryMin || 0));
    }

    return result;
  }, [jobs, searchQuery, jobTypeFilter, expLevelFilter, sortBy]);

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
                  Recommended for You
                </h1>
                {!isLoading && jobs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {jobs.length} matched positions
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Jobs selected based on your candidate profile skills, experience level, and preferences.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/profile">
                <Button variant="outline" size="sm" className="font-semibold text-xs">
                  <UserIcon className="w-3.5 h-3.5 mr-1" />
                  <span>Update Profile</span>
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="primary" size="sm" className="font-bold text-xs">
                  <span>Explore All Jobs</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </GSAPReveal>

        {/* REAL PERSONALIZATION CONTEXT HEADER */}
        {!isLoading && !hasError && profileContext && profileContext.skills.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.04}>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold space-y-2 shadow-subtle">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold">
                  <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <span>Personalized Recommendation Criteria</span>
                </div>
                {profileContext.experienceLevel && (
                  <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                    {profileContext.experienceLevel} Level Candidate
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mr-1">Skills:</span>
                {profileContext.skills.slice(0, 6).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                  >
                    {skill}
                  </span>
                ))}
                {profileContext.skills.length > 6 && (
                  <span className="text-[10px] text-zinc-400 font-medium">
                    +{profileContext.skills.length - 6} more
                  </span>
                )}
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* SEARCH, FILTERS & SORTING BAR */}
        {!isLoading && !hasError && jobs.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.06} className="relative z-30">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-subtle relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Search Input */}
                <div className="sm:col-span-5">
                  <SearchInput
                    placeholder="Search recommended jobs by title, company, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Job Type Filter */}
                <div className="sm:col-span-3">
                  <SearchableSelect
                    options={JOB_TYPE_OPTIONS}
                    value={jobTypeFilter}
                    onChange={(val) => setJobTypeFilter(val)}
                    placeholder="Job Type..."
                  />
                </div>

                {/* Experience Level Filter */}
                <div className="sm:col-span-2">
                  <SearchableSelect
                    options={EXPERIENCE_LEVEL_FILTER_OPTIONS}
                    value={expLevelFilter}
                    onChange={(val) => setExpLevelFilter(val)}
                    placeholder="Experience..."
                  />
                </div>

                {/* Sort Option */}
                <div className="sm:col-span-2">
                  <SearchableSelect
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    placeholder="Sort By..."
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
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load recommendations</h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                Please check your network connection and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadRecommendedData} className="font-semibold text-xs">
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
        {!isLoading && !hasError && (emptyMessage || jobs.length === 0) && (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {emptyMessage || 'No recommendations yet'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Complete your candidate profile, add your technical skills, and specify your experience level to receive tailored job matches.
              </p>
            </div>
            <Link href="/dashboard/profile" className="inline-block pt-1">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                <span>Update Profile Skills</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </Card>
        )}

        {/* NO FILTER MATCHES STATE */}
        {!isLoading && !hasError && jobs.length > 0 && processedJobs.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Filter className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No matching recommendations found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Try adjusting your search keyword or clearing filter selections.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setJobTypeFilter('all');
                setExpLevelFilter('all');
                setSortBy('recommended');
              }}
              className="text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </Card>
        )}

        {/* RECOMMENDATION FEED LIST */}
        {!isLoading && !hasError && processedJobs.length > 0 && (
          <GSAPReveal direction="up" distance={20} stagger={0.06}>
            <div className="space-y-4">
              {processedJobs.map((job, idx) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onApplyClick={() => handleApplyClick(job)}
                />
              ))}
            </div>
          </GSAPReveal>
        )}

      </div>
    </ProtectedRoute>
  );
}
