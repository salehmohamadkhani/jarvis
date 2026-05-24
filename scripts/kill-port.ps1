$ErrorActionPreference = "SilentlyContinue"

param(
  [int]$Port = 3001
)

$pids = Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($pid in $pids) {
  Write-Host ("Stopping PID {0} on port {1}..." -f $pid, $Port)
  Stop-Process -Id $pid -Force
}

if (-not $pids) {
  Write-Host ("Port {0} is free." -f $Port)
}

