import { Response, NextFunction } from 'express';
import { MockInterview, JobSeekerProfile } from '../models';
import { AuthenticatedRequest } from '../types';
import { getIO } from '../config/socket';
import {
  generateInterviewQuestion,
  generateFinalInterviewFeedback,
  analyzeAndGenerateSkillTests,
  generateInterviewPrepGuide,
  InterviewPrepGuideResult,
} from '../services/ai.service';

interface PrepGuideCacheEntry {
  data: InterviewPrepGuideResult;
  timestamp: number;
}

const prepGuideCache = new Map<string, PrepGuideCacheEntry>();
const PREP_GUIDE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache TTL

/**
 * GET /api/mock-interviews/prep-guide
 * Returns tailored prep guide for a field & experience level with per-field in-memory caching.
 */
export const getInterviewPrepGuide = async (
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

    let targetField = req.query.targetField ? String(req.query.targetField).trim() : '';

    const profile = await JobSeekerProfile.findOne({ userId });
    const experienceLevel = profile?.experienceLevel || 'mid';

    if (!targetField) {
      if (profile && profile.desiredJobTitles && profile.desiredJobTitles.length > 0) {
        targetField = profile.desiredJobTitles[0];
      } else if (profile && profile.skills && profile.skills.length > 0) {
        targetField = `${profile.skills[0]} Specialist`;
      } else {
        targetField = 'Software Engineering';
      }
    }

    const cacheKey = `${targetField.toLowerCase()}:${experienceLevel.toLowerCase()}`;
    const cached = prepGuideCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < PREP_GUIDE_CACHE_TTL_MS) {
      res.status(200).json({
        success: true,
        data: cached.data,
        cached: true,
      });
      return;
    }

    const prepGuide = await generateInterviewPrepGuide(
      targetField,
      experienceLevel as 'entry' | 'mid' | 'senior'
    );

    prepGuideCache.set(cacheKey, {
      data: prepGuide,
      timestamp: Date.now(),
    });

    res.status(200).json({
      success: true,
      data: prepGuide,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1. POST /api/mock-interviews/start
 * Starts a new mock interview session (max 3 per day).
 */
export const startMockInterview = async (
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

    // Rate limiting: Max 3 mock interview starts per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySessionsCount = await MockInterview.countDocuments({
      userId,
      startedAt: { $gte: startOfDay },
    });

    if (todaySessionsCount >= 3) {
      res.status(429).json({
        success: false,
        message: 'Daily mock interview limit reached (3 per day). Please come back tomorrow to practice more!',
      });
      return;
    }

    let targetField = req.body.targetField ? String(req.body.targetField).trim() : '';
    const jobId = req.body.jobId || null;

    const profile = await JobSeekerProfile.findOne({ userId });
    const experienceLevel = profile?.experienceLevel || 'mid';

    if (!targetField) {
      if (profile && profile.skills && profile.skills.length > 0) {
        const domainResult = await analyzeAndGenerateSkillTests(
          {
            skills: profile.skills,
            bio: profile.bio || undefined,
            experienceLevel: profile.experienceLevel || undefined,
            education: profile.education || undefined,
          },
          profile.resumeText || null
        );
        targetField = domainResult.detectedField || profile.skills[0] || 'Software Engineering';
      } else {
        targetField = 'Software Engineering';
      }
    }

    // Generate Question #1
    const firstQuestion = await generateInterviewQuestion(
      targetField,
      experienceLevel,
      [],
      1
    );

    const newSession = await MockInterview.create({
      userId,
      targetField,
      jobId,
      status: 'in_progress',
      questions: [
        {
          questionText: firstQuestion.questionText,
          category: firstQuestion.category,
          askedAt: new Date(),
        },
      ],
      answers: [],
      startedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Mock interview session started!',
      data: {
        interviewId: newSession._id,
        targetField,
        currentQuestionNumber: 1,
        totalQuestions: 6,
        question: newSession.questions[0],
        remainingDailySessions: 3 - (todaySessionsCount + 1),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/mock-interviews/:id/answer
 * Submits an answer for the current question and returns the next question or completion trigger.
 */
export const answerMockQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id: interviewId } = req.params;
    const { answerText } = req.body;

    if (!answerText || !String(answerText).trim()) {
      res.status(400).json({ success: false, message: 'Please provide a valid answer response.' });
      return;
    }

    const session = await MockInterview.findOne({ _id: interviewId, userId });
    if (!session) {
      res.status(404).json({ success: false, message: 'Mock interview session not found.' });
      return;
    }

    if (session.status !== 'in_progress') {
      res.status(400).json({ success: false, message: 'This interview session is already completed.' });
      return;
    }

    const qCount = session.questions.length;
    if (qCount === 0) {
      res.status(400).json({ success: false, message: 'No questions found in this interview session.' });
      return;
    }

    // Save candidate's answer for current question index (qCount - 1)
    const currentQIndex = qCount - 1;
    session.answers.push({
      questionIndex: currentQIndex,
      answerText: String(answerText).trim(),
      answeredAt: new Date(),
    });

    const profile = await JobSeekerProfile.findOne({ userId });
    const experienceLevel = profile?.experienceLevel || 'mid';

    // If fewer than 6 questions have been asked, generate next question
    if (qCount < 6) {
      const previousQA = session.questions.map((q, idx) => ({
        questionText: q.questionText,
        answerText: session.answers[idx] ? session.answers[idx].answerText : '',
      }));

      const nextQuestion = await generateInterviewQuestion(
        session.targetField,
        experienceLevel,
        previousQA,
        qCount + 1
      );

      session.questions.push({
        questionText: nextQuestion.questionText,
        category: nextQuestion.category,
        askedAt: new Date(),
      });

      await session.save();

      res.status(200).json({
        success: true,
        data: {
          interviewId: session._id,
          currentQuestionNumber: qCount + 1,
          totalQuestions: 6,
          question: session.questions[qCount],
          isComplete: false,
        },
      });
      return;
    }

    // 6 questions answered: ready for final completion
    await session.save();

    res.status(200).json({
      success: true,
      message: 'All 6 questions answered! Ready for final evaluation.',
      data: {
        interviewId: session._id,
        currentQuestionNumber: 6,
        totalQuestions: 6,
        isComplete: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/mock-interviews/:id/complete
 * Evaluates the full interview transcript and generates comprehensive feedback.
 */
export const completeMockInterview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id: interviewId } = req.params;

    const session = await MockInterview.findOne({ _id: interviewId, userId });
    if (!session) {
      res.status(404).json({ success: false, message: 'Mock interview session not found.' });
      return;
    }

    if (session.status === 'completed' && session.feedback) {
      res.status(200).json({
        success: true,
        data: session,
      });
      return;
    }

    if (session.questions.length < 6 || session.answers.length < 6) {
      res.status(400).json({
        success: false,
        message: `Please answer all 6 questions before requesting final evaluation. (${session.answers.length}/6 answered)`,
      });
      return;
    }

    const allQuestionsAndAnswers = session.questions.map((q, idx) => ({
      questionIndex: idx,
      questionText: q.questionText,
      category: q.category,
      answerText: session.answers[idx] ? session.answers[idx].answerText : 'No answer provided.',
    }));

    const feedbackResult = await generateFinalInterviewFeedback(
      session.targetField,
      allQuestionsAndAnswers
    );

    session.feedback = feedbackResult as any;
    session.status = 'completed';
    session.completedAt = new Date();

    await session.save();

    const io = getIO();
    if (io && userId) {
      io.to(userId.toString()).emit('profile_updated', {
        mockInterviewId: session._id,
        score: session.feedback?.overallScore,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mock interview evaluation completed successfully!',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/mock-interviews/history
 * Lists completed mock interview sessions for current user.
 */
export const getMockInterviewHistory = async (
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

    const [history, totalCount] = await Promise.all([
      MockInterview.find({ userId, status: 'completed' })
        .select('targetField status feedback startedAt completedAt questions')
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit),
      MockInterview.countDocuments({ userId, status: 'completed' }),
    ]);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
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
 * 5. GET /api/mock-interviews/:id
 * Fetches full details for 1 mock interview session.
 */
export const getMockInterviewById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id: interviewId } = req.params;

    const session = await MockInterview.findOne({ _id: interviewId, userId });
    if (!session) {
      res.status(404).json({ success: false, message: 'Mock interview session not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};
