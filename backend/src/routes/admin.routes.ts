import { Router } from 'express';
import {
  adminLogin,
  getPendingVerifications,
  getAllVerifications,
  getVerificationDetail,
  approveVerification,
  rejectVerification,
  revokeVerification,
  getAdminStats,
  getAdminHealthSummary,
  getAdminUsers,
  getUserDetail,
  updateUserStatus,
  deleteUserByAdmin,
  getAdminJobs,
  getJobDetailByAdmin,
  updateJobStatusByAdmin,
  deleteJobByAdmin,
  getAdminBillingStats,
  updateCompanySubscriptionByAdmin,
  updateFeaturedJobByAdmin,
  getPlatformConfig,
  updatePlatformConfig,
  updateAdminEmail,
  updateAdminPassword,
  updateAdminNotificationPrefs,
  getFraudDetectionReport,
  dismissFraudItem,
  triggerAutoApplyScanByAdmin,
  getAdminSidebarCounts,
  getGeographicAnalytics,
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  getSupportTickets,
  updateSupportTicket,
  replyToSupportTicket,
  adminResetPassword,
  adminReactivateUser,
  warnUserByAdmin,
  sendAdminUserMessage,
  getAdminUserMessages,
  getAdminConversations,
  uploadAdminAttachment,
  getUserAdminInbox,
  userReplyAdminMessage,
  getUserAdminUnreadCount,
} from '../controllers/admin.controller';
import { adminChatAssistant } from '../controllers/chatAssistant.controller';
import { assistantRateLimiter } from './chatAssistant.routes';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAdmin, requireAdminPermission, requireSuperAdmin } from '../middlewares/admin.middleware';
import { uploadAttachment } from '../middlewares/upload.middleware';

const adminRouter = Router();

// Unauthenticated Admin Authentication Routes
adminRouter.post('/login', adminLogin);
adminRouter.post('/auth/login', adminLogin);

// Regular User Admin Messages Inbox (Accessible by any authenticated user)
adminRouter.get('/user-inbox', requireAuth, getUserAdminInbox);
adminRouter.post('/user-inbox/reply', requireAuth, userReplyAdminMessage);
adminRouter.post('/user-inbox/upload-attachment', requireAuth, uploadAttachment, uploadAdminAttachment);
adminRouter.get('/user-inbox/unread-count', requireAuth, getUserAdminUnreadCount);

// Protect all remaining admin endpoints with server-side authentication & admin privilege middleware
adminRouter.use(requireAuth, requireAdmin);

// Dev / Admin Auto-Apply Background Scanner Trigger
adminRouter.post('/auto-apply/trigger-scan', requireSuperAdmin, triggerAutoApplyScanByAdmin);

// Overview Metrics & Rich Analytics
adminRouter.get('/stats', requireAdminPermission('canViewOverview'), getAdminStats);
adminRouter.get('/sidebar-counts', getAdminSidebarCounts);
adminRouter.get('/health-summary', requireAdminPermission('canViewOverview'), getAdminHealthSummary);
adminRouter.get('/analytics/geographic', requireAdminPermission('canViewOverview'), getGeographicAnalytics);

// Sub-Admin Management (Super Admin only)
adminRouter.get('/team', requireSuperAdmin, getSubAdmins);
adminRouter.post('/team', requireSuperAdmin, createSubAdmin);
adminRouter.put('/team/:id', requireSuperAdmin, updateSubAdmin);
adminRouter.delete('/team/:id', requireSuperAdmin, deleteSubAdmin);

// Support & Account Recovery System
adminRouter.get('/support', requireAdminPermission('canManageSupport'), getSupportTickets);
adminRouter.put('/support/:id', requireAdminPermission('canManageSupport'), updateSupportTicket);
adminRouter.patch('/support/:id', requireAdminPermission('canManageSupport'), updateSupportTicket);
adminRouter.post('/support/:id/reply', requireAdminPermission('canManageSupport'), replyToSupportTicket);
adminRouter.post('/users/:userId/reset-password', requireAdminPermission('canManageUsers'), adminResetPassword);
adminRouter.post('/users/send-password-reset', requireAdminPermission('canManageUsers'), adminResetPassword);
adminRouter.put('/users/:userId/reactivate', requireAdminPermission('canManageUsers'), adminReactivateUser);
adminRouter.patch('/users/:userId/reactivate', requireAdminPermission('canManageUsers'), adminReactivateUser);

