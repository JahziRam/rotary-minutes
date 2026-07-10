/**
 * Génère icônes, splash screens et logo à partir des visuels Imagine (assets/branding/).
 * Usage: node scripts/generate-branding-assets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brandingDir = path.join(root, "assets", "branding");
const publicDir = path.join(root, "public");
const androidRes = path.join(root, "android", "app", "src", "main", "res");

const ICON_MASTER = path.join(brandingDir, "icon-master.jpg");
const SPLASH_MASTER = path.join(brandingDir, "splash-master.jpg");
const LOGO_MASTER = path.join(brandingDir, "logo-master.jpg");

const NAVY = "#071a30";
const GOLD = "#f5a623";

const publicIconSizes = [
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

const splashTargets = [
  { folder: "drawable", width: 1080, height: 1920 },
  { folder: "drawable-port-mdpi", width: 320, height: 480 },
  { folder: "drawable-port-hdpi", width: 480, height: 800 },
  { folder: "drawable-port-xhdpi", width: 720, height: 1280 },
  { folder: "drawable-port-xxhdpi", width: 1080, height: 1920 },
  { folder: "drawable-port-xxxhdpi", width: 1440, height: 2560 },
  { folder: "drawable-land-mdpi", width: 480, height: 320 },
  { folder: "drawable-land-hdpi", width: 800, height: 480 },
  { folder: "drawable-land-xhdpi", width: 1280, height: 720 },
  { folder: "drawable-land-xxhdpi", width: 1920, height: 1080 },
  { folder: "drawable-land-xxxhdpi", width: 2560, height: 1440 },
];

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

async function squareIconBuffer(sharp, sourcePath, size) {
  const meta = await sharp(sourcePath).metadata();
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);
  return sharp(sourcePath)
    .extract({ left, top, width: side, height: side })
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

function splashTextOverlay(width, height, landscape = false) {
  const titleSize = Math.round(width * (landscape ? 0.06 : 0.067));
  const subtitleSize = Math.round(width * (landscape ? 0.03 : 0.033));
  const titleY = Math.round(height * (landscape ? 0.72 : 0.68));
  const subtitleY = titleY + Math.round(subtitleSize * 1.5);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="6" fill="${GOLD}" />
    <text x="50%" y="${titleY}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${titleSize}" font-weight="700" fill="#ffffff">Rotary Minutes</text>
    <text x="50%" y="${subtitleY}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${subtitleSize}" font-weight="500" fill="${GOLD}">Gestion de club</text>
  </svg>`);
}

async function splashBuffer(sharp, sourcePath, width, height) {
  const landscape = width > height;
  const base = await sharp(sourcePath)
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const overlay = await sharp(splashTextOverlay(width, height, landscape)).png().toBuffer();
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}

async function writeSvgIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Rotary Minutes">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#0d2d52"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect x="0" y="0" width="512" height="10" rx="0" fill="${GOLD}"/>
  <circle cx="256" cy="230" r="88" fill="none" stroke="${GOLD}" stroke-width="6" opacity="0.9"/>
  <rect x="214" y="170" width="84" height="108" rx="10" fill="#0f2744" stroke="${GOLD}" stroke-width="4"/>
  <path d="M236 218 L252 236 L290 196" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="360" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">Minutes</text>
</svg>`;
  await fs.promises.writeFile(path.join(publicDir, "icon.svg"), svg, "utf8");
  console.log("✓ public/icon.svg");
}

async function main() {
  for (const f of [ICON_MASTER, SPLASH_MASTER, LOGO_MASTER]) {
    if (!fs.existsSync(f)) {
      console.error(`Fichier manquant: ${f}`);
      console.error("Générez d'abord les visuels dans assets/branding/ (icon-master, splash-master, logo-master).");
      process.exit(1);
    }
  }

  const sharp = await loadSharp();
  await writeSvgIcon();

  for (const { name, size } of publicIconSizes) {
    const out = path.join(publicDir, name);
    await fs.promises.writeFile(out, await squareIconBuffer(sharp, ICON_MASTER, size));
    console.log(`✓ public/${name}`);
  }

  const logoOut = path.join(publicDir, "logo.png");
  await sharp(LOGO_MASTER)
    .resize(1200, 400, { fit: "cover", position: "centre" })
    .png()
    .toFile(logoOut);
  console.log("✓ public/logo.png");

  const splashPublic = path.join(publicDir, "splash.png");
  await fs.promises.writeFile(splashPublic, await splashBuffer(sharp, SPLASH_MASTER, 1080, 1920));
  console.log("✓ public/splash.png");

  if (fs.existsSync(androidRes)) {
    for (const { folder, size } of androidMipmaps) {
      const dir = path.join(androidRes, folder);
      fs.mkdirSync(dir, { recursive: true });
      const png = await squareIconBuffer(sharp, ICON_MASTER, size);
      for (const name of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]) {
        await fs.promises.writeFile(path.join(dir, name), png);
      }
      console.log(`✓ android/.../${folder}/ic_launcher*.png`);
    }

    for (const { folder, width, height } of splashTargets) {
      const dir = path.join(androidRes, folder);
      fs.mkdirSync(dir, { recursive: true });
      await fs.promises.writeFile(
        path.join(dir, "splash.png"),
        await splashBuffer(sharp, SPLASH_MASTER, width, height)
      );
      console.log(`✓ android/.../${folder}/splash.png (${width}x${height})`);
    }
  }

  console.log("\nBranding assets générés.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});