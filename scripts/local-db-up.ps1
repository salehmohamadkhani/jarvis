$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Starting local Postgres (Docker)..." -ForegroundColor Cyan
docker compose up -d postgres | Out-Host

Write-Host "Waiting for Postgres to become ready..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    docker compose exec -T postgres pg_isready -U jarvis -d jarvis | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $ready) {
  throw "Postgres did not become ready in time. Check Docker logs: docker compose logs postgres"
}

Write-Host "Applying schema (db/schema.sql)..." -ForegroundColor Cyan
Get-Content -Raw -Encoding UTF8 (Join-Path $root "db\schema.sql") | docker compose exec -T postgres psql -U jarvis -d jarvis | Out-Host

Write-Host ""
Write-Host "Local DB is ready." -ForegroundColor Green
Write-Host "DATABASE_URL (put this in .env.local):" -ForegroundColor Yellow
Write-Host "postgresql://jarvis:jarvis@localhost:5432/jarvis?sslmode=disable"
