import { Router } from 'express';
import { createPublicSupportTicket } from '../controllers/support.controller';
import { authRateLimiter } from '../middlewares/rateLimiter';

const supportRouter = Router();

// Public route for submitting support/help/account recovery requests
supportRouter.post('/ticket', authRateLimiter, createPublicSupportTicket);

export default supportRouter;
