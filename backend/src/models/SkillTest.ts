import { Schema, model, Document } from 'mongoose';

export interface ISkillTestQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface ISkillTest extends Document {
  title: string;
  category: string;
  skillName: string;
  description: string;
  timeLimitMinutes: number;
  passingScore: number;
  questions: ISkillTestQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const skillTestQuestionSchema = new Schema<ISkillTestQuestion>({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  explanation: { type: String },
});

const skillTestSchema = new Schema<ISkillTest>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    skillName: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    timeLimitMinutes: { type: Number, required: true, default: 15 },
    passingScore: { type: Number, required: true, default: 70 },
    questions: [skillTestQuestionSchema],
  },
  { timestamps: true }
);

export const SkillTest = model<ISkillTest>('SkillTest', skillTestSchema);
