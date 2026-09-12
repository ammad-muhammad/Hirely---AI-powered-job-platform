'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Users,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Eye,
  XCircle,
  Flag,
  Globe,
  Clock,
  Mail,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import gsap from 'gsap';

interface FlaggedAccount {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

interface DuplicateIpSignal {
  id: string;
  ipAddress: string;
  accountCount: number;
  accounts: FlaggedAccount[];
  severity: 'low' | 'medium' | 'high';
}

interface SuspiciousJobSignal {
  id: string;
  jobId: string;
  title: string;
  companyName: string;
  companyId?: string;
  matchedPhrases: string[];
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface SpamEmployerSignal {
  id: string;
  companyId: string;
  companyName: string;
  ownerName?: string;
  ownerEmail?: string;
  jobsPosted: number;
  applicationsReceived: number;
  hires: number;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface FraudDetectionReportData {
  duplicateIpSignals: DuplicateIpSignal[];
  suspiciousJobs: SuspiciousJobSignal[];
  spamEmployers: SpamEmployerSignal[];
  summary: {
    totalFlagged: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
  };
}

export default function AdminFraudDetectionPage() {
  const router = useRouter();
  const [report, setReport] = useState<FraudDetectionReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'ip' | 'jobs' | 'employers'>('all');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/fraud-detection');
      if (res.data?.success && res.data?.data) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching fraud detection report:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // GSAP Entrance Animation
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

  const handleDismiss = async (
    type: 'duplicate_ip' | 'suspicious_job' | 'spam_employer',
    entityId: string
  ) => {
    try {
      setDismissingId(`${type}_${entityId}`);
      const res = await api.put('/admin/fraud-detection/dismiss', { type, entityId });
      if (res.data?.success) {
        // Remove locally from state
        setReport((prev) => {
          if (!prev) return null;
          let newIp = prev.duplicateIpSignals;
          let newJobs = prev.suspiciousJobs;
          let newEmployers = prev.spamEmployers;

          if (type === 'duplicate_ip') {
            newIp = newIp.filter((item) => item.ipAddress !== entityId);
          } else if (type === 'suspicious_job') {
            newJobs = newJobs.filter((item) => item.jobId !== entityId);
          } else if (type === 'spam_employer') {
            newEmployers = newEmployers.filter((item) => item.companyId !== entityId);
          }

          const allItems = [...newIp, ...newJobs, ...newEmployers];
          return {
            duplicateIpSignals: newIp,
            suspiciousJobs: newJobs,
            spamEmployers: newEmployers,
            summary: {
              totalFlagged: allItems.length,
              highSeverityCount: allItems.filter((i) => i.severity === 'high').length,
              mediumSeverityCount: allItems.filter((i) => i.severity === 'medium').length,
              lowSeverityCount: allItems.filter((i) => i.severity === 'low').length,
            },
          };
        });
      }
    } catch (err) {
      console.error('Error dismissing fraud flag:', err);
    } finally {
      setDismissingId(null);
    }
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    if (severity === 'high') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          High Severity
        </span>
      );
    }
    if (severity === 'medium') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Medium Severity
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Low Severity
      </span>
    );
  };

  const summary = report?.summary || { totalFlagged: 0, highSeverityCount: 0, mediumSeverityCount: 0, lowSeverityCount: 0 };
  const duplicateIpCount = report?.duplicateIpSignals.length || 0;
  const suspiciousJobsCount = report?.suspiciousJobs.length || 0;
  const spamEmployersCount = report?.spamEmployers.length || 0;

  return (
    <div ref={containerRef} className="p-6 md:p-8 space-y-8 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600 text-white dark:bg-red-500 shadow-subtle">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Suspicious Activity & Fraud Signals
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Surfaces potential risk signals for human review. Enforcement actions remain 100% manual.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchReport}
          isLoading={isLoading}
          className="text-xs font-bold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analysis</span>
        </Button>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
            Total Flagged Signals
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {summary.totalFlagged}
            </span>
            <span className="text-xs font-bold text-zinc-500">Items Pending Review</span>
          </div>
        </Card>

        <Card className="p-5 bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider block">
            High Severity Signals
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-700 dark:text-red-300">
              {summary.highSeverityCount}
            </span>
            <span className="text-xs font-bold text-red-600 dark:text-red-400">Action Suggested</span>
          </div>
        </Card>

        <Card className="p-5 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
            Medium Severity Signals
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-orange-700 dark:text-orange-300">
              {summary.mediumSeverityCount}
            </span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Review Required</span>
          </div>
        </Card>

        <Card className="p-5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 shadow-subtle space-y-2">
          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Low Severity Signals
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {summary.lowSeverityCount}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Routine Check</span>
          </div>
        </Card>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          All Signals ({summary.totalFlagged})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ip')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'ip'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Duplicate IP Accounts ({duplicateIpCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'jobs'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Suspicious Job Listings ({suspiciousJobsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('employers')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'employers'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Spam Employers ({spamEmployersCount})</span>
        </button>
      </div>

      {/* EMPTY STATE */}
      {!isLoading && summary.totalFlagged === 0 && (
        <Card className="p-12 text-center space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
              No Suspicious Activity Detected
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto font-medium">
              Platform status looks healthy. No duplicate registration IP spikes, scam job phrases, or zero-hire spam employer patterns currently flagged.
            </p>
          </div>
        </Card>
      )}

