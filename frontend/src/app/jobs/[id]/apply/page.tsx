'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Header } from '@/components/navigation/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Select } from '@/components/ui/Select';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  CheckCircle2,
  FileText,
  Upload,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Check,
  ChevronRight,
  HelpCircle,
  UserCheck,
  Eye,
} from 'lucide-react';

interface ScreeningQuestion {
  _id?: string;
  questionType: string;
  questionText?: string;
  experienceYears?: number;
  experienceTitle?: string;
  educationLevel?: string;
  isDealBreaker: boolean;
  isRequired?: boolean;
}

interface JobDetail {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  location: string;
  status?: string;
  workplaceType?: string;
  requireResume?: boolean;
  screeningQuestions?: ScreeningQuestion[];
  companyId: {
    _id: string;
    companyName: string;
    logoUrl?: string;
    location?: string;
  };
}

interface UserProfile {
  fullName?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  resumeOriginalFileName?: string;
}

export default function ApplyPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Data loading states
  const [job, setJob] = useState<JobDetail | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Apply Flow State
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resume state
  const [savedResumeUrl, setSavedResumeUrl] = useState<string | null>(null);
  const [savedResumeFileName, setSavedResumeFileName] = useState<string | null>(null);
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null);
  const [isUploadingCustomResume, setIsUploadingCustomResume] = useState(false);

  // Cover letter state
  const [coverLetterMode, setCoverLetterMode] = useState<'ai' | 'manual'>('ai');
  const [coverLetterText, setCoverLetterText] = useState('');
  const [aiTone, setAiTone] = useState<'formal' | 'friendly' | 'confident'>('formal');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Handle auth protection & employer redirect
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(`/login?returnUrl=/jobs/${jobId}/apply`);
      } else if (user.role === 'employer') {
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, jobId, router]);

  // Fetch job & profile details
  const fetchData = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [jobRes, profileRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get('/job-seeker-profile/me').catch(() => null),
      ]);

      if (jobRes.data?.success && jobRes.data?.data) {
        setJob(jobRes.data.data);
      } else {
        setLoadError('Failed to load job details.');
      }

      if (profileRes?.data?.success && profileRes?.data?.data?.profile) {
        const prof = profileRes.data.data.profile;
        setProfile({
          fullName: user?.fullName || prof.user?.fullName,
          email: user?.email || prof.user?.email,
          phone: prof.phone || prof.contactPhone,
          resumeUrl: prof.resumeUrl,
          resumeOriginalFileName: prof.resumeOriginalFileName,
        });

        if (prof.resumeUrl) {
          setSavedResumeUrl(prof.resumeUrl);
          setSavedResumeFileName(prof.resumeOriginalFileName || 'Saved Profile Resume.pdf');
        }
      }
    } catch {
      setLoadError('Unable to fetch required information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, user]);

  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      fetchData();
    }
  }, [user, fetchData]);

  // Dynamic Step Configuration
  const screeningQuestions = job?.screeningQuestions || [];
  const hasScreeningQuestions = screeningQuestions.length > 0;
  const totalSteps = hasScreeningQuestions ? 4 : 3;

  // Step Identification Helpers
  const getStepType = (stepIdx: number): 'screening' | 'info' | 'cover_letter' | 'review' => {
    if (hasScreeningQuestions) {
      if (stepIdx === 1) return 'screening';
      if (stepIdx === 2) return 'info';
      if (stepIdx === 3) return 'cover_letter';
      return 'review';
    } else {
      if (stepIdx === 1) return 'info';
      if (stepIdx === 2) return 'cover_letter';
      return 'review';
    }
  };

  const currentStepType = getStepType(currentStepIndex);

  const getStepTitle = (stepType: 'screening' | 'info' | 'cover_letter' | 'review') => {
    switch (stepType) {
      case 'screening':
        return 'Answer a Few Questions';
      case 'info':
        return 'Your Information';
      case 'cover_letter':
        return 'Cover Letter';
      case 'review':
        return 'Review & Submit';
    }
  };

  // Helper for checking if a screening question is required
  const isQuestionRequired = (q: ScreeningQuestion) => {
    return q.isDealBreaker || q.isRequired === true || q.questionType === 'custom_open_ended';
  };

  const getQuestionLabel = (q: ScreeningQuestion) => {
    if (q.questionText) return q.questionText;
    if (q.questionType === 'experience') {
      return `How many years of experience do you have in ${q.experienceTitle || 'this field'}?`;
    }
    if (q.questionType === 'education') {
      return `What is your highest level of completed education?`;
    }
    if (q.questionType === 'commute') {
      return `Are you able to commute or relocate to the job location?`;
    }
    if (q.questionType === 'willingness_to_travel') {
      return `Are you willing to travel as required for this position?`;
    }
    return `Requirement: ${q.questionType.replace(/_/g, ' ')}`;
  };

  const handleAnswerChange = (qKey: string, value: string) => {
    setScreeningAnswers((prev) => ({ ...prev, [qKey]: value }));
    setValidationError(null);
  };

  // Step 1 Validation & Proceeding
  const handleProceedFromScreening = () => {
    for (let i = 0; i < screeningQuestions.length; i++) {
      const q = screeningQuestions[i];
      const qKey = q._id || `q_${i}`;
      const answerVal = (screeningAnswers[qKey] || '').trim();
      if (isQuestionRequired(q) && !answerVal) {
        setValidationError(`Please answer the required question: "${getQuestionLabel(q)}"`);
        return;
      }
    }
    setValidationError(null);
    setCurrentStepIndex((prev) => prev + 1);
  };

  // Resume File Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedResumeFile(e.target.files[0]);
    }
  };

  // AI Cover Letter Generation Handler
  const handleGenerateAiCoverLetter = async () => {
    if (!job) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      let response;
      if (uploadedResumeFile) {
        const formData = new FormData();
        formData.append('jobId', job._id);
        formData.append('tone', aiTone);
        formData.append('resume', uploadedResumeFile);

        response = await api.post('/ai/generate-cover-letter', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('/ai/generate-cover-letter', {
          jobId: job._id,
          tone: aiTone,
        });
      }

      if (response.data?.success && response.data?.data?.coverLetter) {
        setCoverLetterText(response.data.data.coverLetter);
      } else {
        setAiError('Could not generate cover letter. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI cover letter generation failed.';
      setAiError(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Final Application Submission Handler
  const handleSubmitApplication = async () => {
    if (!job) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('jobId', job._id);
      if (coverLetterText) formData.append('coverLetter', coverLetterText);
      if (uploadedResumeFile) formData.append('resume', uploadedResumeFile);

      // Build structured screeningAnswers array
      if (hasScreeningQuestions) {
        const formattedAnswers = screeningQuestions.map((q, idx) => {
          const qKey = q._id || `q_${idx}`;
          return {
            questionId: q._id || undefined,
            questionText: getQuestionLabel(q),
            answerText: (screeningAnswers[qKey] || '').trim(),
          };
        });
        formData.append('screeningAnswers', JSON.stringify(formattedAnswers));
      }

      const res = await api.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setIsSubmittedSuccess(true);
      } else {
        setSubmitError(res.data?.message || 'Failed to submit application.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Application submission failed.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading View
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8 space-y-6">
          <Skeleton variant="rectangular" className="h-24 w-full rounded-2xl" />
          <Skeleton variant="rectangular" className="h-96 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  // Error / Job Not Found View
  if (loadError || !job) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">{loadError || 'Job Requisition Not Found'}</h2>
          <p className="text-sm text-zinc-500">The job posting you are trying to apply for may have been closed or removed.</p>
          <Link href="/jobs" className="inline-block pt-2">
            <Button variant="primary" size="md">Browse Other Jobs</Button>
          </Link>
        </main>
      </div>
    );
  }

  // Application Success Confirmation Screen
  if (isSubmittedSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 space-y-6">
          <Card glass className="p-8 text-center space-y-6 shadow-xl border-emerald-500/30 dark:border-emerald-500/20">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-subtle">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                Application Submitted
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                You've Applied to {job.title}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                Your application has been received by <strong className="text-zinc-900 dark:text-zinc-100">{job.companyId?.companyName || 'the employer'}</strong>.
                You will receive updates directly in your dashboard as your status changes.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center text-zinc-500">
                <span>Job Reference:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{job._id}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Submitted Resume:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {uploadedResumeFile ? uploadedResumeFile.name : savedResumeFileName || 'Profile Resume'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/dashboard/applications" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full font-bold py-3 gap-2">
                  <span>View Application Status</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/jobs" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full font-semibold">
                  Browse More Jobs
                </Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Active Resume Selected for Validation
  const hasValidResume = Boolean(savedResumeUrl && !isUploadingCustomResume) || Boolean(uploadedResumeFile);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Top Navigation Bar & Job Title */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/jobs/${jobId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Job Details</span>
          </Link>

          <Badge variant="outline" size="md" className="font-bold text-xs capitalize">
            {job.companyId?.companyName}
          </Badge>
        </div>

        {/* Header Card */}
        <Card glass className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider block">
                Job Application
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  {job.companyId?.companyName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {job.location}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-xs text-zinc-500 block">Step {currentStepIndex} of {totalSteps}</span>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {getStepTitle(currentStepType)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStepIndex / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Indicator Badges */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 text-center">
            {hasScreeningQuestions && (
              <div
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                  currentStepIndex === 1
                    ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/60 dark:border-brand-800 dark:text-brand-300'
                    : currentStepIndex > 1
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800'
                }`}
              >
                1. Questions
              </div>
            )}

            <div
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                currentStepType === 'info'
                  ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/60 dark:border-brand-800 dark:text-brand-300'
                  : currentStepIndex > (hasScreeningQuestions ? 2 : 1)
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800'
              }`}
            >
              {hasScreeningQuestions ? '2.' : '1.'} Info & Resume
            </div>

            <div
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                currentStepType === 'cover_letter'
                  ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/60 dark:border-brand-800 dark:text-brand-300'
                  : currentStepIndex > (hasScreeningQuestions ? 3 : 2)
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800'
              }`}
            >
              {hasScreeningQuestions ? '3.' : '2.'} Cover Letter
            </div>

            <div
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                currentStepType === 'review'
                  ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/60 dark:border-brand-800 dark:text-brand-300'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800'
              }`}
            >
              {hasScreeningQuestions ? '4.' : '3.'} Review & Submit
            </div>
          </div>
        </Card>

        {/* Global Error Banner */}
        {(validationError || submitError) && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-start gap-3 shadow-subtle">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Action Required</span>
              <p>{validationError || submitError}</p>
            </div>
          </div>
        )}

        {/* STEP 1: SCREENING QUESTIONS (When applicable) */}
        {currentStepType === 'screening' && (
          <Card className="p-6 md:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Employer Screening Questions
              </span>
              <p className="text-amber-700 dark:text-amber-300">
                The hiring team requires candidate responses for these qualification criteria. Questions marked with <strong className="text-red-600 dark:text-red-400">*</strong> are mandatory.
              </p>
            </div>

            <div className="space-y-6">
              {screeningQuestions.map((q, idx) => {
                const qKey = q._id || `q_${idx}`;
                const required = isQuestionRequired(q);
                const currentVal = screeningAnswers[qKey] || '';

                return (
                  <div key={qKey} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                    <label className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 block">
                      {idx + 1}. {getQuestionLabel(q)} {required && <span className="text-red-500 font-bold">*</span>}
                    </label>

                    {/* Numeric Input for Experience */}
                    {q.questionType === 'experience' && (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Enter total years of experience (e.g., 3)"
                        value={currentVal}
                        onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                        className="w-full max-w-xs p-3 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    )}

                    {/* Education Select Dropdown */}
                    {q.questionType === 'education' && (
                      <div className="w-full max-w-md">
                        <Select
                          placeholder="Select your education level..."
                          value={currentVal}
                          onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                          options={[
                            { value: 'high_school', label: 'High School Diploma / Secondary' },
                            { value: 'associate', label: 'Associate Degree' },
                            { value: 'bachelor', label: "Bachelor's Degree" },
                            { value: 'master', label: "Master's Degree" },
                            { value: 'doctorate', label: 'Doctorate / Ph.D.' },
                          ]}
                        />
                      </div>
                    )}

                    {/* Yes / No Choices */}
                    {(q.questionType === 'commute' || q.questionType === 'willingness_to_travel' || q.questionType === 'location') && (
                      <div className="flex gap-3 pt-1">
                        {['Yes', 'No'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswerChange(qKey, opt)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              currentVal === opt
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-subtle'
                                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Open-Ended & Other Question Types */}
                    {(q.questionType === 'custom_open_ended' || (q.questionType !== 'experience' && q.questionType !== 'education' && q.questionType !== 'commute' && q.questionType !== 'willingness_to_travel' && q.questionType !== 'location')) && (
                      <textarea
                        rows={3}
                        placeholder="Type your response here..."
                        value={currentVal}
                        onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                        className="w-full p-3 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 leading-relaxed"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="primary"
                onClick={handleProceedFromScreening}
                className="font-bold py-3 px-6 gap-2"
              >
                <span>Continue to Info & Resume</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: YOUR INFORMATION & RESUME */}
        {currentStepType === 'info' && (
          <Card className="p-6 md:p-8 space-y-6">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <UserCheck className="w-5 h-5 text-brand-600" />
              <span>Contact Information & Resume Selection</span>
            </h2>

            {/* Read-Only Candidate Info */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                  Applicant Profile (Read-Only)
                </span>
                <a
                  href="/dashboard/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <span>Edit Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block mb-0.5">Full Name</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {user?.fullName || profile?.fullName || 'Applicant'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Email Address</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Phone Number</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {profile?.phone || 'Not specified in profile'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resume Selection */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 block">
                Resume for this Application {job.requireResume !== false && <span className="text-red-500">*</span>}
              </label>

              {savedResumeUrl && !isUploadingCustomResume ? (
                <div className="p-5 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 block">
                          Using Saved Profile Resume
                        </span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                          {savedResumeFileName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={savedResumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview PDF</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setIsUploadingCustomResume(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Upload Different PDF
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="fullpage-resume-upload-input"
                    />
                    <label htmlFor="fullpage-resume-upload-input" className="cursor-pointer space-y-2 block">
                      <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                        {uploadedResumeFile ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center gap-1.5 text-sm">
                            <Check className="w-4 h-4" /> Selected: {uploadedResumeFile.name}
                          </span>
                        ) : (
                          'Click to browse and select a custom PDF resume'
                        )}
                      </span>
                      <span className="text-[11px] text-zinc-400 block">PDF files only (max 10MB)</span>
                    </label>
                  </div>

                  {savedResumeUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedResumeFile(null);
                        setIsUploadingCustomResume(false);
                      }}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline block text-center"
                    >
                      ← Revert to using saved profile resume ({savedResumeFileName})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {hasScreeningQuestions ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStepIndex(1)}
                  className="font-bold text-xs"
                >
                  ← Back to Questions
                </Button>
              ) : <div />}

              <Button
                type="button"
                variant="primary"
                disabled={!hasValidResume}
                onClick={() => {
                  setValidationError(null);
                  setCurrentStepIndex(hasScreeningQuestions ? 3 : 2);
                }}
                className="font-bold py-3 px-6 gap-2"
              >
                <span>Continue to Cover Letter</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: COVER LETTER */}
        {currentStepType === 'cover_letter' && (
          <Card className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-600" />
                  <span>Cover Letter (Optional)</span>
                </h2>
                <p className="text-xs text-zinc-500">
                  Generate a tailored cover letter with AI or write your own custom statement.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCoverLetterMode('ai')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    coverLetterMode === 'ai'
                      ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-subtle'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Generate with AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCoverLetterMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    coverLetterMode === 'manual'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-subtle'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Write My Own
                </button>
              </div>
            </div>

            {/* AI Generator Panel */}
            {coverLetterMode === 'ai' && (
              <div className="space-y-4 p-5 rounded-2xl border border-brand-200 dark:border-brand-900/60 bg-brand-50/30 dark:bg-brand-950/20">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Choose AI Tone of Voice
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['formal', 'friendly', 'confident'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAiTone(t)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border transition-all ${
                          aiTone === t
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {aiError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleGenerateAiCoverLetter}
                  isLoading={isGeneratingAi}
                  className="w-full py-3 font-bold gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingAi ? 'Generating Personalized Cover Letter...' : 'Generate AI Cover Letter'}</span>
                </Button>
              </div>
            )}

            {/* Editable Textarea for Cover Letter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Cover Letter Text (Editable)
                </label>
                {coverLetterText && (
                  <button
                    type="button"
                    onClick={() => setCoverLetterText('')}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Clear Text
                  </button>
                )}
              </div>

              <textarea
                rows={8}
                placeholder="Why are you a great fit for this position? Write your letter here or click 'Generate with AI' above."
                value={coverLetterText}
                onChange={(e) => setCoverLetterText(e.target.value)}
                className="w-full p-4 text-xs md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStepIndex(hasScreeningQuestions ? 2 : 1)}
                className="font-bold text-xs"
              >
                ← Back to Information
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStepIndex(hasScreeningQuestions ? 4 : 3)}
                className="font-bold py-3 px-6 gap-2"
              >
                <span>Continue to Review</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: FINAL REVIEW & SUBMIT */}
        {currentStepType === 'review' && (
          <Card className="p-6 md:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-xs space-y-1">
              <span className="font-bold block text-sm">Review Your Application</span>
              <p className="text-blue-700 dark:text-blue-300">
                Please double check all information below before submitting your application.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Contact Info Summary */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
                <span className="text-[10px] uppercase font-extrabold text-zinc-400 block">Contact Info</span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {user?.fullName || profile?.fullName || 'Applicant'} ({user?.email})
                </p>
                <p className="text-zinc-500">
                  Phone: {profile?.phone || 'Not specified'}
                </p>
              </div>

              {/* Selected Resume Summary */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 block">Resume Attachment</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(hasScreeningQuestions ? 2 : 1)}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Edit Resume
                  </button>
                </div>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                  {uploadedResumeFile ? uploadedResumeFile.name : savedResumeFileName || 'Profile Resume'}
                </p>
              </div>

              {/* Screening Answers Summary */}
              {hasScreeningQuestions && (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <span className="text-[10px] uppercase font-extrabold text-zinc-400 block">Screening Answers</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStepIndex(1)}
                      className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Edit Answers
                    </button>
                  </div>

                  <div className="space-y-3">
                    {screeningQuestions.map((q, idx) => {
                      const qKey = q._id || `q_${idx}`;
                      const ans = screeningAnswers[qKey] || 'Not answered';
                      return (
                        <div key={qKey} className="space-y-0.5">
                          <p className="font-semibold text-zinc-700 dark:text-zinc-300">{getQuestionLabel(q)}</p>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{ans}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cover Letter Summary */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 block">Cover Letter</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(hasScreeningQuestions ? 3 : 2)}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Edit Letter
                  </button>
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed italic">
                  {coverLetterText ? coverLetterText : 'No cover letter included.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStepIndex(hasScreeningQuestions ? 3 : 2)}
                className="font-bold text-xs"
              >
                ← Back to Cover Letter
              </Button>

              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleSubmitApplication}
                className="font-bold py-3 px-8 text-sm"
              >
                Submit Application
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
