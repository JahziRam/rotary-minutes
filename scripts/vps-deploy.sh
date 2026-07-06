#!/usr/bin/env bash
# Déploiement production VPS — Next.js + PM2 (clubminutes.api.mg)
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
APP_DOMAIN="${APP_DOMAIN:-clubminutes.api.mg}"
cd "$APP_DIR"

echo "==> Deploy Rotary Minutes (VPS) in $APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js required." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo ".env missing — copy from .env.example and fill production values." >&2
  exit 1
fi

# Ensure URLs match production domain
if grep -q "localhost" .env 2>/dev/null; then
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://${APP_DOMAIN}|" .env
  sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}|" .env
fi

echo "==> Sync code"
git fetch origin main
git reset --hard origin/main

echo "==> Install"
npm ci

echo "==> Prisma"
npx prisma generate
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
fi

echo "==> Build"
npm run build

echo "==> PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
  pm2 save
else
  echo "PM2 not found. Start manually: npm run start" >&2
  exit 1
fi

echo "==> Health check"
sleep 3
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:3000/en" || true

echo "==> Deploy complete — https://${APP_DOMAIN}"