import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { User } from '../models';
import { AuthenticatedRequest, UserProfile } from '../types';
import { logger } from '../utils/logger';

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.token;

    // Fallback to Bearer token header if cookie is absent
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No session token provided.',
      });
      return;
    }

    // Verify JWT payload
    const decoded = verifyToken(token);

    // Verify User exists in MongoDB database
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
      return;
    }

    const userProfile: UserProfile = {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      location: user.location,
      isSuperAdmin: (user as any).isSuperAdmin !== false,
      adminPermissions: (user as any).adminPermissions || {},
    };

    req.user = userProfile;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid or expired JWT token';
    logger.warn(`[AuthMiddleware Warning]: ${message}`);
    res.status(401).json({
      success: false,
      message: 'Authentication token is invalid or expired. Please sign in again.',
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.token;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = {
          id: user._id.toString(),
          _id: user._id.toString(),
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          location: user.location,
          isSuperAdmin: (user as any).isSuperAdmin !== false,
          adminPermissions: (user as any).adminPermissions || {},
        };
      }
    }
  } catch {
    // Ignore invalid/expired tokens in optionalAuth
  } finally {
    next();
  }
};
