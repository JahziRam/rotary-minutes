# Configure PostgreSQL local pour Rotary Minutes (utilisateur rotary / mot de passe rotary)
# Usage:
#   $env:POSTGRES_PASSWORD = "votre_mot_de_passe_postgres"
#   powershell -ExecutionPolicy Bypass -File scripts/setup-local-postgres.ps1

$ErrorActionPreference = "Stop"

$psqlCandidates = @(
  "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  "C:\Program Files\PostgreSQL\16\bin\psql.exe",
  "C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) {
  Write-Error "psql introuvable. Installez PostgreSQL ou ajoutez psql au PATH."
}

if (-not $env:POSTGRES_PASSWORD) {
  Write-Error "Definissez POSTGRES_PASSWORD (mot de passe utilisateur postgres) avant d'executer ce script."
}

$env:PGPASSWORD = $env:POSTGRES_PASSWORD

$sql = @"
DO $$ BEGIN
  CREATE ROLE rotary WITH LOGIN PASSWORD 'rotary';
EXCEPTION WHEN duplicate_object THEN
  ALTER ROLE rotary WITH LOGIN PASSWORD 'rotary';
END $$;
SELECT 'CREATE DATABASE rotary_minutes OWNER rotary'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rotary_minutes')\gexec
GRANT ALL PRIVILEGES ON DATABASE rotary_minutes TO rotary;
"@

Write-Host "Creation utilisateur rotary et base rotary_minutes..."
& $psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c $sql

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Push-Location $PSScriptRoot\..
try {
  Write-Host "Synchronisation schema Prisma..."
  npx prisma db push
  Write-Host "Seed des donnees..."
  npm run db:seed
  Write-Host "OK — Base locale prete. Relancez npm run dev puis connectez-vous avec superadmin@rotaryminutes.app / RotaryAdmin2026!"
}
finally {
  Pop-Location
}