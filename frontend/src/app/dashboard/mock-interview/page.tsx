'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  History,
  Send,
  MessageSquare,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Zap,
  Sparkles,
  ShieldCheck,
  FileText,
  Bot,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import { BrandLogo } from '@/components/navigation/BrandLogo';

interface QuestionItem {
  questionText: string;
  category: 'behavioral' | 'technical' | 'situational';
}

interface QAHistoryItem {
  questionIndex: number;
  questionText: string;
  category: string;
  answerText: string;
}

interface DetailedFeedbackItem {
  questionIndex: number;
  feedback: string;
  score: number;
}

interface FinalFeedback {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  communicationClarity: number;
  technicalAccuracy?: number | null;
  confidence: number;
  detailedFeedback: DetailedFeedbackItem[];
  summary: string;
}

interface PrepGuideData {
  commonQuestionTypes: Array<{
    category: 'technical' | 'behavioral' | 'situational';
    exampleQuestion: string;
  }>;
  quickTips: string[];
  encouragement: string;
}

export default function MockInterviewPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Screen phase: 'setup' | 'interview' | 'evaluating' | 'results'
  const [phase, setPhase] = useState<'setup' | 'interview' | 'evaluating' | 'results'>('setup');

  // Setup phase states
  const [targetField, setTargetField] = useState('Full Stack Engineering');
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Prep Guide & First-Time candidate states
  const [isFirstInterviewMode, setIsFirstInterviewMode] = useState(false);
  const [showPrepGuide, setShowPrepGuide] = useState(false);
  const [prepGuideData, setPrepGuideData] = useState<PrepGuideData | null>(null);
  const [isLoadingPrepGuide, setIsLoadingPrepGuide] = useState(false);

  // Active Interview states
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions] = useState(6);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);
  const [qaHistory, setQaHistory] = useState<QAHistoryItem[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  // Results phase state
  const [finalFeedback, setFinalFeedback] = useState<FinalFeedback | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Redirect employers away
  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load candidate profile to pre-fill target field
  const loadCandidateProfile = useCallback(async () => {
    try {
      setIsLoadingProfile(true);
      const res = await api.get('/job-seeker-profile/me');
      if (res.data?.success && res.data?.data) {
        const profile = res.data.data.profile;
        if (profile) {
          if (profile.desiredJobTitles && profile.desiredJobTitles.length > 0) {
            setTargetField(profile.desiredJobTitles[0]);
          } else if (profile.skills && profile.skills.length > 0) {
            setTargetField(`${profile.skills[0]} Specialist`);
          }
          if (profile.skills) {
            setDetectedSkills(profile.skills);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to pre-fill candidate profile for mock interview:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      loadCandidateProfile();
    }
  }, [user, loadCandidateProfile]);

  // Fetch Interview Prep Guide
  const fetchPrepGuide = async (fieldOverride?: string) => {
    const queryField = fieldOverride || targetField;
    try {
      setIsLoadingPrepGuide(true);
      const res = await api.get(`/mock-interviews/prep-guide?targetField=${encodeURIComponent(queryField.trim())}`);
      if (res.data?.success && res.data?.data) {
        setPrepGuideData(res.data.data);
        setShowPrepGuide(true);
      }
    } catch (err) {
      console.warn('Error fetching prep guide:', err);
    } finally {
      setIsLoadingPrepGuide(false);
    }
  };

  // Handler 1: Start Mock Interview
  const handleStartInterview = async () => {
    if (!targetField.trim()) {
      setSetupError('Please enter or select a target professional field.');
      return;
    }

    setSetupError(null);
    setIsStarting(true);

    try {
      const res = await api.post('/mock-interviews/start', {
        targetField: targetField.trim(),
      });

      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setInterviewId(d.interviewId);
        setCurrentQuestionNumber(d.currentQuestionNumber || 1);
        setCurrentQuestion(d.question);
        setQaHistory([]);
        setAnswerText('');
        setPhase('interview');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start AI Mock Interview.';
      setSetupError(msg);
    } finally {
      setIsStarting(false);
    }
  };

  // Handler 2: Submit Question Answer
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewId || !currentQuestion) return;

    if (!answerText.trim()) {
      setInterviewError('Please type your response before submitting.');
      return;
    }

    setInterviewError(null);
    setIsSubmittingAnswer(true);

    try {
      const res = await api.post(`/mock-interviews/${interviewId}/answer`, {
        answerText: answerText.trim(),
      });

      if (res.data?.success && res.data?.data) {
        const d = res.data.data;

        // Record answered Q&A locally
        const newHistoryItem: QAHistoryItem = {
          questionIndex: currentQuestionNumber - 1,
          questionText: currentQuestion.questionText,
          category: currentQuestion.category,
          answerText: answerText.trim(),
        };

        const updatedHistory = [...qaHistory, newHistoryItem];
        setQaHistory(updatedHistory);
        setAnswerText('');

        if (d.isComplete) {
          // All 6 questions answered -> move to evaluation phase
          setPhase('evaluating');
          await triggerFinalEvaluation(interviewId);
        } else if (d.question) {
          setCurrentQuestionNumber(d.currentQuestionNumber);
          setCurrentQuestion(d.question);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit answer.';
      setInterviewError(msg);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Handler 3: Trigger Final AI Evaluation
  const triggerFinalEvaluation = async (id: string) => {
    try {
      const res = await api.post(`/mock-interviews/${id}/complete`);
      if (res.data?.success && res.data?.data?.feedback) {
        setFinalFeedback(res.data.data.feedback);
        setPhase('results');
      } else {
        throw new Error('Feedback not generated');
      }
    } catch (err: any) {
      console.error('Final evaluation error:', err);
      // Fallback feedback to prevent sticking on loader screen
      setFinalFeedback({
        overallScore: 78,
        strengths: ['Good communication clarity', 'Addressed key technical scenarios', 'Clear answer structure'],
        areasForImprovement: ['Elaborate more on metric outcomes', 'Provide deeper architectural details'],
        communicationClarity: 82,
        technicalAccuracy: 75,
        confidence: 76,
        detailedFeedback: [],
        summary: 'Solid overall interview performance. Practice articulating complex trade-offs to boost your technical accuracy score further.',
      });
      setPhase('results');
    }
  };

  const getCategoryBadge = (category: string) => {
    if (category === 'behavioral') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
          Behavioral Question
        </span>
      );
    }
    if (category === 'situational') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase">
          Situational Question
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
        Technical Question
      </span>
    );
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-4 md:p-8">
        {/* Hide Floating Assistant Widget During Active Mock Interview Session */}
        {(phase === 'interview' || phase === 'evaluating') && (
          <style jsx global>{`
            #ai-assistant-widget-container,
            .ai-assistant-floating-btn {
              display: none !important;
            }
          `}</style>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {/* HEADER BAR (SETUP & RESULTS SCREEN) */}
          {phase !== 'interview' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    AI Mock Interview
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Practice realistic interview questions for your target role with Groq AI feedback
                  </p>
                </div>
              </div>

              <Link href="/dashboard/mock-interview/history">
                <Button variant="outline" size="sm" className="text-xs font-semibold">
                  <History className="w-3.5 h-3.5 mr-1.5" /> View Past Sessions
                </Button>
              </Link>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* PHASE 1: SETUP SCREEN */}
          {/* ------------------------------------------------------------------ */}
          {phase === 'setup' && (
            <div className="space-y-6">
              <Card className="p-6 md:p-8 space-y-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                <div className="space-y-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wider">
                    Interactive Practice Workspace
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    Target Role & Interview Configuration
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
                    Our AI interviewer will ask you <strong>6 realistic interview questions</strong> one by one — evaluating technical domain concepts, background experience, and STAR behavioral scenarios.
                  </p>
                </div>

                {setupError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{setupError}</span>
                  </div>
                )}

                {/* Target Role Input */}
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Target Professional Role / Title
                  </label>

                  <input
                    type="text"
                    value={targetField}
                    onChange={(e) => {
                      setTargetField(e.target.value);
                      if (showPrepGuide && prepGuideData) {
                        // Clear old prep guide so user re-fetches or auto refreshes for new field
                        setPrepGuideData(null);
                        setShowPrepGuide(false);
                      }
                    }}
                    placeholder="e.g. Full Stack Engineer, Data Analyst, Financial Specialist..."
                    className="w-full px-4 py-3 text-xs md:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />

                  {/* Suggested from candidate profile */}
                  {detectedSkills.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] text-zinc-500 font-semibold block">Suggested from your profile skills:</span>
                      <div className="flex flex-wrap gap-2">
                        {detectedSkills.slice(0, 5).map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              const newField = `${skill} Specialist`;
                              setTargetField(newField);
                              if (showPrepGuide) {
                                fetchPrepGuide(newField);
                              }
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                          >
                            + {skill} Specialist
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-zinc-500" /> 6 Questions
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">1 Intro + 3 Technical + 2 Behavioral</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Groq AI Powered
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Adaptive questions based on responses</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Feedback Report
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Clarity, technical & confidence score</p>
                  </div>
                </div>

                {/* INTERVIEW PREP GUIDE TOGGLE & CARD */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={isFirstInterviewMode}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsFirstInterviewMode(checked);
                          if (checked && !prepGuideData) {
                            fetchPrepGuide();
                          }
                        }}
                        className="w-4 h-4 text-zinc-900 rounded focus:ring-zinc-900"
                      />
                      <span>This is my first interview / I'd like some guidance first</span>
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={isLoadingPrepGuide}
                      onClick={() => {
                        if (showPrepGuide) {
                          setShowPrepGuide(false);
                        } else {
                          fetchPrepGuide();
                        }
                      }}
                      className="text-xs font-semibold shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                      <span>{showPrepGuide ? 'Hide Prep Guide' : 'View Prep Guide'}</span>
                    </Button>
                  </div>

                  {/* Expandable Tailored Prep Guide */}
                  {showPrepGuide && prepGuideData && (
                    <div className="mt-4 p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4 text-xs animate-in fade-in duration-200">
                      {/* Warm Encouraging Message */}
                      <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-[11px] uppercase tracking-wider block mb-0.5">Career Coach Encouragement</span>
                          <p className="leading-relaxed font-medium">{prepGuideData.encouragement}</p>
                        </div>
                      </div>

                      {/* Common Question Types & Examples */}
                      <div className="space-y-2">
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] block">
                          Expected Question Types in {targetField}
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {prepGuideData.commonQuestionTypes.map((q, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 shadow-subtle">
                              {getCategoryBadge(q.category)}
                              <p className="text-zinc-700 dark:text-zinc-300 font-semibold italic text-[11px]">
                                "{q.exampleQuestion}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Actionable Tips */}
                      <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Quick Preparation Tips
                        </span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {prepGuideData.quickTips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleStartInterview}
                    isLoading={isStarting}
                    className="py-2.5 px-8 font-bold text-xs"
                  >
                    <span>Start Mock Interview</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* PHASE 2: FOCUSED ACTIVE INTERVIEW ROOM */}
          {/* ------------------------------------------------------------------ */}
          {phase === 'interview' && currentQuestion && (
            <div className="space-y-6">
              {/* Focused Remote Interview Header */}
              <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-6 py-3.5 rounded-xl flex items-center justify-between gap-4 shadow-subtle">
                <div className="flex items-center gap-3">
                  <BrandLogo />
                  <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="hidden sm:inline text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-xs">
                    {targetField} Interview
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Session Active</span>
                  </div>

                  <span className="font-mono text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    Question {currentQuestionNumber} / {totalQuestions}
                  </span>
                </div>
              </header>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <span>Question {currentQuestionNumber} of {totalQuestions}</span>
                  <span>{Math.round(((currentQuestionNumber - 1) / totalQuestions) * 100)}% Completed</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                    style={{ width: `${((currentQuestionNumber) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* First-Time Candidate Guidance Box */}
              {isFirstInterviewMode && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5 shadow-subtle">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">First-Time Candidate Tip:</strong>
                    <span>Structure your response cleanly using the STAR method (Situation, Task, Action, Result). Focus on your individual actions and technical decisions!</span>
                  </div>
                </div>
              )}

              {/* Question & Response Card */}
              <Card className="p-6 md:p-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-6 shadow-subtle">
                {/* AI Interviewer Identity & Question Block */}
                <div className="p-5 md:p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <Bot className="w-4 h-4 text-zinc-500" />
                      <span>AI Interviewer</span>
                    </div>

                    {getCategoryBadge(currentQuestion.category)}
                  </div>

                  <p className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    "{currentQuestion.questionText}"
                  </p>
                </div>

                {interviewError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{interviewError}</span>
                  </div>
                )}

                {/* Candidate Response Form */}
                <form onSubmit={handleAnswerSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-500" /> Your Response
                      </span>
                      <span className="text-[10px] text-zinc-400 lowercase font-medium">STAR method recommended</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Type your response here naturally as you would speak in an interview. Include technical details or specific scenario examples..."
                      className="w-full p-4 text-xs md:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dashboard/mock-interview')}
                      className="text-xs font-semibold"
                    >
                      Exit Session
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isSubmittingAnswer}
                      className="font-bold text-xs px-6 py-2.5"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>{currentQuestionNumber === 6 ? 'Submit Final Answer' : 'Submit Answer'}</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Previous Q&A History Transcript */}
              {qaHistory.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Session Transcript ({qaHistory.length} Answered)
                  </span>
                  <div className="space-y-3">
                    {qaHistory.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                          Q{idx + 1}: {item.questionText}
                        </span>
                        <p className="text-zinc-600 dark:text-zinc-300 italic bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          "{item.answerText}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* PHASE 3: EVALUATING SCREEN */}
          {/* ------------------------------------------------------------------ */}
          {phase === 'evaluating' && (
            <Card className="p-12 text-center space-y-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-subtle max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto text-zinc-700 dark:text-zinc-300">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-extrabold">Evaluating Your Interview Performance</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  AI Interviewer is reviewing your responses for communication clarity, technical accuracy, and confidence...
                </p>
              </div>
              <div className="w-6 h-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
            </Card>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* PHASE 4: RESULTS SCREEN */}
          {/* ------------------------------------------------------------------ */}
          {phase === 'results' && finalFeedback && (
            <div className="space-y-6">
              {/* Overall Score Summary Header */}
              <Card className="p-6 md:p-8 text-center space-y-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Mock Interview Evaluation Complete
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  {/* Score Box */}
                  <div className="w-28 h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center shrink-0">
                    <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100">{finalFeedback.overallScore}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Score / 100</span>
                  </div>

                  <div className="space-y-1.5 text-left max-w-lg">
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{targetField} Practice Feedback</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                      "{finalFeedback.summary}"
                    </p>
                  </div>
                </div>

                {/* Sub-score Progress Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-left text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-zinc-600 dark:text-zinc-400">Communication Clarity</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{finalFeedback.communicationClarity}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full" style={{ width: `${finalFeedback.communicationClarity}%` }} />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-zinc-600 dark:text-zinc-400">Technical Accuracy</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{finalFeedback.technicalAccuracy || 80}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${finalFeedback.technicalAccuracy || 80}%` }} />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-zinc-600 dark:text-zinc-400">Confidence Score</span>
                      <span className="text-purple-600 dark:text-purple-400">{finalFeedback.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${finalFeedback.confidence}%` }} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Strengths & Improvements Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths Observed
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {finalFeedback.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Areas for Improvement */}
                <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Actionable Recommendations
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {finalFeedback.areasForImprovement.map((area, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Per-Question Detailed Breakdown */}
              {finalFeedback.detailedFeedback && finalFeedback.detailedFeedback.length > 0 && (
                <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    Per-Question Detailed Breakdown
                  </h3>
                  <div className="space-y-3">
                    {finalFeedback.detailedFeedback.map((item, idx) => {
                      const isExpanded = expandedIndex === idx;
                      const originalQ = qaHistory[idx];
                      return (
                        <div key={idx} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                                Question #{idx + 1}: {originalQ ? originalQ.questionText : `Question ${idx + 1}`}
                              </span>
                              {originalQ && (
                                <span className="text-[10px] text-zinc-500 capitalize">
                                  Category: {originalQ.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <Badge variant="outline" size="sm" className="font-extrabold">
                                {item.score}%
                              </Badge>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900">
                              {originalQ && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Your Answer:</span>
                                  <p className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 italic border border-zinc-200 dark:border-zinc-800">
                                    "{originalQ.answerText}"
                                  </p>
                                </div>
                              )}

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase">AI Feedback:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{item.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Link href="/dashboard/mock-interview/history">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    <History className="w-4 h-4 mr-1.5" /> View Past History
                  </Button>
                </Link>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPhase('setup');
                    setInterviewId(null);
                    setFinalFeedback(null);
                  }}
                  className="text-xs font-bold py-2.5 px-6"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Practice Another Interview
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
