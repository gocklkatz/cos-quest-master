# setup.ps1 - one-time initialisation for the Quest Master IRIS container.
# Pulls the image, starts the container, and configures IRIS.
# Safe to re-run: password change and web-app creation are idempotent guards.
#
# Usage: .\setup.ps1 [ContainerName] [NewPassword]

param(
    [string]$Container = "my-iris",
    [string]$NewPassword = "password"
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

# -- 1. Pull image and start container ----------------------------------------
Write-Host "Pulling IRIS image..."
docker compose -f "$ScriptDir\docker-compose.yml" pull

Write-Host "Starting IRIS container..."
docker compose -f "$ScriptDir\docker-compose.yml" up -d

# -- 2. Wait for IRIS to be healthy -------------------------------------------
Write-Host "Waiting for IRIS to be healthy..."
for ($i = 1; $i -le 30; $i++) {
    $status = docker inspect --format='{{.State.Health.Status}}' $Container 2>$null
    if ($LASTEXITCODE -ne 0) { $status = "missing" }
    if ($status -eq "healthy") {
        Write-Host "IRIS is healthy."
        break
    }
    if ($i -eq 30) {
        Write-Error "ERROR: container '$Container' did not become healthy within 5 minutes."
        exit 1
    }
    Write-Host "  ($i/30) status=$status - waiting 10s..."
    Start-Sleep -Seconds 10
}

# -- 3. Change _SYSTEM password -----------------------------------------------
Write-Host "Setting _SYSTEM password..."
$passwordScript = @'
Do ##class(Security.Users).Get("_SYSTEM",.props)
Set props("Password")="IRIS_NEW_PASSWORD"
Do ##class(Security.Users).Modify("_SYSTEM",.props)
Write "Password set to: IRIS_NEW_PASSWORD", !
Halt
'@ -replace 'IRIS_NEW_PASSWORD', $NewPassword
$passwordScript | docker exec -i $Container bash -c 'iris session IRIS -U %SYS'

# -- 4. Deploy QuestMaster REST class -----------------------------------------
Write-Host "Deploying QuestMaster.REST.Execute..."
docker cp "$ScriptDir\QuestMaster.REST.Execute.cls" "${Container}:/tmp/"
@'
Do ##class(%SYSTEM.OBJ).Load("/tmp/QuestMaster.REST.Execute.cls","ck-d")
Halt
'@ | docker exec -i $Container bash -c 'iris session IRIS -U USER'

# -- 5. Register /api/quest/ web application ----------------------------------
Write-Host "Registering /api/quest/ web application..."
@'
Set appName = "/api/quest/"
If ##class(Security.Applications).Exists(appName) Write "Web app already registered - skipping.", ! Halt
Set props("DispatchClass") = "QuestMaster.REST.Execute"
Set props("NameSpace") = "USER"
Set props("Enabled") = 1
Set props("AutheEnabled") = 32
Set props("CORSAllowed") = 1
Set sc = ##class(Security.Applications).Create(appName, .props)
If $System.Status.IsError(sc) Write "ERROR: " _ $System.Status.GetErrorText(sc), ! Halt
Write "Web app registered: " _ appName, !
Halt
'@ | docker exec -i $Container bash -c 'iris session IRIS -U %SYS'

# -- 6. Verify ----------------------------------------------------------------
Write-Host ""
Write-Host "Verifying health endpoint..."
try {
    $cred = New-Object System.Management.Automation.PSCredential(
        "_SYSTEM",
        (ConvertTo-SecureString $NewPassword -AsPlainText -Force)
    )
    $response = Invoke-WebRequest -Uri "http://localhost:52773/api/quest/health" `
        -Credential $cred `
        -UseBasicParsing
    $httpCode = $response.StatusCode
} catch {
    $httpCode = 0
}

if ($httpCode -eq 200) {
    Write-Host "Setup complete! Health check returned HTTP 200."
    Write-Host ""
    Write-Host "  IRIS Management Portal : http://localhost:52773/csp/sys/UtilHome.csp"
    Write-Host "  Quest Master API       : http://localhost:52773/api/quest/health"
    Write-Host "  Credentials            : _SYSTEM / $NewPassword"
} else {
    Write-Warning "Health check returned HTTP $httpCode - check container logs."
    exit 1
}
