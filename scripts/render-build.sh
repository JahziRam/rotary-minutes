#!/usr/bin/env bash
# Render build — skip npm ci when package-lock.json unchanged (uses Render build cache).
set -euo pipefail

LOCK_HASH="node_modules/.package-lock.hash"

if [[ -f "$LOCK_HASH" ]] && cmp -s package-lock.json "$LOCK_HASH"; then
  echo ">>> Dependencies unchanged — skipping npm ci"
else
  echo ">>> Installing dependencies..."
  npm ci --include=dev --prefer-offline --no-audit
  cp package-lock.json "$LOCK_HASH"
fi

echo ">>> Prisma generate..."
npx prisma generate

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo ">>> WARNING: DIRECT_URL not set — db push will use DATABASE_URL (use db.prisma.io for migrations)"
fi

echo ">>> Prisma db push (schema sync)..."
npx prisma db push --accept-data-loss

if [[ "${RUN_DB_SEED:-}" == "1" ]]; then
  echo ">>> Seeding database..."
  npx tsx prisma/seed.ts
fi

echo ">>> Building Next.js..."
NEXT_TELEMETRY_DISABLED=1 npm run build