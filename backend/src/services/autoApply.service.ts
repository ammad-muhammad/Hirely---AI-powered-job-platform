import { Types } from 'mongoose';
import {
  JobSeekerProfile,
  Job,
  Application,
  AutoApplyDraft,
  IAutoApplyDraft,
  Company,
  User,
} from '../models';
import {
  matchJobsToProfile,
  generateCoverLetter,
  answerScreeningQuestionsForCandidate,
  extractCleanTextFromJSONOrString,
} from './ai.service';
import { createNotification } from './notification.service';
import { logger } from '../utils/logger';

export interface AutoApplyRunResult {
  success: boolean;
  createdCount: number;
  drafts: IAutoApplyDraft[];
  message?: string;
}

// In-memory set to prevent parallel concurrent scans for the same user
const activeScansPerUser = new Set<string>();

/**
 * Automatically cleans up any duplicate drafts for a user, keeping only the most recent draft per job.
 */
export const cleanupDuplicateDraftsForUser = async (userId: string): Promise<void> => {
  try {
    const allDrafts = await AutoApplyDraft.find({ userId }).sort({ createdAt: -1 });
    const seenJobIds = new Set<string>();
    const duplicateIdsToDelete: Types.ObjectId[] = [];

    for (const draft of allDrafts) {
      const jobIdStr = draft.jobId?.toString();
      if (!jobIdStr) continue;

      if (seenJobIds.has(jobIdStr)) {
        duplicateIdsToDelete.push(draft._id as Types.ObjectId);
      } else {
        seenJobIds.add(jobIdStr);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await AutoApplyDraft.deleteMany({ _id: { $in: duplicateIdsToDelete } });
      logger.info(`[AutoApply Deduplication]: Cleaned up ${duplicateIdsToDelete.length} duplicate draft(s) for user ${userId}`);
    }
  } catch (err) {
    logger.error(`[AutoApply Deduplication Error]: ${err}`);
  }
};

/**
 * Executes Auto-Apply matching and draft generation for a specific job seeker.
 * Safe guarantee: Only creates 'pending_review' drafts; NEVER submits automatically.
 */
export const runAutoApplyMatchingForUser = async (
  userId: string
): Promise<AutoApplyRunResult> => {
  if (activeScansPerUser.has(userId)) {
    logger.info(`[AutoApply Concurrent Lock]: Scan already running for user ${userId}, skipping parallel request.`);
    return { success: true, createdCount: 0, drafts: [], message: 'Scan already in progress.' };
  }

  activeScansPerUser.add(userId);

  try {
    // Automatically clean up any existing duplicate drafts first
    await cleanupDuplicateDraftsForUser(userId);

    const seekerProfile = await JobSeekerProfile.findOne({ userId });
    if (!seekerProfile) {
      return { success: false, createdCount: 0, drafts: [], message: 'Profile not found.' };
    }

    if (!seekerProfile.autoApplyEnabled) {
      return {
        success: false,
        createdCount: 0,
        drafts: [],
        message: 'Auto-Apply is currently disabled in your preferences.',
      };
    }

    const preferences = seekerProfile.autoApplyPreferences || {
      jobTypes: [],
      minSalary: null,
      locations: [],
      maxDailyDrafts: 3,
    };
    const maxDaily = Math.min(10, Math.max(1, preferences.maxDailyDrafts || 3));

    // Check daily draft quota
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayDraftCount = await AutoApplyDraft.countDocuments({
      userId,
      createdAt: { $gte: startOfDay },
    });

    const remainingQuota = maxDaily - todayDraftCount;
    if (remainingQuota <= 0) {
      return {
        success: true,
        createdCount: 0,
        drafts: [],
        message: `Daily auto-apply limit of ${maxDaily} draft(s) reached for today.`,
      };
    }

    // Exclude jobs user has already applied to; map draft timestamps for existing drafts
    const [existingApps, existingDrafts] = await Promise.all([
      Application.find({ applicantId: userId }).select('jobId'),
      AutoApplyDraft.find({ userId }).select('jobId createdAt status'),
    ]);

    const appliedJobIds = new Set<string>(existingApps.map((a) => a.jobId.toString()));

    const draftCreatedAtMap = new Map<string, Date>();
    for (const d of existingDrafts) {
      if (d.jobId) {
        const jobIdStr = d.jobId.toString();
        const prev = draftCreatedAtMap.get(jobIdStr);
        if (!prev || d.createdAt > prev) {
          draftCreatedAtMap.set(jobIdStr, d.createdAt);
        }
      }
    }

    // Query active published jobs excluding jobs already formally applied to
    const activeJobsQuery: any = {
      status: 'active',
      postStatus: { $ne: 'draft' },
      _id: { $nin: Array.from(appliedJobIds).map((id) => new Types.ObjectId(id)) },
    };

    // Filter by job recency window if set
    const recencyWindow = (preferences as any).jobRecencyWindow || 'any_time';
    if (recencyWindow && recencyWindow !== 'any_time') {
      let recencyMs = 0;
      if (recencyWindow === '24h') recencyMs = 24 * 60 * 60 * 1000;
      else if (recencyWindow === '3d') recencyMs = 3 * 24 * 60 * 60 * 1000;
      else if (recencyWindow === '7d') recencyMs = 7 * 24 * 60 * 60 * 1000;
      else if (recencyWindow === '14d') recencyMs = 14 * 24 * 60 * 60 * 1000;
      else if (recencyWindow === '30d') recencyMs = 30 * 24 * 60 * 60 * 1000;

      if (recencyMs > 0) {
        const cutoffDate = new Date(Date.now() - recencyMs);
        activeJobsQuery.createdAt = { $gte: cutoffDate };
      }
    }

    // Filter by preferred job types if set
    if (preferences.jobTypes && preferences.jobTypes.length > 0) {
      const regexPatterns = preferences.jobTypes.map((t) => {
        const clean = t.toLowerCase().trim().replace(/[-_]/g, '[-_]');
        return new RegExp(clean, 'i');
      });
      activeJobsQuery.jobType = { $in: regexPatterns };
    }

    // Filter by minimum salary if set
    if (preferences.minSalary && preferences.minSalary > 0) {
      activeJobsQuery.$or = [
        { salaryMin: { $gte: preferences.minSalary } },
        { salaryMax: { $gte: preferences.minSalary } },
        { salaryMin: { $exists: false } },
      ];
    }

    // Filter by maximum salary if set
    if (preferences.maxSalary && preferences.maxSalary > 0) {
      activeJobsQuery.salaryMin = { $lte: preferences.maxSalary };
    }

    const fetchedJobs = await Job.find(activeJobsQuery)
      .populate('companyId', 'companyName logoUrl industry location')
      .sort({ createdAt: -1 })
      .limit(40);

    // Consider jobs eligible if no previous draft exists OR if job.updatedAt > draftCreatedAt
    const eligibleJobs = fetchedJobs.filter((job) => {
      const jobIdStr = job._id.toString();
      const draftCreatedAt = draftCreatedAtMap.get(jobIdStr);
      if (!draftCreatedAt) return true;
      return job.updatedAt.getTime() > draftCreatedAt.getTime();
    });

    if (eligibleJobs.length === 0) {
      seekerProfile.lastAutoApplyRunAt = new Date();
      await seekerProfile.save();
      return {
        success: true,
        createdCount: 0,
        drafts: [],
        message: 'No new matching jobs found at this time.',
      };
    }

    // Prepare candidate jobs payload for matching
    const candidateJobs = eligibleJobs.map((job) => ({
      _id: job._id.toString(),
      title: job.title,
      category: job.category,
      skillsRequired: job.skillsRequired || [],
      experienceLevel: job.experienceLevel,
      jobType: job.jobType,
      location: job.location,
      shortDescription: job.description ? job.description.slice(0, 250) : '',
    }));

    const verifiedSkillNames = (seekerProfile.verifiedSkills || []).map((v) => v.skill);
    const targetJobTitles = (preferences.targetJobTitles || []).map((t) => t.trim()).filter(Boolean);
    const targetSkills = (preferences.targetSkills || []).map((s) => s.trim()).filter(Boolean);

    let matchResults: Array<{ jobId: string; matchScore: number; matchReason: string }> = [];

    try {
      matchResults = await matchJobsToProfile(
        {
          skills: targetSkills.length > 0 ? targetSkills : (seekerProfile.skills || []),
          targetSkills: targetSkills.length > 0 ? targetSkills : undefined,
          targetJobTitles: targetJobTitles.length > 0 ? targetJobTitles : undefined,
          verifiedSkills: verifiedSkillNames,
          bio: extractCleanTextFromJSONOrString(seekerProfile.bio) || undefined,
          desiredJobTitles: targetJobTitles.length > 0 ? targetJobTitles : (seekerProfile.desiredJobTitles || []),
          experienceLevel: seekerProfile.experienceLevel || undefined,
          education: extractCleanTextFromJSONOrString(seekerProfile.education) || undefined,
          resumeText: extractCleanTextFromJSONOrString(seekerProfile.resumeText) || undefined,
        },
        candidateJobs
      );
    } catch (matchErr) {
      logger.warn(`[Auto-Apply AI Match Warning]: ${matchErr instanceof Error ? matchErr.message : matchErr}`);
    }

    // Explicit Target Job Title Boost: Ensure explicit title matches automatically qualify
    if (targetJobTitles.length > 0) {
      for (const job of eligibleJobs) {
        const jobTitleLower = job.title.toLowerCase();
        const matchedTarget = targetJobTitles.find((t) => {
          const tLower = t.toLowerCase();
          return (
            jobTitleLower.includes(tLower) ||
            tLower.includes(jobTitleLower) ||
            tLower.split(/\s+/).some((word) => word.length > 3 && jobTitleLower.includes(word))
          );
        });

        if (matchedTarget) {
          const existingMatch = matchResults.find((m) => m.jobId === job._id.toString());
          if (existingMatch) {
            existingMatch.matchScore = Math.max(existingMatch.matchScore, 95);
            existingMatch.matchReason = `Direct match for your specified target job title preference: "${job.title}".`;
          } else {
            matchResults.push({
              jobId: job._id.toString(),
              matchScore: 95,
              matchReason: `Direct match for your specified target job title preference: "${job.title}".`,
            });
          }
        }
      }
    }

    // Filter for strong matches (matchScore >= 70)
    const qualifyingMatches = (matchResults || [])
      .filter((m) => m.matchScore >= 70)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, remainingQuota);

    if (qualifyingMatches.length === 0) {
      seekerProfile.lastAutoApplyRunAt = new Date();
      await seekerProfile.save();
      return {
        success: true,
        createdCount: 0,
        drafts: [],
        message: 'No jobs met the minimum 70% match threshold for auto-apply drafting.',
      };
    }

    const userDoc = await User.findById(userId).select('fullName email phone location');
    const seekerLocation = [seekerProfile.city, seekerProfile.country].filter(Boolean).join(', ');
    const candidateInfo = {
      fullName: userDoc?.fullName || 'Candidate',
      email: userDoc?.email || '',
      phone: userDoc?.phone || '',
      location: userDoc?.location || seekerLocation || '',
    };

    const jobMap = new Map(eligibleJobs.map((j) => [j._id.toString(), j]));
    const createdDrafts: IAutoApplyDraft[] = [];

    for (const match of qualifyingMatches) {
      const targetJob = jobMap.get(match.jobId);
      if (!targetJob) continue;

      // 1. Re-check if formal application ALREADY exists for this exact job
      const existingAppCheck = await Application.findOne({ applicantId: userId, jobId: targetJob._id });
      if (existingAppCheck) {
        logger.info(`[AutoApply Skip]: Application already submitted for job ${targetJob._id}`);
        continue;
      }

      // Re-check existing draft timestamps
      const existingDraftCheck = await AutoApplyDraft.findOne({ userId, jobId: targetJob._id });
      if (existingDraftCheck) {
        if (targetJob.updatedAt.getTime() <= existingDraftCheck.createdAt.getTime()) {
          logger.info(`[AutoApply Skip]: Draft exists and job has not been edited since creation (${targetJob._id})`);
          continue;
        }
        logger.info(`[AutoApply Re-evaluating]: Employer edited job ${targetJob._id} after draft creation. Regenerating content.`);
      }

      // 2. Re-check daily quota before creating each draft
      const currentTodayCount = await AutoApplyDraft.countDocuments({
        userId,
        createdAt: { $gte: startOfDay },
      });
      if (currentTodayCount >= maxDaily && (!existingDraftCheck || existingDraftCheck.status !== 'pending_review')) {
        logger.info(`[AutoApply Quota Safety]: Reached max daily limit (${maxDaily}) for user ${userId}`);
        break;
      }

      const companyName =
        (targetJob.companyId as any)?.companyName || 'the hiring team';

      // Generate customized cover letter
      let coverLetter = '';
      try {
        coverLetter = await generateCoverLetter(
          seekerProfile.resumeText || `Candidate skills: ${(seekerProfile.skills || []).join(', ')}. Bio: ${seekerProfile.bio || ''}`,
          targetJob.title,
          companyName,
          targetJob.description || targetJob.title,
          'formal',
          candidateInfo
        );
      } catch (covErr) {
        logger.warn(`[Cover Letter Generation Fallback]: ${covErr instanceof Error ? covErr.message : covErr}`);
        const contactStr = candidateInfo.email
          ? `${candidateInfo.email}${candidateInfo.phone ? ` | ${candidateInfo.phone}` : ''}`
          : '';
        coverLetter = `Dear Hiring Team at ${companyName},\n\nI am writing to express my enthusiastic interest in the ${targetJob.title} position. With my background in ${(seekerProfile.skills || []).slice(0, 4).join(', ')} and dedicated professional experience, I am confident in my ability to deliver immediate value to your team.\n\nThank you for your time and consideration. I look forward to discussing how my skills align with your goals.\n\nSincerely,\n${candidateInfo.fullName}${contactStr ? `\n${contactStr}` : ''}`;
      }

      // Generate screening question answers if job has screening questions
      let screeningAnswers: any[] = [];
      if (targetJob.screeningQuestions && targetJob.screeningQuestions.length > 0) {
        try {
          screeningAnswers = await answerScreeningQuestionsForCandidate(
            targetJob.screeningQuestions,
            seekerProfile,
            candidateInfo
          );
        } catch (screenErr) {
          logger.warn(`[Screening Questions Generation Error]: ${screenErr instanceof Error ? screenErr.message : screenErr}`);
        }
      }

      try {
        let draft: IAutoApplyDraft;
        if (existingDraftCheck && existingDraftCheck.status === 'pending_review') {
          existingDraftCheck.generatedCoverLetter = coverLetter;
          existingDraftCheck.screeningAnswers = screeningAnswers;
          existingDraftCheck.matchScore = match.matchScore;
          existingDraftCheck.matchReason = match.matchReason || 'High alignment with your profile skills and career focus.';
          existingDraftCheck.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
          await existingDraftCheck.save();
          draft = existingDraftCheck;
        } else {
          if (existingDraftCheck) {
            await AutoApplyDraft.deleteOne({ _id: existingDraftCheck._id });
          }
          draft = await AutoApplyDraft.create({
            userId,
            jobId: targetJob._id,
            generatedCoverLetter: coverLetter,
            screeningAnswers,
            matchScore: match.matchScore,
            matchReason: match.matchReason || 'High alignment with your profile skills and career focus.',
            status: 'pending_review',
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
          });
        }

        createdDrafts.push(draft);

        // Trigger user notification
        try {
          await createNotification(
            userId,
            'auto_apply_draft_ready',
            'AI Prepared an Application Draft',
            `AI found a great match: "${targetJob.title}" at ${companyName} (${match.matchScore}% Match) — review and approve to apply.`,
            'auto_apply_draft',
            draft._id.toString()
          );
        } catch (notifErr) {
          logger.error(`Failed to send auto-apply notification: ${notifErr}`);
        }
      } catch (createErr: any) {
        // Handle MongoDB E11000 duplicate key error gracefully
        if (createErr.code === 11000 || createErr.message?.includes('E11000')) {
          logger.info(`[AutoApply Duplicate Key Guard]: Draft already exists for jobId ${targetJob._id}`);
          continue;
        }
        throw createErr;
      }
    }

    seekerProfile.lastAutoApplyRunAt = new Date();
    await seekerProfile.save();

    return {
      success: true,
      createdCount: createdDrafts.length,
      drafts: createdDrafts,
      message: `Successfully drafted ${createdDrafts.length} application(s) for your review.`,
    };
  } catch (error) {
    logger.error(`[runAutoApplyMatchingForUser Error]: ${error instanceof Error ? error.message : error}`);
    return {
      success: false,
      createdCount: 0,
      drafts: [],
      message: 'Failed to complete auto-apply scan.',
    };
  } finally {
    activeScansPerUser.delete(userId);
  }
};

