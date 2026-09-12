import { Schema, model, Document, Types } from 'mongoose';

export interface ISavedJob extends Document {
  jobId: Types.ObjectId;
  profileId: Types.ObjectId;
  savedAt: Date;
}

const savedJobSchema = new Schema<ISavedJob>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index
savedJobSchema.index({ jobId: 1, profileId: 1 }, { unique: true });

export const SavedJob = model<ISavedJob>('SavedJob', savedJobSchema);
