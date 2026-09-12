import { Router } from 'express';
import {
  createCompany,
  getMyCompany,
  updateMyCompany,
  uploadCompanyBanner,
  getCompanyById,
} from '../controllers/company.controller';
import {
  canReviewCompany,
  createCompanyReview,
  deleteMyCompanyReview,
  getCompanyReviews,
  getMyCompanyReviews,
  hideCompanyReview,
  unhideCompanyReview,
  deleteCompanyReview,
} from '../controllers/companyReview.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadLogo, uploadBanner } from '../middlewares/upload.middleware';

const companyRouter = Router();

// Employer routes
companyRouter.post('/', requireAuth, requireRole(['employer']), uploadLogo, createCompany);
companyRouter.get('/me', requireAuth, requireRole(['employer']), getMyCompany);
companyRouter.get('/me/reviews', requireAuth, requireRole(['employer']), getMyCompanyReviews);
companyRouter.put('/me/reviews/:reviewId/hide', requireAuth, requireRole(['employer']), hideCompanyReview);
companyRouter.put('/me/reviews/:reviewId/unhide', requireAuth, requireRole(['employer']), unhideCompanyReview);
companyRouter.delete('/me/reviews/:reviewId', requireAuth, requireRole(['employer']), deleteCompanyReview);
companyRouter.get('/my-company', requireAuth, requireRole(['employer']), getMyCompany);
companyRouter.put('/me', requireAuth, requireRole(['employer']), uploadLogo, updateMyCompany);
companyRouter.put('/my-company', requireAuth, requireRole(['employer']), uploadLogo, updateMyCompany);
companyRouter.post('/banner', requireAuth, requireRole(['employer']), uploadBanner, uploadCompanyBanner);

// Review routes
companyRouter.delete('/:companyId/reviews/me', requireAuth, requireRole(['job_seeker']), deleteMyCompanyReview);
companyRouter.get('/:companyId/reviews/can-review', requireAuth, canReviewCompany);
companyRouter.post('/:companyId/reviews', requireAuth, requireRole(['job_seeker']), createCompanyReview);
companyRouter.get('/:companyId/reviews', getCompanyReviews);

// Public route
companyRouter.get('/:id', getCompanyById);

export default companyRouter;
