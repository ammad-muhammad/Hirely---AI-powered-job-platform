import fs from 'fs';
import path from 'path';
import { configureCloudinary } from '../config/cloudinary';
import { logger } from './logger';
import { config } from '../config/env';

const cloudinary = configureCloudinary();

export const uploadBufferToCloudinary = async (
  fileBuffer: Buffer,
  folder: 'hirely/resumes' | 'hirely/company-logos' | 'hirely/company-banners' | 'hirely/avatars' | 'hirely/verification-docs',
  fileName?: string
): Promise<string> => {
  const isPdfDoc = folder === 'hirely/resumes' || folder === 'hirely/verification-docs';

  // For PDF Documents (Resumes / Verification Docs), save locally to avoid Cloudinary untrusted account 401 PDF blocks
  if (isPdfDoc) {
    try {
      const subFolder = folder === 'hirely/resumes' ? 'resumes' : 'verification-docs';
      const targetDir = path.join(__dirname, '../../uploads', subFolder);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const cleanFileName = fileName ? fileName.replace(/[^a-zA-Z0-9_.-]/g, '_') : `document_${Date.now()}.pdf`;
      const finalFileName = `${Date.now()}_${cleanFileName.endsWith('.pdf') ? cleanFileName : cleanFileName + '.pdf'}`;
      const filePath = path.join(targetDir, finalFileName);

      fs.writeFileSync(filePath, fileBuffer);
      logger.info(`[Local PDF Storage] Saved PDF resume to ${filePath}`);

      // Construct server URL for static delivery
      const port = config.port || 5000;
      const host = process.env.BACKEND_HOST_URL || `http://localhost:${port}`;
      return `${host}/uploads/${subFolder}/${finalFileName}`;
    } catch (err: any) {
      logger.error(`[Local PDF Storage Error]: ${err.message}`);
      throw new Error(`Failed to save PDF document: ${err.message}`);
    }
  }

  // For Images (Avatars, Logos, Banners), upload directly to Cloudinary
  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    logger.warn(`[Cloudinary] Keys unconfigured. Creating mock image URL for folder ${folder}`);
    const base64 = fileBuffer.toString('base64');
    return `data:image/png;base64,${base64.substring(0, 100)}...mock_url_${Date.now()}`;
  }

  return new Promise((resolve, reject) => {
    const cleanFileName = fileName ? fileName.replace(/[^a-zA-Z0-9_.-]/g, '_') : `image_${Date.now()}`;
    const cleanPublicId = cleanFileName.replace(/\.[^/.]+$/, '');
    const publicId = `${Date.now()}_${cleanPublicId}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          logger.error(`[Cloudinary Upload Error]: ${error.message}`);
          return reject(new Error(`Failed to upload image to Cloudinary: ${error.message}`));
        }
        if (!result) {
          return reject(new Error('Cloudinary upload returned an empty response.'));
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};
