#!/usr/bin/env bash
# Pointe clubminutes.api.mg vers Render (CNAME)
# Usage: CLOUDFLARE_API_TOKEN=xxx RENDER_HOST=rotary-minutes.onrender.com bash scripts/cloudflare-dns-render.sh
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-api.mg}"
RECORD_NAME="${RECORD_NAME:-clubminutes}"
RENDER_HOST="${RENDER_HOST:?Set RENDER_HOST (ex: rotary-minutes.onrender.com)}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
PROXIED="${PROXIED:-false}"

echo "==> Lookup zone ${ZONE_NAME}"
ZONE_ID="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')"
)"
[ -n "$ZONE_ID" ] || { echo "Zone not found." >&2; exit 1; }

echo "==> Remove conflicting A records"
A_IDS="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}.${ZONE_NAME}" \
    | python3 -c "import sys,json; print(' '.join(r['id'] for r in json.load(sys.stdin).get('result',[])))"
)"
for id in $A_IDS; do
  curl -fsS -X DELETE -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${id}" >/dev/null
  echo "    Deleted A record ${id}"
done

PROXIED_BOOL="false"
[ "$PROXIED" = "true" ] && PROXIED_BOOL="true"

EXISTING="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${RECORD_NAME}.${ZONE_NAME}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')"
)"

PAYLOAD=$(RECORD_NAME="$RECORD_NAME" RENDER_HOST="$RENDER_HOST" PROXIED_BOOL="$PROXIED_BOOL" python3 - <<'PY'
import json, os
print(json.dumps({
  "type": "CNAME",
  "name": os.environ["RECORD_NAME"],
  "content": os.environ["RENDER_HOST"],
  "ttl": 1,
  "proxied": os.environ["PROXIED_BOOL"] == "true",
}))
PY
)

if [ -n "$EXISTING" ]; then
  curl -fsS -X PUT -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" \
    -d "$PAYLOAD" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${EXISTING}" >/dev/null
  echo "==> Updated CNAME ${RECORD_NAME}.${ZONE_NAME} -> ${RENDER_HOST}"
else
  curl -fsS -X POST -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" \
    -d "$PAYLOAD" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" >/dev/null
  echo "==> Created CNAME ${RECORD_NAME}.${ZONE_NAME} -> ${RENDER_HOST}"
fi

echo "==> Render Dashboard → Custom Domains → Verify clubminutes.api.mg"