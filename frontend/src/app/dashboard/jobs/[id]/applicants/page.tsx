'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Users,
  FileText,
  Mail,
  MapPin,
  ArrowLeft,
  ExternalLink,
  Calendar,
  User as UserIcon,
  Phone,
  MessageSquare,
  AlertCircle,
  Search,
  CheckCircle2,
  X,
  MessageSquareText,
  Briefcase,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ScreeningAnswerItem {
  questionId?: string;
  questionText: string;
  answerText: string;
  isDealBreakerMismatch?: boolean;
}

interface ApplicantItem {
  _id: string;
  applicantId: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    avatarUrl?: string;
  };
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  resumeUrl: string;
  coverLetter?: string;
  screeningAnswers?: ScreeningAnswerItem[];
  appliedAt: string;
}

export default function ApplicantsPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [jobTitle, setJobTitle] = useState<string>('');
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [expandedCoverLetters, setExpandedCoverLetters] = useState<Record<string, boolean>>({});

  const toggleCoverLetter = (appId: string) => {
    setExpandedCoverLetters((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchApplicants = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const response = await api.get(`/applications/job/${jobId}`);
      if (response.data?.success) {
        setJobTitle(response.data.jobTitle || 'Job Position');
        setApplicants(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
      setHasError(true);
      setApplicants([]);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (user && user.role !== 'employer') {
      router.push('/dashboard');
      return;
    }
    if (user && jobId) {
      fetchApplicants();
    }
  }, [user, jobId, router, fetchApplicants]);

  const updateStatus = async (applicationId: string, newStatus: string) => {
    setUpdatingId(applicationId);
    try {
      const response = await api.put(`/applications/${applicationId}/status`, { status: newStatus });
      if (response.data?.success) {
        setApplicants((prev) =>
          prev.map((app) => (app._id === applicationId ? { ...app, status: newStatus as ApplicantItem['status'] } : app))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = applicants.length;
    const applied = applicants.filter((a) => a.status === 'applied').length;
    const reviewing = applicants.filter((a) => a.status === 'under_review').length;
    const shortlisted = applicants.filter((a) => a.status === 'shortlisted').length;
    const interview = applicants.filter((a) => a.status === 'interview').length;
    const hired = applicants.filter((a) => a.status === 'hired').length;
    const rejected = applicants.filter((a) => a.status === 'rejected').length;
    return { total, applied, reviewing, shortlisted, interview, hired, rejected };
  }, [applicants]);

  // Filtered candidate applications
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const name = app.applicantId?.fullName?.toLowerCase() || '';
      const email = app.applicantId?.email?.toLowerCase() || '';
      const phone = app.applicantId?.phone?.toLowerCase() || '';
      const location = app.applicantId?.location?.toLowerCase() || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || email.includes(query) || phone.includes(query) || location.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [applicants, statusFilter, searchQuery]);

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

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans pb-12">
        {/* HEADER SECTION */}
        <GSAPReveal direction="down" distance={16}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Candidates for &ldquo;{jobTitle}&rdquo;
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Review applicant resumes, cover letters, and update candidate recruitment pipeline statuses.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/jobs')}
              className="text-xs font-semibold shrink-0 gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to My Jobs
            </Button>
          </div>
        </GSAPReveal>

        {/* METRICS STRIP */}
        {!isLoading && !hasError && applicants.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.05}>
            <div className="flex flex-wrap items-center gap-4 md:gap-8 py-3.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-subtle">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Total Applicants</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.total}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Under Review</span>
                <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{metrics.reviewing + metrics.applied}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Shortlisted</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.shortlisted}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Interview</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.interview}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Hired</span>
                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{metrics.hired}</span>
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* SEARCH & STATUS FILTER BAR */}
        {!isLoading && !hasError && applicants.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.08}>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search candidate by full name, email address, or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold border-b border-zinc-100 dark:border-zinc-800/80">
                {['all', 'applied', 'under_review', 'shortlisted', 'interview', 'hired', 'rejected'].map((st) => {
                  const isActive = statusFilter === st;
                  const label = st === 'all' ? 'All Candidates' : st.replace('_', ' ');
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
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load candidate applications</h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                There was a problem communicating with the server. Please verify your connection and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchApplicants} className="font-semibold text-xs">
              Try Again
            </Button>
          </Card>
        )}

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton variant="text" className="w-40 h-4" />
                    <Skeleton variant="text" className="w-32 h-3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !hasError && applicants.length === 0 && (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No candidate applications received yet
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Candidates applying for &ldquo;{jobTitle}&rdquo; will appear here automatically with their resume PDFs and contact details.
              </p>
            </div>
            <Link href="/dashboard/jobs" className="inline-block pt-1">
              <Button variant="outline" size="sm" className="font-semibold text-xs">
                Back to Posted Jobs
              </Button>
            </Link>
          </Card>
        )}

        {/* NO FILTER MATCHES STATE */}
        {!isLoading && !hasError && applicants.length > 0 && filteredApplicants.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No matching candidate profiles found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Try clearing your search query or selecting a different status filter tab.
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

        {/* CANDIDATE CARDS */}
        {!isLoading && !hasError && filteredApplicants.length > 0 && (
          <GSAPReveal direction="up" distance={20} stagger={0.05}>
            <div className="space-y-4">
              {filteredApplicants.map((app, idx) => {
                const zIndexClass = `relative z-[${50 - idx}]`;
                return (
                  <Card
                    key={app._id}
                    className={`p-5 md:p-6 space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors ${zIndexClass}`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                      <div className="flex items-center gap-3.5">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden shadow-subtle">
                          {app.applicantId?.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={app.applicantId.avatarUrl} alt={app.applicantId.fullName} className="w-full h-full object-cover" />
                          ) : (
                            app.applicantId?.fullName?.charAt(0) || 'C'
                          )}
                        </div>

                        {/* Candidate Name & Contact Info */}
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {app.applicantId?.fullName || 'Candidate'}
                            </span>
                            <Badge variant={getStatusBadgeVariant(app.status)} size="sm" className="uppercase font-extrabold text-[10px]">
                              {app.status.replace('_', ' ')}
                            </Badge>

                            {/* Deal-breaker warning badges */}
                            {app.screeningAnswers?.filter((sa) => sa.isDealBreakerMismatch).map((sa, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 select-none"
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>⚠️ May not meet: {sa.questionText}</span>
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                            {app.applicantId?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-zinc-400" /> {app.applicantId.email}
                              </span>
                            )}
                            {app.applicantId?.phone && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-zinc-400" /> {app.applicantId.phone}
                                </span>
                              </>
                            )}
                            {app.applicantId?.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {app.applicantId.location}
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

                      {/* Status Dropdown Selector */}
                      <div className="w-48 shrink-0">
                        <Select
                          label="Candidate Status"
                          value={app.status}
                          onChange={(e) => updateStatus(app._id, e.target.value)}
                          options={[
                            { value: 'applied', label: 'Applied' },
                            { value: 'under_review', label: 'Under Review' },
                            { value: 'shortlisted', label: 'Shortlisted' },
                            { value: 'interview', label: 'Interview' },
                            { value: 'hired', label: 'Hired' },
                            { value: 'rejected', label: 'Rejected' },
                          ]}
                          disabled={updatingId === app._id}
                        />
                      </div>
                    </div>

                    {/* Screening Question Answers */}
                    {app.screeningAnswers && app.screeningAnswers.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" /> Screening Question Answers ({app.screeningAnswers.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {app.screeningAnswers.map((sa, saIdx) => (
                            <div
                              key={saIdx}
                              className={`p-2.5 rounded-lg border text-xs space-y-0.5 ${
                                sa.isDealBreakerMismatch
                                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              <p className="font-semibold text-zinc-500 dark:text-zinc-400 text-[11px]">
                                {sa.questionText}
                              </p>
                              <p className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                {sa.answerText}
                                {sa.isDealBreakerMismatch && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                                    (Mismatch)
                                  </span>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cover Letter Expander Bar (Inline on-page expansion) */}
                    {app.coverLetter && (
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <MessageSquareText className="w-3.5 h-3.5 text-zinc-500" /> Candidate Cover Letter
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCoverLetter(app._id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                          >
                            <span>{expandedCoverLetters[app._id] ? 'Show Less' : 'Expand Full Text'}</span>
                            {expandedCoverLetters[app._id] ? (
                              <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                          </button>
                        </div>
                        <p
                          className={`text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line ${
                            expandedCoverLetters[app._id] ? '' : 'line-clamp-2 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {app.coverLetter}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                      <div className="flex items-center gap-3">
                        {app.resumeUrl && (
                          <a
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                          >
                            <FileText className="w-4 h-4 text-zinc-500" />
                            <span>View / Download Resume PDF</span>
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Link href="/dashboard/messages">
                          <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Message Candidate
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

      </div>
    </ProtectedRoute>
  );
}
