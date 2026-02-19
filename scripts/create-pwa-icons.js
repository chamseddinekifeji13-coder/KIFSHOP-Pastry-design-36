import sharp from "sharp";
import fs from "fs";
import path from "path";

const iconsDir = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a KIFSHOP icon - green background with white "K" letter
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="#4A7C59"/>
  <text x="256" y="340" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="280" fill="white">K</text>
</svg>`;

const svgBuffer = Buffer.from(svgIcon);

// Generate 512x512
await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512x512.png"));
console.log("Created icon-512x512.png");

// Generate 192x192
await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192x192.png"));
console.log("Created icon-192x192.png");

console.log("PWA icons generated successfully!");
