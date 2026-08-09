import fs from 'node:fs';
import path from 'node:path';

const imagesDirectory = path.resolve('data/images');

const allowedExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

export function getImages(): string[] {
  if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory, { recursive: true });

    return [];
  }

  return fs
    .readdirSync(imagesDirectory)
    .filter((file) => {
      const extension = path.extname(file).toLowerCase();

      return allowedExtensions.includes(extension);
    })
    .map((file) => path.join(imagesDirectory, file));
}