import { mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/icons");
const masterSvg = join(root, "design/logic-finance-icon.svg");
const BRAND = "#5f01d1";

mkdirSync(outDir, { recursive: true });

const master = readFileSync(masterSvg);

function renderMaster(size) {
  return sharp(master).resize(size, size).png();
}

async function renderMaskable(size) {
  const inner = Math.round(size * 0.82);
  const pad = Math.floor((size - inner) / 2);
  const foreground = await sharp(master).resize(inner, inner).png().toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND,
    },
  }).composite([{ input: foreground, left: pad, top: pad }]);
}

async function writePng(promise, filename) {
  await promise.toFile(join(outDir, filename));
}

await writePng(renderMaster(192), "icon-192.png");
await writePng(renderMaster(512), "icon-512.png");
await writePng(renderMaster(180), "apple-touch-icon.png");
await writePng(renderMaster(32), "favicon.png");
await writePng(await renderMaskable(512), "icon-512-maskable.png");

console.log("Icons written to public/icons/ from design/logic-finance-icon.svg");
