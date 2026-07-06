#!/usr/bin/env bash
# Crontab système — remplace les crons Vercel (vercel.json).
# Usage: APP_URL=https://votre-domaine.app CRON_SECRET=xxx ./scripts/setup-cron.sh
set -euo pipefail

APP_URL="${APP_URL:?Set APP_URL (e.g. https://rotaryminutes.app)}"
CRON_SECRET="${CRON_SECRET:?Set CRON_SECRET}"

MARKER="# rotary-minutes-cron"
TMP="$(mktemp)"

(crontab -l 2>/dev/null | grep -v "$MARKER" || true) > "$TMP"

cat >> "$TMP" <<EOF
0 6 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/trial-expiry" >/dev/null 2>&1 ${MARKER}
0 7 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/trial-reminders" >/dev/null 2>&1 ${MARKER}
0 8 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/meeting-reminders" >/dev/null 2>&1 ${MARKER}
0 9 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/pv-reminders" >/dev/null 2>&1 ${MARKER}
*/15 * * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/email-campaigns" >/dev/null 2>&1 ${MARKER}
0 8 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/dues-reminders" >/dev/null 2>&1 ${MARKER}
0 8 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/meeting-reminders" >/dev/null 2>&1 ${MARKER}
0 9 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/pv-reminders" >/dev/null 2>&1 ${MARKER}
EOF

crontab "$TMP"
rm -f "$TMP"
echo "Crontab installed for $APP_URL"