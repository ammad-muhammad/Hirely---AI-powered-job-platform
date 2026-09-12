import { Schema, model, Document, Types } from 'mongoose';

export interface AdminPermissions {
  canViewOverview: boolean;
  canManageUsers: boolean;
  canManageJobs: boolean;
  canManageVerifications: boolean;
  canManageBilling: boolean;
  canManageFraudDetection: boolean;
  canManageSettings: boolean;
  canManageSupport: boolean;
  canManageAdmins: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  role: 'job_seeker' | 'employer' | 'admin' | 'pending';
  authProvider?: 'email' | 'google';
  googleId?: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  country?: string;
  ipAddress?: string;
  isSuspended?: boolean;
  suspensionReason?: string | null;
  suspendedAt?: Date | null;
  warningCount?: number;
  lastWarningAt?: Date | null;
  lastWarningReason?: string | null;
  warningHistory?: Array<{ reason: string; issuedAt: Date; issuedBy?: string }>;
  isSuperAdmin?: boolean;
  adminPermissions?: AdminPermissions;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorTempSecret?: string | null;
  communicationPrefs?: {
    showOnlineStatus: boolean;
    showReadReceipts: boolean;
  };
  adminNotificationPrefs?: {
    newVerificationSubmitted: boolean;
    verificationReviewed: boolean;
    newUserRegistered: boolean;
    securityAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    firstName: {
      type: String,
      default: null,
      trim: true,
    },
    lastName: {
      type: String,
      default: null,
      trim: true,
    },
    countryCode: {
      type: String,
      default: '+92',
      trim: true,
    },
    role: {
      type: String,
      enum: ['job_seeker', 'employer', 'admin', 'pending'],
      default: 'job_seeker',
      required: true,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    phone: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: 'United States',
      trim: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
      index: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    warningCount: {
      type: Number,
      default: 0,
    },
    lastWarningAt: {
      type: Date,
      default: null,
    },
    lastWarningReason: {
      type: String,
      default: null,
    },
    warningHistory: [
      {
        reason: { type: String, required: true },
        issuedAt: { type: Date, default: Date.now },
        issuedBy: { type: String, default: 'Admin' },
      },
    ],
    isSuperAdmin: {
      type: Boolean,
      default: undefined,
    },
    adminPermissions: {
      canViewOverview: { type: Boolean, default: true },
      canManageUsers: { type: Boolean, default: true },
      canManageJobs: { type: Boolean, default: true },
      canManageVerifications: { type: Boolean, default: true },
      canManageBilling: { type: Boolean, default: true },
      canManageFraudDetection: { type: Boolean, default: true },
      canManageSettings: { type: Boolean, default: true },
      canManageSupport: { type: Boolean, default: true },
      canManageAdmins: { type: Boolean, default: false },
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },
    twoFactorTempSecret: {
      type: String,
      default: null,
      select: false,
    },
    communicationPrefs: {
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
      showReadReceipts: {
        type: Boolean,
        default: true,
      },
    },
    adminNotificationPrefs: {
      newVerificationSubmitted: { type: Boolean, default: true },
      verificationReviewed: { type: Boolean, default: true },
      newUserRegistered: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', userSchema);
