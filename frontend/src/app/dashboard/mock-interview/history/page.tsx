'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Brain,
  History,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  ChevronRight,
  AlertTriangle,
  Award,
  X,
} from 'lucide-react';

import { Pagination } from '@/components/ui/Pagination';

interface HistoryItem {
  _id: string;
  targetField: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  questions: any[];
  feedback?: {
    overallScore: number;
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    communicationClarity: number;
    technicalAccuracy?: number | null;
    confidence: number;
    detailedFeedback: any[];
  };
}

export default function MockInterviewHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchHistory = async (targetPage = 1) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/mock-interviews/history?page=${targetPage}&limit=10`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setHistory(res.data.data);
        if (res.data.pagination) {
          setPage(res.data.pagination.currentPage || targetPage);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching mock interview history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      fetchHistory(page);
    }
  }, [user, page]);

  const openDetails = async (id: string) => {
    try {
      const res = await api.get(`/mock-interviews/${id}`);
      if (res.data?.success && res.data?.data) {
        setSelectedSession(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching interview details:', err);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 md:p-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Navigation Bar */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/mock-interview')} className="text-xs font-semibold">
              <ArrowLeft className="w-4 h-4 mr-1" /> Practice Workspace
            </Button>

            <Link href="/dashboard/mock-interview">
              <Button variant="primary" size="sm" className="text-xs font-bold px-4 py-2">
                + Start New Interview
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Past Mock Interview Sessions
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Review your past performance scores, strengths, and AI recommendations
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 border-zinc-200 dark:border-zinc-800 animate-pulse h-24 rounded-xl bg-white dark:bg-zinc-900" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <Card className="p-12 text-center space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-subtle max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">No Mock Interviews Completed Yet</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Complete your first AI mock interview to start building your practice history and feedback reports.
                </p>
              </div>
              <Link href="/dashboard/mock-interview">
                <Button variant="primary" size="sm" className="font-bold text-xs mt-2 px-5">
                  Start Your First Interview
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((session) => (
                <Card
                  key={session._id}
                  className="p-5 md:p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
                  onClick={() => openDetails(session._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        {session.feedback?.overallScore || 75}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{session.targetField}</h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'Completed'}
                        </span>
                        <span>•</span>
                        <span>6 Questions Answered</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="text-xs font-semibold self-end sm:self-center">
                    <span>View Evaluation</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
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

          {/* SESSION DETAILS MODAL */}
          {selectedSession && (
            <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-modal text-zinc-900 dark:text-zinc-100">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="success" size="sm" className="font-extrabold text-xs">
                      Score: {selectedSession.feedback?.overallScore || 75}/100
                    </Badge>
                    <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">{selectedSession.targetField}</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSession(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedSession.feedback && (
                  <div className="space-y-4 text-xs">
                    <p className="text-zinc-700 dark:text-zinc-300 italic bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                      "{selectedSession.feedback.summary}"
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Key Strengths</span>
                        <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
                          {selectedSession.feedback.strengths?.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <span className="font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Areas for Improvement</span>
                        <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
                          {selectedSession.feedback.areasForImprovement?.map((a, i) => (
                            <li key={i}>• {a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedSession(null)} className="text-xs font-semibold">
                    Close Details
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
