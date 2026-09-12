import { Schema, model, Document, Types } from 'mongoose';

export interface IVerificationDocument {
  url: string;
  documentType: 'ntn_certificate' | 'business_registration' | 'cnic' | 'other';
  uploadedAt: Date;
}

export interface ISocialLinks {
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
}

export interface IVerificationHistoryItem {
  status: 'submitted' | 'approved' | 'rejected' | 'revoked';
  timestamp: Date;
  reason?: string | null;
  reviewedByAdminId?: Types.ObjectId | null;
}

export interface ICompany extends Document {
  ownerId: Types.ObjectId;
  companyName: string;
  logoUrl?: string;
  industry: string;
  description?: string;
  website?: string;
  companySize: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  location: string;
  foundedYear?: number | null;
  cultureDescription?: string | null;
  benefits: string[];
  bannerImageUrl?: string | null;
  socialLinks?: ISocialLinks;
  subscriptionTier: 'free' | 'pro';
  subscriptionExpiresAt?: Date | null;
  isVerified: boolean;
  verificationDocumentUrl?: string;
  verificationStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'unverified';
  verificationSubmittedAt?: Date | null;
  verificationReviewedAt?: Date | null;
  verificationRejectionReason?: string | null;
  verificationDocuments: IVerificationDocument[];
  verificationHistory: IVerificationHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      default: null,
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      required: true,
    },
    location: {
      type: String,
      required: [true, 'Company location is required'],
      trim: true,
    },
    foundedYear: {
      type: Number,
      default: null,
    },
    cultureDescription: {
      type: String,
      default: null,
    },
    benefits: {
      type: [String],
      default: [],
    },
    bannerImageUrl: {
      type: String,
      default: null,
    },
    socialLinks: {
      linkedin: { type: String, default: null },
      facebook: { type: String, default: null },
      twitter: { type: String, default: null },
      instagram: { type: String, default: null },
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocumentUrl: {
      type: String,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected', 'unverified'],
      default: 'not_submitted',
      index: true,
    },
    verificationSubmittedAt: {
      type: Date,
      default: null,
    },
    verificationReviewedAt: {
      type: Date,
      default: null,
    },
    verificationRejectionReason: {
      type: String,
      default: null,
    },
    verificationDocuments: [
      {
        url: { type: String, required: true },
        documentType: {
          type: String,
          enum: ['ntn_certificate', 'business_registration', 'cnic', 'other'],
          required: true,
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationHistory: [
      {
        status: {
          type: String,
          enum: ['submitted', 'approved', 'rejected', 'revoked'],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: null },
        reviewedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Company = model<ICompany>('Company', companySchema);
