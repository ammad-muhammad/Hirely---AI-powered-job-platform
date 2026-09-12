import { Schema, model, Document, Types } from 'mongoose';

export interface ICompanyReview extends Document {
  companyId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  rating: number;
  title: string;
  reviewText: string;
  relationship: string;
  isHiddenByEmployer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const companyReviewSchema = new Schema<ICompanyReview>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      default: 'Interviewed',
    },
    isHiddenByEmployer: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One review per candidate per company
companyReviewSchema.index({ companyId: 1, reviewerId: 1 }, { unique: true });

export const CompanyReview = model<ICompanyReview>('CompanyReview', companyReviewSchema);
