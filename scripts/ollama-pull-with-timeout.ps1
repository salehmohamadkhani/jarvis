# Run from PowerShell. Uses longer pull timeout (if your Ollama build supports OLLAMA_PULL_TIMEOUT).
# Example: .\scripts\ollama-pull-with-timeout.ps1 qwen2.5:3b
param(
    [string]$Model = "qwen2.5:3b",
    [int]$PullTimeoutSec = 900
)

$ErrorActionPreference = "Stop"
$ollama = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollama)) {
    Write-Error "Ollama not found at $ollama"
}

$env:OLLAMA_PULL_TIMEOUT = "$PullTimeoutSec"
# Uncomment if you use a local HTTPS proxy (Clash, v2rayN, etc.):
# $env:HTTPS_PROXY = "http://127.0.0.1:7890"

Write-Host "OLLAMA_PULL_TIMEOUT=$env:OLLAMA_PULL_TIMEOUT"
Write-Host "Running: $ollama pull $Model"
& $ollama pull $Model
