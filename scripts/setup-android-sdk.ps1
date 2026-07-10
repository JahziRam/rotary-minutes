$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$SdkRoot = Join-Path $ProjectRoot ".android-sdk"
$CmdToolsZip = Join-Path $env:TEMP "commandlinetools-win.zip"
$CmdToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

Write-Host "SDK root: $SdkRoot"
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

if (-not (Test-Path (Join-Path $SdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"))) {
  Write-Host "Downloading Android command-line tools..."
  Invoke-WebRequest -Uri $CmdToolsUrl -OutFile $CmdToolsZip -UseBasicParsing
  $ExtractDir = Join-Path $env:TEMP "android-cmdline-tools"
  if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force }
  Expand-Archive -Path $CmdToolsZip -DestinationPath $ExtractDir -Force
  $Dest = Join-Path $SdkRoot "cmdline-tools\latest"
  New-Item -ItemType Directory -Force -Path (Split-Path $Dest -Parent) | Out-Null
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  Move-Item (Join-Path $ExtractDir "cmdline-tools") $Dest
  Remove-Item $CmdToolsZip -Force -ErrorAction SilentlyContinue
}

$SdkManager = Join-Path $SdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot

Write-Host "Installing SDK packages (platform 35, build-tools)..."
$packages = @(
  "platform-tools",
  "platforms;android-35",
  "build-tools;35.0.0"
)

cmd /c "echo y| `"$SdkManager`" --sdk_root=`"$SdkRoot`" $($packages -join ' ')"
if ($LASTEXITCODE -ne 0) {
  cmd /c "`"$SdkManager`" --sdk_root=`"$SdkRoot`" $($packages -join ' ') --verbose"
}

$LocalProps = Join-Path $ProjectRoot "android\local.properties"
"sdk.dir=$($SdkRoot -replace '\\','\\')" | Set-Content -Path $LocalProps -Encoding ASCII
Write-Host "Wrote $LocalProps"
Write-Host "Android SDK ready."