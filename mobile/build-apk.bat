@echo off
chcp 65001 >nul
echo ============================================
echo   YueDong Health - APK Build Script
echo ============================================
echo.

set JAVA_HOME=D:\jdk17
set ANDROID_HOME=D:\Android
set ANDROID_SDK_ROOT=D:\Android
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

cd /d D:\health-chn\mobile

echo [1/4] Copying web assets to www ...
if not exist www mkdir www
robocopy D:\health-chn www /E /XD mobile .git node_modules .github /XF *.zip /NFL /NDL /NJH /NJS /NP >nul
echo.

echo [2/4] Cap sync ...
call npx cap sync android
if errorlevel 1 (echo SYNC FAILED & pause & exit /b 1)
echo.

echo [3/4] Building APK (first run downloads Gradle, please wait) ...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (echo BUILD FAILED & pause & exit /b 1)
echo.

echo [4/4] DONE!
echo APK at: D:\health-chn\mobile\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause