# verify.ps1 - verifies that the IRIS Docker setup is working correctly.
# Run this after .\setup.ps1 to confirm everything is healthy.
# Usage: .\verify.ps1 [ContainerName] [Password]

param(
    [string]$Container = "my-iris",
    [string]$Password = "password"
)

$ErrorActionPreference = "Stop"

function Pass($msg) { Write-Host "   OK $msg" }
function Fail($msg) { Write-Error "ERROR: $msg"; exit 1 }

$cred = New-Object System.Management.Automation.PSCredential(
    "_SYSTEM",
    (ConvertTo-SecureString $Password -AsPlainText -Force)
)

Write-Host "Verifying IRIS setup (container: $Container)"
Write-Host ""

# 1. Container is running
Write-Host "1. Container running..."
$running = docker ps --format '{{.Names}}' | Where-Object { $_ -eq $Container }
if (-not $running) { Fail "Container '$Container' is not running. Run: docker compose up -d" }
Pass "Container running"

# 2. Container is healthy
Write-Host "2. Container health..."
$status = docker inspect --format='{{.State.Health.Status}}' $Container 2>$null
if ($LASTEXITCODE -ne 0) { $status = "missing" }
if ($status -ne "healthy") { Fail "Container health is '$status', expected 'healthy'. Check: docker logs $Container" }
Pass "Container healthy"

# 3. Health endpoint returns 200 with correct JSON
Write-Host "3. Health endpoint..."
try {
    $healthResp = Invoke-WebRequest -Uri "http://localhost:52773/api/quest/health" `
        -Credential $cred -UseBasicParsing
} catch {
    Fail "Health endpoint unreachable. Is port 52773 forwarded?"
}
if ($healthResp.Content -notmatch '"status":"ok"') {
    Fail "Health endpoint returned unexpected body: $($healthResp.Content)"
}
Pass "Health endpoint OK -- $($healthResp.Content)"

# 4. Execute endpoint runs ObjectScript
Write-Host "4. Execute endpoint..."
try {
    $execResp = Invoke-WebRequest -Uri "http://localhost:52773/api/quest/execute" `
        -Method POST `
        -Credential $cred `
        -ContentType "application/json" `
        -Body '{"code":"WRITE \"verify-ok\", !"}' `
        -UseBasicParsing
} catch {
    Fail "Execute endpoint unreachable."
}
if ($execResp.Content -notmatch '"success":1') {
    Fail "Execute endpoint did not succeed. Response: $($execResp.Content)"
}
if ($execResp.Content -notmatch "verify-ok") {
    Fail "Execute output missing expected text. Response: $($execResp.Content)"
}
Pass "Execute endpoint OK"

Write-Host ""
Write-Host "All checks passed. IRIS setup is correct."
