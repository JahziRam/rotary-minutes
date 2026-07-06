#!/usr/bin/env bash
# Pointe clubminutes.api.mg vers l'IP du VPS (zone api.mg sur compte personnel)
# Usage: CLOUDFLARE_API_TOKEN=xxx VPS_IP=1.2.3.4 bash scripts/cloudflare-dns-clubminutes.sh
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-api.mg}"
RECORD_NAME="${RECORD_NAME:-clubminutes}"
VPS_IP="${VPS_IP:?Set VPS_IP (public IP of the Oracle/VPS instance)}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (zone DNS edit on api.mg)}"
PROXIED="${PROXIED:-true}"

echo "==> Lookup zone ${ZONE_NAME}"
ZONE_ID="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')"
)"
if [ -z "$ZONE_ID" ]; then
  echo "Zone ${ZONE_NAME} not found on this token's account." >&2
  exit 1
fi
echo "    Zone ID: ${ZONE_ID}"

echo "==> Upsert A record ${RECORD_NAME}.${ZONE_NAME} -> ${VPS_IP} (proxied=${PROXIED})"
EXISTING="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}.${ZONE_NAME}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')"
)"

PROXIED_BOOL="true"
[ "$PROXIED" = "false" ] && PROXIED_BOOL="false"

PAYLOAD=$(RECORD_NAME="$RECORD_NAME" VPS_IP="$VPS_IP" PROXIED_BOOL="$PROXIED_BOOL" python3 - <<'PY'
import json, os
print(json.dumps({
  "type": "A",
  "name": os.environ["RECORD_NAME"],
  "content": os.environ["VPS_IP"],
  "ttl": 1,
  "proxied": os.environ["PROXIED_BOOL"] == "true",
}))
PY
)

if [ -n "$EXISTING" ]; then
  curl -fsS -X PUT \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${EXISTING}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('Updated' if d.get('success') else d)"
else
  curl -fsS -X POST \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('Created' if d.get('success') else d)"
fi

echo "==> Done. Allow 1–5 min for DNS propagation."
echo "    Test: curl -sI https://clubminutes.api.mg"