import multer from 'multer';
import { AppError } from '../errors/appError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError('Formato de imagen no válido. Usá JPG, PNG o WebP.', 422));
      return;
    }

    callback(null, true);
  },
});
