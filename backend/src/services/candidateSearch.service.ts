import { JobSeekerProfile, User, Company, Job, Application } from '../models';
import { FilterQuery } from 'mongoose';

export interface CandidateSearchFilters {
  skills?: string[];
  experienceLevel?: string;
  location?: string;
  jobFieldCategory?: string;
  keyword?: string;
}

export interface CandidateResult {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  location?: string;
  skills: string[];
  experienceLevel: string;
  bio?: string;
  desiredJobTitles?: string[];
  email?: string;
  phone?: string;
  hasAppliedToEmployer: boolean;
}

export const searchCandidatesFromDatabase = async (
  employerUserId: string,
  filters: CandidateSearchFilters,
  limit: number = 6
): Promise<CandidateResult[]> => {
  const profileQuery: FilterQuery<any> = {};

  if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
    const skillRegexes = filters.skills.map((s) => new RegExp(s.trim(), 'i'));
    profileQuery.skills = { $in: skillRegexes };
  }

  if (filters.experienceLevel && typeof filters.experienceLevel === 'string' && filters.experienceLevel.trim()) {
    profileQuery.experienceLevel = filters.experienceLevel.trim().toLowerCase();
  }

  if (filters.jobFieldCategory && typeof filters.jobFieldCategory === 'string' && filters.jobFieldCategory.trim()) {
    const categoryRegex = new RegExp(filters.jobFieldCategory.trim(), 'i');
    profileQuery.$or = [
      { desiredJobTitles: { $in: [categoryRegex] } },
      { bio: categoryRegex },
    ];
  }

  const profiles = await JobSeekerProfile.find(profileQuery)
    .populate('userId', 'fullName email phone location avatarUrl role isSuspended')
    .limit(20);

  // Determine which candidates have applied to employer's company
  const companies = await Company.find({ ownerId: employerUserId }).select('_id');
  const companyIds = companies.map((c) => c._id);
  const employerJobs = await Job.find({ companyId: { $in: companyIds } }).select('_id');
  const employerJobIds = employerJobs.map((j) => j._id);

  const appliedApplicantIdsSet = new Set<string>();
  if (employerJobIds.length > 0) {
    const applications = await Application.find({ jobId: { $in: employerJobIds } }).select('applicantId');
    applications.forEach((app) => appliedApplicantIdsSet.add(app.applicantId.toString()));
  }

  const results: CandidateResult[] = [];

  for (const prof of profiles) {
    const userDoc = prof.userId as any;
    if (!userDoc || userDoc.role !== 'job_seeker' || userDoc.isSuspended) {
      continue;
    }

    // Filter location if specified
    if (filters.location && typeof filters.location === 'string' && filters.location.trim()) {
      const locRegex = new RegExp(filters.location.trim(), 'i');
      const matchCity = prof.city && locRegex.test(prof.city);
      const matchCountry = prof.country && locRegex.test(prof.country);
      const matchUserLoc = userDoc.location && locRegex.test(userDoc.location);

      if (!matchCity && !matchCountry && !matchUserLoc) {
        continue;
      }
    }

    const candidateUserIdStr = userDoc._id.toString();
    const hasAppliedToEmployer = appliedApplicantIdsSet.has(candidateUserIdStr);

    results.push({
      userId: candidateUserIdStr,
      fullName: userDoc.fullName,
      avatarUrl: userDoc.avatarUrl || undefined,
      location: userDoc.location || prof.city || undefined,
      skills: prof.skills || [],
      experienceLevel: prof.experienceLevel || 'entry',
      bio: prof.bio || undefined,
      desiredJobTitles: prof.desiredJobTitles || [],
      email: hasAppliedToEmployer ? userDoc.email : undefined,
      phone: hasAppliedToEmployer ? userDoc.phone : undefined,
      hasAppliedToEmployer,
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
};
