import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'public/icons/icon.svg'));

const sizes = [180, 192, 512];

for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(root, `public/icons/icon-${size}.png`));
  console.log(`generated public/icons/icon-${size}.png`);
}
