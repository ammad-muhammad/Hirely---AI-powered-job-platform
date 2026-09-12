'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { JobCard } from '@/components/jobs/JobCard';
import { Pagination } from '@/components/ui/Pagination';
import { GSAPReveal } from '@/components/animation/GSAPReveal';

const AIAssistantWidget = dynamic(
  () => import('@/components/AIAssistantWidget').then((mod) => mod.AIAssistantWidget),
  { ssr: false }
);
import {
  Search,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  X,
  Briefcase,
} from 'lucide-react';

interface PublicJob {
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
    location?: string;
    industry?: string;
    isVerified?: boolean;
  };
}

export default function PublicJobsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<PublicJob[]>([]);

  // Mobile Filter Drawer state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [category, setCategory] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);

  // Fetch saved job IDs for logged-in job seeker
  const fetchSavedJobIds = useCallback(async () => {
    if (user && user.role === 'job_seeker') {
      try {
        const response = await api.get('/saved-jobs');
        if (response.data?.success && Array.isArray(response.data.data)) {
          setSavedJobIds(response.data.data.map((j: { _id: string }) => j._id));
        }
      } catch {
        setSavedJobIds([]);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchSavedJobIds();
  }, [fetchSavedJobIds]);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (location) params.append('location', location);
      if (jobType) params.append('jobType', jobType);
      if (category) params.append('category', category);
      if (experienceLevel) params.append('experienceLevel', experienceLevel);
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', String(page));
      params.append('limit', '8');

      const response = await api.get(`/jobs?${params.toString()}`);
      if (response.data?.success && response.data?.data) {
        setJobs(response.data.data);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalJobs(response.data.pagination?.total || 0);
      }
    } catch {
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, location, jobType, category, experienceLevel, sortBy, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Real-time Socket.io updates for public job listings
  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('job_published', (publishedJob: PublicJob) => {
        setJobs((prev) => {
          if (prev.some((j) => j._id === publishedJob._id)) return prev;
          return [publishedJob, ...prev];
        });
        setTotalJobs((t) => t + 1);
      });

      socketInstance.on('job_updated', (updatedJob: any) => {
        if (updatedJob.status === 'closed' || updatedJob.postStatus === 'draft') {
          setJobs((prev) => prev.filter((j) => j._id !== updatedJob._id));
          setTotalJobs((t) => Math.max(0, t - 1));
        } else {
          setJobs((prev) => prev.map((j) => (j._id === updatedJob._id ? { ...j, ...updatedJob } : j)));
        }
      });

      socketInstance.on('job_closed', ({ jobId }: { jobId: string }) => {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
        setTotalJobs((t) => Math.max(0, t - 1));
      });

      socketInstance.on('saved_jobs_updated', ({ jobId, saved }: { jobId: string; saved: boolean }) => {
        setSavedJobIds((prev: string[]) => (saved ? (prev.includes(jobId) ? prev : [...prev, jobId]) : prev.filter((id: string) => id !== jobId)));
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('job_published');
        socketInstance.off('job_updated');
        socketInstance.off('job_closed');
        socketInstance.off('saved_jobs_updated');
      }
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setLocation('');
    setJobType('');
    setCategory('');
    setExperienceLevel('');
    setSortBy('newest');
    setPage(1);
  };

  const handleApplyClick = (job: PublicJob) => {
    if (!user) {
      router.push(`/login?returnUrl=/jobs/${job._id}/apply`);
      return;
    }
    router.push(`/jobs/${job._id}/apply`);
  };

  const handleSaveToggle = (jobId: string, nowSaved: boolean) => {
    if (nowSaved) {
      setSavedJobIds((prev) => [...prev, jobId]);
    } else {
      setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
    }
  };

  const activeFilterCount = [search, location, jobType, category, experienceLevel].filter(Boolean).length;

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      {/* Global Header Navigation */}
      <Header />

      {/* Main Search Banner */}
      <section className="anim-nav bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Find Your Next Career Opportunity
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Discover verified positions at leading enterprises, tech companies, and growing startups.
            </p>
          </div>

          {/* Prominent Search Controls Form */}
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2">
            <div className="relative md:col-span-5">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Job title, keywords, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle"
              />
            </div>

            <div className="relative md:col-span-5">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="City, State, or 'Remote'..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" variant="primary" className="w-full h-full py-2.5 font-medium">
                Find Jobs
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Main Marketplace Content Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8">
        {/* Mobile Filter & Search Toggle Bar */}
        <div className="lg:hidden flex items-center justify-between pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            className="font-medium gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Jobs</span>
            {activeFilterCount > 0 && <Badge variant="primary" size="sm">{activeFilterCount}</Badge>}
          </Button>

          <span className="text-xs font-medium text-zinc-500">
            {totalJobs} jobs available
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* DESKTOP FILTER SIDEBAR */}
          <aside className="anim-left hidden lg:block lg:col-span-1 sticky top-24 self-start space-y-5">
            <Card className="p-5 space-y-4 shadow-sm border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-zinc-500" /> Filters
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {/* Job Type Filter */}
              <Select
                label="Job Type"
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Types</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </Select>

              {/* Experience Level Filter */}
              <Select
                label="Experience Level"
                value={experienceLevel}
                onChange={(e) => {
                  setExperienceLevel(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Levels</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </Select>

              {/* Category Filter */}
              <Input
                label="Category / Industry"
                placeholder="e.g. Engineering"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              />

              {/* Sort By Filter */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Select
                  label="Sort Results By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="salary">Highest Salary</option>
                </Select>
              </div>
            </Card>
          </aside>

          {/* MOBILE FILTER DRAWER */}
          {isMobileFilterOpen && (
            <div className="lg:hidden fixed inset-0 z-50 overflow-hidden font-sans">
              <div className="fixed inset-0 bg-zinc-950/60" onClick={() => setIsMobileFilterOpen(false)} />
              <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-modal z-50">
                <div className="space-y-5 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Filter className="w-4 h-4" /> Filter Openings
                    </span>
                    <button type="button" onClick={() => setIsMobileFilterOpen(false)}>
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>

                  <Select
                    label="Job Type"
                    value={jobType}
                    onChange={(e) => {
                      setJobType(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </Select>

                  <Select
                    label="Experience Level"
                    value={experienceLevel}
                    onChange={(e) => {
                      setExperienceLevel(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Levels</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                  </Select>

                  <Input
                    label="Category"
                    placeholder="e.g. Engineering"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                  />

                  <Select
                    label="Sort By"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="salary">Highest Salary</option>
                  </Select>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <Button variant="primary" className="w-full" onClick={() => setIsMobileFilterOpen(false)}>
                    Apply Filters
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleResetFilters}>
                    Reset All
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT RESULTS SECTION */}
          <section className="anim-main lg:col-span-3 space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">
              <span>
                {isLoading ? 'Searching database...' : `Showing ${totalJobs} open positions`}
              </span>
              <span>
                Page {page} of {totalPages}
              </span>
            </div>

            {/* Loading Skeleton Rows */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton variant="rectangular" className="w-12 h-12 rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <Skeleton variant="text" className="w-48 h-5" />
                        <Skeleton variant="text" className="w-32 h-4" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              /* Clean Professional Empty State */
              <Card className="p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    No job openings match your search criteria
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Try broadening your search keywords or resetting your location and experience filters.
                  </p>
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="font-medium">
                    Reset All Search Filters
                  </Button>
                )}
              </Card>
            ) : (
              /* Real Jobs Result List */
              <GSAPReveal direction="up" stagger={0.06} distance={16} className="space-y-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job._id}
                    job={{
                      ...job,
                      isSaved: savedJobIds.includes(job._id),
                    }}
                    onApplyClick={() => handleApplyClick(job)}
                    onSaveToggle={handleSaveToggle}
                  />
                ))}

                {/* Standardized Pagination Controls */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalCount={totalJobs}
                  onPageChange={(p) => setPage(p)}
                  className="pt-6"
                />
              </GSAPReveal>
            )}
          </section>
        </div>
      </main>

      {/* Public / Logged Out Footer */}
      <Footer />

      {/* Floating AI Assistant Widget */}
      <AIAssistantWidget mode="job_seeker" />
    </div>
  );
}
