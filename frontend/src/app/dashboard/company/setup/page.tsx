'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Building2,
  Upload,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Globe,
  MapPin,
  Users,
  ShieldCheck,
  Briefcase,
  ExternalLink,
  Plus,
  Check,
  X,
  Sparkles,
  Calendar,
  Heart,
  ImageIcon,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Share2,
} from 'lucide-react';

const companySchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required'),
  industry: z.string().trim().min(2, 'Industry is required'),
  description: z.string().optional(),
  website: z.string().url('Please enter a valid URL (e.g. https://company.com)').or(z.literal('')).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+'], {
    required_error: 'Please select company size',
  }),
  location: z.string().trim().min(2, 'Location is required'),
  foundedYear: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1800, 'Invalid year').max(new Date().getFullYear(), 'Year cannot be in the future').optional()
  ),
  cultureDescription: z.string().optional(),
  socialLinkedin: z.string().url('Invalid LinkedIn URL').or(z.literal('')).optional(),
  socialFacebook: z.string().url('Invalid Facebook URL').or(z.literal('')).optional(),
  socialTwitter: z.string().url('Invalid Twitter/X URL').or(z.literal('')).optional(),
  socialInstagram: z.string().url('Invalid Instagram URL').or(z.literal('')).optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface ActiveJobItem {
  _id: string;
  title: string;
  location?: string;
  jobType?: string;
  status: 'active' | 'closed';
  createdAt: string;
  applicantCount: number;
}

const SUGGESTED_BENEFITS = [
  'Health Insurance',
  'Remote Work',
  'Paid Leave',
  'Provident Fund',
  'Flexible Hours',
  'Learning Stipend',
  'Performance Bonus',
  'Gym Membership',
];

