'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Building2,
  User,
  Mail,
  Clock,
  RefreshCw,
  Eye,
  AlertTriangle,
  History,
  Ban,
  Globe,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import gsap from 'gsap';

interface OwnerInfo {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isSuspended?: boolean;
}

interface VerificationDoc {
  url: string;
  documentType: 'ntn_certificate' | 'business_registration' | 'cnic' | 'other';
  uploadedAt: string;
}

interface VerificationHistoryItem {
  status: 'submitted' | 'approved' | 'rejected' | 'revoked';
  timestamp: string;
  reason?: string | null;
  reviewedByAdminId?: {
    fullName?: string;
    email?: string;
  } | null;
}

interface CompanyItem {
  _id: string;
  companyName: string;
  logoUrl?: string;
  industry: string;
  description?: string;
  website?: string;
  companySize: string;
  location: string;
  foundedYear?: number;
  ownerId: OwnerInfo;
  isVerified: boolean;
  verificationStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'unverified';
  verificationSubmittedAt: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  verificationDocuments: VerificationDoc[];
  verificationHistory?: VerificationHistoryItem[];
  aiAssessment?: {
    riskLevel: 'low' | 'medium' | 'high';
    flags: string[];
    summary: string;
  };
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ntn_certificate: 'NTN Tax Certificate',
  business_registration: 'Business Registration Certificate',
  cnic: 'CNIC / Founder ID',
  other: 'Other Official Document',
};

import { Pagination } from '@/components/ui/Pagination';

