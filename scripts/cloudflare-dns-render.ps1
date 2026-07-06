# Pointe clubminutes.api.mg vers Render
# PREREQUIS: retirer d'abord clubminutes.api.mg des Workers (Domains & Routes)
# Usage:
#   $env:CLOUDFLARE_API_TOKEN = "votre_token"
#   .\scripts\cloudflare-dns-render.ps1 -RenderHost "rotary-minutes.onrender.com"

param(
  [string]$RenderHost = "rotary-minutes.onrender.com",
  [string]$ZoneName = "api.mg",
  [string]$RecordName = "clubminutes",
  [bool]$Proxied = $false
)

$token = $env:CLOUDFLARE_API_TOKEN
if (-not $token) {
  Write-Error "Set CLOUDFLARE_API_TOKEN (compte jahazielaramanitra@gmail.com, zone api.mg)"
  exit 1
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type"  = "application/json"
}

function Invoke-CfApi($Method, $Uri, $Body = $null) {
  try {
    if ($Body) {
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body $Body
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
  } catch {
    $err = $_.ErrorDetails.Message
    Write-Warning "$Method $Uri failed: $err"
    return $null
  }
}

$zoneRes = Invoke-CfApi Get "https://api.cloudflare.com/client/v4/zones?name=$ZoneName"
$zoneId = $zoneRes.result[0].id
if (-not $zoneId) { Write-Error "Zone $ZoneName introuvable."; exit 1 }
Write-Host "Zone: $ZoneName ($zoneId)"

$fqdn = "$RecordName.$ZoneName"
$list = Invoke-CfApi Get "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$fqdn"

$workerLocked = $false
foreach ($rec in $list.result) {
  if ($rec.meta.read_only -or $rec.meta.origin_worker_id) {
    $workerLocked = $true
    Write-Host "WORKER record (read-only): $($rec.type) $($rec.id) worker=$($rec.meta.origin_worker_id)"
  }
}

if ($workerLocked) {
  Write-Host ""
  Write-Host ">>> STOP: retirez d'abord le domaine Worker dans le dashboard:"
  Write-Host "    Cloudflare -> Workers & Pages -> rotary-minutes -> Settings -> Domains"
  Write-Host "    Supprimez: clubminutes.api.mg"
  Write-Host "    Puis relancez ce script."
  exit 2
}

foreach ($rec in $list.result) {
  Invoke-CfApi Delete "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$($rec.id)" | Out-Null
  Write-Host "Deleted $($rec.type) $($rec.id)"
}

$body = @{
  type    = "CNAME"
  name    = $RecordName
  content = $RenderHost
  ttl     = 1
  proxied = $Proxied
} | ConvertTo-Json

$res = Invoke-CfApi Post "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" $body
if (-not $res.success) { Write-Error "CNAME creation failed."; exit 1 }

Write-Host "OK: CNAME $fqdn -> $RenderHost (proxied=$Proxied)"
Write-Host "Next: Render -> Custom Domains -> Verify clubminutes.api.mg"