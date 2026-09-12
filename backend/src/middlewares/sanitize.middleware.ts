import { Request, Response, NextFunction } from 'express';

const cleanValue = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  if (Array.isArray(obj)) {
    return obj.map(cleanValue);
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Strip any keys starting with $ or containing . to prevent NoSQL query injection
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = cleanValue(obj[key]);
    }
    return cleaned;
  }

  return String(obj);
};

export const sanitizeNoSqlInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.query) {
    req.query = cleanValue(req.query);
  }
  if (req.body && typeof req.body === 'object') {
    req.body = cleanValue(req.body);
  }
  if (req.params) {
    req.params = cleanValue(req.params);
  }
  next();
};
