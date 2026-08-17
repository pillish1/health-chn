@echo off
chcp 65001 >nul
title 悦动健康 - 一键部署
echo ============================================
echo   悦动健康 一键部署到 GitHub Pages
echo ============================================
echo.
cd /d D:\health-chn

echo [1/3] 同步最新文件到部署目录...
if exist "D:\deepseek new\sport-health-website" (
  xcopy /e /y /q "D:\deepseek new\sport-health-website\*.html" "D:\health-chn\" >nul 2>&1
  xcopy /e /y /q "D:\deepseek new\sport-health-website\assets" "D:\health-chn\assets" >nul 2>&1
  xcopy /e /y /q "D:\deepseek new\sport-health-website\sw.js" "D:\health-chn\" >nul 2>&1
  xcopy /e /y /q "D:\deepseek new\sport-health-website\manifest.json" "D:\health-chn\" >nul 2>&1
  echo   同步完成
) else (
  echo   工作区不存在，跳过同步
)

echo.
echo [2/3] 提交更改...
git add -A
git commit -m "自动部署" 2>nul
git status -sb

echo.
echo [3/3] 推送到 GitHub（请确保 Watt Toolkit 已开启 GitHub 加速）...
git push origin main
if %errorlevel% equ 0 (
  echo.
  echo   ============================================
  echo    OK 部署成功！1-2 分钟后访问：
  echo      https://pillish1.github.io/health-chn/
  echo   ============================================
) else (
  echo.
  echo   X 推送失败。常见原因：
  echo      1. Watt Toolkit 未开启 GitHub 加速
  echo      2. 需要设置代理端口（手动执行：git config http.proxy http://127.0.0.1:端口）
  echo      3. 网络不稳定
)
echo.
pause
