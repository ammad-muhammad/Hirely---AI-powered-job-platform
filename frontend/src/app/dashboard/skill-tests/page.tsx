'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { WorkspaceNav } from '@/components/navigation/WorkspaceNav';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Award,
  CheckCircle2,
  Clock,
  PlayCircle,
  History,
  XCircle,
  AlertCircle,
  Sparkles,
  Lightbulb,
  User as UserIcon,
  Filter,
  ChevronRight,
  BookOpen,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface SkillTestItem {
  _id: string;
  title: string;
  category: string;
  skillName: string;
  description: string;
  timeLimitMinutes: number;
  questionsCount?: number;
  matchScore?: number;
  matchReason?: string;
  lastAttemptAt?: string | null;
  lastAttemptPassed?: boolean | null;
  lastAttemptScore?: number | null;
  bestScore?: number;
  cooldownActive?: boolean;
  nextRetakeAvailableAt?: string | null;
  cooldownReason?: 'passed' | 'failed' | null;
}

interface VerifiedSkill {
  skill: string;
  score: number;
  verifiedAt: string;
}

interface TestAttempt {
  _id: string;
  testId: { title: string; skillName: string } | string;
  score: number;
  passed: boolean;
  status: string;
  startedAt: string;
  violationsCount: number;
}

import { Pagination } from '@/components/ui/Pagination';

