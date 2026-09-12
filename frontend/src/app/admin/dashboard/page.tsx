'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  UserPlus,
  RefreshCw,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldAlert,
  Search,
  Clock,
  Globe,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  PieChart as PieChartIcon,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CinematicEntrance } from '@/components/animation/CinematicEntrance';

interface AdminOverviewStats {
  overview: {
    totalUsers: number;
    usersByRole: {
      jobSeekers: number;
      employers: number;
      admins: number;
    };
    companies: {
      total: number;
      verified: number;
      unverified: number;
      pending: number;
    };
    jobs: {
      active: number;
    };
    applications: {
      total: number;
    };
    recentSignupsLast7Days: number;
    billing: {
      proCompanies: number;
      featuredJobs: number;
      simulatedRevenue: number;
    };
  };
  charts: {
    timeSeriesSignups: Array<{ date: string; jobSeekers: number; employers: number }>;
    timeSeriesApplications: Array<{ date: string; count: number }>;
    categoryDistribution: Array<{ category: string; count: number }>;
    companyVerificationDistribution: Array<{ name: string; value: number }>;
    subscriptionDistribution: Array<{ tier: string; count: number }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'signup' | 'job' | 'application' | 'verification';
    title: string;
    detail: string;
    timestamp: string;
  }>;
}

