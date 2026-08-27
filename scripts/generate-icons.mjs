import { mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/icons");
const masterSvg = join(root, "design/logic-finance-icon.svg");
const INK = "#14110c";

mkdirSync(outDir, { recursive: true });

const master = readFileSync(masterSvg);

/** Full-bleed icon from the 1024×1024 master (square corners, opaque background). */
function renderMaster(size) {
  return sharp(master).resize(size, size).png();
}

/**
 * Maskable safe zone: scale artwork to ~80% and center on an ink field so
 * circular Android masks do not clip the L/F split or letters.
 */
async function renderMaskable(size) {
  const inner = Math.round(size * 0.8);
  const pad = Math.floor((size - inner) / 2);
  const foreground = await sharp(master).resize(inner, inner).png().toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: INK,
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
