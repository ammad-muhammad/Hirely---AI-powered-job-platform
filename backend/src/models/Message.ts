import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  threadId: Types.ObjectId;
  senderId?: Types.ObjectId;
  messageText: string;
  attachmentUrl?: string;
  isSystemMessage: boolean;
  isRead: boolean;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatThread',
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  messageText: {
    type: String,
    required: [true, 'Message text is required'],
  },
  attachmentUrl: {
    type: String,
    default: null,
  },
  isSystemMessage: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

messageSchema.index({ createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
