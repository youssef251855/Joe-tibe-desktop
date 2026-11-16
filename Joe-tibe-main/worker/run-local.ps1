#requires -Version 5
# =====================================================================
# Run JoeTube's extractor worker ON THIS PC (residential IP -> YouTube
# allows it) and expose it with a FREE Cloudflare quick tunnel (no account,
# no card). Then paste the printed https://xxxx.trycloudflare.com URL back
# so we can set it as WORKER_URL in Vercel.
#
# Keep BOTH PowerShell windows open while you use the site. The tunnel URL
# CHANGES every time this script restarts (quick tunnels are ephemeral).
# =====================================================================
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot   # project root (this script lives in worker/)
$Port = 8787

# 1) Start the API backend locally in its own window.
Write-Host "[1/3] Starting local backend on http://localhost:$Port ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$Root'; `$env:PORT='$Port'; `$env:NODE_ENV='production'; npx tsx backend/server.ts"
)
Write-Host "      (a second PowerShell window opened running the backend - leave it open)" -ForegroundColor DarkGray
Start-Sleep -Seconds 7

# 2) Download the standalone cloudflared binary if it isn't present yet.
$cf = Join-Path $PSScriptRoot "cloudflared.exe"
if (-not (Test-Path $cf)) {
  Write-Host "[2/3] Downloading cloudflared (standalone, no install) ..." -ForegroundColor Cyan
  Invoke-WebRequest "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}

# 3) Open the quick tunnel to the local backend and print its public URL.
Write-Host "[3/3] Opening Cloudflare quick tunnel ..." -ForegroundColor Cyan
Write-Host "      COPY the line that looks like:  https://<random>.trycloudflare.com" -ForegroundColor Yellow
Write-Host "      ...then send that URL to the assistant to finish Vercel wiring.`n" -ForegroundColor Yellow
& $cf tunnel --url "http://localhost:$Port" --no-autoupdate
