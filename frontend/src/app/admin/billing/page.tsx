'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  CreditCard,
  Building2,
  Sparkles,
  RefreshCw,
  Zap,
  Star,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Briefcase,
} from 'lucide-react';
import gsap from 'gsap';

interface BillingCompany {
  _id: string;
  companyName: string;
  industry?: string;
  isVerified: boolean;
  subscriptionTier: 'free' | 'pro';
  subscriptionExpiresAt?: string | null;
  ownerId?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

interface BillingFeaturedJob {
  _id: string;
  title: string;
  status: string;
  isFeatured?: boolean;
  featuredUntil?: string | null;
  companyId?: {
    _id: string;
    companyName: string;
    isVerified: boolean;
  };
}

interface BillingData {
  summary: {
    proCompaniesCount: number;
    featuredJobsCount: number;
    totalSimulatedRevenue: number;
  };
  companies: BillingCompany[];
  featuredJobs: BillingFeaturedJob[];
}

import { Pagination } from '@/components/ui/Pagination';

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pagination state for companies list
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit Subscription Tier Modal
  const [selectedCompany, setSelectedCompany] = useState<BillingCompany | null>(null);
  const [targetTier, setTargetTier] = useState<'free' | 'pro'>('pro');

  // Feature Job Modal
  const [selectedJob, setSelectedJob] = useState<BillingFeaturedJob | null>(null);
  const [featureDays, setFeatureDays] = useState<number>(14);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchBillingStats = async (targetPage = 1) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/admin/billing?page=${targetPage}&limit=10`);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
        if (res.data.pagination) {
          setPage(res.data.pagination.currentPage || targetPage);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching admin billing stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingStats(page);
  }, [page]);

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

  const handleExecuteSubscriptionChange = async () => {
    if (!selectedCompany) return;
    try {
      setActionLoadingId(selectedCompany._id);
      await api.put('/admin/billing/subscription', {
        companyId: selectedCompany._id,
        subscriptionTier: targetTier,
      });
      setSelectedCompany(null);
      fetchBillingStats();
    } catch (err) {
      console.error('Error updating company subscription:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteFeatureJobToggle = async () => {
    if (!selectedJob) return;
    const nextIsFeatured = !selectedJob.isFeatured;
    try {
      setActionLoadingId(selectedJob._id);
      await api.put('/admin/billing/featured-job', {
        jobId: selectedJob._id,
        isFeatured: nextIsFeatured,
        days: featureDays,
      });
      setSelectedJob(null);
      fetchBillingStats();
    } catch (err) {
      console.error('Error toggling featured status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 font-sans">
        <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { summary, companies = [], featuredJobs = [] } = data || {
    summary: { proCompaniesCount: 0, featuredJobsCount: 0, totalSimulatedRevenue: 0 },
    companies: [],
    featuredJobs: [],
  };

  return (
    <div ref={containerRef} className="space-y-8 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#1f1f1f] text-white shadow-sm">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
              Billing, Subscriptions & Featured Listings
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Control platform billing tiers, manual subscription overrides, and featured job promotions
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchBillingStats(page)} className="text-xs font-semibold gap-1.5 self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
            Pro Subscriptions ($99/mo)
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
              {summary.proCompaniesCount} Companies
            </h3>
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-[11px] text-zinc-500">Active Pro Tier Memberships</p>
        </Card>

        <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
            Featured Job Ads ($29)
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.featuredJobsCount} Jobs
            </h3>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-[11px] text-zinc-500">Currently Promoted Listings</p>
        </Card>

        <Card className="p-5 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 text-white shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
            Total Revenue Potential
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-emerald-400">
              ${summary.totalSimulatedRevenue.toLocaleString()}
            </h3>
            <CreditCard className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[11px] text-zinc-400">Simulated monthly platform revenue</p>
        </Card>
      </div>

      {/* SECTION 1: EMPLOYER SUBSCRIPTIONS MANAGEMENT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Company Subscriptions ({companies.length})</span>
            </h2>
            <p className="text-xs text-zinc-500">View and manually adjust subscription tiers for any registered employer</p>
          </div>
        </div>

        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-[11px] font-extrabold uppercase text-zinc-400">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Owner Email</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Current Tier</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4 text-right">Tier Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {companies.map((c) => (
                  <tr key={c._id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {c.companyName}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                      {c.ownerId?.email || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={c.isVerified ? 'success' : 'default'} size="sm">
                        {c.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.subscriptionTier === 'pro' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          PRO TIER ($99/mo)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          FREE TIER
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">
                      {c.subscriptionExpiresAt ? new Date(c.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(c);
                          setTargetTier(c.subscriptionTier === 'pro' ? 'free' : 'pro');
                        }}
                        className="text-xs font-bold whitespace-nowrap shrink-0"
                      >
                        Change Tier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </Card>
      </div>

      {/* SECTION 2: FEATURED JOBS PROMOTIONS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Featured Job Listings ({featuredJobs.length})</span>
            </h2>
            <p className="text-xs text-zinc-500">Active promoted job postings rendered with priority badge across candidate search feeds</p>
          </div>
        </div>

        {featuredJobs.length === 0 ? (
          <Card className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <Zap className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Featured Jobs Active</p>
            <p className="text-[11px] text-zinc-400">Employers can feature jobs from their dashboard or admins can override in Job Management.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredJobs.map((j) => (
              <Card key={j._id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" /> FEATURED LISTING
                    </span>
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                      {j.title}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {j.companyId?.companyName || 'Company'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedJob(j);
                    }}
                    className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Unfeature
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <span>Featured Until: <strong>{j.featuredUntil ? new Date(j.featuredUntil).toLocaleDateString() : 'Indefinite'}</strong></span>
                  <Badge variant={j.status === 'active' ? 'success' : 'default'} size="sm" className="capitalize">
                    {j.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CHANGE SUBSCRIPTION TIER MODAL */}
      <Modal
        isOpen={Boolean(selectedCompany)}
        onClose={() => setSelectedCompany(null)}
        title="Override Company Subscription Tier"
        maxWidth="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <p className="text-zinc-600 dark:text-zinc-300">
            Manually update subscription tier for <strong className="text-zinc-900 dark:text-zinc-100">{selectedCompany?.companyName}</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTargetTier('free')}
              className={`p-4 rounded-xl border text-left space-y-1 transition-colors ${
                targetTier === 'free'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <strong className="block text-xs font-extrabold">FREE TIER</strong>
              <span className="text-[10px] opacity-80 block">Standard employer features</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetTier('pro')}
              className={`p-4 rounded-xl border text-left space-y-1 transition-colors ${
                targetTier === 'pro'
                  ? 'border-purple-600 bg-purple-950 text-purple-200 border-2'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <strong className="block text-xs font-extrabold text-purple-400">PRO TIER ($99/mo)</strong>
              <span className="text-[10px] opacity-80 block">Unlimited job postings & priority badge</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(null)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoadingId === selectedCompany?._id}
              onClick={handleExecuteSubscriptionChange}
              className="text-xs font-bold"
            >
              Save Subscription Override
            </Button>
          </div>
        </div>
      </Modal>

      {/* UNFEATURE JOB CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title="Unfeature Job Posting"
        maxWidth="sm"
      >
        <div className="space-y-4 font-sans text-xs">
          <p className="text-zinc-600 dark:text-zinc-300">
            Are you sure you want to remove featured status from <strong className="text-zinc-900 dark:text-zinc-100">{selectedJob?.title}</strong>?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={actionLoadingId === selectedJob?._id}
              onClick={handleExecuteFeatureJobToggle}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Confirm Unfeature
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