/**
 * Runs auto-apply scanner across all enabled job seeker profiles.
 */
export const runAutoApplyForAllUsers = async (): Promise<number> => {
  try {
    const enabledProfiles = await JobSeekerProfile.find({ autoApplyEnabled: true }).select('userId');
    logger.info(`🤖 Auto-Apply: Running periodic scan for ${enabledProfiles.length} candidate(s)...`);

    let totalCreated = 0;
    for (const profile of enabledProfiles) {
      try {
        const res = await runAutoApplyMatchingForUser(profile.userId.toString());
        totalCreated += res.createdCount;
      } catch (userErr) {
        logger.error(`[Auto-Apply User Scan Error for ${profile.userId}]: ${userErr}`);
      }
    }

    logger.info(`🤖 Auto-Apply: Completed scan. Generated ${totalCreated} new pending draft(s).`);
    return totalCreated;
  } catch (error) {
    logger.error(`[runAutoApplyForAllUsers Error]: ${error}`);
    return 0;
  }
};

/**
 * Automatically marks pending drafts older than 48 hours as expired.
 * Note: Never auto-submits on expiry.
 */
export const cleanupExpiredAutoApplyDrafts = async (): Promise<number> => {
  try {
    const now = new Date();
    const result = await AutoApplyDraft.updateMany(
      {
        status: 'pending_review',
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`⏰ Auto-Apply: Cleaned up ${result.modifiedCount} expired draft(s).`);
    }

    return result.modifiedCount;
  } catch (error) {
    logger.error(`[cleanupExpiredAutoApplyDrafts Error]: ${error}`);
    return 0;
  }
};
