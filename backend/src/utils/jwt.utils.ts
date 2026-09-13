import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config/env';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'job_seeker' | 'employer' | 'admin' | 'pending';
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

export const sendTokenCookie = (res: Response, token: string): void => {
  const isProduction = config.nodeEnv === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookie = (res: Response): void => {
  const isProduction = config.nodeEnv === 'production';

  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: new Date(0),
  });
};
