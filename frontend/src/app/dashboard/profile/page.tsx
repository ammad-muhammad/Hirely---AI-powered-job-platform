'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { WorkspaceNav } from '@/components/navigation/WorkspaceNav';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { WORLD_COUNTRIES } from '@/lib/countriesData';
import { WORLD_LANGUAGES } from '@/lib/languagesData';
import {
  User as UserIcon,
  Mail,
  FileText,
  Upload,
  ExternalLink,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Briefcase,
  GraduationCap,
  Globe,
  Linkedin,
  Github,
  Sparkles,
  Award,
  ShieldCheck,
  Trash2,
  Edit3,
  Save,
  MapPin,
  DollarSign,
  Zap,
  Calendar,
  Languages,
  ArrowRight,
  Download,
} from 'lucide-react';
import { getResumeViewUrl, triggerFileDownload } from '@/utils/fileHelpers';

interface VerifiedSkill {
  skill: string;
  score: number;
  verifiedAt: string;
}

export interface WorkExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  grade?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  doesNotExpire?: boolean;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: 'Native or Bilingual' | 'Full Professional' | 'Professional Working' | 'Elementary';
}

interface ProfileData {
  user: {
    id: string;
    email: string;
    fullName: string;
    firstName: string;
    lastName: string;
    countryCode: string;
    role: string;
    phone: string;
    avatarUrl: string;
    location: string;
  };
  profile: {
    id: string;
    bio: string;
    skills: string[];
    verifiedSkills?: VerifiedSkill[];
    experienceLevel: 'entry' | 'mid' | 'senior';
    education: string;
    country: string;
    city: string;
    postcode: string;
    desiredJobTitles: string[];
    preferredJobTypes: string[];
    minimumExpectedSalary: number | null;
    openToRelocate: boolean;
    availableImmediately: boolean;
    resumeUrl: string;
    resumeOriginalFileName?: string;
    resumeText?: string;
    portfolioUrl: string;
    linkedinUrl: string;
    githubUrl: string;
    profileCompletionPercentage: number;
    updatedAt: string;
  };
}

