/**
 * Derives the two sizes the About section actually displays from the one
 * source portrait, and writes them back into src/assets/picture.
 *
 * The source is 1400x2489. Nothing on the page shows it at that size: the
 * desktop column caps at 24rem, and phones show only a round crop of the
 * face. Shipping the original made a phone download ~328KB to paint 88px.
 *
 * Re-run after replacing the source photo; the crop below is measured against
 * this particular frame and will need re-measuring for a different one.
 */
import sharp from 'sharp';
import { stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = path.join(root, 'src/assets/picture');
// The full-resolution master lives outside src/ so it is never bundled, and so
// optimize-assets.mjs (which walks whole folders) never reprocesses it.
const source = path.join(root, 'assets-master/picture/rayyanganteng2.webp');

// Square around the head, measured on the source. Slightly loose, so the
// circular mask crops into background rather than into his chin.
const FACE = { left: 450, top: 600, width: 760, height: 760 };

// Desktop caps the column at 24rem (384px); this covers it at 2x.
const PORTRAIT_W = 800;
// The avatar renders at 5.5rem (88px); 256 leaves room to grow it later.
const AVATAR_W = 256;

const jobs = [
  ['rayyanganteng2.webp', sharp(source).resize({ width: PORTRAIT_W }).webp({ quality: 80 })],
  [
    'rayyanganteng2-avatar.webp',
    sharp(source).extract(FACE).resize({ width: AVATAR_W }).webp({ quality: 82 }),
  ],
];

const before = (await stat(source)).size;
for (const [name, pipeline] of jobs) {
  await pipeline.toFile(path.join(dir, name));
  const after = (await stat(path.join(dir, name))).size;
  console.log(`${name}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}
