param(
  [string]$OutDir = "backups",
  [int]$KeepDays = 7
)

$envFile = Join-Path $PSScriptRoot '..' '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^(?<k>[A-Za-z0-9_]+)=(?<v>.*)$') {
      $key = $Matches['k']
      $val = $Matches['v']
      if (-not [string]::IsNullOrEmpty($key)) { $env:$key = $val }
    }
  }
}

$DATABASE_URL = $env:DATABASE_URL
if (-not $DATABASE_URL) {
  Write-Host "DATABASE_URL not set. Exiting." -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$outFile = Join-Path $OutDir "backup_$ts.sql"

# Use dockerized pg_dump if using local compose, else rely on psql in PATH
if ($DATABASE_URL -match 'localhost:5433' -or $DATABASE_URL -match 'postgres:5432') {
  docker exec horizons-pos5-postgres-1 pg_dump $DATABASE_URL > $outFile
} else {
  pg_dump $DATABASE_URL > $outFile
}

Write-Host "Backup written: $outFile" -ForegroundColor Green

# Retention cleanup
Get-ChildItem $OutDir -Filter 'backup_*.sql' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "Old backups older than $KeepDays day(s) removed."
