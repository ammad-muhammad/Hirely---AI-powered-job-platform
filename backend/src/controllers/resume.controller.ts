import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function fetchFileArrayBuffer(url: string): Promise<Buffer> {
  // If local file path URL (/uploads/...)
  if (url.includes('/uploads/')) {
    const relativePath = url.substring(url.indexOf('/uploads/'));
    const localFilePath = path.join(__dirname, '../../', relativePath);
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }
  }

  // Cloudinary fallback
  const targetUrl = url.includes('/raw/upload/') ? url.replace('/raw/upload/', '/image/upload/') : url;
  try {
    const response = await axios.get(targetUrl, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(response.data);
  } catch {
    const fallbackResponse = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(fallbackResponse.data);
  }
}

export const proxyViewResume = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: 'url query parameter is required.' });
      return;
    }

    const fileBuffer = await fetchFileArrayBuffer(url);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

export const proxyDownloadResume = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url, filename } = req.query;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: 'url query parameter is required.' });
      return;
    }

    const rawName = typeof filename === 'string' && filename.trim() ? filename.trim() : 'Resume.pdf';
    const cleanFileName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;

    const fileBuffer = await fetchFileArrayBuffer(url);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFileName)}"`);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};
