import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AdminPermissions } from '../models';

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Admin privilege is required to access this resource.',
    });
    return;
  }
  next();
};

export const requireAdminPermission = (permission: keyof AdminPermissions) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Admin privilege is required.',
      });
      return;
    }

    if (req.user.isSuperAdmin !== false) {
      next();
      return;
    }

    const permissions = req.user.adminPermissions;
    if (!permissions || permissions[permission] === false) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission (${permission}) to perform this action.`,
      });
      return;
    }

    next();
  };
};

export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin' || req.user.isSuperAdmin === false) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Super Admin privilege is required to manage administrative access.',
    });
    return;
  }
  next();
};
