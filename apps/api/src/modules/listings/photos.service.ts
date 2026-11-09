import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { envs } from '../../config/envs.js';
import { ensureListingDir } from '../../config/uploads.js';
import { AppError } from '../../errors/appError.js';
import { ListingPhoto } from './listingPhoto.model.js';

const MAX_PHOTOS = 10;

export async function countActivePhotos(listingId: string): Promise<number> {
  return ListingPhoto.count({
    where: { listingId, isDeleted: false },
  });
}

export async function saveListingPhotos(
  listingId: string,
  files: Express.Multer.File[]
): Promise<ListingPhoto[]> {
  if (files.length === 0) {
    throw new AppError('Seleccioná al menos una foto.', 422);
  }

  const existing = await countActivePhotos(listingId);

  if (existing + files.length > MAX_PHOTOS) {
    throw new AppError('Podés subir hasta 10 fotos por publicación.', 422);
  }

  const directory = ensureListingDir(listingId);
  const created: ListingPhoto[] = [];

  for (const [index, file] of files.entries()) {
    const photoId = randomUUID();
    const filename = `${photoId}.webp`;
    const thumbnailName = `${photoId}-thumb.webp`;

    const main = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const thumbnail = await sharp(file.buffer)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await fs.writeFile(path.join(directory, filename), main);
    await fs.writeFile(path.join(directory, thumbnailName), thumbnail);

    const photo = await ListingPhoto.create({
      listingId,
      url: `${envs.API_URL}/uploads/listings/${listingId}/${filename}`,
      thumbnailUrl: `${envs.API_URL}/uploads/listings/${listingId}/${thumbnailName}`,
      sortOrder: existing + index,
    });

    created.push(photo);
  }

  return created;
}

export async function removeListingPhoto(listingId: string, photoId: string): Promise<void> {
  const photo = await ListingPhoto.findOne({
    where: { id: photoId, listingId, isDeleted: false },
  });

  if (!photo) {
    throw new AppError('No encontramos esa foto.', 404);
  }

  await photo.update({ isDeleted: true });
}
