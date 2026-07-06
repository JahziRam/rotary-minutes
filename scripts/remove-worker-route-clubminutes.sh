#!/usr/bin/env bash
# Retire la route Worker clubminutes.api.mg (conflit avec VPS)
# Usage: CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=e3b91a2e... bash scripts/remove-worker-route-clubminutes.sh
set -euo pipefail

DOMAIN="${DOMAIN:-clubminutes.api.mg}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"

echo "==> List worker domains on account ${ACCOUNT_ID}"
curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for d in data.get('result', []):
    print(d.get('id'), d.get('hostname'), d.get('service'))
"

DOMAIN_ID="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
for d in data.get('result', []):
    if d.get('hostname') == '${DOMAIN}':
        print(d['id'])
        break
"
)"

if [ -z "$DOMAIN_ID" ]; then
  echo "No Worker custom domain found for ${DOMAIN} — OK."
  exit 0
fi

echo "==> Delete Worker domain ${DOMAIN} (${DOMAIN_ID})"
curl -fsS -X DELETE \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains/${DOMAIN_ID}"

echo "==> Done — DNS A record can now reach the VPS."