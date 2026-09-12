import { Schema, model, Document, Types } from 'mongoose';

export interface IAIChatLog extends Document {
  userId: Types.ObjectId;
  role: 'job_seeker' | 'employer';
  userMessage: string;
  assistantResponse: string;
  intent?: string;
  createdAt: Date;
}

const aiChatLogSchema = new Schema<IAIChatLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['job_seeker', 'employer'],
      required: true,
    },
    userMessage: {
      type: String,
      required: true,
    },
    assistantResponse: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      default: 'general',
    },
  },
  {
    timestamps: true,
  }
);

aiChatLogSchema.index({ userId: 1, createdAt: -1 });

export const AIChatLog = model<IAIChatLog>('AIChatLog', aiChatLogSchema);
