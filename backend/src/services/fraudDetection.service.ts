import { User, Company, Job, Application, DismissedFraudFlag } from '../models';
import { logger } from '../utils/logger';

export interface FlaggedDuplicateIp {
  id: string;
  ipAddress: string;
  accountCount: number;
  accounts: Array<{
    userId: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: Date;
  }>;
  severity: 'low' | 'medium' | 'high';
}

export interface FlaggedSuspiciousJob {
  id: string;
  jobId: string;
  title: string;
  companyName: string;
  companyId?: string;
  matchedPhrases: string[];
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface FlaggedSpamEmployer {
  id: string;
  companyId: string;
  companyName: string;
  ownerName?: string;
  ownerEmail?: string;
  jobsPosted: number;
  applicationsReceived: number;
  hires: number;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface FlaggedApplicationSpam {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicationCount: number;
  timeframeMinutes: number;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface FraudDetectionReport {
  duplicateIpSignals: FlaggedDuplicateIp[];
  suspiciousJobs: FlaggedSuspiciousJob[];
  spamEmployers: FlaggedSpamEmployer[];
  rapidApplicationSpam: FlaggedApplicationSpam[];
  summary: {
    totalFlagged: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
  };
}

const SCAM_INDICATOR_PHRASES = [
  'advance fee',
  'registration fee required',
  'no interview needed',
  'guaranteed income',
  'pay to apply',
  'send money',
  'processing fee',
  'wire transfer',
  'crypto investment',
  'earn $1000 daily',
  'pay upfront',
  'security deposit required',
  'deposit money',
  'unlimited earnings guaranteed',
  'bank transfer required',
];

/**
 * Pattern A: Duplicate accounts sharing the same IP address
 */
export const detectDuplicateAccountSignals = async (
  dismissedIpSet: Set<string>
): Promise<FlaggedDuplicateIp[]> => {
  try {
    const rawGroups = await User.aggregate([
      {
        $match: {
          ipAddress: { $ne: null, $exists: true, $nin: [''] },
        },
      },
      {
        $group: {
          _id: '$ipAddress',
          accountCount: { $sum: 1 },
          accounts: {
            $push: {
              userId: '$_id',
              fullName: '$fullName',
              email: '$email',
              role: '$role',
              createdAt: '$createdAt',
            },
          },
          latestCreatedAt: { $max: '$createdAt' },
        },
      },
      { $match: { accountCount: { $gte: 2 } } },
      { $sort: { latestCreatedAt: -1 } },
    ]);

    const results: FlaggedDuplicateIp[] = [];

    for (const group of rawGroups) {
      const ip = String(group._id).trim();
      if (!ip || dismissedIpSet.has(ip)) continue;

      const count = group.accountCount;
      const severity: 'low' | 'medium' | 'high' =
        count >= 4 ? 'high' : count === 3 ? 'medium' : 'low';

      results.push({
        id: ip,
        ipAddress: ip,
        accountCount: count,
        accounts: group.accounts.map((a: any) => ({
          userId: a.userId.toString(),
          fullName: a.fullName,
          email: a.email,
          role: a.role,
          createdAt: a.createdAt,
        })),
        severity,
      });
    }

    return results;
  } catch (error) {
    logger.error('[detectDuplicateAccountSignals Error]:', error);
    return [];
  }
};

/**
 * Pattern B: Active jobs containing scam-indicator red-flag phrases
 */
export const detectSuspiciousJobPostings = async (
  dismissedJobSet: Set<string>
): Promise<FlaggedSuspiciousJob[]> => {
  try {
    const activeJobs = await Job.find({ status: 'active' }).populate('companyId', 'companyName');
    const results: FlaggedSuspiciousJob[] = [];

    for (const job of activeJobs) {
      const jobIdStr = job._id.toString();
      if (dismissedJobSet.has(jobIdStr)) continue;

      const contentToSearch = `${job.title} ${job.description || ''}`.toLowerCase();
      const matchedPhrases: string[] = [];

      for (const phrase of SCAM_INDICATOR_PHRASES) {
        if (contentToSearch.includes(phrase.toLowerCase())) {
          matchedPhrases.push(phrase);
        }
      }

      if (matchedPhrases.length > 0) {
        const severity: 'low' | 'medium' | 'high' =
          matchedPhrases.length >= 2 ? 'high' : 'medium';

        results.push({
          id: jobIdStr,
          jobId: jobIdStr,
          title: job.title,
          companyName: (job.companyId as any)?.companyName || 'Company Profile',
          companyId: (job.companyId as any)?._id?.toString() || undefined,
          matchedPhrases,
          severity,
          createdAt: job.createdAt,
        });
      }
    }

    return results;
  } catch (error) {
    logger.error('[detectSuspiciousJobPostings Error]:', error);
    return [];
  }
};

/**
 * Pattern C: Employers with multiple posted jobs but zero hired candidates
 */
export const detectSpamEmployerPattern = async (
  dismissedCompanySet: Set<string>
): Promise<FlaggedSpamEmployer[]> => {
  try {
    const companies = await Company.find().populate('ownerId', 'fullName email');
    const results: FlaggedSpamEmployer[] = [];

    for (const company of companies) {
      const companyIdStr = company._id.toString();
      if (dismissedCompanySet.has(companyIdStr)) continue;

      const companyJobs = await Job.find({ companyId: company._id });
      const jobsPosted = companyJobs.length;

      if (jobsPosted < 3) continue;

      const jobIds = companyJobs.map((j) => j._id);
      const applications = await Application.find({ jobId: { $in: jobIds } });
      const applicationsReceived = applications.length;

      const hires = applications.filter((app) => app.status === 'hired').length;

      if (hires === 0) {
        const severity: 'low' | 'medium' | 'high' =
          jobsPosted >= 10 ? 'high' : jobsPosted >= 5 ? 'medium' : 'low';

        results.push({
          id: companyIdStr,
          companyId: companyIdStr,
          companyName: company.companyName,
          ownerName: (company.ownerId as any)?.fullName || 'Employer',
          ownerEmail: (company.ownerId as any)?.email || 'N/A',
          jobsPosted,
          applicationsReceived,
          hires: 0,
          severity,
          createdAt: company.createdAt,
        });
      }
    }

    return results;
  } catch (error) {
    logger.error('[detectSpamEmployerPattern Error]:', error);
    return [];
  }
};

/**
 * Pattern D: Rapid Application Spam (high application volume in short time)
 */
export const detectRapidApplicationSpam = async (
  dismissedApplicantSet: Set<string>
): Promise<FlaggedApplicationSpam[]> => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rawGroups = await Application.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: '$applicantId',
          count: { $sum: 1 },
          latestCreatedAt: { $max: '$createdAt' },
        },
      },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
    ]);

    const results: FlaggedApplicationSpam[] = [];
    for (const group of rawGroups) {
      const applicantIdStr = group._id?.toString();
      if (!applicantIdStr || dismissedApplicantSet.has(applicantIdStr)) continue;

      const user = await User.findById(applicantIdStr).select('fullName email');
      if (!user) continue;

      const count = group.count;
      const severity: 'low' | 'medium' | 'high' = count >= 15 ? 'high' : count >= 8 ? 'medium' : 'low';

      results.push({
        id: applicantIdStr,
        applicantId: applicantIdStr,
        applicantName: user.fullName || 'Job Seeker',
        applicantEmail: user.email || 'N/A',
        applicationCount: count,
        timeframeMinutes: 60,
        severity,
        createdAt: group.latestCreatedAt || new Date(),
      });
    }

    return results;
  } catch (error) {
    logger.error('[detectRapidApplicationSpam Error]:', error);
    return [];
  }
};

