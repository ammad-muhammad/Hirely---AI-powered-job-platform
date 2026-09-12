import { Response, NextFunction } from 'express';
import { SkillTest, SkillTestAttempt, JobSeekerProfile, User } from '../models';
import { calculateProfileCompletion } from './jobSeekerProfile.controller';
import { analyzeAndGenerateSkillTests, generateTestQuestions } from '../services/ai.service';
import { extractTextFromPdfUrl } from '../utils/pdf.utils';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';
import { getIO } from '../config/socket';
import { createNotification } from '../services/notification.service';

/**
 * Helper to ensure a SkillTest exists for a suggested topic.
 * Checks DB for existing test by skillName (case-insensitive).
 * If missing or has no questions, generates 12 questions using AI factoring in experienceLevel and saves to DB.
 */
async function findOrCreateSkillTestForTopic(
  topic: {
    topicName: string;
    category: string;
    difficulty?: string;
  },
  experienceLevel: 'entry' | 'mid' | 'senior' = 'mid'
): Promise<any | null> {
  const cleanSkillName = topic.topicName.trim();
  const regex = new RegExp(`^${cleanSkillName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');

  let existingTest = await SkillTest.findOne({ skillName: regex });
  if (existingTest && Array.isArray(existingTest.questions) && existingTest.questions.length >= 20) {
    return existingTest;
  }

  try {
    const rawQuestions = await generateTestQuestions(cleanSkillName, topic.category, experienceLevel);

    const formattedQuestions = rawQuestions.map((q, idx) => ({
      questionId: `q_${Date.now()}_${idx + 1}`,
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation || '',
    }));

    if (!existingTest) {
      existingTest = await SkillTest.create({
        title: `${cleanSkillName} Assessment`,
        category: topic.category || 'General',
        skillName: cleanSkillName,
        description: `Comprehensive AI-generated assessment evaluating proficiency in ${cleanSkillName} tailored for ${experienceLevel}-level professionals.`,
        timeLimitMinutes: 15,
        passingScore: 70,
        questions: formattedQuestions,
      });
    } else {
      existingTest.questions = formattedQuestions;
      await existingTest.save();
    }

    return existingTest;
  } catch (err) {
    logger.error(`[findOrCreateSkillTestForTopic Failed for "${cleanSkillName}"]:`, err);
    return null;
  }
}

function calculateTestMatchScore(
  test: { skillName: string; category: string; title: string; description?: string },
  profile: any,
  resumeText: string | null
): { matchScore: number; matchReason: string } {
  const userSkills = (profile?.skills || []).map((s: any) => String(s).trim().toLowerCase()).filter(Boolean);
  const testSkillLower = (test.skillName || '').toLowerCase();
  const testCategoryLower = (test.category || '').toLowerCase();
  const testTitleLower = (test.title || '').toLowerCase();

  let baseScore = 76;
  let reason = `Matches your professional background`;

  // 1. Direct Skill Exact / Partial Match
  const exactMatch = userSkills.find(
    (sk: string) => sk === testSkillLower || (testSkillLower.length > 2 && sk.includes(testSkillLower)) || (testSkillLower.length > 2 && testSkillLower.includes(sk))
  );

  const categoryMatch = userSkills.find(
    (sk: string) => (testCategoryLower.length > 2 && testCategoryLower.includes(sk)) || (testCategoryLower.length > 2 && sk.includes(testCategoryLower)) || testTitleLower.includes(sk)
  );

  if (exactMatch) {
    baseScore = 93;
    reason = `Direct match for your profile skill "${exactMatch}"`;
  } else if (categoryMatch) {
    baseScore = 85;
    reason = `Matches your ${test.category} skillset`;
  } else if (userSkills.length > 0) {
    baseScore = 77;
    reason = `Recommended for your engineering domain`;
  }

  // 2. Resume Keyword Boost
  let resumeBoost = 0;
  if (resumeText) {
    const resLower = resumeText.toLowerCase();
    if (testSkillLower && resLower.includes(testSkillLower)) {
      resumeBoost += 3;
    }
    if (testCategoryLower && resLower.includes(testCategoryLower)) {
      resumeBoost += 1;
    }
  }

  // 3. Skill Specific Micro-Variance (Hash-based deterministic variance for visual differentiation)
  const hash = (testTitleLower + testSkillLower).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variance = (hash % 7) - 3; // -3 to +3

  const finalScore = Math.min(99, Math.max(68, baseScore + resumeBoost + variance));

  return { matchScore: finalScore, matchReason: reason };
}

export const getAllSkillTests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isJobSeeker = req.user?.role === 'job_seeker';

    if (!userId || !isJobSeeker) {
      res.status(200).json({
        success: true,
        isProfileIncomplete: true,
        detectedField: null,
        recommended: [],
      });
      return;
    }

    const profile = await JobSeekerProfile.findOne({ userId });
    const hasSkills = profile && Array.isArray(profile.skills) && profile.skills.length > 0;
    const hasResumeUrl = Boolean(profile?.resumeUrl);
    const hasResumeText = Boolean(profile?.resumeText && profile.resumeText.trim().length > 20);

    // Profile is incomplete if no skills AND no resume uploaded/pasted
    if (!hasSkills && !hasResumeUrl && !hasResumeText) {
      res.status(200).json({
        success: true,
        isProfileIncomplete: true,
        detectedField: null,
        recommended: [],
      });
      return;
    }

    let resumeText: string | null = profile?.resumeText || null;
    if (!resumeText && profile?.resumeUrl) {
      try {
        resumeText = await extractTextFromPdfUrl(profile.resumeUrl);
      } catch (err) {
        logger.warn(`Failed to extract text from resumeUrl for user ${userId}:`, err);
      }
    }

    // 6-hour Cache Check
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const now = new Date();
    let cachedTestIds: string[] = [];
    let isCacheValid = false;

    if (
      profile?.skillTestRecommendationsCache &&
      profile.skillTestRecommendationsCache.length >= 3 &&
      profile.skillTestRecommendationsCacheAt &&
      now.getTime() - new Date(profile.skillTestRecommendationsCacheAt).getTime() < SIX_HOURS_MS
    ) {
      cachedTestIds = profile.skillTestRecommendationsCache.map((c) => c.testId.toString());
      isCacheValid = true;
    }

    let recommendedTestDocs: any[] = [];
    let detectedField = 'Professional Field';

    if (isCacheValid && cachedTestIds.length >= 3) {
      const fetchedRecs = await SkillTest.find({ _id: { $in: cachedTestIds } }).select(
        '-questions.correctOptionIndex -questions.explanation'
      );

      if (fetchedRecs.length >= 3) {
        recommendedTestDocs = fetchedRecs.map((t) => ({
          ...t.toObject(),
          matchScore: 92,
          matchReason: `Matches your saved profile & experience`,
        }));
      } else {
        isCacheValid = false;
      }
    }

    if (!isCacheValid || recommendedTestDocs.length < 3) {
      // 1. FAST PRE-SEEDED SKILL MATCHING FROM MONGO
      const candidateSkillsLower = (profile?.skills || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
      let matchedPreSeeded: any[] = [];

      if (candidateSkillsLower.length > 0) {
        const regexList = candidateSkillsLower.map((sk) => new RegExp(sk, 'i'));
        matchedPreSeeded = await SkillTest.find({
          $or: [
            { skillName: { $in: regexList } },
            { category: { $in: regexList } },
            { title: { $in: regexList } },
          ],
        }).select('-questions.correctOptionIndex -questions.explanation');
      }

      const currentDocIds = new Set(recommendedTestDocs.map((t) => t._id.toString()));
      for (const pDoc of matchedPreSeeded) {
        if (!currentDocIds.has(pDoc._id.toString())) {
          const pObj = pDoc.toObject();
          delete (pObj as any).passingScore;
          delete (pObj as any).questions;
          recommendedTestDocs.push({
            ...pObj,
            matchScore: 95,
            matchReason: `Matches your profile skill "${pDoc.skillName}"`,
          });
          currentDocIds.add(pDoc._id.toString());
        }
      }

      // 2. AI DOMAIN & TOPIC ANALYSIS (If additional tests needed)
      if (recommendedTestDocs.length < 3) {
        const domainAnalysis = await analyzeAndGenerateSkillTests(
          {
            skills: profile?.skills || [],
            bio: profile?.bio || undefined,
            experienceLevel: profile?.experienceLevel || undefined,
            education: profile?.education || undefined,
          },
          resumeText
        );

        detectedField = domainAnalysis.detectedField || 'Professional Field';
        const topics = domainAnalysis.suggestedTopics;
        const candidateExpLevel = profile?.experienceLevel || 'mid';

        for (const topic of topics) {
          const testDoc = await findOrCreateSkillTestForTopic(topic, candidateExpLevel);
          if (testDoc && !currentDocIds.has(testDoc._id.toString())) {
            const testObj = testDoc.toObject();
            delete (testObj as any).passingScore;
            delete (testObj as any).questions;

            recommendedTestDocs.push({
              ...testObj,
              matchScore: 95,
              matchReason: `Matches your ${detectedField} background`,
            });
            currentDocIds.add(testDoc._id.toString());
          }
        }
      }

      // Cache recommendations for fast future loads
      if (profile && recommendedTestDocs.length > 0) {
        try {
          await JobSeekerProfile.updateOne(
            { _id: profile._id },
            {
              $set: {
                skillTestRecommendationsCache: recommendedTestDocs.map((t) => ({
                  testId: t._id,
                  relevanceScore: t.matchScore || 95,
                  reason: t.matchReason || `Matches your saved profile & experience`,
                })),
                skillTestRecommendationsCacheAt: now,
              },
            }
          );
        } catch (cacheErr) {
          logger.warn(`Failed to update skillTestRecommendationsCache for profile ${profile._id}:`, cacheErr);
        }
      }
    }

    // 3. INCLUDE PREVIOUSLY ATTEMPTED TESTS THAT MATCH CANDIDATE SKILLS OR WERE PASSED
    const userSkills = (profile?.skills || []).map((s: string) => String(s).trim().toLowerCase()).filter(Boolean);

    const allUserAttempts = await SkillTestAttempt.find({
      userId,
      status: { $in: ['submitted', 'disqualified', 'expired'] },
    }).sort({ createdAt: -1 });

    const attemptedTestIds = Array.from(new Set(allUserAttempts.map((a) => a.testId.toString())));
    if (attemptedTestIds.length > 0) {
      const currentDocIds = new Set(recommendedTestDocs.map((t) => t._id.toString()));
      const missingAttemptedIds = attemptedTestIds.filter((id) => !currentDocIds.has(id));

      if (missingAttemptedIds.length > 0) {
        const missingTestDocs = await SkillTest.find({ _id: { $in: missingAttemptedIds } }).select(
          '-questions.correctOptionIndex -questions.explanation'
        );

        for (const mDoc of missingTestDocs) {
          const titleLower = mDoc.title.toLowerCase();
          const categoryLower = mDoc.category.toLowerCase();
          const skillLower = mDoc.skillName.toLowerCase();

          // Only include if user passed OR if test skill/category matches candidate's profile skills
          const userPassed = allUserAttempts.some((a) => a.testId.toString() === mDoc._id.toString() && a.passed);
          const matchesSkill = userSkills.some(
            (sk: string) => skillLower.includes(sk) || categoryLower.includes(sk) || titleLower.includes(sk) || sk.includes(skillLower)
          );

          if (userPassed || matchesSkill) {
            const mObj = mDoc.toObject();
            delete (mObj as any).passingScore;
            delete (mObj as any).questions;
            recommendedTestDocs.push({
              ...mObj,
              matchScore: 90,
              matchReason: `Previously attempted skill assessment`,
            });
          }
        }
      }
    }

    // Enrich recommended tests with attempt status, cooldown info, and experience-level dynamic question/time metrics
    const candidateExpLevel = profile?.experienceLevel || 'mid';
    const targetCountByExp = candidateExpLevel === 'senior' ? 20 : candidateExpLevel === 'mid' ? 15 : 12;

    const testIds = recommendedTestDocs.map((t) => t._id);
    const [userAttempts, fullTestDocs] = await Promise.all([
      SkillTestAttempt.find({
        userId,
        testId: { $in: testIds },
        status: { $in: ['submitted', 'disqualified', 'expired'] },
      }).sort({ createdAt: -1 }),
      SkillTest.find({ _id: { $in: testIds } }).select('questions'),
    ]);

    const questionsCountMap = new Map(
      fullTestDocs.map((t) => [
        t._id.toString(),
        t.questions?.length ? Math.min(t.questions.length, targetCountByExp) : targetCountByExp,
      ])
    );

    const enrichedRecommended = recommendedTestDocs.map((testObj) => {
      const testAttempts = userAttempts.filter((a) => a.testId.toString() === testObj._id.toString());
      const lastAttempt = testAttempts[0] || null;
      const passedAttempts = testAttempts.filter((a) => a.passed);

      const bestScore = passedAttempts.length > 0 ? Math.max(...passedAttempts.map((a) => a.score)) : 0;

      let cooldownActive = false;
      let nextRetakeAvailableAt: Date | null = null;
      let cooldownReason: 'passed' | 'failed' | null = null;
      let lastAttemptAt: Date | null = null;
      let lastAttemptPassed: boolean | null = null;
      let lastAttemptScore: number | null = null;

      if (lastAttempt) {
        lastAttemptAt = lastAttempt.submittedAt || lastAttempt.createdAt;
        lastAttemptPassed = lastAttempt.passed;
        lastAttemptScore = lastAttempt.score;

        const lastTime = new Date(lastAttemptAt).getTime();
        const nowTime = now.getTime();

        if (!lastAttempt.passed) {
          const nextTime = lastTime + 24 * 60 * 60 * 1000; // 24 Hours
          if (nowTime < nextTime) {
            cooldownActive = true;
            nextRetakeAvailableAt = new Date(nextTime);
            cooldownReason = 'failed';
          }
        } else {
          const nextTime = lastTime + 7 * 24 * 60 * 60 * 1000; // 7 Days
          if (nowTime < nextTime) {
            cooldownActive = true;
            nextRetakeAvailableAt = new Date(nextTime);
            cooldownReason = 'passed';
          }
        }
      }

      const questionsCount = questionsCountMap.get(testObj._id.toString()) || targetCountByExp;
      const computedTimeMinutes = Math.ceil((questionsCount * 20) / 60);

      const dynamicMatch = calculateTestMatchScore(testObj, profile, resumeText);

      return {
        ...testObj,
        matchScore: dynamicMatch.matchScore,
        matchReason: dynamicMatch.matchReason,
        questionsCount,
        timeLimitMinutes: computedTimeMinutes,
        lastAttemptAt,
        lastAttemptPassed,
        lastAttemptScore,
        bestScore,
        cooldownActive,
        nextRetakeAvailableAt,
        cooldownReason,
      };
    });

    res.status(200).json({
      success: true,
      isProfileIncomplete: false,
      detectedField,
      recommended: enrichedRecommended,
    });
  } catch (error) {
    next(error);
  }
};

export const getSkillTestById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const test = await SkillTest.findById(id).select('-questions.correctOptionIndex -questions.explanation');
    if (!test) {
      res.status(404).json({ success: false, message: 'Skill test not found.' });
      return;
    }

    const testObj = test.toObject();
    delete (testObj as any).passingScore;

    res.status(200).json({
      success: true,
      data: testObj,
    });
  } catch (error) {
    next(error);
  }
};

export const startSkillTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { testId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const test = await SkillTest.findById(testId);
    if (!test) {
      res.status(404).json({ success: false, message: 'Skill test not found.' });
      return;
    }

    const now = new Date();

    let attempt = await SkillTestAttempt.findOne({
      userId,
      testId: test._id,
      status: 'in_progress',
      endsAt: { $gt: now },
    });

    if (!attempt) {
      // 1. RETAKE COOLDOWN CHECK ON COMPLETED ATTEMPTS
      const lastAttempt = await SkillTestAttempt.findOne({
        userId,
        testId: test._id,
        status: { $in: ['submitted', 'disqualified', 'expired'] },
      }).sort({ createdAt: -1 });

      if (lastAttempt) {
        const lastTime = new Date(lastAttempt.submittedAt || lastAttempt.createdAt).getTime();
        const nowTime = now.getTime();

        if (!lastAttempt.passed) {
          const nextAvailableAt = new Date(lastTime + 24 * 60 * 60 * 1000); // 24 Hours
          if (nowTime < nextAvailableAt.getTime()) {
            const hoursLeft = Math.ceil((nextAvailableAt.getTime() - nowTime) / (1000 * 60 * 60));
            const hoursText = hoursLeft === 1 ? '1 hour' : `${hoursLeft} hours`;
            res.status(400).json({
              success: false,
              cooldownActive: true,
              cooldownReason: 'failed',
              nextRetakeAvailableAt: nextAvailableAt,
              message: `You can retake this test in ${hoursText} after your last attempt.`,
            });
            return;
          }
        } else {
          const nextAvailableAt = new Date(lastTime + 7 * 24 * 60 * 60 * 1000); // 7 Days
          if (nowTime < nextAvailableAt.getTime()) {
            const daysLeft = Math.ceil((nextAvailableAt.getTime() - nowTime) / (1000 * 60 * 60 * 24));
            const daysText = daysLeft === 1 ? '1 day' : `${daysLeft} days`;
            res.status(400).json({
              success: false,
              cooldownActive: true,
              cooldownReason: 'passed',
              nextRetakeAvailableAt: nextAvailableAt,
              message: `You've already passed this test. You can retake it to try improving your score in ${daysText}.`,
            });
            return;
          }
        }
      }

      // 2. DYNAMIC QUESTION COUNT & OPTION SHUFFLING BASED ON CANDIDATE EXPERIENCE
      const profile = await JobSeekerProfile.findOne({ userId });
      const expLevel = profile?.experienceLevel || 'mid';

      const targetCount = expLevel === 'senior' ? 20 : expLevel === 'mid' ? 15 : 12;
      const QUESTIONS_PER_ATTEMPT = Math.min(test.questions.length, targetCount);

      // Randomize question selection order
      const shuffledPool = [...test.questions].sort(() => 0.5 - Math.random());
      const selectedPool = shuffledPool.slice(0, QUESTIONS_PER_ATTEMPT);

      // Shuffle options for EACH selected question to ensure A/B/C/D are evenly distributed
      const attemptQuestions = selectedPool.map((q) => {
        const originalOpts = [...q.options];
        const correctText = originalOpts[q.correctOptionIndex];

        const shuffledOpts = [...originalOpts];
        for (let i = shuffledOpts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
        }

        const newIdx = correctText ? shuffledOpts.indexOf(correctText) : q.correctOptionIndex;
        return {
          questionId: q.questionId,
          questionText: q.questionText,
          options: shuffledOpts,
          correctOptionIndex: newIdx >= 0 ? newIdx : q.correctOptionIndex,
          explanation: q.explanation || '',
        };
      });

      const selectedQuestionIds = attemptQuestions.map((q) => q.questionId);

      const totalAllowedSeconds = Math.max(120, QUESTIONS_PER_ATTEMPT * 20 + 30);
      const endsAt = new Date(now.getTime() + totalAllowedSeconds * 1000);

      attempt = await SkillTestAttempt.create({
        userId,
        testId: test._id,
        startedAt: now,
        endsAt,
        status: 'in_progress',
        questionIds: selectedQuestionIds,
        attemptQuestions,
        answers: [],
        violationsCount: 0,
        violationLogs: [],
      });
    }

    // Determine target questions for this attempt
    let targetQuestions: any[] = (attempt.attemptQuestions && attempt.attemptQuestions.length > 0)
      ? attempt.attemptQuestions
      : [];

    if (targetQuestions.length === 0) {
      if (attempt.questionIds && attempt.questionIds.length > 0) {
        const qMap = new Map(test.questions.map((q) => [q.questionId, q]));
        const picked = attempt.questionIds.map((qid) => qMap.get(qid)).filter(Boolean);
        if (picked.length > 0) {
          targetQuestions = picked;
        }
      }
    }

    if (targetQuestions.length === 0) {
      targetQuestions = test.questions.slice(0, 15);
    }

    const sanitizedQuestions = targetQuestions.map((q: any) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
    }));

    const computedTimeMinutes = Math.ceil((targetQuestions.length * 20) / 60);

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        testId: test._id,
        title: test.title,
        category: test.category,
        skillName: test.skillName,
        timeLimitMinutes: computedTimeMinutes,
        passingScore: test.passingScore || 70,
        startedAt: attempt.startedAt,
        endsAt: attempt.endsAt,
        violationsCount: attempt.violationsCount,
        savedAnswers: attempt.answers,
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveAnswer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { attemptId } = req.params;
    const { questionId, selectedOptionIndex } = req.body;

    if (questionId === undefined || selectedOptionIndex === undefined) {
      res.status(400).json({ success: false, message: 'questionId and selectedOptionIndex are required.' });
      return;
    }

    const attempt = await SkillTestAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Test attempt not found.' });
      return;
    }

    if (attempt.status !== 'in_progress') {
      res.status(400).json({ success: false, message: `Cannot answer questions for attempt in status '${attempt.status}'.` });
      return;
    }

    if (new Date() > attempt.endsAt) {
      attempt.status = 'expired';
      await attempt.save();
      res.status(400).json({ success: false, message: 'Test attempt time has expired.' });
      return;
    }

    const existingIdx = attempt.answers.findIndex((a) => a.questionId === questionId);
    if (existingIdx >= 0) {
      attempt.answers[existingIdx].selectedOptionIndex = selectedOptionIndex;
    } else {
      attempt.answers.push({ questionId, selectedOptionIndex });
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Answer saved.',
      savedAnswers: attempt.answers,
    });
  } catch (error) {
    next(error);
  }
};

