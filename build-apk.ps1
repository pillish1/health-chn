# ============================================================
# 悦动健康 · 自动打包脚本
# 用法：pwsh build-apk.ps1
# 每次打包自动递增小版本号（v1.1 → v1.2 → v1.3 ...）
# 输出：D:\health-chn\悦动健康-vX.Y-YYYYMMDD.apk（保留历史版本）
# ============================================================
$ErrorActionPreference = "Continue"
$dir = "D:\health-chn"

Write-Host "== 1/4 同步 www（源 → mobile/www） ==" -ForegroundColor Cyan
robocopy "$dir" "$dir\mobile\www" /MIR /XD mobile .git node_modules .github edge-debug2 /XF *.zip *.log *.flag *.apk *.ps1 *.md .apk-version deploy-github.bat push-to-github.bat robots.txt rss.xml sitemap.xml /NFL /NDL /NJH /NJS /NP | Out-Null
Write-Host "   完成 (exit $LASTEXITCODE)"

Write-Host "== 2/4 同步 Android 资源（www → assets/public） ==" -ForegroundColor Cyan
robocopy "$dir\mobile\www" "$dir\mobile\android\app\src\main\assets\public" /MIR /XD .git /NFL /NDL /NJH /NJS /NP | Out-Null
Write-Host "   完成 (exit $LASTEXITCODE)"

Write-Host "== 3/4 Gradle 构建 ==" -ForegroundColor Cyan
$env:JAVA_HOME = "D:\jdk17"
$env:ANDROID_HOME = "D:\Android"
$env:ANDROID_SDK_ROOT = "D:\Android"
Remove-Item -Force "$dir\build.log" -ErrorAction SilentlyContinue
Push-Location "$dir\mobile\android"
& .\gradlew.bat clean assembleDebug --no-daemon *> "$dir\build.log" 2>&1
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) {
  Write-Host "❌ 构建失败，日志尾部：" -ForegroundColor Red
  Get-Content "$dir\build.log" -Tail 15 | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkRed }
  Remove-Item -Force "$dir\build.log" -ErrorAction SilentlyContinue
  exit 1
}
Get-Content "$dir\build.log" -Tail 3 | ForEach-Object { Write-Host "   $_" }
Remove-Item -Force "$dir\build.log" -ErrorAction SilentlyContinue

Write-Host "== 4/4 版本化命名 ==" -ForegroundColor Cyan
$verFile = "$dir\.apk-version"
$n = 1
if (Test-Path $verFile) { $n = [int]((Get-Content $verFile -Raw).Trim()) + 1 }
Set-Content -Path $verFile -Value $n -Encoding UTF8 -NoNewline
$date = Get-Date -Format "yyyyMMdd"
$name = "悦动健康-v1.$n-$date.apk"
Copy-Item -Force "$dir\mobile\android\app\build\outputs\apk\debug\app-debug.apk" "$dir\$name"
$mb = [Math]::Round((Get-Item "$dir\$name").Length / 1MB, 2)
Write-Host ""
Write-Host "✅ 打包完成：$name（$mb MB）" -ForegroundColor Green
Write-Host "   路径：$dir\$name"
Write-Host "   版本计数已更新：下次将生成 v1.$($n + 1)"
