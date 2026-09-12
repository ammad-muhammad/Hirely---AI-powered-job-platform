'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import {
  Briefcase,
  Search,
  Filter,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
} from 'lucide-react';
import gsap from 'gsap';

import { Pagination } from '@/components/ui/Pagination';

interface AdminJobItem {
  _id: string;
  title: string;
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  status: 'active' | 'closed';
  applicantCount: number;
  createdAt: string;
  companyId?: {
    _id: string;
    companyName: string;
    logoUrl?: string;
    isVerified: boolean;
  };
  employerId?: {
    fullName: string;
    email: string;
  };
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'employer_grouped' | 'flat_list'>('employer_grouped');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Expanded Companies State in Employer Grouped View
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  // In-App Job Detail Modal State (Part 6 Item 1)
  const [selectedJobModal, setSelectedJobModal] = useState<AdminJobItem | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete Job Confirmation Modal
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<AdminJobItem | null>(null);

  // Close Job Reason Modal
  const [closeReasonJob, setCloseReasonJob] = useState<AdminJobItem | null>(null);
  const [closeReasonText, setCloseReasonText] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async (targetPage = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(targetPage));
      params.append('limit', '30');

      const res = await api.get(`/admin/jobs?${params.toString()}`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setJobs(res.data.data);
        if (res.data.pagination) {
          setPage(res.data.pagination.currentPage || targetPage);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching admin jobs list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchJobs(page);
  }, [fetchJobs, page]);

