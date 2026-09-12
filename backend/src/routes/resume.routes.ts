import { Router } from 'express';
import { proxyViewResume, proxyDownloadResume } from '../controllers/resume.controller';

const router = Router();

router.get('/view', proxyViewResume);
router.get('/download', proxyDownloadResume);

export default router;
