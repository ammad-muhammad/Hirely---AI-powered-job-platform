import { Router } from 'express';
import { getEmployerOverviewAnalytics } from '../controllers/analytics.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const analyticsRouter = Router();

analyticsRouter.get('/employer-overview', requireAuth, requireRole(['employer']), getEmployerOverviewAnalytics);

export default analyticsRouter;
