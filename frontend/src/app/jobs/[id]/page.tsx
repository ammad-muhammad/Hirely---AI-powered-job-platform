'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Header } from '@/components/navigation/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { JobDescriptionRenderer } from '@/components/jobs/JobDescriptionRenderer';
import {
  formatSalaryRange,
  formatWorkplaceType,
  formatHiringTimeline,
  formatContractDuration,
  formatExpectedHours,
  formatJobPostedDate,
} from '@/utils/formatters';
import {
  Briefcase,
  MapPin,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Globe,
  Bookmark,
  Sparkles,
  Clock,
  Calendar,
  Users,
  GraduationCap,
  HelpCircle,
  ShieldAlert,
  Award,
  MessageSquare,
  FileCheck,
  Zap,
} from 'lucide-react';

interface ScreeningQuestion {
  questionType: string;
  questionText?: string;
  specificFieldRequirement?: string;
  experienceYears?: number;
  experienceTitle?: string;
  educationLevel?: string;
  isDealBreaker: boolean;
}

interface JobDetail {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  location: string;
  status?: 'active' | 'closed';
  postStatus?: 'draft' | 'published';
  workplaceType?: string;
  hiringTimeline?: string;
  numberOfHires?: number;
  payShowBy?: 'range' | 'exact' | 'starting_at' | 'maximum';
  payRate?: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year';
  contractDuration?: { length: number; unit: string } | null;
  expectedHours?: { type: string; fixedHours?: number; minHours?: number; maxHours?: number } | null;
  applicationMethod?: 'platform' | 'email';
  requireResume?: boolean;
  candidatesCanContact?: boolean;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryDisclosed: boolean;
  experienceLevel: string;
  educationRequirement?: string;
  skillsRequired: string[];
  description: string;
  responsibilities: string[];
  screeningQuestions?: ScreeningQuestion[];
  openings: number;
  applicationDeadline?: string | null;
  createdAt: string;
  hasApplied?: boolean;
  isSaved?: boolean;
  companyId: {
    _id: string;
    companyName: string;
    logoUrl?: string;
    location?: string;
    industry?: string;
    description?: string;
    website?: string;
    companySize?: string;
    isVerified?: boolean;
  };
}

