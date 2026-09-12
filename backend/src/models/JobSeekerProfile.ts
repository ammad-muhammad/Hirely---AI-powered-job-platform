import { Schema, model, Document, Types } from 'mongoose';

export interface ICachedRecommendation {
  jobId: Types.ObjectId;
  matchScore: number;
  matchReason: string;
}

export interface ICachedSkillTestRecommendation {
  testId: Types.ObjectId;
  relevanceScore: number;
  reason: string;
}

export interface IVerifiedSkill {
  skill: string;
  score: number;
  verifiedAt: Date;
}

export interface IJobSeekerProfile extends Document {
  userId: Types.ObjectId;
  resumeUrl?: string;
  resumeOriginalFileName?: string;
  resumeText?: string;
  skills: string[];
  verifiedSkills?: IVerifiedSkill[];
  bio?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior';
  education?: string;
  country?: string;
  city?: string;
  postcode?: string;
  desiredJobTitles?: string[];
  preferredJobTypes?: string[];
  minimumExpectedSalary?: number;
  openToRelocate?: boolean;
  availableImmediately?: boolean;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  profileCompletionPercentage: number;
  autoApplyEnabled?: boolean;
  autoApplyPreferences?: {
    jobTypes?: string[];
    minSalary?: number | null;
    maxSalary?: number | null;
    locations?: string[];
    maxDailyDrafts?: number;
    targetJobTitles?: string[];
    targetSkills?: string[];
    jobRecencyWindow?: '24h' | '3d' | '7d' | '14d' | '30d' | 'any_time';
  };
  lastAutoApplyRunAt?: Date;
  recommendedJobsCache?: ICachedRecommendation[];
  recommendedJobsCacheAt?: Date;
  skillTestRecommendationsCache?: ICachedSkillTestRecommendation[];
  skillTestRecommendationsCacheAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobSeekerProfileSchema = new Schema<IJobSeekerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    resumeUrl: {
      type: String,
      default: null,
    },
    resumeOriginalFileName: {
      type: String,
      default: null,
    },
    resumeText: {
      type: String,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    verifiedSkills: [
      {
        skill: { type: String, required: true },
        score: { type: Number, required: true },
        verifiedAt: { type: Date, default: Date.now },
      },
    ],
    bio: {
      type: String,
      default: null,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior'],
      default: null,
    },
    education: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: 'Pakistan',
    },
    city: {
      type: String,
      default: null,
    },
    postcode: {
      type: String,
      default: null,
    },
    desiredJobTitles: {
      type: [String],
      default: [],
    },
    preferredJobTypes: {
      type: [String],
      default: [],
    },
    minimumExpectedSalary: {
      type: Number,
      default: null,
    },
    openToRelocate: {
      type: Boolean,
      default: false,
    },
    availableImmediately: {
      type: Boolean,
      default: false,
    },
    portfolioUrl: {
      type: String,
      default: null,
    },
    linkedinUrl: {
      type: String,
      default: null,
    },
    githubUrl: {
      type: String,
      default: null,
    },
    profileCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    autoApplyEnabled: {
      type: Boolean,
      default: false,
    },
    autoApplyPreferences: {
      jobTypes: {
        type: [String],
        default: [],
      },
      minSalary: {
        type: Number,
        default: null,
      },
      maxSalary: {
        type: Number,
        default: null,
      },
      locations: {
        type: [String],
        default: [],
      },
      maxDailyDrafts: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
      },
      targetJobTitles: {
        type: [String],
        default: [],
      },
      targetSkills: {
        type: [String],
        default: [],
      },
      jobRecencyWindow: {
        type: String,
        enum: ['24h', '3d', '7d', '14d', '30d', 'any_time'],
        default: 'any_time',
      },
    },
    lastAutoApplyRunAt: {
      type: Date,
      default: null,
    },
    recommendedJobsCache: [
      {
        jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
        matchScore: { type: Number },
        matchReason: { type: String },
      },
    ],
    recommendedJobsCacheAt: {
      type: Date,
      default: null,
    },
    skillTestRecommendationsCache: [
      {
        testId: { type: Schema.Types.ObjectId, ref: 'SkillTest' },
        relevanceScore: { type: Number },
        reason: { type: String },
      },
    ],
    skillTestRecommendationsCacheAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const JobSeekerProfile = model<IJobSeekerProfile>('JobSeekerProfile', jobSeekerProfileSchema);
