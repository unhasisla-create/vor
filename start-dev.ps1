# ─────────────────────────────────────────────────────────────────
# VOR System - Development Startup Script
# Automatically ensures PostgreSQL is running before starting Next.js
# ─────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
  Write-Host "`n>>> $msg" -ForegroundColor Cyan
}

function Find-PostgresService {
  $svc = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue
  if (-not $svc) {
    # Try common install paths for pg_ctl
    $pgPaths = @(
      "${env:ProgramFiles}\PostgreSQL\*\bin\pg_ctl.exe",
      "${env:ProgramFiles(x86)}\PostgreSQL\*\bin\pg_ctl.exe"
    )
    foreach ($pattern in $pgPaths) {
      $exe = Resolve-Path $pattern -ErrorAction SilentlyContinue
      if ($exe) { return $null, $exe.Path } # no service, but has pg_ctl
    }
    return $null, $null
  }
  return $svc, $null
}

function Ensure-PostgresRunning {
  # Try quick TCP test first
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.ConnectAsync('127.0.0.1', 5432).Wait(1000) | Out-Null
    if ($tcp.Connected) { $tcp.Close(); return $true }
    $tcp.Close()
  } catch {}

  Write-Host "  PostgreSQL is NOT responding on port 5432." -ForegroundColor Yellow

  $svc, $pgCtl = Find-PostgresService

  if ($svc) {
    Write-Host "  Found service: $($svc.Name) (status: $($svc.Status))" -ForegroundColor Gray
    if ($svc.Status -ne 'Running') {
      Write-Step "Starting PostgreSQL service..."
      Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
      if (-not $?) {
        # Try as admin
        try {
          Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -Command Start-Service -Name '$($svc.Name)'" -Wait
        } catch {
          Write-Host "  Failed to start service automatically." -ForegroundColor Red
          return $false
        }
      }
    }
  } elseif ($pgCtl) {
    Write-Step "Starting PostgreSQL via pg_ctl..."
    $pgData = "${env:LOCALAPPDATA}\PostgreSQL\data"
    if (Test-Path $pgData) {
      Start-Process -FilePath $pgCtl -ArgumentList "start -D `"$pgData`" -l `"$pgData\pg_log\startup.log`"" -NoNewWindow -Wait
    } else {
      Write-Host "  PostgreSQL data directory not found at $pgData" -ForegroundColor Red
      return $false
    }
  } else {
    Write-Host "  PostgreSQL is not installed or not found." -ForegroundColor Red
    return $false
  }

  # Wait for PostgreSQL to be ready (max 15 seconds)
  Write-Host "  Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
  for ($i = 0; $i -lt 15; $i++) {
    try {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $tcp.ConnectAsync('127.0.0.1', 5432).Wait(1000) | Out-Null
      if ($tcp.Connected) { $tcp.Close(); return $true }
      $tcp.Close()
    } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

# ─── Main ───────────────────────────────────────────────────────
Write-Step "VOR System - Starting Development Environment"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

$dbOk = Ensure-PostgresRunning
if (-not $dbOk) {
  Write-Host "`n" -NoNewline
  Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
  Write-Host "║  Cannot connect to PostgreSQL at 127.0.0.1:5432        ║" -ForegroundColor Red
  Write-Host "║                                                        ║" -ForegroundColor Red
  Write-Host "║  Please start PostgreSQL manually:                      ║" -ForegroundColor Red
  Write-Host "║  1. Open Services (services.msc)                       ║" -ForegroundColor Red
  Write-Host "║  2. Find and start the PostgreSQL service              ║" -ForegroundColor Red
  Write-Host "║  3. Then run: npm run dev                              ║" -ForegroundColor Red
  Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Red
  exit 1
}

Write-Host "  PostgreSQL is ready." -ForegroundColor Green
Write-Step "Starting Next.js dev server..."
Write-Host ""

npx next dev -p 3000
