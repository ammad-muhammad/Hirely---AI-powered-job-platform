import { Request } from 'express';

export interface UserProfile {
  id: string;
  _id?: string;
  email: string;
  role: 'job_seeker' | 'employer' | 'admin' | 'pending';
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  isSuperAdmin?: boolean;
  adminPermissions?: Record<string, boolean>;
}

declare global {
  namespace Express {
    interface User extends UserProfile {}
  }
}

export interface CustomError extends Error {
  statusCode?: number;
  errors?: unknown[];
}

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
}
