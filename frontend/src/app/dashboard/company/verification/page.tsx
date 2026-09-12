'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { GSAPReveal } from '@/components/animation/GSAPReveal';
import {
  Building2,
  ShieldCheck,
  Clock,
  XCircle,
  Upload,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  File,
  X,
  Sparkles,
} from 'lucide-react';

interface VerificationDoc {
  url: string;
  documentType: 'ntn_certificate' | 'business_registration' | 'cnic' | 'other';
  uploadedAt: string;
}

interface VerificationStatusData {
  companyId: string;
  companyName: string;
  isVerified: boolean;
  verificationStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  verificationSubmittedAt?: string | null;
  verificationReviewedAt?: string | null;
  verificationRejectionReason?: string | null;
  verificationDocuments: VerificationDoc[];
}

interface UploadRow {
  file: File | null;
  documentType: 'ntn_certificate' | 'business_registration' | 'cnic' | 'other';
}

const DOC_TYPE_OPTIONS = [
  { value: 'ntn_certificate', label: 'NTN Tax Certificate' },
  { value: 'business_registration', label: 'Business Registration Certificate' },
  { value: 'cnic', label: 'CNIC / Founder Government ID' },
  { value: 'other', label: 'Other Official Document' },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  ntn_certificate: 'NTN Tax Certificate',
  business_registration: 'Business Registration Certificate',
  cnic: 'CNIC / Founder Government ID',
  other: 'Other Official Document',
};

