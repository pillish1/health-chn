@echo off
chcp 65001 >nul
title 悦动健康 - GitHub 一键部署
echo ============================================
echo    悦动健康 v29  一键部署到 GitHub Pages
echo ============================================
echo.
echo 前提：已在 GitHub 网页创建空仓库 health-chn
echo （若还没创建，请先打开下面网址创建，再运行本脚本）
echo   https://github.com/new
echo   仓库名填 health-chn，选 Public，直接 Create
echo.
pause
echo.
cd /d D:\health-chn
echo [1/3] 配置远程仓库...
git remote remove origin 2>nul
git remote add origin https://github.com/pillish1/health-chn.git
git config user.name "pillish1" 2>nul
git config user.email "pillish1@users.noreply.github.com" 2>nul
echo       完成（origin -> https://github.com/pillish1/health-chn.git）
echo.
echo [2/3] 推送到 GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [!] 推送失败，可能原因：
    echo     1. 还没有在 GitHub 创建 health-chn 仓库 ^(请先创建^)
    echo     2. 未登录 GitHub ^(首次会弹出浏览器登录窗口，点授权即可^)
    echo     3. 若提示输入密码，请用 Personal Access Token
    echo        ^(生成方法见说明^)
    echo.
    pause
    exit /b 1
)
echo       推送成功！
echo.
echo [3/3] 完成！最后一步开启 Pages：
echo.
echo   打开：https://github.com/pillish1/health-chn/settings/pages
echo   选 Deploy from a branch → main / (root) → Save
echo   等 1-2 分钟即可访问：
echo   https://pillish1.github.io/health-chn/
echo.
pause
