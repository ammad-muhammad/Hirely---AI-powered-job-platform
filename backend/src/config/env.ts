import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const trimEnv = (val: string | undefined, fallback: string): string => {
  return (val || fallback).trim();
};

export const config = {
  port: parseInt(trimEnv(process.env.PORT, '5000'), 10),
  nodeEnv: trimEnv(process.env.NODE_ENV, 'development'),
  mongodbUri: trimEnv(process.env.MONGODB_URI, 'mongodb://localhost:27017/hirely'),
  jwtSecret: trimEnv(process.env.JWT_SECRET, 'super_secret_jwt_key_hirely_2026'),
  jwtExpiresIn: trimEnv(process.env.JWT_EXPIRES_IN, '7d'),
  frontendUrl: trimEnv(process.env.FRONTEND_URL, 'http://localhost:3000').replace(/\/+$/, ''),
  cloudinary: {
    cloudName: trimEnv(process.env.CLOUDINARY_CLOUD_NAME, ''),
    apiKey: trimEnv(process.env.CLOUDINARY_API_KEY, ''),
    apiSecret: trimEnv(process.env.CLOUDINARY_API_SECRET, ''),
  },
  groqApiKey: trimEnv(process.env.GROQ_API_KEY, ''),
  googleClientId: trimEnv(process.env.GOOGLE_CLIENT_ID, ''),
  googleClientSecret: trimEnv(process.env.GOOGLE_CLIENT_SECRET, ''),
  googleCallbackUrl: trimEnv(process.env.GOOGLE_CALLBACK_URL, 'http://localhost:5000/api/auth/google/callback'),
};
