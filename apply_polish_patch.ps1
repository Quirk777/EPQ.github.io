$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupDir = Join-Path $Root ("_patch_backups\" + $Ts)
[System.IO.Directory]::CreateDirectory($BackupDir) | Out-Null

$Touched = New-Object System.Collections.Generic.List[string]
function Note([string]$s){ Write-Host $s }

function Backup-File([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $Rel = $Path.Substring($Root.Length).TrimStart('\','/')
  $Rel = $Rel -replace '/', '\'
  $Dest = Join-Path $BackupDir $Rel
  $DestDir = Split-Path -Parent $Dest
  [System.IO.Directory]::CreateDirectory($DestDir) | Out-Null
  Copy-Item -LiteralPath $Path -Destination $Dest -Force
}

function Read-Raw([string]$Path) {
  Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
}

function Write-UTF8([string]$Path, [string]$Content) {
  $Dir = Split-Path -Parent $Path
  [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

function Find-First([string[]]$Candidates) {
  foreach ($c in $Candidates) {
    $p = Join-Path $Root $c
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Find-ByName([string]$Like) {
  $hit = Get-ChildItem -LiteralPath $Root -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\|\\\.next\\|\\\.git\\|\\venv\\|\\__pycache__\\" } |
    Where-Object { $_.Name -like $Like } |
    Select-Object -First 1
  if ($hit) { return $hit.FullName }
  return $null
}

function Replace-Regex([string]$Path, [string]$Pattern, [string]$Replacement) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $raw = Read-Raw $Path
  $new = [regex]::Replace($raw, $Pattern, $Replacement, "Singleline")
  if ($new -ne $raw) {
    Backup-File $Path
    Write-UTF8 $Path $new
    return $true
  }
  return $false
}

function Replace-Literals([string]$Path, [hashtable]$Map) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $raw = Read-Raw $Path
  $new = $raw
  foreach ($k in $Map.Keys) { $new = $new.Replace($k, $Map[$k]) }
  if ($new -ne $raw) {
    Backup-File $Path
    Write-UTF8 $Path $new
    return $true
  }
  return $false
}

# -------------------------------------------------
# 1) Create components + design system
# -------------------------------------------------
$SpinnerPath = Join-Path $Root "frontend\app\_components\LoadingSpinner.tsx"
$AlertPath   = Join-Path $Root "frontend\app\_components\Alert.tsx"
$DesignPath  = Join-Path $Root "frontend\app\_lib\design.ts"

Backup-File $SpinnerPath
Write-UTF8 $SpinnerPath @"
export default function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        border: "2px solid #e5e7eb",
        borderTopColor: "#111",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite"
      }}
    />
  );
}
"@
$Touched.Add("created/updated: frontend/app/_components/LoadingSpinner.tsx") | Out-Null

Backup-File $AlertPath
Write-UTF8 $AlertPath @"
import * as React from "react";

type AlertProps = {
  type: "error" | "success" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  onRetry?: () => void;
};

export default function Alert({ type, title, children, onRetry }: AlertProps) {
  const styles: Record<string, React.CSSProperties> = {
    error:   { border: "1px solid #fca5a5", background: "#fef2f2", color: "#991b1b" },
    success: { border: "1px solid #86efac", background: "#f0fdf4", color: "#166534" },
    warning: { border: "1px solid #fde047", background: "#fefce8", color: "#854d0e" },
    info:    { border: "1px solid #93c5fd", background: "#eff6ff", color: "#1e40af" }
  };

  return (
    <div style={{ ...styles[type], padding: 14, borderRadius: 12, marginTop: 14 }}>
      {title && <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>}
      <div>{children}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 10,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid currentColor",
            background: "white",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
"@
$Touched.Add("created/updated: frontend/app/_components/Alert.tsx") | Out-Null

Backup-File $DesignPath
Write-UTF8 $DesignPath @"
export const colors = {
  primary: "#111",
  primaryHover: "#1f1f1f",
  text: "#0b1220",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  background: "#fafafa",
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  error: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#854d0e" },
  info: { bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" }
};

export const btn = {
  primary: {
    padding: "10px 16px",
    borderRadius: 12,
    border: `1px solid ${colors.primary}`,
    background: colors.primary,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s"
  },
  secondary: {
    padding: "10px 16px",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    color: colors.primary,
    fontWeight: 700,
    cursor: "pointer"
  }
};

export const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
};
"@
$Touched.Add("created/updated: frontend/app/_lib/design.ts") | Out-Null

# -------------------------------------------------
# 2) Patch layout.tsx: add spin + shimmer keyframes
# -------------------------------------------------
$Layout = Find-First @(
  "frontend\app\layout.tsx",
  "frontend\src\app\layout.tsx",
  "app\layout.tsx"
)

if ($Layout) {
  $raw = Read-Raw $Layout
  $needSpin = ($raw -notmatch "@keyframes\s+spin")
  $needShimmer = ($raw -notmatch "@keyframes\s+shimmer")

  if ($needSpin -or $needShimmer) {
    $styleBlock = @"
<style>{`
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
`}</style>
"@

    $new = $raw
    if ($raw -match "<head>") {
      $new = [regex]::Replace($raw, "<head>", "<head>$styleBlock", "Singleline")
    } elseif ($raw -match "</head>") {
      $new = [regex]::Replace($raw, "</head>", "$styleBlock</head>", "Singleline")
    } else {
      # fallback: append
      $new = $raw + [Environment]::NewLine + $styleBlock
    }

    if ($new -ne $raw) {
      Backup-File $Layout
      Write-UTF8 $Layout $new
      $Touched.Add(("patched: " + $Layout.Substring($Root.Length).TrimStart('\','/'))) | Out-Null
    }
  } else {
    Note "layout.tsx already contains keyframes."
  }
} else {
  Note "layout.tsx not found, skipping keyframes."
}

# -------------------------------------------------
# 3) Fix safeJson recursion in DashboardClient.tsx
# -------------------------------------------------
$Dash = Find-First @(
  "frontend\app\employer\dashboard\DashboardClient.tsx",
  "frontend\src\app\employer\dashboard\DashboardClient.tsx"
)
if (-not $Dash) { $Dash = Find-ByName "DashboardClient.tsx" }

if ($Dash) {
  $pattern = "async\s+function\s+safeJson\s*\(\s*res\s*:\s*Response\s*\)\s*\{.*?\}"
  $replacement = @"
async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json();
  }
  const text = await res.text().catch(() => "");
  const msg = text && text.trim() ? text.trim() : (res.statusText || "Request failed");
  throw new Error(`[${res.status}] ${msg}`);
}
"@
  if (Replace-Regex $Dash $pattern $replacement) {
    $Touched.Add(("patched: " + $Dash.Substring($Root.Length).TrimStart('\','/'))) | Out-Null
  } else {
    Note "safeJson block not found in DashboardClient.tsx; no change made."
  }
} else {
  Note "DashboardClient.tsx not found; skipping safeJson fix."
}

# -------------------------------------------------
# 4) Mojibake cleanup in likely files
# -------------------------------------------------
$Map = @{
  "LoadingÃ¢â‚¬Â¦" = "Loading...";
  "Loading…"      = "Loading...";
  "Ã¢â‚¬â€"        = "-";
  "—"             = "-";
  "✓"             = "OK";
  "✅"             = "";
  "⏳"             = "";
  "✕"             = "X";
}

$Likely = @()
$Likely += (Find-First @("frontend\app\employer\dashboard\DashboardClient.tsx"))
$Likely += (Find-First @("frontend\app\applicant\[aid]\page.tsx"))
$Likely += (Find-First @("frontend\app\employer\page.tsx"))
$Likely += (Find-First @("frontend\app\page.tsx"))

$Likely = $Likely | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

foreach ($f in $Likely) {
  if (Replace-Literals $f $Map) {
    $Touched.Add(("mojibake cleaned: " + $f.Substring($Root.Length).TrimStart('\','/'))) | Out-Null
  }
}

# -------------------------------------------------
# Summary
# -------------------------------------------------
Note ""
Note "================ PATCH SUMMARY ================"
Note ("Backups: " + $BackupDir)
if ($Touched.Count -eq 0) {
  Note "No files changed."
} else {
  foreach ($x in $Touched) { Note $x }
}
Note "============================================="
