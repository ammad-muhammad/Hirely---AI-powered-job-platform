import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  getAutoApplySettings,
  updateAutoApplySettings,
  getAutoApplyDrafts,
  approveAutoApplyDraft,
  rejectAutoApplyDraft,
  triggerAutoApplySync,
} from '../controllers/autoApply.controller';

const router = Router();

router.use(requireAuth);

router.get('/settings', getAutoApplySettings);
router.put('/settings', updateAutoApplySettings);
router.get('/drafts', getAutoApplyDrafts);
router.post('/drafts/:id/approve', approveAutoApplyDraft);
router.post('/drafts/:id/reject', rejectAutoApplyDraft);
router.post('/scan', triggerAutoApplySync);

export default router;
