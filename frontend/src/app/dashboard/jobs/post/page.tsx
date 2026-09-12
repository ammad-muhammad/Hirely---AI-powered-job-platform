'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { JobDescriptionRenderer } from '@/components/jobs/JobDescriptionRenderer';
import gsap from 'gsap';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  formatSalaryRange,
  formatWorkplaceType,
  formatHiringTimeline,
  formatContractDuration,
  formatExpectedHours,
  cleanEducationField,
} from '@/utils/formatters';
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  DollarSign,
  FileText,
  HelpCircle,
  Settings,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Save,
  Plus,
  X,
  Edit3,
  AlertCircle,
  Building2,
  ShieldAlert,
  Sparkles,
  Check,
  Globe,
  Mail,
  GraduationCap,
  Award,
  Loader2,
  Circle,
} from 'lucide-react';

interface ScreeningQuestion {
  questionType:
    | 'commute'
    | 'education'
    | 'experience'
    | 'language'
    | 'license_certification'
    | 'location'
    | 'willingness_to_travel'
    | 'custom'
    | 'custom_open_ended';
  questionText?: string;
  specificFieldRequirement?: string;
  experienceYears?: number;
  experienceTitle?: string;
  educationLevel?: string;
  isDealBreaker: boolean;
  isRequired?: boolean;
}

const getJobTypesArray = (val: string | string[] | undefined | null): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return ['full_time'];
};

interface ContractDuration {
  length: number;
  unit: 'days' | 'weeks' | 'months';
}

interface ExpectedHours {
  type: 'fixed' | 'range' | 'minimum' | 'maximum';
  fixedHours?: number;
  minHours?: number;
  maxHours?: number;
}

interface JobWizardState {
  title: string;
  workplaceType: 'on_site' | 'remote' | 'hybrid';
  location: string;
  hiringTimeline: '1_3_days' | '3_7_days' | '1_2_weeks' | '2_4_weeks' | 'more_than_4_weeks';
  numberOfHires: number;
  jobType: string[];
  expectedHours: ExpectedHours | null;
  contractDuration: ContractDuration | null;
  payShowBy: 'range' | 'exact' | 'starting_at' | 'maximum';
  salaryCurrency: string;
  salaryMin: string;
  salaryMax: string;
  payRate: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year';
  salaryDisclosed: boolean;
  category: string;
  experienceLevel: 'entry' | 'mid' | 'senior';
  description: string;
  responsibilities: string[];
  skillsRequired: string[];
  screeningQuestions: ScreeningQuestion[];
  applicationMethod: 'platform' | 'email';
  requireResume: boolean;
  candidatesCanContact: boolean;
  applicationDeadline: string;
  openings: number;
}

const initialWizardState: JobWizardState = {
  title: '',
  workplaceType: 'on_site',
  location: '',
  hiringTimeline: '1_2_weeks',
  numberOfHires: 1,
  jobType: ['full_time'],
  expectedHours: null,
  contractDuration: null,
  payShowBy: 'range',
  salaryCurrency: 'USD',
  salaryMin: '',
  salaryMax: '',
  payRate: 'per_year',
  salaryDisclosed: true,
  category: 'Software Engineering',
  experienceLevel: 'mid',
  description: '',
  responsibilities: [],
  skillsRequired: [],
  screeningQuestions: [],
  applicationMethod: 'platform',
  requireResume: true,
  candidatesCanContact: false,
  applicationDeadline: '',
  openings: 1,
};

const WIZARD_STEPS = [
  { step: 1, title: 'Basic Info', icon: Briefcase },
  { step: 2, title: 'Hiring Goals', icon: Users },
  { step: 3, title: 'Job Details', icon: Clock },
  { step: 4, title: 'Pay & Benefits', icon: DollarSign },
  { step: 5, title: 'Description', icon: FileText },
  { step: 6, title: 'Qualifications', icon: HelpCircle },
  { step: 7, title: 'App Settings', icon: Settings },
  { step: 8, title: 'Review & Publish', icon: CheckCircle2 },
];