const EXPERIENCE_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'entry', label: 'Entry Level (0-2 yrs)' },
  { value: 'mid', label: 'Mid Level (3-5 yrs)' },
  { value: 'senior', label: 'Senior Level (5+ yrs)' },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const hasLoadedRef = useRef(false);

  // Form states - Compact & Searchable
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [city, setCity] = useState('Karachi');
  const [postcode, setPostcode] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior'>('entry');

  // Qualifications Lists (Structured)
  const [workExperienceList, setWorkExperienceList] = useState<WorkExperienceItem[]>([]);
  const [educationList, setEducationList] = useState<EducationItem[]>([]);
  const [certificationList, setCertificationList] = useState<CertificationItem[]>([]);
  const [languageList, setLanguageList] = useState<LanguageItem[]>([]);

  // Job Preferences states
  const [desiredJobTitles, setDesiredJobTitles] = useState<string[]>([]);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);
  const [minimumExpectedSalary, setMinimumExpectedSalary] = useState<string>('');
  const [openToRelocate, setOpenToRelocate] = useState(false);
  const [availableImmediately, setAvailableImmediately] = useState(false);

  // Social links
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Resume mode tab: 'pdf' or 'text'
  const [editResumeTab, setEditResumeTab] = useState<'pdf' | 'text'>('pdf');
  const [resumeText, setResumeText] = useState('');

  // Modal Dialog States
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkExperienceItem | null>(null);

  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEduItem, setEditingEduItem] = useState<EducationItem | null>(null);

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [editingCertItem, setEditingCertItem] = useState<CertificationItem | null>(null);

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [editingLangItem, setEditingLangItem] = useState<LanguageItem | null>(null);

  // Country Options & Dial Code Options for SearchableSelect
  const countryOptions: SelectOption[] = WORLD_COUNTRIES.map((c) => ({
    value: c.name,
    label: `${c.flag} ${c.name}`,
  }));

  const dialCodeOptions: SelectOption[] = WORLD_COUNTRIES.map((c) => ({
    value: c.dialCode,
    label: `${c.flag} ${c.dialCode}`,
    subLabel: c.name,
  }));

  // Dynamic Cities based on selected Country
  const selectedCountryData = WORLD_COUNTRIES.find((c) => c.name === country) || WORLD_COUNTRIES[0];
  const cityOptions: SelectOption[] = selectedCountryData.cities.map((ct) => ({
    value: ct,
    label: ct,
  }));

  useEffect(() => {
    if (user && user.role !== 'job_seeker') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadProfile = async (showSkeleton = true) => {
    try {
      if (showSkeleton) setIsLoading(true);
      const response = await api.get('/job-seeker-profile/me');
      if (response.data?.success && response.data?.data) {
        const pData: ProfileData = response.data.data;
        setData(pData);
      }
    } catch (err: unknown) {
      console.error('Failed to load profile:', err);
    } finally {
      if (showSkeleton) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'job_seeker' && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadProfile(true);
    }
  }, [user]);

  // Real-time Socket.io updates for badge completion & profile badges
  useEffect(() => {
    let socketInstance: any = null;
    let isMounted = true;

    const connectSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isMounted) return;

      socketInstance.on('badge_earned', () => {
        loadProfile(false);
      });

      socketInstance.on('profile_updated', () => {
        loadProfile(false);
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.off('badge_earned');
        socketInstance.off('profile_updated');
      }
    };
  }, []);

  // Parse structured data from profile.education JSON
  useEffect(() => {
    if (data) {
      setFirstName(data.user.firstName || data.user.fullName.split(' ')[0] || '');
      setLastName(data.user.lastName || data.user.fullName.split(' ').slice(1).join(' ') || '');
      setCountryCode(data.user.countryCode || '+92');
      setPhone(data.user.phone || '');
      setCountry(data.profile.country || 'Pakistan');
      setCity(data.profile.city || 'Karachi');
      setPostcode(data.profile.postcode || '');
      setBio(data.profile.bio || '');
      setSkills(data.profile.skills || []);
      setExperienceLevel(data.profile.experienceLevel || 'entry');

      setDesiredJobTitles(data.profile.desiredJobTitles || []);
      setPreferredJobTypes(data.profile.preferredJobTypes || []);
      setMinimumExpectedSalary(
        data.profile.minimumExpectedSalary !== null && data.profile.minimumExpectedSalary !== undefined
          ? String(data.profile.minimumExpectedSalary)
          : ''
      );
      setOpenToRelocate(Boolean(data.profile.openToRelocate));
      setAvailableImmediately(Boolean(data.profile.availableImmediately));

      setPortfolioUrl(data.profile.portfolioUrl || '');
      setLinkedinUrl(data.profile.linkedinUrl || '');
      setGithubUrl(data.profile.githubUrl || '');
      setResumeText(data.profile.resumeText || '');

      // Parse structured JSON inside profile.education if available
      if (data.profile.education) {
        try {
          const parsed = JSON.parse(data.profile.education);
          if (parsed && typeof parsed === 'object') {
            setWorkExperienceList(parsed.workExperienceList || []);
            setEducationList(parsed.educationList || []);
            setCertificationList(parsed.certificationList || []);
            setLanguageList(parsed.languageList || []);
          } else {
            // Legacy plain string fallback
            setEducationList([
              {
                id: '1',
                degree: data.profile.education,
                institution: 'Academic Institution',
                startDate: '',
                endDate: 'Present',
              },
            ]);
          }
        } catch {
          // Legacy plain string fallback
          setEducationList([
            {
              id: '1',
              degree: data.profile.education,
              institution: 'Academic Institution',
              startDate: '',
              endDate: 'Present',
            },
          ]);
        }
      }

      if (data.profile.resumeText && !data.profile.resumeUrl) {
        setEditResumeTab('text');
      } else {
        setEditResumeTab('pdf');
      }
    }
  }, [data]);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleAddJobTitle = () => {
    const trimmed = jobTitleInput.trim();
    if (trimmed && !desiredJobTitles.includes(trimmed)) {
      setDesiredJobTitles([...desiredJobTitles, trimmed]);
      setJobTitleInput('');
    }
  };

  const handleRemoveJobTitle = (titleToRemove: string) => {
    setDesiredJobTitles(desiredJobTitles.filter((t) => t !== titleToRemove));
  };

  const toggleJobType = (val: string) => {
    if (preferredJobTypes.includes(val)) {
      setPreferredJobTypes(preferredJobTypes.filter((t) => t !== val));
    } else {
      setPreferredJobTypes([...preferredJobTypes, val]);
    }
  };

  // Serialize qualifications into backend education field safely
  const serializeQualifications = () => {
    return JSON.stringify({
      workExperienceList,
      educationList,
      certificationList,
      languageList,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMsg(null);

    try {
      const response = await api.put('/job-seeker-profile/me', {
        firstName,
        lastName,
        countryCode,
        phone,
        country,
        city,
        postcode,
        bio,
        skills,
        experienceLevel,
        education: serializeQualifications(),
        desiredJobTitles,
        preferredJobTypes,
        minimumExpectedSalary: minimumExpectedSalary ? Number(minimumExpectedSalary) : null,
        openToRelocate,
        availableImmediately,
        portfolioUrl,
        linkedinUrl,
        githubUrl,
        resumeText,
      });

      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
        await refreshUser();
        setIsEditing(false);
        setToastMsg({ type: 'success', text: 'Candidate dossier updated successfully!' });
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile changes.';
      setToastMsg({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingAvatar(true);
      setToastMsg(null);

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await api.post('/job-seeker-profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data?.success) {
          await loadProfile(false);
          await refreshUser();
          setToastMsg({ type: 'success', text: 'Profile picture updated!' });
          setTimeout(() => setToastMsg(null), 4000);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to upload avatar image.';
        setToastMsg({ type: 'error', text: msg });
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingResume(true);
      setToastMsg(null);

      try {
        const formData = new FormData();
        formData.append('resume', file);

        const response = await api.post('/job-seeker-profile/resume', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data?.success) {
          await loadProfile(false);
          await refreshUser();
          setToastMsg({ type: 'success', text: 'Resume PDF uploaded successfully!' });
          setTimeout(() => setToastMsg(null), 4000);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to upload resume file.';
        setToastMsg({ type: 'error', text: msg });
      } finally {
        setIsUploadingResume(false);
      }
    }
  };

  const handleRemoveResume = async () => {
    setIsUploadingResume(true);
    setToastMsg(null);

    try {
      const response = await api.delete('/job-seeker-profile/resume');

      if (response.data?.success) {
        setResumeText('');
        await loadProfile(false);
        await refreshUser();
        setToastMsg({ type: 'success', text: 'Resume removed successfully!' });
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resume.';
      setToastMsg({ type: 'error', text: msg });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const autoSaveQualifications = async (
    workList: WorkExperienceItem[],
    eduList: EducationItem[],
    certList: CertificationItem[],
    langList: LanguageItem[]
  ) => {
    try {
      const serialized = JSON.stringify({
        workExperienceList: workList,
        educationList: eduList,
        certificationList: certList,
        languageList: langList,
      });
      await api.put('/job-seeker-profile/me', {
        education: serialized,
      });
      loadProfile(false);
    } catch (err) {
      console.error('Failed to auto-save qualifications:', err);
    }
  };

  // Modal Save Handlers
  const handleSaveWorkExperience = (item: WorkExperienceItem) => {
    let updated: WorkExperienceItem[];
    if (editingWorkItem) {
      updated = workExperienceList.map((w) => (w.id === item.id ? item : w));
    } else {
      updated = [...workExperienceList, { ...item, id: Date.now().toString() }];
    }
    setWorkExperienceList(updated);
    setIsWorkModalOpen(false);
    setEditingWorkItem(null);
    autoSaveQualifications(updated, educationList, certificationList, languageList);
  };

  const handleSaveEducation = (item: EducationItem) => {
    let updated: EducationItem[];
    if (editingEduItem) {
      updated = educationList.map((e) => (e.id === item.id ? item : e));
    } else {
      updated = [...educationList, { ...item, id: Date.now().toString() }];
    }
    setEducationList(updated);
    setIsEduModalOpen(false);
    setEditingEduItem(null);
    autoSaveQualifications(workExperienceList, updated, certificationList, languageList);
  };

  const handleSaveCertification = (item: CertificationItem) => {
    let updated: CertificationItem[];
    if (editingCertItem) {
      updated = certificationList.map((c) => (c.id === item.id ? item : c));
    } else {
      updated = [...certificationList, { ...item, id: Date.now().toString() }];
    }
    setCertificationList(updated);
    setIsCertModalOpen(false);
    setEditingCertItem(null);
    autoSaveQualifications(workExperienceList, educationList, updated, languageList);
  };

  const handleSaveLanguage = (item: LanguageItem) => {
    let updated: LanguageItem[];
    if (editingLangItem) {
      updated = languageList.map((l) => (l.id === item.id ? item : l));
    } else {
      updated = [...languageList, { ...item, id: Date.now().toString() }];
    }
    setLanguageList(updated);
    setIsLangModalOpen(false);
    setEditingLangItem(null);
    autoSaveQualifications(workExperienceList, educationList, certificationList, updated);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6 font-sans">
          <WorkspaceNav />
          <Card className="p-6 space-y-3">
            <Skeleton variant="text" className="w-48 h-5" />
            <Skeleton variant="rectangular" className="w-full h-3 rounded-full" />
          </Card>
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton variant="circular" className="w-20 h-20" />
              <div className="space-y-3 flex-1">
                <Skeleton variant="text" className="w-48 h-6" />
                <Skeleton variant="text" className="w-36 h-4" />
              </div>
            </div>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const completion = data?.profile.profileCompletionPercentage || 0;
  const verifiedSkills = data?.profile.verifiedSkills || [];
  const fullName = data?.user.fullName || user?.fullName || 'Candidate';
  const locationStr = [city, country].filter(Boolean).join(', ');

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans">
        {/* Workspace Navigation */}
        <WorkspaceNav />

        {/* PAGE HEADER */}
        <GSAPReveal direction="up" distance={20}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-zinc-500" /> Candidate Profile Dossier
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Your professional identity, qualifications, verified badges, and preferences on Hirely.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isEditing ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="font-semibold text-xs gap-1.5 shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Editing' : 'Edit Profile Dossier'}</span>
              </Button>
            </div>
          </div>
        </GSAPReveal>

        {/* TOAST ALERT */}
        {toastMsg && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-subtle ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CANDIDATE HEADER HERO CARD */}
        <GSAPReveal direction="up" distance={20} delay={0.05}>
          <Card className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar & Upload Overlay */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xl font-bold">
                  {data?.user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={data.user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-file-input-header"
                />
                <label
                  htmlFor="avatar-file-input-header"
                  className="absolute inset-0 rounded-full bg-zinc-950/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>{isUploadingAvatar ? '...' : 'Change'}</span>
                </label>
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {fullName}
                    </h2>
                    {data?.profile.experienceLevel && (
                      <Badge variant="outline" size="sm" className="capitalize font-bold">
                        {data.profile.experienceLevel} Level
                      </Badge>
                    )}
                  </div>

                  {desiredJobTitles.length > 0 ? (
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {desiredJobTitles.join(' • ')}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No target job titles specified</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                  {locationStr && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {locationStr}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" /> {data?.user.email}
                  </span>
                  {data?.user.phone && (
                    <span>Phone: {countryCode} {data.user.phone}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 self-stretch sm:self-start">
                <Button
                  variant={isEditing ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full sm:w-auto font-semibold text-xs gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'View Dossier' : 'Edit Profile'}</span>
                </Button>

                {data?.profile.resumeUrl ? (
                  <a
                    href={data.profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>View Resume</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </Card>
        </GSAPReveal>

        {/* ----------------- READ MODE vs EDIT MODE ----------------- */}
        {!isEditing ? (
          /* READABLE CANDIDATE DOSSIER MODE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* MAIN COLUMN (~65%) */}
            <div className="lg:col-span-8 space-y-6">
              {/* ABOUT / SUMMARY SECTION */}
              <GSAPReveal direction="up" distance={20} delay={0.1}>
                <Card className="p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-zinc-500" /> Professional Summary
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>

                  {bio ? (
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {bio}
                    </p>
                  ) : (
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-500">
                        Add a professional summary to help employers understand your background and strengths.
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-xs font-semibold">
                        Add Summary
                      </Button>
                    </div>
                  )}
                </Card>
              </GSAPReveal>

              {/* MOST RECENT WORK EXPERIENCE (CRUD READ VIEW) */}
              <GSAPReveal direction="up" distance={20} delay={0.15}>
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-zinc-500" /> Work Experience
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingWorkItem(null);
                        setIsWorkModalOpen(true);
                      }}
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Experience
                    </Button>
                  </div>

                  {workExperienceList.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-500">No work experience added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {workExperienceList.map((item) => (
                        <div key={item.id} className="pt-3 first:pt-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block">{item.role}</span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.company}</span>
                              {item.location && <span className="text-zinc-400 ml-2">• {item.location}</span>}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                {item.startDate} — {item.isCurrent ? 'Present' : item.endDate || 'Present'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWorkItem(item);
                                  setIsWorkModalOpen(true);
                                }}
                                className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-400"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = workExperienceList.filter((w) => w.id !== item.id);
                                  setWorkExperienceList(updated);
                                  autoSaveQualifications(updated, educationList, certificationList, languageList);
                                }}
                                className="p-1 hover:text-red-600 text-zinc-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap pt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </GSAPReveal>

              {/* EDUCATION QUALIFICATIONS (CRUD READ VIEW) */}
              <GSAPReveal direction="up" distance={20} delay={0.2}>
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-zinc-500" /> Education & Qualifications
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingEduItem(null);
                        setIsEduModalOpen(true);
                      }}
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Education
                    </Button>
                  </div>

                  {educationList.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-500">No education entries added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {educationList.map((item) => (
                        <div key={item.id} className="pt-3 first:pt-0 space-y-1">
                          <div className="flex items-start justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block">
                                {item.degree} {item.fieldOfStudy ? `in ${item.fieldOfStudy}` : ''}
                              </span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.institution}</span>
                              {item.grade && <span className="text-zinc-500 ml-2">• GPA/Grade: {item.grade}</span>}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                {item.startDate ? `${item.startDate} — ` : ''}{item.isCurrent ? 'Present' : item.endDate || 'Present'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEduItem(item);
                                  setIsEduModalOpen(true);
                                }}
                                className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-400"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = educationList.filter((e) => e.id !== item.id);
                                  setEducationList(updated);
                                  autoSaveQualifications(workExperienceList, updated, certificationList, languageList);
                                }}
                                className="p-1 hover:text-red-600 text-zinc-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </GSAPReveal>

              {/* CERTIFICATIONS & LICENSES (CRUD READ VIEW) */}
              <GSAPReveal direction="up" distance={20} delay={0.22}>
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Award className="w-4 h-4 text-zinc-500" /> Certifications & Licenses
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCertItem(null);
                        setIsCertModalOpen(true);
                      }}
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add License
                    </Button>
                  </div>

                  {certificationList.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-500">No certifications or professional licenses added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {certificationList.map((item) => (
                        <div key={item.id} className="pt-2 first:pt-0 space-y-1 text-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{item.name}</span>
                              <span className="text-zinc-600 dark:text-zinc-400">{item.issuingOrganization}</span>
                              {item.credentialId && <span className="text-zinc-400 ml-2">• ID: {item.credentialId}</span>}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-zinc-500">
                                Issued: {item.issueDate} {item.doesNotExpire ? '(No Expiry)' : item.expirationDate ? `• Expires: ${item.expirationDate}` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCertItem(item);
                                  setIsCertModalOpen(true);
                                }}
                                className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-400"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = certificationList.filter((c) => c.id !== item.id);
                                  setCertificationList(updated);
                                  autoSaveQualifications(workExperienceList, educationList, updated, languageList);
                                }}
                                className="p-1 hover:text-red-600 text-zinc-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </GSAPReveal>

              {/* LANGUAGES (CRUD READ VIEW) */}
              <GSAPReveal direction="up" distance={20} delay={0.25}>
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Languages className="w-4 h-4 text-zinc-500" /> Languages
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingLangItem(null);
                        setIsLangModalOpen(true);
                      }}
                      className="text-xs font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Language
                    </Button>
                  </div>

                  {languageList.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-500">No language proficiencies added yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {languageList.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{item.language}</span>
                            <span className="text-[11px] text-zinc-500">{item.proficiency}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLangItem(item);
                                setIsLangModalOpen(true);
                              }}
                              className="p-1 hover:text-zinc-900 text-zinc-400"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = languageList.filter((l) => l.id !== item.id);
                                setLanguageList(updated);
                                autoSaveQualifications(workExperienceList, educationList, certificationList, updated);
                              }}
                              className="p-1 hover:text-red-600 text-zinc-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </GSAPReveal>
            </div>

            {/* RIGHT RAIL (~35%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* PROFILE STRENGTH */}
              <GSAPReveal direction="up" distance={20} delay={0.1}>
                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      Profile Strength
                    </h3>
                    <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">{completion}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      style={{ width: `${completion}%` }}
                      className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
                    />
                  </div>

                  <p className="text-[11px] text-zinc-500">
                    Complete your candidate dossier to increase your visibility to recruiters.
                  </p>
                </Card>
              </GSAPReveal>

              {/* AI-VERIFIED SKILL BADGES */}
              <GSAPReveal direction="up" distance={20} delay={0.11}>
                <Card className={`p-5 space-y-3 ${
                  verifiedSkills.length > 0
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : ''
                }`}>
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified Skill Badges</span>
                    </h3>
                    <Badge variant={verifiedSkills.length > 0 ? 'success' : 'outline'} size="sm" className="font-extrabold text-[10px]">
                      {verifiedSkills.length} Verified
                    </Badge>
                  </div>

                  {verifiedSkills.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {verifiedSkills.map((vs, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs shadow-subtle"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block leading-tight">
                                {vs.skill}
                              </span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                Verified Candidate Badge
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-black text-xs shrink-0">
                            {vs.score}% Score
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Earn recruiter-trusted verified badges by passing AI Skill Assessments.
                      </p>
                      <Link href="/dashboard/skill-tests">
                        <Button variant="outline" size="sm" className="text-xs font-bold w-full justify-center">
                          <span>Take Skill Assessment</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </Card>
              </GSAPReveal>

              {/* TECHNICAL SKILLS SUMMARY */}
              <GSAPReveal direction="up" distance={20} delay={0.12}>
                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      Technical Skills
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-zinc-400 hover:text-zinc-900 font-semibold"
                    >
                      Edit
                    </button>
                  </div>

                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill, idx) => {
                        const isVerified = verifiedSkills.some(
                          (vs) => vs.skill.toLowerCase() === skill.toLowerCase() || skill.toLowerCase().includes(vs.skill.toLowerCase()) || vs.skill.toLowerCase().includes(skill.toLowerCase())
                        );

                        return (
                          <Badge
                            key={idx}
                            variant={isVerified ? 'success' : 'default'}
                            size="sm"
                            className="gap-1 font-bold"
                          >
                            <span>{skill}</span>
                            {isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No skills added yet</p>
                  )}
                </Card>
              </GSAPReveal>

              {/* RESUME CARD */}
              <GSAPReveal direction="up" distance={20} delay={0.15}>
                <Card className="p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-zinc-500" /> Resume Document
                  </h3>

                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeChange}
                    className="hidden"
                    id="resume-file-input-dossier-card"
                  />

                  {data?.profile.resumeUrl ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 text-xs">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                          {data.profile.resumeOriginalFileName || 'Uploaded Resume PDF'}
                        </span>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          <a
                            href={getResumeViewUrl(data.profile.resumeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3 text-zinc-400" /> View PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => triggerFileDownload(data.profile.resumeUrl, data.profile.resumeOriginalFileName || 'Resume.pdf')}
                            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={isUploadingResume}
                        onClick={() => document.getElementById('resume-file-input-dossier-card')?.click()}
                        className="w-full text-xs font-semibold justify-center"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        <span>{isUploadingResume ? 'Uploading...' : 'Replace Resume PDF'}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center">
                      <p className="text-xs text-zinc-500">Your resume helps recruiters evaluate your candidate fit.</p>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isUploadingResume}
                        onClick={() => document.getElementById('resume-file-input-dossier-card')?.click()}
                        className="w-full text-xs font-semibold justify-center"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        <span>{isUploadingResume ? 'Uploading...' : 'Upload Resume PDF'}</span>
                      </Button>
                    </div>
                  )}
                </Card>
              </GSAPReveal>

              {/* JOB PREFERENCES SUMMARY */}
              <GSAPReveal direction="up" distance={20} delay={0.2}>
                <Card className="p-5 space-y-3 text-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    Job Preferences
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Preferred Types</span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                        {preferredJobTypes.length > 0 ? preferredJobTypes.join(', ').replace(/_/g, ' ') : 'Any'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Min Expected Salary</span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {minimumExpectedSalary
                          ? `${(WORLD_COUNTRIES.find((c) => c.name === country) || WORLD_COUNTRIES[0]).currencySymbol} ${Number(minimumExpectedSalary).toLocaleString()} / mo`
                          : 'Not specified'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> {availableImmediately ? 'Immediate' : 'Standard notice'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {openToRelocate ? 'Relocatable' : 'Local'}
                      </span>
                    </div>
                  </div>
                </Card>
              </GSAPReveal>
            </div>
          </div>
        ) : (
          /* EDITABLE FORM MODE WITH STYLED SEARCHABLE DROPDOWNS & PERFECT ROW ALIGNMENT */
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Personal Details Card */}
            <Card className="p-5 md:p-6 space-y-5">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                Personal Identity & Location
              </h3>

              <div className="space-y-4">
                {/* ROW 1: First Name & Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">First Name</label>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ROW 2: Phone Dial Code & Phone Number Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Phone Dial Code</label>
                    <SearchableSelect
                      options={dialCodeOptions}
                      value={countryCode}
                      onChange={(val) => setCountryCode(val)}
                      searchPlaceholder="Search country or dial code..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ROW 3: Country & City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Country</label>
                    <SearchableSelect
                      options={countryOptions}
                      value={country}
                      onChange={(val) => {
                        setCountry(val);
                        const match = WORLD_COUNTRIES.find((c) => c.name === val);
                        if (match && match.cities.length > 0) {
                          setCity(match.cities[0]);
                        }
                      }}
                      searchPlaceholder="Search country..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">City</label>
                    <SearchableSelect
                      options={cityOptions}
                      value={city}
                      onChange={(val) => setCity(val)}
                      searchPlaceholder="Search city..."
                    />
                  </div>
                </div>

                {/* ROW 4: Experience Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Experience Level</label>
                    <SearchableSelect
                      options={EXPERIENCE_LEVEL_OPTIONS}
                      value={experienceLevel}
                      onChange={(val) => setExperienceLevel(val as 'entry' | 'mid' | 'senior')}
                      placeholder="Select Experience..."
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Professional Summary / Bio Card */}
            <Card className="p-5 md:p-6 space-y-3">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                Professional Summary / Bio
              </h3>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Summary Overview
                </label>
                <textarea
                  rows={4}
                  placeholder="Write a brief overview of your professional background, key achievements, and career goals..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none leading-relaxed"
                />
              </div>
            </Card>

            {/* Technical Skills Card */}
            <Card className="p-5 md:p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                Technical Skills
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type skill (e.g. React) and press Add..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map((skill, idx) => (
                    <Badge key={idx} variant="default" size="md" className="gap-1.5">
                      <span>{skill}</span>
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            {/* Job Preferences Card */}
            <Card className="p-5 md:p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                Job Preferences & Target Titles
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Desired Job Titles</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type title (e.g. Frontend Engineer) and press Add..."
                    value={jobTitleInput}
                    onChange={(e) => setJobTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddJobTitle();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddJobTitle}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {desiredJobTitles.map((title, idx) => (
                    <Badge key={idx} variant="default" size="md" className="gap-1.5">
                      <span>{title}</span>
                      <button type="button" onClick={() => handleRemoveJobTitle(title)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Minimum Expected Salary (Monthly in {(WORLD_COUNTRIES.find((c) => c.name === country) || WORLD_COUNTRIES[0]).currencySymbol})
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-extrabold text-xs">
                      {(WORLD_COUNTRIES.find((c) => c.name === country) || WORLD_COUNTRIES[0]).currencySymbol}
                    </div>
                    <input
                      type="number"
                      placeholder="e.g. 120000"
                      value={minimumExpectedSalary}
                      onChange={(e) => setMinimumExpectedSalary(e.target.value)}
                      className="w-full pl-14 pr-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableImmediately}
                      onChange={(e) => setAvailableImmediately(e.target.checked)}
                      className="w-4 h-4 text-zinc-900 rounded focus:ring-zinc-900"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Available immediately</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openToRelocate}
                      onChange={(e) => setOpenToRelocate(e.target.checked)}
                      className="w-4 h-4 text-zinc-900 rounded focus:ring-zinc-900"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Open to relocation</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* FORM SAVE & CANCEL ACTIONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving} className="py-2.5 px-6 text-xs font-bold">
                <Save className="w-4 h-4 mr-1.5" /> Save Profile Dossier
              </Button>
            </div>
          </form>
        )}

        {/* MODAL 1: WORK EXPERIENCE */}
        <WorkExperienceModal
          isOpen={isWorkModalOpen}
          onClose={() => {
            setIsWorkModalOpen(false);
            setEditingWorkItem(null);
          }}
          item={editingWorkItem}
          onSave={handleSaveWorkExperience}
        />

        {/* MODAL 2: EDUCATION */}
        <EducationModal
          isOpen={isEduModalOpen}
          onClose={() => {
            setIsEduModalOpen(false);
            setEditingEduItem(null);
          }}
          item={editingEduItem}
          onSave={handleSaveEducation}
        />

        {/* MODAL 3: CERTIFICATION & LICENSE */}
        <CertificationModal
          isOpen={isCertModalOpen}
          onClose={() => {
            setIsCertModalOpen(false);
            setEditingCertItem(null);
          }}
          item={editingCertItem}
          onSave={handleSaveCertification}
        />

        {/* MODAL 4: LANGUAGES */}
        <LanguageModal
          isOpen={isLangModalOpen}
          onClose={() => {
            setIsLangModalOpen(false);
            setEditingLangItem(null);
          }}
          item={editingLangItem}
          onSave={handleSaveLanguage}
        />
      </div>
    </ProtectedRoute>
  );
}

// ----------------- SUB-MODAL COMPONENTS ----------------- //

function WorkExperienceModal({
  isOpen,
  onClose,
  item,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: WorkExperienceItem | null;
  onSave: (item: WorkExperienceItem) => void;
}) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (item) {
      setRole(item.role);
      setCompany(item.company);
      setLocation(item.location || '');
      setStartDate(item.startDate);
      setEndDate(item.endDate || '');
      setIsCurrent(item.isCurrent);
      setDescription(item.description || '');
    } else {
      setRole('');
      setCompany('');
      setLocation('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
      setDescription('');
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !company) return;
    onSave({
      id: item?.id || '',
      role,
      company,
      location,
      startDate,
      endDate: isCurrent ? 'Present' : endDate,
      isCurrent,
      description,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Work Experience' : 'Add Work Experience'}>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
        <div>
          <label className="font-semibold block mb-1">Role / Job Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Senior Frontend Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Company Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. TechCorp Inc."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Location</label>
          <input
            type="text"
            placeholder="e.g. Karachi / Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="font-semibold block mb-1">Start Date</label>
            <input
              type="text"
              placeholder="e.g. Jan 2022"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">End Date</label>
            <input
              type="text"
              disabled={isCurrent}
              placeholder={isCurrent ? 'Present' : 'e.g. Dec 2023'}
              value={isCurrent ? 'Present' : endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-0.5">
          <input
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="w-4 h-4 text-zinc-900 rounded"
          />
          <span className="font-semibold">I currently work here</span>
        </label>

        <div>
          <label className="font-semibold block mb-1">Key Responsibilities / Achievements</label>
          <textarea
            rows={2}
            placeholder="Bullet points of key accomplishments..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none no-scrollbar leading-relaxed"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="font-bold">
            Save Experience
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EducationModal({
  isOpen,
  onClose,
  item,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: EducationItem | null;
  onSave: (item: EducationItem) => void;
}) {
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [grade, setGrade] = useState('');

  useEffect(() => {
    if (item) {
      setInstitution(item.institution);
      setDegree(item.degree);
      setFieldOfStudy(item.fieldOfStudy || '');
      setStartDate(item.startDate || '');
      setEndDate(item.endDate || '');
      setIsCurrent(Boolean(item.isCurrent));
      setGrade(item.grade || '');
    } else {
      setInstitution('');
      setDegree('');
      setFieldOfStudy('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
      setGrade('');
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution || !degree) return;
    onSave({
      id: item?.id || '',
      institution,
      degree,
      fieldOfStudy,
      startDate,
      endDate: isCurrent ? 'Present' : endDate,
      isCurrent,
      grade,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Education' : 'Add Education Background'}>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
        <div>
          <label className="font-semibold block mb-1">Degree / Qualification *</label>
          <input
            type="text"
            required
            placeholder="e.g. Bachelor of Science"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Field of Study</label>
          <input
            type="text"
            placeholder="e.g. Computer Science"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Institution / University *</label>
          <input
            type="text"
            required
            placeholder="e.g. FAST-NUCES / University of Karachi"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold block mb-1">Start Year</label>
            <input
              type="text"
              placeholder="e.g. 2018"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">End / Expected Year</label>
            <input
              type="text"
              disabled={isCurrent}
              placeholder={isCurrent ? 'Present' : 'e.g. 2022'}
              value={isCurrent ? 'Present' : endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold block mb-1">Grade / GPA (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 3.8 / 4.0"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="w-4 h-4 text-zinc-900 rounded"
              />
              <span className="font-semibold">Currently studying</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="font-bold">
            Save Education
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CertificationModal({
  isOpen,
  onClose,
  item,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: CertificationItem | null;
  onSave: (item: CertificationItem) => void;
}) {
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [doesNotExpire, setDoesNotExpire] = useState(false);
  const [credentialId, setCredentialId] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setIssuingOrganization(item.issuingOrganization);
      setIssueDate(item.issueDate);
      setExpirationDate(item.expirationDate || '');
      setDoesNotExpire(Boolean(item.doesNotExpire));
      setCredentialId(item.credentialId || '');
    } else {
      setName('');
      setIssuingOrganization('');
      setIssueDate('');
      setExpirationDate('');
      setDoesNotExpire(false);
      setCredentialId('');
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !issuingOrganization) return;
    onSave({
      id: item?.id || '',
      name,
      issuingOrganization,
      issueDate,
      expirationDate: doesNotExpire ? 'No Expiration' : expirationDate,
      doesNotExpire,
      credentialId,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Certification' : 'Add Certification / License'}>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
        <div>
          <label className="font-semibold block mb-1">Certification / License Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. AWS Certified Solutions Architect"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Issuing Organization *</label>
          <input
            type="text"
            required
            placeholder="e.g. Amazon Web Services (AWS)"
            value={issuingOrganization}
            onChange={(e) => setIssuingOrganization(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold block mb-1">Issue Date</label>
            <input
              type="text"
              placeholder="e.g. Mar 2023"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Expiration Date</label>
            <input
              type="text"
              disabled={doesNotExpire}
              placeholder={doesNotExpire ? 'No Expiry' : 'e.g. Mar 2026'}
              value={doesNotExpire ? 'No Expiry' : expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-0.5">
          <input
            type="checkbox"
            checked={doesNotExpire}
            onChange={(e) => setDoesNotExpire(e.target.checked)}
            className="w-4 h-4 text-zinc-900 rounded"
          />
          <span className="font-semibold">This certification does not expire</span>
        </label>

        <div>
          <label className="font-semibold block mb-1">Credential ID (Optional)</label>
          <input
            type="text"
            placeholder="e.g. AWS-89213-XYZ"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="font-bold">
            Save Certification
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const PROFICIENCY_OPTIONS: SelectOption[] = [
  { value: 'Native or Bilingual', label: 'Native or Bilingual' },
  { value: 'Full Professional', label: 'Full Professional' },
  { value: 'Professional Working', label: 'Professional Working' },
  { value: 'Elementary', label: 'Elementary' },
];

function LanguageModal({
  isOpen,
  onClose,
  item,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: LanguageItem | null;
  onSave: (item: LanguageItem) => void;
}) {
  const [language, setLanguage] = useState('English');
  const [proficiency, setProficiency] = useState<LanguageItem['proficiency']>('Full Professional');

  const languageSelectOptions: SelectOption[] = WORLD_LANGUAGES.map((l) => ({
    value: l.name,
    label: l.nativeName ? `${l.name} (${l.nativeName})` : l.name,
  }));

  useEffect(() => {
    if (item) {
      setLanguage(item.language);
      setProficiency(item.proficiency);
    } else {
      setLanguage('English');
      setProficiency('Full Professional');
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!language) return;
    onSave({
      id: item?.id || '',
      language,
      proficiency,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Language' : 'Add Language Proficiency'}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans pb-1">
        <div>
          <label className="font-semibold block mb-1">Language *</label>
          <SearchableSelect
            options={languageSelectOptions}
            value={language}
            onChange={(val) => setLanguage(val)}
            searchPlaceholder="Search language..."
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Proficiency Level</label>
          <SearchableSelect
            options={PROFICIENCY_OPTIONS}
            value={proficiency}
            onChange={(val) => setProficiency(val as LanguageItem['proficiency'])}
            position="top"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="font-bold">
            Save Language
          </Button>
        </div>
      </form>
    </Modal>
  );
}
