import { Schema, model, Document, Types } from 'mongoose';

export type AutoApplyDraftStatus = 'pending_review' | 'approved_and_applied' | 'rejected' | 'expired';

export interface IScreeningAnswerDraft {
  questionId?: Types.ObjectId | string;
  questionText: string;
  answerText: string;
  source: 'ai_generated' | 'user_edited' | 'manual';
  isMissing?: boolean;
}

export interface IAutoApplyDraft extends Document {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  generatedCoverLetter: string;
  screeningAnswers?: IScreeningAnswerDraft[];
  matchScore: number;
  matchReason: string;
  status: AutoApplyDraftStatus;
  rejectionReason?: string;
  applicationId?: Types.ObjectId;
  respondedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const screeningAnswerDraftSchema = new Schema<IScreeningAnswerDraft>(
  {
    questionId: { type: Schema.Types.Mixed, default: null },
    questionText: { type: String, required: true },
    answerText: { type: String, default: '' },
    source: {
      type: String,
      enum: ['ai_generated', 'user_edited', 'manual'],
      default: 'ai_generated',
    },
    isMissing: { type: Boolean, default: false },
  },
  { _id: false }
);

const autoApplyDraftSchema = new Schema<IAutoApplyDraft>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    generatedCoverLetter: {
      type: String,
      required: true,
    },
    screeningAnswers: {
      type: [screeningAnswerDraftSchema],
      default: [],
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    matchReason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_review', 'approved_and_applied', 'rejected', 'expired'],
      default: 'pending_review',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate drafts for the same job and user
autoApplyDraftSchema.index({ userId: 1, jobId: 1 }, { unique: true });
autoApplyDraftSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const AutoApplyDraft = model<IAutoApplyDraft>('AutoApplyDraft', autoApplyDraftSchema);
