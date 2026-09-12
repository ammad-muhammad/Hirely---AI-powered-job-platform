import { Schema, model, Document, Types } from 'mongoose';

export interface IAdminMessage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  adminId?: Types.ObjectId;
  senderRole: 'admin' | 'user';
  senderName: string;
  message?: string;
  attachmentUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'pdf' | 'doc' | 'other';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const adminMessageSchema = new Schema<IAdminMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderRole: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileType: {
      type: String,
      enum: ['image', 'pdf', 'doc', 'other'],
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


export const AdminMessage = model<IAdminMessage>('AdminMessage', adminMessageSchema);
