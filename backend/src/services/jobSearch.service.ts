import { Job, IJob } from '../models/Job';
import { FilterQuery } from 'mongoose';

export interface JobSearchFilters {
  keyword?: string;
  location?: string;
  jobType?: string;
  category?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  postedWithinHours?: number;
  sortBy?: 'recent' | 'salary';
}

export const searchJobsFromDatabase = async (
  filters: JobSearchFilters,
  limit: number = 6
): Promise<IJob[]> => {
  const query: FilterQuery<IJob> = { status: 'active', postStatus: { $ne: 'draft' } };

  if (filters.keyword && typeof filters.keyword === 'string' && filters.keyword.trim()) {
    const term = filters.keyword.trim();
    const regex = new RegExp(term, 'i');
    query.$or = [
      { title: regex },
      { category: regex },
      { shortDescription: regex },
      { fullDescription: regex },
      { skillsRequired: { $in: [regex] } },
    ];
  }

  if (filters.category && typeof filters.category === 'string' && filters.category.trim()) {
    query.category = new RegExp(filters.category.trim(), 'i');
  }

  if (filters.location && typeof filters.location === 'string' && filters.location.trim()) {
    const loc = filters.location.trim();
    if (loc.toLowerCase().includes('remote')) {
      query.jobType = 'remote';
    } else {
      query.location = new RegExp(loc, 'i');
    }
  }

  if (filters.jobType && typeof filters.jobType === 'string' && filters.jobType.trim()) {
    query.jobType = filters.jobType.trim().toLowerCase();
  }

  if (filters.experienceLevel && typeof filters.experienceLevel === 'string' && filters.experienceLevel.trim()) {
    query.experienceLevel = filters.experienceLevel.trim().toLowerCase();
  }

  if (typeof filters.salaryMin === 'number' && filters.salaryMin > 0) {
    query.salaryMax = { $gte: filters.salaryMin };
  }

  if (typeof filters.salaryMax === 'number' && filters.salaryMax > 0) {
    query.salaryMin = { $lte: filters.salaryMax };
  }

  if (typeof filters.postedWithinHours === 'number' && filters.postedWithinHours > 0) {
    const cutoffDate = new Date(Date.now() - filters.postedWithinHours * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoffDate };
  }

  const sortOption: any = filters.sortBy === 'salary' ? { salaryMax: -1 } : { createdAt: -1 };

  const jobs = await Job.find(query)
    .populate('companyId', 'companyName logoUrl industry isVerified')
    .sort(sortOption)
    .limit(limit);

  return jobs;
};