export default function AdminVerificationsPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal State
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Reject Modal State
  const [rejectingCompany, setRejectingCompany] = useState<CompanyItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Revoke Modal State
  const [revokingCompany, setRevokingCompany] = useState<CompanyItem | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchVerifications = useCallback(async (targetPage = 1) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/admin/verifications?status=${activeFilter}&page=${targetPage}&limit=10`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setCompanies(res.data.data);
        if (res.data.pagination) {
          setPage(res.data.pagination.currentPage || targetPage);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching verifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchVerifications(page);
  }, [fetchVerifications, page]);

  // GSAP entrance animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isLoading && containerRef.current && !prefersReducedMotion) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  const handleOpenDetail = async (company: CompanyItem) => {
    try {
      const res = await api.get(`/admin/verifications/${company._id}`);
      if (res.data?.success && res.data?.data) {
        setSelectedCompany(res.data.data);
      } else {
        setSelectedCompany(company);
      }
    } catch {
      setSelectedCompany(company);
    }
    setIsDetailOpen(true);
  };

  const handleApprove = async (company: CompanyItem) => {
    setActionLoadingId(company._id);
    try {
      const res = await api.put(`/admin/verifications/${company._id}/approve`);
      if (res.data?.success) {
        fetchVerifications();
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCompany) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please enter a clear rejection reason for the employer.');
      return;
    }

    setActionLoadingId(rejectingCompany._id);
    setRejectError(null);

    try {
      const res = await api.put(`/admin/verifications/${rejectingCompany._id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });

      if (res.data?.success) {
        fetchVerifications();
        setRejectingCompany(null);
        setRejectionReason('');
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      setRejectError(err.response?.data?.message || 'Failed to reject verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingCompany) return;
    if (!revocationReason.trim()) {
      setRevokeError('Please enter a clear revocation reason for revoking this verification.');
      return;
    }

    setActionLoadingId(revokingCompany._id);
    setRevokeError(null);

    try {
      const res = await api.put(`/admin/verifications/${revokingCompany._id}/revoke`, {
        revocationReason: revocationReason.trim(),
      });

      if (res.data?.success) {
        fetchVerifications();
        setRevokingCompany(null);
        setRevocationReason('');
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      setRevokeError(err.response?.data?.message || 'Failed to revoke verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 uppercase tracking-wider">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wider">
            Unverified
          </span>
        );
    }
  };

  const filterTabs = [
    { id: 'pending', label: 'Pending Queue' },
    { id: 'approved', label: 'Verified' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'unverified', label: 'Unverified' },
    { id: 'all', label: 'All Companies' },
  ];

  return (
    <div ref={containerRef} className="space-y-6 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#1f1f1f] text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
              Employer Verification Management
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Review NTN, Business Registration, and founder identity documents submitted by employers
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchVerifications(page)}
          className="text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </Button>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeFilter === tab.id
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* QUEUE / LIST WORKSPACE */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse h-40 rounded-xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
            No Company Verification Submissions Found
          </h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-medium">
            There are currently no company records matching your selected status filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => {
            const isPending = company.verificationStatus === 'pending';
            return (
              <Card
                key={company._id}
                className={`p-5 md:p-6 text-zinc-900 dark:text-zinc-100 shadow-subtle space-y-4 transition-all ${
                  isPending
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-amber-500'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 overflow-hidden">
                      {company.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={company.logoUrl} alt={company.companyName} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">{company.companyName}</h2>
                        {getStatusBadge(company.verificationStatus)}
                        {isPending && (
                          <Badge variant="warning" size="sm" className="font-extrabold text-[10px] uppercase">
                            Pending Review
                          </Badge>
                        )}
                      </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
                      <span>{company.industry}</span>
                      <span>•</span>
                      <span>{company.location}</span>
                      <span>•</span>
                      <span>{company.companySize} employees</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 flex items-center gap-1.5 self-start md:self-center shrink-0 font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Submitted: <strong className="text-zinc-900 dark:text-zinc-100">{company.verificationSubmittedAt ? new Date(company.verificationSubmittedAt).toLocaleDateString() : 'N/A'}</strong></span>
                </div>
              </div>

              {/* AI VERIFICATION ASSESSMENT */}
              {company.aiAssessment && (
                <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>AI Verification Review Assistant</span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 ${
                        company.aiAssessment.riskLevel === 'high'
                          ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          : company.aiAssessment.riskLevel === 'medium'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          company.aiAssessment.riskLevel === 'high'
                            ? 'bg-red-500'
                            : company.aiAssessment.riskLevel === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span>{company.aiAssessment.riskLevel} Risk Assessment</span>
                    </span>
                  </div>

                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                    {company.aiAssessment.summary}
                  </p>

                  {company.aiAssessment.flags && company.aiAssessment.flags.length > 0 && (
                    <div className="pt-1 space-y-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                        Flags Requiring Admin Review:
                      </span>
                      <ul className="space-y-1">
                        {company.aiAssessment.flags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Employer Info & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-zinc-400" />
                    <strong className="text-zinc-900 dark:text-zinc-100">{company.ownerId?.fullName || 'N/A'}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span>{company.ownerId?.email || 'N/A'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(company)}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </Button>

                  {company.verificationStatus === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectingCompany(company);
                          setRejectionReason('');
                          setRejectError(null);
                        }}
                        disabled={actionLoadingId === company._id}
                        className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 font-bold text-xs gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Reject</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(company)}
                        isLoading={actionLoadingId === company._id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </Button>
                    </>
                  )}

                  {company.verificationStatus === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRevokingCompany(company);
                        setRevocationReason('');
                        setRevokeError(null);
                      }}
                      disabled={actionLoadingId === company._id}
                      className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300 font-bold text-xs gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5 text-amber-600" />
                      <span>Revoke Verification</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {!isLoading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}

      {/* VERIFICATION DETAIL REVIEW MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-zinc-500" />
            <span>Company Verification Dossier</span>
          </div>
        }
        maxWidth="2xl"
      >
        {selectedCompany && (
          <div className="space-y-6 font-sans text-xs">
            {/* Header Meta */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 text-amber-500 font-bold text-base overflow-hidden">
                  {selectedCompany.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selectedCompany.logoUrl} alt={selectedCompany.companyName} className="w-full h-full object-cover" />
                  ) : (
                    selectedCompany.companyName.charAt(0)
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                    {selectedCompany.companyName}
                  </h3>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedCompany.verificationStatus)}
                    <span className="text-[11px] text-zinc-400">• {selectedCompany.industry}</span>
                  </div>
                </div>
              </div>

              {selectedCompany.website && (
                <a
                  href={selectedCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                </a>
              )}
            </div>

            {/* Grid: Company Details & Employer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Information</span>
                <p>Location: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCompany.location}</strong></p>
                <p>Company Size: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCompany.companySize} employees</strong></p>
                {selectedCompany.description && (
                  <p className="text-zinc-500 italic pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    "{selectedCompany.description}"
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Employer / Founder Information</span>
                <p>Full Name: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCompany.ownerId?.fullName || 'N/A'}</strong></p>
                <p>Email: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCompany.ownerId?.email || 'N/A'}</strong></p>
                <p>Account Status: {selectedCompany.ownerId?.isSuspended ? <span className="text-red-600 font-bold">Suspended</span> : <span className="text-emerald-600 font-bold">Active</span>}</p>
              </div>
            </div>

            {/* Submitted Verification Documents */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Submitted Verification Documents ({selectedCompany.verificationDocuments?.length || 0})
              </h4>

              <div className="space-y-2">
                {selectedCompany.verificationDocuments && selectedCompany.verificationDocuments.length > 0 ? (
                  selectedCompany.verificationDocuments.map((doc, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-950">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 flex items-center gap-1.5 shrink-0"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-400 italic">No verification documents attached.</p>
                )}
              </div>
            </div>

            {/* Verification History Audit Trail */}
            {selectedCompany.verificationHistory && selectedCompany.verificationHistory.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Verification Audit History</span>
                </h4>

                <div className="space-y-2 border-l-2 border-zinc-200 dark:border-zinc-800 pl-4 ml-2">
                  {selectedCompany.verificationHistory.map((item, idx) => (
                    <div key={idx} className="space-y-1 relative">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 capitalize">{item.status}</span>
                        <span className="text-[10px] text-zinc-400">• {new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      {item.reason && (
                        <p className="text-zinc-500 italic bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                          "{item.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {selectedCompany.verificationStatus === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectingCompany(selectedCompany);
                      setRejectionReason('');
                      setRejectError(null);
                    }}
                    className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 font-bold text-xs"
                  >
                    Reject Verification
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(selectedCompany)}
                    isLoading={actionLoadingId === selectedCompany._id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Approve Verification
                  </Button>
                </>
              )}

              {selectedCompany.verificationStatus === 'approved' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRevokingCompany(selectedCompany);
                    setRevocationReason('');
                    setRevokeError(null);
                  }}
                  className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300 font-bold text-xs"
                >
                  Revoke Verification
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal
        isOpen={Boolean(rejectingCompany)}
        onClose={() => setRejectingCompany(null)}
        title="Reject Verification Request"
        maxWidth="md"
      >
        {rejectingCompany && (
          <form onSubmit={handleRejectSubmit} className="space-y-4 font-sans text-xs">
            <p className="text-zinc-500 font-medium">
              Provide a clear reason for rejecting the verification request of{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{rejectingCompany.companyName}</strong>.
            </p>

            {rejectError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 font-semibold">
                {rejectError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Rejection Reason (Required)
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. NTN document is unreadable or business registration certificate is expired. Please upload a legible copy."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRejectingCompany(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={actionLoadingId === rejectingCompany._id}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* REVOCATION REASON MODAL */}
      <Modal
        isOpen={Boolean(revokingCompany)}
        onClose={() => setRevokingCompany(null)}
        title="Revoke Verification Badge"
        maxWidth="md"
      >
        {revokingCompany && (
          <form onSubmit={handleRevokeSubmit} className="space-y-4 font-sans text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Revoking verification will remove the verified checkmark badge from{' '}
                <strong>{revokingCompany.companyName}</strong> and notify the employer.
              </p>
            </div>

            {revokeError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 font-semibold">
                {revokeError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Revocation Reason (Required)
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Discovered expired business registration or fraudulent NTN tax documentation upon re-inspection."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRevokingCompany(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={actionLoadingId === revokingCompany._id}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Confirm Revocation
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
