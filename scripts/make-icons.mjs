import sharp from 'sharp';
import * as si from 'simple-icons';

/**
 * Renders brand glyphs from simple-icons to WebP, so logos that ship as
 * wordmarks (MongoDB, MySQL) read at the same size as every other tile.
 */
// `crop` is a viewBox into the 24x24 glyph, used when a brand mark ships with
// a wordmark attached (MySQL) and only the symbol should survive. `lift`
// overrides how far the brand colour is raised: the default suits mid-tone
// logos, while a brand whose colour is black needs far more to read at all on
// a dark tile.
const ICONS = [
  ['siPython', 'python'],
  ['siFastapi', 'fastapi'],
  ['siPostgresql', 'postgresql'],
  ['siMongodb', 'mongodb'],
  ['siMysql', 'mysql', { crop: { x: 13.3, y: 3.1, w: 10.7, h: 9.1 } }],
  ['siNextdotjs', 'nextjs', { lift: 0.88 }],
  ['siThreedotjs', 'threejs', { lift: 0.88 }],
  ['siAnimedotjs', 'animejs', { lift: 0.88 }],
];

/** Lifts a brand colour so mid-tone logos still read on the dark tiles. */
function lighten(hex, amount) {
  const n = parseInt(hex, 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r} ${g} ${b})`;
}

const SIZE = 256;
const PAD = 22; // px of breathing room inside the square

for (const [key, name, options = {}] of ICONS) {
  const icon = si[key];
  if (!icon) throw new Error(`simple-icons is missing ${key}`);

  const box = options.crop || { x: 0, y: 0, w: 24, h: 24 };
  const inner = SIZE - PAD * 2;
  // Fit the (possibly cropped) box into the padded square without distortion.
  const scale = inner / Math.max(box.w, box.h);
  const offsetX = PAD + (inner - box.w * scale) / 2;
  const offsetY = PAD + (inner - box.h * scale) / 2;

  // Clip to the crop box so neighbouring glyph parts can't bleed in.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <clipPath id="c">
      <rect x="${offsetX}" y="${offsetY}" width="${box.w * scale}" height="${box.h * scale}"/>
    </clipPath>
    <g clip-path="url(#c)">
      <g transform="translate(${offsetX} ${offsetY}) scale(${scale}) translate(${-box.x} ${-box.y})">
        <path d="${icon.path}" fill="${lighten(icon.hex, options.lift ?? 0.3)}"/>
      </g>
    </g>
  </svg>`;

  const out = `src/assets/skills/${name}.webp`;
  await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(out);
  console.log(`${out}  ${icon.title} #${icon.hex}`);
}
