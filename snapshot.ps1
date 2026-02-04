$ErrorActionPreference="Stop"

$NL    = [Environment]::NewLine
$FENCE = "```"

$Exclude = @(
  "node_modules",".next",".git","venv","__pycache__",
  ".pytest_cache","dist","build",".turbo"
)

$ExtOk = @(
  "py","js","jsx","ts","tsx","json","md",
  "yml","yaml","toml","sql","env","txt",
  "html","css"
)

function SkipPath([string]$p){
  foreach($d in $Exclude){
    if($p -like "*\$d\*" -or $p -like "*/$d/*"){ return $true }
  }
  return $false
}

function ReadHead([string]$p,[int]$n=200){
  try{
    $lines = Get-Content -LiteralPath $p -ErrorAction Stop
    if($lines.Count -gt $n){
      $head = ($lines[0..($n-1)] -join $NL)
      return $head + $NL + "... [truncated]"
    }
    return ($lines -join $NL)
  }catch{
    return "[unreadable: $($_.Exception.Message)]"
  }
}

function ScanText([string[]]$needles,[string]$label){
  $hits = New-Object System.Collections.Generic.List[string]

  Get-ChildItem -Recurse -Force -File |
    Where-Object { -not (SkipPath $_.FullName) } |
    Where-Object {
      $e = $_.Extension.TrimStart(".").ToLower()
      $ExtOk -contains $e
    } |
    ForEach-Object {
      foreach($n in $needles){
        $m = Select-String -LiteralPath $_.FullName `
             -Pattern $n -SimpleMatch `
             -ErrorAction SilentlyContinue
        foreach($h in $m){
          $rel = $h.Path.Substring($Root.Length).TrimStart('\','/')
          $hits.Add(("{0}:{1}: {2}" -f $rel,$h.LineNumber,$h.Line.Trim()))
        }
      }
    }

  if($hits.Count -eq 0){ return "No hits for $label." }
  return (($hits | Select-Object -First 200) -join $NL)
}

$Root = (Get-Location).Path
$Out  = Join-Path $Root "PROJECT_SNAPSHOT.md"
$now  = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$psv  = $PSVersionTable.PSVersion.ToString()

# Tree (depth limit)
$maxDepth = 5
$tree = New-Object System.Collections.Generic.List[string]

Get-ChildItem -Recurse -Force -File |
  Where-Object { -not (SkipPath $_.FullName) } |
  ForEach-Object {
    $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
    $depth = ($rel -split '[\\/]').Count - 1
    if($depth -le $maxDepth){ $tree.Add($rel) }
  }

$treeText = ($tree | Sort-Object) -join $NL

# Entry suspects
$entryRel = @(
  "main.py","app.py","server.py","backend\main.py",
  "backend\app\main.py","package.json","frontend\package.json",
  "next.config.js","frontend\next.config.js"
)

$entry = @()
foreach($p in $entryRel){
  $full = Join-Path $Root $p
  if(Test-Path -LiteralPath $full){ $entry += $p }
}

if($entry.Count -eq 0){ $entryText = "No obvious entry files found." }
else { $entryText = ($entry -join $NL) }

# Scans (simple strings, no regex pipes)
$fastApi = ScanText @(
  "@app.get","@app.post","@app.put","@app.delete",
  "APIRouter(","include_router"
) "FastAPI routes"

$nextJs = ScanText @(
  "app/","pages/","route.ts","route.js",
  "export default function"
) "Next.js routes/components"

$db = ScanText @(
  "sqlite","SQLAlchemy","CREATE TABLE",
  "INSERT INTO","SELECT "," db."
) "Database usage"

$pdf = ScanText @(
  "wkhtml","weasyprint","reportlab",
  "generate_pdf","render_pdf","pdf"
) "PDF generation"

$auth = ScanText @(
  "login","JWT","bcrypt","session","auth",
  "cookie","password","hash"
) "Auth"

$todo = ScanText @(
  "TODO","FIXME","NEXT STEP","HACK"
) "TODO/FIXME"

# Key files (optional)
$keyRel = @(
  "backend\main.py",
  "backend\app\main.py",
  "backend\app\routes\employer.py",
  "backend\app\routes\applicant.py",
  "frontend\package.json",
  "frontend\app\layout.tsx",
  "frontend\app\page.tsx"
)

$key = @()
foreach($p in $keyRel){
  $full = Join-Path $Root $p
  if(Test-Path -LiteralPath $full){ $key += $full }
}

# Build markdown
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# Project Snapshot")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- Generated: $now")
[void]$sb.AppendLine("- PowerShell: $psv")
[void]$sb.AppendLine("- Root: $Root")
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Tree (depth <= $maxDepth)")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($treeText)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Entry Points")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($entryText)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## FastAPI Routes")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($fastApi)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Next.js Routes")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($nextJs)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Database")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($db)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## PDF")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($pdf)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Auth")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($auth)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## TODO/FIXME")
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine($todo)
[void]$sb.AppendLine($FENCE)
[void]$sb.AppendLine("")

[void]$sb.AppendLine("## Key File Previews (first 200 lines)")
foreach($f in $key){
  $rel = $f.Substring($Root.Length).TrimStart('\','/')
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("### $rel")
  [void]$sb.AppendLine($FENCE)
  [void]$sb.AppendLine((ReadHead $f 200))
  [void]$sb.AppendLine($FENCE)
}

Set-Content -LiteralPath $Out -Value $sb.ToString() -Encoding UTF8
Write-Host "OK: $Out"
