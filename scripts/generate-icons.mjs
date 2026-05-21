import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

async function removeWhiteBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const srcAlpha = pixels[i + 3];
    const lightness = (r + g + b) / 3;

    if (lightness >= 245) {
      pixels[i + 3] = 0;
    } else if (lightness > 200) {
      pixels[i + 3] = Math.round(((245 - lightness) / 45) * srcAlpha);
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function generateIcon(size, filename, paddingPercent = 0.14) {
  const paddingPx = Math.round(size * paddingPercent);
  const maxInner = size - paddingPx * 2;

  const transparentLogo = await removeWhiteBackground(
    path.join(publicDir, 'favicon.png')
  );

  const resizedLogo = await sharp(transparentLogo)
    .resize(maxInner, maxInner, { fit: 'inside' })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
  })
    .composite([{ input: resizedLogo, gravity: 'center', blend: 'over' }])
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .png()
    .toFile(path.join(publicDir, filename));

  console.log(`✓ ${filename} (${size}x${size})`);
}

await generateIcon(512, 'icon-512x512.png', 0.14);
await generateIcon(192, 'icon-192x192.png', 0.14);
await generateIcon(180, 'apple-touch-icon.png', 0.10);
