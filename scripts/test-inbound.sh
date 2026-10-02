#!/usr/bin/env bash
# Inject 3 sample firm emails via POST /api/inbound/dev, then list GET /api/inbox.
# Requires: npm run dev (or a running server) on BASE_URL.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"

echo "==> Bay Studies inbound smoke test"
echo "    BASE_URL=${BASE_URL}"
echo

inject() {
  local firm="$1"
  echo "— POST /api/inbound/dev firm=${firm}"
  curl -sS -X POST "${BASE_URL}/api/inbound/dev" \
    -H 'Content-Type: application/json' \
    -d "{\"firm\":\"${firm}\"}" | tee "/tmp/bay-inbound-${firm}.json"
  echo
  echo
}

inject "clc"
inject "tasteocracy"
inject "fieldwork"

echo "— GET /api/inbox"
curl -sS "${BASE_URL}/api/inbox" | tee /tmp/bay-inbox.json
echo
echo
echo "Done. Open ${BASE_URL}/admin/ingest — Live inbox should list CLC, Tasteocracy, Fieldwork."
