'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Check,
  Lock,
} from 'lucide-react';
import { BrandLogo } from '@/components/navigation/BrandLogo';

interface Question {
  questionId: string;
  questionText: string;
  options: string[];
}

interface AttemptData {
  attemptId: string;
  testId: string;
  title: string;
  category: string;
  skillName: string;
  timeLimitMinutes: number;
  passingScore?: number;
  endsAt: string;
  violationsCount: number;
  savedAnswers: { questionId: string; selectedOptionIndex: number }[];
  questions: Question[];
}

interface QuestionResult {
  questionId: string;
  questionText: string;
  options: string[];
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation: string;
}

interface ResultData {
  attemptId: string;
  testTitle: string;
  skillName: string;
  score: number;
  passed: boolean;
  bestScore?: number;
  isNewBestScore?: boolean;
  previousBestScore?: number;
  passingScore: number;
  violationsCount: number;
  status: string;
  feedbackMessage?: string;
  questionBreakdown: QuestionResult[];
}

export default function TakeSkillTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Flow states
  const [isStarted, setIsStarted] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [skipBlockedToast, setSkipBlockedToast] = useState<string | null>(null);

  // Proctoring states
  const [violationsCount, setViolationsCount] = useState(0);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreenExitModalOpen, setIsFullscreenExitModalOpen] = useState(false);

  // Timer state
  const QUESTION_TIME_LIMIT = 20; // 20 seconds per question
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(QUESTION_TIME_LIMIT);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  // Submit / Results states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);

  const violationLockRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch or initialize test attempt
  const loadAttempt = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await api.post(`/skill-tests/${testId}/start`);
      if (res.data?.success && res.data?.data) {
        const attData: AttemptData = res.data.data;
        setAttempt(attData);
        setViolationsCount(attData.violationsCount || 0);

        const ansMap: Record<string, number> = {};
        if (attData.savedAnswers) {
          attData.savedAnswers.forEach((a) => {
            ansMap[a.questionId] = a.selectedOptionIndex;
          });
        }
        setSelectedAnswers(ansMap);
      }
    } catch (err) {
      console.error('Failed to load attempt:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    if (user && user.role === 'job_seeker' && testId) {
      loadAttempt();
    }
  }, [user, testId, loadAttempt]);

  // Overall Live Timer Countdown Effect (Accurately computed from endsAt timestamp)
  useEffect(() => {
    if (!isStarted || !attempt?.endsAt || resultData) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const end = new Date(attempt.endsAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));

      setTimeLeftSeconds(diff);

      if (diff <= 0) {
        handleSubmitTest();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isStarted, attempt?.endsAt, resultData]);

  // Clear auto-advance timer and toast when question index changes
  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setSkipBlockedToast(null);
  }, [currentQIndex]);

  // 20-Second Per-Question Countdown Timer Effect
  useEffect(() => {
    if (!isStarted || resultData || isSubmitting) return;

    setQuestionTimeLeft(QUESTION_TIME_LIMIT);

    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, currentQIndex, resultData, isSubmitting]);

  // Handler to advance to next question with validation & locking
  const handleAdvanceNext = useCallback((forceAdvance = false) => {
    if (!attempt) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    const currentQ = attempt.questions[currentQIndex];
    const isAnswered = currentQ && selectedAnswers[currentQ.questionId] !== undefined;

    // Block if unanswered AND timer hasn't expired AND not forced by auto-advance
    if (!isAnswered && questionTimeLeft > 0 && !forceAdvance) {
      setSkipBlockedToast(
        'Please select an answer or wait for the timer to finish before moving to the next question.'
      );
      return;
    }

    setSkipBlockedToast(null);

    if (currentQIndex < attempt.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  }, [attempt, currentQIndex, selectedAnswers, questionTimeLeft]);

  // Auto-advance when 20s question timer hits zero
  useEffect(() => {
    if (!isStarted || resultData || isSubmitting) return;

    if (questionTimeLeft === 0) {
      if (attempt && currentQIndex < attempt.questions.length - 1) {
        handleAdvanceNext(true);
      } else if (attempt && currentQIndex === attempt.questions.length - 1) {
        handleSubmitTest();
      }
    }
  }, [questionTimeLeft, isStarted, resultData, isSubmitting, attempt, currentQIndex, handleAdvanceNext]);

  // Flag Violation Handler (Strict 2 violations policy)
  const reportViolation = useCallback(
    async (reason: string) => {
      if (!attempt || !isStarted || resultData || isSubmittingRef.current || violationLockRef.current) return;

      violationLockRef.current = true;
      try {
        const res = await api.post(`/skill-tests/attempts/${attempt.attemptId}/flag-violation`, { reason });
        if (res.data?.success) {
          const newCount = (violationsCount || 0) + 1;
          setViolationsCount(newCount);

          if (newCount >= 2) {
            setWarningMsg('DISQUALIFIED! 2 proctoring violations accumulated. Submitting test...');
            setTimeout(() => {
              handleSubmitTest();
            }, 1000);
          } else {
            setWarningMsg('Warning 1/2: Fullscreen exit or tab switch detected. Any further violation will end your test with a failing score.');
            setTimeout(() => setWarningMsg(null), 6000);
          }
        }
      } catch (err) {
        console.error('Violation reporting error:', err);
      } finally {
        setTimeout(() => {
          violationLockRef.current = false;
        }, 1500);
      }
    },
    [attempt, isStarted, resultData, violationsCount]
  );

  // Proctoring Event Listeners (Tab switch, Window blur & Fullscreen exit)
  useEffect(() => {
    if (!isStarted || resultData) return;

    const handleFullscreenChange = () => {
      if (isSubmittingRef.current || resultData) {
        setIsFullscreenExitModalOpen(false);
        return;
      }

      if (!document.fullscreenElement) {
        setIsFullscreenExitModalOpen(true);
        reportViolation('fullscreen_exit');
      } else {
        setIsFullscreenExitModalOpen(false);
      }
    };

    const handleVisibilityChange = () => {
      if (isSubmittingRef.current || resultData) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        reportViolation('tab_switch_hidden');
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittingRef.current || resultData) return;
      reportViolation('window_blur');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isStarted, resultData, reportViolation]);

  // Copy Protection Keyboard Shortcut Blocking
  useEffect(() => {
    if (!isStarted || resultData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (
        (ctrlOrCmd && ['c', 'x', 'a', 'p', 's', 'u'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        e.key === 'F11'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isStarted, resultData]);

  // Start Assessment & Enforce Fullscreen
  const handleBeginAssessment = async () => {
    setFullscreenError(null);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen request error:', err);
      setFullscreenError('Fullscreen permission is required to start this assessment. Please allow fullscreen in your browser settings to proceed.');
      return;
    }

    if (!document.fullscreenElement) {
      setFullscreenError('Fullscreen permission is required to start this assessment. Please allow fullscreen in your browser settings to proceed.');
      return;
    }

    setIsStarted(true);
  };

  // Re-enter Fullscreen Handler
  const handleReenterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error('Failed to re-enter fullscreen:', err);
    }
  };

  // Option selection handler (Saves answer without forcing auto-advance)
  const handleSelectOption = async (questionId: string, optionIdx: number) => {
    if (!attempt) return;

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setSkipBlockedToast(null);

    try {
      await api.post(`/skill-tests/attempts/${attempt.attemptId}/answer`, {
        questionId,
        selectedOptionIndex: optionIdx,
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  // Submit test handler
  const handleSubmitTest = async () => {
    if (!attempt || isSubmittingRef.current) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);
    setIsFullscreenExitModalOpen(false);

    try {
      const res = await api.post(`/skill-tests/attempts/${attempt.attemptId}/submit`);
      if (res.data?.success && res.data?.data) {
        setResultData(res.data.data);
      }

      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      console.error('Failed to submit test:', err);
      isSubmittingRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 text-zinc-900 dark:text-zinc-100">
          <div className="space-y-3 text-center">
            <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loading assessment environment...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!attempt) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
          <Card className="p-8 text-center space-y-4 max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-subtle">
            <HelpCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h2 className="text-base font-bold">Assessment Failed to Load</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Could not initialize skill test attempt session.</p>
            <Link href="/dashboard/skill-tests">
              <Button variant="primary" size="sm" className="font-bold text-xs">Return to Skill Tests</Button>
            </Link>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 3: RESULTS SCREEN
  // --------------------------------------------------------------------------
  if (resultData) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 md:p-8 font-sans">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-6 md:p-8 text-center space-y-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto">
                {resultData.passed ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                  Assessment Completed
                </span>
                <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
                  {resultData.testTitle}
                </h1>
              </div>

              <div className="flex items-center justify-center gap-8 py-2">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Your Score</span>
                  <span className={`text-3xl font-black ${resultData.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {resultData.score}%
                  </span>
                </div>

                <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800" />

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Passing Threshold</span>
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    {resultData.passingScore}%
                  </span>
                </div>
              </div>

              {resultData.passed ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold space-y-1.5">
                  <p className="flex items-center justify-center gap-2 text-xs md:text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                    <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Verified {resultData.skillName} Skill Badge Earned!</span>
                  </p>
                  {resultData.isNewBestScore && resultData.previousBestScore && resultData.previousBestScore > 0 ? (
                    <p className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 py-1.5 px-3 rounded-lg block">
                      🏆 New Personal Best! Your score of {resultData.score}% improved on your previous best ({resultData.previousBestScore}%).
                    </p>
                  ) : resultData.previousBestScore && resultData.previousBestScore > 0 && resultData.score <= resultData.previousBestScore ? (
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Great effort! Your best score for this skill remains {resultData.previousBestScore}% from a previous attempt.
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Your verified badge is now displayed on your candidate profile for employers.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs font-bold space-y-1.5">
                  <p className="text-xs md:text-sm font-extrabold text-red-800 dark:text-red-300">
                    {resultData.violationsCount >= 3 ? 'DISQUALIFIED (Anti-Cheating Violation)' : `Score: ${resultData.score}% (Passing score was ${resultData.passingScore}%)`}
                  </p>
                  {resultData.previousBestScore && resultData.previousBestScore > 0 ? (
                    <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                      Great effort! You didn't pass this attempt, but your best score for this skill remains {resultData.previousBestScore}% from a previous attempt.
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-red-700 dark:text-red-400">
                      {resultData.violationsCount >= 3
                        ? 'This assessment was terminated due to anti-cheating policy violations (fullscreen exit or tab-switching).'
                        : 'Review the question breakdown below and retake the assessment anytime to earn your verified badge.'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <Link href="/dashboard/skill-tests">
                  <Button variant="outline" size="sm" className="font-bold text-xs">
                    Back to Skill Tests
                  </Button>
                </Link>
                <Link href="/dashboard/profile">
                  <Button variant="primary" size="sm" className="font-bold text-xs">
                    <span>View Profile Badges</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>

            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-zinc-500" /> Question Breakdown & Explanations
              </h2>

              <div className="space-y-3">
                {resultData.questionBreakdown.map((q, idx) => (
                  <Card key={q.questionId} className="p-5 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                      <h3 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {idx + 1}. {q.questionText}
                      </h3>

                      <Badge variant={q.isCorrect ? 'success' : 'danger'} size="sm" className="uppercase font-extrabold shrink-0 text-[10px]">
                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isUserChoice = q.selectedOptionIndex === oIdx;
                        const isCorrectChoice = q.correctOptionIndex === oIdx;

                        let style = 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300';
                        if (isCorrectChoice) {
                          style = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold';
                        } else if (isUserChoice && !q.isCorrect) {
                          style = 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 font-bold line-through';
                        }

                        return (
                          <div key={oIdx} className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${style}`}>
                            <span>{opt}</span>
                            {isCorrectChoice && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold shrink-0">
                                ✓ Correct Answer
                              </span>
                            )}
                            {isUserChoice && !isCorrectChoice && (
                              <span className="text-[10px] text-red-700 dark:text-red-300 font-extrabold shrink-0">
                                ✗ Your Selection
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-xs leading-relaxed space-y-0.5">
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] block">
                          Explanation
                        </span>
                        <p className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 1: INSTRUCTIONS & RULES SCREEN
  // --------------------------------------------------------------------------
  if (!isStarted) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 md:p-8 flex items-center justify-center font-sans">
          <div className="max-w-lg w-full space-y-5">
            {fullscreenError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2 shadow-subtle">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{fullscreenError}</span>
              </div>
            )}

            <Card className="p-6 md:p-8 space-y-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">{attempt.title}</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  Category: {attempt.category} • {attempt.questions.length} Questions
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/40 space-y-1">
                  <span className="text-amber-700 dark:text-amber-400 block font-bold text-[10px] uppercase tracking-wider">Speed Proctoring</span>
                  <span className="font-black text-amber-900 dark:text-amber-200 text-sm md:text-base block">⚡ 20s / Question</span>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 space-y-1">
                  <span className="text-emerald-700 dark:text-emerald-400 block font-bold text-[10px] uppercase tracking-wider">Passing Criteria</span>
                  <span className="font-black text-emerald-900 dark:text-emerald-200 text-sm md:text-base block">🎯 {attempt.passingScore || 70}% Score</span>
                </div>
              </div>

              {/* Assessment Integrity & Timed Flow Rules */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-2">
                <h3 className="font-extrabold flex items-center gap-1.5 text-amber-900 dark:text-amber-200 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Timed Question & Forward-Only Flow Rules</span>
                </h3>
                <ul className="space-y-1.5 text-[11px] text-amber-800 dark:text-amber-300 list-disc list-inside leading-relaxed font-medium">
                  <li><strong>20 Seconds Per Question:</strong> You have 20 seconds for each question. The timer auto-advances when time expires.</li>
                  <li><strong>Locked Previous Questions:</strong> Once you move to the next question (by answering or timer expiry), previous questions become <strong>permanently locked</strong>. You cannot go back! Answer promptly.</li>
                  <li><strong>Manual Advancement Rule:</strong> You must select an answer to advance manually, or wait for the 20s timer to hit zero.</li>
                  <li><strong>Passing Threshold:</strong> Score at least <strong>{attempt.passingScore || 70}%</strong> to earn your Verified Candidate Badge.</li>
                  <li><strong>Proctoring Integrity:</strong> Browser Fullscreen mode is required. Switching tabs or exiting fullscreen triggers a warning (disqualified at 2 warnings).</li>
                </ul>
              </div>

              {/* Integrity Disclaimer Notice */}
              <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                  Proctoring Disclaimer:
                </span>
                <p>
                  Note: While we detect tab-switching and fullscreen exits, we cannot technically prevent OS-level screenshots. This test relies on your integrity — violations of fullscreen or tab rules will end your test immediately.
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/skill-tests')} className="text-xs font-semibold">
                  Cancel
                </Button>

                <Button variant="primary" size="md" onClick={handleBeginAssessment} className="font-bold text-xs px-5 py-2">
                  <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Begin Test & Enter Fullscreen</span>
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 2: ACTIVE TEST EXECUTION SCREEN (With Full Copy Protection & Fullscreen Lock)
  // --------------------------------------------------------------------------
  const currentQuestion = attempt.questions[currentQIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <ProtectedRoute>
      <main
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col select-none relative overflow-x-hidden"
      >
        {/* FULLSCREEN EXIT OVERLAY (Completely blocks question view when user exits fullscreen) */}
        {isFullscreenExitModalOpen && !resultData && !isSubmitting && (
          <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-100 font-sans">
            <div className="max-w-md space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">You Exited Fullscreen Mode</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your assessment has been paused. Exit from fullscreen is logged as a proctoring violation warning ({violationsCount}/2).
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleReenterFullscreen}
                className="w-full font-bold text-xs py-2.5"
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                <span>Re-enter Fullscreen & Resume Test</span>
              </Button>
            </div>
          </div>
        )}

        {/* COMPACT ASSESSMENT HEADER */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 py-3 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>
              <span className="hidden sm:inline text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-xs">
                {attempt.title}
              </span>
            </div>

            {/* Proctoring & Timer Status Pills */}
            <div className="flex items-center gap-3 text-xs">
              <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[11px] font-semibold ${
                violationsCount > 0
                  ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${violationsCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{violationsCount > 0 ? `${violationsCount}/2 Warnings` : 'Proctoring Active'}</span>
              </div>

              {/* 20-Second Per-Question Live Timer Countdown */}
              <div className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-mono text-xs font-extrabold shadow-subtle transition-all ${
                questionTimeLeft <= 5
                  ? 'bg-red-600 text-white animate-pulse border border-red-400'
                  : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{questionTimeLeft}s (Question {currentQIndex + 1})</span>
              </div>
            </div>
          </div>
        </header>

        {/* PROCTORING WARNING TOAST BANNER */}
        {warningMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{warningMsg}</span>
          </div>
        )}

        {/* MAIN FOCUSED QUESTION WORKSPACE */}
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 md:py-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Progress Header & Question Navigator Pills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                <span>Question {currentQIndex + 1} of {attempt.questions.length}</span>
                <span>{answeredCount} of {attempt.questions.length} Answered</span>
              </div>

              {/* Overall Assessment Progress Bar */}
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                  style={{ width: `${((currentQIndex + 1) / attempt.questions.length) * 100}%` }}
                />
              </div>

              {/* 20-Second Question Timer Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>Question Time Limit (Auto-advance)</span>
                  </span>
                  <span className={questionTimeLeft <= 5 ? 'text-red-600 dark:text-red-400 font-black animate-pulse' : 'text-amber-600 dark:text-amber-400 font-extrabold'}>
                    {questionTimeLeft}s remaining
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 linear ${
                      questionTimeLeft <= 5 ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${(questionTimeLeft / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Navigator Quick Status Pills (Past questions strictly locked) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {attempt.questions.map((q, idx) => {
                  const isCurrent = currentQIndex === idx;
                  const isPassed = idx < currentQIndex;
                  const isAnswered = selectedAnswers[q.questionId] !== undefined;

                  let style = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-50';
                  if (isCurrent) {
                    style = 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold border-zinc-900 dark:border-zinc-100 shadow-subtle';
                  } else if (isPassed) {
                    style = 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700/60 cursor-not-allowed opacity-60';
                  }

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      disabled={true}
                      className={`w-7 h-7 rounded-md border text-[11px] flex items-center justify-center shrink-0 transition-all ${style}`}
                      title={isCurrent ? 'Current Question' : isPassed ? (isAnswered ? 'Answered (Locked)' : 'Skipped (Locked)') : 'Upcoming Question'}
                    >
                      {isPassed ? (
                        isAnswered ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Lock className="w-3 h-3 text-zinc-400" />
                        )
                      ) : (
                        idx + 1
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UNANSWERED SKIP BLOCKED TOAST BANNER */}
            {skipBlockedToast && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-3 shadow-subtle animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{skipBlockedToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSkipBlockedToast(null)}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Question Text & Options Card */}
            {!currentQuestion ? (
              <Card className="p-8 text-center space-y-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Submitting your assessment & calculating final score...</p>
              </Card>
            ) : (
              <>
                <Card className="p-6 md:p-8 space-y-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle select-none">
                  <h1 className="text-base md:text-xl font-bold leading-relaxed text-zinc-900 dark:text-zinc-100 select-none">
                    {currentQuestion.questionText}
                  </h1>

                  {/* Answer Options List */}
                  <div className="space-y-3 pt-1 select-none">
                    {currentQuestion.options.map((optionText, optIdx) => {
                      const isSelected = selectedAnswers[currentQuestion.questionId] === optIdx;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentQuestion.questionId, optIdx)}
                          className={`w-full p-4 rounded-lg border text-left text-xs md:text-sm font-medium transition-all flex items-center justify-between gap-3 select-none ${
                            isSelected
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold shadow-subtle'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                              isSelected
                                ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border-transparent'
                                : 'border-zinc-300 dark:border-zinc-700 text-zinc-400'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{optionText}</span>
                          </div>

                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Footer Navigation Buttons */}
                <footer className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    {selectedAnswers[currentQuestion.questionId] !== undefined ? (
                      <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answer Selected
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Select answer or wait 20s
                      </span>
                    )}
                  </div>

                  {currentQIndex < attempt.questions.length - 1 ? (
                    <Button
                      variant={selectedAnswers[currentQuestion.questionId] !== undefined ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleAdvanceNext(false)}
                      className={`text-xs font-bold transition-all ${
                        selectedAnswers[currentQuestion.questionId] !== undefined
                          ? 'shadow-subtle'
                          : 'opacity-80'
                      }`}
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowSubmitConfirm(true)}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                    >
                      <span>Finish & Submit Test</span>
                      <Check className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </footer>
              </>
            )}
          </div>
        </div>

        {/* SUBMIT CONFIRMATION MODAL */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="p-6 space-y-4 max-w-sm w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-modal">
              <div className="space-y-1">
                <h3 className="text-base font-bold">Submit Assessment?</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You have answered <span className="font-bold text-zinc-900 dark:text-zinc-100">{answeredCount}</span> of <span className="font-bold text-zinc-900 dark:text-zinc-100">{attempt.questions.length}</span> questions.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowSubmitConfirm(false)} className="text-xs font-semibold">
                  Continue Test
                </Button>
                <Button variant="primary" size="sm" isLoading={isSubmitting} onClick={handleSubmitTest} className="text-xs font-bold">
                  Confirm & Submit
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
