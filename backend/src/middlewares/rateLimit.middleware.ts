import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

// In-memory rate limiting map: userId -> { count, resetAt }
const userAiUsageMap = new Map<string, { count: number; resetAt: number }>();

export const aiRateLimiter = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

  if (userRecord.count >= 15) {
    const minutesLeft = Math.ceil((userRecord.resetAt - now) / (60 * 1000));
    res.status(429).json({
      success: false,
      message: `AI rate limit reached (max 15 requests per hour). Please try again in ${minutesLeft} minute(s).`,
    });
    return;
  }

  userRecord.count += 1;
  next();
};
