# Push DATABASE_URL / DIRECT_URL from .env.neon to a linked Vercel project.
# Prerequisites:
#   1. npx vercel login
#   2. .env.neon present (gitignored)
#   3. Optionally: npx vercel link  (script will link if missing)
#
# Usage (Windows PowerShell 5.x):
#   powershell -ExecutionPolicy Bypass -File .\scripts\push-neon-env-to-vercel.ps1
#   .\scripts\push-neon-env-to-vercel.ps1

# Do NOT use Stop: Vercel CLI writes version banners to stderr → NativeCommandError
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Vercel {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  # Call node/npx without treating stderr as terminating errors
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & npx --yes vercel @Args 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        Write-Host $_.Exception.Message
      } else {
        Write-Host $_
      }
    }
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prev
  }
}

$envFile = Join-Path $root ".env.neon"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.neon not found. Create it with DATABASE_URL (pooled) and DIRECT_URL (direct)."
  exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $k = $line.Substring(0, $i).Trim()
  $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
  $vars[$k] = $v
}

$pooled = $vars["DATABASE_URL"]
$direct = $vars["DIRECT_URL"]
if (-not $pooled -or -not $direct) {
  Write-Error ".env.neon must define DATABASE_URL (pooled) and DIRECT_URL (direct)."
  exit 1
}

# Remove channel_binding for broader client compatibility on Vercel
$pooled = $pooled -replace '([?&])channel_binding=require&?', '$1'
$direct = $direct -replace '([?&])channel_binding=require&?', '$1'
$pooled = $pooled -replace '[?&]$', ''
$direct = $direct -replace '[?&]$', ''
if ($pooled -notmatch 'sslmode=') {
  $pooled += ($(if ($pooled.Contains('?')) { '&' } else { '?' }) + 'sslmode=require')
}
if ($direct -notmatch 'sslmode=') {
  $direct += ($(if ($direct.Contains('?')) { '&' } else { '?' }) + 'sslmode=require')
}

$projectJson = Join-Path $root ".vercel\project.json"
$repoJson = Join-Path $root ".vercel\repo.json"
$linked = (Test-Path $projectJson) -or (Test-Path $repoJson)
if (-not $linked) {
  Write-Host "Project not linked locally. Linking to rotary-minutes2707…"
  $code = Invoke-Vercel link --yes --project rotary-minutes2707 --scope rotary-minutes-team
  if ($code -ne 0) {
    Write-Host "Auto-link failed. Run manually:"
    Write-Host "  npx vercel link --yes --project rotary-minutes2707 --scope rotary-minutes-team"
    exit 1
  }
}

$projectArgs = @("--project", "rotary-minutes2707", "--scope", "rotary-minutes-team")

Write-Host "Setting DATABASE_URL (pooled) and DIRECT_URL on production + preview…"

# Vercel 58+: --value + --yes + --force ; multi-env with comma
# Avoid piping stdin (PowerShell + npx.ps1 stderr → false NativeCommandError)
$code1 = Invoke-Vercel env add DATABASE_URL production,preview --value $pooled --yes --force --sensitive @projectArgs
$code2 = Invoke-Vercel env add DIRECT_URL production,preview --value $direct --yes --force --sensitive @projectArgs

if ($code1 -ne 0 -or $code2 -ne 0) {
  Write-Host ""
  Write-Host "Fallback: set environments one by one…"
  foreach ($envName in @("production", "preview")) {
    Invoke-Vercel env add DATABASE_URL $envName --value $pooled --yes --force --sensitive @projectArgs | Out-Null
    Invoke-Vercel env add DIRECT_URL $envName --value $direct --yes --force --sensitive @projectArgs | Out-Null
  }
}

Write-Host ""
Write-Host "Listing env vars (names only)…"
Invoke-Vercel env ls | Out-Null

Write-Host @"

Done for Neon URLs (DATABASE_URL = pooler, DIRECT_URL = direct).

Also set from Render (Dashboard → Environment) if missing:
  AUTH_SECRET, AUTH_URL, NEXTAUTH_URL, AUTH_TRUST_HOST
  NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME
  CRON_SECRET, RESEND_API_KEY, EMAIL_FROM
  STRIPE_*, AI keys, VAPID_*, etc.

Then redeploy:
  npx vercel --prod --yes
"@