export default function CompanySetupPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [existingBanner, setExistingBanner] = useState<string | null>(null);

  const [benefitsState, setBenefitsState] = useState<string[]>([]);
  const [customBenefitInput, setCustomBenefitInput] = useState('');

  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [activeJobs, setActiveJobs] = useState<ActiveJobItem[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companySize: '1-10',
    },
  });

  const watchFields = watch();

  useEffect(() => {
    if (user && user.role !== 'employer') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/companies/me');
      if (response.data?.success && response.data?.data) {
        const comp = response.data.data;
        setCompanyId(comp._id);
        setValue('companyName', comp.companyName || '');
        setValue('industry', comp.industry || '');
        setValue('description', comp.description || '');
        setValue('website', comp.website || '');
        setValue('companySize', comp.companySize || '1-10');
        setValue('location', comp.location || '');
        if (comp.foundedYear) setValue('foundedYear', comp.foundedYear);
        if (comp.cultureDescription) setValue('cultureDescription', comp.cultureDescription);

        if (comp.socialLinks) {
          if (comp.socialLinks.linkedin) setValue('socialLinkedin', comp.socialLinks.linkedin);
          if (comp.socialLinks.facebook) setValue('socialFacebook', comp.socialLinks.facebook);
          if (comp.socialLinks.twitter) setValue('socialTwitter', comp.socialLinks.twitter);
          if (comp.socialLinks.instagram) setValue('socialInstagram', comp.socialLinks.instagram);
        }

        if (Array.isArray(comp.benefits)) {
          setBenefitsState(comp.benefits);
        }
        setIsVerified(Boolean(comp.isVerified));
        if (comp.logoUrl) setExistingLogo(comp.logoUrl);
        if (comp.bannerImageUrl) setExistingBanner(comp.bannerImageUrl);
      }

      setIsLoadingJobs(true);
      const jobsRes = await api.get('/jobs/my-jobs').catch(() => null);
      if (jobsRes?.data?.success && Array.isArray(jobsRes.data.data)) {
        setActiveJobs(jobsRes.data.data.filter((j: ActiveJobItem) => j.status === 'active'));
      }
    } catch {
      // New profile setup
    } finally {
      setIsLoading(false);
      setIsLoadingJobs(false);
    }
  }, [setValue]);

  useEffect(() => {
    if (user && user.role === 'employer') {
      loadData();
    }
  }, [user, loadData]);

  const profileCompletion = useMemo(() => {
    let score = 0;
    if (watchFields.companyName && watchFields.companyName.trim().length >= 2) score += 15;
    if (watchFields.industry && watchFields.industry.trim().length >= 2) score += 15;
    if (watchFields.location && watchFields.location.trim().length >= 2) score += 15;
    if (watchFields.companySize) score += 10;
    if (existingLogo || logoPreview) score += 15;
    if (existingBanner || bannerPreview) score += 10;
    if (watchFields.cultureDescription && watchFields.cultureDescription.trim().length >= 10) score += 10;
    if (benefitsState.length > 0) score += 10;
    if (watchFields.socialLinkedin || watchFields.socialTwitter || watchFields.website) score += 5;
    return Math.min(100, score);
  }, [watchFields, existingLogo, logoPreview, existingBanner, bannerPreview, benefitsState]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleAddBenefit = (benefitName: string) => {
    const trimmed = benefitName.trim();
    if (!trimmed) return;
    if (!benefitsState.includes(trimmed)) {
      setBenefitsState((prev) => [...prev, trimmed]);
    }
    setCustomBenefitInput('');
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefitsState((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CompanyFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('companyName', data.companyName);
      formData.append('industry', data.industry);
      formData.append('companySize', data.companySize);
      formData.append('location', data.location);
      if (data.description) formData.append('description', data.description);
      if (data.website) formData.append('website', data.website);
      if (data.foundedYear) formData.append('foundedYear', String(data.foundedYear));
      if (data.cultureDescription) formData.append('cultureDescription', data.cultureDescription);
      formData.append('benefits', JSON.stringify(benefitsState));

      const socialLinksObj = {
        linkedin: data.socialLinkedin || '',
        facebook: data.socialFacebook || '',
        twitter: data.socialTwitter || '',
        instagram: data.socialInstagram || '',
      };
      formData.append('socialLinks', JSON.stringify(socialLinksObj));

      if (logoFile) formData.append('logo', logoFile);

      const response = await api.put('/companies/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        if (response.data.data?._id) {
          setCompanyId(response.data.data._id);
        }
        if (response.data.data?.logoUrl) {
          setExistingLogo(response.data.data.logoUrl);
          setLogoPreview(null);
        }

        if (bannerFile) {
          const bannerFormData = new FormData();
          bannerFormData.append('banner', bannerFile);
          const bannerRes = await api.post('/companies/banner', bannerFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (bannerRes.data?.data?.bannerImageUrl) {
            setExistingBanner(bannerRes.data.data.bannerImageUrl);
            setBannerPreview(null);
          }
        }

        setSuccessMessage('Company profile updated successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save company profile';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 font-sans pb-12">
        {/* HEADER SECTION */}
        <GSAPReveal direction="down" distance={16}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Employer Company Profile
                </h1>
                {isVerified && (
                  <Badge variant="success" size="sm" className="gap-1 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your employer branding, organization details, social profiles, and public company page.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {companyId && (
                <Link href={`/companies/${companyId}`} target="_blank">
                  <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> View Public Page
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-xs font-semibold shrink-0 gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
            </div>
          </div>
        </GSAPReveal>

        {/* FEEDBACK MESSAGES */}
        {serverError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="font-semibold">{serverError}</span>
            </div>
            <button onClick={() => setServerError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MAIN FORM GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <GSAPReveal direction="up" distance={20} className="relative z-30">
              <Card className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <Building2 className="w-5 h-5 text-zinc-500" />
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Organization & Branding Details
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      This information builds your public company page and employer brand on Hirely.
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton variant="rectangular" className="w-full h-12 rounded-xl" />
                    <Skeleton variant="rectangular" className="w-full h-12 rounded-xl" />
                    <Skeleton variant="rectangular" className="w-full h-24 rounded-xl" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Banner Image Upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-zinc-500" /> Cover / Banner Image
                      </label>
                      <div className="relative w-full h-36 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 overflow-hidden group shadow-subtle">
                        {bannerPreview ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                        ) : existingBanner ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={existingBanner} alt="Company Banner" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center text-zinc-400">
                            <span className="text-xs font-semibold">No cover image uploaded</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <span className="px-4 py-2 rounded-xl bg-white/90 text-zinc-900 text-xs font-extrabold flex items-center gap-1.5 shadow-lg">
                            <Upload className="w-3.5 h-3.5" /> Upload Cover Image
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                        </label>
                      </div>
                      <span className="text-[11px] text-zinc-400 block">Recommended size: 1200x350px (Max 5MB)</span>
                    </div>

                    {/* Company Logo Upload & Preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Company Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-subtle">
                          {logoPreview ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                          ) : existingLogo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={existingLogo} alt="Company Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-8 h-8 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="cursor-pointer inline-flex items-center px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-subtle w-fit">
                            <Upload className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                            <span>Upload Logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                          </label>
                          <span className="text-[11px] text-zinc-400">PNG, JPG, WEBP (Max 5MB)</span>
                        </div>
                      </div>
                    </div>

                    <Input
                      label="Company Name *"
                      placeholder="e.g. Acme Corporation"
                      error={errors.companyName?.message}
                      {...register('companyName')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Industry *"
                        placeholder="e.g. Software & AI"
                        error={errors.industry?.message}
                        {...register('industry')}
                      />

                      <Select
                        label="Company Size *"
                        value={watchFields.companySize}
                        onChange={(e) => setValue('companySize', e.target.value as any, { shouldValidate: true })}
                        error={errors.companySize?.message}
                        options={[
                          { value: '1-10', label: '1-10 employees' },
                          { value: '11-50', label: '11-50 employees' },
                          { value: '51-200', label: '51-200 employees' },
                          { value: '201-500', label: '201-500 employees' },
                          { value: '500+', label: '500+ employees' },
                        ]}
                      />

                      <Input
                        label="Founded Year"
                        type="number"
                        placeholder="e.g. 2018"
                        error={errors.foundedYear?.message}
                        {...register('foundedYear')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Headquarters Location *"
                        placeholder="e.g. San Francisco, CA"
                        error={errors.location?.message}
                        {...register('location')}
                      />

                      <Input
                        label="Company Website URL"
                        placeholder="https://company.com"
                        error={errors.website?.message}
                        {...register('website')}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        About Company (Overview Description)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Provide a general overview of your company background, business model, and products..."
                        className="w-full p-3.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors shadow-subtle placeholder:text-zinc-400"
                        {...register('description')}
                      />
                    </div>

                    {/* WHY JOIN US / CULTURE DESCRIPTION */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> "Why Join Us" / Culture Statement
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Describe your work culture, engineering values, mission, career growth, and why top talent should join your team..."
                        className="w-full p-3.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors shadow-subtle placeholder:text-zinc-400"
                        {...register('cultureDescription')}
                      />
                    </div>

                    {/* SOCIAL & PROFESSIONAL LINKS (ISSUE 3) */}
                    <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-indigo-500" /> Social & Professional Media Links
                      </label>
                      <p className="text-xs text-zinc-500">
                        Add links to your official social profiles. Clickable icons will appear on your public company profile.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="LinkedIn Company URL"
                          placeholder="https://linkedin.com/company/acme"
                          error={errors.socialLinkedin?.message}
                          {...register('socialLinkedin')}
                        />
                        <Input
                          label="Facebook Page URL"
                          placeholder="https://facebook.com/acme"
                          error={errors.socialFacebook?.message}
                          {...register('socialFacebook')}
                        />
                        <Input
                          label="Twitter / X Profile URL"
                          placeholder="https://x.com/acme"
                          error={errors.socialTwitter?.message}
                          {...register('socialTwitter')}
                        />
                        <Input
                          label="Instagram Profile URL"
                          placeholder="https://instagram.com/acme"
                          error={errors.socialInstagram?.message}
                          {...register('socialInstagram')}
                        />
                      </div>
                    </div>

                    {/* COMPANY BENEFITS & PERKS */}
                    <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-rose-500" /> Company Perks & Benefits
                      </label>

                      {/* Quick Add Suggestions */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-zinc-400 block">Quick-add common perks:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTED_BENEFITS.map((benefit) => {
                            const isAdded = benefitsState.includes(benefit);
                            return (
                              <button
                                key={benefit}
                                type="button"
                                onClick={() => (isAdded ? setBenefitsState((prev) => prev.filter((b) => b !== benefit)) : handleAddBenefit(benefit))}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                                  isAdded
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                                }`}
                              >
                                {isAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-zinc-400" />}
                                <span>{benefit}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          placeholder="Type custom perk (e.g. Stock Options, Annual Retreat)..."
                          value={customBenefitInput}
                          onChange={(e) => setCustomBenefitInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddBenefit(customBenefitInput);
                            }
                          }}
                          className="text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddBenefit(customBenefitInput)}
                          className="shrink-0 text-xs font-semibold"
                        >
                          Add Benefit
                        </Button>
                      </div>

                      {/* Active Benefit Chips */}
                      {benefitsState.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {benefitsState.map((b, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-subtle"
                            >
                              <span>{b}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveBenefit(idx)}
                                className="hover:opacity-70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button type="submit" variant="primary" className="w-full py-3 font-bold text-sm shadow-subtle" isLoading={isSubmitting}>
                      Save Company Profile
                    </Button>
                  </form>
                )}
              </Card>
            </GSAPReveal>
          </div>

          {/* RIGHT RAIL: PROFILE STRENGTH & ACTIVE JOBS (~35%) */}
          <div className="lg:col-span-4 space-y-6">
            {/* PROFILE COMPLETION SCORE */}
            <GSAPReveal direction="up" distance={20} delay={0.1}>
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Profile Completion
                    </h3>
                    <p className="text-[11px] text-zinc-500">Employer profile quality</p>
                  </div>
                  <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                    {profileCompletion}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    style={{ width: `${profileCompletion}%` }}
                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
                  />
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  A complete company profile increases candidate application conversion by up to 40%.
                </p>

                {/* Checklist */}
                <div className="space-y-1.5 text-xs pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Company Name</span>
                    {watchFields.companyName ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Company Logo</span>
                    {existingLogo || logoPreview ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Cover Banner Image</span>
                    {existingBanner || bannerPreview ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Culture Statement</span>
                    {watchFields.cultureDescription ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Company Benefits ({benefitsState.length})</span>
                    {benefitsState.length > 0 ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                </div>
              </Card>
            </GSAPReveal>

            {/* ACTIVE JOBS SNAPSHOT */}
            <GSAPReveal direction="up" distance={20} delay={0.15}>
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-zinc-500" /> Active Openings ({activeJobs.length})
                  </h3>
                  <Link href="/dashboard/jobs/post">
                    <Button variant="ghost" size="sm" className="text-xs font-semibold p-1">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {isLoadingJobs ? (
                  <div className="space-y-2">
                    <Skeleton variant="text" className="w-full h-4" />
                    <Skeleton variant="text" className="w-full h-4" />
                  </div>
                ) : activeJobs.length === 0 ? (
                  <div className="text-center py-4 space-y-2 text-xs text-zinc-500">
                    <p>No active job postings found.</p>
                    <Link href="/dashboard/jobs/post" className="inline-block">
                      <Button variant="outline" size="sm" className="text-xs font-bold gap-1">
                        <Plus className="w-3.5 h-3.5" /> Post a Job
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeJobs.slice(0, 4).map((job) => (
                      <Link
                        key={job._id}
                        href={`/jobs/${job._id}`}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:border-zinc-400 transition-colors block space-y-1"
                      >
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block truncate">
                          {job.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          {job.location && <span>{job.location}</span>}
                          <span>•</span>
                          <span>{job.applicantCount || 0} applicants</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </GSAPReveal>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
