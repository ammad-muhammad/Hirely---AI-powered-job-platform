'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Globe,
  Award,
  Sparkles,
  Tag,
  CheckSquare,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { CinematicEntrance } from '@/components/animation/CinematicEntrance';
import { formatSalaryRange } from '@/utils/formatters';

interface CompanyInfo {
  _id: string;
  companyName: string;
  logoUrl?: string;
  industry?: string;
  companySize?: string;
  foundedYear?: number;
  website?: string;
  description?: string;
  isVerified: boolean;
  ownerId?: string;
}

interface EmployerInfo {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role?: string;
  isSuspended?: boolean;
}

interface JobDetailData {
  _id: string;
  title: string;
  category?: string;
  jobType?: string | string[];
  workplaceType?: string;
  experienceLevel?: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryPeriod?: string;
  hideSalary?: boolean;
  status: 'active' | 'closed' | 'expired';
  postStatus?: 'draft' | 'published';
  isFeatured?: boolean;
  featuredUntil?: string;
  applicationDeadline?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  niceToHave?: string[];
  benefits?: string[];
  skillsRequired?: string[];
  viewsCount?: number;
  createdAt: string;
  updatedAt: string;
  companyId?: CompanyInfo;
  employerId?: EmployerInfo;
}

interface ApplicationItem {
  _id: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  appliedAt: string;
  applicantId?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    role?: string;
    isSuspended?: boolean;
  };
}

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<JobDetailData | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close Job Reason Modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReasonText, setCloseReasonText] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Delete Job Confirm Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchJobDetail = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get(`/admin/jobs/${jobId}`);
      if (res.data?.success && res.data?.data) {
        setJob(res.data.data.job);
        setApplications(res.data.data.applications || []);
        setApplicantCount(res.data.data.applicantCount || (res.data.data.applications?.length || 0));
      }
    } catch (err: any) {
      console.error('Error fetching admin job detail:', err);
      setError(err.response?.data?.message || 'Failed to load job posting details.');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobDetail();
  }, [fetchJobDetail]);

  const handleToggleJobStatus = async (targetStatus: 'active' | 'closed') => {
    if (!job) return;

    if (targetStatus === 'closed') {
      setShowCloseModal(true);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = await api.put(`/admin/jobs/${job._id}/status`, {
        status: 'active',
      });
      if (res.data?.success) {
        setJob((prev) => (prev ? { ...prev, status: 'active' } : null));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reactivate job posting.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExecuteCloseJob = async () => {
    if (!job) return;
    setIsUpdatingStatus(true);

    try {
      const res = await api.put(`/admin/jobs/${job._id}/status`, {
        status: 'closed',
        reason: closeReasonText.trim() || 'Forcibly closed by platform administrator for policy audit.',
      });

      if (res.data?.success) {
        setJob((prev) => (prev ? { ...prev, status: 'closed' } : null));
        setShowCloseModal(false);
        setCloseReasonText('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close job posting.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExecuteDeleteJob = async () => {
    if (!job) return;
    setIsDeleting(true);

    try {
      const res = await api.delete(`/admin/jobs/${job._id}`);
      if (res.data?.success) {
        router.push('/admin/jobs');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete job posting.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
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

  const renderFormattedDescription = (content?: string) => {
    if (!content || !content.trim()) {
      return <p className="text-zinc-500 italic text-xs">No description body provided for this job posting.</p>;
    }

    const hasHtml = /<[a-z][\s\S]*>/i.test(content);

    if (hasHtml) {
      const cleaned = content
        .replace(/<\/p>\s*<p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim();

      return (
        <div className="space-y-3">
          {cleaned.split(/\n\s*\n/).map((para, idx) => (
            <p key={idx} className="leading-relaxed text-xs text-zinc-800 dark:text-zinc-200">
              {para.trim()}
            </p>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {content.split(/\n\s*\n/).map((para, idx) => (
          <p key={idx} className="leading-relaxed text-xs text-zinc-800 dark:text-zinc-200">
            {para.trim()}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans min-w-0 max-w-full bg-zinc-50 dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3 p-4">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
          <span className="text-xs font-extrabold text-zinc-600 dark:text-zinc-400">Loading comprehensive job detail specifications...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6 font-sans min-w-0 max-w-full bg-zinc-50 dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="p-8 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">{error || 'Job Posting Not Found'}</h2>
          <Link href="/admin/jobs">
            <Button variant="outline" size="sm" className="text-xs font-bold gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Jobs Management
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CinematicEntrance>
      <div className="space-y-6 font-sans min-w-0 max-w-full bg-zinc-50 dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Link href="/admin/jobs">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-2 rounded-xl bg-white dark:bg-zinc-900">
                  <ArrowLeft className="w-4 h-4" /> Back to Jobs
                </Button>
              </Link>
              <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Job Audit & Posting Inspection
              </h1>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Inspecting complete employer job specifications, salary bands, requirements, and candidate applicant roster
            </p>
          </div>

          {/* ADMIN ACTION CONTROLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {job.status === 'active' ? (
              <Button
                onClick={() => setShowCloseModal(true)}
                isLoading={isUpdatingStatus}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black px-4 py-2 flex items-center gap-1.5 shadow-sm border-none"
              >
                <Ban className="w-4 h-4" />
                <span>Force Close Job</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleToggleJobStatus('active')}
                isLoading={isUpdatingStatus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black px-4 py-2 flex items-center gap-1.5 shadow-sm border-none"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Reactivate Job</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-xs font-bold text-red-600 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Delete Posting</span>
            </Button>
          </div>
        </div>

        {/* HERO SPECIFICATION CARD */}
        <Card className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-xl shrink-0 overflow-hidden border border-zinc-800 shadow-sm">
                {job.companyId?.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={job.companyId.logoUrl} alt={job.title} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-7 h-7 text-emerald-400" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">{job.title}</h1>
                  {job.status === 'active' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 uppercase tracking-wider">
                      Active Posting
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 uppercase tracking-wider">
                      Closed / Inactive
                    </span>
                  )}

                  {job.postStatus === 'draft' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                      Draft
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-medium">
                  <span className="font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                    {job.companyId?.companyName || 'Company'}
                  </span>
                  {job.companyId?.isVerified && (
                    <Badge variant="success" size="sm" className="gap-1 font-bold">
                      <ShieldCheck className="w-3 h-3" /> Verified Company
                    </Badge>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {job.location}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{Array.isArray(job.jobType) ? job.jobType.join(', ') : job.jobType}</span>
                </div>
              </div>
            </div>

            {/* SALARY & ACTIVITY SUMMARY (RESPONSIVE BOX NO CLIPPING) */}
            <div className="bg-zinc-900 dark:bg-zinc-800 text-white px-5 py-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-700 text-left space-y-1 shrink-0 shadow-sm">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                Compensation Band
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-black text-white dark:text-zinc-100">
                  {formatSalaryRange({
                    salaryMin: job.salaryMin,
                    salaryMax: job.salaryMax,
                    salaryCurrency: (job as any).salaryCurrency || job.currency,
                    payRate: job.salaryPeriod,
                    hideSalary: job.hideSalary,
                  })}
                </span>
              </div>
              {job.hideSalary && (
                <span className="text-[10px] text-amber-400 font-bold block">
                  (Salary hidden from public view)
                </span>
              )}
            </div>
          </div>

          {/* METADATA GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase block">Category & Sector</span>
              <p className="font-extrabold text-zinc-900 dark:text-zinc-100">{job.category || 'General'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase block">Workplace & Experience</span>
              <p className="font-extrabold text-zinc-900 dark:text-zinc-100 capitalize">
                {job.workplaceType || 'On-site'} • {job.experienceLevel || 'Mid-Level'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase block">Total Applicants</span>
              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Users className="w-4 h-4" /> {applicantCount} Candidates
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase block">Posted & Deadline</span>
              <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                {new Date(job.createdAt).toLocaleDateString()}
                {job.applicationDeadline ? ` (Deadline: ${new Date(job.applicationDeadline).toLocaleDateString()})` : ''}
              </p>
            </div>
          </div>

          {/* EMPLOYER & COMPANY ACCOUNT DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Employer Account Owner</span>
              <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{job.employerId?.fullName || 'Employer Account'}</p>
              <p className="text-zinc-500 font-mono text-[11px] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400" /> {job.employerId?.email || 'N/A'}
              </p>
              {job.employerId && (
                <Link href={`/admin/users/${job.employerId._id}`} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline pt-1">
                  <span>Open Employer Account Dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Company Organization</span>
              <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{job.companyId?.companyName || 'Company'}</p>
              <p className="text-zinc-500 text-[11px]">
                {job.companyId?.industry || 'Industry N/A'} • {job.companyId?.companySize || 'Size N/A'}
              </p>
              {job.companyId?.website && (
                <a href={job.companyId.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:underline pt-1">
                  <Globe className="w-3 h-3" /> {job.companyId.website}
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* FULL JOB DESCRIPTION CARD (100% FULL WIDTH) */}
        <Card className="w-full p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <FileText className="w-4 h-4 text-zinc-500" /> Full Job Description
          </h2>

          <div className="w-full max-w-none text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
            {renderFormattedDescription(job.description)}
          </div>
        </Card>

        {/* KEY RESPONSIBILITIES CARD (100% FULL WIDTH) */}
        {job.responsibilities && job.responsibilities.length > 0 && (
          <Card className="w-full p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <CheckSquare className="w-4 h-4 text-emerald-600" /> Key Responsibilities
            </h2>

            <ul className="space-y-2.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium">
              {job.responsibilities.map((resp, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* CANDIDATE QUALIFICATIONS & REQUIREMENTS CARD (100% FULL WIDTH) */}
        {job.requirements && job.requirements.length > 0 && (
          <Card className="w-full p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Award className="w-4 h-4 text-indigo-600" /> Candidate Qualifications & Requirements
            </h2>

            <ul className="space-y-2.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* REQUIRED SKILLS & TECH STACK CARD (100% FULL WIDTH) */}
        {job.skillsRequired && job.skillsRequired.length > 0 && (
          <Card className="w-full p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <Tag className="w-4 h-4 text-zinc-500" /> Required Skills & Tech Stack
            </h3>

            <div className="flex flex-wrap gap-2 pt-1">
              {job.skillsRequired.map((skill, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* BENEFITS & PERKS CARD (100% FULL WIDTH) */}
        {job.benefits && job.benefits.length > 0 && (
          <Card className="w-full p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Compensation & Benefits
            </h3>

            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
              {job.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* FULL CANDIDATE APPLICANTS ROSTER (100% FULL WIDTH) */}
        <Card className="w-full p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Job Applicants Roster ({applicantCount})</span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Complete log of candidates who submitted job applications for this position
              </p>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <Users className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No Candidate Submissions Yet</h3>
              <p className="text-xs text-zinc-500">When candidates apply for this posting, their profiles will be listed here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const candidate = app.applicantId;
                return (
                  <div
                    key={app._id}
                    className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-black flex items-center justify-center text-sm shrink-0 overflow-hidden">
                        {candidate?.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={candidate.avatarUrl} alt={candidate.fullName} className="w-full h-full object-cover" />
                        ) : (
                          candidate?.fullName?.charAt(0) || 'C'
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                            {candidate?.fullName || 'Candidate Account'}
                          </h4>
                          {candidate?.isSuspended && (
                            <Badge variant="danger" size="sm" className="text-[9px] uppercase font-bold">Suspended Account</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-zinc-500 font-medium text-[11px]">
                          <span>Email: <strong className="text-zinc-700 dark:text-zinc-300">{candidate?.email || 'N/A'}</strong></span>
                          {candidate?.phone && (
                            <>
                              <span>•</span>
                              <span>Phone: <strong className="text-zinc-700 dark:text-zinc-300">{candidate.phone}</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span>Applied on {new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                      <Badge variant={getStatusBadgeVariant(app.status)} size="sm" className="uppercase font-bold text-[10px]">
                        {app.status.replace('_', ' ')}
                      </Badge>

                      {candidate && (
                        <Link href={`/admin/users/${candidate._id}`}>
                          <Button
                            size="sm"
                            className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs flex items-center gap-1 border-none"
                          >
                            <span>Inspect Dossier</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* FORCE CLOSE REASON MODAL */}
        <Modal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          title="Force Close Job Posting"
          maxWidth="md"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-300">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                You are forcibly closing job posting <strong className="text-zinc-900 dark:text-zinc-100">{job.title}</strong>. An administrative notification with your reason will be logged and dispatched to the employer.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase text-zinc-500 block">
                Closure Reason / Policy Violation Detail:
              </label>
              <textarea
                rows={3}
                value={closeReasonText}
                onChange={(e) => setCloseReasonText(e.target.value)}
                placeholder="E.g., Job posting violates platform guidelines regarding prohibited compensation structures..."
                className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseModal(false)}
                className="font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={isUpdatingStatus}
                onClick={handleExecuteCloseJob}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Confirm Force Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* DELETE JOB CONFIRM MODAL */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Job Posting Permanently"
          maxWidth="sm"
        >
          <div className="space-y-4 font-sans text-xs">
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete job posting <strong className="text-zinc-900 dark:text-zinc-100">{job.title}</strong>? This action cannot be undone and will remove all applicant records associated with this listing.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                className="font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={isDeleting}
                onClick={handleExecuteDeleteJob}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </CinematicEntrance>
  );
}
