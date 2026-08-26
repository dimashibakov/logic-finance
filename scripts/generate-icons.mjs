import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/icons");

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f1720"/>
  <text x="256" y="292" font-family="system-ui,-apple-system,sans-serif" font-size="168" font-weight="800" fill="#ffffff" text-anchor="middle">LF</text>
</svg>`;

/** Maskable safe zone (~80% center). */
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f1720"/>
  <text x="256" y="280" font-family="system-ui,-apple-system,sans-serif" font-size="132" font-weight="800" fill="#ffffff" text-anchor="middle">LF</text>
</svg>`;

async function writePng(svg, size, filename) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(outDir, filename));
}

mkdirSync(outDir, { recursive: true });
await writePng(iconSvg, 192, "icon-192.png");
await writePng(iconSvg, 512, "icon-512.png");
await writePng(maskableSvg, 512, "icon-512-maskable.png");
await writePng(iconSvg, 180, "apple-touch-icon.png");
await writePng(iconSvg, 32, "favicon.png");
console.log("Icons written to public/icons/");
