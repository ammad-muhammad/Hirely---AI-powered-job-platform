import { Router } from 'express';
import {
  toggleSaveJob,
  getSavedJobs,
  deleteSavedJob,
} from '../controllers/savedJob.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const savedJobRouter = Router();

savedJobRouter.use(requireAuth, requireRole(['job_seeker']));

savedJobRouter.get('/', getSavedJobs);
savedJobRouter.post('/:jobId/toggle', toggleSaveJob);
savedJobRouter.delete('/:jobId', deleteSavedJob);

export default savedJobRouter;
