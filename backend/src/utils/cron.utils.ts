import cron from 'node-cron';
import { Job } from '../models';
import { logger } from './logger';
import {
  runAutoApplyForAllUsers,
  cleanupExpiredAutoApplyDrafts,
} from '../services/autoApply.service';

export const checkExpiredJobs = async (): Promise<number> => {
  try {
    const now = new Date();
    const result = await Job.updateMany(
      {
        status: 'active',
        applicationDeadline: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`⏰ Cron: Automatically expired ${result.modifiedCount} job(s) past deadline.`);
    }

    return result.modifiedCount;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown cron error';
    logger.error(`[Cron Error] Failed to expire past deadline jobs: ${message}`);
    return 0;
  }
};

// Initialize scheduled cron jobs
export const initScheduledCronJobs = () => {
  // Run startup checks asynchronously
  checkExpiredJobs();
  cleanupExpiredAutoApplyDrafts();

  // Schedule job expiration check to run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    logger.info('⏰ [Cron Triggered] Running hourly job expiration check...');
    checkExpiredJobs();
  });

  // Schedule auto-apply draft expiration cleanup to run every 2 hours
  cron.schedule('0 */2 * * *', () => {
    logger.info('⏰ [Cron Triggered] Running auto-apply 48h draft expiration cleanup...');
    cleanupExpiredAutoApplyDrafts();
  });

  // Schedule auto-apply background matching scanner to run every 4 hours
  cron.schedule('0 */4 * * *', () => {
    logger.info('🤖 [Cron Triggered] Running scheduled background Auto-Apply scan for all enabled job seekers...');
    runAutoApplyForAllUsers();
  });

  logger.info('⏰ Scheduled Cron Tasks Initialized:');
  logger.info('   • Job Expiration Check: Hourly (0 * * * *)');
  logger.info('   • Auto-Apply Expiry Cleanup: Every 2 Hours (0 */2 * * *)');
  logger.info('   • Auto-Apply Candidate Scanner: Every 4 Hours (0 */4 * * *)');
};

// Backward compatibility alias
export const initJobExpirationCron = initScheduledCronJobs;
