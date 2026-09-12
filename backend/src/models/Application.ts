import { Schema, model, Document, Types } from 'mongoose';

export interface IScreeningAnswer {
  questionId?: Types.ObjectId | string;
  questionText: string;
  answerText: string;
  isDealBreakerMismatch?: boolean;
}

export interface IApplication extends Document {
  jobId: Types.ObjectId;
  applicantId: Types.ObjectId;
  status: 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'rejected' | 'hired';
  resumeUrl: string;
  resumeOriginalFileName?: string;
  coverLetter?: string;
  screeningAnswers?: IScreeningAnswer[];
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const screeningAnswerSchema = new Schema<IScreeningAnswer>(
  {
    questionId: { type: Schema.Types.Mixed, default: null },
    questionText: { type: String, required: true },
    answerText: { type: String, required: true },
    isDealBreakerMismatch: { type: Boolean, default: false },
  },
  { _id: false }
);

const applicationSchema = new Schema<IApplication>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['applied', 'under_review', 'shortlisted', 'interview', 'rejected', 'hired'],
      default: 'applied',
      index: true,
    },
    resumeUrl: {
      type: String,
      required: [true, 'Resume URL is required'],
    },
    resumeOriginalFileName: {
      type: String,
      default: null,
    },
    coverLetter: {
      type: String,
      default: null,
    },
    screeningAnswers: {
      type: [screeningAnswerSchema],
      default: [],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate applications
applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

export const Application = model<IApplication>('Application', applicationSchema);
