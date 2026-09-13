import bcrypt from 'bcryptjs';
import { User, JobSeekerProfile, Company, IUser } from '../models';
import { generateToken, JwtPayload } from '../utils/jwt.utils';
import { AppError } from '../utils/errors';

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  role: 'job_seeker' | 'employer' | 'admin';
  ipAddress?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone?: string;
    avatarUrl?: string;
    location?: string;
    ipAddress?: string;
  };
  token: string;
}

export const signupService = async (input: SignupInput): Promise<AuthResponse> => {
  const { PlatformConfig } = await import('../models/PlatformConfig');
  const config = await PlatformConfig.findOne();
  if (config && config.signupsEnabled === false) {
    throw new AppError('New user registrations are temporarily disabled for platform maintenance.', 403);
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email address is already registered. Please sign in or use a different email.', 409);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(input.password, salt);

  let derivedCountry = null;
  try {
    const { deriveCountryFromIPOrLocation } = await import('../utils/geolocation.utils');
    derivedCountry = deriveCountryFromIPOrLocation(input.ipAddress);
  } catch {}

  // Create User
  const user: IUser = await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    fullName: input.fullName.trim(),
    role: input.role,
    ipAddress: input.ipAddress || null,
    country: derivedCountry,
  });

  // Create initial role-specific document
  try {
    if (input.role === 'job_seeker') {
      await JobSeekerProfile.create({ userId: user._id });
    } else if (input.role === 'employer') {
      await Company.create({
        ownerId: user._id,
        companyName: `${user.fullName}'s Company`,
        industry: 'General',
        companySize: '1-10',
        location: user.location || 'Remote',
      });
    }
  } catch (profileErr: any) {
    // Non-fatal error during profile creation fallback
    console.warn('[Signup Profile Setup Warning]:', profileErr?.message || profileErr);
  }

  // Notify admins of new user signup
  try {
    const { notifyAdmins } = await import('./notification.service');
    await notifyAdmins(
      'system',
      'New User Registration',
      `${user.fullName} (${user.email}) registered as a new ${user.role}.`,
      'user',
      user._id.toString()
    );
  } catch {}

  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      location: user.location,
    },
    token,
  };
};

export const loginService = async (input: LoginInput): Promise<AuthResponse> => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !user.password) {
    throw new AppError('Invalid email or password. Please check your credentials.', 401);
  }

  const isPasswordMatch = await bcrypt.compare(input.password, user.password);
  if (!isPasswordMatch) {
    throw new AppError('Invalid email or password. Please check your credentials.', 401);
  }

  // Reject admin accounts from logging in via standard user login
  if (user.role === 'admin') {
    throw new AppError('Invalid email or password. Please check your credentials.', 401);
  }

  if (user.isSuspended) {
    throw new AppError('Your account has been suspended by an administrator. Please contact support.', 403);
  }

  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      location: user.location,
    },
    token,
  };
};

export const getMeService = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User account not found.', 404);
  }

  let roleProfile = null;
  if (user.role === 'job_seeker') {
    roleProfile = await JobSeekerProfile.findOne({ userId: user._id });
  } else if (user.role === 'employer') {
    roleProfile = await Company.findOne({ ownerId: user._id });
  }

  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    location: user.location,
    isSuperAdmin: (user as any).isSuperAdmin !== false,
    adminPermissions: (user as any).adminPermissions || {},
    roleProfile,
  };
};
