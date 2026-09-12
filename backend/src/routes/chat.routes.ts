import { Router } from 'express';
import {
  getUserThreads,
  getTotalUnreadCount,
  getThreadMessages,
  postChatMessage,
  uploadChatAttachment,
  getAIChatSuggestions,
  generateAIChatReply,
} from '../controllers/chat.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadAttachment } from '../middlewares/upload.middleware';

const chatRouter = Router();

chatRouter.get('/', requireAuth, getUserThreads);
chatRouter.get('/unread-count', requireAuth, getTotalUnreadCount);
chatRouter.get('/:threadId/messages', requireAuth, getThreadMessages);
chatRouter.get('/:threadId/ai-suggestions', requireAuth, getAIChatSuggestions);
chatRouter.post('/:threadId/ai-generate', requireAuth, generateAIChatReply);
chatRouter.post('/:threadId/messages', requireAuth, postChatMessage);
chatRouter.post('/:threadId/upload-attachment', requireAuth, uploadAttachment, uploadChatAttachment);

export default chatRouter;
