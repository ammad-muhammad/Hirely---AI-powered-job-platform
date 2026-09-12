import { Schema, model, Document, Types } from 'mongoose';

export interface IScreeningQuestion {
  _id?: Types.ObjectId | string;
  questionType:
    | 'commute'
    | 'education'
    | 'experience'
    | 'language'
    | 'license_certification'
    | 'location'
    | 'willingness_to_travel'
    | 'custom'
    | 'custom_open_ended';
  questionText?: string;
  specificFieldRequirement?: string;
  experienceYears?: number;
  experienceTitle?: string;
  educationLevel?: string;
  isDealBreaker: boolean;
  isRequired?: boolean;
}

export interface IContractDuration {
  length: number;
  unit: 'days' | 'weeks' | 'months';
}

export interface IExpectedHours {
  type: 'fixed' | 'range' | 'minimum' | 'maximum';
  fixedHours?: number;
  minHours?: number;
  maxHours?: number;
}

export interface IJob extends Document {
  companyId: Types.ObjectId;
  title: string;
  category: string;
  jobType:
    | string
    | Array<
        | 'full_time'
        | 'part_time'
        | 'contract'
        | 'internship'
        | 'remote'
        | 'hybrid'
        | 'temporary'
        | 'commission'
        | 'new_grad'
        | 'permanent'
      >;
  location: string;
  workplaceType: 'on_site' | 'remote' | 'hybrid';
  hiringTimeline: '1_3_days' | '3_7_days' | '1_2_weeks' | '2_4_weeks' | 'more_than_4_weeks';
  numberOfHires: number;
  payShowBy: 'range' | 'exact' | 'starting_at' | 'maximum';
  payRate: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year';
  contractDuration?: IContractDuration | null;
  expectedHours?: IExpectedHours | null;
  screeningQuestions: IScreeningQuestion[];
  applicationMethod: 'platform' | 'email';
  requireResume: boolean;
  candidatesCanContact: boolean;
  postStatus: 'draft' | 'published';
  salaryCurrency: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryDisclosed: boolean;
  experienceLevel: 'entry' | 'mid' | 'senior';
  educationRequirement?: string;
  skillsRequired: string[];
  description: string;
  responsibilities: string[];
  openings: number;
  applicationDeadline?: Date | null;
  status: 'active' | 'expired' | 'closed';
  isFeatured?: boolean;
  featuredUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const screeningQuestionSchema = new Schema<IScreeningQuestion>(
  {
    questionType: {
      type: String,
      enum: [
        'commute',
        'education',
        'experience',
        'language',
        'license_certification',
        'location',
        'willingness_to_travel',
        'custom',
        'custom_open_ended',
      ],
      required: true,
    },
    questionText: { type: String, default: null },
    specificFieldRequirement: { type: String, default: null },
    experienceYears: { type: Number, default: null },
    experienceTitle: { type: String, default: null },
    educationLevel: { type: String, default: null },
    isDealBreaker: { type: Boolean, default: false },
    isRequired: { type: Boolean, default: true },
  },
  { _id: true }
);

const contractDurationSchema = new Schema<IContractDuration>(
  {
    length: { type: Number, required: true },
    unit: { type: String, enum: ['days', 'weeks', 'months'], required: true },
  },
  { _id: false }
);

const expectedHoursSchema = new Schema<IExpectedHours>(
  {
    type: {
      type: String,
      enum: ['fixed', 'range', 'minimum', 'maximum'],
      required: true,
    },
    fixedHours: { type: Number, default: null },
    minHours: { type: Number, default: null },
    maxHours: { type: Number, default: null },
  },
  { _id: false }
);

const jobSchema = new Schema<IJob>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: function (this: IJob) {
        return this.postStatus === 'published';
      },
      trim: true,
      default: 'General',
      index: true,
    },
    jobType: {
      type: Schema.Types.Mixed,
      default: ['full_time'],
    },
    location: {
      type: String,
      required: function (this: IJob) {
        return this.postStatus === 'published' && this.workplaceType !== 'remote';
      },
      trim: true,
      default: 'Remote',
    },
    workplaceType: {
      type: String,
      enum: ['on_site', 'remote', 'hybrid'],
      default: 'on_site',
    },
    hiringTimeline: {
      type: String,
      enum: ['1_3_days', '3_7_days', '1_2_weeks', '2_4_weeks', 'more_than_4_weeks'],
      default: '1_2_weeks',
    },
    numberOfHires: {
      type: Number,
      default: 1,
      min: 1,
    },
    payShowBy: {
      type: String,
      enum: ['range', 'exact', 'starting_at', 'maximum'],
      default: 'range',
    },
    payRate: {
      type: String,
      enum: ['per_hour', 'per_day', 'per_week', 'per_month', 'per_year'],
      default: 'per_year',
    },
    contractDuration: {
      type: contractDurationSchema,
      default: null,
    },
    expectedHours: {
      type: expectedHoursSchema,
      default: null,
    },
    screeningQuestions: {
      type: [screeningQuestionSchema],
      default: [],
    },
    applicationMethod: {
      type: String,
      enum: ['platform', 'email'],
      default: 'platform',
    },
    requireResume: {
      type: Boolean,
      default: true,
    },
    candidatesCanContact: {
      type: Boolean,
      default: false,
    },
    postStatus: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    salaryCurrency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    salaryDisclosed: {
      type: Boolean,
      default: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior'],
      default: 'entry',
    },
    educationRequirement: {
      type: String,
      default: null,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: function (this: IJob) {
        return this.postStatus === 'published';
      },
      default: '',
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    openings: {
      type: Number,
      default: 1,
      min: 1,
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'closed'],
      default: 'active',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ createdAt: -1 });

export const Job = model<IJob>('Job', jobSchema);
