$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$KeystoreDir = Join-Path $ProjectRoot ".android-keystore"
$KeystoreFile = Join-Path $KeystoreDir "rotary-minutes-release.jks"
$PropsFile = Join-Path $KeystoreDir "keystore.properties"

New-Item -ItemType Directory -Force -Path $KeystoreDir | Out-Null

if (-not (Test-Path $KeystoreFile)) {
  $keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
  if (-not (Test-Path $keytool)) {
    $keytool = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\keytool.exe"
  }
  Write-Host "Generating release keystore..."
  & $keytool -genkeypair -v `
    -keystore $KeystoreFile `
    -alias rotaryminutes `
    -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass RotaryMinutes2026 `
    -keypass RotaryMinutes2026 `
    -dname "CN=Rotary Minutes, OU=Club Minutes, O=Visa Guard USA, L=Unknown, ST=Unknown, C=US"
}

$storePath = ($KeystoreFile -replace '\\', '/')
@(
  "storeFile=$storePath"
  "storePassword=RotaryMinutes2026"
  "keyAlias=rotaryminutes"
  "keyPassword=RotaryMinutes2026"
) | Set-Content -Path $PropsFile -Encoding ASCII

Write-Host "Keystore ready: $KeystoreFile"