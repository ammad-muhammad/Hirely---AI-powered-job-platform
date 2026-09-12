import { Schema, model, Document, Types } from 'mongoose';

export interface IMockQuestion {
  questionText: string;
  category: 'behavioral' | 'technical' | 'situational';
  askedAt: Date;
}

export interface IMockAnswer {
  questionIndex: number;
  answerText: string;
  answeredAt: Date;
}

export interface IDetailedFeedback {
  questionIndex: number;
  feedback: string;
  score: number;
}

export interface IMockFeedback {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  communicationClarity: number;
  technicalAccuracy?: number | null;
  confidence: number;
  detailedFeedback: IDetailedFeedback[];
  summary: string;
}

export interface IMockInterview extends Document {
  userId: Types.ObjectId;
  targetField: string;
  jobId?: Types.ObjectId | null;
  status: 'in_progress' | 'completed';
  questions: IMockQuestion[];
  answers: IMockAnswer[];
  feedback?: IMockFeedback | null;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mockInterviewSchema = new Schema<IMockInterview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetField: {
      type: String,
      required: [true, 'Target field is required'],
      trim: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true,
    },
    questions: [
      {
        questionText: { type: String, required: true },
        category: {
          type: String,
          enum: ['behavioral', 'technical', 'situational'],
          required: true,
        },
        askedAt: { type: Date, default: Date.now },
      },
    ],
    answers: [
      {
        questionIndex: { type: Number, required: true },
        answerText: { type: String, required: true },
        answeredAt: { type: Date, default: Date.now },
      },
    ],
    feedback: {
      overallScore: { type: Number },
      strengths: { type: [String], default: [] },
      areasForImprovement: { type: [String], default: [] },
      communicationClarity: { type: Number },
      technicalAccuracy: { type: Number, default: null },
      confidence: { type: Number },
      detailedFeedback: [
        {
          questionIndex: { type: Number },
          feedback: { type: String },
          score: { type: Number },
        },
      ],
      summary: { type: String },
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const MockInterview = model<IMockInterview>('MockInterview', mockInterviewSchema);
