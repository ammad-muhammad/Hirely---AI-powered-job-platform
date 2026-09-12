'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatSalaryRange, formatJobPostedDate } from '@/utils/formatters';
import {
  Building2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';

export interface JobCardProps {
  job: {
    _id: string;
    title: string;
    category: string;
    jobType: string | string[];
    location: string;
    status?: string;
    postStatus?: string;
    payShowBy?: string;
    payRate?: string;
    salaryCurrency?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryDisclosed: boolean;
    experienceLevel: string;
    skillsRequired: string[];
    applicationDeadline?: string | null;
    createdAt?: string;
    companyId: {
      _id: string;
      companyName: string;
      logoUrl?: string;
      isVerified?: boolean;
    };
    matchScore?: number;
    matchReason?: string;
    isSaved?: boolean;
    hasApplied?: boolean;
  };
  onApplyClick?: () => void;
  onSaveToggle?: (jobId: string, nowSaved: boolean) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onApplyClick, onSaveToggle }) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(job.isSaved));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setIsSaved(Boolean(job.isSaved));
  }, [job.isSaved]);

  const getDaysLeft = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user || user.role !== 'job_seeker') return;

    setIsSaving(true);
    try {
      const res = await api.post(`/saved-jobs/${job._id}/toggle`);
      if (res.data?.success) {
        const nextState = Boolean(res.data.saved);
        setIsSaved(nextState);
        if (onSaveToggle) onSaveToggle(job._id, nextState);
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const daysLeft = job.applicationDeadline ? getDaysLeft(job.applicationDeadline) : null;

  return (
    <Card className="p-5 md:p-6 transition-all duration-150 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-subtle hover:shadow-card space-y-4 relative font-sans group">
      {/* Bookmark Action Button for Job Seekers */}
      {user?.role === 'job_seeker' && (
        <button
          type="button"
          onClick={handleToggleBookmark}
          disabled={isSaving}
          title={isSaved ? 'Remove from saved jobs' : 'Save job'}
          aria-label={isSaved ? 'Remove bookmark' : 'Save job bookmark'}
          className={`absolute top-5 right-5 p-2 rounded-lg border transition-colors ${
            isSaved
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
              : 'bg-white dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      )}

      {/* AI Candidate Match Score & Reason Header (If present) */}
      {job.matchScore !== undefined && (
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1.5 pr-12">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>AI Candidate Match</span>
            </span>
            <Badge variant="success" size="sm">
              {job.matchScore}% Match
            </Badge>
          </div>

          {job.matchReason && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              "{job.matchReason}"
            </p>
          )}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          {/* Company Logo / Placeholder */}
          {job.companyId?._id ? (
            <Link
              href={`/companies/${job.companyId._id}`}
              className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 hover:border-zinc-400 transition-colors"
            >
              {job.companyId.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={job.companyId.logoUrl} alt={job.companyId.companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              )}
            </Link>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
              {job.companyId?.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={job.companyId.logoUrl} alt={job.companyId.companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              )}
            </div>
          )}

          {/* Title & Metadata */}
          <div className="space-y-1.5 flex-1 min-w-0 pr-8 md:pr-0">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors tracking-tight truncate">
              <Link href={`/jobs/${job._id}`}>{job.title}</Link>
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                {job.companyId?._id ? (
                  <Link href={`/companies/${job.companyId._id}`} className="hover:underline">
                    {job.companyId.companyName}
                  </Link>
                ) : (
                  <span>{job.companyId?.companyName}</span>
                )}
                {job.companyId?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="Verified Employer">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Verified
                  </span>
                )}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {job.location}
              </span>
              {job.createdAt && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> {formatJobPostedDate(job.createdAt)}
                  </span>
                </>
              )}
            </div>

            {/* Badges: Type, Experience, Salary */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {job.status && job.status !== 'active' && (
                <Badge variant="outline" size="sm" className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 font-extrabold uppercase tracking-wider">
                  Closed
                </Badge>
              )}

              <Badge variant="default" size="sm" className="capitalize">
                {Array.isArray(job.jobType)
                  ? job.jobType.map((t: string) => String(t).replace(/_/g, ' ')).join(', ')
                  : String(job.jobType || 'full_time').replace(/_/g, ' ')}
              </Badge>

              <Badge variant="outline" size="sm" className="capitalize">
                {job.experienceLevel} Level
              </Badge>

              <Badge variant="success" size="sm">
                {formatSalaryRange(job)}
              </Badge>
            </div>

            {/* Skills Required Tags */}
            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                {job.skillsRequired.slice(0, 4).map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                  >
                    {skill}
                  </span>
                ))}
                {job.skillsRequired.length > 4 && (
                  <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                    +{job.skillsRequired.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Days Left */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
          {job.applicationDeadline ? (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </span>
          ) : (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> Until filled
            </span>
          )}

          {job.hasApplied ? (
            <Link href="/dashboard/applications">
              <Button
                variant="outline"
                size="sm"
                className="font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Applied</span>
              </Button>
            </Link>
          ) : onApplyClick && job.status !== 'closed' ? (
            <Button variant="primary" size="sm" onClick={onApplyClick} className="font-medium">
              <span>Apply Now</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Link href={`/jobs/${job._id}`}>
              <Button variant="primary" size="sm" className="font-medium">
                View Details
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
};
