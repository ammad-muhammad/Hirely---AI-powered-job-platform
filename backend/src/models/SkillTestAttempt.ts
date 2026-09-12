import { Schema, model, Document, Types } from 'mongoose';

export interface ISkillTestAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect?: boolean;
}

export interface ISkillTestAttemptQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface ISkillTestAttempt extends Document {
  userId: Types.ObjectId;
  testId: Types.ObjectId;
  score: number;
  passed: boolean;
  startedAt: Date;
  endsAt: Date;
  submittedAt?: Date;
  status: 'in_progress' | 'submitted' | 'expired' | 'disqualified';
  questionIds?: string[];
  attemptQuestions?: ISkillTestAttemptQuestion[];
  answers: ISkillTestAnswer[];
  violationsCount: number;
  violationLogs: string[];
  createdAt: Date;
  updatedAt: Date;
}

const skillTestAnswerSchema = new Schema<ISkillTestAnswer>({
  questionId: { type: String, required: true },
  selectedOptionIndex: { type: Number, required: true },
  isCorrect: { type: Boolean },
});

const skillTestAttemptQuestionSchema = new Schema<ISkillTestAttemptQuestion>({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
});

const skillTestAttemptSchema = new Schema<ISkillTestAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: Schema.Types.ObjectId, ref: 'SkillTest', required: true },
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    startedAt: { type: Date, required: true, default: Date.now },
    endsAt: { type: Date, required: true },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired', 'disqualified'],
      default: 'in_progress',
    },
    questionIds: [{ type: String }],
    attemptQuestions: [skillTestAttemptQuestionSchema],
    answers: [skillTestAnswerSchema],
    violationsCount: { type: Number, default: 0 },
    violationLogs: [{ type: String }],
  },
  { timestamps: true }
);

export const SkillTestAttempt = model<ISkillTestAttempt>('SkillTestAttempt', skillTestAttemptSchema);
