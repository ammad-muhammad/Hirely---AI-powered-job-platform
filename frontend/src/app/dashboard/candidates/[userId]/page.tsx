'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  ArrowLeft,
  Briefcase,
  Globe,
  Linkedin,
  Github,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Lock,
  Zap,
  Wallet,
  AlertCircle,
  Download,
} from 'lucide-react';
import { getResumeViewUrl, triggerFileDownload } from '@/utils/fileHelpers';
import { WORLD_COUNTRIES } from '@/lib/countriesData';

interface CandidateProfileData {
  user: {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    countryCode?: string;
    avatarUrl: string;
    location: string;
    email?: string;
    phone?: string;
    hasAppliedToEmployer: boolean;
  };
  profile: {
    id: string;
    bio: string;
    skills: string[];
    verifiedSkills: string[];
    experienceLevel: 'entry' | 'mid' | 'senior';
    education: string;
    country?: string;
    city?: string;
    postcode?: string;
    desiredJobTitles?: string[];
    preferredJobTypes?: string[];
    minimumExpectedSalary?: number | null;
    openToRelocate?: boolean;
    availableImmediately?: boolean;
    resumeUrl: string;
    resumeOriginalFileName?: string;
    portfolioUrl: string;
    linkedinUrl: string;
    githubUrl: string;
    profileCompletionPercentage: number;
    updatedAt: string;
  };
}

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const candidateUserId = params?.userId as string;

  const [data, setData] = useState<CandidateProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'employer' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const [candidateApps, setCandidateApps] = useState<any[]>([]);

  useEffect(() => {
    async function loadCandidateProfile() {
      if (!candidateUserId) return;
      try {
        setIsLoading(true);
        const [profRes, appRes] = await Promise.allSettled([
          api.get(`/job-seeker-profile/${candidateUserId}`),
          api.get('/applications/employer'),
        ]);

        if (profRes.status === 'fulfilled' && profRes.value.data?.success && profRes.value.data?.data) {
          setData(profRes.value.data.data);
        }

        if (appRes.status === 'fulfilled' && appRes.value.data?.success && Array.isArray(appRes.value.data.data)) {
          const matched = appRes.value.data.data.filter((a: any) => {
            const uid = a.applicantId?._id || a.applicantId?.id || a.applicantId;
            return String(uid) === String(candidateUserId);
          });
          setCandidateApps(matched);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load candidate profile.';
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    }
    loadCandidateProfile();
  }, [candidateUserId]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6 font-sans pb-12">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <Skeleton variant="text" className="w-48 h-6" />
            <Skeleton variant="text" className="w-24 h-8" />
          </div>
          <Card className="p-8 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" className="w-20 h-20 shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton variant="text" className="w-48 h-6" />
                <Skeleton variant="text" className="w-32 h-4" />
              </div>
            </div>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (errorMsg || !data) {
    return (
      <ProtectedRoute>
        <div className="space-y-6 font-sans pb-12 max-w-xl mx-auto py-12">
          <Card className="p-8 text-center space-y-4 border-zinc-300 dark:border-zinc-700">
            <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Candidate Profile Not Found</h2>
              <p className="text-xs text-zinc-500">{errorMsg || 'Unable to fetch details for this candidate.'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.back()} className="text-xs font-semibold gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const { user: candidateUser, profile } = data;
  const displayName = candidateUser.firstName && candidateUser.lastName
    ? `${candidateUser.firstName} ${candidateUser.lastName}`
    : candidateUser.fullName;

  const displayLocation = profile.city && profile.country
    ? `${profile.city}, ${profile.country}`
    : profile.city || profile.country || candidateUser.location || '';

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans pb-12">
        {/* HEADER BAR */}
        <GSAPReveal direction="down" distance={16}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="text-xs font-semibold shrink-0 gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidate Search
            </Button>

            <Link href="/dashboard/messages">
              <Button variant="primary" size="sm" className="font-bold text-xs gap-1.5 shadow-subtle">
                <MessageSquare className="w-3.5 h-3.5" /> Message Candidate
              </Button>
            </Link>
          </div>
        </GSAPReveal>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* PROFILE HEADER CARD */}
          <GSAPReveal direction="up" distance={20} className="relative z-30">
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-zinc-600 shrink-0 shadow-card">
                  {candidateUser.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={candidateUser.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-zinc-400" />
                  )}
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{displayName}</h1>
                      {displayLocation && (
                        <p className="text-xs text-zinc-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {displayLocation}
                        </p>
                      )}
                    </div>

                    <Badge variant="outline" size="sm" className="capitalize font-bold text-xs self-center sm:self-auto">
                      {profile.experienceLevel || 'Entry'} Level Candidate
                    </Badge>
                  </div>

                  {/* Availability Badges */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    {profile.availableImmediately && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Available Immediately
                      </span>
                    )}
                    {profile.openToRelocate && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Open to Relocate
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </GSAPReveal>

          {/* SUBMITTED APPLICATIONS TO YOUR POSTINGS */}
          {candidateApps.length > 0 && (
            <GSAPReveal direction="up" distance={20} delay={0.03} className="relative z-20">
              <Card className="p-6 space-y-4 border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Applications to Your Requisitions ({candidateApps.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {candidateApps.map((app) => (
                    <div
                      key={app._id}
                      className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-subtle"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                        <div>
                          <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 block">
                            {app.jobId?.title || 'Job Requisition'}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Applied {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <Badge variant="default" size="sm" className="capitalize font-bold self-start sm:self-auto">
                          {app.status?.replace('_', ' ')}
                        </Badge>
                      </div>

                      {app.coverLetter && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                            Cover Letter / Note:
                          </span>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed italic bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
                            "{app.coverLetter}"
                          </p>
                        </div>
                      )}

                      {app.resumeUrl && (
                        <div className="pt-1">
                          <a
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download Application Resume PDF</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </GSAPReveal>
          )}

          {/* JOB PREFERENCES & EXPECTATIONS */}
          {((profile.desiredJobTitles && profile.desiredJobTitles.length > 0) ||
            (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) ||
            profile.minimumExpectedSalary) && (
            <GSAPReveal direction="up" distance={20} delay={0.05} className="relative z-20">
              <Card className="p-6 space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Job Preferences & Expectations
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.desiredJobTitles && profile.desiredJobTitles.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-zinc-400">Desired Job Roles</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.desiredJobTitles.map((t, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.preferredJobTypes && profile.preferredJobTypes.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-zinc-400">Preferred Job Types</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.preferredJobTypes.map((t, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 capitalize border border-zinc-200 dark:border-zinc-700">
                            {t.replace('_', '-')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.minimumExpectedSalary && (
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-bold text-zinc-400">Minimum Expected Salary</span>
                      <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          {(WORLD_COUNTRIES.find((c) => c.name === profile.country) || WORLD_COUNTRIES.find((c) => c.currency === 'PKR') || WORLD_COUNTRIES[0]).currencySymbol}{' '}
                          {Number(profile.minimumExpectedSalary).toLocaleString()} / month
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </GSAPReveal>
          )}

          {/* CONTACT DETAILS */}
          <GSAPReveal direction="up" distance={20} delay={0.1} className="relative z-10">
            <Card className="p-6 space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Contact Details
              </h3>

              {candidateUser.email || candidateUser.phone ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {candidateUser.email && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <span>{candidateUser.email}</span>
                    </div>
                  )}
                  {candidateUser.phone && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      <span>{candidateUser.countryCode || ''} {candidateUser.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-500 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-400" />
                  <span>Contact info is visible once candidate submits an application to your active openings.</span>
                </div>
              )}
            </Card>
          </GSAPReveal>

          {/* RESUME PDF SECTION */}
          {profile.resumeUrl && (
            <GSAPReveal direction="up" distance={20} delay={0.12}>
              <Card className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {profile.resumeOriginalFileName || `${candidateUser.fullName}_Resume.pdf`}
                      </h4>
                      <p className="text-[11px] text-zinc-400">Verified Candidate PDF Resume</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getResumeViewUrl(profile.resumeUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-subtle"
                    >
                      <span>View PDF</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(profile.resumeUrl, profile.resumeOriginalFileName || `${candidateUser.fullName}_Resume.pdf`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-subtle"
                    >
                      <span>Download</span>
                      <Download className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  </div>
                </div>
              </Card>
            </GSAPReveal>
          )}

          {/* BIO SECTION */}
          {profile.bio && (
            <GSAPReveal direction="up" distance={20} delay={0.14}>
              <Card className="p-6 space-y-2">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Professional Summary
                </h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {profile.bio}
                </p>
              </Card>
            </GSAPReveal>
          )}

          {/* SKILLS CARD */}
          <GSAPReveal direction="up" distance={20} delay={0.16}>
            <Card className="p-6 space-y-5">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Skills & Competencies
              </h3>

              {profile.verifiedSkills && profile.verifiedSkills.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Skill Badges
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.verifiedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400">Regular Technical Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </GSAPReveal>

          {/* PORTFOLIO & EXTERNAL LINKS */}
          {(profile.portfolioUrl || profile.linkedinUrl || profile.githubUrl) && (
            <GSAPReveal direction="up" distance={20} delay={0.18}>
              <Card className="p-6 space-y-3">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Portfolio & Profiles
                </h3>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {profile.portfolioUrl && (
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      <Globe className="w-4 h-4 text-zinc-500" />
                      <span>Portfolio Website</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                    </a>
                  )}

                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-zinc-500" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                    </a>
                  )}

                  {profile.githubUrl && (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      <Github className="w-4 h-4 text-zinc-500" />
                      <span>GitHub Profile</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                    </a>
                  )}
                </div>
              </Card>
            </GSAPReveal>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
