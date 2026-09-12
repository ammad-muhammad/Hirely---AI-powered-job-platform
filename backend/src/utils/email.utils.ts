import nodemailer from 'nodemailer';
import { logger } from './logger';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  skipped: boolean;
  reason?: string;
  messageId?: string;
}

/**
 * Utility function to send transactional emails via Nodemailer.
 * If SMTP environment variables are not configured, gracefully skips execution.
 */
export const sendSupportEmail = async (options: SendEmailOptions): Promise<SendEmailResult> => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || '"Hirely Support" <support@hirely.com>';

  // Check if SMTP is configured
  if (!host || !user || !pass) {
    logger.info(`[Email Service] SMTP configuration missing (EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD). Skipping email send to: ${options.to}`);
    return {
      success: false,
      skipped: true,
      reason: 'SMTP configuration missing in environment variables. Email notification skipped.',
    };
  }

  try {
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
      html: options.html,
    });

    logger.info(`[Email Service] Support reply email sent successfully to ${options.to} (Message ID: ${info.messageId})`);

    return {
      success: true,
      skipped: false,
      messageId: info.messageId,
    };
  } catch (error: any) {
    logger.error(`[Email Service] Failed to send support email to ${options.to}:`, error);
    return {
      success: false,
      skipped: false,
      reason: error.message || 'SMTP transport error occurred',
    };
  }
};
