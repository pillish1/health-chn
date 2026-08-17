@echo off
chcp 65001 >nul
title Health App Setup
echo ============================================
echo  Health App Android Env Setup
echo  Installing JDK 17 + Android SDK to D:\
echo ============================================
echo.
echo Starting setup script...
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\health-chn\mobile\setup-android-env.ps1"
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Setup failed with code %errorlevel%
  echo Check the error message above.
)
echo.
pause