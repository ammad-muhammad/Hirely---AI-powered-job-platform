export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: 'candidate' | 'recruiter' | 'admin';
  createdAt?: string;
}

export interface JobPosting {
  id: string;
  title: string;
  companyName: string;
  location: string;
  salaryRange?: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'remote';
  description: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
