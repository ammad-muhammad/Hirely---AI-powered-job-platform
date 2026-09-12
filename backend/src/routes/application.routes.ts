import { Router } from 'express';
import {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  getAllCandidates,
  updateApplicationStatus,
  withdrawApplication,
} from '../controllers/application.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadResume } from '../middlewares/upload.middleware';

const applicationRouter = Router();

// Job Seeker routes
applicationRouter.post('/', requireAuth, requireRole(['job_seeker']), uploadResume, applyToJob);
applicationRouter.get('/my-applications', requireAuth, requireRole(['job_seeker']), getMyApplications);
applicationRouter.delete('/:id', requireAuth, requireRole(['job_seeker']), withdrawApplication);

// Employer routes
applicationRouter.get('/all-candidates', requireAuth, requireRole(['employer']), getAllCandidates);
applicationRouter.get('/job/:id', requireAuth, requireRole(['employer']), getJobApplicants);
applicationRouter.put('/:id/status', requireAuth, requireRole(['employer']), updateApplicationStatus);

export default applicationRouter;
