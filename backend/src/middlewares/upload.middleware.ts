import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Store files in memory buffer before sending to Cloudinary
const storage = multer.memoryStorage();

// Max file size: 5MB
const limits = {
  fileSize: 5 * 1024 * 1024,
};

// Image filter (PNG, JPG, JPEG, WEBP, SVG)
const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Allowed formats: JPG, PNG, WEBP, SVG'));
  }
};

// Resume filter (PDF, DOC, DOCX)
const resumeFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid resume format. Only PDF and DOCX files are allowed'));
  }
};

// Verification document filter (PDF, JPG, PNG, WEBP)
const docFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF, JPG, PNG, and WEBP files are allowed.'));
  }
};

// Attachment filter for chat system (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, WEBP, GIF, SVG, TXT)
const attachmentFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];
  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, WEBP, GIF, TXT'));
  }
};

export const uploadLogo = multer({ storage, limits, fileFilter: imageFilter }).single('logo');
export const uploadBanner = multer({ storage, limits, fileFilter: imageFilter }).single('banner');
export const uploadAvatar = multer({ storage, limits, fileFilter: imageFilter }).single('avatar');
export const uploadResume = multer({ storage, limits, fileFilter: resumeFilter }).single('resume');
export const uploadVerificationDocs = multer({ storage, limits, fileFilter: docFilter }).array('documents', 3);
export const uploadAttachment = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: attachmentFilter }).any();


