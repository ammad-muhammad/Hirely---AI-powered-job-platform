import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'application_status_changed'
  | 'new_application'
  | 'new_message'
  | 'job_recommendation'
  | 'verification_status_changed'
  | 'skill_test_badge_earned'
  | 'job_closing_soon'
  | 'security_alert'
  | 'warning'
  | 'auto_apply_draft_ready'
  | 'new_company_review'
  | 'system';

export type RelatedEntityType = 'job' | 'application' | 'chat_thread' | 'company' | 'auto_apply_draft' | 'user' | 'admin_message' | 'warning';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'application_status_changed',
        'new_application',
        'new_message',
        'job_recommendation',
        'verification_status_changed',
        'skill_test_badge_earned',
        'job_closing_soon',
        'security_alert',
        'warning',
        'auto_apply_draft_ready',
        'new_company_review',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedEntityType: {
      type: String,
      enum: ['job', 'application', 'chat_thread', 'company', 'auto_apply_draft', 'user', 'admin_message', 'warning'],
      default: null,
    },
    relatedEntityId: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
