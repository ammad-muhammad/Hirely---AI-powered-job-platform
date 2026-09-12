'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FileCheck2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Wand2,
  Tag,
  ListChecks,
  Info,
  FileText,
  ExternalLink,
  Type,
  User as UserIcon,
  Upload,
  ShieldCheck,
  RefreshCw,
  Download,
} from 'lucide-react';
import { getResumeViewUrl, triggerFileDownload } from '@/utils/fileHelpers';
import { BrandLogo } from '@/components/navigation/BrandLogo';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';

interface ATSReport {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  improvementSuggestions: string[];
  summary: string;
}

interface ActiveJob {
  _id: string;
  title: string;
  category: string;
  companyId: {
    companyName: string;
  };
}

export default function ResumeCheckerPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'saved' | 'paste'>('saved');
  const [resumeText, setResumeText] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [fetchedResumeUrl, setFetchedResumeUrl] = useState<string | null>(null);
  const [fetchedResumeFileName, setFetchedResumeFileName] = useState<string | null>(null);

  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<ATSReport | null>(null);

  // Load saved profile resume URL dynamically
  useEffect(() => {
    async function loadSavedResume() {
      try {
        const res = await api.get('/job-seeker-profile/me');
        if (res.data?.success && res.data?.data?.profile?.resumeUrl) {
          setFetchedResumeUrl(res.data.data.profile.resumeUrl);
          setFetchedResumeFileName(res.data.data.profile.resumeOriginalFileName || null);
        }
      } catch {
        // fallback to AuthContext user object
      }
    }
    if (user && user.role === 'job_seeker') {
      loadSavedResume();
    }
  }, [user]);

  const savedResumeUrl = fetchedResumeUrl || user?.jobSeekerProfile?.resumeUrl || user?.roleProfile?.resumeUrl;

  // Redirect non-jobseekers away
  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load public jobs for target job comparison dropdown
  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await api.get('/jobs?limit=20');
        if (response.data?.success && response.data?.data) {
          setActiveJobs(response.data.data);
        }
      } catch {
        setActiveJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  const handlePreFillSample = () => {
    setResumeText(
      `ALEXANDER WRIGHT\nSenior Full-Stack Engineer | San Francisco, CA\n\nSUMMARY:\nExperienced Full-Stack Software Engineer with 6+ years of expertise in building high-throughput web applications using React, Next.js, Node.js, and PostgreSQL. Passionate about AI integration and performance optimization.\n\nEXPERIENCE:\nSenior Software Engineer — TechCorp (2021 - Present)\n- Developed microservices architecture serving 500k active daily users\n- Reduced database query latency by 40% using Redis caching and Mongoose index optimization\n- Led a team of 5 engineers in deploying Next.js SSR applications with Tailwind CSS\n\nFull-Stack Developer — Innovate Software (2018 - 2021)\n- Built RESTful APIs and real-time WebSocket messaging systems\n- Collaborated with product designers to implement responsive SaaS user interfaces\n\nEDUCATION:\nB.S. in Computer Science — University of California, Berkeley\n\nSKILLS:\nReact, Next.js, TypeScript, Node.js, Express, MongoDB, PostgreSQL, Docker, AWS, Git`
    );
    setErrorMsg(null);
  };

  const handleAnalyzeSavedResume = async () => {
    if (!savedResumeUrl) {
      setErrorMsg('No saved resume found in your profile. Please upload one first in your profile or paste text below.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setReport(null);

    try {
      // Mode A: No resumeText in body -> backend extracts text from user.jobSeekerProfile.resumeUrl using unpdf
      const response = await api.post('/ai/analyze-resume', {
        jobId: selectedJobId || undefined,
      });

      if (response.data?.success && response.data?.data) {
        setReport(response.data.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI resume analysis failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzePastedText = async () => {
    const trimmed = resumeText.trim();
    if (!trimmed || trimmed.length < 20) {
      setErrorMsg('Please paste your resume text (at least 20 characters) to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setReport(null);

    try {
      // Mode B: resumeText provided directly in body
      const response = await api.post('/ai/analyze-resume', {
        resumeText: trimmed,
        jobId: selectedJobId || undefined,
      });

      if (response.data?.success && response.data?.data) {
        setReport(response.data.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI resume analysis failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreBadgeVariant = (score: number): 'success' | 'warning' | 'danger' => {
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Navigation */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="text-xs font-semibold">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>

            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                <UserIcon className="w-3.5 h-3.5 mr-1 text-zinc-500" /> Candidate Profile
              </Button>
            </Link>
          </div>

          {/* Title Banner */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                AI Resume & ATS Checker
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Audit your resume against ATS criteria and target job specifications powered by AI
              </p>
            </div>
          </div>

          {/* Mode Selection Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                setActiveTab('saved');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-100/60 dark:bg-zinc-800/40'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Saved Profile Resume</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('paste');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'paste'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-100/60 dark:bg-zinc-800/40'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Analyze Custom Resume Text</span>
            </button>
          </div>

          {/* Error Alert Card */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 1: SAVED PROFILE RESUME */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'saved' && (
            <Card className="p-6 md:p-8 space-y-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
              {savedResumeUrl ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {fetchedResumeFileName || 'Saved Resume Document (PDF)'}
                        </h4>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Automatic ATS text extraction via PDF parser
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={getResumeViewUrl(savedResumeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                      >
                        <span>View PDF</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => triggerFileDownload(savedResumeUrl, fetchedResumeFileName || 'Resume.pdf')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>

                  {/* Target Job Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                      Compare Against Target Job Opening (Optional)
                    </label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'General ATS Audit (No specific target job)' },
                        ...activeJobs.map((job) => ({
                          value: job._id,
                          label: `${job.title} — ${job.companyId?.companyName || 'Company'}`,
                          subLabel: job.category,
                        })),
                      ]}
                      value={selectedJobId}
                      onChange={(val) => setSelectedJobId(val)}
                      disabled={isLoadingJobs}
                      placeholder="Select target job opening to compare..."
                      searchPlaceholder="Search job title or company..."
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleAnalyzeSavedResume}
                    isLoading={isAnalyzing}
                    className="w-full py-3 font-bold text-xs justify-center"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span>{isAnalyzing ? 'Auditing Saved Resume...' : 'Analyze My Saved Resume'}</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                      No Saved Resume PDF Found
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Upload a PDF resume to your profile for 1-click ATS auditing, or analyze custom text directly.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Link href="/dashboard/profile">
                      <Button variant="primary" size="sm" className="font-bold text-xs">
                        Upload Resume in Profile
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('paste')} className="text-xs font-semibold">
                      Paste Text Instead
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 2: ANALYZE CUSTOM RESUME TEXT */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'paste' && (
            <Card className="p-6 md:p-8 space-y-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-zinc-500" />
                    <span>Copy and Paste Resume Text</span>
                  </label>

                  <button
                    type="button"
                    onClick={handlePreFillSample}
                    className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Pre-fill Sample Text
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 font-medium">
                  <Info className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>
                    <strong>Tip:</strong> Open any resume PDF, select all text (<strong>Ctrl+A</strong>), copy (<strong>Ctrl+C</strong>), and paste it below.
                  </span>
                </div>
              </div>

              <textarea
                rows={9}
                placeholder="Paste external resume text here (Summary, Experience, Education, Skills)..."
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full p-4 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none font-mono leading-relaxed placeholder:font-sans"
              />

              {/* Target Job Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Compare Against Target Job Opening (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'General ATS Audit (No specific target job)' },
                    ...activeJobs.map((job) => ({
                      value: job._id,
                      label: `${job.title} — ${job.companyId?.companyName || 'Company'}`,
                      subLabel: job.category,
                    })),
                  ]}
                  value={selectedJobId}
                  onChange={(val) => setSelectedJobId(val)}
                  disabled={isLoadingJobs}
                  placeholder="Select target job opening to compare..."
                  searchPlaceholder="Search job title or company..."
                />
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleAnalyzePastedText}
                isLoading={isAnalyzing}
                className="w-full py-3 font-bold text-xs justify-center"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>{isAnalyzing ? 'Auditing Resume Text...' : 'Analyze Resume Text'}</span>
              </Button>
            </Card>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* PROCESSING / LOADING SKELETON STATE */}
          {/* ------------------------------------------------------------------ */}
          {isAnalyzing && (
            <Card className="p-8 text-center space-y-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-subtle max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto text-zinc-700 dark:text-zinc-300">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold">Auditing Resume Against ATS Standards</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  AI engine is checking keyword density, formatting compatibility, and structural impact...
                </p>
              </div>
              <div className="w-6 h-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
            </Card>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* UNIFIED RESULTS REPORT SCREEN */}
          {/* ------------------------------------------------------------------ */}
          {report && !isAnalyzing && (
            <div className="space-y-6">
              {/* ATS Score & Summary Header */}
              <Card className="p-6 md:p-8 space-y-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getScoreBadgeVariant(report.atsScore)} size="sm" className="font-extrabold text-[10px]">
                        ATS Score: {report.atsScore}/100
                      </Badge>
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Executive Verdict</span>
                    </div>
                    <p className="text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                      "{report.summary}"
                    </p>
                  </div>

                  {/* Restrained Metric Box Score */}
                  <div className="w-28 h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center shrink-0 mx-auto md:mx-0">
                    <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{report.atsScore}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ATS Score</span>
                  </div>
                </div>
              </Card>

              {/* Grid: Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths ({report.strengths.length})
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {report.strengths.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Weaknesses */}
                <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Areas for Improvement ({report.weaknesses.length})
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {report.weaknesses.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Missing Key Keywords */}
              {report.missingKeywords && report.missingKeywords.length > 0 && (
                <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <Tag className="w-4 h-4 text-zinc-500" /> Missing Key Keywords
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Including these role terms in your experience descriptions will boost ATS keyword matching:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {report.missingKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" size="md" className="font-bold text-xs">
                        + {keyword}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Formatting Issues (If Present) */}
              {report.formattingIssues && report.formattingIssues.length > 0 && (
                <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <FileText className="w-4 h-4 text-zinc-500" /> Formatting & Layout Notes
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {report.formattingIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 mt-1.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Actionable AI Improvement Suggestions */}
              {report.improvementSuggestions && report.improvementSuggestions.length > 0 && (
                <Card className="p-6 space-y-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-zinc-500" /> Actionable Recommendations
                  </h3>
                  <div className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    {report.improvementSuggestions.map((sug, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{sug}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
