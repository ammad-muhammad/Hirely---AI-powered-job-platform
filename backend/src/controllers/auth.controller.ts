import { Request, Response, NextFunction } from 'express';
import { signupService, loginService, getMeService } from '../services/auth.service';
import { sendTokenCookie, clearTokenCookie, generateToken } from '../utils/jwt.utils';
import { AuthenticatedRequest } from '../types';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, fullName, role } = req.body;

    logger.info(`[Signup Request]: Attempting registration for email="${email?.trim()?.toLowerCase()}", role="${role}"`);

    if (!email || !password || !fullName || !role) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, fullName, and role.',
      });
      return;
    }

    if (role === 'admin') {
      res.status(400).json({
        success: false,
        message: 'Administrator accounts cannot be registered via public registration.',
      });
      return;
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '';

    const { user, token } = await signupService({ email, password, fullName, role, ipAddress });

    // Set httpOnly JWT cookie
    sendTokenCookie(res, token);

    logger.info(`[Signup Success]: Account created for user="${user.id}" (${user.email})`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: user,
    });
  } catch (error: any) {
    logger.error(`[Signup Controller Exception]: ${error?.message || error}`, { stack: error?.stack });
    next(error);
  }
};

import speakeasy from 'speakeasy';
import { User } from '../models';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
      return;
    }

    if (user.role === 'admin') {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        isSuspended: true,
        suspensionReason: user.suspensionReason || 'Your account has been suspended by an administrator for policy violations.',
        message: `Your account has been suspended. Reason: ${user.suspensionReason || 'Administrator policy violation.'}`,
      });
      return;
    }

    const { loginService } = await import('../services/auth.service');
    const { user: userObj, token } = await loginService({ email, password });

    // Check if user has Two-Factor Authentication enabled
    if (user.twoFactorEnabled) {
      res.status(200).json({
        success: true,
        requires2FA: true,
        userId: user._id.toString(),
        message: 'Two-factor authentication code required.',
      });
      return;
    }

    // Set httpOnly JWT cookie
    sendTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: userObj,
    });
  } catch (error) {
    next(error);
  }
};

export const verify2FALogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      res.status(400).json({
        success: false,
        message: 'UserId and 6-digit authentication token are required.',
      });
      return;
    }

    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({
        success: false,
        message: 'Invalid 2FA login session or 2FA is not enabled on this account.',
      });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });

    if (!verified) {
      res.status(400).json({
        success: false,
        message: 'Invalid authenticator code. Please check your authenticator app and try again.',
      });
      return;
    }

    const jwtToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    sendTokenCookie(res, jwtToken);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully via 2FA',
      data: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        location: user.location,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (_req: Request, res: Response): void => {
  clearTokenCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const userProfile = await getMeService(req.user.id);

    res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const getSocketToken = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  // Get existing cookie token or issue fresh token for Socket handshake
  const token =
    req.cookies?.token ||
    generateToken({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

  res.status(200).json({
    success: true,
    token,
  });
};

import passport from 'passport';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { JobSeekerProfile, Company, IUser } from '../models';

export const initiateGoogleAuth = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
  })(req, res, next);
};

export const handleGoogleCallback = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('google', { session: false }, async (err: Error | null, user: any) => {
    const frontendUrl = (config.frontendUrl || 'http://localhost:3000').trim().replace(/\/+$/, '');

    if (err || !user) {
      logger.error(`[Google OAuth Callback Error]: ${err ? err.message : 'No user returned from Google'}`);
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    try {
      const userId = user.id || user._id?.toString();
      if (!userId) {
        logger.error('[Google OAuth Callback Error]: User ID is undefined');
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }

      if (user.isSuspended) {
        return res.redirect(
          `${frontendUrl}/login?error=account_suspended&reason=${encodeURIComponent(
            user.suspensionReason || 'Administrator policy violation'
          )}`
        );
      }

      // Case 1: Brand new user without a role selected yet
      if (user.role === 'pending') {
        const tempToken = generateToken({
          id: userId,
          email: user.email,
          role: 'pending',
        });

        sendTokenCookie(res, tempToken);
        return res.redirect(`${frontendUrl}/complete-signup`);
      }

      // Case 2: Existing user with role already set
      const token = generateToken({
        id: userId,
        email: user.email,
        role: user.role,
      });

      sendTokenCookie(res, token);

      if (user.role === 'admin') {
        return res.redirect(`${frontendUrl}/admin/dashboard`);
      }
      return res.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      next(error);
    }
  })(req, res, next);
};

export const completeGoogleSignup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { role } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication session expired. Please sign in with Google again.',
      });
      return;
    }

    if (!role || !['job_seeker', 'employer'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role selection. Please choose either "job_seeker" or "employer".',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    // Set role
    user.role = role as 'job_seeker' | 'employer';
    await user.save();

    // Create initial role-specific profile document
    if (role === 'job_seeker') {
      const existingProfile = await JobSeekerProfile.findOne({ userId: user._id });
      if (!existingProfile) {
        await JobSeekerProfile.create({ userId: user._id });
      }
    } else if (role === 'employer') {
      const existingCompany = await Company.findOne({ ownerId: user._id });
      if (!existingCompany) {
        await Company.create({
          ownerId: user._id,
          companyName: `${user.fullName}'s Company`,
          industry: 'General',
          companySize: '1-10',
          location: user.location || 'Remote',
        });
      }
    }

    // Notify admins of new user signup via Google
    try {
      const { notifyAdmins } = await import('../services/notification.service');
      await notifyAdmins(
        'system',
        'New User Registration',
        `${user.fullName} (${user.email}) registered via Google as a new ${role}.`,
        'user',
        user._id.toString()
      );
    } catch {}

    // Issue full JWT token
    const fullToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    sendTokenCookie(res, fullToken);

    res.status(200).json({
      success: true,
      message: 'Registration completed successfully.',
      data: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
