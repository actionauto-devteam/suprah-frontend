const path = require('path');
const fs = require('fs');
const sharp = require(path.join(__dirname, '../node_modules/sharp'));

const SRC_PATH = path.join(__dirname, '../public/icon-512x512.png');
const PUBLIC = path.join(__dirname, '../public');
const SCALE = 0.72;

const srcBuffer = fs.readFileSync(SRC_PATH);

async function makeIcon(outputName, size) {
    const content = Math.round(size * SCALE);
    const padLeft = Math.floor((size - content) / 2);
    const padTop = padLeft;
    const padRight = size - content - padLeft;
    const padBottom = size - content - padTop;

    await sharp(srcBuffer)
        .resize(content, content, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .extend({ top: padTop, bottom: padBottom, left: padLeft, right: padRight, background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .flatten({ background: { r: 0, g: 0, b: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(path.join(PUBLIC, outputName));

    console.log(`✓ ${outputName} (${size}x${size})`);
}

async function main() {
    console.log('Generating PWA icons...\n');
    await makeIcon('icon-192x192.png', 192);
    await makeIcon('icon-512x512.png', 512);
    await makeIcon('apple-touch-icon.png', 180);
    await makeIcon('icon-96x96.png', 96);
    await makeIcon('favicon-32x32.png', 32);
    console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
