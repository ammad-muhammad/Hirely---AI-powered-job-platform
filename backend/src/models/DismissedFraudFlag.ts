import { Schema, model, Document, Types } from 'mongoose';

export interface IDismissedFraudFlag extends Document {
  _id: Types.ObjectId;
  entityId: string;
  type: 'duplicate_ip' | 'suspicious_job' | 'spam_employer';
  dismissedBy: Types.ObjectId;
  dismissedAt: Date;
}

const dismissedFraudFlagSchema = new Schema<IDismissedFraudFlag>(
  {
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['duplicate_ip', 'suspicious_job', 'spam_employer'],
      required: true,
      index: true,
    },
    dismissedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dismissedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

dismissedFraudFlagSchema.index({ entityId: 1, type: 1 }, { unique: true });

export const DismissedFraudFlag = model<IDismissedFraudFlag>(
  'DismissedFraudFlag',
  dismissedFraudFlagSchema
);
