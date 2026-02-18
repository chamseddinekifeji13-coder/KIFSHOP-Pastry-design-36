import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';

const sizes = [192, 512];

async function main() {
  for (const size of sizes) {
    const buf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 74, g: 124, b: 89, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
    
    // Write directly to stdout as base64 so we can capture it
    console.log(`ICON_${size}:${buf.toString('base64')}`);
  }
}

main().catch(console.error);