export default function EmployerVerificationPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<VerificationStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [uploadRows, setUploadRows] = useState<UploadRow[]>([
    { file: null, documentType: 'ntn_certificate' },
  ]);

  useEffect(() => {
    if (user && user.role !== 'employer') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadStatus = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const res = await api.get('/companies/verification/status');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch verification status:', err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'employer') {
      loadStatus(true);
    }
  }, [user, loadStatus]);

  // Real-time Socket & Auto-polling for pending status
  useEffect(() => {
    let socketInstance: any = null;

    const setupSocket = async () => {
      socketInstance = await getSocket();
      if (socketInstance) {
        socketInstance.on('verification_updated', () => {
          loadStatus(false);
        });
      }
    };

    setupSocket();

    const interval = setInterval(() => {
      if (data?.verificationStatus === 'pending') {
        loadStatus(false);
      }
    }, 4000);

    return () => {
      if (socketInstance) {
        socketInstance.off('verification_updated');
      }
      clearInterval(interval);
    };
  }, [data?.verificationStatus, loadStatus]);

  const handleAddRow = () => {
    if (uploadRows.length < 3) {
      setUploadRows([...uploadRows, { file: null, documentType: 'business_registration' }]);
    }
  };

  const handleRemoveRow = (idx: number) => {
    if (uploadRows.length > 1) {
      setUploadRows(uploadRows.filter((_, i) => i !== idx));
    }
  };

  const handleFileChange = (idx: number, file: File | null) => {
    const updated = [...uploadRows];
    updated[idx].file = file;
    setUploadRows(updated);
  };

  const handleTypeChange = (idx: number, type: any) => {
    const updated = [...uploadRows];
    updated[idx].documentType = type;
    setUploadRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const filesToUpload = uploadRows.filter((r) => r.file !== null);
    if (filesToUpload.length === 0) {
      setErrorMsg('Please select at least one verification document (PDF or Image) to upload.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      const docTypesArray: string[] = [];

      filesToUpload.forEach((row) => {
        if (row.file) {
          formData.append('documents', row.file);
          docTypesArray.push(row.documentType);
        }
      });

      formData.append('documentTypes', JSON.stringify(docTypesArray));

      const res = await api.post('/companies/verification/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setSuccessMsg('Verification documents submitted successfully! Compliance review is in progress.');
        await loadStatus(false);
      }
    } catch (err: unknown) {
      const msg =
        (err as any).response?.data?.message || (err as Error).message || 'Failed to submit verification documents.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const status = data?.verificationStatus || 'not_submitted';

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton variant="rectangular" className="w-full h-36 rounded-2xl" />
        <Skeleton variant="rectangular" className="w-full h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* TOP NAVIGATION & ACTION BAR */}
      <GSAPReveal direction="down" distance={16}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-zinc-500" />
              <span>Company Verification Center</span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Verify your organization to earn the verified badge across job postings and candidate views.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/company/setup')}
              className="text-xs font-semibold gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" /> Company Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-xs font-semibold gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </div>
        </div>
      </GSAPReveal>

      {/* FEEDBACK BANNERS */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATUS OVERVIEW CARDS */}

      {/* STATUS 1: APPROVED / VERIFIED */}
      {status === 'approved' && (
        <GSAPReveal direction="up" distance={20}>
          <Card className="p-8 text-center space-y-6 border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-subtle">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-subtle">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <Badge variant="success" size="md" className="font-extrabold uppercase text-xs">
                Verified Organization ✓
              </Badge>
              <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 pt-1">
                {data?.companyName || 'Organization'} is Fully Verified
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Your official business documents have been authenticated and approved by Hirely Administration.
              </p>
              {data?.verificationReviewedAt && (
                <p className="text-[11px] font-semibold text-zinc-500">
                  Approved on {new Date(data.verificationReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Verification Badge Preview */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/60 max-w-md mx-auto space-y-2 text-left">
              <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Verification Badge Display Preview
              </span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
                  {data?.companyName || 'Company Name'}
                </span>
                <Badge variant="success" size="sm" className="font-bold text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                This verification checkmark is publicly displayed on your job requisitions to increase applicant trust.
              </p>
            </div>
          </Card>
        </GSAPReveal>
      )}

      {/* STATUS 2: PENDING REVIEW */}
      {status === 'pending' && (
        <GSAPReveal direction="up" distance={20}>
          <Card className="p-8 text-center space-y-6 border-2 border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-subtle">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <Badge variant="warning" size="md" className="font-extrabold uppercase text-xs">
                Verification Pending Compliance Review
              </Badge>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 pt-1">
                Submitted Documents Are Under Review
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Our compliance team is verifying your business documents. Reviews are usually completed within <strong>1-3 business days</strong>. Real-time updates will automatically reflect here.
              </p>
            </div>

            {/* Submitted Documents Listing */}
            {data?.verificationDocuments && data.verificationDocuments.length > 0 && (
              <div className="pt-4 border-t border-amber-200 dark:border-amber-800/60 max-w-md mx-auto space-y-2 text-left">
                <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                  Submitted Documents ({data.verificationDocuments.length}):
                </span>
                {data.verificationDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-900 dark:text-zinc-100 shadow-subtle"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                      </span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 font-bold text-[11px] shrink-0"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </GSAPReveal>
      )}

      {/* STATUS 3: REJECTED */}
      {status === 'rejected' && (
        <GSAPReveal direction="up" distance={20}>
          <Card className="p-6 md:p-8 space-y-5 border-2 border-red-500/40 bg-red-50/30 dark:bg-red-950/20 shadow-subtle">
            <div className="flex items-center gap-3 border-b border-red-200 dark:border-red-900/50 pb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-700 dark:text-red-400">
                  Verification Submission Rejected
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Please review the feedback below and upload updated documentation for re-verification.
                </p>
              </div>
            </div>

            {data?.verificationRejectionReason && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 space-y-1">
                <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Rejection Reason from Compliance:
                </span>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 italic leading-relaxed">
                  "{data.verificationRejectionReason}"
                </p>
              </div>
            )}
          </Card>
        </GSAPReveal>
      )}

      {/* SUBMISSION FORM (Shown if not_submitted or rejected) */}
      {(status === 'not_submitted' || status === 'rejected') && (
        <GSAPReveal direction="up" distance={20} delay={0.1}>
          <Card className="p-6 md:p-8 space-y-6">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 space-y-1">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-zinc-500" />
                <span>Submit Official Verification Documents</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Upload official business proof (NTN Tax Certificate, Registration Certificate, or Founder Government ID). PDF or Images up to 5MB each.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {uploadRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4 shadow-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-zinc-500" /> Document #{idx + 1}
                      </span>

                      {uploadRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-red-600 dark:text-red-400 hover:underline text-xs flex items-center gap-1 font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Document Type Dropdown */}
                      <Select
                        label="Document Type *"
                        value={row.documentType}
                        onChange={(e) => handleTypeChange(idx, e.target.value as any)}
                        options={DOC_TYPE_OPTIONS}
                      />

                      {/* File Selection Box */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Select Document File (PDF / Image) *
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={(e) => handleFileChange(idx, e.target.files ? e.target.files[0] : null)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* File Selected Preview Pill */}
                    {row.file && (
                      <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <File className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block truncate">
                              {row.file.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              {formatFileSize(row.file.size)} • {row.file.type || 'Document'}
                            </span>
                          </div>
                        </div>
                        <Badge variant="success" size="sm" className="font-bold text-[10px] shrink-0">
                          Ready to Upload
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {uploadRows.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Document (Max 3)
                </Button>
              )}

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="font-bold text-xs px-8 gap-2"
                >
                  <Upload className="w-4 h-4" /> Submit for Verification
                </Button>
              </div>
            </form>
          </Card>
        </GSAPReveal>
      )}
    </div>
  );
}
