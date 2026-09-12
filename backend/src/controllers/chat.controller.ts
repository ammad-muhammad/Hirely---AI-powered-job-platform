import { Response, NextFunction } from 'express';
import { ChatThread, Message, Application, Job, User, Company } from '../models';
import { AuthenticatedRequest } from '../types';
import { uploadBufferToCloudinary } from '../utils/cloudinary.utils';
import { getIO } from '../config/socket';
import { createNotification } from '../services/notification.service';

export const getUserThreads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 20);
    const skip = (page - 1) * limit;

    const threadQuery = {
      $or: [{ jobSeekerId: userId }, { employerId: userId }],
    };

    const [threads, totalCount] = await Promise.all([
      ChatThread.find(threadQuery)
        .populate([
          { path: 'jobSeekerId', select: 'fullName email avatarUrl role' },
          { path: 'employerId', select: 'fullName email avatarUrl role' },
          {
            path: 'applicationId',
            select: 'jobId',
            populate: {
              path: 'jobId',
              select: 'title companyId',
              populate: { path: 'companyId', select: 'companyName logoUrl' },
            },
          },
        ])
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatThread.countDocuments(threadQuery),
    ]);

    const formattedThreads = await Promise.all(
      threads.map(async (t: any) => {
        const jsId = t.jobSeekerId?._id ? t.jobSeekerId._id.toString() : (t.jobSeekerId ? String(t.jobSeekerId) : '');
        const empId = t.employerId?._id ? t.employerId._id.toString() : (t.employerId ? String(t.employerId) : '');

        const isJobSeeker = jsId === userId?.toString();
        const otherUser = isJobSeeker ? t.employerId : t.jobSeekerId;

        // Fetch last message
        const lastMessage = await Message.findOne({ threadId: t._id }).sort({ createdAt: -1 });

        // Count unread messages for current user
        const unreadCount = await Message.countDocuments({
          threadId: t._id,
          senderId: { $ne: userId },
          isRead: false,
        });

        const appObj = t.applicationId as any;
        const jobObj = appObj?.jobId;
        const compObj = jobObj?.companyId;

        let companyName = compObj?.companyName || null;
        let companyLogoUrl = compObj?.logoUrl || null;

        if (!companyName && empId) {
          const comp = await Company.findOne({ ownerId: empId }).select('companyName logoUrl');
          if (comp) {
            companyName = comp.companyName;
            companyLogoUrl = comp.logoUrl;
          }
        }

        return {
          _id: t._id,
          company: {
            name: companyName || otherUser?.fullName || 'Company',
            logoUrl: companyLogoUrl || null,
          },
          otherParticipant: {
            id: otherUser?._id ? otherUser._id.toString() : (otherUser ? String(otherUser) : null),
            fullName: isJobSeeker ? (companyName || otherUser?.fullName || 'Company') : (otherUser?.fullName || 'User'),
            email: otherUser?.email || '',
            avatarUrl: isJobSeeker ? (companyLogoUrl || otherUser?.avatarUrl || null) : (otherUser?.avatarUrl || null),
            isCompany: isJobSeeker,
            companyName: companyName || null,
            companyLogoUrl: companyLogoUrl || null,
          },
          jobTitle: jobObj?.title || 'Job Application',
          lastMessage: lastMessage
            ? {
                text: lastMessage.messageText,
                attachmentUrl: lastMessage.attachmentUrl,
                createdAt: lastMessage.createdAt,
                isSystemMessage: lastMessage.isSystemMessage,
              }
            : null,
          unreadCount,
          updatedAt: t.updatedAt,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.status(200).json({
      success: true,
      data: formattedThreads,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTotalUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Find all thread IDs where user is a participant
    const threads = await ChatThread.find({
      $or: [{ jobSeekerId: userId }, { employerId: userId }],
    }).select('_id');

    const threadIds = threads.map((t) => t._id);

    const unreadCount = await Message.countDocuments({
      threadId: { $in: threadIds },
      senderId: { $ne: userId },
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

export const getThreadMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { threadId } = req.params;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      res.status(404).json({ success: false, message: 'Chat thread not found.' });
      return;
    }

    const isJobSeeker = thread.jobSeekerId.toString() === userId;
    const isEmployer = thread.employerId.toString() === userId;

    if (!isJobSeeker && !isEmployer) {
      res.status(403).json({ success: false, message: 'Access forbidden. You are not a participant in this conversation.' });
      return;
    }

    // Mark messages read for current user
    await Message.updateMany(
      { threadId: thread._id, senderId: { $ne: userId }, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({ threadId: thread._id })
      .populate('senderId', 'fullName email avatarUrl role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadChatAttachment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { threadId } = req.params;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      res.status(404).json({ success: false, message: 'Chat thread not found.' });
      return;
    }

    const isJobSeeker = thread.jobSeekerId.toString() === userId;
    const isEmployer = thread.employerId.toString() === userId;

    if (!isJobSeeker && !isEmployer) {
      res.status(403).json({ success: false, message: 'Access forbidden.' });
      return;
    }

    const file = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : undefined);

    if (!file) {
      res.status(400).json({ success: false, message: 'No attachment file uploaded.' });
      return;
    }

    const isImage = file.mimetype.startsWith('image/');
    const folder = isImage ? 'hirely/avatars' : 'hirely/resumes';
    const attachmentUrl = await uploadBufferToCloudinary(file.buffer, folder, file.originalname);

    res.status(200).json({
      success: true,
      attachmentUrl,
      data: {
        attachmentUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const postChatMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { threadId } = req.params;
    const { messageText, attachmentUrl } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!messageText && !attachmentUrl) {
      res.status(400).json({ success: false, message: 'Message text or attachment is required.' });
      return;
    }

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      res.status(404).json({ success: false, message: 'Chat thread not found.' });
      return;
    }

    const isJobSeeker = thread.jobSeekerId.toString() === userId;
    const isEmployer = thread.employerId.toString() === userId;

    if (!isJobSeeker && !isEmployer) {
      res.status(403).json({ success: false, message: 'Access forbidden. You are not a participant in this conversation.' });
      return;
    }

    const message = await Message.create({
      threadId: thread._id,
      senderId: userId,
      messageText: messageText ? String(messageText).trim() : '',
      attachmentUrl: attachmentUrl || null,
      isSystemMessage: false,
      isRead: false,
    });

    thread.updatedAt = new Date();
    await thread.save();

    const populatedMessage = await Message.findById(message._id).populate(
      'senderId',
      'fullName email avatarUrl role'
    );

    // Send persisted notification to recipient
    const recipientId = isEmployer ? thread.jobSeekerId.toString() : thread.employerId.toString();
    const senderName = req.user?.fullName || 'Someone';
    await createNotification(
      recipientId,
      'new_message',
      `New Message from ${senderName}`,
      messageText ? (messageText.length > 60 ? `${messageText.slice(0, 60)}...` : messageText) : 'Sent an attachment',
      'chat_thread',
      thread._id.toString()
    );

    // Socket broadcast to room & user channels
    const io = getIO();
    if (io) {
      const jobSeekerIdStr = thread.jobSeekerId.toString();
      const employerIdStr = thread.employerId.toString();

      io.to(threadId)
        .to(jobSeekerIdStr)
        .to(employerIdStr)
        .emit('new_message', populatedMessage);

      const recipientId = isJobSeeker ? employerIdStr : jobSeekerIdStr;
      io.to(recipientId).emit('thread_notification', {
        threadId,
        senderName: req.user?.email || 'User',
        messagePreview: messageText,
      });
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/:threadId/ai-suggestions
 * Generates 3 smart quick reply suggestions based on thread context.
 */
export const getAIChatSuggestions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { threadId } = req.params;

    const thread = await ChatThread.findById(threadId).populate<{
      jobSeekerId: { _id: string; fullName: string };
      employerId: { _id: string; fullName: string };
      applicationId?: { jobId?: { title?: string } };
    }>([
      { path: 'jobSeekerId', select: 'fullName role' },
      { path: 'employerId', select: 'fullName role' },
      {
        path: 'applicationId',
        select: 'jobId',
        populate: { path: 'jobId', select: 'title' },
      },
    ]);

    if (!thread) {
      res.status(404).json({ success: false, message: 'Chat thread not found.' });
      return;
    }

    const jsId = thread.jobSeekerId?._id ? thread.jobSeekerId._id.toString() : (thread.jobSeekerId ? String(thread.jobSeekerId) : '');
    const empId = thread.employerId?._id ? thread.employerId._id.toString() : (thread.employerId ? String(thread.employerId) : '');

    const isJobSeeker = jsId === userId?.toString();
    const isEmployer = empId === userId?.toString();

    if (!isJobSeeker && !isEmployer) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const userRole = isJobSeeker ? 'job_seeker' : 'employer';
    const otherParticipant = isJobSeeker ? thread.employerId : thread.jobSeekerId;
    const jobTitle = (thread.applicationId as any)?.jobId?.title || 'Position';

    // Fetch last 6 messages
    const messages = await Message.find({ threadId }).sort({ createdAt: -1 }).limit(6);
    const history = messages.reverse().map((m) => ({
      senderRole: m.senderId?.toString() === jsId ? 'job_seeker' : 'employer',
      content: m.messageText || '',
    }));

    const { generateChatSuggestions } = await import('../services/ai.service');
    const suggestions = await generateChatSuggestions(
      history,
      userRole,
      jobTitle,
      (otherParticipant as any)?.fullName || 'Participant'
    );

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/:threadId/ai-generate
 * Enhances rough draft notes into a polished professional chat message.
 */
export const generateAIChatReply = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { threadId } = req.params;
    const { draftNotes } = req.body;

    const thread = await ChatThread.findById(threadId).populate<{
      jobSeekerId: { _id: string; fullName: string };
      employerId: { _id: string; fullName: string };
      applicationId?: { jobId?: { title?: string } };
    }>([
      { path: 'jobSeekerId', select: 'fullName role' },
      { path: 'employerId', select: 'fullName role' },
      {
        path: 'applicationId',
        select: 'jobId',
        populate: { path: 'jobId', select: 'title' },
      },
    ]);

    if (!thread) {
      res.status(404).json({ success: false, message: 'Chat thread not found.' });
      return;
    }

    const jsId = thread.jobSeekerId?._id ? thread.jobSeekerId._id.toString() : (thread.jobSeekerId ? String(thread.jobSeekerId) : '');
    const empId = thread.employerId?._id ? thread.employerId._id.toString() : (thread.employerId ? String(thread.employerId) : '');

    const isJobSeeker = jsId === userId?.toString();
    const isEmployer = empId === userId?.toString();

    if (!isJobSeeker && !isEmployer) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const userRole = isJobSeeker ? 'job_seeker' : 'employer';
    const otherParticipant = isJobSeeker ? thread.employerId : thread.jobSeekerId;
    const jobTitle = (thread.applicationId as any)?.jobId?.title || 'Position';

    // Fetch last 4 messages
    const messages = await Message.find({ threadId }).sort({ createdAt: -1 }).limit(4);
    const history = messages.reverse().map((m) => ({
      senderRole: m.senderId?.toString() === jsId ? 'job_seeker' : 'employer',
      content: m.messageText || '',
    }));

    const { enhanceChatMessage } = await import('../services/ai.service');
    const enhancedMessage = await enhanceChatMessage(
      draftNotes || '',
      history,
      userRole,
      jobTitle,
      otherParticipant?.fullName || 'Participant'
    );

    res.status(200).json({
      success: true,
      data: { enhancedMessage },
    });
  } catch (error) {
    next(error);
  }
};

