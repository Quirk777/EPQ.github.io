# Pre-Launch Validation Script
# Run this before deploying to production

Write-Host "=== Pre-Launch Validation ===" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check 1: .env file exists
Write-Host "Checking .env configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    $errors += ".env file not found. Run setup-production.ps1 first"
} else {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "CHANGE_ME") {
        $errors += "SESSION_SECRET still contains CHANGE_ME placeholder"
    }
    
    if ($envContent -match "SESSION_SECRET=dev-only") {
        $errors += "Using development SESSION_SECRET in production"
    }
    
    if (-not ($envContent -match "GMAIL_USER=.+@")) {
        $warnings += "GMAIL_USER not configured - email features will not work"
    }
    
    if (-not ($envContent -match "GMAIL_APP_PASSWORD=.+")) {
        $warnings += "GMAIL_APP_PASSWORD not configured - email features will not work"
    }
    
    if ($envContent -match "ENVIRONMENT=development") {
        $warnings += "ENVIRONMENT is set to 'development' - should be 'production'"
    }
}

# Check 2: Dependencies installed
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
try {
    python -c "import fastapi, uvicorn, passlib, slowapi" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $errors += "Python dependencies not installed. Run: pip install -r requirements.txt"
    }
} catch {
    $errors += "Python not found or dependencies not installed"
}

# Check 3: Frontend built
Write-Host "Checking frontend build..." -ForegroundColor Yellow
if (-not (Test-Path "./frontend/.next")) {
    $warnings += "Frontend not built. Run: cd frontend && npm run build"
}

# Check 4: Database initialized
Write-Host "Checking database..." -ForegroundColor Yellow
$dbPath = $env:DB_PATH
if (-not $dbPath) {
    $dbPath = "./epq.db"
}
if (-not (Test-Path $dbPath)) {
    $warnings += "Database not initialized. Run: python -c 'from app.services import db; db.init_db()'"
}

# Check 5: Security settings
Write-Host "Checking security settings..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if (-not ($envContent -match "HTTPS_ONLY_COOKIES=true")) {
        $warnings += "HTTPS_ONLY_COOKIES not enabled - should be 'true' in production"
    }
}

# Check 6: Gitignore
Write-Host "Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if (-not ($gitignoreContent -match "\.env")) {
        $warnings += ".env not in .gitignore - SECURITY RISK!"
    }
} else {
    $warnings += ".gitignore not found - create one to prevent committing secrets"
}

Write-Host ""
Write-Host "=== Validation Results ===" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You're ready to deploy to production!" -ForegroundColor Green
    exit 0
}

if ($errors.Count -gt 0) {
    Write-Host "ERRORS (must fix before deploying):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  ✗ $error" -ForegroundColor Red
    }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS (recommended to fix):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  ⚠ $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($errors.Count -gt 0) {
    Write-Host "Fix all errors before deploying!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "No critical errors, but check warnings above" -ForegroundColor Yellow
    exit 0
}
