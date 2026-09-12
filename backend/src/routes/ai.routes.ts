import { Router, Response, NextFunction } from 'express';
import { handleAnalyzeResume, handleGenerateCoverLetter } from '../controllers/ai.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadResume } from '../middlewares/upload.middleware';
import { AuthenticatedRequest } from '../types';

const aiRouter = Router();

// In-memory rate limiting map: userId -> { count, resetAt }
const userAiUsageMap = new Map<string, { count: number; resetAt: number }>();

const aiRateLimiter = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const userRecord = userAiUsageMap.get(userId);

  if (!userRecord || now > userRecord.resetAt) {
    userAiUsageMap.set(userId, { count: 1, resetAt: now + ONE_HOUR });
    return next();
  }

  if (userRecord.count >= 5) {
    const minutesLeft = Math.ceil((userRecord.resetAt - now) / (60 * 1000));
    res.status(429).json({
      success: false,
      message: `AI rate limit reached (max 5 requests per hour). Please try again in ${minutesLeft} minute(s).`,
    });
    return;
  }

  userRecord.count += 1;
  next();
};

aiRouter.post(
  '/analyze-resume',
  requireAuth,
  requireRole(['job_seeker']),
  uploadResume,
  aiRateLimiter,
  handleAnalyzeResume
);

aiRouter.post(
  '/generate-cover-letter',
  requireAuth,
  requireRole(['job_seeker']),
  uploadResume,
  aiRateLimiter,
  handleGenerateCoverLetter
);

export default aiRouter;