      {/* MAIN SECTIONS CONTAINER */}
      {!isLoading && summary.totalFlagged > 0 && (
        <div className="space-y-8">
          {/* SECTION 1: DUPLICATE IP ACCOUNTS */}
          {(activeTab === 'all' || activeTab === 'ip') && duplicateIpCount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Duplicate Registration IP Signals ({duplicateIpCount})</span>
                </h2>
                <span className="text-xs text-zinc-500 font-medium">Multiple user accounts created from identical IP address</span>
              </div>

              <div className="space-y-4">
                {report?.duplicateIpSignals.map((item) => (
                  <Card
                    key={item.id}
                    className="p-5 bg-rose-50/20 dark:bg-rose-950/20 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-rose-500 shadow-subtle space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                              IP Address: {item.ipAddress}
                            </span>
                            {getSeverityBadge(item.severity)}
                            <Badge variant="danger" size="sm" className="font-extrabold text-[10px] uppercase">
                              Unreviewed Flag
                            </Badge>
                          </div>
                          <span className="text-xs text-zinc-500 font-medium block">
                            {item.accountCount} registered user accounts associated with this address
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/users?search=${encodeURIComponent(item.ipAddress)}`)}
                          className="text-xs font-bold gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Inspect Accounts</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismiss('duplicate_ip', item.ipAddress)}
                          isLoading={dismissingId === `duplicate_ip_${item.ipAddress}`}
                          className="text-xs font-bold gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Dismiss</span>
                        </Button>
                      </div>
                    </div>

                    {/* Accounts Table List */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-950/60 text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                            <th className="py-2.5 px-3">User Name</th>
                            <th className="py-2.5 px-3">Email Address</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Registered At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                          {item.accounts.map((acc) => (
                            <tr key={acc.userId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                              <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                                <Link
                                  href={`/admin/users/${acc.userId}?fraudContext=true&signalType=Duplicate+IP+Registration+Cluster`}
                                  className="hover:underline text-indigo-600 dark:text-indigo-400 font-extrabold inline-flex items-center gap-1"
                                >
                                  <span>{acc.fullName}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">{acc.email}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {acc.role.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-400">
                                {new Date(acc.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: SUSPICIOUS JOB LISTINGS */}
          {(activeTab === 'all' || activeTab === 'jobs') && suspiciousJobsCount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Suspicious Job Listing Signals ({suspiciousJobsCount})</span>
                </h2>
                <span className="text-xs text-zinc-500 font-medium">Active postings containing scam-indicator red-flag phrases</span>
              </div>

              <div className="space-y-4">
                {report?.suspiciousJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="p-5 bg-rose-50/20 dark:bg-rose-950/20 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-rose-500 shadow-subtle space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                            {job.title}
                          </h3>
                          {getSeverityBadge(job.severity)}
                          <Badge variant="danger" size="sm" className="font-extrabold text-[10px] uppercase">
                            Unreviewed Flag
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                          <span>Company: <strong className="text-zinc-900 dark:text-zinc-100">{job.companyName}</strong></span>
                          <span>•</span>
                          <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/jobs?search=${encodeURIComponent(job.title)}`)}
                          className="text-xs font-bold gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Inspect Job</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismiss('suspicious_job', job.jobId)}
                          isLoading={dismissingId === `suspicious_job_${job.jobId}`}
                          className="text-xs font-bold gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Dismiss</span>
                        </Button>
                      </div>
                    </div>

                    {/* Red Flag Keywords List */}
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 space-y-1.5 text-xs">
                      <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                        Scam Indicator Keywords Matched:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {job.matchedPhrases.map((phrase, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>"{phrase}"</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: SPAM EMPLOYER PATTERNS */}
          {(activeTab === 'all' || activeTab === 'employers') && spamEmployersCount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>Spam Employer Pattern Signals ({spamEmployersCount})</span>
                </h2>
                <span className="text-xs text-zinc-500 font-medium">Employers with multiple job requisitions created and zero hired candidates</span>
              </div>

              <div className="space-y-4">
                {report?.spamEmployers.map((emp) => (
                  <Card
                    key={emp.id}
                    className="p-5 bg-rose-50/20 dark:bg-rose-950/20 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-rose-500 shadow-subtle space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                            {emp.companyName}
                          </h3>
                          {getSeverityBadge(emp.severity)}
                          <Badge variant="danger" size="sm" className="font-extrabold text-[10px] uppercase">
                            Unreviewed Flag
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
                          <span>Owner: <strong className="text-zinc-900 dark:text-zinc-100">{emp.ownerName}</strong> ({emp.ownerEmail})</span>
                          <span>•</span>
                          <span>Registered: {new Date(emp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/verifications`)}
                          className="text-xs font-bold gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Inspect Company</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismiss('spam_employer', emp.companyId)}
                          isLoading={dismissingId === `spam_employer_${emp.companyId}`}
                          className="text-xs font-bold gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Dismiss</span>
                        </Button>
                      </div>
                    </div>

                    {/* Stats Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Total Jobs Posted</span>
                        <strong className="text-base text-zinc-900 dark:text-zinc-100 font-black">
                          {emp.jobsPosted} requisitions
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Applications Received</span>
                        <strong className="text-base text-zinc-900 dark:text-zinc-100 font-black">
                          {emp.applicationsReceived} candidates
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block uppercase">Successful Hires</span>
                        <strong className="text-base text-red-700 dark:text-red-300 font-black">
                          0 hires made
                        </strong>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
