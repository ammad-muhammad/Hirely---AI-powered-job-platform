import { Schema, model, Document, Types } from 'mongoose';

export interface ISupportTicketReply {
  _id?: Types.ObjectId;
  sender: 'admin' | 'user';
  senderName?: string;
  message: string;
  sentAt: Date;
  emailSent?: boolean;
}

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  name?: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminNotes?: string | null;
  assignedAdminId?: Types.ObjectId | null;
  replies?: ISupportTicketReply[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}

const replySchema = new Schema<ISupportTicketReply>(
  {
    sender: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
    },
    senderName: {
      type: String,
      default: 'Hirely Support',
    },
    message: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'general_inquiry',
        'technical_support',
        'account_issue',
        'account_locked',
        'password_reset',
        'billing_question',
        'billing_issue',
        'report_problem',
        'bug_report',
        'business_inquiry',
        'other',
      ],
      default: 'other',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      required: true,
      index: true,
    },
    adminNotes: {
      type: String,
      default: null,
    },
    assignedAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    replies: [replySchema],
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const SupportTicket = model<ISupportTicket>('SupportTicket', supportTicketSchema);