export default function SkillTestsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [recommendedTests, setRecommendedTests] = useState<SkillTestItem[]>([]);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [detectedField, setDetectedField] = useState<string | null>(null);
  const [verifiedSkills, setVerifiedSkills] = useState<VerifiedSkill[]>([]);
  const [pastAttempts, setPastAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);

  // Pagination for past attempts
  const [attemptsPage, setAttemptsPage] = useState(1);
  const [attemptsTotalPages, setAttemptsTotalPages] = useState(1);
  const [attemptsTotalCount, setAttemptsTotalCount] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadData = useCallback(async (targetAttemptsPage = 1) => {
    try {
      setIsLoading(true);
      setHasError(false);

      const [testsRes, profileRes, attemptsRes] = await Promise.allSettled([
        api.get('/skill-tests'),
        api.get('/job-seeker-profile/me'),
        api.get(`/skill-tests/attempts/my-attempts?page=${targetAttemptsPage}&limit=10`),
      ]);

      if (testsRes.status === 'fulfilled' && testsRes.value.data?.success) {
        setRecommendedTests(testsRes.value.data.recommended || []);
        setIsProfileIncomplete(Boolean(testsRes.value.data.isProfileIncomplete));
        setDetectedField(testsRes.value.data.detectedField || null);
      } else {
        setHasError(true);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success && profileRes.value.data?.data?.profile?.verifiedSkills) {
        setVerifiedSkills(profileRes.value.data.data.profile.verifiedSkills);
      }

      if (attemptsRes.status === 'fulfilled' && attemptsRes.value.data?.success && Array.isArray(attemptsRes.value.data.data)) {
        setPastAttempts(attemptsRes.value.data.data);
        if (attemptsRes.value.data.pagination) {
          setAttemptsPage(attemptsRes.value.data.pagination.currentPage || targetAttemptsPage);
          setAttemptsTotalPages(attemptsRes.value.data.pagination.totalPages || 1);
          setAttemptsTotalCount(attemptsRes.value.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load skill tests data:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      loadData(attemptsPage);
    }
  }, [user, loadData, attemptsPage]);

  const handleStartTest = async (testId: string) => {
    setStartingTestId(testId);
    try {
      const response = await api.post(`/skill-tests/${testId}/start`);
      if (response.data?.success && response.data?.data) {
        router.push(`/dashboard/skill-tests/${testId}/take`);
      }
    } catch (err) {
      console.error('Failed to start skill test:', err);
    } finally {
      setStartingTestId(null);
    }
  };

  // Extract unique categories for SearchableSelect filter
  const categoryOptions = useMemo<SelectOption[]>(() => {
    const categories = Array.from(new Set(recommendedTests.map((t) => t.category).filter(Boolean)));
    return [
      { value: 'all', label: 'All Categories' },
      ...categories.map((c) => ({ value: c, label: c })),
    ];
  }, [recommendedTests]);

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return recommendedTests.filter((test) => {
      const title = test.title?.toLowerCase() || '';
      const skill = test.skillName?.toLowerCase() || '';
      const desc = test.description?.toLowerCase() || '';
      const category = test.category?.toLowerCase() || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || skill.includes(query) || desc.includes(query) || category.includes(query);
      const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [recommendedTests, searchQuery, categoryFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    const available = recommendedTests.length;
    const completed = pastAttempts.filter((a) => a.passed).length;
    const verified = verifiedSkills.length;
    return { available, completed, verified };
  }, [recommendedTests, pastAttempts, verifiedSkills]);

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans">
        {/* Workspace Contextual Navigation */}
        <WorkspaceNav />

        {/* PAGE HEADER */}
        <GSAPReveal direction="up" distance={20}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Skill Assessments
                </h1>
                {!isLoading && !isProfileIncomplete && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {metrics.available} {metrics.available === 1 ? 'assessment' : 'assessments'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Evaluate your technical skills and earn verified badges to strengthen your candidate profile.
              </p>
            </div>

            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="font-bold text-xs shrink-0">
                <UserIcon className="w-3.5 h-3.5 mr-1" />
                <span>Manage Profile Skills</span>
              </Button>
            </Link>
          </div>
        </GSAPReveal>

        {/* TOP SUMMARY ROW */}
        {!isLoading && !hasError && !isProfileIncomplete && (
          <GSAPReveal direction="up" distance={16} delay={0.04}>
            <div className="flex flex-wrap items-center gap-4 md:gap-8 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-subtle">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Available Assessments</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.available}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Passed Attempts</span>
                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{metrics.completed}</span>
              </div>

              <span className="text-zinc-200 dark:text-zinc-800 font-normal">|</span>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Verified Skill Badges</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{metrics.verified}</span>
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* VERIFIED SKILL BADGES SECTION */}
        {!isLoading && !hasError && verifiedSkills.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.06}>
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>My Verified Skill Badges ({verifiedSkills.length})</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {verifiedSkills.map((vs, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-bold shadow-subtle"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{vs.skill} Verified ({vs.score}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* SEARCH & CATEGORY FILTER */}
        {!isLoading && !hasError && !isProfileIncomplete && recommendedTests.length > 0 && (
          <GSAPReveal direction="up" distance={16} delay={0.08} className="relative z-30">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-subtle relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Search Input */}
                <div className="sm:col-span-8">
                  <SearchInput
                    placeholder="Search assessments by skill, title, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Filter */}
                <div className="sm:col-span-4">
                  <SearchableSelect
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={(val) => setCategoryFilter(val)}
                    placeholder="Category Filter..."
                  />
                </div>
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* ERROR STATE */}
        {hasError && (
          <Card className="p-8 text-center space-y-4 border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load skill assessments</h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                Please check your network connection and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(attemptsPage)} className="font-semibold text-xs">
              Try Again
            </Button>
          </Card>
        )}

        {/* LOADING STATE - HIRELY AI ANALYSIS BANNER */}
        {isLoading && (
          <Card className="p-8 md:p-12 text-center space-y-5 border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-b from-amber-50/60 via-white to-zinc-50 dark:from-amber-950/30 dark:via-zinc-900 dark:to-zinc-950 shadow-subtle relative overflow-hidden">
            <div className="relative z-10 space-y-4 max-w-md mx-auto">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-amber-500/20 dark:bg-amber-400/20 animate-ping" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base md:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2">
                  <span>Hirely AI is Analyzing Your Profile & Resume...</span>
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                  Evaluating technical competencies, experience level, and domain background to generate and match custom skill assessments.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/60 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Scanning skills & matching dynamic question pools...</span>
              </div>
            </div>
          </Card>
        )}

        {/* INCOMPLETE PROFILE CARD */}
        {!isLoading && !hasError && isProfileIncomplete && (
          <Card className="p-8 text-center space-y-4 max-w-lg mx-auto border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Complete Your Candidate Dossier First
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Add your technical skills, experience level, and resume to unlock personalized skill assessments for your field.
              </p>
            </div>
            <Link href="/dashboard/profile" className="inline-block pt-1">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                <span>Update Profile Now</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </Card>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !hasError && !isProfileIncomplete && recommendedTests.length === 0 && (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No skill assessments available
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Ensure your skills and experience are updated in your candidate profile to receive tailored assessments.
              </p>
            </div>
            <Link href="/dashboard/profile" className="inline-block pt-1">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                Manage Profile Skills
              </Button>
            </Link>
          </Card>
        )}

        {/* NO FILTER MATCHES STATE */}
        {!isLoading && !hasError && !isProfileIncomplete && recommendedTests.length > 0 && filteredTests.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Filter className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No matching skill assessments found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Try clearing your search term or resetting the category filter.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </Card>
        )}

        {/* RECOMMENDED SKILL ASSESSMENTS GRID */}
        {!isLoading && !hasError && !isProfileIncomplete && filteredTests.length > 0 && (
          <GSAPReveal direction="up" distance={20} stagger={0.06}>
            <div className="space-y-4">
              {detectedField && (
                <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  <span>
                    Detected Field: <span className="text-zinc-900 dark:text-zinc-100 font-bold">{detectedField}</span>
                  </span>
                  <span>{filteredTests.length} {filteredTests.length === 1 ? 'assessment' : 'assessments'}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTests.map((test) => {
                  const hasPassed = Boolean(test.bestScore && test.bestScore > 0);
                  const isCooldown = Boolean(test.cooldownActive);

                  let cooldownText = '';
                  if (isCooldown && test.nextRetakeAvailableAt) {
                    const diffMs = new Date(test.nextRetakeAvailableAt).getTime() - Date.now();
                    if (test.cooldownReason === 'passed') {
                      const daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                      cooldownText = `Retake available in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
                    } else {
                      const hoursLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
                      cooldownText = `Retake available in ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'}`;
                    }
                  }

                  return (
                    <Card
                      key={test._id}
                      className="p-5 md:p-6 space-y-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-subtle"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" size="sm" className="capitalize text-[10px] font-bold">
                              {test.category || 'Technical'}
                            </Badge>
                            {hasPassed && (
                              <Badge variant="success" size="sm" className="text-[10px] font-extrabold gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" /> Passed ✓ (Best: {test.bestScore}%)
                              </Badge>
                            )}
                          </div>

                          {test.matchScore !== undefined && (
                            <Badge variant="info" size="sm" className="text-[10px] font-extrabold gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" /> {test.matchScore}% Match
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                            {test.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                            {test.description}
                          </p>
                        </div>

                        {test.matchReason && (
                          <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed font-normal">{test.matchReason}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" /> {test.timeLimitMinutes} Mins
                          </span>
                          <span>{test.questionsCount || 15} Questions</span>
                        </div>

                        {isCooldown ? (
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="w-full text-xs font-bold opacity-75 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                            >
                              <Clock className="w-3.5 h-3.5 mr-1.5" /> {cooldownText || 'Retake Cooldown Active'}
                            </Button>
                            <p className="text-[10px] text-center text-amber-700 dark:text-amber-300 font-medium">
                              {test.cooldownReason === 'passed'
                                ? `Passed! Retake to improve score unlocks in ${cooldownText.replace('Retake available in ', '')}.`
                                : `Retake after failed attempt unlocks in ${cooldownText.replace('Retake available in ', '')}.`}
                            </p>
                          </div>
                        ) : (
                          <Button
                            variant={hasPassed ? 'outline' : 'primary'}
                            size="sm"
                            isLoading={startingTestId === test._id}
                            onClick={() => handleStartTest(test._id)}
                            className="w-full text-xs font-bold"
                          >
                            {hasPassed ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retake to Improve Score
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Start Skill Assessment
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </GSAPReveal>
        )}

        {/* ASSESSMENT HISTORY (PAST ATTEMPTS) */}
        {!isLoading && !hasError && pastAttempts.length > 0 && (
          <GSAPReveal direction="up" distance={20} delay={0.1}>
            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-500" /> Assessment History
              </h2>

              <div className="space-y-2">
                {pastAttempts.map((att) => {
                  const testTitle = typeof att.testId === 'object' && att.testId?.title ? att.testId.title : 'Skill Assessment';
                  return (
                    <Card key={att._id} className="p-4 flex items-center justify-between gap-4 text-xs shadow-subtle">
                      <div className="flex items-center gap-3">
                        {att.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{testTitle}</h4>
                          <span className="text-[11px] text-zinc-400">
                            Attempted {new Date(att.startedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={att.passed ? 'success' : 'danger'} size="md" className="font-extrabold uppercase">
                          {att.score}% ({att.passed ? 'PASSED' : att.status.toUpperCase()})
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {!isLoading && attemptsTotalPages > 1 && (
                <Pagination
                  currentPage={attemptsPage}
                  totalPages={attemptsTotalPages}
                  totalCount={attemptsTotalCount}
                  onPageChange={(newPage) => setAttemptsPage(newPage)}
                />
              )}
            </div>
          </GSAPReveal>
        )}
      </div>
    </ProtectedRoute>
  );
}
