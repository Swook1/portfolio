import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

// Renders every raster icon from public/favicon.svg so the mark has a single source.
const svg = readFileSync('public/favicon.svg');

// Maskable icons get cropped by the launcher, so the badge is inset into a
// full-bleed accent ground with a 10% safe margin on every side.
const maskable = (size) => {
  const inner = Math.round(size * 0.8);
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#3b82f6' },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${inner}" height="${inner}">
             <path transform="translate(-2.25 0)" fill="#fff" fill-rule="evenodd"
                   d="M21 15 H35.5 C41.8 15 46.5 19.9 46.5 26 C46.5 30.7 43.8 34.6 39.8 36.2 L47.5 49 H38.9 L32.2 37.2 H28.2 V49 H21 Z
                      M28.2 21.8 H35 C37.4 21.8 39.2 23.6 39.2 26 C39.2 28.4 37.4 30.2 35 30.2 H28.2 Z"/>
           </svg>`
        ),
        left: Math.round((size - inner) / 2),
        top: Math.round((size - inner) / 2),
      },
    ])
    .png();
};

const jobs = [
  ['public/favicon-96.png', sharp(svg).resize(96, 96).png()],
  ['public/apple-touch-icon.png', maskable(180)],
  ['public/icon-192.png', sharp(svg).resize(192, 192).png()],
  ['public/icon-512.png', sharp(svg).resize(512, 512).png()],
  ['public/icon-maskable-512.png', maskable(512)],
];

for (const [out, pipeline] of jobs) {
  await pipeline.toFile(out);
  console.log('wrote', out);
}

// A 32px + 16px .ico keeps legacy browsers and Windows shortcuts happy.
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(
  icoSizes.map((s) => sharp(svg).resize(s, s).png({ compressionLevel: 9 }).toBuffer())
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i] === 256 ? 0 : icoSizes[i], 0);
  e.writeUInt8(icoSizes[i] === 256 ? 0 : icoSizes[i], 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...entries, ...pngs]));
console.log('wrote public/favicon.ico');
