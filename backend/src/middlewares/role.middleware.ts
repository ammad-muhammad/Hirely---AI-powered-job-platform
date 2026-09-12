import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export const requireRole = (allowedRoles: ('job_seeker' | 'employer' | 'admin')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!(allowedRoles as string[]).includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access forbidden. Action restricted to ${allowedRoles.join(', ')} role(s).`,
      });
      return;
    }

    next();
  };
};
