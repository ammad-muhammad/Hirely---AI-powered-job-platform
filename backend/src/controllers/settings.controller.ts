import { Response, NextFunction } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { User, JobSeekerProfile, Company, Job, Application, ChatThread, Message } from '../models';
import { AuthenticatedRequest } from '../types';

// Get Current User Settings
export const getSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        fullName: user.fullName,
        twoFactorEnabled: user.twoFactorEnabled || false,
        communicationPrefs: user.communicationPrefs || {
          showOnlineStatus: true,
          showReadReceipts: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update Email
export const updateEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      res.status(400).json({ success: false, message: 'New email and current password are required.' });
      return;
    }

    const trimmedEmail = String(newEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    const user = await User.findById(userId).select('+password');
    if (!user || !user.password) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    if (user.email === trimmedEmail) {
      res.status(400).json({ success: false, message: 'New email must be different from current email.' });
      return;
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    user.email = trimmedEmail;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email address updated successfully.',
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// Update Phone
export const updatePhone = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { phone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.phone = phone ? String(phone).trim() : undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully.',
      phone: user.phone || '',
    });
  } catch (error) {
    next(error);
  }
};

// Setup 2FA (Generate TOTP secret and QR code)
export const setup2FA = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('+twoFactorTempSecret');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(400).json({ success: false, message: 'Two-Factor Authentication is already enabled on your account.' });
      return;
    }

    const secret = speakeasy.generateSecret({
      name: `Hirely (${user.email})`,
      issuer: 'Hirely AI Platform',
    });

    user.twoFactorTempSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCodeUrl,
    });
  } catch (error) {
    next(error);
  }
};

// Verify 2FA (Confirm initial setup with token)
export const verify2FA = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: '6-digit verification token is required.' });
      return;
    }

    const user = await User.findById(userId).select('+twoFactorTempSecret +twoFactorSecret');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (!user.twoFactorTempSecret) {
      res.status(400).json({ success: false, message: 'No pending 2FA setup found. Please click Enable 2FA again.' });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });

    if (!verified) {
      res.status(400).json({ success: false, message: 'Invalid 6-digit code. Please check your authenticator app and try again.' });
      return;
    }

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = null;
    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Two-Factor Authentication has been successfully enabled!',
    });
  } catch (error) {
    next(error);
  }
};

// Disable 2FA
export const disable2FA = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ success: false, message: 'Password is required to disable Two-Factor Authentication.' });
      return;
    }

    const user = await User.findById(userId).select('+password +twoFactorSecret +twoFactorTempSecret');
    if (!user || !user.password) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect password.' });
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Two-Factor Authentication has been disabled.',
    });
  } catch (error) {
    next(error);
  }
};

// Update Communication Preferences
export const updateCommunicationPrefs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { showOnlineStatus, showReadReceipts } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.communicationPrefs = {
      showOnlineStatus: typeof showOnlineStatus === 'boolean' ? showOnlineStatus : user.communicationPrefs?.showOnlineStatus ?? true,
      showReadReceipts: typeof showReadReceipts === 'boolean' ? showReadReceipts : user.communicationPrefs?.showReadReceipts ?? true,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Communication preferences updated.',
      communicationPrefs: user.communicationPrefs,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Account (Cascade cleanup)
export const deleteAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ success: false, message: 'Password confirmation is required to delete your account.' });
      return;
    }

    const user = await User.findById(userId).select('+password');
    if (!user || !user.password) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect password.' });
      return;
    }

    // Cascade Cleanup
    if (user.role === 'job_seeker') {
      const apps = await Application.find({ applicantId: user._id });
      const appIds = apps.map((a) => a._id);

      const threads = await ChatThread.find({
        $or: [{ jobSeekerId: user._id }, { applicationId: { $in: appIds } }],
      });
      const threadIds = threads.map((t) => t._id);

      await Message.deleteMany({ $or: [{ threadId: { $in: threadIds } }, { senderId: user._id }] });
      await ChatThread.deleteMany({ _id: { $in: threadIds } });
      await Application.deleteMany({ applicantId: user._id });
      await JobSeekerProfile.deleteMany({ userId: user._id });
    } else if (user.role === 'employer') {
      const companies = await Company.find({ ownerId: user._id });
      const companyIds = companies.map((c) => c._id);

      const jobs = await Job.find({ companyId: { $in: companyIds } });
      const jobIds = jobs.map((j) => j._id);

      const apps = await Application.find({ jobId: { $in: jobIds } });
      const appIds = apps.map((a) => a._id);

      const threads = await ChatThread.find({
        $or: [{ employerId: user._id }, { applicationId: { $in: appIds } }],
      });
      const threadIds = threads.map((t) => t._id);

      await Message.deleteMany({ $or: [{ threadId: { $in: threadIds } }, { senderId: user._id }] });
      await ChatThread.deleteMany({ _id: { $in: threadIds } });
      await Application.deleteMany({ jobId: { $in: jobIds } });
      await Job.deleteMany({ companyId: { $in: companyIds } });
      await Company.deleteMany({ ownerId: user._id });
    }

    await User.findByIdAndDelete(user._id);

    // Clear authentication cookie
    res.clearCookie('token');

    res.status(200).json({
      success: true,
      message: 'Account and associated data deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
