import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';
import { logger } from '../utils/logger';

export const configureCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    logger.info('☁️ Cloudinary SDK configured successfully');
  } else {
    logger.warn('⚠️ Cloudinary keys unconfigured in .env. Uploads will use base64 fallback / mock URLs.');
  }

  return cloudinary;
};

export { cloudinary };
