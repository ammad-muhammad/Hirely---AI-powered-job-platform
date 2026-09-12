import { Router } from 'express';
import { submitVerification, getVerificationStatus } from '../controllers/verification.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadVerificationDocs } from '../middlewares/upload.middleware';

const verificationRouter = Router();

verificationRouter.post(
  '/submit',
  requireAuth,
  requireRole(['employer']),
  uploadVerificationDocs,
  submitVerification
);

verificationRouter.get(
  '/status',
  requireAuth,
  requireRole(['employer']),
  getVerificationStatus
);

export default verificationRouter;
