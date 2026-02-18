import sharp from 'sharp';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';

const inputPath = 'public/icons/icon-512x512.jpg';
const sizes = [192, 512];

for (const size of sizes) {
  const outputPath = `public/icons/icon-${size}x${size}.png`;
  await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outputPath);
  console.log(`Generated ${outputPath}`);
}

// Clean up the jpg
unlinkSync(inputPath);
console.log('Removed source jpg');
console.log('PWA icons generated successfully!');
