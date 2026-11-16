#requires -Version 5
# =====================================================================
# JoeTube worker -> fly.io (free hobby) one-shot deploy.
# Run this in a NORMAL PowerShell window (Windows PowerShell / pwsh),
# NOT inside the IDE sandbox. You need (or will create) a free fly.io
# account. Building happens remotely on fly.io — you do NOT need Docker.
# =====================================================================
$ErrorActionPreference = "Stop"

# Pre-generated shared secret (must match the Vercel WORKER_KEY env).
$WorkerKey = "ee82eb00d3534f7d80c718f22043ce232be37919f739138f"
$AppName   = "joetube-worker"
$Region    = "iad"   # pick closest to your users: iad (US-East), fra (EU), sin (Asia)

# 1) Install the fly CLI if it is not present.
if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
  Write-Host "Installing fly CLI from https://fly.io ..." -ForegroundColor Cyan
  iwr https://fly.io/install.ps1 -useb | iex
  $env:Path = "$env:LOCALAPPDATA\fly\bin;$env:Path"
}
& fly version

# 2) Authenticate (opens a browser). Create a free account first if prompted:
#    https://fly.io  (needs a GitHub/Apple/Google login; a card is required by
#    fly's anti-abuse even on the free hobby plan, but you won't be charged for
#    a scale-to-zero shared-cpu app that idles).
Write-Host "`nChecking fly.io login (browser will open if you are not signed in)..." -ForegroundColor Cyan
$prev = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& fly auth whoami *> $null
$LoggedIn = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prev
if (-not $LoggedIn) { & fly auth login }

# 3) Create + deploy. `fly launch` is the robust path: it provisions the app (prompting
#    for an available name/region if the one in fly.toml is taken) then builds remotely.
Set-Location $PSScriptRoot
Write-Host "`nLaunching $AppName from $PSScriptRoot (interactive)..." -ForegroundColor Cyan
& fly launch --path . --region $Region --ha=false
# Ensure the shared secret is set on whichever app launch created/updated.
& fly secrets set "WORKER_KEY=$WorkerKey"
# Redeploy so the secret is live in the running app.
& fly deploy

# 4) Show the public URL. Vercel needs it as WORKER_URL.
Write-Host "`n==============================================================" -ForegroundColor Green
Write-Host " Your WORKER_URL is:  https://$AppName.fly.dev" -ForegroundColor Green
Write-Host " Copy that URL and send it back so we finish the Vercel wiring." -ForegroundColor Green
Write-Host "==============================================================`n" -ForegroundColor Green
& fly apps list