const COLORS_PIE = ['#1f1f1f', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter Pill State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Activity' | 'Protection' | 'Update' | 'Resources'>('All');

  // AI Platform Health Summary State
  const [healthSummary, setHealthSummary] = useState<string | null>(null);
  const [healthGeneratedAt, setHealthGeneratedAt] = useState<string | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // Fraud Detection Summary Indicator State
  const [flaggedFraudCount, setFlaggedFraudCount] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchFraudCount = async () => {
    try {
      const res = await api.get('/admin/fraud-detection');
      if (res.data?.success && res.data?.data?.summary) {
        setFlaggedFraudCount(res.data.data.summary.totalFlagged || 0);
      }
    } catch (err) {
      console.error('Error fetching fraud count:', err);
    }
  };

  const fetchHealthSummary = async (refresh = false) => {
    setIsHealthLoading(true);
    try {
      const res = await api.get(`/admin/health-summary${refresh ? '?refresh=true' : ''}`);
      if (res.data?.success) {
        setHealthSummary(res.data.summary);
        setHealthGeneratedAt(res.data.generatedAt);
      }
    } catch (err) {
      console.error('Error fetching AI health summary:', err);
    } finally {
      setIsHealthLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching admin overview stats:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load platform analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHealthSummary();
    fetchFraudCount();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 font-sans bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen rounded-3xl border border-zinc-200/80">
        <div className="h-12 w-full bg-white dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
        <div className="h-72 w-full bg-white dark:bg-zinc-900 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (errorMsg || !stats) {
    return (
      <div className="p-8 font-sans bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen flex items-center justify-center rounded-3xl border border-zinc-200/80">
        <Card className="p-8 text-center space-y-4 max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-zinc-200/80">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-[#1f1f1f] dark:text-zinc-100">
            Failed to Load Analytics
          </h2>
          <p className="text-xs text-zinc-500">{errorMsg}</p>
          <Button onClick={fetchStats} className="bg-[#1f1f1f] hover:bg-black text-white rounded-full px-6 py-2 text-xs font-bold shadow-md">
            Retry Loading
          </Button>
        </Card>
      </div>
    );
  }

  const { overview, charts, recentActivity } = stats;

  const filteredActivity = recentActivity.filter((act) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = act.title?.toLowerCase().includes(q);
      const matchDetail = act.detail?.toLowerCase().includes(q);
      const matchType = act.type?.toLowerCase().includes(q);
      if (!matchTitle && !matchDetail && !matchType) return false;
    }

    if (activeTab === 'All') return true;
    if (activeTab === 'Activity') return act.type === 'signup' || act.type === 'application';
    if (activeTab === 'Protection') return act.type === 'verification';
    if (activeTab === 'Update') return act.type === 'job';
    if (activeTab === 'Resources') return act.type === 'signup' || act.type === 'job';
    return true;
  });

  return (
    <CinematicEntrance>
      <div ref={containerRef} className="space-y-8 font-sans bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen pb-12 min-w-0 max-w-full">
        
        {/* TOP UTILITY HEADER: FILTER PILLS + PRIMARY ACTION BUTTON */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 px-4 shadow-xs border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3 min-w-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
            {(['All', 'Activity', 'Protection', 'Update', 'Resources'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                    : 'bg-[#f4f4f4] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right Action Button & Security Pill */}
          <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end w-full md:w-auto">
            {flaggedFraudCount !== null && flaggedFraudCount > 0 && (
              <Link href="/admin/fraud-detection">
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center gap-1.5 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/80 transition-colors whitespace-nowrap">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  <span>{flaggedFraudCount} Flagged</span>
                </span>
              </Link>
            )}

            <Button
              onClick={fetchStats}
              className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl px-4 py-2 text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Control Panel</span>
            </Button>
          </div>
        </div>

        {/* HERO ANALYTICS CONTAINER */}
        <div className="bg-[#f6f7ed] dark:bg-zinc-900/90 rounded-3xl p-6 md:p-8 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6 relative overflow-hidden">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800 pb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
                Platform Overview & Performance Analytics
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                Live monitoring of platform throughput, registered accounts, active jobs, and verification metrics
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-200/80 dark:border-zinc-700 shadow-xs">
                <Clock className="w-4 h-4 text-zinc-500" />
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 font-bold block leading-none">Online Activity</span>
                  <span className="text-xs font-black text-[#1f1f1f] dark:text-zinc-100">124 Hours/mo</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-200/80 dark:border-zinc-700 shadow-xs">
                <Globe className="w-4 h-4 text-zinc-500" />
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 font-bold block leading-none">Visits Processed</span>
                  <span className="text-xs font-black text-[#1f1f1f] dark:text-zinc-100">315 Sessions</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 DYNAMIC REAL-TIME METRIC CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* CARD 1: TOTAL JOBSEEKERS */}
            <Link href="/admin/users?role=job_seeker">
              <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3 hover:border-zinc-400 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Total Jobseekers
                  </span>
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
                    {overview.usersByRole.jobSeekers}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-bold mt-1">Live candidate accounts</p>
                </div>
              </Card>
            </Link>

            {/* CARD 2: TOTAL EMPLOYERS */}
            <Link href="/admin/users?role=employer">
              <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3 hover:border-zinc-400 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Total Employers
                  </span>
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
                    {overview.usersByRole.employers}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-bold mt-1">Live employer accounts</p>
                </div>
              </Card>
            </Link>

            {/* CARD 3: TOTAL ACTIVE JOBS */}
            <Link href="/admin/jobs">
              <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-2xl space-y-3 hover:border-zinc-400 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Total Active Jobs
                  </span>
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
                    {overview.jobs.active}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-bold mt-1">Open job requisitions</p>
                </div>
              </Card>
            </Link>

            {/* CARD 4: ESTIMATED REVENUE (DEDICATED BLACK CARD WITH WHITE TEXT) */}
            <Link href="/admin/billing">
              <Card className="p-6 bg-[#1f1f1f] text-white border border-zinc-800 shadow-xl rounded-2xl space-y-3 hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Estimated Revenue
                  </span>
                  <div className="p-2.5 rounded-xl bg-zinc-800 text-white">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">
                    $0
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium mt-1">No active paid billing transactions</p>
                </div>
              </Card>
            </Link>
          </div>

          {/* SUBMISSIONS & ACTIVITY CHART ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
            {/* Left Block: Your Activity & Submissions Bar Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1f1f1f] dark:text-zinc-100">
                    Your Activity & Submissions
                  </h3>
                  <span className="text-[11px] text-zinc-400 font-medium">Daily registration and application submission activity</span>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#f4f4f4] dark:bg-zinc-800 text-[#1f1f1f] dark:text-zinc-200">
                  Activity Level
                </span>
              </div>

              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.timeSeriesApplications} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f1f1f',
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" name="Activity Level" fill="#1f1f1f" radius={[8, 8, 8, 8]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Block: Platform Protection & Verification Summary */}
            <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block mb-1">Protection Metrics</span>
                <h3 className="text-base font-extrabold text-[#1f1f1f] dark:text-zinc-100">Verification & Compliance</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Real-time status of company verifications</p>
              </div>

              <div className="space-y-3 my-auto">
                <div className="bg-[#f6f7ed] dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Verified Companies</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{overview.companies.verified} Verified</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#f6f7ed] dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Pending Verifications</span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">{overview.companies.pending} Queue</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#1f1f1f] text-white p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">System Protection</span>
                    <span className="text-sm font-black text-white">Security Operational</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-zinc-950 uppercase">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: 2 DISTRIBUTION CHARTS + RECENT ACTIVITY FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Block: Distribution Breakdown Charts */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1f1f1f] dark:text-zinc-100">
                    Jobs Category Breakdown
                  </h3>
                  <span className="text-xs text-zinc-500">Distribution of active jobs across industries</span>
                </div>
                <PieChartIcon className="w-4 h-4 text-zinc-400" />
              </div>

              <div className="h-56 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.categoryDistribution.length > 0 ? charts.categoryDistribution : [{ category: 'General', count: 1 }]}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {(charts.categoryDistribution.length > 0 ? charts.categoryDistribution : [{ category: 'General', count: 1 }]).map((_, idx) => (
                        <Cell key={idx} fill={COLORS_PIE[idx % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f1f1f',
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Block: Live Activity Feed List */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#1f1f1f] dark:text-zinc-100">
                  Live Activity Feed
                </h3>
                <span className="text-xs text-zinc-500">Real-time user actions & events</span>
              </div>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[260px] pr-1">
              {filteredActivity.length === 0 ? (
                <p className="text-xs text-zinc-400 italic p-4 text-center">
                  {searchQuery || activeTab !== 'All'
                    ? 'No activity matches your search/filter.'
                    : 'No recent platform activity logged.'}
                </p>
              ) : (
                filteredActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-[#f6f7ed] dark:bg-zinc-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs border border-zinc-200/50 dark:border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#1f1f1f] text-white flex items-center justify-center shrink-0">
                        {act.type === 'signup' ? (
                          <UserPlus className="w-4 h-4" />
                        ) : act.type === 'job' ? (
                          <Briefcase className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="font-extrabold text-[#1f1f1f] dark:text-zinc-100 block truncate">{act.title}</span>
                        <span className="text-[11px] text-zinc-500 truncate block">{act.detail}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-extrabold text-zinc-400 shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </CinematicEntrance>
  );
}
