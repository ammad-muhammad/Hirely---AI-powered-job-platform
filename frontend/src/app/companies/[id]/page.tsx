'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { JobCard } from '@/components/jobs/JobCard';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import {
  Building2,
  MapPin,
  Globe,
  Users,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Heart,
  Briefcase,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Zap,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Star,
  MessageSquare,
  ThumbsUp,
  Pencil,
  Trash2,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

interface CompanyDetailData {
  _id: string;
  companyName: string;
  industry: string;
  companySize: string;
  location: string;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  bannerImageUrl?: string | null;
  foundedYear?: number | null;
  cultureDescription?: string | null;
  benefits?: string[];
  socialLinks?: {
    linkedin?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
  } | null;
  isVerified?: boolean;
  activeJobsCount?: number;
  activeJobs?: any[];
}

interface ReviewItem {
  _id: string;
  reviewerId?: {
    _id: string;
    fullName?: string;
    avatarUrl?: string;
  };
  rating: number;
  title: string;
  reviewText: string;
  relationship: string;
  createdAt: string;
}

interface ExistingReviewData {
  _id?: string;
  rating: number;
  title: string;
  reviewText: string;
  relationship: string;
  createdAt?: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
}

export default function PublicCompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;
  const { user } = useAuth();

  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination state for active open positions
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState<ExistingReviewData | null>(null);
  const [canReviewReason, setCanReviewReason] = useState<string | null>(null);

  // Review Modal state (for create or edit)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [titleInput, setTitleInput] = useState('');
  const [reviewTextInput, setReviewTextInput] = useState('');
  const [relationshipInput, setRelationshipInput] = useState('Interviewed');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Delete review confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  const fetchCompanyDetails = async (targetPage = 1) => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const response = await api.get(`/companies/${companyId}?page=${targetPage}&limit=10`);
      if (response.data?.success && response.data?.data) {
        setCompany(response.data.data);
        if (response.data.pagination) {
          setPage(response.data.pagination.currentPage || targetPage);
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.totalCount || 0);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Company profile not found or unavailable.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyReviews = async () => {
    if (!companyId) return;
    try {
      const response = await api.get(`/companies/${companyId}/reviews`);
      if (response.data?.success) {
        setReviews(response.data.data || []);
        if (response.data.stats) {
          setReviewStats(response.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch company reviews:', err);
    }
  };

  const fetchReviewEligibility = async () => {
    if (!companyId || !user) {
      setCanReview(false);
      setAlreadyReviewed(false);
      setExistingReview(null);
      return;
    }
    try {
      const response = await api.get(`/companies/${companyId}/reviews/can-review`);
      if (response.data?.success) {
        setCanReview(!!response.data.eligible);
        setAlreadyReviewed(!!response.data.alreadyReviewed || !!response.data.hasReviewed);
        setCanReviewReason(response.data.reason || null);

        if (response.data.existingReview) {
          setExistingReview(response.data.existingReview);
        } else {
          setExistingReview(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch review eligibility:', err);
    }
  };

  useEffect(() => {
    fetchCompanyDetails(page);
    fetchCompanyReviews();
  }, [companyId, page]);

  useEffect(() => {
    fetchReviewEligibility();
  }, [companyId, user]);

  // Real-time socket updates for public company profile active jobs
  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('job_closed', ({ jobId: closedId }: { jobId: string }) => {
        setCompany((prev) => {
          if (!prev) return prev;
          const filteredJobs = (prev.activeJobs || []).filter((j) => j._id !== closedId);
          return {
            ...prev,
            activeJobs: filteredJobs,
            activeJobsCount: Math.max(0, filteredJobs.length),
          };
        });
      });

      socketInstance.on('job_published', (publishedJob: any) => {
        const pubCompId = typeof publishedJob.companyId === 'object' ? publishedJob.companyId?._id : publishedJob.companyId;
        if (pubCompId === companyId) {
          setCompany((prev) => {
            if (!prev) return prev;
            const existing = prev.activeJobs || [];
            if (existing.some((j) => j._id === publishedJob._id)) return prev;
            const newJobs = [publishedJob, ...existing];
            return {
              ...prev,
              activeJobs: newJobs,
              activeJobsCount: newJobs.length,
            };
          });
        }
      });

      socketInstance.on('job_updated', (updatedJob: any) => {
        const upCompId = typeof updatedJob.companyId === 'object' ? updatedJob.companyId?._id : updatedJob.companyId;
        if (upCompId === companyId) {
          setCompany((prev) => {
            if (!prev) return prev;
            const existing = prev.activeJobs || [];
            if (updatedJob.status === 'closed' || updatedJob.postStatus === 'draft') {
              const filtered = existing.filter((j) => j._id !== updatedJob._id);
              return {
                ...prev,
                activeJobs: filtered,
                activeJobsCount: filtered.length,
              };
            }
            const updated = existing.map((j) => (j._id === updatedJob._id ? { ...j, ...updatedJob } : j));
            return {
              ...prev,
              activeJobs: updated,
            };
          });
        }
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('job_closed');
        socketInstance.off('job_published');
        socketInstance.off('job_updated');
      }
    };
  }, [companyId]);

  const handleOpenWriteModal = () => {
    setRatingInput(5);
    setTitleInput('');
    setReviewTextInput('');
    setRelationshipInput('Interviewed');
    setReviewError(null);
    setIsReviewModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (existingReview) {
      setRatingInput(existingReview.rating || 5);
      setTitleInput(existingReview.title || '');
      setReviewTextInput(existingReview.reviewText || '');
      setRelationshipInput(existingReview.relationship || 'Interviewed');
    }
    setReviewError(null);
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !reviewTextInput.trim()) {
      setReviewError('Please provide both a title and review text.');
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError(null);
      const response = await api.post(`/companies/${companyId}/reviews`, {
        rating: ratingInput,
        title: titleInput.trim(),
        reviewText: reviewTextInput.trim(),
        relationship: relationshipInput,
      });

      if (response.data?.success) {
        setIsReviewModalOpen(false);
        fetchCompanyReviews();
        fetchReviewEligibility();
      } else {
        setReviewError(response.data?.message || 'Failed to submit review.');
      }
    } catch (err: any) {
      setReviewError(err?.response?.data?.message || err.message || 'Error submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    try {
      setIsDeletingReview(true);
      const response = await api.delete(`/companies/${companyId}/reviews/me`);
      if (response.data?.success) {
        setIsDeleteConfirmOpen(false);
        setExistingReview(null);
        setAlreadyReviewed(false);
        fetchCompanyReviews();
        fetchReviewEligibility();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete review.');
    } finally {
      setIsDeletingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
          <Skeleton variant="rectangular" className="w-full h-48 rounded-2xl" />
          <Card className="p-8 space-y-4">
            <Skeleton variant="text" className="w-64 h-8" />
            <Skeleton variant="text" className="w-48 h-4" />
            <Skeleton variant="text" className="w-full h-24" />
          </Card>
        </main>
      </div>
    );
  }

  if (errorMsg || !company) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
        <Header />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <Card className="p-8 space-y-4">
            <AlertCircle className="w-10 h-10 text-zinc-400 mx-auto" />
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Company Not Found</h1>
            <p className="text-xs text-zinc-500">{errorMsg || 'The requested company profile does not exist.'}</p>
            <Link href="/jobs" className="inline-block pt-2">
              <Button variant="primary" size="sm" className="font-bold text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs Marketplace
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const activeJobs = company.activeJobs || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs Marketplace
          </Link>
        </div>

        {/* HERO COVER BANNER & OVERLAPPING LOGO (FULL WIDTH) */}
        <GSAPReveal direction="down" distance={16}>
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-card">
            {/* Banner Cover */}
            <div className="relative w-full h-48 md:h-64 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
              {company.bannerImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={company.bannerImageUrl}
                  alt={company.companyName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[radial-gradient(#383838_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
              )}
            </div>

            {/* Header Content with Overlapping Logo */}
            <div className="p-6 md:p-8 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-18 mb-4">
                {/* Logo Box */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-zinc-900 bg-white dark:bg-zinc-800 overflow-hidden flex items-center justify-center shadow-lg shrink-0">
                  {company.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={company.logoUrl}
                      alt={company.companyName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-zinc-400" />
                  )}
                </div>

                {/* Actions & Social Links Bar */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {canReview && !alreadyReviewed && (
                    <button
                      type="button"
                      onClick={handleOpenWriteModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-subtle"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Write a Review</span>
                    </button>
                  )}

                  {alreadyReviewed && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenEditModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-subtle"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Your Review</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors shadow-subtle"
                        title="Delete Your Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-subtle"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  )}

                  {activeJobs.length > 0 && (
                    <a
                      href="#open-positions"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-subtle"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{company.activeJobsCount || activeJobs.length} Open Jobs</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {company.companyName}
                  </h1>
                  {company.isVerified && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      title="Verified Employer Requisition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified Company
                    </span>
                  )}
                </div>

                {/* Info Chips */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  {reviewStats.totalReviews > 0 && (
                    <>
                      <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {reviewStats.averageRating} ({reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-400" /> {company.industry}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {company.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-400" /> {company.companySize} employees
                  </span>
                  {company.foundedYear && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Founded {company.foundedYear}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </GSAPReveal>

        {/* TWO COLUMN MAIN BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: MAIN CONTENT (~65-70% / lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* ABOUT COMPANY */}
            {company.description && (
              <GSAPReveal direction="up" distance={20}>
                <Card className="p-6 md:p-8 space-y-3">
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-500" /> About {company.companyName}
                  </h2>
                  <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {company.description}
                  </p>
                </Card>
              </GSAPReveal>
            )}

            {/* WHY JOIN US / CULTURE */}
            {company.cultureDescription && (
              <GSAPReveal direction="up" distance={20} delay={0.05}>
                <Card className="p-6 md:p-8 space-y-3 border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Why Join Us & Culture
                  </h2>
                  <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {company.cultureDescription}
                  </p>
                </Card>
              </GSAPReveal>
            )}

            {/* PERKS & BENEFITS */}
            {company.benefits && company.benefits.length > 0 && (
              <GSAPReveal direction="up" distance={20} delay={0.1}>
                <Card className="p-6 md:p-8 space-y-4">
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" /> Employee Perks & Benefits
                  </h2>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {company.benefits.map((benefit, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 shadow-subtle"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>{benefit}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              </GSAPReveal>
            )}

            {/* REVIEWS & RATINGS SECTION */}
            <GSAPReveal direction="up" distance={20} delay={0.12}>
              <Card className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Candidate & Employee Reviews
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Verified feedback from candidates who have interviewed or worked at {company.companyName}.
                    </p>
                  </div>

                  {canReview && !alreadyReviewed && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenWriteModal}
                      className="font-bold text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-none"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" /> Write a Review
                    </Button>
                  )}

                  {alreadyReviewed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEditModal}
                      className="font-bold text-xs gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-500" /> Edit Your Review
                    </Button>
                  )}
                </div>

                {/* PROMINENT USER'S OWN REVIEW CARD */}
                {existingReview && (
                  <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border-2 border-amber-400/80 dark:border-amber-600/80 space-y-3 shadow-subtle">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                              Your Submitted Review
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              Your Review
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-0.5">
                            <span>{existingReview.relationship || 'Interviewed'}</span>
                            {existingReview.createdAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(existingReview.createdAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenEditModal}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsDeleteConfirmOpen(true)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`w-4 h-4 ${
                            st <= existingReview.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-300 dark:text-zinc-700'
                          }`}
                        />
                      ))}
                    </div>

                    <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{existingReview.title}</h4>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {existingReview.reviewText}
                    </p>
                  </div>
                )}

                {/* Rating Overview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="sm:col-span-4 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 pb-4 sm:pb-0 sm:pr-4">
                    <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {reviewStats.averageRating || '0.0'}
                    </span>
                    <div className="flex items-center gap-1 my-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(reviewStats.averageRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-300 dark:text-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">
                      Based on {reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>

                  {/* Rating Breakdown Bars */}
                  <div className="sm:col-span-8 space-y-1.5 justify-center flex flex-col">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = reviewStats.ratingBreakdown?.[stars] || 0;
                      const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3 text-xs">
                          <span className="w-12 font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                            {stars} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-medium text-zinc-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review List */}
                {reviews.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <MessageSquare className="w-8 h-8 text-zinc-400 mx-auto" />
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">No Reviews Yet</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      {canReview
                        ? 'You qualify to be the first candidate to leave a review for this company!'
                        : 'No candidates or employees have left a review for this company yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div
                        key={rev._id}
                        className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
                              {rev.reviewerId?.fullName ? rev.reviewerId.fullName.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {rev.reviewerId?.fullName || 'Verified Applicant'}
                              </div>
                              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                <span>{rev.relationship || 'Interviewed'}</span>
                                <span>•</span>
                                <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((st) => (
                              <Star
                                key={st}
                                className={`w-3.5 h-3.5 ${
                                  st <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-300 dark:text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 pt-1">{rev.title}</h4>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {rev.reviewText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </GSAPReveal>
          </div>

          {/* RIGHT COLUMN: SIDEBAR (~30-35% / lg:col-span-4, STICKY) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* QUICK COMPANY INFO CARD */}
            <GSAPReveal direction="up" distance={20} delay={0.05}>
              <Card className="p-6 space-y-5">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-500" /> Company Overview
                </h3>

                {/* Specs List */}
                <div className="space-y-3.5 text-xs">
                  {company.website && (
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500 flex items-center gap-2 font-medium">
                        <Globe className="w-4 h-4 text-zinc-400" /> Website
                      </span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 max-w-[160px] truncate"
                      >
                        <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 flex items-center gap-2 font-medium">
                      <Briefcase className="w-4 h-4 text-zinc-400" /> Industry
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{company.industry}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 flex items-center gap-2 font-medium">
                      <Users className="w-4 h-4 text-zinc-400" /> Size
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{company.companySize} employees</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 flex items-center gap-2 font-medium">
                      <MapPin className="w-4 h-4 text-zinc-400" /> Headquarters
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{company.location}</span>
                  </div>

                  {company.foundedYear && (
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500 flex items-center gap-2 font-medium">
                        <Calendar className="w-4 h-4 text-zinc-400" /> Founded
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{company.foundedYear}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-zinc-500 flex items-center gap-2 font-medium">
                      <Zap className="w-4 h-4 text-emerald-500" /> Open Positions
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {company.activeJobsCount || activeJobs.length} Active
                    </span>
                  </div>
                </div>

                {/* Social Links Icons */}
                {company.socialLinks && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Connect on Social
                    </span>
                    <div className="flex items-center gap-2">
                      {company.socialLinks.linkedin && (
                        <a
                          href={company.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
                          title="LinkedIn"
                        >
                          <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </a>
                      )}
                      {company.socialLinks.facebook && (
                        <a
                          href={company.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
                          title="Facebook"
                        >
                          <Facebook className="w-4 h-4 text-blue-500" />
                        </a>
                      )}
                      {company.socialLinks.twitter && (
                        <a
                          href={company.socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
                          title="Twitter / X"
                        >
                          <Twitter className="w-4 h-4 text-sky-500" />
                        </a>
                      )}
                      {company.socialLinks.instagram && (
                        <a
                          href={company.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
                          title="Instagram"
                        >
                          <Instagram className="w-4 h-4 text-pink-500" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </GSAPReveal>

            {/* CONDENSED OPEN JOBS PREVIEW CARD */}
            <GSAPReveal direction="up" distance={20} delay={0.1}>
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-zinc-500" /> Open Positions
                  </h3>
                  <Badge variant="success" className="font-extrabold text-[10px]">
                    {activeJobs.length}
                  </Badge>
                </div>

                {activeJobs.length === 0 ? (
                  <div className="text-center py-4 space-y-1">
                    <p className="text-xs text-zinc-500 font-medium">No open positions currently available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeJobs.slice(0, 3).map((j) => (
                      <Link
                        key={j._id}
                        href={`/jobs/${j._id}`}
                        className="block p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 transition-colors space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {j.title}
                          </h4>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                          <span>{j.employmentType || 'Full-time'}</span>
                          <span>•</span>
                          <span>{j.location || company.location}</span>
                        </div>
                      </Link>
                    ))}

                    <a
                      href="#open-positions"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity mt-2"
                    >
                      <span>View All {activeJobs.length} Positions</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </Card>
            </GSAPReveal>
          </div>
        </div>

        {/* FULL-WIDTH BELOW BOTH COLUMNS: FULL OPEN POSITIONS */}
        <div id="open-positions" className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <GSAPReveal direction="up" distance={20} delay={0.15}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> All Open Positions ({activeJobs.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Explore active requisitions currently hiring at {company.companyName}.
                </p>
              </div>
            </div>
          </GSAPReveal>

          {activeJobs.length === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <Briefcase className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Open Positions Currently</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {company.companyName} doesn't have any active job requisitions at the moment. Check back soon!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}

              {!isLoading && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={(newPage) => setPage(newPage)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* WRITE / EDIT REVIEW MODAL */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={alreadyReviewed ? 'Edit Your Company Review' : 'Write a Company Review'}
        subtitle={`Share your candidate experience at ${company?.companyName}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          {reviewError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {reviewError}
            </div>
          )}

          {/* Overall Rating Selector */}
          <div className="space-y-1.5 text-center py-2">
            <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Overall Rating
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingInput(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || ratingInput)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {hoverRating || ratingInput} out of 5 stars
            </span>
          </div>

          {/* Relationship Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Your Relationship with {company?.companyName}
            </label>
            <SelectDropdown
              value={relationshipInput}
              onChange={setRelationshipInput}
              options={[
                { value: 'Interviewed', label: 'Candidate (Interviewed)' },
                { value: 'Current Employee', label: 'Current Employee' },
                { value: 'Former Employee', label: 'Former Employee' },
              ]}
              className="w-full"
            />
          </div>

          {/* Review Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Review Title / Headline
            </label>
            <Input
              type="text"
              placeholder="e.g. Transparent interview process & great culture!"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              required
            />
          </div>

          {/* Review Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Review Details
            </label>
            <Textarea
              rows={4}
              placeholder="Describe your interview experience, culture, leadership, or work environment..."
              value={reviewTextInput}
              onChange={(e) => setReviewTextInput(e.target.value)}
              required
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingReview}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold border-none"
            >
              {submittingReview
                ? 'Submitting...'
                : alreadyReviewed
                ? 'Update Review'
                : 'Submit Review'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE YOUR REVIEW CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Your Company Review?"
        subtitle="Are you sure you want to remove your review?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            This will permanently remove your submitted review and rating score for {company?.companyName}. If you remain eligible, you can submit a new review in the future.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeletingReview}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteReview}
              disabled={isDeletingReview}
              className="font-bold text-xs"
            >
              {isDeletingReview ? 'Deleting...' : 'Yes, Delete My Review'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Public / Logged Out Footer */}
      <Footer />
    </div>
  );
}