export default function PostJobWizardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get('draftId') || searchParams.get('jobId') || searchParams.get('id');

  const [currentStep, setCurrentStep] = useState(1);
  const activeStepRef = React.useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentStep]);
  const [formData, setFormData] = useState<JobWizardState>(initialWizardState);
  const [draftJobId, setDraftJobId] = useState<string | null>(draftIdParam);
  const [initialPostStatus, setInitialPostStatus] = useState<'draft' | 'published'>('draft');
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  const [company, setCompany] = useState<{ companyName?: string; logoUrl?: string } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Temporary input helpers
  const [skillInput, setSkillInput] = useState('');
  const [respInput, setRespInput] = useState('');
  const [customQuestionInput, setCustomQuestionInput] = useState('');
  const [customQuestionRequired, setCustomQuestionRequired] = useState(true);

  const handleAddCustomQuestion = () => {
    if (!customQuestionInput.trim()) return;
    const newQ: ScreeningQuestion = {
      questionType: 'custom_open_ended',
      questionText: customQuestionInput.trim(),
      isDealBreaker: false,
      isRequired: customQuestionRequired,
    };
    updateForm({ screeningQuestions: [...formData.screeningQuestions, newQ] });
    setCustomQuestionInput('');
    setCustomQuestionRequired(true);
  };

  // AI-Assisted Job Posting State & Wizard Checklist Progress
  const CHECKLIST_STEPS = useMemo(
    () => [
      { id: 1, label: 'Basic Info & Hiring Goals' },
      { id: 2, label: 'Employment Type & Schedule' },
      { id: 3, label: 'Compensation & Pay Structure' },
      { id: 4, label: 'Applicant Qualifications & Screening' },
      { id: 5, label: 'Job Description & Responsibilities' },
    ],
    []
  );

  const [isAiMode, setIsAiMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentChecklistIndex, setCurrentChecklistIndex] = useState(0);
  const [aiConversationHistory, setAiConversationHistory] = useState<Array<{ sender: string; text: string }>>([]);
  const [aiBannerNote, setAiBannerNote] = useState<string | null>(null);

  const aiLoadingRef = React.useRef<HTMLDivElement>(null);
  const aiIconRef = React.useRef<HTMLDivElement>(null);

  // GSAP pulse animation on the AI icon when loading
  useEffect(() => {
    if (isAiLoading && aiIconRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        const tween = gsap.to(aiIconRef.current, {
          scale: 1.18,
          duration: 0.75,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        return () => {
          tween.kill();
        };
      }
    }
  }, [isAiLoading]);

  // Screening question modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<ScreeningQuestion['questionType']>('education');
  const [educationLevel, setEducationLevel] = useState("Bachelor's degree");
  const [specificFieldRequirement, setSpecificFieldRequirement] = useState('');
  const [experienceYears, setExperienceYears] = useState(3);
  const [experienceTitle, setExperienceTitle] = useState('');
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [newQuestionDealBreaker, setNewQuestionDealBreaker] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const currentMsg = aiInput.trim();
    setIsAiLoading(true);
    setCurrentChecklistIndex(0);
    setErrorMessage(null);

    const updatedHistory = [...aiConversationHistory, { sender: 'user', text: currentMsg }];
    setAiConversationHistory(updatedHistory);
    setAiInput('');

    // Paced 4.2s minimum animation helper (~850ms per step for 5 steps)
    const runPacedChecklist = async () => {
      for (let i = 0; i < CHECKLIST_STEPS.length; i++) {
        setCurrentChecklistIndex(i);
        await new Promise((resolve) => setTimeout(resolve, 850));
      }
      setCurrentChecklistIndex(CHECKLIST_STEPS.length);
      await new Promise((resolve) => setTimeout(resolve, 300));
    };

    try {
      const apiPromise = api.post('/jobs/ai-assist', {
        message: currentMsg,
        conversationHistory: updatedHistory,
      });

      const animPromise = runPacedChecklist();

      const [res] = await Promise.all([apiPromise, animPromise]);

      if (res.data?.success) {
        const { status, filledFields, clarifyingQuestion } = res.data;
        const assistantTurnCount = updatedHistory.filter((h) => h.sender === 'assistant').length + 1;

        if (status === 'needs_clarification' && clarifyingQuestion && assistantTurnCount <= 2) {
          // Persist the AI clarifying question in conversation history
          setAiConversationHistory([...updatedHistory, { sender: 'assistant', text: clarifyingQuestion }]);
        } else {
          // Pre-fill all fields across all 8 wizard steps
          if (filledFields) {
            updateForm({
              title: filledFields.title || formData.title,
              workplaceType: filledFields.workplaceType || formData.workplaceType,
              location: filledFields.location || formData.location,
              hiringTimeline: filledFields.hiringTimeline || formData.hiringTimeline,
              numberOfHires: filledFields.numberOfHires || formData.numberOfHires,
              jobType: filledFields.jobType ? getJobTypesArray(filledFields.jobType) : formData.jobType,
              expectedHours: filledFields.expectedHours !== undefined ? filledFields.expectedHours : formData.expectedHours,
              contractDuration: filledFields.contractDuration !== undefined ? filledFields.contractDuration : formData.contractDuration,
              payShowBy: filledFields.payShowBy || formData.payShowBy,
              salaryCurrency: filledFields.salaryCurrency || formData.salaryCurrency,
              salaryMin: filledFields.salaryMin !== undefined ? String(filledFields.salaryMin) : formData.salaryMin,
              salaryMax: filledFields.salaryMax !== undefined ? String(filledFields.salaryMax) : formData.salaryMax,
              payRate: filledFields.payRate || formData.payRate,
              category: filledFields.category || formData.category,
              experienceLevel: filledFields.experienceLevel || formData.experienceLevel,
              description: filledFields.description || formData.description,
              responsibilities: Array.isArray(filledFields.responsibilities) && filledFields.responsibilities.length > 0
                ? filledFields.responsibilities
                : formData.responsibilities,
              skillsRequired: Array.isArray(filledFields.skillsRequired) && filledFields.skillsRequired.length > 0
                ? filledFields.skillsRequired
                : formData.skillsRequired,
              screeningQuestions: Array.isArray(filledFields.screeningQuestions) && filledFields.screeningQuestions.length > 0
                ? filledFields.screeningQuestions
                : formData.screeningQuestions,
              applicationMethod: filledFields.applicationMethod || formData.applicationMethod,
              requireResume: filledFields.requireResume !== undefined ? filledFields.requireResume : formData.requireResume,
              candidatesCanContact: filledFields.candidatesCanContact !== undefined ? filledFields.candidatesCanContact : formData.candidatesCanContact,
              applicationDeadline: filledFields.applicationDeadline || formData.applicationDeadline,
              openings: filledFields.numberOfHires || formData.openings,
            });
          }

          setAiBannerNote('✨ AI has pre-filled all requisition details based on your description. Review and edit any field below before publishing.');
          setIsAiMode(false);
          setCurrentStep(8); // Jump directly to Step 8 (Review & Publish)
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(apiErr.response?.data?.message || apiErr.message || 'AI generation failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Verify company & load draft/job if param exists
  useEffect(() => {
    async function initPage() {
      if (!user) return;
      if (user.role !== 'employer') {
        router.push('/dashboard');
        return;
      }
      try {
        setIsLoadingProfile(true);
        const compRes = await api.get('/companies/me').catch(() => null);
        if (compRes?.data?.success && compRes.data?.data) {
          setCompany(compRes.data.data);
        } else if (!draftIdParam) {
          router.push('/dashboard/company/setup');
          return;
        }

        // If resuming a draft or editing a published job
        if (draftIdParam) {
          const jobRes = await api.get(`/jobs/${draftIdParam}`);
          if (jobRes.data?.success && jobRes.data?.data) {
            const j = jobRes.data.data;
            setInitialPostStatus(j.postStatus === 'published' ? 'published' : 'draft');
            setFormData({
              title: j.title || '',
              workplaceType: j.workplaceType || 'on_site',
              location: j.location || '',
              hiringTimeline: j.hiringTimeline || '1_2_weeks',
              numberOfHires: j.numberOfHires || 1,
              jobType: j.jobType || 'full_time',
              expectedHours: j.expectedHours || null,
              contractDuration: j.contractDuration || null,
              payShowBy: j.payShowBy || 'range',
              salaryCurrency: j.salaryCurrency || 'USD',
              salaryMin: j.salaryMin !== null && j.salaryMin !== undefined ? String(j.salaryMin) : '',
              salaryMax: j.salaryMax !== null && j.salaryMax !== undefined ? String(j.salaryMax) : '',
              payRate: j.payRate || 'per_year',
              salaryDisclosed: j.salaryDisclosed !== undefined ? Boolean(j.salaryDisclosed) : true,
              category: j.category || 'Software Engineering',
              experienceLevel: j.experienceLevel || 'mid',
              description: j.description || '',
              responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities : [],
              skillsRequired: Array.isArray(j.skillsRequired) ? j.skillsRequired : [],
              screeningQuestions: Array.isArray(j.screeningQuestions) ? j.screeningQuestions : [],
              applicationMethod: j.applicationMethod || 'platform',
              requireResume: j.requireResume !== undefined ? Boolean(j.requireResume) : true,
              candidatesCanContact: Boolean(j.candidatesCanContact),
              applicationDeadline: j.applicationDeadline
                ? new Date(j.applicationDeadline).toISOString().split('T')[0]
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              openings: j.openings || 1,
            });
            setDraftJobId(j._id);
            setIsDirty(false);
          }
        }
      } catch (err) {
        console.error('Failed to initialize post job wizard:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    initPage();
  }, [user, router, draftIdParam]);

  // Unsaved changes browser close/refresh protection (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Save as draft before leaving, or your progress may be lost.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Global anchor click interceptor for in-app unsaved changes navigation
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty) return;
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href) {
        const url = new URL(target.href);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigationUrl(url.pathname + url.search);
          setShowUnsavedModal(true);
        }
      }
    };

    window.addEventListener('click', handleAnchorClick, true);
    return () => window.removeEventListener('click', handleAnchorClick, true);
  }, [isDirty]);

  // Handle Form Change Helper
  const updateForm = (fields: Partial<JobWizardState>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    setIsDirty(true);
    setErrorMessage(null);
  };

  // Save Draft / Save Progress (API call)
  const handleSaveDraft = async (exitAfterSave = false, showToastOrBanner = false) => {
    try {
      setIsSaving(true);
      if (showToastOrBanner) setErrorMessage(null);

      const payload = {
        ...formData,
        postStatus: initialPostStatus === 'published' ? 'published' : 'draft',
      };

      let response;
      if (draftJobId) {
        response = await api.put(`/jobs/${draftJobId}`, payload);
      } else {
        response = await api.post('/jobs', payload);
      }

      if (response.data?.success && response.data?.data) {
        const savedId = response.data.data._id;
        setDraftJobId(savedId);
        setIsDirty(false);
        if (exitAfterSave) {
          router.push('/dashboard/jobs');
        }
      }
    } catch (err: unknown) {
      if (showToastOrBanner) {
        const msg = err instanceof Error ? err.message : 'Failed to save changes.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Save Changes for an already Published Job
  const handleSavePublishedJob = async () => {
    try {
      setIsPublishing(true);
      setErrorMessage(null);

      if (!formData.title.trim()) {
        setErrorMessage('Job title is required.');
        setCurrentStep(1);
        return;
      }
      if (formData.workplaceType !== 'remote' && !formData.location.trim()) {
        setErrorMessage('Job location city is required for On-site/Hybrid roles.');
        setCurrentStep(1);
        return;
      }

      const plainTextDesc = formData.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (!formData.description || plainTextDesc.length < 20) {
        setErrorMessage('Full job description is required (minimum 20 characters of plain text).');
        setCurrentStep(5);
        return;
      }

      const payload = {
        ...formData,
        postStatus: 'published',
      };

      if (draftJobId) {
        const response = await api.put(`/jobs/${draftJobId}`, payload);
        if (response.data?.success) {
          setIsDirty(false);
          router.push('/dashboard/jobs');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save job changes.';
      setErrorMessage(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // Publish Job (API call for drafts)
  const handlePublishJob = async () => {
    try {
      setIsPublishing(true);
      setErrorMessage(null);

      // Validate required fields before publish
      if (!formData.title.trim()) {
        setErrorMessage('Job title is required.');
        setCurrentStep(1);
        return;
      }
      if (formData.workplaceType !== 'remote' && !formData.location.trim()) {
        setErrorMessage('Job location city is required for On-site/Hybrid roles.');
        setCurrentStep(1);
        return;
      }

      const plainTextDesc = formData.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (!formData.description || plainTextDesc.length < 20) {
        setErrorMessage('Full job description is required (minimum 20 characters of plain text).');
        setCurrentStep(5);
        return;
      }

      let targetId = draftJobId;

      // Save latest fields first
      const payload = {
        ...formData,
        postStatus: 'published',
      };

      if (!targetId) {
        const createRes = await api.post('/jobs', payload);
        if (createRes.data?.success && createRes.data?.data) {
          targetId = createRes.data.data._id;
        }
      } else {
        await api.put(`/jobs/${targetId}`, payload);
      }

      if (targetId) {
        const pubRes = await api.put(`/jobs/${targetId}/publish`);
        if (pubRes.data?.success) {
          setIsDirty(false);
          router.push('/dashboard/jobs');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish job.';
      setErrorMessage(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // Step Validation before "Next"
  const validateCurrentStep = (): boolean => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (!formData.title.trim()) {
        setErrorMessage('Please enter a valid job title.');
        return false;
      }
      if (formData.workplaceType !== 'remote' && !formData.location.trim()) {
        setErrorMessage('Please specify the city/location for On-site or Hybrid roles.');
        return false;
      }
    }

    if (currentStep === 5) {
      const plainText = formData.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (!formData.description || plainText.length < 20) {
        setErrorMessage('Job description must be at least 20 characters long (plain text).');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < 8) {
        setCurrentStep(currentStep + 1);
        handleSaveDraft(false, false);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrorMessage(null);
    }
  };

  // Screening Question Helper with Flexible Specific Inputs
  const handleAddQuestion = () => {
    setModalError(null);
    let questionText = '';
    let specField: string | undefined = undefined;
    let expYrs: number | undefined = undefined;
    let expTitle: string | undefined = undefined;
    let eduLvl: string | undefined = undefined;

    if (newQuestionType === 'education') {
      eduLvl = educationLevel;
      const cleanedField = cleanEducationField(educationLevel, specificFieldRequirement);
      if (cleanedField) {
        specField = cleanedField;
        questionText = `${educationLevel} in ${specField} required`;
      } else {
        questionText = `${educationLevel} required`;
      }
    } else if (newQuestionType === 'experience') {
      if (!experienceTitle.trim()) {
        setModalError('Please specify the experience domain (e.g. backend development, React).');
        return;
      }
      expYrs = experienceYears || 1;
      expTitle = experienceTitle.trim();
      questionText = `Must have ${expYrs}+ years of experience in ${expTitle}`;
    } else if (newQuestionType === 'custom') {
      if (!customQuestionText.trim()) {
        setModalError('Please enter your custom qualification requirement text.');
        return;
      }
      questionText = customQuestionText.trim();
    } else if (newQuestionType === 'license_certification') {
      if (!customQuestionText.trim()) {
        setModalError('Please specify the required license or certification name.');
        return;
      }
      questionText = `${customQuestionText.trim()} license or certification required`;
    } else if (newQuestionType === 'commute') {
      if (!customQuestionText.trim()) {
        setModalError('Please specify commute or relocation location details.');
        return;
      }
      questionText = `Must be able to commute or relocate to ${customQuestionText.trim()}`;
    } else {
      questionText = customQuestionText.trim() || 'Must meet the specified qualification requirement';
    }

    const newQuestion: ScreeningQuestion = {
      questionType: newQuestionType,
      questionText,
      specificFieldRequirement: specField,
      experienceYears: expYrs,
      experienceTitle: expTitle,
      educationLevel: eduLvl,
      isDealBreaker: newQuestionDealBreaker,
    };

    updateForm({
      screeningQuestions: [...formData.screeningQuestions, newQuestion],
    });

    // Reset modal fields
    setSpecificFieldRequirement('');
    setExperienceTitle('');
    setCustomQuestionText('');
    setNewQuestionDealBreaker(false);
    setModalError(null);
    setShowQuestionModal(false);
  };

  const handleRemoveQuestion = (idx: number) => {
    updateForm({
      screeningQuestions: formData.screeningQuestions.filter((_, i) => i !== idx),
    });
  };

  const handleToggleDealBreaker = (idx: number) => {
    const updated = [...formData.screeningQuestions];
    updated[idx].isDealBreaker = !updated[idx].isDealBreaker;
    updateForm({ screeningQuestions: updated });
  };

  if (isLoadingProfile) {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex items-center justify-center text-xs font-semibold text-zinc-500">
          Loading job requisition workspace...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans pb-16 max-w-4xl mx-auto">
        {/* TOP HEADER & EXIT BAR */}
        <GSAPReveal direction="down" distance={16}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-zinc-500" />
                <span>{initialPostStatus === 'published' ? 'Edit Published Job Opening' : 'Post a Job Opening'}</span>
                {draftJobId && (
                  <Badge variant={initialPostStatus === 'published' ? 'success' : 'warning'} size="sm" className="text-[10px] uppercase font-bold">
                    {initialPostStatus === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Streamlined multi-step hiring requisition workflow for {company?.companyName || 'your organization'}.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveDraft(true, true)}
                isLoading={isSaving}
                className="text-xs font-semibold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> {initialPostStatus === 'published' ? 'Save Changes' : 'Save & Exit'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isDirty) {
                    setPendingNavigationUrl('/dashboard/jobs');
                    setShowUnsavedModal(true);
                  } else {
                    router.push('/dashboard/jobs');
                  }
                }}
                className="text-xs font-semibold gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        </GSAPReveal>

        {/* PROGRESS STEP INDICATOR BAR */}
        <GSAPReveal direction="up" distance={16} delay={0.05} className="relative z-30">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>Step {currentStep} of 8:</span>
                <span className="text-zinc-500 font-bold">
                  {currentStep === 8 && initialPostStatus === 'published' ? 'Review & Save' : WIZARD_STEPS[currentStep - 1].title}
                </span>
              </span>
              <span className="text-zinc-400 text-[11px]">
                {Boolean(draftJobId || draftIdParam) ? 100 : Math.round((currentStep / 8) * 100)}% Complete
              </span>
            </div>

            {/* Progress Bar Line */}
            <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                style={{ width: `${Boolean(draftJobId || draftIdParam) ? 100 : (currentStep / 8) * 100}%` }}
                className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300"
              />
            </div>

            {/* Step Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1 w-full">
              {WIZARD_STEPS.map((s) => {
                const IconComp = s.icon;
                const isPassed = s.step < currentStep;
                const isCurrent = s.step === currentStep;
                const isEditMode = Boolean(draftJobId || draftIdParam);
                const isClickable = isEditMode || s.step <= currentStep;
                const titleText = s.step === 8 && initialPostStatus === 'published' ? 'Review & Save' : s.title;

                return (
                  <button
                    key={s.step}
                    ref={isCurrent ? activeStepRef : null}
                    type="button"
                    onClick={() => isClickable && setCurrentStep(s.step)}
                    disabled={!isClickable}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap select-none ${
                      isCurrent
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-subtle'
                        : isClickable
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer'
                        : 'text-zinc-400 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isPassed ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <IconComp className="w-3 h-3 shrink-0" />}
                    <span>{titleText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </GSAPReveal>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-zinc-500" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Step 1 — Basic Information
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Define the position title & workplace setup, or let AI generate the entire requisition.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAiMode(true)}
                  className="shrink-0 gap-1.5 font-bold"
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>✨ Fill with AI</span>
                </Button>
              </div>

              <Input
                label="Job Title *"
                placeholder="e.g. Senior Full-Stack Engineer (React / Node.js)"
                value={formData.title}
                onChange={(e) => updateForm({ title: e.target.value })}
              />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Workplace Location Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'on_site', label: 'On-site', desc: 'Employees work physically at specified office' },
                    { id: 'remote', label: 'Remote', desc: 'Employees work from home anywhere' },
                    { id: 'hybrid', label: 'Hybrid', desc: 'Mix of office and remote work flexibility' },
                  ].map((wp) => (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() =>
                        updateForm({
                          workplaceType: wp.id as any,
                          location: wp.id === 'remote' ? 'Remote' : formData.location === 'Remote' ? '' : formData.location,
                        })
                      }
                      className={`p-4 rounded-xl border text-left transition-all select-none space-y-1 ${
                        formData.workplaceType === wp.id
                          ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800 shadow-subtle ring-1 ring-zinc-900 dark:ring-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 block">{wp.label}</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug block">{wp.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.workplaceType !== 'remote' && (
                <Input
                  label="Office Location / City *"
                  placeholder="e.g. San Francisco, CA or Karachi, Pakistan"
                  value={formData.location}
                  onChange={(e) => updateForm({ location: e.target.value })}
                  helperText="Specify the office address or city where employees will be based."
                />
              )}
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 2: HIRING GOALS */}
        {currentStep === 2 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <Users className="w-5 h-5 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Step 2 — Hiring Goals & Timeline
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tell us how quickly you need to fill this role and how many hires are planned.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select
                  label="Hiring Timeline Target *"
                  value={formData.hiringTimeline}
                  onChange={(e) => updateForm({ hiringTimeline: e.target.value as any })}
                  options={[
                    { value: '1_3_days', label: '1 - 3 Days (Urgent Urgent)' },
                    { value: '3_7_days', label: '3 - 7 Days (Fast-Track)' },
                    { value: '1_2_weeks', label: '1 - 2 Weeks (Standard)' },
                    { value: '2_4_weeks', label: '2 - 4 Weeks (Planned)' },
                    { value: 'more_than_4_weeks', label: 'More than 4 Weeks (Pipeline)' },
                  ]}
                />

                <Input
                  label="Number of Planned Hires *"
                  type="number"
                  min="1"
                  value={String(formData.numberOfHires)}
                  onChange={(e) => updateForm({ numberOfHires: parseInt(e.target.value, 10) || 1 })}
                  helperText="How many candidates do you plan to hire for this position in the next 30 days?"
                />
              </div>
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 3: JOB DETAILS */}
        {currentStep === 3 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <Clock className="w-5 h-5 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Step 3 — Employment Type & Schedule
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select employment nature, contract terms, or expected hours.
                  </p>
                </div>
              </div>

              {/* Job Type Chips (Multi-Select) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Employment Type * <span className="text-[11px] font-normal text-zinc-500">(Select all that apply)</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {getJobTypesArray(formData.jobType).length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'full_time', label: 'Full-time' },
                    { id: 'part_time', label: 'Part-time' },
                    { id: 'contract', label: 'Contract' },
                    { id: 'temporary', label: 'Temporary' },
                    { id: 'internship', label: 'Internship' },
                    { id: 'commission', label: 'Commission' },
                    { id: 'new_grad', label: 'New-Grad' },
                    { id: 'permanent', label: 'Permanent' },
                  ].map((jt) => {
                    const currentTypes = getJobTypesArray(formData.jobType);
                    const isSelected = currentTypes.includes(jt.id);

                    const handleToggle = () => {
                      let updated: string[];
                      if (isSelected) {
                        if (currentTypes.length === 1) return; // Keep at least one selected
                        updated = currentTypes.filter((t) => t !== jt.id);
                      } else {
                        updated = [...currentTypes, jt.id];
                      }
                      updateForm({ jobType: updated });
                    };

                    return (
                      <button
                        key={jt.id}
                        type="button"
                        onClick={handleToggle}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none border flex items-center gap-2 ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 shadow-subtle'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-zinc-400 dark:border-zinc-600'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span>{jt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Part-Time Expected Hours */}
              {getJobTypesArray(formData.jobType).includes('part_time') && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-4">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Part-time Expected Hours Configuration
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Hours Requirement Type"
                      value={formData.expectedHours?.type || 'fixed'}
                      onChange={(e) =>
                        updateForm({
                          expectedHours: {
                            type: e.target.value as any,
                            fixedHours: 20,
                          },
                        })
                      }
                      options={[
                        { value: 'fixed', label: 'Fixed Hours per week' },
                        { value: 'range', label: 'Range (Min & Max)' },
                        { value: 'minimum', label: 'Minimum Hours' },
                        { value: 'maximum', label: 'Maximum Hours' },
                      ]}
                    />

                    {formData.expectedHours?.type === 'fixed' && (
                      <Input
                        label="Fixed Hours Per Week"
                        type="number"
                        value={String(formData.expectedHours?.fixedHours || 20)}
                        onChange={(e) =>
                          updateForm({
                            expectedHours: {
                              type: 'fixed',
                              fixedHours: parseInt(e.target.value, 10) || 0,
                            },
                          })
                        }
                      />
                    )}

                    {formData.expectedHours?.type === 'range' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Min Hours"
                          type="number"
                          value={String(formData.expectedHours?.minHours || 10)}
                          onChange={(e) =>
                            updateForm({
                              expectedHours: {
                                ...formData.expectedHours!,
                                type: 'range',
                                minHours: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                        />
                        <Input
                          label="Max Hours"
                          type="number"
                          value={String(formData.expectedHours?.maxHours || 30)}
                          onChange={(e) =>
                            updateForm({
                              expectedHours: {
                                ...formData.expectedHours!,
                                type: 'range',
                                maxHours: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Contract / Temporary Duration */}
              {(getJobTypesArray(formData.jobType).includes('contract') || getJobTypesArray(formData.jobType).includes('temporary')) && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-4">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Contract / Temporary Duration
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Contract Length"
                      type="number"
                      min="1"
                      value={String(formData.contractDuration?.length || 6)}
                      onChange={(e) =>
                        updateForm({
                          contractDuration: {
                            length: parseInt(e.target.value, 10) || 1,
                            unit: formData.contractDuration?.unit || 'months',
                          },
                        })
                      }
                    />

                    <Select
                      label="Duration Unit"
                      value={formData.contractDuration?.unit || 'months'}
                      onChange={(e) =>
                        updateForm({
                          contractDuration: {
                            length: formData.contractDuration?.length || 6,
                            unit: e.target.value as any,
                          },
                        })
                      }
                      options={[
                        { value: 'days', label: 'Days' },
                        { value: 'weeks', label: 'Weeks' },
                        { value: 'months', label: 'Months' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 4: PAY & BENEFITS */}
        {currentStep === 4 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <DollarSign className="w-5 h-5 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Step 4 — Compensation & Pay Structure
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Set salary figures, currency, pay frequency rate, and public disclosure settings.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Show Pay By *"
                  value={formData.payShowBy}
                  onChange={(e) => updateForm({ payShowBy: e.target.value as any })}
                  options={[
                    { value: 'range', label: 'Salary Range (Min - Max)' },
                    { value: 'exact', label: 'Exact Amount' },
                    { value: 'starting_at', label: 'Starting At' },
                    { value: 'maximum', label: 'Maximum Up To' },
                  ]}
                />

                <Select
                  label="Pay Currency *"
                  value={formData.salaryCurrency}
                  onChange={(e) => updateForm({ salaryCurrency: e.target.value })}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'PKR', label: 'PKR (Rs.)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'CAD', label: 'CAD (CA$)' },
                    { value: 'AUD', label: 'AUD (A$)' },
                    { value: 'AED', label: 'AED (AED)' },
                    { value: 'SAR', label: 'SAR (SAR)' },
                    { value: 'INR', label: 'INR (₹)' },
                  ]}
                />

                <Select
                  label="Pay Rate Interval *"
                  value={formData.payRate}
                  onChange={(e) => updateForm({ payRate: e.target.value as any })}
                  options={[
                    { value: 'per_hour', label: 'Per Hour' },
                    { value: 'per_day', label: 'Per Day' },
                    { value: 'per_week', label: 'Per Week' },
                    { value: 'per_month', label: 'Per Month' },
                    { value: 'per_year', label: 'Per Year' },
                  ]}
                />
              </div>

              {/* Pay Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(formData.payShowBy === 'range' || formData.payShowBy === 'exact' || formData.payShowBy === 'starting_at') && (
                  <Input
                    label={formData.payShowBy === 'range' ? `Minimum Pay (${formData.salaryCurrency})` : `Pay Amount (${formData.salaryCurrency})`}
                    type="number"
                    placeholder="e.g. 90000"
                    value={formData.salaryMin}
                    onChange={(e) => updateForm({ salaryMin: e.target.value })}
                  />
                )}

                {(formData.payShowBy === 'range' || formData.payShowBy === 'maximum') && (
                  <Input
                    label={formData.payShowBy === 'range' ? `Maximum Pay (${formData.salaryCurrency})` : `Maximum Pay Amount (${formData.salaryCurrency})`}
                    type="number"
                    placeholder="e.g. 130000"
                    value={formData.salaryMax}
                    onChange={(e) => updateForm({ salaryMax: e.target.value })}
                  />
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Disclose Compensation Publicly
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Display pay figures on job cards to increase qualified candidate conversion.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.salaryDisclosed}
                  onChange={(e) => updateForm({ salaryDisclosed: e.target.checked })}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 5: JOB DESCRIPTION */}
        {currentStep === 5 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <FileText className="w-5 h-5 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Step 5 — Role Description & Technical Skills
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Detail the position summary, responsibilities, and required candidate skills with rich document formatting.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Category / Industry *"
                  placeholder="e.g. Software Engineering"
                  value={formData.category}
                  onChange={(e) => updateForm({ category: e.target.value })}
                />

                <Select
                  label="Experience Level *"
                  value={formData.experienceLevel}
                  onChange={(e) => updateForm({ experienceLevel: e.target.value as any })}
                  options={[
                    { value: 'entry', label: 'Entry Level' },
                    { value: 'mid', label: 'Mid Level' },
                    { value: 'senior', label: 'Senior Level' },
                  ]}
                />
              </div>

              {/* Tiptap Rich Text Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Full Job Description * (Rich Text Editor)
                </label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(html) => updateForm({ description: html })}
                  minChars={20}
                />
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Required Technical Skills (Tags)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add required skill (e.g. Next.js) and press Enter"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (skillInput.trim() && !formData.skillsRequired.includes(skillInput.trim())) {
                          updateForm({ skillsRequired: [...formData.skillsRequired, skillInput.trim()] });
                          setSkillInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (skillInput.trim() && !formData.skillsRequired.includes(skillInput.trim())) {
                        updateForm({ skillsRequired: [...formData.skillsRequired, skillInput.trim()] });
                        setSkillInput('');
                      }
                    }}
                    className="shrink-0 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Tag
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.skillsRequired.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 select-none"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => updateForm({ skillsRequired: formData.skillsRequired.filter((s) => s !== skill) })}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Key Responsibilities List
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add key responsibility bullet point"
                    value={respInput}
                    onChange={(e) => setRespInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (respInput.trim()) {
                          updateForm({ responsibilities: [...formData.responsibilities, respInput.trim()] });
                          setRespInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (respInput.trim()) {
                        updateForm({ responsibilities: [...formData.responsibilities, respInput.trim()] });
                        setRespInput('');
                      }
                    }}
                    className="shrink-0 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Point
                  </Button>
                </div>

                <ul className="space-y-2 pt-1">
                  {formData.responsibilities.map((resp, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="flex items-center gap-2 min-w-0 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0" />
                        <span className="truncate">{resp}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateForm({
                            responsibilities: formData.responsibilities.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 6: SCREENING QUESTIONS */}
        {currentStep === 6 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-zinc-500" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Step 6 — Applicant Qualifications & Screening
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Add screening questions and deal-breaker rules to flag unqualified applicants.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setModalError(null);
                    setShowQuestionModal(true);
                  }}
                  className="font-bold text-xs gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Qualification
                </Button>
              </div>

              {/* Added Questions List */}
              {formData.screeningQuestions.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
                  <ShieldAlert className="w-8 h-8 text-zinc-400 mx-auto" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    No screening questions added yet (Optional)
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Screening questions help automatically filter candidates based on commute, degree fields, experience domain, or custom free-form questions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.screeningQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" size="sm" className="capitalize text-[10px] font-bold">
                            {q.questionType === 'custom_open_ended' ? 'Custom Question' : q.questionType.replace('_', ' ')}
                          </Badge>
                          {q.isDealBreaker && (
                            <Badge variant="danger" size="sm" className="text-[10px] font-extrabold gap-1">
                              <ShieldAlert className="w-3 h-3" /> Deal-breaker
                            </Badge>
                          )}
                          {q.questionType === 'custom_open_ended' && (
                            <Badge
                              variant={q.isRequired !== false ? 'info' : 'outline'}
                              size="sm"
                              className="text-[10px] font-bold"
                            >
                              {q.isRequired !== false ? 'Required' : 'Optional'}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {q.questionText}
                        </p>

                        {q.specificFieldRequirement && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <GraduationCap className="w-3 h-3 text-zinc-400" />
                            <span>Specific Field: <strong className="text-zinc-800 dark:text-zinc-200">{q.specificFieldRequirement}</strong></span>
                          </div>
                        )}

                        {q.experienceTitle && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Award className="w-3 h-3 text-zinc-400" />
                            <span>Experience Domain: <strong className="text-zinc-800 dark:text-zinc-200">{q.experienceYears || 1}+ yrs in {q.experienceTitle}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        {q.questionType !== 'custom_open_ended' && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={q.isDealBreaker}
                              onChange={() => handleToggleDealBreaker(idx)}
                              className="rounded text-zinc-900 focus:ring-zinc-900"
                            />
                            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Deal-breaker</span>
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="text-zinc-400 hover:text-red-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DEDICATED SECTION: Additional Questions for Candidates (Optional) */}
              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Additional Questions for Candidates (Optional)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ask candidates free-form questions in their own words (e.g. "What city do you live in?" or "Why are you looking for a new role?").
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Input
                    placeholder="Type your question for candidate (e.g. Why are you interested in this role?)"
                    value={customQuestionInput}
                    onChange={(e) => setCustomQuestionInput(e.target.value)}
                    className="flex-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomQuestion();
                      }
                    }}
                  />
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customQuestionRequired}
                        onChange={(e) => setCustomQuestionRequired(e.target.checked)}
                        className="rounded text-zinc-900 focus:ring-zinc-900"
                      />
                      <span>Required</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomQuestion}
                      className="font-bold text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 7: APPLICATION SETTINGS */}
        {currentStep === 7 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <Settings className="w-5 h-5 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Step 7 — Application Methods & Privacy Settings
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Control how candidates submit applications and initiate contact.
                  </p>
                </div>
              </div>

              {/* Application Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Application Method *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'platform',
                      label: 'Hirely Platform Dashboard (Recommended)',
                      desc: 'Applications submit directly to your employer dashboard with full resume PDF reader and candidate tracking.',
                      icon: Globe,
                    },
                    {
                      id: 'email',
                      label: 'Direct Email Dispatch',
                      desc: 'Applications get emailed directly to your registered employer email address.',
                      icon: Mail,
                    },
                  ].map((am) => {
                    const IconComp = am.icon;
                    return (
                      <button
                        key={am.id}
                        type="button"
                        onClick={() => updateForm({ applicationMethod: am.id as any })}
                        className={`p-4 rounded-xl border text-left transition-all select-none space-y-2 ${
                          formData.applicationMethod === am.id
                            ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800 shadow-subtle ring-1 ring-zinc-900 dark:ring-zinc-100'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComp className="w-4 h-4 text-zinc-500" />
                          <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 block">{am.label}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed block">{am.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Require Candidate Resume PDF
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Mandate PDF resume attachments for all candidate application submissions.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.requireResume}
                    onChange={(e) => updateForm({ requireResume: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Allow Direct Candidate Contact Before Shortlisting
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Permit candidates to message your employer account before being moved to shortlisted stage.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.candidatesCanContact}
                    onChange={(e) => updateForm({ candidatesCanContact: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Application Deadline (Optional)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Set a closing date for candidate applications. Leave empty if there is no set deadline ("Until Filled").
                    </span>
                  </div>
                  <input
                    type="date"
                    value={formData.applicationDeadline || ''}
                    onChange={(e) => updateForm({ applicationDeadline: e.target.value })}
                    className="px-3.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 shrink-0"
                  />
                </div>
              </div>
            </Card>
          </GSAPReveal>
        )}

        {/* STEP 8: REVIEW & PUBLISH */}
        {currentStep === 8 && (
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Step 8 — Review & Publish Job Requisition
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Verify all requisition parameters before publishing live.
                  </p>
                </div>
              </div>

              {/* AI Banner Note if filled by AI */}
              {aiBannerNote && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold">{aiBannerNote}</span>
                  </div>
                  <button type="button" onClick={() => setAiBannerNote(null)} className="text-emerald-600 hover:text-emerald-800 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Summary Cards */}
              <div className="space-y-4 text-xs">
                {/* Basic Info Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">Basic Info</span>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <div>Title: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formData.title || 'N/A'}</span></div>
                    <div>Category: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formData.category || 'General'}</span></div>
                    <div>Workplace: <span className="font-bold capitalize text-zinc-900 dark:text-zinc-100">{formatWorkplaceType(formData.workplaceType)}</span></div>
                    <div>Location: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formData.location || 'Remote'}</span></div>
                  </div>
                </div>

                {/* Goals & Details Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">Hiring Goals & Details</span>
                    <button type="button" onClick={() => setCurrentStep(3)} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <div>Hiring Speed: <span className="font-bold capitalize text-zinc-900 dark:text-zinc-100">{formatHiringTimeline(formData.hiringTimeline)}</span></div>
                    <div>Hires Needed: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formData.numberOfHires}</span></div>
                    <div>Employment Type: <span className="font-bold capitalize text-zinc-900 dark:text-zinc-100">{getJobTypesArray(formData.jobType).map(t => t.replace(/_/g, ' ')).join(', ')}</span></div>
                    {Boolean(formatExpectedHours(formData.expectedHours)) && (
                      <div>Expected Hours: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatExpectedHours(formData.expectedHours)}</span></div>
                    )}
                    {Boolean(formatContractDuration(formData.contractDuration)) && (
                      <div>Contract Duration: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatContractDuration(formData.contractDuration)}</span></div>
                    )}
                  </div>
                </div>

                {/* Pay & Benefits Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">Compensation</span>
                    <button type="button" onClick={() => setCurrentStep(4)} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <div>Pay Structure: <span className="font-bold capitalize text-zinc-900 dark:text-zinc-100">{formData.payShowBy.replace(/_/g, ' ')} ({formData.payRate.replace(/_/g, ' ')})</span></div>
                    <div>Formatted Display: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatSalaryRange(formData)}</span></div>
                  </div>
                </div>

                {/* Role Description Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">Role Description</span>
                    <button type="button" onClick={() => setCurrentStep(5)} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <JobDescriptionRenderer description={formData.description} />

                  {formData.responsibilities && formData.responsibilities.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs block">
                        Key Responsibilities ({formData.responsibilities.length}):
                      </span>
                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 pl-4 list-disc">
                        {formData.responsibilities.map((resp, idx) => (
                          <li key={idx} className="leading-relaxed">{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Qualifications Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">Screening Qualifications ({formData.screeningQuestions.length})</span>
                    <button type="button" onClick={() => setCurrentStep(6)} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  {formData.screeningQuestions.length === 0 ? (
                    <div className="text-zinc-500 italic">No screening qualifications added.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {formData.screeningQuestions.map((sq, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-zinc-600 dark:text-zinc-400">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">• {sq.questionText}</span>
                            {sq.specificFieldRequirement && <span className="block text-[11px] text-zinc-500 ml-3">Degree Field: {sq.specificFieldRequirement}</span>}
                            {sq.experienceTitle && <span className="block text-[11px] text-zinc-500 ml-3">Domain: {sq.experienceYears || 1}+ yrs in {sq.experienceTitle}</span>}
                          </div>
                          {sq.isDealBreaker && <span className="text-red-500 font-bold text-[10px] shrink-0">Deal-breaker</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Application Settings Summary */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">Application Settings</span>
                    <button type="button" onClick={() => setCurrentStep(7)} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <div>Method: <span className="font-bold capitalize text-zinc-900 dark:text-zinc-100">{formData.applicationMethod === 'email' ? 'Direct Email' : 'Platform Application'}</span></div>
                    <div>Resume: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formData.requireResume ? 'Required' : 'Optional'}</span></div>
                    <div>Candidate Direct Q&A: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formData.candidatesCanContact ? 'Allowed' : 'Disabled'}</span></div>
                  </div>
                </div>
              </div>
            </Card>
          </GSAPReveal>
        )}

        {/* BOTTOM NAVIGATION TOOLBAR */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="text-xs font-semibold gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveDraft(true, true)}
              isLoading={isSaving}
              className="text-xs font-semibold gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> {initialPostStatus === 'published' ? 'Save Changes' : 'Save as Draft'}
            </Button>

            {initialPostStatus === 'published' ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSavePublishedJob}
                isLoading={isPublishing}
                className="font-bold text-xs gap-1.5 shadow-subtle bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </Button>
            ) : currentStep < 8 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                className="font-bold text-xs gap-1.5 shadow-subtle"
              >
                <span>Continue Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePublishJob}
                isLoading={isPublishing}
                className="font-bold text-xs gap-1.5 shadow-subtle bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Sparkles className="w-3.5 h-3.5" /> Publish Job Opening
              </Button>
            )}
          </div>
        </div>

        {/* ADD SCREENING QUESTION MODAL */}
        {showQuestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-modal">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-zinc-500" /> Add Applicant Qualification Criterion
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setShowQuestionModal(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <Select
                label="Qualification Category *"
                value={newQuestionType}
                onChange={(e) => {
                  setNewQuestionType(e.target.value as any);
                  setModalError(null);
                }}
                options={[
                  { value: 'education', label: 'Education Level & Degree Field' },
                  { value: 'experience', label: 'Years of Experience in Domain' },
                  { value: 'custom', label: 'Custom Requirement (Free-Text)' },
                  { value: 'license_certification', label: 'Professional License / Certification' },
                  { value: 'commute', label: 'Commute / Relocation Willingness' },
                  { value: 'language', label: 'Language Proficiency' },
                  { value: 'location', label: 'Geographic Location' },
                  { value: 'willingness_to_travel', label: 'Willingness to Travel' },
                ]}
              />

              {/* 1. Education Fields */}
              {newQuestionType === 'education' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <Select
                    label="Minimum Required Education Level *"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    options={[
                      { value: "Bachelor's degree", label: "Bachelor's degree" },
                      { value: "Master's degree", label: "Master's degree" },
                      { value: 'Doctorate degree', label: 'Doctorate degree (PhD)' },
                      { value: "Associate degree", label: "Associate degree" },
                      { value: 'High school diploma', label: 'High school diploma' },
                    ]}
                  />

                  <Input
                    label="Specific Field of Study or Degree Requirement (Optional)"
                    placeholder="e.g. BS in Computer Science or Any Engineering degree"
                    value={specificFieldRequirement}
                    onChange={(e) => setSpecificFieldRequirement(e.target.value)}
                    helperText="Specify the major, field, or discipline required (e.g. Computer Science)."
                  />
                </div>
              )}

              {/* 2. Experience Fields */}
              {newQuestionType === 'experience' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <Input
                    label="Specific Experience Domain or Skill Role *"
                    placeholder="e.g. backend development, React, customer service in retail"
                    value={experienceTitle}
                    onChange={(e) => setExperienceTitle(e.target.value)}
                    helperText="Type the exact domain of experience expected from candidates."
                  />

                  <Input
                    label="Minimum Required Years of Experience *"
                    type="number"
                    min="1"
                    value={String(experienceYears)}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              )}

              {/* 3. Custom Requirement Fields */}
              {newQuestionType === 'custom' && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Custom Qualification Requirement *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Must have led a team of 5+ engineers, or Experience with Pakistani tax law..."
                      value={customQuestionText}
                      onChange={(e) => setCustomQuestionText(e.target.value)}
                      className="w-full p-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-subtle"
                    />
                  </div>
                </div>
              )}

              {/* 4. Other types */}
              {newQuestionType !== 'education' && newQuestionType !== 'experience' && newQuestionType !== 'custom' && (
                <Input
                  label="Requirement Detail *"
                  placeholder="e.g. AWS Certified Solutions Architect or Fluent Professional English"
                  value={customQuestionText}
                  onChange={(e) => setCustomQuestionText(e.target.value)}
                />
              )}

              {/* Deal-breaker Toggle */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Mark as Mandatory Deal-breaker
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    We will flag candidates who do not meet this qualification criterion.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newQuestionDealBreaker}
                  onChange={(e) => setNewQuestionDealBreaker(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalError(null);
                    setShowQuestionModal(false);
                  }}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleAddQuestion} className="font-bold text-xs">
                  Add Qualification
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI REQUISITION GENERATION & CLARIFICATION MODAL */}
        {isAiMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 space-y-5 shadow-modal max-h-[90vh] overflow-y-auto no-scrollbar relative">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0 shadow-subtle">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>Hirely AI Requisition Assistant</span>
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Describe your role in natural language. AI will evaluate details, clarify missing items, and pre-fill all 8 wizard steps.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAiMode(false)}
                  disabled={isAiLoading}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Thread for multi-turn clarification */}
              {aiConversationHistory.length > 0 && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 max-h-64 overflow-y-auto text-xs no-scrollbar">
                  {aiConversationHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed ${
                          item.sender === 'user'
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium rounded-tr-none shadow-subtle'
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-tl-none shadow-subtle'
                        }`}
                      >
                        <span className="font-bold block text-[10px] opacity-70 mb-1 uppercase tracking-wider">
                          {item.sender === 'user' ? 'You' : 'Hirely AI Assistant'}
                        </span>
                        <span>{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step-by-Step Checklist Loading State inside Modal */}
              {isAiLoading ? (
                <div
                  ref={aiLoadingRef}
                  className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-4 shadow-subtle animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-700/60 pb-3">
                    <div
                      ref={aiIconRef}
                      className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Evaluating Requisition Parameters
                      </h4>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-normal">
                        Systematically checking required wizard categories...
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 py-1 text-xs font-sans">
                    {CHECKLIST_STEPS.map((item, idx) => {
                      const isComplete = idx < currentChecklistIndex;
                      const isCurrent = idx === currentChecklistIndex;
                      const isPending = idx > currentChecklistIndex;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 transition-colors duration-200 ${
                            isComplete
                              ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                              : isCurrent
                              ? 'text-zinc-900 dark:text-zinc-100 font-extrabold'
                              : 'text-zinc-400 dark:text-zinc-600 font-normal'
                          }`}
                        >
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {isComplete && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />}
                            {isCurrent && <Loader2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 animate-spin" />}
                            {isPending && <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />}
                          </div>
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {aiConversationHistory.length > 0 ? 'Your Clarification Response *' : 'Brief Job Description / Requirements *'}
                    </label>
                    <textarea
                      rows={4}
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="e.g., Need a React Developer, 2-3 years experience, remote in Karachi, salary 80-120k, health insurance included"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-zinc-500 italic">
                      Note: AI auto-fills all details as a starting point. Review & edit anything on Step 8 before publishing.
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAiMode(false)}
                        className="text-xs font-semibold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!aiInput.trim()}
                        onClick={handleAiGenerate}
                        className="font-bold gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>{aiConversationHistory.length > 0 ? 'Send Answer' : 'Generate Job Posting'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UNSAVED CHANGES WARNING MODAL */}
        {showUnsavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-modal">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Unsaved Changes
                </h3>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You have unsaved changes. Save as draft before leaving, or your progress may be lost.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowUnsavedModal(false);
                    setPendingNavigationUrl(null);
                  }}
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDirty(false);
                    setShowUnsavedModal(false);
                    router.push(pendingNavigationUrl || '/dashboard/jobs');
                  }}
                  className="w-full sm:w-auto text-xs font-semibold text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Leave Without Saving
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    setShowUnsavedModal(false);
                    await handleSaveDraft(false, true);
                    setIsDirty(false);
                    router.push(pendingNavigationUrl || '/dashboard/jobs');
                  }}
                  className="w-full sm:w-auto font-bold text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Save & Leave
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
