# IRIS Docker Setup

## Quick start (fresh install)

```bash
cd quest-master/iris

# 1. Start IRIS
docker compose up -d

# 2. One-time setup: sets password, deploys class, registers web app
./setup.sh
```

That's it. The setup script waits for IRIS to be healthy, then does everything automatically.

### Custom password

```bash
./setup.sh my-iris my-secret-password
```

Update the password in the app's Settings modal to match.

---

## What setup.sh does

1. Waits for the `my-iris` container health check to pass
2. Changes `_SYSTEM` password from the factory default `SYS` → `password`
3. Deploys `QuestMaster.REST.Execute.cls` to the USER namespace
4. Registers `/api/quest/` as a REST web application
5. Verifies the health endpoint returns HTTP 200

The script is idempotent for steps 3–5 — safe to re-run if something fails.
Step 2 (password change) only works once from the factory default; subsequent runs will print a harmless "already changed" message.

---

## Day-to-day commands

```bash
docker compose up -d      # start
docker compose stop       # stop (keep data)
docker compose down       # stop and remove container (keep volume)
docker compose down -v    # full reset — wipes all data, run setup.sh again
```

---

## Redeploy class after code changes

```bash
docker cp QuestMaster.REST.Execute.cls my-iris:/tmp/

docker exec -i my-iris bash -c 'iris session IRIS -U USER' <<'EOF'
Do ##class(%SYSTEM.OBJ).Load("/tmp/QuestMaster.REST.Execute.cls","ck-d")
Halt
EOF
```

If you get a lock error:

```bash
docker exec -i my-iris bash -c 'iris session IRIS -U USER' <<'EOF'
Do ##class(%SYSTEM.OBJ).Delete("QuestMaster.REST.Execute")
Do ##class(%SYSTEM.OBJ).Load("/tmp/QuestMaster.REST.Execute.cls","ck-d")
Halt
EOF
```

---

## Verify

```bash
curl -u _SYSTEM:password http://localhost:52773/api/quest/health
# Expected: {"status":"ok","namespace":"USER"}
```
