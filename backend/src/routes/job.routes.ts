import { Router } from 'express';
import {
  createJob,
  getMyJobs,
  updateJob,
  publishJob,
  deleteJob,
  toggleJobStatus,
  getPublicJobs,
  getRecommendedJobs,
  getJobById,
  aiJobPostingAssistantController,
} from '../controllers/job.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { aiRateLimiter } from '../middlewares/rateLimit.middleware';

const jobRouter = Router();

// Employer routes (Must be defined BEFORE public /:id)
jobRouter.post('/ai-assist', requireAuth, requireRole(['employer']), aiRateLimiter, aiJobPostingAssistantController);
jobRouter.post('/', requireAuth, requireRole(['employer']), createJob);
jobRouter.get('/my-jobs', requireAuth, requireRole(['employer']), getMyJobs);
jobRouter.put('/:id/publish', requireAuth, requireRole(['employer']), publishJob);
jobRouter.put('/:id/status', requireAuth, requireRole(['employer']), toggleJobStatus);
jobRouter.put('/:id', requireAuth, requireRole(['employer']), updateJob);
jobRouter.delete('/:id', requireAuth, requireRole(['employer']), deleteJob);

// Job Seeker recommended jobs route (Must be defined BEFORE public /:id)
jobRouter.get('/recommended', requireAuth, requireRole(['job_seeker']), getRecommendedJobs);

// Public routes (with optional auth for isSaved calculation)
jobRouter.get('/', optionalAuth, getPublicJobs);
jobRouter.get('/:id', optionalAuth, getJobById);

export default jobRouter;
