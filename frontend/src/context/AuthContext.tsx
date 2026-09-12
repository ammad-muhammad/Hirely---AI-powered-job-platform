'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, clearApiCache } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'job_seeker' | 'employer' | 'admin' | 'pending';
  phone?: string;
  avatarUrl?: string;
  location?: string;
  roleProfile?: {
    resumeUrl?: string;
    bio?: string;
    skills?: string[];
    experienceLevel?: string;
    [key: string]: unknown;
  } | null;
  jobSeekerProfile?: {
    resumeUrl?: string;
    bio?: string;
    skills?: string[];
  } | null;
  adminNotificationPrefs?: {
    newVerificationSubmitted?: boolean;
    verificationReviewed?: boolean;
    newUserRegistered?: boolean;
    securityAlerts?: boolean;
  };
  isSuperAdmin?: boolean;
  adminPermissions?: {
    canViewOverview?: boolean;
    canManageUsers?: boolean;
    canManageJobs?: boolean;
    canManageVerifications?: boolean;
    canManageBilling?: boolean;
    canManageFraudDetection?: boolean;
    canManageSettings?: boolean;
    canManageSupport?: boolean;
    canManageAdmins?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  role: 'job_seeker' | 'employer';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  requires2FA?: boolean;
  userId?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<LoginResponse>;
  adminLogin: (data: LoginData) => Promise<LoginResponse>;
  login2FAVerify: (userId: string, token: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (data: LoginData): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      if (response.data?.requires2FA) {
        return { requires2FA: true, userId: response.data.userId };
      }
      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
        return { user: response.data.data };
      }
      throw new Error(response.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (data: LoginData): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await api.post('/admin/login', data);
      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
        return { user: response.data.data };
      }
      throw new Error(response.data?.message || 'Admin authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const login2FAVerify = async (userId: string, token: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login-2fa-verify', { userId, token });
      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Two-factor authentication code verification failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/signup', data);
      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Account registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      clearApiCache();
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        adminLogin,
        login2FAVerify,
        signup,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
