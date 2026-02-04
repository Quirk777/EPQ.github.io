# Database Backup Script
# Run this daily to back up your production database

param(
    [string]$BackupDir = "./backups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dbPath = $env:DB_PATH
if (-not $dbPath) {
    $dbPath = "./epq.db"
}

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Create backup filename
$backupFile = Join-Path $BackupDir "epq_backup_$timestamp.db"

Write-Host "Backing up database..." -ForegroundColor Cyan
Write-Host "Source: $dbPath" -ForegroundColor Gray
Write-Host "Destination: $backupFile" -ForegroundColor Gray

try {
    Copy-Item $dbPath $backupFile -ErrorAction Stop
    Write-Host "Backup successful!" -ForegroundColor Green
    
    # Delete backups older than 30 days
    $cutoffDate = (Get-Date).AddDays(-30)
    Get-ChildItem $BackupDir -Filter "epq_backup_*.db" | 
        Where-Object { $_.LastWriteTime -lt $cutoffDate } |
        ForEach-Object {
            Write-Host "Deleting old backup: $($_.Name)" -ForegroundColor Yellow
            Remove-Item $_.FullName
        }
    
} catch {
    Write-Host "Backup failed: $_" -ForegroundColor Red
    exit 1
}
