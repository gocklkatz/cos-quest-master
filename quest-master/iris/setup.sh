#!/usr/bin/env bash
# setup.sh — one-time initialisation for the Quest Master IRIS container.
# Pulls the image, starts the container, and configures IRIS.
# Safe to re-run: password change and web-app creation are idempotent guards.

set -euo pipefail

CONTAINER="${1:-my-iris}"
NEW_PASSWORD="${2:-password}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Pull image and start container ────────────────────────────────────────
echo "Pulling IRIS image..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" pull

echo "Starting IRIS container..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d

# ── 2. Wait for IRIS to be healthy ────────────────────────────────────────────
echo "Waiting for IRIS to be healthy..."
for i in $(seq 1 30); do
  status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")
  if [ "$status" = "healthy" ]; then
    echo "IRIS is healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: container '$CONTAINER' did not become healthy within 5 minutes." >&2
    exit 1
  fi
  echo "  ($i/30) status=$status — waiting 10s..."
  sleep 10
done

# ── 3. Change _SYSTEM password ────────────────────────────────────────────────
echo "Setting _SYSTEM password..."
docker exec -i "$CONTAINER" bash -c 'iris session IRIS -U %SYS' <<OSEOF
Do ##class(Security.Users).Get("_SYSTEM",.props)
Set props("Password")="$NEW_PASSWORD"
Do ##class(Security.Users).Modify("_SYSTEM",.props)
Write "Password set to: $NEW_PASSWORD", !
Halt
OSEOF

# ── 4. Deploy QuestMaster REST class ─────────────────────────────────────────
echo "Deploying QuestMaster.REST.Execute..."
docker cp "$SCRIPT_DIR/QuestMaster.REST.Execute.cls" "$CONTAINER:/tmp/"
docker exec -i "$CONTAINER" bash -c 'iris session IRIS -U USER' <<'OSEOF'
Do ##class(%SYSTEM.OBJ).Load("/tmp/QuestMaster.REST.Execute.cls","ck-d")
Halt
OSEOF

# ── 5. Register /api/quest/ web application ───────────────────────────────────
echo "Registering /api/quest/ web application..."
docker exec -i "$CONTAINER" bash -c 'iris session IRIS -U %SYS' <<'OSEOF'
Set appName = "/api/quest/"
If ##class(Security.Applications).Exists(appName) Write "Web app already registered — skipping.", ! Halt
Set props("DispatchClass") = "QuestMaster.REST.Execute"
Set props("NameSpace") = "USER"
Set props("Enabled") = 1
Set props("AutheEnabled") = 32
Set props("CORSAllowed") = 1
Set sc = ##class(Security.Applications).Create(appName, .props)
If $System.Status.IsError(sc) Write "ERROR: " _ $System.Status.GetErrorText(sc), ! Halt
Write "Web app registered: " _ appName, !
Halt
OSEOF

# ── 6. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "Verifying health endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "_SYSTEM:$NEW_PASSWORD" \
  http://localhost:52773/api/quest/health)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Setup complete! Health check returned HTTP 200."
  echo ""
  echo "  IRIS Management Portal : http://localhost:52773/csp/sys/UtilHome.csp"
  echo "  Quest Master API       : http://localhost:52773/api/quest/health"
  echo "  Credentials            : _SYSTEM / $NEW_PASSWORD"
else
  echo "WARNING: Health check returned HTTP $HTTP_CODE — check container logs." >&2
  exit 1
fi
