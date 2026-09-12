'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { JobCard } from '@/components/jobs/JobCard';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { CinematicEntrance } from '@/components/animation/CinematicEntrance';
import {
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Briefcase,
  Sparkles,
  Award,
  MessageSquare,
  FileCheck,
  Users,
  CheckCircle2,
  Building2,
  TrendingUp,
} from 'lucide-react';

interface PublicJob {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryDisclosed: boolean;
  experienceLevel: string;
  skillsRequired: string[];
  applicationDeadline?: string | null;
  createdAt: string;
  companyId: {
    _id: string;
    companyName: string;
    logoUrl?: string;
    location?: string;
    industry?: string;
    isVerified?: boolean;
  };
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [recentJobs, setRecentJobs] = useState<PublicJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Fetch a small list of recent public jobs for discovery section
  const fetchRecentJobs = useCallback(async () => {
    try {
      const response = await api.get('/jobs?limit=6&sortBy=newest');
      if (response.data?.success && Array.isArray(response.data.data)) {
        setRecentJobs(response.data.data);
      }
    } catch {
      setRecentJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentJobs();
  }, [fetchRecentJobs]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.append('search', keyword.trim());
    if (location.trim()) params.append('location', location.trim());
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <CinematicEntrance>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col selection:bg-zinc-900 selection:text-white">
        {/* Global Top Header Navigation */}
        <Header />

      <main className="flex-1 space-y-16 md:space-y-24 pb-16">
        {/* ================================================== */}
        {/* SECTION 1: HERO / SEARCH */}
        {/* ================================================== */}
        <section className="relative pt-8 md:pt-16 pb-12 px-4 md:px-8 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40">
          <div className="max-w-6xl mx-auto space-y-8">
            <GSAPReveal direction="up" distance={20} duration={0.6}>
              <div className="space-y-4 max-w-3xl">
                <Badge variant="success" size="md" className="inline-flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Commercial Grade Recruitment Platform</span>
                </Badge>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.1]">
                  What opportunity comes next?
                </h1>

                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal max-w-2xl">
                  Hirely connects ambitious professionals with verified companies using intelligent skill matching, ATS resume scoring, text-based AI interview practice, and direct socket messaging.
                </p>
              </div>
            </GSAPReveal>

            {/* Prominent Recruitment Search Bar */}
            <GSAPReveal direction="up" distance={24} duration={0.7} delay={0.15}>
              <Card className="p-3 md:p-4 border-zinc-300 dark:border-zinc-700 shadow-modal">
                <form onSubmit={handleHeroSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="relative md:col-span-5">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Job title, keyword, or skill (e.g. Frontend)..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                    />
                  </div>

                  <div className="relative md:col-span-4">
                    <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="City, State, or 'Remote'..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Button type="submit" variant="primary" size="lg" className="w-full h-full py-3 font-semibold text-sm">
                      <Search className="w-4 h-4 mr-2" /> Search Jobs
                    </Button>
                  </div>
                </form>
              </Card>
            </GSAPReveal>

            {/* Subtle Platform Signals */}
            <GSAPReveal direction="up" distance={16} duration={0.6} delay={0.25}>
              <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-zinc-500 dark:text-zinc-400 pt-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 100% Verified Employers
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Transparent Status Tracking
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Direct Socket Messaging
                </span>
              </div>
            </GSAPReveal>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 2: TRUST / PLATFORM VALUE */}
        {/* ================================================== */}
        <section className="max-w-6xl mx-auto px-4 md:px-8">
          <GSAPReveal direction="up" distance={24}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Verified Companies</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Strict employer verification workflow to ensure legitimate business postings.
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">AI Match Scoring</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Algorithmic scoring matching your skills and experience level to job specs.
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Real-Time Messaging</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Instant candidate-employer socket messaging with read receipts and attachments.
                </p>
              </Card>

              <Card className="p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Skill Validation</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Dynamic technical skill assessments to showcase verified expertise to employers.
                </p>
              </Card>
            </div>
          </GSAPReveal>
        </section>

        {/* ================================================== */}
        {/* SECTION 3: JOB DISCOVERY (REAL JOBS FROM API) */}
        {/* ================================================== */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 space-y-6">
          <GSAPReveal direction="up" distance={20}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Featured Opportunities
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Explore recent verified positions available across software engineering, product, and management.
                </p>
              </div>

              <Link href="/jobs">
                <Button variant="outline" size="sm" className="font-semibold text-xs gap-1 shrink-0">
                  <span>Browse All Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </GSAPReveal>

          {/* Jobs List Grid */}
          {isLoadingJobs ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="rectangular" className="w-12 h-12 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton variant="text" className="w-48 h-5" />
                      <Skeleton variant="text" className="w-32 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <p className="text-xs text-zinc-500">No active job listings found at this moment.</p>
              <Link href="/jobs">
                <Button variant="primary" size="sm">Explore Marketplace</Button>
              </Link>
            </Card>
          ) : (
            <GSAPReveal direction="up" distance={24} stagger={0.08}>
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
            </GSAPReveal>
          )}
        </section>

        {/* ================================================== */}
        {/* SECTION 4: HOW HIRELY WORKS */}
        {/* ================================================== */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          <GSAPReveal direction="up" distance={20}>
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Designed for Candidates & Employers
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                A streamlined recruitment workflow built on transparency, validation, and real speed.
              </p>
            </div>
          </GSAPReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Candidate Workflow */}
            <GSAPReveal direction="up" distance={24} delay={0.1}>
              <Card className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span>For Job Seekers</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Discover Opportunities</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Filter verified roles by employment type, location, experience, and salary transparency.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Evaluate & Prepare</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Assess your resume ATS score and practice text-based AI mock interviews to build confidence.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Apply & Chat Directly</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Submit applications with optional cover letters and communicate directly with hiring teams.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/signup">
                    <Button variant="outline" size="sm" className="w-full font-semibold">
                      Create Candidate Profile
                    </Button>
                  </Link>
                </div>
              </Card>
            </GSAPReveal>

            {/* Employer Workflow */}
            <GSAPReveal direction="up" distance={24} delay={0.2}>
              <Card className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span>For Employers</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Post Open Positions</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Define required skills, experience level, salary range, and application deadline date.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Review Candidate Matches</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Inspect AI candidate match scores, skills breakdown, and applicant documents in your dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Engage & Hire</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Message applicants in real-time, update application status, and complete recruitment cycles.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={user?.role === 'employer' ? '/dashboard/jobs/post' : '/signup'}>
                    <Button variant="primary" size="sm" className="w-full font-semibold">
                      Post a Job Opening
                    </Button>
                  </Link>
                </div>
              </Card>
            </GSAPReveal>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 5: AI & SMART PRODUCT CAPABILITIES */}
        {/* ================================================== */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          <GSAPReveal direction="up" distance={20}>
            <div className="text-center max-w-xl mx-auto space-y-2">
              <Badge variant="default" size="md" className="mx-auto">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Built-in AI Capabilities
              </Badge>
              <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Intelligent Career & Hiring Tools
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Serious tools designed to improve application quality and candidate evaluation accuracy.
              </p>
            </div>
          </GSAPReveal>

          <GSAPReveal direction="up" distance={24} stagger={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Resume Checker */}
              <Card className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <FileCheck className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">ATS Resume Checker</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                  Upload your resume PDF to receive an instant ATS compatibility score, formatting analysis, and actionable improvement recommendations.
                </p>
              </Card>

              {/* Feature 2: Mock Interview */}
              <Card className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">AI Mock Interview</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                  Practice discipline-specific behavioral and technical interview questions one by one with instant feedback on clarity and technical accuracy.
                </p>
              </Card>

              {/* Feature 3: Skill Assessments */}
              <Card className="p-6 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Verified Skill Tests</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                  Complete timed, AI-generated technical quizzes to validate your proficiency and earn verified badges displayed to hiring managers.
                </p>
              </Card>
            </div>
          </GSAPReveal>
        </section>

        {/* ================================================== */}
        {/* SECTION 6: FINAL CTA */}
        {/* ================================================== */}
        <section className="max-w-6xl mx-auto px-4 md:px-8">
          <GSAPReveal direction="up" distance={20}>
            <Card className="p-8 md:p-12 text-center space-y-6 bg-zinc-900 text-white dark:bg-zinc-900 dark:border-zinc-800 shadow-modal">
              <div className="space-y-2 max-w-xl mx-auto">
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                  Your Next Career Move Starts Here
                </h2>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-normal">
                  Join candidates and employers using Hirely for verified opportunities and transparent recruitment.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link href="/jobs">
                  <Button variant="primary" size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 border-white font-bold px-8">
                    Explore Open Positions
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button variant="secondary" size="lg" className="bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 border-zinc-700 font-semibold px-8">
                    Create Account
                  </Button>
                </Link>
              </div>
            </Card>
          </GSAPReveal>
        </section>
      </main>

      {/* Reusable Global Footer */}
      <Footer />
    </div>
    </CinematicEntrance>
  );
}
