import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { envs } from '../../config/envs.js';
import { avatarsDir, ensureUploadsDir } from '../../config/uploads.js';
import { AppError } from '../../errors/appError.js';
import { User } from './user.model.js';

export async function saveAvatar(
  userId: string,
  buffer: Buffer
): Promise<{ avatarUrl: string; user: User }> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('No autenticado', 401);
  }

  ensureUploadsDir();

  const filename = `${userId}-${Date.now()}.webp`;
  const filePath = path.join(avatarsDir, filename);
  const processed = await sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();

  await fs.writeFile(filePath, processed);

  const avatarUrl = `${envs.API_URL}/uploads/avatars/${filename}`;
  await user.update({ avatarUrl });

  return { avatarUrl, user };
}
