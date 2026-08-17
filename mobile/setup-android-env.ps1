﻿# Health App Android Environment Setup
# Installs Java JDK 17 + Android SDK to D:\
$ErrorActionPreference = 'Stop'
$D = 'D:'

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '  Health App Android Env Setup' -ForegroundColor Cyan
Write-Host '  Target: D:\jdk17 and D:\Android' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

# 1. Download JDK 17
Write-Host '[1/5] Downloading Java JDK 17...' -ForegroundColor Yellow
$jdkZip = "$D\jdk17.zip"
$jdkDir = "$D\jdk17"
if (-not (Test-Path "$jdkDir\bin\java.exe")) {
  $url = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.12_7.zip'
  Invoke-WebRequest -Uri $url -OutFile $jdkZip -TimeoutSec 900 -UseBasicParsing
  Write-Host '  Downloaded, extracting...' -ForegroundColor Gray
  Expand-Archive -Path $jdkZip -DestinationPath "$D\_jdk_extract" -Force
  $jdkInner = Get-ChildItem "$D\_jdk_extract" -Directory | Select-Object -First 1
  Move-Item $jdkInner.FullName $jdkDir -Force
  Remove-Item "$D\_jdk_extract" -Recurse -Force
  Remove-Item $jdkZip -Force
  Write-Host '  OK: JDK installed' -ForegroundColor Green
} else {
  Write-Host '  JDK already exists, skip' -ForegroundColor Green
}

# 2. Download Android cmdline-tools
Write-Host '[2/5] Downloading Android cmdline tools...' -ForegroundColor Yellow
$andDir = "$D\Android"
$toolsZip = "$D\android-cmdline-tools.zip"
$toolsDir = "$andDir\cmdline-tools\latest"
if (-not (Test-Path "$toolsDir\bin\sdkmanager.bat")) {
  New-Item -ItemType Directory -Path "$andDir\cmdline-tools" -Force | Out-Null
  $url2 = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
  Invoke-WebRequest -Uri $url2 -OutFile $toolsZip -TimeoutSec 900 -UseBasicParsing
  Write-Host '  Downloaded, extracting...' -ForegroundColor Gray
  Expand-Archive -Path $toolsZip -DestinationPath "$andDir\cmdline-tools\tmp" -Force
  Move-Item "$andDir\cmdline-tools\tmp\cmdline-tools" $toolsDir -Force
  Remove-Item "$andDir\cmdline-tools\tmp" -Recurse -Force
  Remove-Item $toolsZip -Force
  Write-Host '  OK: cmdline tools installed' -ForegroundColor Green
} else {
  Write-Host '  cmdline tools already exist, skip' -ForegroundColor Green
}

# 3. Set environment variables
Write-Host '[3/5] Setting environment variables...' -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkDir, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $andDir, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $andDir, 'User')
$oldPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$newParts = @("$jdkDir\bin", "$andDir\platform-tools", "$andDir\cmdline-tools\latest\bin")
foreach ($p in $newParts) {
  if ($oldPath -notlike "*$p*") { $oldPath = $p + ';' + $oldPath }
}
[Environment]::SetEnvironmentVariable('Path', $oldPath, 'User')
Write-Host '  OK: env vars set' -ForegroundColor Green

# 4. Install Android SDK components
Write-Host '[4/5] Installing Android SDK components (~1GB, takes minutes)...' -ForegroundColor Yellow
$sdk = "$andDir\cmdline-tools\latest\bin\sdkmanager.bat"
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $andDir
Write-Host '  Accepting licenses...' -ForegroundColor Gray
$yes = 'y'
$yes | & $sdk --licenses 2>&1 | Out-Null
& $sdk --install 'platform-tools' 'platforms;android-34' 'build-tools;34.0.0' 2>&1 | Select-Object -Last 3
Write-Host '  OK: SDK components installed' -ForegroundColor Green

# 5. Verify
Write-Host '[5/5] Verifying...' -ForegroundColor Yellow
& "$jdkDir\bin\java" -version 2>&1 | Select-Object -First 1
if (Test-Path "$andDir\platform-tools\adb.exe") { Write-Host '  OK: adb ready' -ForegroundColor Green }
Write-Host ''
Write-Host '============================================' -ForegroundColor Green
Write-Host '  Setup complete! Next:' -ForegroundColor Green
Write-Host '  cd D:\health-chn\mobile' -ForegroundColor Green
Write-Host '  npm install && npx cap add android && npx cap sync' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
pause