// Fraud & Suspicious Activity Detection
adminRouter.get('/fraud-detection', requireAdminPermission('canManageFraudDetection'), getFraudDetectionReport);
adminRouter.put('/fraud-detection/dismiss', requireAdminPermission('canManageFraudDetection'), dismissFraudItem);

// AI Assistant Chatbot
adminRouter.post('/assistant/chat', requireAdminPermission('canViewOverview'), assistantRateLimiter, adminChatAssistant);

// Verifications Workflow
adminRouter.get('/verifications/pending', requireAdminPermission('canManageVerifications'), getPendingVerifications);
adminRouter.get('/verifications', requireAdminPermission('canManageVerifications'), getAllVerifications);
adminRouter.get('/verifications/:companyId', requireAdminPermission('canManageVerifications'), getVerificationDetail);
adminRouter.put('/verifications/:companyId/approve', requireAdminPermission('canManageVerifications'), approveVerification);
adminRouter.put('/verifications/:companyId/reject', requireAdminPermission('canManageVerifications'), rejectVerification);
adminRouter.put('/verifications/:companyId/revoke', requireAdminPermission('canManageVerifications'), revokeVerification);

// User Management
adminRouter.get('/users', requireAdminPermission('canManageUsers'), getAdminUsers);
adminRouter.get('/users/:userId', requireAdminPermission('canManageUsers'), getUserDetail);
adminRouter.put('/users/:userId/status', requireAdminPermission('canManageUsers'), updateUserStatus);
adminRouter.delete('/users/:userId', requireAdminPermission('canManageUsers'), deleteUserByAdmin);
adminRouter.post('/users/:userId/warn', requireAdminPermission('canManageUsers'), warnUserByAdmin);

// Admin-to-User Direct Messaging System
adminRouter.get('/conversations', requireAdminPermission('canManageUsers'), getAdminConversations);
adminRouter.post('/messages/upload-attachment', requireAdminPermission('canManageUsers'), uploadAttachment, uploadAdminAttachment);
adminRouter.post('/messages/:userId', requireAdminPermission('canManageUsers'), sendAdminUserMessage);
adminRouter.get('/messages/:userId', requireAdminPermission('canManageUsers'), getAdminUserMessages);



// Job Management
adminRouter.get('/jobs', requireAdminPermission('canManageJobs'), getAdminJobs);
adminRouter.get('/jobs/:jobId', requireAdminPermission('canManageJobs'), getJobDetailByAdmin);
adminRouter.put('/jobs/:jobId/status', requireAdminPermission('canManageJobs'), updateJobStatusByAdmin);
adminRouter.delete('/jobs/:jobId', requireAdminPermission('canManageJobs'), deleteJobByAdmin);

// Billing & Subscriptions / Featured Jobs Management
adminRouter.get('/billing', requireAdminPermission('canManageBilling'), getAdminBillingStats);
adminRouter.put('/billing/subscription', requireAdminPermission('canManageBilling'), updateCompanySubscriptionByAdmin);
adminRouter.put('/billing/featured-job', requireAdminPermission('canManageBilling'), updateFeaturedJobByAdmin);

// Admin Settings & Maintenance Config
adminRouter.get('/settings/platform', requireAdminPermission('canManageSettings'), getPlatformConfig);
adminRouter.put('/settings/platform', requireAdminPermission('canManageSettings'), updatePlatformConfig);
adminRouter.put('/settings/email', requireAdminPermission('canManageSettings'), updateAdminEmail);
adminRouter.put('/settings/password', requireAdminPermission('canManageSettings'), updateAdminPassword);
adminRouter.put('/settings/notification-prefs', requireAdminPermission('canManageSettings'), updateAdminNotificationPrefs);

export default adminRouter;
