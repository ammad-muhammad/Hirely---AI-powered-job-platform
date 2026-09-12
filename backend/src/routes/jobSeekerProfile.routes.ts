import { Router } from 'express';
import {
  getMyProfile,
  getJobSeekerProfileById,
  updateMyProfile,
  uploadResume as handleUploadResume,
  uploadAvatar as handleUploadAvatar,
  deleteResume,
} from '../controllers/jobSeekerProfile.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadResume, uploadAvatar } from '../middlewares/upload.middleware';

const jobSeekerProfileRouter = Router();

// Job Seeker personal profile routes (MUST BE REGISTERED BEFORE /:userId)
jobSeekerProfileRouter.get('/me', requireAuth, requireRole(['job_seeker']), getMyProfile);
jobSeekerProfileRouter.put('/me', requireAuth, requireRole(['job_seeker']), updateMyProfile);
jobSeekerProfileRouter.post('/resume', requireAuth, requireRole(['job_seeker']), uploadResume, handleUploadResume);
jobSeekerProfileRouter.delete('/resume', requireAuth, requireRole(['job_seeker']), deleteResume);
jobSeekerProfileRouter.post('/avatar', requireAuth, requireRole(['job_seeker']), uploadAvatar, handleUploadAvatar);

// Employer route: view candidate job seeker profile by userId
jobSeekerProfileRouter.get(
  '/:userId',
  requireAuth,
  requireRole(['employer', 'admin']),
  getJobSeekerProfileById
);

export default jobSeekerProfileRouter;
