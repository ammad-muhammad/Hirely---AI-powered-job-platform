'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { formatJobPostedDate } from '@/utils/formatters';
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Building2,
  AlertCircle,
  BarChart2,
  UserCheck,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface EmployerReviewItem {
  _id: string;
  companyId: string;
  reviewerLabel: string;
  rating: number;
  title: string;
  reviewText: string;
  relationship: string;
  isHiddenByEmployer?: boolean;
  createdAt: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
  publicAverageRating?: number;
  publicTotalReviews?: number;
}

export default function EmployerReviewsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string>('');
  const [reviews, setReviews] = useState<EmployerReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    publicAverageRating: 0,
    publicTotalReviews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Modal confirmation for permanent deletion
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingReviewId, setTogglingReviewId] = useState<string | null>(null);

  const fetchMyReviews = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/companies/me/reviews');
      if (res.data?.success) {
        setCompanyName(res.data.companyName || 'Your Company');
        setReviews(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load company reviews.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'employer')) {
      router.push('/dashboard');
      return;
    }

    if (user && user.role === 'employer') {
      fetchMyReviews();
    }
  }, [user, authLoading, router]);

  // Real-time socket listener for incoming company reviews
  useEffect(() => {
    if (!user || user.role !== 'employer') return;
    let socketInstance: any = null;

    const initSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance) return;

      socketInstance.on('new_company_review', () => {
        fetchMyReviews();
      });
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off('new_company_review');
      }
    };
  }, [user]);

  const handleToggleHide = async (review: EmployerReviewItem) => {
    try {
      setTogglingReviewId(review._id);
      const endpoint = review.isHiddenByEmployer
        ? `/companies/me/reviews/${review._id}/unhide`
        : `/companies/me/reviews/${review._id}/hide`;

      const response = await api.put(endpoint);
      if (response.data?.success) {
        setActionSuccessMsg(
          review.isHiddenByEmployer
            ? 'Review is now visible on your public company profile.'
            : 'Review has been hidden from your public company profile.'
        );
        fetchMyReviews();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update review visibility.');
    } finally {
      setTogglingReviewId(null);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReviewId) return;
    try {
      setIsDeleting(true);
      const response = await api.delete(`/companies/me/reviews/${deletingReviewId}`);
      if (response.data?.success) {
        setActionSuccessMsg('Review permanently deleted.');
        setDeletingReviewId(null);
        fetchMyReviews();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete review.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || (isLoading && reviews.length === 0 && !errorMsg)) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rectangular" className="w-full h-32 rounded-2xl" />
        <Skeleton variant="rectangular" className="w-full h-64 rounded-2xl" />
      </div>
    );
  }

  const hiddenCount = reviews.filter((r) => r.isHiddenByEmployer).length;

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <GSAPReveal direction="down" distance={16}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                Company Reviews
              </h1>
              {companyName && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {companyName}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage candidate feedback, toggle public profile visibility, and inspect overall ratings.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/company/setup">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" /> View Profile
              </Button>
            </Link>
          </div>
        </div>
      </GSAPReveal>

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-extrabold text-sm"
          >
            ×
          </button>
        </div>
      )}

      {errorMsg ? (
        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{errorMsg}</h2>
          <Link href="/dashboard/company/setup" className="inline-block">
            <Button variant="primary" size="sm" className="text-xs font-bold">
              Setup Company Profile First
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* RATING SUMMARY & DISTRIBUTION BARS */}
          <GSAPReveal direction="up" distance={20}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Rating Highlight Card */}
              <Card className="md:col-span-4 p-6 flex flex-col items-center justify-center text-center space-y-2 border-amber-200 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/40 to-transparent dark:from-amber-950/10">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Overall Rating
                </span>
                <span className="text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {stats.averageRating || '0.0'}
                </span>
                <div className="flex items-center gap-1 my-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(stats.averageRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-zinc-500 font-semibold">
                  Total {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'} ({hiddenCount} hidden)
                </span>

                {/* Public Rating Indicator */}
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    Public Avg: <strong className="text-amber-500">{stats.publicAverageRating || stats.averageRating}</strong> ({stats.publicTotalReviews ?? (stats.totalReviews - hiddenCount)} public)
                  </span>
                </div>
              </Card>

              {/* Rating Distribution Breakdown */}
              <Card className="md:col-span-8 p-6 space-y-3 justify-center flex flex-col">
                <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-zinc-500" /> Rating Breakdown (All Reviews)
                </h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = stats.ratingBreakdown?.[stars] || 0;
                    const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                          {stars} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-semibold text-zinc-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </GSAPReveal>

          {/* REVIEWS FEED LIST & MANAGEMENT CONTROLS */}
          <GSAPReveal direction="up" distance={20} delay={0.05}>
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-zinc-500" /> Candidate & Employee Reviews ({reviews.length})
                </h2>
              </div>

              {reviews.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No reviews yet</h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    No reviews yet — reviews appear here once candidates who've gone through your hiring process share feedback.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const isHidden = review.isHiddenByEmployer;
                    return (
                      <div
                        key={review._id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isHidden
                            ? 'bg-zinc-100/70 dark:bg-zinc-900/40 border-dashed border-zinc-300 dark:border-zinc-700/80 opacity-80'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-subtle'
                        } space-y-3`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {/* Reviewer Details & Badges */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0">
                              <UserCheck className="w-4 h-4 text-zinc-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                                  {review.reviewerLabel || 'Verified Applicant'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                                </span>
                                {isHidden ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                                    <EyeOff className="w-3 h-3 text-zinc-500" /> Hidden from Public Profile
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                    <Eye className="w-3 h-3 text-sky-600" /> Publicly Visible
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-0.5">
                                <span>{review.relationship || 'Interviewed'}</span>
                                <span>•</span>
                                <span>{formatJobPostedDate(review.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Star Rating */}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((st) => (
                              <Star
                                key={st}
                                className={`w-4 h-4 ${
                                  st <= review.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-zinc-300 dark:text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Title & Body Content */}
                        <div className="space-y-1 pt-1">
                          <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                            {review.title}
                          </h4>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {review.reviewText}
                          </p>
                        </div>

                        {/* Employer Review Management Action Bar */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={togglingReviewId === review._id}
                            onClick={() => handleToggleHide(review)}
                            className="text-xs font-bold gap-1.5"
                          >
                            {isHidden ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Unhide</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                <span>Hide from Public Profile</span>
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingReviewId(review._id)}
                            className="text-xs font-bold gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Permanently</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </GSAPReveal>
        </>
      )}

      {/* PERMANENT DELETION CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingReviewId}
        onClose={() => setDeletingReviewId(null)}
        title="Delete Review Permanently?"
        subtitle="This action is permanent and cannot be undone."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Are you sure you want to permanently delete this candidate review from your company record? This will permanently remove its rating score and feedback text.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingReviewId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteReview}
              disabled={isDeleting}
              className="font-bold text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
