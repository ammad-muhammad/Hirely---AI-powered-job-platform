'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { JobCard, JobCardProps } from '@/components/jobs/JobCard';
import { WorkspaceNav } from '@/components/navigation/WorkspaceNav';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { CinematicEntrance } from '@/components/animation/CinematicEntrance';
import { formatJobPostedDate } from '@/utils/formatters';
import {
  Search,
  FileText,
  Sparkles,
  User as UserIcon,
  Building2,
  Calendar,
  MapPin,
  ChevronRight,
  Award,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Users,
  Plus,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Settings,
  Clock,
  FileEdit,
} from 'lucide-react';

interface JobSeekerApplicationItem {
  _id: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  appliedAt: string;
  jobId: {
    _id: string;
    title: string;
    location: string;
    companyId: {
      companyName: string;
      logoUrl?: string;
    };
  };
}

interface EmployerJobItem {
  _id: string;
  title: string;
  category?: string;
  jobType?: string;
  location?: string;
  status: 'active' | 'closed';
  postStatus?: 'draft' | 'published';
  createdAt: string;
  applicantCount: number;
}

interface EmployerApplicantItem {
  _id: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  appliedAt: string;
  jobId: {
    _id: string;
    title: string;
  };
  applicantId: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
}

interface EmployerCompany {
  _id: string;
  companyName: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  isVerified?: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { totalUnreadCount } = useChat();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Admin redirect
  useEffect(() => {
    if (user && user.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  // Job Seeker States
  const [profileCompletion, setProfileCompletion] = useState<number | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<JobCardProps['job'][]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [recMessage, setRecMessage] = useState<string | null>(null);
  const [recentApplications, setRecentApplications] = useState<JobSeekerApplicationItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  // Employer States
  const [company, setCompany] = useState<EmployerCompany | null>(null);
  const [employerJobs, setEmployerJobs] = useState<EmployerJobItem[]>([]);
  const [employerApplications, setEmployerApplications] = useState<EmployerApplicantItem[]>([]);
  const [employerSummaryMetrics, setEmployerSummaryMetrics] = useState<{
    totalRequisitions: number;
    publishedCount: number;
    draftsCount: number;
    closedCount: number;
    totalApplicantsCount: number;
  } | null>(null);
  const [isLoadingEmployerData, setIsLoadingEmployerData] = useState(true);
  const [employerError, setEmployerError] = useState<string | null>(null);
  // Cinematic entrance sequence state
  const [shouldPlayCinematic, setShouldPlayCinematic] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isJustAuth = sessionStorage.getItem('just_authenticated');
      const isFirstVisit = !sessionStorage.getItem('dashboard_visited');
      if (isJustAuth || isFirstVisit) {
        setShouldPlayCinematic(true);
        sessionStorage.removeItem('just_authenticated');
        sessionStorage.setItem('dashboard_visited', 'true');
      }
    }
  }, []);

  // Fetch Job Seeker Data
  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      async function fetchProfile() {
        try {
          const response = await api.get('/job-seeker-profile/me');
          if (response.data?.success && response.data?.data?.profile) {
            setProfileCompletion(response.data.data.profile.profileCompletionPercentage);
          }
        } catch {}
      }

      async function fetchRecommended() {
        try {
          setIsLoadingRecs(true);
          const response = await api.get('/jobs/recommended');
          if (response.data?.success) {
            if (response.data.message && response.data.data.length === 0) {
              setRecMessage(response.data.message);
            } else {
              setRecommendedJobs(response.data.data.slice(0, 2) || []);
            }
          }
        } catch {
          setRecommendedJobs([]);
        } finally {
          setIsLoadingRecs(false);
        }
      }

      async function fetchApplications() {
        try {
          setIsLoadingApps(true);
          const response = await api.get('/applications/my-applications');
          if (response.data?.success && response.data?.data) {
            setRecentApplications(response.data.data.slice(0, 3));
          }
        } catch {
          setRecentApplications([]);
        } finally {
          setIsLoadingApps(false);
        }
      }

