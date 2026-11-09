import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { envs } from './envs.js';

const baseDir =
  envs.NODE_ENV === 'test'
    ? path.join(os.tmpdir(), 'revia-test-uploads')
    : path.resolve(process.cwd(), 'uploads');

export const uploadsDir = baseDir;
export const avatarsDir = path.join(baseDir, 'avatars');
export const listingsDir = path.join(baseDir, 'listings');

export function ensureUploadsDir(): void {
  fs.mkdirSync(avatarsDir, { recursive: true });
  fs.mkdirSync(listingsDir, { recursive: true });
}

export function ensureListingDir(listingId: string): string {
  const dir = path.join(listingsDir, listingId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
