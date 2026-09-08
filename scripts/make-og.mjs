import sharp from 'sharp';

// 1200x630 share card: dark ground + the About portrait bleeding off the right.
const W = 1200;
const H = 630;

const portrait = await sharp('src/assets/picture/rayyanganteng2.webp')
  .resize({ width: 620, height: H, fit: 'cover', position: 'top' })
  .toBuffer();

const text = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.45" stop-color="#0b0f17" stop-opacity="1"/>
      <stop offset="0.75" stop-color="#0b0f17" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <text x="80" y="290" font-family="Verdana, sans-serif" font-size="54" font-weight="bold" fill="#e6edf3">Rayyan Zafier Leksono</text>
  <text x="80" y="350" font-family="Verdana, sans-serif" font-size="28" fill="#3b82f6">Computer Science - Software Engineering</text>
  <text x="80" y="400" font-family="Verdana, sans-serif" font-size="24" fill="#9aa7b8">rayyanzafier.web.id</text>
</svg>`);

await sharp({ create: { width: W, height: H, channels: 3, background: '#0b0f17' } })
  .composite([
    { input: portrait, left: W - 620, top: 0 },
    { input: text, left: 0, top: 0 },
  ])
  .jpeg({ quality: 85 })
  .toFile('public/og-image.jpg');

console.log('public/og-image.jpg written');
