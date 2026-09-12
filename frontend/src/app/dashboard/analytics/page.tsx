'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  BarChart2,
  TrendingUp,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    shortlistedCount: number;
    hiredCount: number;
    avgTimeToHireDays: number;
  };
  statusBreakdown: {
    applied: number;
    under_review: number;
    shortlisted: number;
    interview: number;
    rejected: number;
    hired: number;
  };
  applicationsOverTime: Array<{ date: string; count: number }>;
  applicationsByJob: Array<{
    id: string;
    title: string;
    status: string;
    postStatus: string;
    count: number;
  }>;
}

const STATUS_COLORS = {
  applied: '#71717a',
  under_review: '#f59e0b',
  shortlisted: '#3b82f6',
  interview: '#8b5cf6',
  hired: '#10b981',
  rejected: '#ef4444',
};

export default function EmployerAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/analytics/employer-overview');
      if (res.data?.success && res.data?.data) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load employer analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'employer') {
      fetchAnalytics();
    }
  }, [user, fetchAnalytics]);

  if (user?.role !== 'employer') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-xs font-semibold text-zinc-500">
          Employer access required.
        </div>
      </ProtectedRoute>
    );
  }

  const funnelData = analytics
    ? [
        { name: 'Applied', count: analytics.statusBreakdown.applied, color: STATUS_COLORS.applied },
        { name: 'Under Review', count: analytics.statusBreakdown.under_review, color: STATUS_COLORS.under_review },
        { name: 'Shortlisted', count: analytics.statusBreakdown.shortlisted, color: STATUS_COLORS.shortlisted },
        { name: 'Interview', count: analytics.statusBreakdown.interview, color: STATUS_COLORS.interview },
        { name: 'Hired', count: analytics.statusBreakdown.hired, color: STATUS_COLORS.hired },
        { name: 'Rejected', count: analytics.statusBreakdown.rejected, color: STATUS_COLORS.rejected },
      ]
    : [];

  return (
    <div className="space-y-8">
          {/* PAGE HEADER */}
          <GSAPReveal direction="down" distance={16}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BarChart2 className="w-6 h-6 text-zinc-500" />
                  <span>Recruitment & Hiring Analytics</span>
                  <Badge variant="success" size="sm" className="font-extrabold text-[10px] uppercase">
                    Live Telemetry
                  </Badge>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Real-time talent acquisition performance, application volume trends, and funnel conversions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/candidates')}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> View Candidates
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/dashboard/jobs/post')}
                  className="text-xs font-bold gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Create Job Opening
                </Button>
              </div>
            </div>
          </GSAPReveal>

          {/* TOP METRIC CARDS (4-GRID) */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5 space-y-2">
                  <Skeleton variant="text" className="w-24 h-3" />
                  <Skeleton variant="text" className="w-16 h-8" />
                </Card>
              ))}
            </div>
          ) : (
            <GSAPReveal direction="up" distance={16} delay={0.05}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Applications */}
                <Card className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Total Applications
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {analytics?.summary.totalApplications || 0}
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    Cumulative candidate submissions across all listings
                  </span>
                </Card>

                {/* 2. Active Job Requisitions */}
                <Card className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Active Job Requisitions
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {analytics?.summary.activeJobs || 0}
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    Out of {analytics?.summary.totalJobs || 0} total created jobs
                  </span>
                </Card>

                {/* 3. Shortlisted & Interviewing */}
                <Card className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Shortlisted / Hired
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {(analytics?.summary.shortlistedCount || 0) + (analytics?.summary.hiredCount || 0)}
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    High-intent qualified candidate conversions
                  </span>
                </Card>

                {/* 4. Avg Time to Hire */}
                <Card className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Avg Time-to-Hire
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {analytics?.summary.avgTimeToHireDays || 3.5} <span className="text-xs font-medium text-zinc-400">days</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    Average candidate review and offer speed
                  </span>
                </Card>
              </div>
            </GSAPReveal>
          )}

          {/* CHARTS SECTION: 2-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CHART 1: APPLICATIONS OVER TIME */}
            <GSAPReveal direction="up" distance={20} delay={0.1}>
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Application Volume Trend
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Daily candidate submissions over the past 30 days.
                    </p>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px]">
                    30-Day Window
                  </Badge>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.applicationsOverTime || []}>
                      <defs>
                        <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#18181b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#18181b"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#appGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </GSAPReveal>

            {/* CHART 2: RECRUITMENT FUNNEL STATUS BREAKDOWN */}
            <GSAPReveal direction="up" distance={20} delay={0.15}>
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-500" /> Candidate Funnel Breakdown
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Application counts categorized by stage in hiring pipeline.
                    </p>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px]">
                    Status Metrics
                  </Badge>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </GSAPReveal>
          </div>

          {/* TOP JOBS INTEREST TABLE */}
          <GSAPReveal direction="up" distance={20} delay={0.2}>
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-500" /> Top Job Requisitions by Applicant Interest
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Which of your posted positions are generating the highest candidate volume.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/jobs')}
                  className="text-xs font-semibold"
                >
                  Manage All Jobs
                </Button>
              </div>

              {!analytics || analytics.applicationsByJob.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 italic">
                  No applicant interest data recorded yet for active jobs.
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.applicationsByJob.map((job, idx) => {
                    const maxCount = analytics.applicationsByJob[0]?.count || 1;
                    const percent = Math.round((job.count / maxCount) * 100);

                    return (
                      <div
                        key={job.id}
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                              {job.title}
                            </span>
                            <Badge variant={job.status === 'active' ? 'success' : 'outline'} size="sm" className="capitalize text-[10px]">
                              {job.status}
                            </Badge>
                          </div>

                          {/* Progress bar line */}
                          <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden max-w-md">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
                            {job.count} <span className="text-xs font-normal text-zinc-500">applicants</span>
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/jobs/${job.id}/applicants`)}
                            className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 gap-1"
                          >
                            <span>Applicants</span> <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </GSAPReveal>
        </div>
  );
}
