#!/usr/bin/env bash
# Déploiement sur le serveur — appelé par GitHub Actions ou manuellement après git pull.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "==> Deploy Rotary Minutes in $APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required on the server." >&2
  exit 1
fi

echo "==> Sync code from origin/main"
git fetch origin main
git reset --hard origin/main

echo "==> Install dependencies"
npm ci

echo "==> Prisma generate + migrations"
npx prisma generate
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "    (no migrations folder — skipping migrate deploy)"
fi

echo "==> Build Next.js"
npm run build

echo "==> Restart application"
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
  pm2 save
else
  echo "PM2 not found. Run manually: npm run start" >&2
  exit 1
fi

echo "==> Deploy complete"