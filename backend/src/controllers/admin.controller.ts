import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

import {
  User,
  Company,
  Job,
  Application,
  JobSeekerProfile,
  PlatformConfig,
  ChatThread,
  Message,
  SkillTestAttempt,
  AIChatLog,
  SupportTicket,
  AdminMessage,
  Notification,
} from '../models';
import { AuthenticatedRequest } from '../types';
import { createNotification } from '../services/notification.service';
import { sendTokenCookie, generateToken, JwtPayload } from '../utils/jwt.utils';
import { analyzeVerificationDocuments, generatePlatformHealthSummary, VerificationAnalysisResult } from '../services/ai.service';
import { uploadBufferToCloudinary } from '../utils/cloudinary.utils';

import { extractTextFromPdfUrl } from '../utils/pdf.utils';
import { sendSupportEmail } from '../utils/email.utils';
import { config } from '../config/env';

// In-memory cache for verification AI assessments (keyed by companyId)
const verificationAiCache = new Map<string, { assessment: VerificationAnalysisResult; timestamp: number }>();

export const getCompanyAiAssessment = async (company: any): Promise<VerificationAnalysisResult> => {
  const companyIdStr = company._id ? company._id.toString() : '';
  const cached = verificationAiCache.get(companyIdStr);
  const tenMinutes = 10 * 60 * 1000;
  if (cached && Date.now() - cached.timestamp < tenMinutes) {
    return cached.assessment;
  }

  const docs = company.verificationDocuments || [];
  const extractedDocTexts: Array<{ documentType: string; fileName?: string; textSnippet?: string }> = [];

  for (const doc of docs) {
    let textSnippet = '';
    const url = doc.url || '';
    if (url && (url.toLowerCase().endsWith('.pdf') || url.includes('/pdf') || url.startsWith('data:application/pdf'))) {
      try {
        const fullText = await extractTextFromPdfUrl(url);
        textSnippet = fullText.slice(0, 1000);
      } catch (err) {
        textSnippet = '[PDF text extraction unavailable or scanned document image]';
      }
    }
    extractedDocTexts.push({
      documentType: doc.documentType || 'document',
      fileName: url ? url.split('/').pop() : 'document',
      textSnippet,
    });
  }

  const companyInfo = {
    companyName: company.companyName || 'Company',
    industry: company.industry || 'Technology',
    companySize: company.companySize,
    location: company.location,
    description: company.description,
    website: company.website,
  };

  const assessment = await analyzeVerificationDocuments(companyInfo, extractedDocTexts);
  if (companyIdStr) {
    verificationAiCache.set(companyIdStr, { assessment, timestamp: Date.now() });
  }
  return assessment;
};

/**
 * 1. GET /api/admin/verifications/pending
 * List all companies with verificationStatus 'pending', sorted oldest-first.
 */
