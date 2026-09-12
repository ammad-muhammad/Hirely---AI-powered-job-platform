import { Response, NextFunction } from 'express';
import {
  JobSeekerProfile,
  Job,
  Application,
  AutoApplyDraft,
  ChatThread,
  Message,
} from '../models';
import { AuthenticatedRequest } from '../types';
import { runAutoApplyMatchingForUser, cleanupDuplicateDraftsForUser } from '../services/autoApply.service';
import { createNotification } from '../services/notification.service';
import { logger } from '../utils/logger';

/**
 * GET /api/auto-apply/settings
 * Retrieves user's auto-apply configuration and today's quota usage.
 */
export const getAutoApplySettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Clean up any duplicate drafts for this user first
    await cleanupDuplicateDraftsForUser(userId);

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayDraftCount, pendingCount, approvedCount] = await Promise.all([
      AutoApplyDraft.countDocuments({ userId, createdAt: { $gte: startOfDay } }),
      AutoApplyDraft.countDocuments({ userId, status: 'pending_review' }),
      AutoApplyDraft.countDocuments({ userId, status: 'approved_and_applied' }),
    ]);

    const preferences = profile.autoApplyPreferences || {
      jobTypes: [],
      minSalary: null,
      maxSalary: null,
      locations: [],
      maxDailyDrafts: 3,
      targetJobTitles: [],
      targetSkills: [],
      jobRecencyWindow: 'any_time',
    };

    res.status(200).json({
      success: true,
      data: {
        autoApplyEnabled: profile.autoApplyEnabled || false,
        autoApplyPreferences: preferences,
        lastAutoApplyRunAt: profile.lastAutoApplyRunAt || null,
        todayDraftCount,
        pendingCount,
        approvedCount,
        hasResume: Boolean(profile.resumeUrl || profile.resumeText),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auto-apply/settings
 * Updates auto-apply master switch and matching preferences.
 */
export const updateAutoApplySettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { autoApplyEnabled, autoApplyPreferences } = req.body;

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
      return;
    }

    if (typeof autoApplyEnabled === 'boolean') {
      profile.autoApplyEnabled = autoApplyEnabled;
    }

    if (autoApplyPreferences && typeof autoApplyPreferences === 'object') {
      const current = profile.autoApplyPreferences || {
        jobTypes: [],
        minSalary: null,
        maxSalary: null,
        locations: [],
        maxDailyDrafts: 3,
        targetJobTitles: [],
        targetSkills: [],
        jobRecencyWindow: 'any_time',
      };

      const validWindows = ['24h', '3d', '7d', '14d', '30d', 'any_time'];

      profile.autoApplyPreferences = {
        jobTypes: Array.isArray(autoApplyPreferences.jobTypes)
          ? autoApplyPreferences.jobTypes
          : current.jobTypes || [],
        minSalary:
          autoApplyPreferences.minSalary !== undefined && autoApplyPreferences.minSalary !== null
            ? Number(autoApplyPreferences.minSalary) || null
            : null,
        maxSalary:
          autoApplyPreferences.maxSalary !== undefined && autoApplyPreferences.maxSalary !== null
            ? Number(autoApplyPreferences.maxSalary) || null
            : null,
        locations: Array.isArray(autoApplyPreferences.locations)
          ? autoApplyPreferences.locations
          : current.locations || [],
        maxDailyDrafts: Math.min(
          10,
          Math.max(1, Number(autoApplyPreferences.maxDailyDrafts) || 3)
        ),
        targetJobTitles: Array.isArray(autoApplyPreferences.targetJobTitles)
          ? autoApplyPreferences.targetJobTitles.filter((t: any) => typeof t === 'string' && t.trim())
          : current.targetJobTitles || [],
        targetSkills: Array.isArray(autoApplyPreferences.targetSkills)
          ? autoApplyPreferences.targetSkills.filter((s: any) => typeof s === 'string' && s.trim())
          : current.targetSkills || [],
        jobRecencyWindow: validWindows.includes(autoApplyPreferences.jobRecencyWindow)
          ? autoApplyPreferences.jobRecencyWindow
          : current.jobRecencyWindow || 'any_time',
      };
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Auto-apply settings updated successfully.',
      data: {
        autoApplyEnabled: profile.autoApplyEnabled,
        autoApplyPreferences: profile.autoApplyPreferences,
        lastAutoApplyRunAt: profile.lastAutoApplyRunAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-apply/drafts
 * Lists application drafts for the logged-in candidate with filtering and pagination.
 */
export const getAutoApplyDrafts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Clean up any duplicate drafts for this user first
    await cleanupDuplicateDraftsForUser(userId);

    const { status, page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query: any = { userId };

    if (status) {
      if (status === 'resolved') {
        query.status = { $in: ['approved_and_applied', 'rejected', 'expired'] };
      } else if (typeof status === 'string' && status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    const [drafts, totalCount, pendingCount] = await Promise.all([
      AutoApplyDraft.find(query)
        .populate({
          path: 'jobId',
          select:
            'title category jobType experienceLevel location isRemote salaryMin salaryMax salaryCurrency applicationDeadline status postStatus companyId description screeningQuestions',
          populate: {
            path: 'companyId',
            select: 'companyName logoUrl industry location',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AutoApplyDraft.countDocuments(query),
      AutoApplyDraft.countDocuments({ userId, status: 'pending_review' }),
    ]);

    res.status(200).json({
      success: true,
      data: drafts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        totalCount,
        limit: limitNum,
      },
      pendingCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auto-apply/drafts/:id/approve
 * Submits the application with the approved/edited cover letter.
 * Creates an Application, ChatThread, welcome Message, and notifies the Employer.
 */
export const approveAutoApplyDraft = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { coverLetter, screeningAnswers } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const draft = await AutoApplyDraft.findOne({ _id: id, userId });
    if (!draft) {
      res.status(404).json({ success: false, message: 'Application draft not found.' });
      return;
    }

    if (draft.status !== 'pending_review') {
      res.status(400).json({
        success: false,
        message: `This draft cannot be approved because it is already marked as ${draft.status}.`,
      });
      return;
    }

    // Verify target job
    const job = await Job.findById(draft.jobId).populate<{ companyId: { ownerId: string; companyName: string } }>(
      'companyId'
    );
    if (!job || job.status !== 'active') {
      draft.status = 'expired';
      await draft.save();
      res.status(400).json({
        success: false,
        message: 'This job position is no longer active for applications.',
      });
      return;
    }

    // Check duplicate application
    const existingApp = await Application.findOne({ jobId: draft.jobId, applicantId: userId });
    if (existingApp) {
      draft.status = 'approved_and_applied';
      draft.applicationId = existingApp._id;
      draft.respondedAt = new Date();
      await draft.save();
      res.status(200).json({
        success: true,
        message: 'You have already applied to this job position.',
        data: { draft, application: existingApp },
      });
      return;
    }

    // Resolve resume from JobSeekerProfile
    const profile = await JobSeekerProfile.findOne({ userId });
    const resumeUrl = profile?.resumeUrl || undefined;
    const resumeOriginalFileName = profile?.resumeOriginalFileName || undefined;

    if (job.requireResume !== false && !resumeUrl) {
      res.status(400).json({
        success: false,
        message: 'Please upload or save a default resume in your profile before approving applications.',
      });
      return;
    }

    const finalCoverLetter =
      typeof coverLetter === 'string' && coverLetter.trim()
        ? coverLetter.trim()
        : draft.generatedCoverLetter;

    // Resolve final screening answers
    const rawAnswers = Array.isArray(screeningAnswers) ? screeningAnswers : draft.screeningAnswers || [];
    const formattedScreeningAnswers = rawAnswers.map((ans: any) => ({
      questionId: ans.questionId || undefined,
      questionText: ans.questionText || '',
      answerText: typeof ans.answerText === 'string' ? ans.answerText.trim() : '',
      source: ans.source || 'user_edited',
      isMissing: !ans.answerText || !ans.answerText.trim(),
    }));

    // Check if any screening question is missing an answer
    const incompleteAnswer = formattedScreeningAnswers.find((ans: any) => !ans.answerText);
    if (incompleteAnswer) {
      res.status(400).json({
        success: false,
        message: `Please provide an answer for all screening questions before submitting (question: "${incompleteAnswer.questionText}").`,
      });
      return;
    }

    // Create formal Application
    const application = await Application.create({
      jobId: draft.jobId,
      applicantId: userId,
      resumeUrl,
      resumeOriginalFileName,
      coverLetter: finalCoverLetter,
      screeningAnswers: formattedScreeningAnswers,
      status: 'applied',
    });

    // Create ChatThread & initial welcome message
    const employerOwnerId = (job.companyId as unknown as { ownerId: string }).ownerId;
    if (employerOwnerId) {
      const chatThread = await ChatThread.create({
        applicationId: application._id,
        jobSeekerId: userId,
        employerId: employerOwnerId,
      });

      await Message.create({
        threadId: chatThread._id,
        messageText: `🎉 Application submitted for "${job.title}". Thank you for applying!`,
        isSystemMessage: true,
      });

      // Send persistent notification to Employer
      try {
        await createNotification(
          employerOwnerId.toString(),
          'new_application',
          'New Applicant Received',
          `A candidate submitted an application for "${job.title}".`,
          'application',
          application._id.toString()
        );
      } catch (notifErr) {
        logger.error(`Failed to send employer notification for application ${application._id}: ${notifErr}`);
      }
    }

    // Update Draft record
    draft.status = 'approved_and_applied';
    draft.applicationId = application._id;
    draft.generatedCoverLetter = finalCoverLetter;
    draft.screeningAnswers = formattedScreeningAnswers;
    draft.respondedAt = new Date();
    await draft.save();

    res.status(200).json({
      success: true,
      message: `Application submitted successfully for "${job.title}"!`,
      data: {
        draft,
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auto-apply/drafts/:id/reject
 * Dismisses/rejects an application draft with an optional reason.
 */
export const rejectAutoApplyDraft = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const draft = await AutoApplyDraft.findOne({ _id: id, userId });
    if (!draft) {
      res.status(404).json({ success: false, message: 'Application draft not found.' });
      return;
    }

    draft.status = 'rejected';
    draft.rejectionReason = rejectionReason || 'User dismissed';
    draft.respondedAt = new Date();
    await draft.save();

    res.status(200).json({
      success: true,
      message: 'Draft dismissed.',
      data: { draft },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auto-apply/sync
 * Manually triggers the Auto-Apply matching algorithm for immediate testing/scanning.
 */
export const triggerAutoApplySync = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const result = await runAutoApplyMatchingForUser(userId);

    res.status(200).json({
      success: result.success,
      message: result.message || `Created ${result.createdCount} draft(s).`,
      data: {
        createdCount: result.createdCount,
        drafts: result.drafts,
      },
    });
  } catch (error) {
    next(error);
  }
};