export const flagViolation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { attemptId } = req.params;
    const { reason } = req.body;

    const attempt = await SkillTestAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Test attempt not found.' });
      return;
    }

    if (attempt.status !== 'in_progress') {
      res.status(200).json({
        success: true,
        violationsCount: attempt.violationsCount,
        isDisqualified: attempt.status === 'disqualified',
      });
      return;
    }

    attempt.violationsCount += 1;
    attempt.violationLogs.push(`${new Date().toISOString()}: ${reason || 'Proctoring violation detected'}`);

    let isDisqualified = false;
    if (attempt.violationsCount >= 3) {
      attempt.status = 'disqualified';
      attempt.submittedAt = new Date();
      attempt.score = 0;
      attempt.passed = false;
      isDisqualified = true;
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      violationsCount: attempt.violationsCount,
      isDisqualified,
      message: isDisqualified
        ? 'Disqualified! 3 proctoring violation warnings accumulated.'
        : `Proctoring warning logged (${attempt.violationsCount}/3).`,
    });
  } catch (error) {
    next(error);
  }
};

export const submitSkillTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { attemptId } = req.params;

    const attempt = await SkillTestAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Test attempt not found.' });
      return;
    }

    const test = await SkillTest.findById(attempt.testId);
    if (!test) {
      res.status(404).json({ success: false, message: 'Associated test not found.' });
      return;
    }

    if (attempt.status === 'submitted' || attempt.status === 'disqualified') {
      res.status(200).json({
        success: true,
        data: buildAttemptResult(attempt, test),
      });
      return;
    }

    // Determine target questions for this attempt (prefer attemptQuestions with shuffled options)
    let targetQuestions: any[] = (attempt.attemptQuestions && attempt.attemptQuestions.length > 0)
      ? attempt.attemptQuestions
      : [];

    if (targetQuestions.length === 0) {
      if (attempt.questionIds && attempt.questionIds.length > 0) {
        const qMap = new Map(test.questions.map((q) => [q.questionId, q]));
        const picked = attempt.questionIds.map((qid) => qMap.get(qid)).filter(Boolean);
        if (picked.length > 0) {
          targetQuestions = picked;
        }
      }
    }

    if (targetQuestions.length === 0) {
      targetQuestions = test.questions;
    }

    const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a.selectedOptionIndex]));
    let correctCount = 0;

    const questionBreakdown = targetQuestions.map((q: any) => {
      const selectedIdx = answerMap.get(q.questionId);
      const isCorrect = selectedIdx !== undefined && selectedIdx === q.correctOptionIndex;
      if (isCorrect) correctCount += 1;

      return {
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        selectedOptionIndex: selectedIdx ?? null,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation || '',
      };
    });

    const score = Math.round((correctCount / targetQuestions.length) * 100);
    const passed = score >= test.passingScore && attempt.violationsCount < 3;

    attempt.score = score;
    attempt.passed = passed;
    attempt.status = attempt.violationsCount >= 3 ? 'disqualified' : 'submitted';
    attempt.submittedAt = new Date();

    attempt.answers = targetQuestions.map((q: any) => {
      const selected = answerMap.get(q.questionId);
      return {
        questionId: q.questionId,
        selectedOptionIndex: selected ?? -1,
        isCorrect: selected === q.correctOptionIndex,
      };
    });

    await attempt.save();

    // Query previous passed attempts for best-score tracking
    const previousPassedAttempts = await SkillTestAttempt.find({
      userId,
      testId: test._id,
      passed: true,
      _id: { $ne: attempt._id },
    });

    const previousBestScore = previousPassedAttempts.length > 0
      ? Math.max(...previousPassedAttempts.map((a) => a.score))
      : 0;

    const isNewBestScore = passed && (previousPassedAttempts.length === 0 || score > previousBestScore);
    const bestScore = passed ? Math.max(score, previousBestScore) : previousBestScore;

    let feedbackMessage = '';
    if (passed) {
      if (isNewBestScore && previousPassedAttempts.length > 0) {
        feedbackMessage = `🎉 New Personal Best! Your score of ${score}% is your highest score yet for this skill!`;
      } else if (previousBestScore > 0 && score <= previousBestScore) {
        feedbackMessage = `Great effort! Your best score for this skill remains ${previousBestScore}% from a previous attempt.`;
      } else {
        feedbackMessage = '🎉 Congratulations! Skill test passed!';
      }
    } else {
      if (previousBestScore > 0) {
        feedbackMessage = `Great effort! You didn't pass this attempt, but your best score for this skill remains ${previousBestScore}% from a previous attempt.`;
      } else {
        feedbackMessage = 'Test completed.';
      }
    }

    if (userId && bestScore > 0) {
      let profile = await JobSeekerProfile.findOne({ userId });
      if (!profile) {
        profile = new JobSeekerProfile({ userId });
      }

      if (!profile.verifiedSkills) {
        profile.verifiedSkills = [];
      }

      const existingIdx = profile.verifiedSkills.findIndex(
        (vs) => vs.skill.toLowerCase() === test.skillName.toLowerCase()
      );

      if (existingIdx >= 0) {
        if (bestScore > profile.verifiedSkills[existingIdx].score) {
          profile.verifiedSkills[existingIdx].score = bestScore;
          profile.verifiedSkills[existingIdx].verifiedAt = new Date();
        }
      } else if (passed) {
        profile.verifiedSkills.push({
          skill: test.skillName,
          score: bestScore,
          verifiedAt: new Date(),
        });
      }

      const user = await User.findById(userId);
      if (user) {
        profile.profileCompletionPercentage = calculateProfileCompletion(user, profile);
      }
      await profile.save();

      if (passed) {
        await createNotification(
          userId,
          'skill_test_badge_earned',
          'Skill Assessment Badge Earned!',
          `Congratulations! You scored ${score}% on the ${test.title} assessment and earned a verified skill badge.`,
          'job',
          test._id.toString()
        );

        const io = getIO();
        if (io) {
          io.to(userId.toString()).emit('badge_earned', {
            testId: test._id,
            skillName: test.skillName,
            score: bestScore,
            verifiedAt: new Date(),
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: feedbackMessage,
      data: {
        attemptId: attempt._id,
        testTitle: test.title,
        skillName: test.skillName,
        score,
        passed,
        bestScore,
        isNewBestScore,
        previousBestScore,
        passingScore: test.passingScore,
        violationsCount: attempt.violationsCount,
        status: attempt.status,
        feedbackMessage,
        questionBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttempts = async (
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

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const [attempts, totalCount] = await Promise.all([
      SkillTestAttempt.find({ userId })
        .populate('testId', 'title category skillName timeLimitMinutes passingScore')
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit),
      SkillTestAttempt.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      data: attempts,
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

export const getMyVerifiedSkills = async (
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

    const profile = await JobSeekerProfile.findOne({ userId });
    const verifiedSkills = profile?.verifiedSkills || [];

    res.status(200).json({
      success: true,
      data: verifiedSkills,
    });
  } catch (error) {
    next(error);
  }
};

function buildAttemptResult(attempt: any, test: any) {
  let targetQuestions = attempt.attemptQuestions;
  if (!targetQuestions || targetQuestions.length === 0) {
    if (attempt.questionIds && attempt.questionIds.length > 0) {
      const qMap = new Map(test.questions.map((q: any) => [q.questionId, q]));
      const picked = attempt.questionIds.map((qid: string) => qMap.get(qid)).filter(Boolean);
      if (picked.length > 0) {
        targetQuestions = picked;
      }
    }
  }

  if (!targetQuestions || targetQuestions.length === 0) {
    targetQuestions = test.questions;
  }

  const answerMap = new Map(attempt.answers.map((a: any) => [a.questionId, a.selectedOptionIndex]));
  const questionBreakdown = targetQuestions.map((q: any) => {
    const selectedIdx = answerMap.get(q.questionId);
    return {
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      selectedOptionIndex: selectedIdx ?? null,
      correctOptionIndex: q.correctOptionIndex,
      isCorrect: selectedIdx === q.correctOptionIndex,
      explanation: q.explanation || '',
    };
  });

  return {
    attemptId: attempt._id,
    testTitle: test.title,
    skillName: test.skillName,
    score: attempt.score,
    passed: attempt.passed,
    passingScore: test.passingScore,
    violationsCount: attempt.violationsCount,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    questionBreakdown,
  };
}
