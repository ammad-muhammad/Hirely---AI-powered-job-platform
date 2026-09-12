import { Schema, model, Document, Types } from 'mongoose';

export interface IChatThread extends Document {
  applicationId: Types.ObjectId;
  jobSeekerId: Types.ObjectId;
  employerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatThreadSchema = new Schema<IChatThread>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true,
    },
    jobSeekerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ChatThread = model<IChatThread>('ChatThread', chatThreadSchema);