export const getPendingVerifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const [pendingCompanies, totalCount] = await Promise.all([
      Company.find({ verificationStatus: 'pending' })
        .populate('ownerId', 'fullName email phone avatarUrl role createdAt')
        .sort({ verificationSubmittedAt: 1 })
        .skip(skip)
        .limit(limit),
      Company.countDocuments({ verificationStatus: 'pending' }),
    ]);

    const pendingWithAi = await Promise.all(
      pendingCompanies.map(async (comp) => {
        const compObj = comp.toObject();
        const aiAssessment = await getCompanyAiAssessment(comp);
        return {
          ...compObj,
          aiAssessment,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: pendingWithAi.length,
      data: pendingWithAi,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/admin/verifications
 * List companies with optional status filter (all, pending, approved, rejected, unverified).
 */
export const getAllVerifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const statusFilter = (req.query.status as string) || 'all';
    const query: any = {};

    if (statusFilter !== 'all') {
      if (statusFilter === 'unverified') {
        query.$or = [{ verificationStatus: 'unverified' }, { verificationStatus: 'not_submitted' }];
      } else {
        query.verificationStatus = statusFilter;
      }
    }

    const [companies, totalCount] = await Promise.all([
      Company.find(query)
        .populate('ownerId', 'fullName email phone avatarUrl role createdAt location')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Company.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/admin/verifications/:companyId
 * Get comprehensive verification details for a single company.
 */
export const getVerificationDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId)
      .populate('ownerId', 'fullName email phone avatarUrl role createdAt location isSuspended')
      .populate('verificationHistory.reviewedByAdminId', 'fullName email');

    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PUT /api/admin/verifications/:companyId/approve
 * Approves company verification, sets isVerified to true and verificationStatus to 'approved'.
 */
export const approveVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found.' });
      return;
    }

    company.isVerified = true;
    company.verificationStatus = 'approved';
    company.verificationReviewedAt = new Date();
    company.verificationRejectionReason = null;

    if (!company.verificationHistory) {
      company.verificationHistory = [];
    }
    company.verificationHistory.push({
      status: 'approved',
      timestamp: new Date(),
      reviewedByAdminId: req.user?.id as any,
    });

    await company.save();

    // Send persisted notification to employer
    await createNotification(
      company.ownerId.toString(),
      'verification_status_changed',
      'Company Verification Approved!',
      `Congratulations! ${company.companyName} is now a verified employer on Hirely.`,
      'company',
      company._id.toString()
    );

    res.status(200).json({
      success: true,
      message: `Company "${company.companyName}" has been successfully verified!`,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. PUT /api/admin/verifications/:companyId/reject
 * Rejects company verification with a mandatory rejection reason.
 */
export const rejectVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
      res.status(400).json({ success: false, message: 'Please provide a clear rejection reason.' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found.' });
      return;
    }

    company.isVerified = false;
    company.verificationStatus = 'rejected';
    company.verificationReviewedAt = new Date();
    company.verificationRejectionReason = rejectionReason.trim();

    if (!company.verificationHistory) {
      company.verificationHistory = [];
    }
    company.verificationHistory.push({
      status: 'rejected',
      timestamp: new Date(),
      reason: rejectionReason.trim(),
      reviewedByAdminId: req.user?.id as any,
    });

    await company.save();

    // Send persisted notification to employer
    await createNotification(
      company.ownerId.toString(),
      'verification_status_changed',
      'Company Verification Not Approved',
      `Your verification request for ${company.companyName} was not approved: ${rejectionReason.trim()}`,
      'company',
      company._id.toString()
    );

    res.status(200).json({
      success: true,
      message: `Company "${company.companyName}" verification has been rejected.`,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. PUT /api/admin/verifications/:companyId/revoke
 * Revokes verification for an existing verified company with a mandatory reason.
 */
export const revokeVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { revocationReason } = req.body;

    if (!revocationReason || typeof revocationReason !== 'string' || !revocationReason.trim()) {
      res.status(400).json({ success: false, message: 'Please provide a clear revocation reason.' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found.' });
      return;
    }

    company.isVerified = false;
    company.verificationStatus = 'unverified';
    company.verificationReviewedAt = new Date();
    company.verificationRejectionReason = revocationReason.trim();

    if (!company.verificationHistory) {
      company.verificationHistory = [];
    }
    company.verificationHistory.push({
      status: 'revoked',
      timestamp: new Date(),
      reason: revocationReason.trim(),
      reviewedByAdminId: req.user?.id as any,
    });

    await company.save();

    // Notify employer of revocation
    await createNotification(
      company.ownerId.toString(),
      'verification_status_changed',
      'Company Verification Revoked',
      `The verification badge for ${company.companyName} has been revoked: ${revocationReason.trim()}`,
      'company',
      company._id.toString()
    );

    res.status(200).json({
      success: true,
      message: `Verification badge for "${company.companyName}" has been revoked.`,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. GET /api/admin/stats
 * Complete Platform Overview Metrics & Chart Data (30-day time-series, distributions, activity feed).
 */
export const getAdminStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      jobSeekersCount,
      employersCount,
      adminsCount,
      totalCompanies,
      verifiedCompanies,
      unverifiedCompanies,
      pendingVerifications,
      totalActiveJobs,
      totalApplications,
      recentSignupsLast7Days,
      proCompaniesCount,
      featuredJobsCount,
      rawCategoryJobs,
      recentUsers,
      recentJobs,
      recentApplicationsList,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'job_seeker' }),
      User.countDocuments({ role: 'employer' }),
      User.countDocuments({ role: 'admin' }),
      Company.countDocuments(),
      Company.countDocuments({ isVerified: true }),
      Company.countDocuments({ isVerified: false }),
      Company.countDocuments({ verificationStatus: 'pending' }),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Company.countDocuments({ subscriptionTier: 'pro' }),
      Job.countDocuments({ isFeatured: true }),
      Job.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      User.find().sort({ createdAt: -1 }).limit(4).select('fullName email role createdAt'),
      Job.find().sort({ createdAt: -1 }).limit(4).select('title location createdAt').populate('companyId', 'companyName'),
      Application.find().sort({ createdAt: -1 }).limit(4).select('status createdAt').populate('jobId', 'title'),
    ]);

    // Revenue Potential calculation ($99 per Pro company + $29 per featured job)
    const simulatedRevenue = proCompaniesCount * 99 + featuredJobsCount * 29;

    // 30-Day Time Series for User Signups & Applications
    const timeSeriesSignupsMap: Record<string, { date: string; jobSeekers: number; employers: number }> = {};
    const timeSeriesApplicationsMap: Record<string, { date: string; count: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      timeSeriesSignupsMap[dateStr] = { date: dateStr, jobSeekers: 0, employers: 0 };
      timeSeriesApplicationsMap[dateStr] = { date: dateStr, count: 0 };
    }

    const recentUsers30Days = await User.find({ createdAt: { $gte: thirtyDaysAgo } }).select('role createdAt');
    recentUsers30Days.forEach((u) => {
      const dateStr = u.createdAt.toISOString().split('T')[0];
      if (timeSeriesSignupsMap[dateStr]) {
        if (u.role === 'employer') {
          timeSeriesSignupsMap[dateStr].employers += 1;
        } else if (u.role === 'job_seeker') {
          timeSeriesSignupsMap[dateStr].jobSeekers += 1;
        }
      }
    });

    const recentApps30Days = await Application.find({ createdAt: { $gte: thirtyDaysAgo } }).select('createdAt');
    recentApps30Days.forEach((app) => {
      const dateStr = app.createdAt.toISOString().split('T')[0];
      if (timeSeriesApplicationsMap[dateStr]) {
        timeSeriesApplicationsMap[dateStr].count += 1;
      }
    });

    const timeSeriesSignups = Object.values(timeSeriesSignupsMap);
    const timeSeriesApplications = Object.values(timeSeriesApplicationsMap);

    const categoryDistribution = rawCategoryJobs.map((item) => ({
      category: item._id || 'General',
      count: item.count,
    }));

    const companyVerificationDistribution = [
      { name: 'Verified', value: verifiedCompanies },
      { name: 'Unverified', value: unverifiedCompanies },
    ];

    const subscriptionDistribution = [
      { tier: 'Free', count: Math.max(0, totalCompanies - proCompaniesCount) },
      { tier: 'Pro ($99/mo)', count: proCompaniesCount },
    ];

    // Combine Recent Platform Activity Feed
    const recentActivity: any[] = [];
    recentUsers.forEach((u) => {
      recentActivity.push({
        id: `user-${u._id}`,
        type: 'signup',
        title: `New ${u.role === 'employer' ? 'Employer' : 'Job Seeker'} Registered`,
        detail: `${u.fullName} (${u.email})`,
        timestamp: u.createdAt,
      });
    });

    recentJobs.forEach((j: any) => {
      recentActivity.push({
        id: `job-${j._id}`,
        type: 'job',
        title: 'New Job Posted',
        detail: `"${j.title}" by ${j.companyId?.companyName || 'Company'}`,
        timestamp: j.createdAt,
      });
    });

    recentApplicationsList.forEach((app: any) => {
      recentActivity.push({
        id: `app-${app._id}`,
        type: 'application',
        title: 'New Job Application Submitted',
        detail: `Applied for "${app.jobId?.title || 'Job Posting'}"`,
        timestamp: app.createdAt,
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          usersByRole: {
            jobSeekers: jobSeekersCount,
            employers: employersCount,
            admins: adminsCount,
          },
          companies: {
            total: totalCompanies,
            verified: verifiedCompanies,
            unverified: unverifiedCompanies,
            pending: pendingVerifications,
          },
          jobs: {
            active: totalActiveJobs,
          },
          applications: {
            total: totalApplications,
          },
          recentSignupsLast7Days,
          billing: {
            proCompanies: proCompaniesCount,
            featuredJobs: featuredJobsCount,
            simulatedRevenue,
          },
        },
        charts: {
          timeSeriesSignups,
          timeSeriesApplications,
          categoryDistribution,
          companyVerificationDistribution,
          subscriptionDistribution,
        },
        recentActivity: recentActivity.slice(0, 8),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. GET /api/admin/users
 * Paginated user list with search by name/email and role filter.
 */
export const getAdminUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const roleFilter = (req.query.role as string) || 'all';

    const query: any = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ fullName: regex }, { email: regex }];
    }

    if (roleFilter !== 'all' && ['job_seeker', 'employer', 'admin'].includes(roleFilter)) {
      query.role = roleFilter;
    }

    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    // Attach role-specific quick stats
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const docObj = u.toObject() as any;
        if (u.role === 'job_seeker') {
          const [appsCount, jsProfile] = await Promise.all([
            Application.countDocuments({ applicantId: u._id }),
            JobSeekerProfile.findOne({ userId: u._id }),
          ]);
          docObj.quickStats = {
            applicationsCount: appsCount,
            profileCompletion: jsProfile ? (jsProfile.skills?.length ? 85 : 50) : 20,
          };
        } else if (u.role === 'employer') {
          const company = await Company.findOne({ ownerId: u._id });
          if (company) {
            const jobsCount = await Job.countDocuments({ companyId: company._id });
            docObj.quickStats = {
              companyName: company.companyName,
              postedJobsCount: jobsCount,
              subscriptionTier: company.subscriptionTier || 'free',
              isVerified: company.isVerified,
            };
          }
        }
        return docObj;
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET /api/admin/users/:userId
 * Get detailed profile information for a specific user.
 */
export const getUserDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    let roleProfile: any = null;
    let postedJobs: any[] = [];
    let userApplications: any[] = [];
    let skillTestAttempts: any[] = [];

    if (user.role === 'job_seeker') {
      const [p, apps, tests] = await Promise.all([
        JobSeekerProfile.findOne({ userId: user._id }),
        Application.find({ applicantId: user._id })
          .populate('jobId', 'title location status')
          .sort({ createdAt: -1 }),
        SkillTestAttempt.find({ userId: user._id })
          .populate('testId', 'title category skillName')
          .sort({ startedAt: -1 }),
      ]);
      roleProfile = p;
      userApplications = apps;
      skillTestAttempts = tests;
    } else if (user.role === 'employer') {
      roleProfile = await Company.findOne({ ownerId: user._id });
      if (roleProfile) {
        const jobs = await Job.find({ companyId: roleProfile._id }).sort({ createdAt: -1 });
        postedJobs = jobs;
        const jobIds = jobs.map((j) => j._id);
        if (jobIds.length > 0) {
          userApplications = await Application.find({ jobId: { $in: jobIds } })
            .populate('applicantId', 'fullName email phone')
            .populate('jobId', 'title')
            .sort({ createdAt: -1 });
        }
      }
    }

    // 1. Direct Employer <-> Candidate Chat Threads & Messages
    const threads = await ChatThread.find({
      $or: [{ jobSeekerId: user._id }, { employerId: user._id }],
    })
      .populate('jobSeekerId', 'fullName email')
      .populate('employerId', 'fullName email')
      .populate('applicationId', 'jobId status');

    const threadIds = threads.map((t) => t._id);
    const directMessages = await Message.find({ threadId: { $in: threadIds } })
      .populate('senderId', 'fullName role email')
      .sort({ createdAt: -1 });

    const chatLogsWithThread = directMessages.map((msg) => {
      const thread = threads.find((t) => t._id.toString() === msg.threadId.toString());
      return {
        ...msg.toObject(),
        threadDetails: thread ? {
          jobSeeker: (thread.jobSeekerId as any)?.fullName,
          employer: (thread.employerId as any)?.fullName,
          applicationId: thread.applicationId?._id,
        } : null,
      };
    });

    // 2. AI Chatbot Assistant Logs
    const aiChatLogs = await AIChatLog.find({ userId: user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        user,
        roleProfile,
        postedJobs,
        userApplications,
        skillTestAttempts,
        chatLogs: chatLogsWithThread,
        aiChatLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. PUT /api/admin/users/:userId/status
 * Toggle or set user suspension status with custom suspension reason message.
 */
export const updateUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isSuspended, suspensionReason } = req.body;

    if (typeof isSuspended !== 'boolean') {
      res.status(400).json({ success: false, message: 'isSuspended boolean value is required.' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (user.role === 'admin' && isSuspended) {
      res.status(400).json({ success: false, message: 'Cannot suspend an admin account.' });
      return;
    }

    user.isSuspended = isSuspended;
    if (isSuspended) {
      user.suspensionReason = suspensionReason || 'Your account has been suspended by an administrator for policy violations.';
      user.suspendedAt = new Date();
    } else {
      user.suspensionReason = null;
      user.suspendedAt = null;
    }

    await user.save();

    if (isSuspended) {
      await createNotification(
        user._id.toString(),
        'security_alert',
        'Account Suspended',
        `Your account has been suspended. Reason: ${user.suspensionReason}`
      ).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `User "${user.fullName}" has been ${isSuspended ? 'suspended' : 'reactivated'}.`,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
        suspendedAt: user.suspendedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. POST /api/admin/login
 * Dedicated Admin Login endpoint. Validates credentials and verifies user role is 'admin'.
 */
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide administrator email and password.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.',
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.',
      });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        message: 'Your administrator account has been suspended.',
      });
      return;
    }

    const payload: JwtPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);
    sendTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully',
      data: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isSuperAdmin: (user as any).isSuperAdmin !== false,
        adminPermissions: user.adminPermissions || {},
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. DELETE /api/admin/users/:userId
 * Permanently deletes a non-admin user account and safely cleans up associated profiles.
 */
export const deleteUserByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({ success: false, message: 'Cannot delete an administrator account.' });
      return;
    }

    if (user.role === 'job_seeker') {
      await JobSeekerProfile.deleteOne({ userId: user._id });
    } else if (user.role === 'employer') {
      await Company.deleteOne({ ownerId: user._id });
    }

    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: `User "${user.fullName}" has been permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. GET /api/admin/jobs
 * List all platform jobs with filters (status, category, search).
 */
export const getAdminJobs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || 'all';
    const categoryFilter = (req.query.category as string) || 'all';

    const query: any = {};

    if (search.trim()) {
      query.title = new RegExp(search.trim(), 'i');
    }

    if (statusFilter !== 'all' && ['active', 'draft', 'closed', 'expired'].includes(statusFilter)) {
      if (statusFilter === 'draft') {
        query.postStatus = 'draft';
      } else {
        query.status = statusFilter;
      }
    }

    if (categoryFilter !== 'all') {
      query.category = categoryFilter;
    }

    const [jobs, totalCount] = await Promise.all([
      Job.find(query)
        .populate('companyId', 'companyName logoUrl isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(query),
    ]);

    const jobsWithStats = await Promise.all(
      jobs.map(async (j) => {
        const count = await Application.countDocuments({ jobId: j._id });
        const jobObj = j.toObject() as any;
        jobObj.applicantCount = count;
        return jobObj;
      })
    );

    res.status(200).json({
      success: true,
      count: jobsWithStats.length,
      data: jobsWithStats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. PUT /api/admin/jobs/:jobId/status
 * Change job status (active, closed, expired) with optional policy reason.
 */
export const updateJobStatusByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'closed', 'expired'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value. Allowed: active, closed, expired.' });
      return;
    }

    const job = await Job.findById(jobId).populate('companyId', 'ownerId companyName');
    if (!job) {
      res.status(404).json({ success: false, message: 'Job posting not found.' });
      return;
    }

    job.status = status;
    await job.save();

    if (reason && job.companyId) {
      const companyObj = job.companyId as any;
      if (companyObj.ownerId) {
        await createNotification(
          companyObj.ownerId.toString(),
          'system',
          `Job Status Updated: ${job.title}`,
          `Administrator changed job status to ${status}. Reason: ${reason}`,
          'job',
          job._id.toString()
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Job "${job.title}" status changed to ${status}.`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. DELETE /api/admin/jobs/:jobId
 * Delete a job posting.
 */
export const deleteJobByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);

    if (!job) {
      res.status(404).json({ success: false, message: 'Job posting not found.' });
      return;
    }

    await Job.deleteOne({ _id: job._id });

    res.status(200).json({
      success: true,
      message: `Job "${job.title}" has been deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/jobs/:jobId
 * Fetch full job detail along with populated company, employer, and applicant roster.
 */
export const getJobDetailByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).populate({
      path: 'companyId',
      populate: {
        path: 'ownerId',
        select: 'fullName email phone avatarUrl role isSuspended warningCount',
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job posting not found.' });
      return;
    }

    const jobObj = job.toObject() as any;
    if (jobObj.companyId && jobObj.companyId.ownerId) {
      jobObj.employerId = jobObj.companyId.ownerId;
    }

    const applications = await Application.find({ jobId })
      .populate('applicantId', 'fullName email phone avatarUrl role isSuspended warningCount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        job: jobObj,
        applicantCount: applications.length,
        applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 16. GET /api/admin/billing
 * Billing Summary & Subscriptions / Featured Jobs Overview.
 */
export const getAdminBillingStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const featuredJobsQuery = { $or: [{ isFeatured: true }, { featuredUntil: { $gte: new Date() } }] };

    const [allCompanies, paginatedCompanies, totalCompaniesCount, featuredJobs] = await Promise.all([
      Company.find().select('subscriptionTier'),
      Company.find()
        .populate('ownerId', 'fullName email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Company.countDocuments(),
      Job.find(featuredJobsQuery)
        .populate('companyId', 'companyName logoUrl isVerified')
        .sort({ createdAt: -1 }),
    ]);

    const proCompaniesCount = allCompanies.filter((c) => c.subscriptionTier === 'pro').length;
    const featuredJobsCount = featuredJobs.length;
    const totalSimulatedRevenue = proCompaniesCount * 99 + featuredJobsCount * 29;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          proCompaniesCount,
          featuredJobsCount,
          totalSimulatedRevenue,
        },
        companies: paginatedCompanies,
        featuredJobs,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCompaniesCount / limit) || 1,
        totalCount: totalCompaniesCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 17. PUT /api/admin/billing/subscription
 * Manual tier override for any company subscription (free / pro).
 */
export const updateCompanySubscriptionByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId, subscriptionTier } = req.body;

    if (!['free', 'pro'].includes(subscriptionTier)) {
      res.status(400).json({ success: false, message: 'subscriptionTier must be either "free" or "pro".' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found.' });
      return;
    }

    company.subscriptionTier = subscriptionTier;
    company.subscriptionExpiresAt = subscriptionTier === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    await company.save();

    await createNotification(
      company.ownerId.toString(),
      'system',
      `Subscription Updated: ${subscriptionTier.toUpperCase()}`,
      `Your company subscription tier has been updated to ${subscriptionTier.toUpperCase()} by platform administration.`,
      'company',
      company._id.toString()
    );

    res.status(200).json({
      success: true,
      message: `Subscription for ${company.companyName} changed to ${subscriptionTier.toUpperCase()}.`,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 18. PUT /api/admin/billing/featured-job
 * Manual feature/unfeature override for any job posting.
 */
export const updateFeaturedJobByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId, isFeatured, days } = req.body;

    const job = await Job.findById(jobId).populate('companyId', 'ownerId companyName');
    if (!job) {
      res.status(404).json({ success: false, message: 'Job posting not found.' });
      return;
    }

    job.isFeatured = Boolean(isFeatured);
    job.featuredUntil = isFeatured ? new Date(Date.now() + (days || 14) * 24 * 60 * 60 * 1000) : null;
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job "${job.title}" is now ${isFeatured ? 'Featured' : 'Standard'}.`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 19. GET /api/admin/settings/platform
 * Get platform settings config and list of admin accounts.
 */
export const getPlatformConfig = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let config = await PlatformConfig.findOne();
    if (!config) {
      config = await PlatformConfig.create({
        signupsEnabled: true,
        jobPostingEnabled: true,
        aiRateLimits: {
          resumeAnalysisLimit: 10,
          coverLetterGenLimit: 10,
          mockInterviewLimit: 5,
        },
      });
    }

    const adminAccounts = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        config,
        adminAccounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 20. PUT /api/admin/settings/platform
 * Update maintenance toggles and AI rate limits in DB.
 */
export const updatePlatformConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { signupsEnabled, jobPostingEnabled, aiRateLimits } = req.body;

    let config = await PlatformConfig.findOne();
    if (!config) {
      config = new PlatformConfig();
    }

    if (typeof signupsEnabled === 'boolean') config.signupsEnabled = signupsEnabled;
    if (typeof jobPostingEnabled === 'boolean') config.jobPostingEnabled = jobPostingEnabled;
    if (aiRateLimits && typeof aiRateLimits === 'object') {
      config.aiRateLimits = {
        resumeAnalysisLimit: Number(aiRateLimits.resumeAnalysisLimit) || 10,
        coverLetterGenLimit: Number(aiRateLimits.coverLetterGenLimit) || 10,
        mockInterviewLimit: Number(aiRateLimits.mockInterviewLimit) || 5,
      };
    }

    config.updatedBy = req.user?.id as any;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Platform configuration and maintenance settings saved successfully!',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 21. PUT /api/admin/settings/email
 */
export const updateAdminEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      res.status(400).json({ success: false, message: 'Both new email and current password are required.' });
      return;
    }

    const adminUser = await User.findById(req.user?.id).select('+password');
    if (!adminUser || !adminUser.password) {
      res.status(404).json({ success: false, message: 'Admin account not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    const normalizedNewEmail = newEmail.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedNewEmail });
    if (existing && existing._id.toString() !== adminUser._id.toString()) {
      res.status(400).json({ success: false, message: 'This email address is already in use.' });
      return;
    }

    adminUser.email = normalizedNewEmail;
    await adminUser.save();

    const token = generateToken({
      id: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
    });
    sendTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Admin email updated successfully!',
      data: {
        id: adminUser._id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 22. PUT /api/admin/settings/password
 */
export const updateAdminPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const adminUser = await User.findById(req.user?.id).select('+password');
    if (!adminUser || !adminUser.password) {
      res.status(404).json({ success: false, message: 'Admin account not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    adminUser.password = await bcrypt.hash(newPassword, salt);
    await adminUser.save();

    res.status(200).json({
      success: true,
      message: 'Admin password updated successfully!',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 23. PUT /api/admin/settings/notification-prefs
 */
export const updateAdminNotificationPrefs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newVerificationSubmitted, verificationReviewed, newUserRegistered, securityAlerts } = req.body;

    const adminUser = await User.findById(req.user?.id);
    if (!adminUser) {
      res.status(404).json({ success: false, message: 'Admin account not found.' });
      return;
    }

    adminUser.adminNotificationPrefs = {
      newVerificationSubmitted: Boolean(newVerificationSubmitted),
      verificationReviewed: Boolean(verificationReviewed),
      newUserRegistered: Boolean(newUserRegistered),
      securityAlerts: Boolean(securityAlerts),
    };

    await adminUser.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully!',
      data: adminUser.adminNotificationPrefs,
    });
  } catch (error) {
    next(error);
  }
};

// In-memory cache for platform health AI summary
let healthSummaryCache: { summary: string; generatedAt: string; timestamp: number } | null = null;

/**
 * 24. GET /api/admin/health-summary
 * Generates an executive AI platform health summary based on real database analytics with 2-hour caching.
 */
export const getAdminHealthSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const twoHours = 2 * 60 * 60 * 1000;

    if (!forceRefresh && healthSummaryCache && Date.now() - healthSummaryCache.timestamp < twoHours) {
      res.status(200).json({
        success: true,
        summary: healthSummaryCache.summary,
        generatedAt: healthSummaryCache.generatedAt,
        cached: true,
      });
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      jobSeekersCount,
      employersCount,
      totalCompanies,
      verifiedCompanies,
      pendingVerifications,
      totalActiveJobs,
      totalApplications,
      newJobSeekersThisWeek,
      newEmployersThisWeek,
      proCompaniesCount,
      featuredJobsCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'job_seeker' }),
      User.countDocuments({ role: 'employer' }),
      Company.countDocuments(),
      Company.countDocuments({ verificationStatus: 'approved' }),
      Company.countDocuments({ verificationStatus: 'pending' }),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments(),
      User.countDocuments({ role: 'job_seeker', createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: 'employer', createdAt: { $gte: sevenDaysAgo } }),
      Company.countDocuments({ subscriptionTier: 'pro' }),
      Job.countDocuments({ isFeatured: true }),
    ]);

    const unverifiedCompanies = totalCompanies - verifiedCompanies;
    const ratioPercentage = totalCompanies > 0 ? Math.round((verifiedCompanies / totalCompanies) * 100) : 0;
    const totalSimulatedRevenue = proCompaniesCount * 99 + featuredJobsCount * 49;

    const statsData = {
      newSignupsThisWeek: {
        jobSeekers: newJobSeekersThisWeek,
        employers: newEmployersThisWeek,
        total: newJobSeekersThisWeek + newEmployersThisWeek,
      },
      totalUsersCount: totalUsers,
      totalCompaniesCount: totalCompanies,
      verifiedVsUnverifiedRatio: {
        verified: verifiedCompanies,
        unverified: unverifiedCompanies,
        ratioPercentage,
      },
      pendingVerificationsCount: pendingVerifications,
      totalActiveJobs,
      totalApplicationsAllTime: totalApplications,
      revenuePotential: {
        proCompaniesCount,
        featuredJobsCount,
        totalSimulatedRevenue,
      },
    };

    const summaryText = await generatePlatformHealthSummary(statsData);
    const nowIso = new Date().toISOString();

    healthSummaryCache = {
      summary: summaryText,
      generatedAt: nowIso,
      timestamp: Date.now(),
    };

    res.status(200).json({
      success: true,
      summary: summaryText,
      generatedAt: nowIso,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 25. GET /api/admin/fraud-detection
 * Runs fraud detection algorithms and returns flagged items for human review.
 */
export const getFraudDetectionReport = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { runFraudDetection } = await import('../services/fraudDetection.service');
    const report = await runFraudDetection();

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 26. PUT /api/admin/fraud-detection/dismiss
 * Dismisses a flagged fraud signal so it is excluded from future detection results.
 */
export const dismissFraudItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, entityId } = req.body;

    if (!type || !entityId) {
      res.status(400).json({
        success: false,
        message: 'Please provide both type and entityId to dismiss a flagged item.',
      });
      return;
    }

    if (!['duplicate_ip', 'suspicious_job', 'spam_employer'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Invalid fraud detection type specified.',
      });
      return;
    }

    const { dismissFraudFlag } = await import('../services/fraudDetection.service');
    await dismissFraudFlag(type, entityId, req.user?.id || '');

    res.status(200).json({
      success: true,
      message: 'Flagged item has been reviewed and dismissed.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 27. POST /api/admin/auto-apply/trigger-scan
 * Dev/Admin manual trigger for running the background Auto-Apply scanner across all enabled candidates on demand.
 */
export const triggerAutoApplyScanByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { runAutoApplyForAllUsers } = await import('../services/autoApply.service');
    const createdCount = await runAutoApplyForAllUsers();

    res.status(200).json({
      success: true,
      message: `Manual Auto-Apply scan executed successfully. Created ${createdCount} draft(s).`,
      createdCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 28. GET /api/admin/sidebar-counts
 * Returns quick pending/actionable counts for the admin navigation sidebar badges.
 */
export const getAdminSidebarCounts = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { runFraudDetection } = await import('../services/fraudDetection.service');
    const [pendingVerifications, fraudReport, unreadSupportMessages] = await Promise.all([
      Company.countDocuments({ verificationStatus: 'pending' }),
      runFraudDetection(),
      AdminMessage.countDocuments({ senderRole: 'user', isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      pendingVerifications,
      fraudCount: fraudReport?.summary?.totalFlagged || 0,
      unreadSupportMessages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 29. GET /api/admin/analytics/geographic
 * Aggregates user counts grouped by country and role.
 */
export const getGeographicAnalytics = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawData = await User.aggregate([
      {
        $group: {
          _id: { country: { $ifNull: ['$country', 'United States'] }, role: '$role' },
          count: { $sum: 1 },
        },
      },
    ]);

    const countryMap: Record<string, { jobSeekers: number; employers: number; total: number }> = {};

    for (const item of rawData) {
      const country = item._id.country || 'United States';
      const role = item._id.role;
      const count = item.count;

      if (!countryMap[country]) {
        countryMap[country] = { jobSeekers: 0, employers: 0, total: 0 };
      }

      if (role === 'job_seeker') countryMap[country].jobSeekers += count;
      if (role === 'employer') countryMap[country].employers += count;
      countryMap[country].total += count;
    }

    const geographicData = Object.entries(countryMap).map(([country, stats]) => ({
      country,
      ...stats,
    }));

    res.status(200).json({
      success: true,
      data: geographicData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 30. GET /api/admin/team
 * List all admin members (Super Admin only).
 */
export const getSubAdmins = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    res.status(200).json({
      success: true,
      data: adminUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 31. POST /api/admin/team
 * Create a new sub-admin team member (Super Admin only).
 */
export const createSubAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, fullName, permissions } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    const defaultPermissions = {
      canViewOverview: true,
      canManageUsers: true,
      canManageJobs: true,
      canManageVerifications: true,
      canManageBilling: true,
      canManageFraudDetection: true,
      canManageSettings: true,
      canManageSupport: true,
      canManageAdmins: false,
      ...permissions,
    };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existing) {
      if (existing.isSuperAdmin) {
        res.status(400).json({
          success: false,
          message: 'This email address belongs to the Super Administrator.',
        });
        return;
      }

      // Upgrade/convert existing account to Sub-Admin status
      existing.role = 'admin';
      existing.isSuperAdmin = false;
      existing.fullName = fullName.trim();
      existing.password = hashedPassword;
      existing.adminPermissions = defaultPermissions;
      existing.isSuspended = false;
      existing.suspensionReason = null;
      await existing.save();

      const adminObj = existing.toObject();
      delete adminObj.password;

      const io = req.app.get('io');
      if (io) {
        io.emit('sub_admin_permissions_updated', {
          targetUserId: existing._id.toString(),
          adminPermissions: existing.adminPermissions,
          isSuspended: existing.isSuspended,
        });
        io.emit('admin_team_updated');
      }

      res.status(200).json({
        success: true,
        message: 'Existing user account upgraded to Sub-Admin successfully.',
        data: adminObj,
      });
      return;
    }

    const newAdmin = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: fullName.trim(),
      role: 'admin',
      isSuperAdmin: false,
      adminPermissions: defaultPermissions,
    });

    const adminObj = newAdmin.toObject();
    delete adminObj.password;

    const io = req.app.get('io');
    if (io) {
      io.emit('admin_team_updated');
    }

    res.status(201).json({
      success: true,
      message: 'New admin team member created successfully.',
      data: adminObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 32. PUT /api/admin/team/:id
 * Update sub-admin permissions or suspension status (Super Admin only).
 */
export const updateSubAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions, isSuspended, suspensionReason, password } = req.body;

    const targetAdmin = await User.findById(id);
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      res.status(404).json({
        success: false,
        message: 'Admin user not found.',
      });
      return;
    }

    if (permissions) {
      targetAdmin.adminPermissions = {
        ...targetAdmin.adminPermissions,
        ...permissions,
      };
    }

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      targetAdmin.password = await bcrypt.hash(password.trim(), salt);
    }

    if (typeof isSuspended === 'boolean') {
      targetAdmin.isSuspended = isSuspended;
      targetAdmin.suspensionReason = isSuspended ? (suspensionReason || 'Suspended by Super Admin') : null;
      targetAdmin.suspendedAt = isSuspended ? new Date() : null;
    }

    await targetAdmin.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('sub_admin_permissions_updated', {
        targetUserId: targetAdmin._id.toString(),
        adminPermissions: targetAdmin.adminPermissions,
        isSuspended: targetAdmin.isSuspended,
      });
      io.emit('admin_team_updated');
    }

    res.status(200).json({
      success: true,
      message: 'Admin permissions updated successfully.',
      data: targetAdmin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 33. DELETE /api/admin/team/:id
 * Remove a sub-admin team member (Super Admin only).
 */
export const deleteSubAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const targetAdmin = await User.findById(id);
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      res.status(404).json({
        success: false,
        message: 'Admin user not found.',
      });
      return;
    }

    if (targetAdmin.isSuperAdmin) {
      res.status(403).json({
        success: false,
        message: 'Cannot delete the Super Admin account.',
      });
      return;
    }

    await User.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.emit('sub_admin_permissions_updated', {
        targetUserId: id,
        isRevoked: true,
      });
      io.emit('admin_team_updated');
    }

    res.status(200).json({
      success: true,
      message: 'Admin team member removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 34. GET /api/admin/support
 * List all support tickets filterable by status and category.
 */
export const getSupportTickets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, category } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'fullName email role isSuspended')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 35. PUT /api/admin/support/:id
 * Update support ticket status, assigned admin, or admin notes.
 */
export const updateSupportTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes, assignedToSelf, replyMessage } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
      return;
    }

    if (status) {
      ticket.status = status;
      if (status === 'resolved' || status === 'closed') {
        ticket.resolvedAt = new Date();
      }
    }

    if (adminNotes !== undefined) {
      ticket.adminNotes = adminNotes;
    }

    if (assignedToSelf && req.user) {
      ticket.assignedAdminId = (req.user._id || req.user.id) as any;
    }

    let emailSentStatus = false;
    let emailSkippedStatus = false;

    if (replyMessage && replyMessage.trim()) {
      const adminName = req.user?.fullName || 'Hirely Support';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
          <h2 style="color: #09090b; margin-top: 0;">Hirely Support Reply</h2>
          <p style="font-size: 14px; color: #52525b;">Hello ${ticket.name || 'there'},</p>
          <p style="font-size: 14px; color: #18181b; line-height: 1.6; white-space: pre-wrap; background: #f4f4f5; padding: 14px; border-radius: 6px;">${replyMessage.trim()}</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
          <p style="font-size: 12px; color: #71717a;">
            <strong>Original Inquiry:</strong> ${ticket.subject}<br/>
            <strong>Message:</strong> ${ticket.message}
          </p>
          <p style="font-size: 11px; color: #a1a1aa; margin-top: 20px;">
            This email was sent by Hirely Platform Support.
          </p>
        </div>
      `;

      const emailResult = await sendSupportEmail({
        to: ticket.email,
        subject: `[Hirely Support] Re: ${ticket.subject}`,
        html: emailHtml,
        text: replyMessage.trim(),
      });

      if (!ticket.replies) {
        ticket.replies = [];
      }

      ticket.replies.push({
        sender: 'admin',
        senderName: adminName,
        message: replyMessage.trim(),
        sentAt: new Date(),
        emailSent: emailResult.success,
      });

      emailSentStatus = emailResult.success;
      emailSkippedStatus = emailResult.skipped;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: replyMessage
        ? emailSkippedStatus
          ? 'Reply saved to ticket. Email send skipped (SMTP credentials missing).'
          : emailSentStatus
          ? 'Reply sent to user via email and saved to ticket.'
          : 'Reply saved to ticket thread.'
        : 'Support ticket updated successfully.',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 35b. POST /api/admin/support/:id/reply
 * Admin replies to a support ticket, saved as part of the ticket thread AND attempted to email user.
 */
export const replyToSupportTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { replyMessage, status } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      res.status(400).json({
        success: false,
        message: 'Reply message content is required.',
      });
      return;
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
      return;
    }

    const adminName = req.user?.fullName || 'Hirely Support';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #09090b; margin-top: 0;">Hirely Support Reply</h2>
        <p style="font-size: 14px; color: #52525b;">Hello ${ticket.name || 'there'},</p>
        <p style="font-size: 14px; color: #18181b; line-height: 1.6; white-space: pre-wrap; background: #f4f4f5; padding: 14px; border-radius: 6px;">${replyMessage.trim()}</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
        <p style="font-size: 12px; color: #71717a;">
          <strong>Original Inquiry:</strong> ${ticket.subject}<br/>
          <strong>Message:</strong> ${ticket.message}
        </p>
        <p style="font-size: 11px; color: #a1a1aa; margin-top: 20px;">
          This email was sent by Hirely Platform Support.
        </p>
      </div>
    `;

    const emailResult = await sendSupportEmail({
      to: ticket.email,
      subject: `[Hirely Support] Re: ${ticket.subject}`,
      html: emailHtml,
      text: replyMessage.trim(),
    });

    if (!ticket.replies) {
      ticket.replies = [];
    }

    ticket.replies.push({
      sender: 'admin',
      senderName: adminName,
      message: replyMessage.trim(),
      sentAt: new Date(),
      emailSent: emailResult.success,
    });

    if (status) {
      ticket.status = status;
    } else if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: emailResult.skipped
        ? 'Reply saved to ticket. Email send skipped (SMTP credentials missing).'
        : emailResult.success
        ? 'Reply sent to user via email and saved to ticket.'
        : `Reply saved to ticket thread. Email error: ${emailResult.reason}`,
      data: ticket,
      emailSent: emailResult.success,
      emailSkipped: emailResult.skipped,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 36. POST /api/admin/users/:userId/reset-password
 * Admin-initiated password reset.
 */
export const adminResetPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { mode } = req.body; // 'temp_password' or 'reset_link'

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    if (mode === 'temp_password') {
      const tempPassword = `Hirely#${Math.random().toString(36).slice(-8)}`;
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(tempPassword, salt);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Temporary password generated successfully.',
        tempPassword,
      });
      return;
    }

    // Default mode: reset_link token
    const payload: JwtPayload = { id: user._id.toString(), email: user.email, role: user.role };
    const resetToken = generateToken(payload);

    res.status(200).json({
      success: true,
      message: 'Password reset token generated.',
      resetToken,
      resetLink: `${config.frontendUrl}/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 37. PUT /api/admin/users/:userId/reactivate
 * Admin endpoint to unsuspend/reactivate user accounts directly.
 */
export const adminReactivateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    user.isSuspended = false;
    user.suspensionReason = null;
    user.suspendedAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Account for ${user.fullName} has been reactivated.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 38. POST /api/admin/users/:userId/warn
 * Issue formal platform warning to a user or employer.
 * Auto-suspends account if warningCount >= 2.
 */
export const warnUserByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({
        success: false,
        message: 'A clear reason for issuing the warning is required.',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    const currentCount = (user.warningCount || 0) + 1;
    user.warningCount = currentCount;
    user.lastWarningAt = new Date();
    user.lastWarningReason = reason.trim();

    if (!user.warningHistory) user.warningHistory = [];
    user.warningHistory.push({
      reason: reason.trim(),
      issuedAt: new Date(),
      issuedBy: req.user?.fullName || 'Hirely Security Team',
    });

    let autoSuspended = false;
    if (currentCount >= 2) {
      user.isSuspended = true;
      user.suspensionReason = `Account automatically suspended due to repeated warnings (${currentCount}/2): ${reason.trim()}`;
      user.suspendedAt = new Date();
      autoSuspended = true;
    }

    await user.save();

    // Create Notification for target user
    const notifTitle = autoSuspended
      ? '🚨 ACCOUNT SUSPENDED - Repeated Warnings'
      : `⚠️ OFFICIAL PLATFORM WARNING (Notice ${currentCount}/2)`;

    const notifMessage = autoSuspended
      ? `Your Hirely account has been suspended following repeated platform policy violations. Reason: ${reason.trim()}`
      : `An official warning has been issued to your account. Reason: ${reason.trim()}. Please review community policies to avoid account suspension.`;

    await createNotification(
      user._id.toString(),
      'warning',
      notifTitle,
      notifMessage,
      'warning',
      user._id.toString()
    );

    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('admin_user_warned', {
        userId: user._id.toString(),
        warningCount: currentCount,
        isSuspended: autoSuspended,
        reason: reason.trim(),
        title: notifTitle,
        message: notifMessage,
      });
      io.emit('notification_updated');
      io.emit('admin_badge_update');
    }

    res.status(200).json({
      success: true,
      message: autoSuspended
        ? `Warning issued. User ${user.fullName} reached 2 warnings and has been automatically suspended.`
        : `Initial warning issued successfully to ${user.fullName}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 39. POST /api/admin/messages/:userId
 * Send direct official message from Admin to a User.
 */
export const sendAdminUserMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { message, attachmentUrl, fileName, fileType } = req.body;

    if ((!message || !message.trim()) && !attachmentUrl) {
      res.status(400).json({
        success: false,
        message: 'Message text or file attachment is required.',
      });
      return;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: 'Target user not found.',
      });
      return;
    }

    const adminMsg = await AdminMessage.create({
      userId: targetUser._id,
      adminId: req.user?.id ? new Types.ObjectId(req.user.id) : null,
      senderRole: 'admin',
      senderName: req.user?.fullName || 'Hirely Support',

      message: message ? message.trim() : '',
      attachmentUrl: attachmentUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      isRead: false,
    });

    // Create high-visibility Notification for user
    const previewText = message && message.trim()
      ? (message.trim().slice(0, 100) + (message.length > 100 ? '...' : ''))
      : `Sent an attachment: ${fileName || 'Document'}`;

    await createNotification(
      targetUser._id.toString(),
      'security_alert',
      '💬 Official Communication from Hirely Support',
      `Hirely Support sent you a direct message: "${previewText}"`,
      'admin_message',
      adminMsg._id.toString()
    );

    const io = req.app.get('io');
    if (io) {
      io.to(targetUser._id.toString()).emit('admin_message_received', adminMsg);
      io.emit('admin_user_reply', adminMsg);
      io.emit('admin_badge_update');
    }

    res.status(201).json({
      success: true,
      message: 'Direct message sent to user.',
      data: adminMsg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 40. GET /api/admin/messages/:userId
 * Fetch direct message thread history between Admin & target User.
 */
export const getAdminUserMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const messages = await AdminMessage.find({ userId }).sort({ createdAt: 1 });

    // Mark user-sent messages as read by Admin
    await AdminMessage.updateMany({ userId, senderRole: 'user', isRead: false }, { isRead: true });

    // Mark related admin notifications as read
    await Notification.updateMany(
      {
        $or: [
          { relatedEntityType: 'admin_message', relatedEntityId: userId.toString() },
          { userId: req.user?.id, relatedEntityType: 'admin_message' },
        ],
        isRead: false,
      },
      { isRead: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('admin_badge_update');
      io.emit('notification_updated');
    }

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/conversations
 * Fetch list of all active user conversations for the Admin Chat Hub.
 */
export const getAdminConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = (req.query.search as string) || '';

    const userIds = await AdminMessage.distinct('userId');

    let userQuery: any = { _id: { $in: userIds } };
    if (search.trim()) {
      userQuery.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(userQuery).select('fullName email role avatarUrl isSuspended createdAt');

    const conversations = await Promise.all(
      users.map(async (u) => {
        const lastMessage = await AdminMessage.findOne({ userId: u._id }).sort({ createdAt: -1 });
        const unreadCount = await AdminMessage.countDocuments({ userId: u._id, senderRole: 'user', isRead: false });

        return {
          user: u,
          lastMessage: lastMessage ? {
            text: lastMessage.message || (lastMessage.attachmentUrl ? `Attachment: ${lastMessage.fileName || 'File'}` : ''),
            senderRole: lastMessage.senderRole,
            createdAt: lastMessage.createdAt,
            attachmentUrl: lastMessage.attachmentUrl,
          } : null,
          unreadCount,
          updatedAt: lastMessage ? lastMessage.createdAt : u.createdAt,
        };
      })
    );

    conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/messages/upload-attachment
 * Upload document or image attachment for Admin / User chat.
 */
export const uploadAdminAttachment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : undefined);

    if (!file) {
      res.status(400).json({ success: false, message: 'No attachment file provided.' });
      return;
    }

    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    const isDoc = file.mimetype.includes('word') || file.originalname.endsWith('.doc') || file.originalname.endsWith('.docx');

    const fileType: 'image' | 'pdf' | 'doc' | 'other' = isImage ? 'image' : (isPdf ? 'pdf' : (isDoc ? 'doc' : 'other'));
    const folder = isImage ? 'hirely/avatars' : 'hirely/resumes';

    const attachmentUrl = await uploadBufferToCloudinary(file.buffer, folder, file.originalname);

    res.status(200).json({
      success: true,
      attachmentUrl,
      data: {
        attachmentUrl,
        fileName: file.originalname,
        fileType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 41. GET /api/admin/user-inbox (User Side Endpoint)
 * Allows candidate or employer to view official Hirely Admin messages.
 */
export const getUserAdminInbox = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const messages = await AdminMessage.find({ userId }).sort({ createdAt: 1 });

    // Mark as read when retrieved by user
    await AdminMessage.updateMany({ userId, senderRole: 'admin', isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 42. POST /api/admin/user-inbox/reply (User Side Endpoint)
 * Candidate/Employer replies to an official Hirely Admin message thread.
 */
export const userReplyAdminMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { message, attachmentUrl, fileName, fileType } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if ((!message || !message.trim()) && !attachmentUrl) {
      res.status(400).json({ success: false, message: 'Message content or attachment is required.' });
      return;
    }

    const replyMsg = await AdminMessage.create({
      userId,
      senderRole: 'user',
      senderName: req.user?.fullName || 'User',
      message: message ? message.trim() : '',
      attachmentUrl: attachmentUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      isRead: false,
    });

    // Notify all system admins of user reply
    try {
      const { notifyAdmins } = await import('../services/notification.service');
      await notifyAdmins(
        'system',
        '💬 User Replied to Hirely Support',
        `${req.user?.fullName || 'User'} sent a message to Hirely Support: "${message ? message.slice(0, 80) : 'Attachment'}"`,
        'admin_message',
        userId.toString()
      );
    } catch (notifErr) {
      console.error('Failed to notify admins of user reply:', notifErr);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('admin_user_reply', replyMsg);
      io.emit('admin_badge_update');
    }

    res.status(201).json({
      success: true,
      message: 'Reply sent to Hirely Support.',
      data: replyMsg,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 43. GET /api/admin/user-inbox/unread-count (User Side Endpoint)
 */
export const getUserAdminUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(200).json({ success: true, count: 0 });
      return;
    }

    const unreadCount = await AdminMessage.countDocuments({
      userId,
      senderRole: 'admin',
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: unreadCount,
    });
  } catch (error) {
    next(error);
  }
};


