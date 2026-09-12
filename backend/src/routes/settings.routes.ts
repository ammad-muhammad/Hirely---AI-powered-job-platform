import { Router } from 'express';
import {
  getSettings,
  updateEmail,
  updatePhone,
  setup2FA,
  verify2FA,
  disable2FA,
  updateCommunicationPrefs,
  deleteAccount,
} from '../controllers/settings.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const settingsRouter = Router();

settingsRouter.get('/', requireAuth, getSettings);
settingsRouter.put('/email', requireAuth, updateEmail);
settingsRouter.put('/phone', requireAuth, updatePhone);
settingsRouter.post('/2fa/setup', requireAuth, setup2FA);
settingsRouter.post('/2fa/verify', requireAuth, verify2FA);
settingsRouter.post('/2fa/disable', requireAuth, disable2FA);
settingsRouter.put('/communication-prefs', requireAuth, updateCommunicationPrefs);
settingsRouter.delete('/account', requireAuth, deleteAccount);

export default settingsRouter;
