import { Types } from 'mongoose';
import { Notification, NotificationType, RelatedEntityType, INotification } from '../models/Notification';
import { User } from '../models/User';
import { getIO } from '../config/socket';
import { logger } from '../utils/logger';

export const createNotification = async (
  userId: string | Types.ObjectId,
  type: NotificationType,
  title: string,
  message: string,
  relatedEntityType?: RelatedEntityType,
  relatedEntityId?: string
): Promise<INotification> => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || null,
      isRead: false,
    });

    const io = getIO();
    if (io) {
      io.to(userId.toString()).emit('new_notification', notification);
    }

    return notification;
  } catch (error: any) {
    logger.error(`[createNotification Error]: ${error.message}`);
    throw error;
  }
};

export const notifyAdmins = async (
  type: NotificationType,
  title: string,
  message: string,
  relatedEntityType?: RelatedEntityType,
  relatedEntityId?: string
): Promise<void> => {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    for (const admin of adminUsers) {
      await createNotification(admin._id, type, title, message, relatedEntityType, relatedEntityId);
    }
  } catch (error: any) {
    logger.error(`[notifyAdmins Error]: ${error.message}`);
  }
};
