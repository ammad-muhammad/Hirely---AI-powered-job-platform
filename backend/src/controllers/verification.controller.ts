import { Response, NextFunction } from 'express';
import { Company, IVerificationDocument } from '../models';
import { uploadBufferToCloudinary } from '../utils/cloudinary.utils';
import { AuthenticatedRequest } from '../types';

export const submitVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const company = await Company.findOne({ ownerId: userId });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found for this employer.' });
      return;
    }

    if (company.verificationStatus === 'pending') {
      res.status(400).json({
        success: false,
        message: 'Your verification submission is currently under review. Please wait for an administrator to process your request.',
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'Please upload at least one verification document (PDF or Image).' });
      return;
    }

    // Parse documentTypes array from req.body
    let documentTypes: string[] = [];
    if (typeof req.body.documentTypes === 'string') {
      try {
        const parsed = JSON.parse(req.body.documentTypes);
        documentTypes = Array.isArray(parsed) ? parsed : [req.body.documentTypes];
      } catch {
        documentTypes = [req.body.documentTypes];
      }
    } else if (Array.isArray(req.body.documentTypes)) {
      documentTypes = req.body.documentTypes;
    }

    const validTypes = ['ntn_certificate', 'business_registration', 'cnic', 'other'];
    const uploadedDocs: IVerificationDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawType = documentTypes[i] || 'other';
      const docType = validTypes.includes(rawType) ? (rawType as any) : 'other';

      const url = await uploadBufferToCloudinary(
        file.buffer,
        'hirely/verification-docs',
        file.originalname
      );

      uploadedDocs.push({
        url,
        documentType: docType,
        uploadedAt: new Date(),
      });
    }

    company.verificationDocuments = uploadedDocs;
    if (uploadedDocs.length > 0) {
      company.verificationDocumentUrl = uploadedDocs[0].url;
    }
    company.verificationStatus = 'pending';
    company.verificationSubmittedAt = new Date();
    company.verificationRejectionReason = null;

    if (!company.verificationHistory) {
      company.verificationHistory = [];
    }
    company.verificationHistory.push({
      status: 'submitted',
      timestamp: new Date(),
    });

    await company.save();

    // Notify all system administrators
    const { notifyAdmins } = await import('../services/notification.service');
    await notifyAdmins(
      'verification_status_changed',
      'New Verification Submission',
      `${company.companyName} has submitted company verification documents for review.`,
      'company',
      company._id.toString()
    );

    res.status(200).json({
      success: true,
      message: 'Verification documents submitted successfully!',
      data: {
        verificationStatus: company.verificationStatus,
        verificationSubmittedAt: company.verificationSubmittedAt,
        verificationDocuments: company.verificationDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const company = await Company.findOne({ ownerId: userId });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        companyId: company._id,
        companyName: company.companyName,
        isVerified: company.isVerified,
        verificationStatus: company.verificationStatus,
        verificationSubmittedAt: company.verificationSubmittedAt,
        verificationReviewedAt: company.verificationReviewedAt,
        verificationRejectionReason: company.verificationRejectionReason,
        verificationDocuments: company.verificationDocuments || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
