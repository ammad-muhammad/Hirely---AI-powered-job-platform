import { Router, Response, NextFunction } from 'express';
import {
  jobSeekerChatAssistant,
  employerChatAssistant,
  adminChatAssistant,
} from '../controllers/chatAssistant.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { AuthenticatedRequest } from '../types';

const chatAssistantRouter = Router();

// In-memory AI rate limiting map (max 30 assistant queries per user per hour)
const assistantRateMap = new Map<string, { count: number; resetAt: number }>();

export const assistantRateLimiter = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const record = assistantRateMap.get(userId);

  if (!record || now > record.resetAt) {
    assistantRateMap.set(userId, { count: 1, resetAt: now + ONE_HOUR });
    return next();
  }

  if (record.count >= 30) {
    const minutesLeft = Math.ceil((record.resetAt - now) / (60 * 1000));
    res.status(429).json({
      success: false,
      message: `AI Assistant rate limit reached (max 30 queries per hour). Please try again in ${minutesLeft} minute(s).`,
    });
    return;
  }

  record.count += 1;
  next();
};

chatAssistantRouter.post(
  '/job-seeker/chat',
  requireAuth,
  requireRole(['job_seeker']),
  assistantRateLimiter,
  jobSeekerChatAssistant
);

chatAssistantRouter.post(
  '/employer/chat',
  requireAuth,
  requireRole(['employer']),
  assistantRateLimiter,
  employerChatAssistant
);

chatAssistantRouter.post(
  '/admin/chat',
  requireAuth,
  requireRole(['admin']),
  assistantRateLimiter,
  adminChatAssistant
);

export default chatAssistantRouter;
