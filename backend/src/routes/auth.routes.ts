import { Router } from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  getSocketToken,
  verify2FALogin,
  initiateGoogleAuth,
  handleGoogleCallback,
  completeGoogleSignup,
} from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter';

const authRouter = Router();

authRouter.post('/signup', authRateLimiter, signup);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/login-2fa-verify', authRateLimiter, verify2FALogin);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, getMe);
authRouter.get('/socket-token', requireAuth, getSocketToken);

// Google OAuth Routes
authRouter.get('/google', initiateGoogleAuth);
authRouter.get('/google/callback', handleGoogleCallback);
authRouter.post('/google/complete-signup', requireAuth, completeGoogleSignup);

export default authRouter;
