import { Router } from 'express';
import {
  getAllSkillTests,
  getSkillTestById,
  startSkillTest,
  saveAnswer,
  flagViolation,
  submitSkillTest,
  getMyAttempts,
  getMyVerifiedSkills,
} from '../controllers/skillTest.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const skillTestRouter = Router();

// Public / view routes (with optionalAuth for personalized recommendations)
skillTestRouter.get('/', optionalAuth, getAllSkillTests);
skillTestRouter.get('/attempts/my-attempts', requireAuth, requireRole(['job_seeker']), getMyAttempts);
skillTestRouter.get('/my-verified-skills', requireAuth, requireRole(['job_seeker']), getMyVerifiedSkills);

skillTestRouter.get('/:id', optionalAuth, getSkillTestById);

// Protected Job Seeker attempt routes
skillTestRouter.post('/:testId/start', requireAuth, requireRole(['job_seeker']), startSkillTest);
skillTestRouter.post('/attempts/:attemptId/answer', requireAuth, requireRole(['job_seeker']), saveAnswer);
skillTestRouter.post('/attempts/:attemptId/flag-violation', requireAuth, requireRole(['job_seeker']), flagViolation);
skillTestRouter.post('/attempts/:attemptId/submit', requireAuth, requireRole(['job_seeker']), submitSkillTest);

export default skillTestRouter;
