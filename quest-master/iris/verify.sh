#!/usr/bin/env bash
# verify.sh — verifies that the IRIS Docker setup is working correctly.
# Run this after ./setup.sh to confirm everything is healthy.
# Usage: ./verify.sh [container-name] [password]

set -euo pipefail

CONTAINER="${1:-my-iris}"
PASSWORD="${2:-password}"

pass() { echo "   ✓ $1"; }
fail() { echo "ERROR: $1" >&2; exit 1; }

echo "Verifying IRIS setup (container: $CONTAINER)"
echo ""

# 1. Container is running
echo "1. Container running..."
docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" \
  || fail "Container '$CONTAINER' is not running. Run: docker compose up -d"
pass "Container running"

# 2. Container is healthy
echo "2. Container health..."
STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")
[ "$STATUS" = "healthy" ] \
  || fail "Container health is '$STATUS', expected 'healthy'. Check: docker logs $CONTAINER"
pass "Container healthy"

# 3. Health endpoint returns 200 with correct JSON
echo "3. Health endpoint..."
HEALTH=$(curl -sf -u "_SYSTEM:${PASSWORD}" \
  http://localhost:52773/api/quest/health 2>/dev/null) \
  || fail "Health endpoint unreachable. Is port 52773 forwarded?"
echo "$HEALTH" | grep -q '"status":"ok"' \
  || fail "Health endpoint returned unexpected body: $HEALTH"
pass "Health endpoint OK — $HEALTH"

# 4. Execute endpoint runs ObjectScript
echo "4. Execute endpoint..."
EXEC=$(curl -sf -X POST \
  -u "_SYSTEM:${PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{"code":"WRITE \"verify-ok\", !"}' \
  http://localhost:52773/api/quest/execute 2>/dev/null) \
  || fail "Execute endpoint unreachable."
echo "$EXEC" | grep -q '"success":1' \
  || fail "Execute endpoint did not succeed. Response: $EXEC"
echo "$EXEC" | grep -q "verify-ok" \
  || fail "Execute output missing expected text. Response: $EXEC"
pass "Execute endpoint OK"

echo ""
echo "✓ All checks passed. IRIS setup is correct."
