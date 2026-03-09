#!/usr/bin/env bash
# verify.sh — verifies that the IRIS Docker setup is working correctly.
# Updated with comprehensive tests for timeouts, compilation, and UDL detection.

set -euo pipefail

CONTAINER="${1:-my-iris}"
PASSWORD="${2:-password}"
URL="http://localhost:52773/api/quest"

pass() { echo "   ✓ $1"; }
fail() { echo "ERROR: $1" >&2; exit 1; }

echo "Verifying IRIS setup (container: $CONTAINER)"
echo "Target URL: $URL"
echo ""

# 1. Basic Infrastructure
echo "1. Container running..."
docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" \
  || fail "Container '$CONTAINER' is not running. Run: docker compose up -d"
pass "Container running"

echo "2. Container health..."
STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")
[ "$STATUS" = "healthy" ] \
  || fail "Container health is '$STATUS', expected 'healthy'. Check: docker logs $CONTAINER"
pass "Container healthy"

# 2. API Connectivity & Authentication
echo "3. Health & Auth check..."
HEALTH=$(curl -sf -u "_SYSTEM:${PASSWORD}" "$URL/health" 2>/dev/null) \
  || fail "Health endpoint unreachable or authentication failed. Is port 52773 forwarded?"
echo "$HEALTH" | grep -q '"status":"ok"' \
  || fail "Health endpoint returned unexpected body: $HEALTH"
pass "Health OK: $HEALTH"

echo "4. Invalid authentication..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "_SYSTEM:wrong" "$URL/health")
if [ "$HTTP_CODE" = "401" ]; then
  pass "Auth protection verified (401)"
else
  fail "Expected 401 Unauthorized for wrong password, got $HTTP_CODE"
fi

# 3. Execution Features
echo "5. Basic execution..."
EXEC=$(curl -sf -X POST \
  -u "_SYSTEM:${PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{"code":"WRITE \"hello\", ! , \"world\""}' \
  "$URL/execute" 2>/dev/null) \
  || fail "Execute endpoint unreachable."
echo "$EXEC" | grep -q '"success":1' \
  || fail "Execute endpoint did not succeed. Response: $EXEC"
if echo "$EXEC" | grep -q "hello" && echo "$EXEC" | grep -q "world"; then
  pass "Basic execution & multi-line output OK"
else
  fail "Output capture incomplete. Response: $EXEC"
fi

echo "6. Execution timeout (Infinite Loop)..."
# Should return within ~5s with <ALARM> error, not hang.
ALARM_TEST=$(curl -sf -X POST \
  -u "_SYSTEM:${PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{"code":"FOR {}"}' \
  "$URL/execute" 2>/dev/null) \
  || fail "Execute endpoint unreachable during timeout test."
if echo "$ALARM_TEST" | grep -q "<ALARM>"; then
  pass "Timeout protection verified (<ALARM> caught)"
else
  fail "Infinite loop did not trigger timeout/alarm. Response: $ALARM_TEST"
fi

echo "7. Execution syntax error..."
ERR_TEST=$(curl -sf -X POST \
  -u "_SYSTEM:${PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{"code":"INVALID_COMMAND"}' \
  "$URL/execute" 2>/dev/null) \
  || fail "Execute endpoint unreachable during error test."
if echo "$ERR_TEST" | grep -q '"success":0'; then
  pass "Syntax error handling OK"
else
  fail "Expected success=0 for syntax error. Response: $ERR_TEST"
fi

# 4. Compilation Features
echo "8. Class compilation..."
COMP=$(curl -sf -X POST \
  -u "_SYSTEM:${PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{"source": "Class Test.Verify { ClassMethod Run() { Write 1 } }"}' \
  "$URL/compile" 2>/dev/null) \
  || fail "Compile endpoint unreachable."
if echo "$COMP" | grep -q '"success":1'; then
  pass "Basic compilation OK"
else
  fail "Compilation failed. Response: $COMP"
fi

echo "9. UDL Detection (Leading comments/whitespace)..."
UDL_TEST=$(curl -sf -X POST \
  -u "_SYSTEM:${PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{"source": "\n // Comment\n /* Multi \n line */ \n Class Test.UDL { ClassMethod Run() { Write 1 } }"}' \
  "$URL/compile" 2>/dev/null) \
  || fail "Compile endpoint unreachable during UDL test."
if echo "$UDL_TEST" | grep -q '"success":1'; then
  pass "Modern UDL stripping/detection OK"
else
  fail "UDL detection failed with leading comments. Response: $UDL_TEST"
fi

echo ""
echo "✓ All comprehensive checks passed. IRIS setup is robust."