      fetchProfile();
      fetchRecommended();
      fetchApplications();
    }
  }, [user]);

  // Fetch Employer Data
  const fetchEmployerData = useCallback(async () => {
    if (!user || user.role !== 'employer') return;
    setIsLoadingEmployerData(true);
    setEmployerError(null);

    try {
      // 1. Fetch Company
      const compRes = await api.get('/companies/me').catch(() => null);
      if (compRes?.data?.success && compRes.data.data) {
        setCompany(compRes.data.data);
      }

      // 2. Fetch Employer Jobs & Global Summary Metrics
      const jobsRes = await api.get('/jobs/my-jobs').catch(() => null);
      let fetchedJobs: EmployerJobItem[] = [];
      if (jobsRes?.data?.success && Array.isArray(jobsRes.data.data)) {
        fetchedJobs = jobsRes.data.data;
        setEmployerJobs(fetchedJobs);
        if (jobsRes.data.summaryMetrics) {
          setEmployerSummaryMetrics(jobsRes.data.summaryMetrics);
        }
      }

      // 3. Fetch Recent Applications for top 3 jobs
      if (fetchedJobs.length > 0) {
        const topJobs = fetchedJobs.slice(0, 3);
        const appsPromises = topJobs.map((j) => api.get(`/applications/job/${j._id}`).catch(() => null));
        const appsResults = await Promise.all(appsPromises);

        let combinedApps: EmployerApplicantItem[] = [];
        appsResults.forEach((res) => {
          if (res?.data?.success && Array.isArray(res.data.data)) {
            combinedApps = combinedApps.concat(res.data.data);
          }
        });

        // Sort by appliedAt desc & pick top 5
        combinedApps.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
        setEmployerApplications(combinedApps.slice(0, 5));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employer dashboard metrics.';
      setEmployerError(msg);
    } finally {
      setIsLoadingEmployerData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'employer') {
      fetchEmployerData();
    }
  }, [user, fetchEmployerData]);

  // Calculated Employer Metrics (Uses global company summaryMetrics)
  const employerStats = useMemo(() => {
    const activeJobsCount = employerSummaryMetrics
      ? employerSummaryMetrics.publishedCount
      : employerJobs.filter((j) => (j.postStatus || 'published') === 'published' && j.status === 'active').length;

    const draftJobsCount = employerSummaryMetrics
      ? employerSummaryMetrics.draftsCount
      : employerJobs.filter((j) => j.postStatus === 'draft').length;

    const totalApplicationsCount = employerSummaryMetrics
      ? employerSummaryMetrics.totalApplicantsCount
      : employerJobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);

    const shortlistedCount = employerApplications.filter((a) => a.status === 'shortlisted').length;
    const interviewCount = employerApplications.filter((a) => a.status === 'interview').length;
    const hiredCount = employerApplications.filter((a) => a.status === 'hired').length;

    return {
      activeJobs: activeJobsCount,
      draftJobs: draftJobsCount,
      totalApplications: totalApplicationsCount,
      shortlisted: shortlistedCount,
      interviews: interviewCount,
      hires: hiredCount,
    };
  }, [employerSummaryMetrics, employerJobs, employerApplications]);

  const handleApplyClick = (job: JobCardProps['job']) => {
    router.push(`/jobs/${job._id}/apply`);
  };

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  /* ==================================================================== */
  /*                      EMPLOYER DASHBOARD VIEW                         */
  /* ==================================================================== */
  if (user?.role === 'employer') {
    return (
      <ProtectedRoute>
        <CinematicEntrance isTriggered={shouldPlayCinematic}>
          <div ref={containerRef} className="space-y-6 font-sans">
            {/* HEADER SECTION */}
            <div data-cinematic="layout" className="anim-nav flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {getGreeting()}, {company?.companyName || user.fullName}
                  </h1>
                  {company?.isVerified && (
                    <Badge variant="success" size="sm" className="gap-1 font-bold">
                      <ShieldCheck className="w-3 h-3" /> Verified Employer
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Manage active job postings, evaluate candidate applications, and track recruitment progress.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/dashboard/jobs/post">
                  <Button variant="primary" size="sm" className="font-bold text-xs gap-1.5 shadow-subtle">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Post a Job</span>
                  </Button>
                </Link>

                <Link href="/dashboard/company/setup">
                  <Button variant="outline" size="sm" className="font-semibold text-xs gap-1">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Company Profile</span>
                  </Button>
                </Link>
              </div>
            </div>

          {/* WARNING BANNER IF NO COMPANY PROFILE CREATED */}
          {!isLoadingEmployerData && !company && (
            <GSAPReveal direction="up" distance={16}>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Company Profile Setup Required</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300">
                      Complete your company details to enable job publishing and candidate communications.
                    </span>
                  </div>
                </div>
                <Link href="/dashboard/company/setup" className="shrink-0">
                  <Button variant="primary" size="sm" className="text-xs font-bold bg-amber-600 hover:bg-amber-700 border-amber-600 text-white">
                    Setup Company Profile
                  </Button>
                </Link>
              </div>
            </GSAPReveal>
          )}

          {/* OVERVIEW STATS METRICS ROW */}
          <GSAPReveal direction="up" distance={20} delay={0.05}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Live Active Jobs */}
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Live Active Jobs</span>
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {isLoadingEmployerData ? <Skeleton variant="text" className="w-10 h-6" /> : employerStats.activeJobs}
                </div>
              </Card>

              {/* Draft Jobs */}
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Draft Jobs</span>
                  <FileEdit className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  {isLoadingEmployerData ? <Skeleton variant="text" className="w-10 h-6" /> : employerStats.draftJobs}
                </div>
              </Card>

              {/* Total Applications */}
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Applications</span>
                  <Users className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {isLoadingEmployerData ? <Skeleton variant="text" className="w-10 h-6" /> : employerStats.totalApplications}
                </div>
              </Card>

              {/* Shortlisted */}
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Shortlisted</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {isLoadingEmployerData ? <Skeleton variant="text" className="w-10 h-6" /> : employerStats.shortlisted}
                </div>
              </Card>

              {/* Interviews */}
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Interviews</span>
                  <Calendar className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {isLoadingEmployerData ? <Skeleton variant="text" className="w-10 h-6" /> : employerStats.interviews}
                </div>
              </Card>

              {/* Hires Made */}
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Hires Made</span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {isLoadingEmployerData ? <Skeleton variant="text" className="w-10 h-6" /> : employerStats.hires}
                </div>
              </Card>
            </div>
          </GSAPReveal>

          {/* MAIN TWO COLUMN RECRUITMENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: ACTIVE JOBS & RECENT APPLICANTS (~65%) */}
            <div className="lg:col-span-8 space-y-6">
              {/* ACTIVE JOB POSTINGS SECTION */}
              <GSAPReveal direction="up" distance={20} delay={0.1}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-zinc-500" /> Active Job Listings
                    </h2>

                    <Link href="/dashboard/jobs/post">
                      <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900">
                        <Plus className="w-3.5 h-3.5" /> Post Job
                      </Button>
                    </Link>
                  </div>

                  {isLoadingEmployerData ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Card key={i} className="p-4 space-y-2">
                          <Skeleton variant="text" className="w-48 h-5" />
                          <Skeleton variant="text" className="w-32 h-4" />
                        </Card>
                      ))}
                    </div>
                  ) : employerJobs.length === 0 ? (
                    <Card className="p-8 text-center space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No active job listings</h3>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                          Publish open positions to start receiving applications from qualified candidates.
                        </p>
                      </div>
                      <Link href="/dashboard/jobs/post" className="inline-block pt-1">
                        <Button variant="primary" size="sm" className="text-xs font-bold gap-1">
                          <Plus className="w-3.5 h-3.5" /> Post Your First Job
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {employerJobs.slice(0, 4).map((job) => (
                        <Card key={job._id} className="p-4 space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                  {job.title}
                                </h3>
                                <Badge
                                  variant={job.status === 'active' ? 'success' : 'outline'}
                                  size="sm"
                                  className="capitalize font-bold text-[10px]"
                                >
                                  {job.status}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
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
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400" /> {formatJobPostedDate(job.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs shrink-0 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-zinc-400" /> {job.applicantCount || 0} Applicants
                              </span>
                              <Link href={`/jobs/${job._id}`}>
                                <Button variant="outline" size="sm" className="text-xs font-semibold">
                                  View Posting
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </GSAPReveal>

              {/* RECENT APPLICATIONS SECTION */}
              <GSAPReveal direction="up" distance={20} delay={0.15}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-zinc-500" /> Recent Candidate Submissions
                    </h2>

                    <Link href="/dashboard/messages" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 flex items-center gap-0.5">
                      <span>View All Conversations</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {isLoadingEmployerData ? (
                    <Card className="p-4 space-y-3">
                      <Skeleton variant="text" className="w-48 h-4" />
                      <Skeleton variant="text" className="w-32 h-3" />
                    </Card>
                  ) : employerApplications.length === 0 ? (
                    <Card className="p-6 text-center space-y-2">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">No applications received yet</h3>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Applications submitted by candidates for your job listings will appear here automatically.
                      </p>
                    </Card>
                  ) : (
                    <Card className="p-4 space-y-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {employerApplications.map((app) => (
                        <div key={app._id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            {/* Candidate Avatar */}
                            <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                              {app.applicantId?.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={app.applicantId.avatarUrl} alt={app.applicantId.fullName} className="w-full h-full object-cover" />
                              ) : (
                                app.applicantId?.fullName?.charAt(0) || 'C'
                              )}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                                {app.applicantId?.fullName || 'Candidate'}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{app.jobId?.title}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {new Date(app.appliedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <Badge variant={getStatusBadgeVariant(app.status)} size="sm" className="uppercase font-bold text-[10px]">
                              {app.status.replace('_', ' ')}
                            </Badge>
                            <Link href="/dashboard/messages">
                              <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Message
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              </GSAPReveal>
            </div>

            {/* RIGHT RAIL: QUICK SHORTCUTS & COMPANY TOOLS (~35%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* QUICK ACTIONS SHORTCUTS */}
              <GSAPReveal direction="up" distance={20} delay={0.1}>
                <Card className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    Recruitment Shortcuts
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    {/* Post a Job */}
                    <Link
                      href="/dashboard/jobs/post"
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Plus className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Post a New Job</span>
                          <span className="text-[10px] text-zinc-500">Publish open positions to candidates</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </Link>

                    {/* Manage Company Profile */}
                    <Link
                      href="/dashboard/company/setup"
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-zinc-500" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Company Profile</span>
                          <span className="text-[10px] text-zinc-500">Update logo, bio & details</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </Link>

                    {/* Verification Status */}
                    <Link
                      href="/dashboard/company/verification"
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Verification Status</span>
                          <span className="text-[10px] text-zinc-500">Business registration check</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </Link>

                    {/* Messages */}
                    <Link
                      href="/dashboard/messages"
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-zinc-500" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Candidate Chat</span>
                          <span className="text-[10px] text-zinc-500">Real-time socket messaging</span>
                        </div>
                      </div>
                      {totalUnreadCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-bold">
                          {totalUnreadCount}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      )}
                    </Link>

                    {/* Account Settings */}
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-zinc-500" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Account Settings</span>
                          <span className="text-[10px] text-zinc-500">Email, 2FA & preferences</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </Link>
                  </div>
                </Card>
              </GSAPReveal>
            </div>
          </div>
        </div>
      </CinematicEntrance>
    </ProtectedRoute>
    );
  }

  /* ==================================================================== */
  /*                     JOB SEEKER DASHBOARD VIEW                        */
  /* ==================================================================== */
  return (
    <ProtectedRoute>
      <CinematicEntrance isTriggered={shouldPlayCinematic}>
        <div ref={containerRef} className="space-y-6 font-sans">
        {/* Workspace Contextual Tab Navigation */}
        <div className="anim-nav">
          <WorkspaceNav />
        </div>

        {/* TOP COMPACT GREETING AREA */}
        <div className="anim-hero flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {getGreeting()}, {user?.fullName || 'Candidate'}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  Career Workspace
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Explore verified opportunities, track your applications, and prepare for interviews.
              </p>
            </div>

            {/* PRIMARY CAREER ACTION BAR */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/jobs">
                <Button variant="primary" size="sm" className="font-semibold text-xs gap-1.5 shadow-subtle">
                  <Search className="w-3.5 h-3.5" />
                  <span>Find Jobs</span>
                </Button>
              </Link>

              <Link href="/dashboard/applications">
                <Button variant="outline" size="sm" className="font-semibold text-xs gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Applications</span>
                </Button>
              </Link>
            </div>
          </div>

        {/* MAIN ASYMMETRIC CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: MAIN WORKSPACE ACTIVITIES (~65%) */}
          <div className="lg:col-span-8 space-y-6">
            {/* RECOMMENDED OPPORTUNITIES SNAPSHOT */}
            <GSAPReveal direction="up" distance={20}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-zinc-500" /> Recommended for You
                  </h2>

                  <Link
                    href="/dashboard/recommended"
                    className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-0.5"
                  >
                    <span>View all recommendations</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {isLoadingRecs ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="p-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <Skeleton variant="rectangular" className="w-10 h-10 rounded-lg" />
                          <div className="space-y-2 flex-1">
                            <Skeleton variant="text" className="w-40 h-4" />
                            <Skeleton variant="text" className="w-24 h-3" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : recMessage ? (
                  <Card className="p-5 text-center space-y-2.5">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{recMessage}</p>
                    <Link href="/dashboard/profile" className="inline-block">
                      <Button variant="primary" size="sm" className="text-xs font-bold">
                        Update Profile Skills
                      </Button>
                    </Link>
                  </Card>
                ) : recommendedJobs.length === 0 ? (
                  <Card className="p-6 text-center space-y-2">
                    <p className="text-xs text-zinc-500">
                      We&apos;re learning what opportunities fit you best. Add your skills to unlock matches.
                    </p>
                    <Link href="/dashboard/profile" className="inline-block pt-1">
                      <Button variant="outline" size="sm" className="text-xs font-semibold">
                        Complete Profile Skills
                      </Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {recommendedJobs.map((job) => (
                      <JobCard key={job._id} job={job} onApplyClick={() => handleApplyClick(job)} />
                    ))}
                  </div>
                )}
              </div>
            </GSAPReveal>

            {/* APPLICATION ACTIVITY SNAPSHOT */}
            <GSAPReveal direction="up" distance={20} delay={0.1}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-zinc-500" /> Application Activity
                  </h2>

                  <Link
                    href="/dashboard/applications"
                    className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-0.5"
                  >
                    <span>View all applications</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {isLoadingApps ? (
                  <Card className="p-5 space-y-3">
                    <Skeleton variant="text" className="w-48 h-4" />
                    <Skeleton variant="text" className="w-32 h-3" />
                  </Card>
                ) : recentApplications.length === 0 ? (
                  <Card className="p-6 text-center space-y-2">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">No applications yet</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Start exploring opportunities that match your candidate profile.
                    </p>
                    <Link href="/jobs" className="inline-block pt-1">
                      <Button variant="primary" size="sm" className="text-xs font-semibold">
                        Find Jobs
                      </Button>
                    </Link>
                  </Card>
                ) : (
                  <Card className="p-4 space-y-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {recentApplications.map((app) => (
                      <div key={app._id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <Link href={`/jobs/${app.jobId?._id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline truncate block">
                            {app.jobId?.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <span>{app.jobId?.companyId?.companyName}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" /> {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <Badge variant={getStatusBadgeVariant(app.status)} size="sm" className="uppercase shrink-0 font-bold">
                          {app.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            </GSAPReveal>

            {/* JOB DISCOVERY QUICK CATEGORIES */}
            <GSAPReveal direction="up" distance={20} delay={0.15}>
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-zinc-500" /> Explore Opportunities
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href="/jobs?jobType=remote"
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors space-y-1 block select-none"
                  >
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Remote Positions</span>
                    <span className="text-[11px] text-zinc-500 block">Work from anywhere globally</span>
                  </Link>

                  <Link
                    href="/jobs?category=engineering"
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors space-y-1 block select-none"
                  >
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Software & Product</span>
                    <span className="text-[11px] text-zinc-500 block">Frontend, Backend, Design</span>
                  </Link>

                  <Link
                    href="/jobs"
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors space-y-1 block select-none"
                  >
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Latest Postings</span>
                    <span className="text-[11px] text-zinc-500 block">Verified company listings</span>
                  </Link>
                </div>
              </div>
            </GSAPReveal>
          </div>

          {/* RIGHT RAIL: PROFILE STRENGTH & CAREER TOOLS (~35%) */}
          <div className="lg:col-span-4 space-y-6">
            {/* PROFILE STRENGTH MODULE */}
            <GSAPReveal direction="up" distance={20} delay={0.1}>
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Profile Strength</h3>
                    <p className="text-[11px] text-zinc-500">Recruiter visibility score</p>
                  </div>
                  <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                    {profileCompletion !== null ? `${profileCompletion}%` : 'Complete'}
                  </span>
                </div>

                {profileCompletion !== null && (
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      style={{ width: `${profileCompletion}%` }}
                      className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
                    />
                  </div>
                )}

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Complete your resume PDF, skills, and preferences to rank higher in recruiter searches.
                </p>

                <Link href="/dashboard/profile" className="block">
                  <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-center">
                    <UserIcon className="w-3.5 h-3.5 mr-1" /> Complete Profile
                  </Button>
                </Link>
              </Card>
            </GSAPReveal>

            {/* CAREER TOOLS SUITE */}
            <GSAPReveal direction="up" distance={20} delay={0.2}>
              <Card className="p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  Career Tools Suite
                </h3>

                <div className="space-y-3 text-xs">
                  {/* AI Resume Auditor */}
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-zinc-500" /> Resume Auditor
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">Review your resume for ATS keyword compatibility.</p>
                    <Link href="/dashboard/resume-checker" className="inline-block text-[11px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                      Review Resume →
                    </Link>
                  </div>

                  {/* AI Mock Interview */}
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-500" /> AI Mock Interview
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">Practice realistic interviews for your target role.</p>
                    <Link href="/dashboard/mock-interview" className="inline-block text-[11px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                      Practice Interview →
                    </Link>
                  </div>

                  {/* Skill Tests */}
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-zinc-500" /> Verified Skill Tests
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">Assess and earn proctored technical badges.</p>
                    <Link href="/dashboard/skill-tests" className="inline-block text-[11px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                      Take Assessments →
                    </Link>
                  </div>
                </div>
              </Card>
            </GSAPReveal>
          </div>
        </div>
      </div>
    </CinematicEntrance>
  </ProtectedRoute>
  );
}
