import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { config } from './env';
import { logger } from '../utils/logger';

// Disable Mongoose command buffering so queries fail fast instead of hanging 10,000ms when DB is offline
mongoose.set('bufferCommands', false);

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`🍃 MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database connection error';
    logger.error(`❌ MongoDB Connection Failure: ${message}`);
    logger.warn(
      `⚠️ Tip: Ensure MongoDB service is running locally on port 27017, OR set a valid cloud MONGODB_URI (e.g. MongoDB Atlas mongodb+srv://...) in backend/.env`
    );
  }
};

// Middleware to check database connection status before handling API requests
export const checkDbConnection = (_req: Request, res: Response, next: NextFunction): void => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message:
        'Database connection unavailable! Please ensure MongoDB is running locally (run `net start MongoDB` in PowerShell) or set a valid cloud MONGODB_URI in backend/.env',
    });
    return;
  }
  next();
};
