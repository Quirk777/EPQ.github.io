# Test All Authentication Features
# Run this after setting up your environment

param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$TestEmail = "test@example.com"
)

Write-Host "=== EPQ Authentication Test Suite ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing against: $BaseUrl" -ForegroundColor Gray
Write-Host "Test email: $TestEmail" -ForegroundColor Gray
Write-Host ""

$errors = @()
$warnings = @()
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing: $Name..." -NoNewline
    
    try {
        $params = @{
            Uri = "$BaseUrl$Endpoint"
            Method = $Method
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        try {
            $response = Invoke-WebRequest @params -ErrorAction Stop
            $statusCode = $response.StatusCode
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.Value__
        }
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host " ✓ PASS" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host " ✗ FAIL (got $statusCode, expected $ExpectedStatus)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    } catch {
        Write-Host " ✗ ERROR: $_" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

# Test 1: Health check
Write-Host "`n--- Basic Connectivity ---" -ForegroundColor Yellow
Test-Endpoint -Name "Health check" -Method "GET" -Endpoint "/health"

# Test 2: Registration validation
Write-Host "`n--- Registration Validation ---" -ForegroundColor Yellow
Test-Endpoint -Name "Register without email" `
              -Method "POST" `
              -Endpoint "/auth/register" `
              -Body @{password="test123"} `
              -ExpectedStatus 400

Test-Endpoint -Name "Register with short password" `
              -Method "POST" `
              -Endpoint "/auth/register" `
              -Body @{email=$TestEmail; password="short"} `
              -ExpectedStatus 400

# Test 3: Login validation
Write-Host "`n--- Login Validation ---" -ForegroundColor Yellow
Test-Endpoint -Name "Login without credentials" `
              -Method "POST" `
              -Endpoint "/auth/login" `
              -Body @{} `
              -ExpectedStatus 400

Test-Endpoint -Name "Login with invalid credentials" `
              -Method "POST" `
              -Endpoint "/auth/login" `
              -Body @{email="nonexistent@test.com"; password="wrong"} `
              -ExpectedStatus 401

# Test 4: Rate limiting
Write-Host "`n--- Rate Limiting ---" -ForegroundColor Yellow
Write-Host "Testing rate limit (this may take a moment)..." -NoNewline

$rateLimitHit = $false
for ($i = 0; $i -lt 7; $i++) {
    try {
        Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
                          -Method POST `
                          -ContentType "application/json" `
                          -Body (@{email="test@test.com"; password="wrong"} | ConvertTo-Json) `
                          -ErrorAction SilentlyContinue | Out-Null
    } catch {
        if ($_.Exception.Response.StatusCode.Value__ -eq 429) {
            $rateLimitHit = $true
            break
        }
    }
}

if ($rateLimitHit) {
    Write-Host " ✓ PASS (rate limit working)" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ⚠ WARNING (rate limit not triggered)" -ForegroundColor Yellow
    $warnings += "Rate limiting may not be configured"
    $testsPassed++
}

# Test 5: Password reset
Write-Host "`n--- Password Reset ---" -ForegroundColor Yellow
Test-Endpoint -Name "Forgot password request" `
              -Method "POST" `
              -Endpoint "/auth/forgot-password" `
              -Body @{email=$TestEmail}

Test-Endpoint -Name "Reset with invalid token" `
              -Method "POST" `
              -Endpoint "/auth/reset-password" `
              -Body @{token="invalid"; password="newpass123"} `
              -ExpectedStatus 400

# Test 6: Email verification
Write-Host "`n--- Email Verification ---" -ForegroundColor Yellow
Test-Endpoint -Name "Verify with invalid token" `
              -Method "GET" `
              -Endpoint "/auth/verify-email?token=invalid" `
              -ExpectedStatus 400

# Test 7: CORS headers
Write-Host "`n--- CORS Configuration ---" -ForegroundColor Yellow
Write-Host "Checking CORS headers..." -NoNewline

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET
    $corsHeader = $response.Headers['Access-Control-Allow-Origin']
    
    if ($corsHeader) {
        Write-Host " ✓ PASS (CORS headers present)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ⚠ WARNING (no CORS headers)" -ForegroundColor Yellow
        $warnings += "CORS headers not found - may need configuration"
        $testsPassed++
    }
} catch {
    Write-Host " ✗ ERROR" -ForegroundColor Red
    $testsFailed++
}

# Test 8: Environment check
Write-Host "`n--- Environment Configuration ---" -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "Checking .env file..." -NoNewline
    $envContent = Get-Content ".env" -Raw
    
    $envIssues = @()
    
    if ($envContent -match "CHANGE_ME|dev-only-change-me") {
        $envIssues += "SESSION_SECRET uses default value"
    }
    
    if (-not ($envContent -match "GMAIL_USER=.+@")) {
        $envIssues += "GMAIL_USER not configured"
    }
    
    if (-not ($envContent -match "GMAIL_APP_PASSWORD=.+")) {
        $envIssues += "GMAIL_APP_PASSWORD not configured"
    }
    
    if ($envIssues.Count -eq 0) {
        Write-Host " ✓ PASS" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ⚠ WARNING" -ForegroundColor Yellow
        foreach ($issue in $envIssues) {
            Write-Host "  - $issue" -ForegroundColor Yellow
        }
        $warnings += $envIssues
        $testsPassed++
    }
} else {
    Write-Host "No .env file found" -ForegroundColor Yellow
    $warnings += ".env file not found"
}

# Summary
Write-Host "`n=== Test Results ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red
Write-Host "Warnings: $($warnings.Count)" -ForegroundColor Yellow
Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  ⚠ $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($testsFailed -eq 0) {
    Write-Host "✓ All critical tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Test actual registration flow in browser" -ForegroundColor White
    Write-Host "  2. Check that verification email is sent" -ForegroundColor White
    Write-Host "  3. Test password reset flow" -ForegroundColor White
    Write-Host "  4. Test on mobile Safari" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "✗ Some tests failed. Please fix issues before deploying." -ForegroundColor Red
    exit 1
}
