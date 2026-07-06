#!/usr/bin/env bash
# Bootstrap Oracle Cloud Always Free (ou tout VPS Ubuntu 22.04+) pour clubminutes.api.mg
# Usage (sur le VPS, en root ou sudo) :
#   curl -fsSL https://raw.githubusercontent.com/JahziRam/rotary-minutes/main/scripts/vps-bootstrap-clubminutes.sh | bash
# Ou après git clone :
#   APP_DOMAIN=clubminutes.api.mg GITHUB_TOKEN=ghp_xxx bash scripts/vps-bootstrap-clubminutes.sh
set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:-clubminutes.api.mg}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/rotary-minutes}"
REPO_URL="${REPO_URL:-https://github.com/JahziRam/rotary-minutes.git}"
NODE_MAJOR="${NODE_MAJOR:-22}"
RUN_USER="${RUN_USER:-${SUDO_USER:-$USER}}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

echo "==> System packages"
apt-get update
apt-get install -y curl git nginx ufw

echo "==> Node.js ${NODE_MAJOR}"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs

echo "==> PM2"
npm install -g pm2

echo "==> Firewall (SSH + HTTP)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Clone repo"
mkdir -p "$(dirname "$DEPLOY_PATH")"
if [ ! -d "$DEPLOY_PATH/.git" ]; then
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    git clone "https://${GITHUB_TOKEN}@github.com/JahziRam/rotary-minutes.git" "$DEPLOY_PATH"
  else
    git clone "$REPO_URL" "$DEPLOY_PATH" || {
      echo "Private repo: set GITHUB_TOKEN (read repo scope) and re-run." >&2
      exit 1
    }
  fi
fi
chown -R "$RUN_USER:$RUN_USER" "$DEPLOY_PATH"

echo "==> Nginx for ${APP_DOMAIN}"
cp "$DEPLOY_PATH/scripts/nginx-clubminutes.conf" /etc/nginx/sites-available/clubminutes
ln -sf /etc/nginx/sites-available/clubminutes /etc/nginx/sites-enabled/clubminutes
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

sudo -u "$RUN_USER" bash <<EOSU
set -euo pipefail
cd "$DEPLOY_PATH"
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://${APP_DOMAIN}|" .env
  sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}|" .env
  echo ""
  echo ">>> Edit $DEPLOY_PATH/.env (DATABASE_URL, AUTH_SECRET, etc.) then run:"
  echo "    bash scripts/vps-deploy.sh"
fi
EOSU

echo ""
echo "==> Bootstrap done"
echo "    1. Edit $DEPLOY_PATH/.env with production secrets"
echo "    2. Run: cd $DEPLOY_PATH && bash scripts/vps-deploy.sh"
echo "    3. Point DNS: clubminutes.api.mg -> $(curl -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo "    4. Cloudflare SSL mode: Flexible (or Full with certbot)"