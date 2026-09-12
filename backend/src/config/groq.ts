import axios, { InternalAxiosRequestConfig } from 'axios';
import { config } from './env';
import { logger } from '../utils/logger';

export const groqClient = axios.create({
  baseURL: 'https://api.groq.com/openai/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

groqClient.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
  const apiKey = config.groqApiKey;
  if (apiKey) {
    reqConfig.headers.Authorization = `Bearer ${apiKey}`;
  } else {
    logger.warn('⚠️ GROQ_API_KEY is not set in backend/.env. AI features will fallback to mock analysis.');
  }
  return reqConfig;
});
