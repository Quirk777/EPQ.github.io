# Production Setup Script for EPQ Assessment Platform
# Run this script to set up your production environment

Write-Host "=== EPQ Assessment Platform - Production Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "Warning: .env file already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to create a new one? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Setup cancelled" -ForegroundColor Red
        exit
    }
}

Write-Host "Step 1: Generating secure SESSION_SECRET..." -ForegroundColor Green
$sessionSecret = python -c "import secrets; print(secrets.token_hex(32))"
Write-Host "Generated!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Email Configuration" -ForegroundColor Green
Write-Host "For Gmail SMTP, you need:"
Write-Host "1. Your Gmail address"
Write-Host "2. An App-Specific Password (NOT your Gmail password)"
Write-Host "   Get one at: https://myaccount.google.com/apppasswords"
Write-Host ""

$gmailUser = Read-Host "Enter your Gmail address"
$gmailPassword = Read-Host "Enter your Gmail App Password" -AsSecureString
$gmailPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($gmailPassword)
)

Write-Host ""
Write-Host "Step 3: Application Configuration" -ForegroundColor Green
$publicUrl = Read-Host "Enter your public URL (e.g., https://yourdomain.com)"

# Create .env file
$envContent = @"
# Production Environment Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_PATH=./data/production.db

# ============================================
# SESSION SECURITY
# ============================================
SESSION_SECRET=$sessionSecret

# ============================================
# EMAIL SERVICE (Gmail SMTP)
# ============================================
GMAIL_USER=$gmailUser
GMAIL_APP_PASSWORD=$gmailPasswordPlain
GMAIL_FROM_NAME=EPQ Assessment Platform

# ============================================
# APPLICATION SETTINGS
# ============================================
ENVIRONMENT=production
PUBLIC_BASE_URL=$publicUrl
HTTPS_ONLY_COOKIES=true
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your .env file has been created with:" -ForegroundColor Cyan
Write-Host "  - Secure session secret" -ForegroundColor White
Write-Host "  - Email configuration" -ForegroundColor White
Write-Host "  - Production settings" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT SECURITY NOTES:" -ForegroundColor Yellow
Write-Host "  1. Never commit the .env file to git" -ForegroundColor White
Write-Host "  2. Keep your SESSION_SECRET safe" -ForegroundColor White
Write-Host "  3. Set up HTTPS before going live" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "  2. Initialize database: python -c 'from app.services import db; db.init_db()'" -ForegroundColor White
Write-Host "  3. Build frontend: cd frontend && npm install && npm run build" -ForegroundColor White
Write-Host "  4. Start server: uvicorn app.main:app --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host ""
