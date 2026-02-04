# Quick restart script - kills old servers and starts fresh
Write-Host "Stopping old servers..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -match "uvicorn|node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Starting fresh servers..." -ForegroundColor Green
.\run-dev.ps1