/**
 * Main Fraud Detection Runner
 */
export const runFraudDetection = async (): Promise<FraudDetectionReport> => {
  const dismissedRecords = await DismissedFraudFlag.find();

  const dismissedIpSet = new Set<string>();
  const dismissedJobSet = new Set<string>();
  const dismissedCompanySet = new Set<string>();
  const dismissedApplicantSet = new Set<string>();

  for (const record of dismissedRecords) {
    if (record.type === 'duplicate_ip') dismissedIpSet.add(record.entityId);
    if (record.type === 'suspicious_job') dismissedJobSet.add(record.entityId);
    if (record.type === 'spam_employer') dismissedCompanySet.add(record.entityId);
    if ((record.type as string) === 'rapid_application_spam') dismissedApplicantSet.add(record.entityId);
  }

  const [duplicateIpSignals, suspiciousJobs, spamEmployers, rapidApplicationSpam] = await Promise.all([
    detectDuplicateAccountSignals(dismissedIpSet),
    detectSuspiciousJobPostings(dismissedJobSet),
    detectSpamEmployerPattern(dismissedCompanySet),
    detectRapidApplicationSpam(dismissedApplicantSet),
  ]);

  const allItems = [...duplicateIpSignals, ...suspiciousJobs, ...spamEmployers, ...rapidApplicationSpam];
  const totalFlagged = allItems.length;

  const highSeverityCount = allItems.filter((item) => item.severity === 'high').length;
  const mediumSeverityCount = allItems.filter((item) => item.severity === 'medium').length;
  const lowSeverityCount = allItems.filter((item) => item.severity === 'low').length;

  return {
    duplicateIpSignals,
    suspiciousJobs,
    spamEmployers,
    rapidApplicationSpam,
    summary: {
      totalFlagged,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
    },
  };
};

/**
 * Dismiss a flagged item so it won't appear in future runs
 */
export const dismissFraudFlag = async (
  type: 'duplicate_ip' | 'suspicious_job' | 'spam_employer' | 'rapid_application_spam',
  entityId: string,
  adminUserId: string
): Promise<boolean> => {
  if (!type || !entityId) return false;

  await DismissedFraudFlag.findOneAndUpdate(
    { entityId, type },
    {
      entityId,
      type,
      dismissedBy: adminUserId,
      dismissedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return true;
};
