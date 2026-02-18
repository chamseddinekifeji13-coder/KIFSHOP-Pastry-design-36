import sharp from 'sharp';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Find the source icon
const possiblePaths = [
  'public/icons/source-icon.jpg',
  './public/icons/source-icon.jpg',
  '/vercel/share/v0-project/public/icons/source-icon.jpg',
];

// List what's in the icons dir for debugging
const iconDirs = ['public/icons', './public/icons', '/vercel/share/v0-project/public/icons'];
for (const d of iconDirs) {
  try {
    if (existsSync(d)) {
      console.log(`Contents of ${d}:`, readdirSync(d));
    }
  } catch (e) {
    // ignore
  }
}

// Also check cwd
console.log('CWD:', process.cwd());
try {
  console.log('CWD contents:', readdirSync('.').slice(0, 20));
} catch (e) { /* ignore */ }

let inputPath = null;
for (const p of possiblePaths) {
  if (existsSync(p)) {
    inputPath = p;
    break;
  }
}

if (!inputPath) {
  // Generate a simple green icon with sharp directly
  console.log('Source icon not found, generating from scratch...');
  const sizes = [192, 512];
  for (const size of sizes) {
    const outputPath = `public/icons/icon-${size}x${size}.png`;
    mkdirSync('public/icons', { recursive: true });
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 74, g: 124, b: 89, alpha: 1 }
      }
    })
    .png()
    .toFile(outputPath);
    console.log(`Generated solid green ${outputPath}`);
  }
} else {
  console.log('Found source at:', inputPath);
  const sizes = [192, 512];
  for (const size of sizes) {
    const outputPath = `public/icons/icon-${size}x${size}.png`;
    await sharp(inputPath)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
}

console.log('PWA icons ready!');
