/**
 * Génère les icônes PNG Android / PWA à partir de public/icon.svg
 * Usage: node scripts/generate-app-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const androidRes = path.join(root, "android", "app", "src", "main", "res");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-1024.png", size: 1024 },
];

const androidMipmaps = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

async function loadSharp() {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    console.error("Installez sharp : npm install --save-dev sharp");
    process.exit(1);
  }
}

async function renderPng(sharp, size) {
  const svg = fs.readFileSync(path.join(publicDir, "icon.svg"));
  return sharp(svg).resize(size, size).png().toBuffer();
}

async function main() {
  const sharp = await loadSharp();

  for (const { name, size } of sizes) {
    const out = path.join(publicDir, name);
    await fs.promises.writeFile(out, await renderPng(sharp, size));
    console.log(`✓ public/${name}`);
  }

  if (fs.existsSync(androidRes)) {
    for (const { folder, size } of androidMipmaps) {
      const dir = path.join(androidRes, folder);
      fs.mkdirSync(dir, { recursive: true });
      const png = await renderPng(sharp, size);
      await fs.promises.writeFile(path.join(dir, "ic_launcher.png"), png);
      await fs.promises.writeFile(path.join(dir, "ic_launcher_round.png"), png);
      await fs.promises.writeFile(path.join(dir, "ic_launcher_foreground.png"), png);
      console.log(`✓ android/.../${folder}/ic_launcher*.png`);
    }

    const splashDir = path.join(androidRes, "drawable");
    fs.mkdirSync(splashDir, { recursive: true });
    const splashSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <rect width="1080" height="1920" fill="#071a30"/>
      <rect x="0" y="0" width="1080" height="12" fill="#f5a623"/>
    </svg>`);
    await fs.promises.writeFile(
      path.join(splashDir, "splash.png"),
      await sharp(splashSvg).png().toBuffer()
    );
    console.log("✓ android/.../drawable/splash.png");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});