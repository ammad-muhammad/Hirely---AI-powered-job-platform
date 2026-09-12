import { Request, Response } from 'express';
import { SupportTicket } from '../models';
import { logger } from '../utils/logger';

/**
 * Public handler for unauthenticated users (or logged in users) to submit a support ticket
 * POST /api/support/ticket
 */
export const createPublicSupportTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, subject, category, message } = req.body;
    const userId = (req as any).user?.id || req.body.userId || null;

    if (!email || !message) {
      res.status(400).json({
        success: false,
        message: 'Email and message content are required.',
      });
      return;
    }

    const ticket = await SupportTicket.create({
      userId,
      name: name ? name.trim() : null,
      email: email.trim().toLowerCase(),
      subject: subject ? subject.trim() : `Support Inquiry (${category || 'General'})`,
      category: category || 'other',
      message: message.trim(),
      status: 'open',
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully. Our team will review your inquiry shortly.',
      data: ticket,
    });
  } catch (error) {
    logger.error('Error creating public support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit support ticket. Please try again later.',
    });
  }
};
