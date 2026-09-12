import { Router } from 'express';
import {
  startMockInterview,
  answerMockQuestion,
  completeMockInterview,
  getMockInterviewHistory,
  getMockInterviewById,
  getInterviewPrepGuide,
} from '../controllers/mockInterview.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const mockInterviewRouter = Router();

// Require job_seeker role for mock interview API
mockInterviewRouter.use(requireAuth, requireRole(['job_seeker']));

mockInterviewRouter.get('/prep-guide', getInterviewPrepGuide);
mockInterviewRouter.post('/start', startMockInterview);
mockInterviewRouter.post('/:id/answer', answerMockQuestion);
mockInterviewRouter.post('/:id/complete', completeMockInterview);
mockInterviewRouter.get('/history', getMockInterviewHistory);
mockInterviewRouter.get('/:id', getMockInterviewById);

export default mockInterviewRouter;
