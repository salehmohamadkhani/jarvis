$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Building + starting Jarvis Whisper (local image, ~hundreds MB not 2GB pull)..." -ForegroundColor Cyan
docker compose --profile whisper up -d --build whisper
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker compose failed. Is Docker Desktop running?" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Whisper ASR: http://localhost:9000/docs" -ForegroundColor Green
Write-Host "Add to .env.local on the machine that runs npm run start:" -ForegroundColor Yellow
Write-Host "  WHISPER_LOCAL_URL=http://localhost:9000/asr" -ForegroundColor White
Write-Host ""
Write-Host "First run may download the model (several minutes). Logs: npm run whisper:logs" -ForegroundColor DarkGray