  const toggleCompanyExpand = (companyId: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  // Group jobs by Company for Employer-Grouped View
  const groupedByCompany = jobs.reduce((acc, job) => {
    const key = job.companyId?._id || 'unknown_company';
    if (!acc[key]) {
      acc[key] = {
        companyName: job.companyId?.companyName || 'Independent Employers',
        logoUrl: job.companyId?.logoUrl,
        isVerified: job.companyId?.isVerified || false,
        jobs: [],
      };
    }
    acc[key].jobs.push(job);
    return acc;
  }, {} as Record<string, { companyName: string; logoUrl?: string; isVerified: boolean; jobs: AdminJobItem[] }>);

  // GSAP entrance animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isLoading && containerRef.current && !prefersReducedMotion) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  const handleExecuteCloseJobReason = async () => {
    if (!closeReasonJob) return;
    try {
      setActionLoadingId(closeReasonJob._id);
      await api.put(`/admin/jobs/${closeReasonJob._id}/status`, {
        status: 'closed',
        reason: closeReasonText.trim() || 'Closed by administrator for policy review.',
      });
      setCloseReasonJob(null);
      setCloseReasonText('');
      fetchJobs(page);
    } catch (err) {
      console.error('Error closing job posting:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleJobStatus = async (job: AdminJobItem) => {
    if (job.status === 'active') {
      setCloseReasonJob(job);
      setCloseReasonText('');
      return;
    }
    const nextStatus = 'active';
    setActionLoadingId(job._id);
    try {
      const res = await api.put(`/admin/jobs/${job._id}/status`, { status: nextStatus });
      if (res.data?.success) {
        setJobs((prev) =>
          prev.map((j) => (j._id === job._id ? { ...j, status: nextStatus } : j))
        );
        if (selectedJobModal?._id === job._id) {
          setSelectedJobModal((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
      }
    } catch (err: any) {
      console.error('Error toggling job status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteDeleteJob = async () => {
    if (!deleteConfirmJob) return;
    setActionLoadingId(deleteConfirmJob._id);

    try {
      const res = await api.delete(`/admin/jobs/${deleteConfirmJob._id}`);
      if (res.data?.success) {
        setJobs((prev) => prev.filter((j) => j._id !== deleteConfirmJob._id));
        setDeleteConfirmJob(null);
        if (selectedJobModal?._id === deleteConfirmJob._id) {
          setSelectedJobModal(null);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete job posting.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#1f1f1f] text-white shadow-sm">
              <Briefcase className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
              Job Management & Employer Portfolios
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Inspect postings grouped by employer or platform-wide, view job details in-app, and manage active status
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('employer_grouped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'employer_grouped'
                  ? 'bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Grouped by Employer
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat_list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'flat_list'
                  ? 'bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              All Jobs Flat List
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchJobs(page)}
            className="text-xs font-bold gap-1.5 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <Card className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search job title or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
          />
        </div>

        <SelectDropdown
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active Jobs' },
            { value: 'closed', label: 'Closed Jobs' },
          ]}
          icon={Filter}
        />
      </Card>

      {/* JOBS DATASET */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse h-32 rounded-2xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
            No Job Postings Found
          </h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-medium">
            There are currently no job postings matching your query.
          </p>
        </Card>
      ) : viewMode === 'employer_grouped' ? (
        /* MODE 1: GROUPED BY EMPLOYER / COMPANY (PART 6 ITEM 2) */
        <div className="space-y-4">
          {Object.entries(groupedByCompany).map(([cId, group]) => {
            const isExpanded = expandedCompanies[cId] !== false; // Default expanded
            return (
              <Card
                key={cId}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl space-y-4"
              >
                {/* Company Accordion Header */}
                <div
                  onClick={() => toggleCompanyExpand(cId)}
                  className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-zinc-100 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 overflow-hidden shrink-0">
                      {group.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={group.logoUrl} alt={group.companyName} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-[#1f1f1f] dark:text-zinc-100">{group.companyName}</h2>
                        {group.isVerified && (
                          <Badge variant="success" size="sm" className="text-[10px] font-extrabold">Verified Company</Badge>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">
                        {group.jobs.length} Job Postings ({group.jobs.filter((j) => j.status === 'active').length} Active)
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    {isExpanded ? 'Hide Postings ▲' : 'Show Postings ▼'}
                  </span>
                </div>

                {/* Company Jobs Grid */}
                {isExpanded && (
                  <div className="space-y-3 pt-1">
                    {group.jobs.map((job) => (
                      <div
                        key={job._id}
                        className="p-4 rounded-xl bg-[#f6f7ed] dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-extrabold text-sm text-[#1f1f1f] dark:text-zinc-100">{job.title}</h3>
                            {job.status === 'active' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 uppercase">
                                Active
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">
                                Closed
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-zinc-500">
                            <span>{job.location}</span>
                            <span>•</span>
                            <span className="capitalize">{job.jobType}</span>
                            <span>•</span>
                            <span>Posted by: <strong className="text-zinc-800 dark:text-zinc-200">{job.employerId?.fullName || 'Employer'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                          <span className="text-zinc-500 flex items-center gap-1 font-bold">
                            <Users className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{job.applicantCount || 0} applicants</span>
                          </span>

                          {/* LINK TO DEDICATED JOB DETAIL PAGE */}
                          <Link href={`/admin/jobs/${job._id}`}>
                            <Button className="bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl px-3.5 py-1.5 text-xs font-extrabold shadow-xs flex items-center gap-1 border-none">
                              <span>View Job Details</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoadingId === job._id}
                            onClick={() => handleToggleJobStatus(job)}
                            className={`text-xs font-bold rounded-xl ${
                              job.status === 'active'
                                ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {job.status === 'active' ? 'Force Close' : 'Reactivate'}
                          </Button>

                          <button
                            type="button"
                            disabled={actionLoadingId === job._id}
                            onClick={() => setDeleteConfirmJob(job)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Delete Job Posting"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* MODE 2: FLAT ALL JOBS LIST */
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card
              key={job._id}
              className="p-5 md:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-subtle space-y-4 rounded-2xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300 font-bold overflow-hidden">
                    {job.companyId?.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={job.companyId.logoUrl} alt={job.title} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">{job.title}</h2>
                      {job.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase">
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{job.companyId?.companyName || 'Company'}</span>
                      {job.companyId?.isVerified && (
                        <Badge variant="success" size="sm">Verified</Badge>
                      )}
                      <span>•</span>
                      <span>{job.location}</span>
                      <span>•</span>
                      <span className="capitalize">{job.jobType}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 flex items-center gap-4 self-start md:self-center shrink-0 font-medium">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <strong className="text-zinc-900 dark:text-zinc-100">{job.applicantCount || 0}</strong> applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-zinc-500">
                  Posted by: <strong className="text-zinc-900 dark:text-zinc-100">{job.employerId?.fullName || 'Employer'}</strong> ({job.employerId?.email || 'N/A'})
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {/* LINK TO DEDICATED JOB DETAIL PAGE */}
                  <Link href={`/admin/jobs/${job._id}`}>
                    <Button className="bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl px-3.5 py-1.5 text-xs font-extrabold shadow-xs flex items-center gap-1 border-none">
                      <span>View Job Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoadingId === job._id}
                    onClick={() => handleToggleJobStatus(job)}
                    className={`text-xs font-bold gap-1 rounded-xl ${
                      job.status === 'active'
                        ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                        : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {job.status === 'active' ? (
                      <>
                        <Ban className="w-3.5 h-3.5 text-red-600" /> Force Close
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reactivate Job
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    disabled={actionLoadingId === job._id}
                    onClick={() => setDeleteConfirmJob(job)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete Job Posting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
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

      {/* DELETE JOB CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmJob)}
        onClose={() => setDeleteConfirmJob(null)}
        title="Delete Job Posting"
        maxWidth="sm"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Are you sure you want to permanently delete job posting{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{deleteConfirmJob?.title}</strong>? This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmJob(null)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoadingId === deleteConfirmJob?._id}
              onClick={handleExecuteDeleteJob}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Confirm Job Deletion
            </Button>
          </div>
        </div>
      </Modal>

      {/* CLOSE JOB REASON MODAL */}
      <Modal
        isOpen={Boolean(closeReasonJob)}
        onClose={() => setCloseReasonJob(null)}
        title="Force Close Job Posting"
        maxWidth="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              You are forcibly closing job posting <strong className="text-zinc-900 dark:text-zinc-100">{closeReasonJob?.title}</strong>. An administrative notification with your reason will be logged and dispatched to the employer.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase text-zinc-500 block">
              Policy Violation / Closure Reason:
            </label>
            <textarea
              rows={3}
              value={closeReasonText}
              onChange={(e) => setCloseReasonText(e.target.value)}
              placeholder="E.g., Job posting violates platform guidelines regarding prohibited compensation structures..."
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setCloseReasonJob(null)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoadingId === closeReasonJob?._id}
              onClick={handleExecuteCloseJobReason}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold border-none rounded-xl"
            >
              Confirm & Close Job
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
