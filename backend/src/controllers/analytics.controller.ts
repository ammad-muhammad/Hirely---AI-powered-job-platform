import { Response, NextFunction } from 'express';
import { Job, Application, Company } from '../models';
import { AuthenticatedRequest } from '../types';

export const getEmployerOverviewAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalJobs: 0,
            activeJobs: 0,
            totalApplications: 0,
            shortlistedCount: 0,
            hiredCount: 0,
            avgTimeToHireDays: 0,
          },
          statusBreakdown: {
            applied: 0,
            under_review: 0,
            shortlisted: 0,
            interview: 0,
            rejected: 0,
            hired: 0,
          },
          applicationsOverTime: [],
          applicationsByJob: [],
        },
      });
      return;
    }

    const jobs = await Job.find({ companyId: company._id });
    const jobIds = jobs.map((j) => j._id);

    const applications = await Application.find({ jobId: { $in: jobIds } }).populate(
      'jobId',
      'title category status createdAt'
    );

    // 1. Basic Counts
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.status === 'active' && j.postStatus === 'published').length;
    const totalApplications = applications.length;

    // 2. Status Breakdown
    const statusBreakdown = {
      applied: 0,
      under_review: 0,
      shortlisted: 0,
      interview: 0,
      rejected: 0,
      hired: 0,
    };

    applications.forEach((app) => {
      const st = app.status as keyof typeof statusBreakdown;
      if (statusBreakdown[st] !== undefined) {
        statusBreakdown[st]++;
      }
    });

    // 3. Applications Over Time (Last 30 Days)
    const last30DaysMap = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last30DaysMap.set(dateStr, 0);
    }

    applications.forEach((app) => {
      const appDate = new Date(app.appliedAt).toISOString().split('T')[0];
      if (last30DaysMap.has(appDate)) {
        last30DaysMap.set(appDate, (last30DaysMap.get(appDate) || 0) + 1);
      }
    });

    const applicationsOverTime = Array.from(last30DaysMap.entries()).map(([dateStr, count]) => {
      const d = new Date(dateStr);
      const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: formatted, count };
    });

    // 4. Applications by Job
    const jobAppCountMap = new Map<string, number>();
    applications.forEach((app) => {
      if (app.jobId && (app.jobId as any)._id) {
        const jobIdStr = (app.jobId as any)._id.toString();
        jobAppCountMap.set(jobIdStr, (jobAppCountMap.get(jobIdStr) || 0) + 1);
      }
    });

    const applicationsByJob = jobs
      .map((job) => ({
        id: job._id.toString(),
        title: job.title,
        status: job.status,
        postStatus: job.postStatus,
        count: jobAppCountMap.get(job._id.toString()) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 5. Avg Time to Hire (days from appliedAt to updatedAt for hired applications)
    const hiredApps = applications.filter((app) => app.status === 'hired');
    let avgTimeToHireDays = 0;
    if (hiredApps.length > 0) {
      const totalDays = hiredApps.reduce((acc, app) => {
        const diffMs = new Date(app.updatedAt).getTime() - new Date(app.appliedAt).getTime();
        return acc + Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }, 0);
      avgTimeToHireDays = parseFloat((totalDays / hiredApps.length).toFixed(1));
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalJobs,
          activeJobs,
          totalApplications,
          shortlistedCount: statusBreakdown.shortlisted,
          hiredCount: statusBreakdown.hired,
          avgTimeToHireDays,
        },
        statusBreakdown,
        applicationsOverTime,
        applicationsByJob,
      },
    });
  } catch (error) {
    next(error);
  }
};
