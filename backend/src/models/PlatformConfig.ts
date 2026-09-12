import { Schema, model, Document, Types } from 'mongoose';

export interface IPlatformConfig extends Document {
  signupsEnabled: boolean;
  jobPostingEnabled: boolean;
  aiRateLimits: {
    resumeAnalysisLimit: number;
    coverLetterGenLimit: number;
    mockInterviewLimit: number;
  };
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const platformConfigSchema = new Schema<IPlatformConfig>(
  {
    signupsEnabled: {
      type: Boolean,
      default: true,
    },
    jobPostingEnabled: {
      type: Boolean,
      default: true,
    },
    aiRateLimits: {
      resumeAnalysisLimit: {
        type: Number,
        default: 10,
      },
      coverLetterGenLimit: {
        type: Number,
        default: 10,
      },
      mockInterviewLimit: {
        type: Number,
        default: 5,
      },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformConfig = model<IPlatformConfig>('PlatformConfig', platformConfigSchema);
