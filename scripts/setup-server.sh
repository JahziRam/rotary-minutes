#!/usr/bin/env bash
# Installation initiale sur un VPS Ubuntu/Debian (à lancer une seule fois sur le serveur).
# Prérequis: accès root ou sudo, nom de domaine pointant vers le serveur (optionnel au début).
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/rotary-minutes}"
REPO_URL="${REPO_URL:-https://github.com/JahziRam/rotary-minutes.git}"
NODE_MAJOR="${NODE_MAJOR:-22}"

echo "==> Install system packages"
sudo apt-get update
sudo apt-get install -y curl git nginx certbot python3-certbot-nginx

echo "==> Install Node.js ${NODE_MAJOR}"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Install PM2"
sudo npm install -g pm2
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash || true

echo "==> Clone application"
sudo mkdir -p "$(dirname "$DEPLOY_PATH")"
if [ ! -d "$DEPLOY_PATH/.git" ]; then
  sudo git clone "$REPO_URL" "$DEPLOY_PATH"
  sudo chown -R "$USER:$USER" "$DEPLOY_PATH"
fi

cd "$DEPLOY_PATH"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo ">>> Edit $DEPLOY_PATH/.env with production values, then run:"
  echo "    npm ci && npx prisma migrate deploy && npm run build"
  echo "    pm2 start ecosystem.config.cjs && pm2 save"
  echo "    APP_URL=https://your-domain CRON_SECRET=... ./scripts/setup-cron.sh"
fi

echo "==> Done. Next: configure Nginx reverse proxy to localhost:3000 and SSL with certbot."