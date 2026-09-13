import { Request, Response, NextFunction } from 'express';
import { CustomError, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: CustomError & { code?: number; name?: string; errors?: Record<string, { message: string }> },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose / MongoDB duplicate key error (E11000)
  if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
    statusCode = 409;
    const field = err.errors ? Object.keys(err.errors)[0] : 'field';
    message = field === 'email' || (err as any).keyValue?.email
      ? 'An account with this email address already exists. Please log in or use a different email.'
      : 'A record with this information already exists in our system.';
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val: any) => val?.message)
      .filter(Boolean)
      .join(' ');
  }

  // Handle JWT authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication session invalid or expired. Please log in again.';
  }

  // Log error with full stack trace for 500 internal server errors
  if (statusCode >= 500) {
    logger.error(`[INTERNAL SERVER ERROR 500] ${req.method} ${req.originalUrl || req.url}: ${message}`, {
      stack: err.stack,
      body: req.body,
    });
  } else {
    logger.warn(`[API WARN ${statusCode}] ${req.method} ${req.originalUrl || req.url}: ${message}`);
  }

  const response: ApiResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  };

  res.status(statusCode).json(response);
};
