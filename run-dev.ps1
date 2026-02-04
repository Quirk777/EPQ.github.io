# run-dev.ps1
Set-Location "C:\Users\tchol\OneDrive\Attachments\python_project"

Write-Host "Starting EPQ development servers..." -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan

# ---- BACKEND window ----
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  @'
cd "C:\Users\tchol\OneDrive\Attachments\python_project"
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:SESSION_SECRET="dev-only-change-me"
$env:WKHTMLTOPDF_PATH="C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
$env:PYTHONPATH = (Get-Location).Path

Write-Host "WKHTMLTOPDF_PATH set to: $env:WKHTMLTOPDF_PATH" -ForegroundColor Green
Write-Host "Starting backend server..." -ForegroundColor Yellow
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
'@
)

# ---- FRONTEND window ----
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  @'
cd "C:\Users\tchol\OneDrive\Attachments\python_project\frontend"
npm run dev
'@
)
