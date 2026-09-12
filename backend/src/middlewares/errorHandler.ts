import { Request, Response, NextFunction } from 'express';
import { CustomError, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.url} - ${statusCode} - ${message}`);

  const response: ApiResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  };

  res.status(statusCode).json(response);
};
