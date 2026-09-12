import { Request, Response } from 'express';

export const getHealthStatus = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'hirely-backend-api',
  });
};
