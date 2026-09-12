import { User, Company, Job, Application } from '../models';
import { AdminQueryInterpretation } from './ai.service';
import { logger } from '../utils/logger';

export interface AdminQueryResult {
  summarySnippet: string;
  dataPoints?: Record<string, any>;
}

export const queryAdminDataFromDatabase = async (
  interpretation: AdminQueryInterpretation,
  userMessage: string
): Promise<AdminQueryResult> => {
  try {
    const intent = interpretation.intent;
    const timeframeDays = interpretation.params?.timeframeDays || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // 1. VERIFICATIONS QUERY
    if (intent === 'query_verifications' || /verification|verify|rejected|approved/i.test(userMessage)) {
      const [pending, approved, rejected, totalCompanies] = await Promise.all([
        Company.countDocuments({ verificationStatus: 'pending' }),
        Company.countDocuments({ verificationStatus: 'approved' }),
        Company.countDocuments({ verificationStatus: 'rejected' }),
        Company.countDocuments(),
      ]);

      // Calculate recent rejections in timeframe
      const recentRejected = await Company.countDocuments({
        verificationStatus: 'rejected',
        verificationReviewedAt: { $gte: startDate },
      });

      const recentApproved = await Company.countDocuments({
        verificationStatus: 'approved',
        verificationReviewedAt: { $gte: startDate },
      });

      const unverified = totalCompanies - approved;
      const ratioPercentage = totalCompanies > 0 ? Math.round((approved / totalCompanies) * 100) : 0;

      const snippet = `Company Verification Metrics: ${approved} verified, ${unverified} unverified (${ratioPercentage}% verification rate across ${totalCompanies} total companies). Pending verification queue: ${pending} requests. Requests rejected in last ${timeframeDays} days: ${recentRejected}. Requests approved in last ${timeframeDays} days: ${recentApproved}. All-time rejected: ${rejected}.`;

      return {
        summarySnippet: snippet,
        dataPoints: {
          pending,
          approved,
          rejected,
          totalCompanies,
          recentRejected,
          recentApproved,
          ratioPercentage,
        },
      };
    }

    // 2. JOBS QUERY
    if (intent === 'query_jobs' || /job|application|listing|posting/i.test(userMessage)) {
      const [activeJobsCount, closedJobsCount, totalApplicationsCount] = await Promise.all([
        Job.countDocuments({ status: 'active' }),
        Job.countDocuments({ status: 'closed' }),
        Application.countDocuments(),
      ]);

      // Find top job with most applications using aggregation
      const topJobAgg = await Application.aggregate([
        { $group: { _id: '$jobId', applicantCount: { $sum: 1 } } },
        { $sort: { applicantCount: -1 } },
        { $limit: 1 },
      ]);

      let topJobTitle = 'N/A';
      let topJobAppCount = 0;

      if (topJobAgg.length > 0) {
        topJobAppCount = topJobAgg[0].applicantCount;
        const jobDoc = await Job.findById(topJobAgg[0]._id).populate('companyId', 'companyName');
        if (jobDoc) {
          topJobTitle = `"${jobDoc.title}" at ${(jobDoc.companyId as any)?.companyName || 'Company'}`;
        }
      }

      // Recent jobs posted in timeframe
      const recentJobsCount = await Job.countDocuments({ createdAt: { $gte: startDate } });

      const snippet = `Job Requisition Metrics: ${activeJobsCount} active openings currently listed, ${closedJobsCount} closed openings. Total applications submitted across platform: ${totalApplicationsCount}. Requisitions created in last ${timeframeDays} days: ${recentJobsCount}. Most applied job requisition: ${topJobTitle} with ${topJobAppCount} candidate applications.`;

      return {
        summarySnippet: snippet,
        dataPoints: {
          activeJobsCount,
          closedJobsCount,
          totalApplicationsCount,
          recentJobsCount,
          topJobTitle,
          topJobAppCount,
        },
      };
    }

    // 3. USERS QUERY
    if (intent === 'query_users' || /user|signup|employer|seeker|registered/i.test(userMessage)) {
      const [totalJobSeekers, totalEmployers, totalAdmins, suspendedCount] = await Promise.all([
        User.countDocuments({ role: 'job_seeker' }),
        User.countDocuments({ role: 'employer' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ isSuspended: true }),
      ]);

      const [newJobSeekersTimeframe, newEmployersTimeframe] = await Promise.all([
        User.countDocuments({ role: 'job_seeker', createdAt: { $gte: startDate } }),
        User.countDocuments({ role: 'employer', createdAt: { $gte: startDate } }),
      ]);

      const totalUsers = totalJobSeekers + totalEmployers + totalAdmins;
      const timeframeTotal = newJobSeekersTimeframe + newEmployersTimeframe;

      const snippet = `User Account Metrics: ${totalUsers} total registered accounts (${totalJobSeekers} Job Seekers, ${totalEmployers} Employers, ${totalAdmins} Admins). New user signups in last ${timeframeDays} days: ${timeframeTotal} total (${newJobSeekersTimeframe} Job Seekers, ${newEmployersTimeframe} Employers). Currently suspended accounts: ${suspendedCount}.`;

      return {
        summarySnippet: snippet,
        dataPoints: {
          totalUsers,
          totalJobSeekers,
          totalEmployers,
          newJobSeekersTimeframe,
          newEmployersTimeframe,
          timeframeTotal,
          suspendedCount,
        },
      };
    }

    // 4. REVENUE & PRO QUERY
    if (intent === 'query_revenue' || /revenue|pro|subscription|tier|featured/i.test(userMessage)) {
      const [proCompaniesCount, freeCompaniesCount, featuredJobsCount] = await Promise.all([
        Company.countDocuments({ subscriptionTier: 'pro' }),
        Company.countDocuments({ subscriptionTier: 'free' }),
        Job.countDocuments({ isFeatured: true }),
      ]);

      const simulatedMonthlyRevenue = proCompaniesCount * 99 + featuredJobsCount * 49;

      const snippet = `Monetization & Tier Metrics: ${proCompaniesCount} companies on Pro Tier ($99/mo), ${freeCompaniesCount} companies on Free Tier. Active featured job promotions ($49/feature): ${featuredJobsCount}. Estimated monthly simulated revenue potential: $${simulatedMonthlyRevenue} USD.`;

      return {
        summarySnippet: snippet,
        dataPoints: {
          proCompaniesCount,
          freeCompaniesCount,
          featuredJobsCount,
          simulatedMonthlyRevenue,
        },
      };
    }

    // General fallback overview query
    const [totalUsers, activeJobs, pendingVerifications] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Company.countDocuments({ verificationStatus: 'pending' }),
    ]);

    return {
      summarySnippet: `Platform Overview: ${totalUsers} total registered users, ${activeJobs} active job listings, and ${pendingVerifications} pending company verification reviews.`,
    };
  } catch (error) {
    logger.error('[queryAdminDataFromDatabase Error]:', error);
    return {
      summarySnippet: 'Unable to complete database query due to an aggregation error.',
    };
  }
};
