import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from './env';
import { verifyToken, JwtPayload } from '../utils/jwt.utils';
import { ChatThread, Message, User } from '../models';
import { logger } from '../utils/logger';

interface CustomSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

let ioInstance: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: CustomSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Guest / Public socket connection
        socket.data.user = undefined;
        return next();
      }

      const decoded = verifyToken(token);
      const userExists = await User.findById(decoded.id);

      if (!userExists) {
        socket.data.user = undefined;
        return next();
      }

      socket.data.user = decoded;
      next();
    } catch (err: unknown) {
      // Allow unauthenticated / guest socket connections for public broadcast events
      socket.data.user = undefined;
      next();
    }
  });

  // Connection Handler
  io.on('connection', (socket: CustomSocket) => {
    const user = socket.data.user;

    if (user) {
      logger.info(`⚡ [Socket.io] User connected: ${user.email} (${user.id})`);
      // Join personal room named by userId for direct notifications
      socket.join(user.id);
    } else {
      logger.info(`⚡ [Socket.io] Guest client connected: ${socket.id}`);
    }

    // Event 1: Join Chat Thread Room
    socket.on('join_thread', async ({ threadId }: { threadId: string }) => {
      try {
        if (!user) return;
        const thread = await ChatThread.findById(threadId);
        if (!thread) return;

        const isJobSeeker = thread.jobSeekerId.toString() === user.id;
        const isEmployer = thread.employerId.toString() === user.id;

        if (isJobSeeker || isEmployer) {
          socket.join(threadId);
          logger.info(`[Socket] ${user.email} joined thread room: ${threadId}`);
        }
      } catch (err) {
        logger.error('[Socket Join Error]:', err);
      }
    });

    // Event 2: Send Message
    socket.on(
      'send_message',
      async ({
        threadId,
        messageText,
        attachmentUrl,
      }: {
        threadId: string;
        messageText: string;
        attachmentUrl?: string;
      }) => {
        try {
          if (!user) return;
          if (!threadId || (!messageText && !attachmentUrl)) return;

          const thread = await ChatThread.findById(threadId);
          if (!thread) return;

          const isJobSeeker = thread.jobSeekerId.toString() === user.id;
          const isEmployer = thread.employerId.toString() === user.id;

          if (!isJobSeeker && !isEmployer) {
            logger.warn(`[Socket Security] User ${user.id} tried to send message to unauthorized thread ${threadId}`);
            return;
          }

          // Save message to MongoDB
          const message = await Message.create({
            threadId: thread._id,
            senderId: user.id,
            messageText,
            attachmentUrl: attachmentUrl || null,
            isSystemMessage: false,
            isRead: false,
          });

          // Update thread timestamp
          thread.updatedAt = new Date();
          await thread.save();

          // Populate sender info for frontend rendering
          const populatedMessage = await Message.findById(message._id).populate(
            'senderId',
            'fullName email avatarUrl role'
          );

          const jobSeekerIdStr = thread.jobSeekerId.toString();
          const employerIdStr = thread.employerId.toString();

          io.to(threadId)
            .to(jobSeekerIdStr)
            .to(employerIdStr)
            .emit('new_message', populatedMessage);

          const recipientId = isJobSeeker ? employerIdStr : jobSeekerIdStr;
          io.to(recipientId).emit('thread_notification', {
            threadId,
            senderName: user.email,
            messagePreview: messageText,
          });
        } catch (err) {
          logger.error('[Socket Send Error]:', err);
        }
      }
    );

    // Event 3: Typing Indicators (Respect showOnlineStatus preference)
    socket.on('typing', async ({ threadId }: { threadId: string }) => {
      if (!user) return;
      const dbUser = await User.findById(user.id);
      if (dbUser?.communicationPrefs?.showOnlineStatus === false) return;
      socket.to(threadId).emit('user_typing', { threadId, userId: user.id, isTyping: true });
    });

    socket.on('stop_typing', async ({ threadId }: { threadId: string }) => {
      if (!user) return;
      const dbUser = await User.findById(user.id);
      if (dbUser?.communicationPrefs?.showOnlineStatus === false) return;
      socket.to(threadId).emit('user_typing', { threadId, userId: user.id, isTyping: false });
    });

    // Event 4: Mark Thread Messages as Read (Respect showReadReceipts preference)
    socket.on('mark_read', async ({ threadId }: { threadId: string }) => {
      try {
        if (!user) return;
        const thread = await ChatThread.findById(threadId);
        if (!thread) return;

        const isJobSeeker = thread.jobSeekerId.toString() === user.id;
        const isEmployer = thread.employerId.toString() === user.id;

        if (!isJobSeeker && !isEmployer) return;

        const dbUser = await User.findById(user.id);

        await Message.updateMany(
          {
            threadId: thread._id,
            senderId: { $ne: user.id },
            isRead: false,
          },
          {
            $set: { isRead: true },
          }
        );

        if (dbUser?.communicationPrefs?.showReadReceipts !== false) {
          io.to(threadId).emit('messages_read', { threadId, readBy: user.id });
        }
      } catch (err) {
        logger.error('[Socket Mark Read Error]:', err);
      }
    });

    socket.on('disconnect', () => {
      if (user) {
        logger.info(`⚡ [Socket.io] User disconnected: ${user.email}`);
      } else {
        logger.info(`⚡ [Socket.io] Guest client disconnected: ${socket.id}`);
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => ioInstance;