export default function JobDetailPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const [isJobClosed, setIsJobClosed] = useState(false);

  const fetchJobDetail = useCallback(async () => {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      if (response.data?.success && response.data?.data) {
        const fetchedJob = response.data.data;
        setJob(fetchedJob);
        if (fetchedJob.status && fetchedJob.status !== 'active') {
          setIsJobClosed(true);
        }
        if (fetchedJob.isSaved !== undefined) {
          setIsSaved(Boolean(fetchedJob.isSaved));
        }
      }
    } catch {
      setJob(null);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      fetchJobDetail();
    }
  }, [jobId, fetchJobDetail]);

  // Real-time Socket.io updates for job details & status
  useEffect(() => {
    if (!jobId) return;

    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('job_updated', (updatedJob: JobDetail) => {
        if (updatedJob._id === jobId) {
          if (updatedJob.status === 'closed') {
            setIsJobClosed(true);
          }
          setJob((prev) => (prev ? { ...prev, ...updatedJob } : updatedJob));
        }
      });

      socketInstance.on('job_closed', ({ jobId: closedId }: { jobId: string }) => {
        if (closedId === jobId) {
          setIsJobClosed(true);
        }
      });

      socketInstance.on('saved_jobs_updated', ({ jobId: targetId, saved }: { jobId: string; saved: boolean }) => {
        if (targetId === jobId) {
          setIsSaved(saved);
        }
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('job_updated');
        socketInstance.off('job_closed');
        socketInstance.off('saved_jobs_updated');
      }
    };
  }, [jobId]);

  const handleApplyClick = () => {
    if (!user) {
      router.push(`/login?returnUrl=/jobs/${jobId}/apply`);
      return;
    }
    router.push(`/jobs/${jobId}/apply`);
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      router.push(`/login?returnUrl=/jobs/${jobId}`);
      return;
    }
    setIsSavingBookmark(true);
    try {
      const res = await api.post(`/saved-jobs/${jobId}/toggle`);
      if (res.data?.success) {
        setIsSaved(Boolean(res.data.saved));
      }
    } catch (err) {
      console.error('Save toggle error:', err);
    } finally {
      setIsSavingBookmark(false);
    }
  };

  // Loading Skeleton View
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
          <Card className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton variant="rectangular" className="w-16 h-16 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton variant="text" className="w-64 h-8" />
                <Skeleton variant="text" className="w-40 h-4" />
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6 space-y-3">
                <Skeleton variant="text" className="w-32 h-6" />
                <Skeleton variant="rectangular" className="h-40" />
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="p-6 space-y-3">
                <Skeleton variant="rectangular" className="h-10" />
                <Skeleton variant="rectangular" className="h-10" />
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not Found / Error View
  if (!job) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
        <Header />
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 text-center">
          <Card className="p-8 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Job Opening Not Found</h1>
              <p className="text-xs text-zinc-500">
                This job listing may have expired or is no longer accepting applications.
              </p>
            </div>
            <Link href="/jobs" className="inline-block pt-2">
              <Button variant="primary" size="sm">
                Back to Jobs Marketplace
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const daysLeft = job.applicationDeadline
    ? Math.max(
        0,
        Math.ceil((new Date(job.applicationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      )
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      {/* Global Header Navigation */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Back Breadcrumb Navigation */}
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs Marketplace
          </Link>
        </div>

        {/* Closed Notice Banner */}
        {isJobClosed && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 block">
                  This Job Requisition Has Been Closed
                </span>
                <span className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                  The employer is no longer accepting new applications for this posting.
                </span>
              </div>
            </div>
            <Link href="/jobs" className="shrink-0">
              <Button variant="outline" size="sm" className="text-xs font-bold border-red-300">
                Browse Active Jobs
              </Button>
            </Link>
          </div>
        )}

        {/* JOB HEADER CARD */}
        <Card className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Company Logo / Avatar */}
              <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {job.companyId?.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={job.companyId.logoUrl} alt={job.companyId.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-zinc-400" />
                )}
              </div>

              {/* Title & Organization Meta */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {job.companyId?._id ? (
                      <Link href={`/companies/${job.companyId._id}`} className="hover:underline">
                        {job.companyId.companyName}
                      </Link>
                    ) : (
                      <span>{job.companyId?.companyName}</span>
                    )}
                    {job.companyId?.isVerified && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        title="Verified Employer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Verified
                      </span>
                    )}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {job.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> {formatJobPostedDate(job.createdAt)}
                  </span>
                </div>

                {/* Badges: Workplace, Type, Experience, Salary */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="info" size="md" className="capitalize font-bold">
                    {formatWorkplaceType(job.workplaceType)}
                  </Badge>

                  <Badge variant="default" size="md" className="capitalize font-bold">
                    {Array.isArray(job.jobType)
                      ? job.jobType.map((t: string) => String(t).replace(/_/g, ' ')).join(', ')
                      : String(job.jobType || 'full_time').replace(/_/g, ' ')}
                  </Badge>

                  <Badge variant="outline" size="md" className="capitalize">
                    {job.experienceLevel} Level
                  </Badge>

                  <Badge variant="success" size="md" className="font-bold">
                    {formatSalaryRange(job)}
                  </Badge>

                  {job.candidatesCanContact && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      title="Employer accepts direct candidate questions"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Direct Q&A Allowed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Actions Overlay (Shown under header on small screens) */}
            <div className="flex md:hidden items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 w-full">
              {user?.role === 'job_seeker' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleBookmark}
                  isLoading={isSavingBookmark}
                  className="flex-1"
                >
                  <Bookmark className={`w-4 h-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </Button>
              )}

              {user?.role === 'employer' ? (
                <span className="text-xs text-zinc-400 font-medium italic">Viewing as Employer</span>
              ) : job.hasApplied ? (
                <Button variant="outline" size="sm" className="w-full text-emerald-600 border-emerald-300 dark:border-emerald-800 cursor-default">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Already Applied
                </Button>
              ) : (
                <Button variant="primary" size="sm" className="w-full font-medium" onClick={handleApplyClick}>
                  Apply Now
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* TWO COLUMN DESKTOP GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT MAIN CONTENT (~68%) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 md:p-8 space-y-6">
              {/* Job Description (Renders HTML or legacy plain text gracefully) */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  About the Role & Description
                </h2>
                <JobDescriptionRenderer description={job.description} />
              </div>



              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Key Responsibilities
                  </h2>
                  <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {job.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0 mt-2" />
                        <span className="leading-relaxed">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Education Requirement if available */}
              {job.educationRequirement && (
                <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Education Level Summary
                  </h2>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{job.educationRequirement}</span>
                  </p>
                </div>
              )}

              {/* Required Skills & Expertise */}
              {job.skillsRequired && job.skillsRequired.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Required Skills & Expertise
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skillsRequired.map((skill) => (
                      <Badge key={skill} variant="default" size="md">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Company Overview Section */}
            {job.companyId && (
              <Card className="p-6 md:p-8 space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  About {job.companyId.companyName}
                </h3>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                    {job.companyId?.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={job.companyId.logoUrl} alt={job.companyId.companyName} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{job.companyId.companyName}</span>
                      {job.companyId.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </h4>
                    {job.companyId.industry && (
                      <span className="text-xs text-zinc-500">{job.companyId.industry}</span>
                    )}
                  </div>
                </div>

                {job.companyId.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    {job.companyId.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  {job.companyId.companySize && (
                    <div>
                      <span className="text-zinc-400 block font-medium">Company Size</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{job.companyId.companySize} employees</span>
                    </div>
                  )}
                  {job.companyId.location && (
                    <div>
                      <span className="text-zinc-400 block font-medium">Headquarters</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{job.companyId.location}</span>
                    </div>
                  )}
                </div>

                {job.companyId.website && (
                  <a
                    href={job.companyId.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline pt-1"
                  >
                    <Globe className="w-3.5 h-3.5 text-zinc-500" /> Visit Official Website
                  </a>
                )}
              </Card>
            )}
          </div>

          {/* RIGHT STICKY SIDEBAR (~32%) */}
          <aside className="hidden md:block space-y-6 lg:col-span-1 sticky top-20">
            {/* Primary Action Card */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs border-b border-zinc-200 dark:border-zinc-800 pb-3">
                Application Actions
              </h3>

              {isJobClosed ? (
                <Button variant="outline" size="md" disabled className="w-full text-red-600 border-red-300 dark:border-red-800 cursor-not-allowed font-bold">
                  Job Requisition Closed
                </Button>
              ) : user?.role === 'employer' ? (
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-xs font-medium text-zinc-500 text-center italic">
                  Viewing listing as Employer
                </div>
              ) : job.hasApplied ? (
                <Link href="/dashboard/applications" className="w-full block">
                  <Button variant="outline" className="w-full font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Applied — View Status</span>
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" size="lg" className="w-full font-semibold py-3" onClick={handleApplyClick}>
                  Apply Now
                </Button>
              )}

              {/* Bookmark Save Action */}
              {user?.role === 'job_seeker' && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleToggleBookmark}
                  isLoading={isSavingBookmark}
                  className="w-full font-medium gap-2 text-xs"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? 'Saved to Bookmarks' : 'Save Job Opening'}</span>
                </Button>
              )}
            </Card>

            {/* Compact Job Summary Card */}
            <Card className="p-6 space-y-3.5 text-xs">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs border-b border-zinc-200 dark:border-zinc-800 pb-2">
                Job Overview
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Workplace
                  </span>
                  <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                    {formatWorkplaceType(job.workplaceType)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-400" /> Job Type
                  </span>
                  <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                    {Array.isArray(job.jobType)
                      ? job.jobType.map((t: string) => String(t).replace(/_/g, ' ')).join(', ')
                      : String(job.jobType || 'full_time').replace(/_/g, ' ')}
                  </span>
                </div>

                {Boolean(formatExpectedHours(job.expectedHours)) && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Expected Hours
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatExpectedHours(job.expectedHours)}
                    </span>
                  </div>
                )}

                {Boolean(formatContractDuration(job.contractDuration)) && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Contract Length
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatContractDuration(job.contractDuration)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-zinc-400" /> Hiring Speed
                  </span>
                  <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                    {formatHiringTimeline(job.hiringTimeline)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" /> Experience
                  </span>
                  <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                    {job.experienceLevel} Level
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" /> Openings
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {job.openings || job.numberOfHires || 1} Position(s)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-zinc-400" /> Resume Needed
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {job.requireResume !== false ? 'Required' : 'Optional'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Deadline
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Until Filled'}
                  </span>
                </div>

                {job.applicationDeadline && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Time Remaining
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
