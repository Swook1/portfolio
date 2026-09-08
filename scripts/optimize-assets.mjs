import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import path from 'path';

const root = 'C:/Users/Rayyan/Documents/portfolio/src/assets';
const out = 'C:/Users/Rayyan/Documents/portfolio/src/assets-opt';

// [folder, fullWidth, thumbWidth|null]
const jobs = [
  ['certificate', 1600, 800],
  ['picture', 1400, null],
  ['skills', 256, null],
  ['icon', 128, null],
];

const slug = (f) =>
  path.parse(f).name
    .replace(/[^\w\d]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

for (const [folder, w, thumbW] of jobs) {
  const src = path.join(root, folder);
  const dst = path.join(out, folder);
  await mkdir(dst, { recursive: true });
  for (const f of await readdir(src)) {
    const ext = path.extname(f).toLowerCase();
    if (ext === '.svg') continue;
    const name = slug(f);
    const inPath = path.join(src, f);
    await sharp(inPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(dst, `${name}.webp`));
    if (thumbW) {
      await sharp(inPath)
        .resize({ width: thumbW, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(path.join(dst, `${name}-thumb.webp`));
    }
    const a = (await stat(inPath)).size;
    const b = (await stat(path.join(dst, `${name}.webp`))).size;
    console.log(`${folder}/${f} -> ${name}.webp  ${(a/1024).toFixed(0)}KB -> ${(b/1024).toFixed(0)}KB`);
  }
}
