$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupDir = Join-Path $Root ("_patch_backups\" + $Ts)
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Ensure-Dir([string]$DirPath) {
  if (-not (Test-Path -LiteralPath $DirPath)) {
    New-Item -ItemType Directory -Force -Path $DirPath | Out-Null
  }
}

function Backup-File([string]$Path) {
  if (Test-Path -LiteralPath $Path) {
    $Rel = $Path.Substring($Root.Length).TrimStart('\','/')
    # Preserve folder structure under backup dir
    $Dest = Join-Path $BackupDir $Rel
    $DestDir = Split-Path -Parent $Dest
    Ensure-Dir $DestDir
    Copy-Item -LiteralPath $Path -Destination $Dest -Force
  }
}

# Quick sanity test: try backing up layout if it exists
$Layout = Join-Path $Root "frontend\app\layout.tsx"
if (Test-Path -LiteralPath $Layout) {
  Backup-File $Layout
  Write-Host "Backup OK for: frontend\app\layout.tsx"
} else {
  Write-Host "layout.tsx not found at frontend\app\layout.tsx (this is OK)."
}

Write-Host "Backup helper ready. Re-run your main patch now."
