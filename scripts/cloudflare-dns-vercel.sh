#!/usr/bin/env bash
# Pointe clubminutes.api.mg vers Vercel
# Usage: CLOUDFLARE_API_TOKEN=xxx VERCEL_CNAME=cname.vercel-dns.com bash scripts/cloudflare-dns-vercel.sh
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-api.mg}"
RECORD_NAME="${RECORD_NAME:-clubminutes}"
VERCEL_CNAME="${VERCEL_CNAME:?Set VERCEL_CNAME from Vercel Domains settings}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
PROXIED="${PROXIED:-false}"

ZONE_ID="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')"
)"
[ -n "$ZONE_ID" ] || { echo "Zone not found." >&2; exit 1; }

for type in A AAAA; do
  IDS="$(
    curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=${type}&name=${RECORD_NAME}.${ZONE_NAME}" \
      | python3 -c "import sys,json; print(' '.join(r['id'] for r in json.load(sys.stdin).get('result',[])))"
  )"
  for id in $IDS; do
    curl -fsS -X DELETE -H "Authorization: Bearer ${CF_TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${id}" >/dev/null
    echo "Deleted ${type} ${id}"
  done
done

PROXIED_BOOL="false"
[ "$PROXIED" = "true" ] && PROXIED_BOOL="true"

EXISTING="$(
  curl -fsS -H "Authorization: Bearer ${CF_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${RECORD_NAME}.${ZONE_NAME}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')"
)"

PAYLOAD=$(RECORD_NAME="$RECORD_NAME" VERCEL_CNAME="$VERCEL_CNAME" PROXIED_BOOL="$PROXIED_BOOL" python3 - <<'PY'
import json, os
print(json.dumps({
  "type": "CNAME",
  "name": os.environ["RECORD_NAME"],
  "content": os.environ["VERCEL_CNAME"],
  "ttl": 1,
  "proxied": os.environ["PROXIED_BOOL"] == "true",
}))
PY
)

if [ -n "$EXISTING" ]; then
  curl -fsS -X PUT -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" \
    -d "$PAYLOAD" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${EXISTING}" >/dev/null
else
  curl -fsS -X POST -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" \
    -d "$PAYLOAD" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" >/dev/null
fi

echo "CNAME ${RECORD_NAME}.${ZONE_NAME} -> ${VERCEL_CNAME}"