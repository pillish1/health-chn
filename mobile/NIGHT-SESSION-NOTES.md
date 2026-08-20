# 悦动健康 - APK 构建完成记录 (2026-08-18)

## ✅ 已达成: Android APK 构建成功
- **APK 位置**: `D:\health-chn\mobile\android\app\build\outputs\apk\debug\app-debug.apk` (3.8 MB)
- **副本**: `D:\health-chn\悦动健康-v1.0.apk`
- **构建用时**: 2m 59s (160 tasks)

## 构建环境 (已就绪)
- JDK 17: `D:\jdk17`
- Android SDK: `D:\Android` (platform-tools + android-34 + build-tools 34.0.0)
- gradle 8.2.1: 已放入 wrapper 缓存 `C:\Users\chl\.gradle\wrapper\dists\gradle-8.2.1-all\d8pvvlun5bx6sdtwqhf8y9z4b`
- Capacitor 6: local-notifications / preferences / share 插件

## 过程中解决的问题
1. `@capacitor/storage` 已弃用 -> 改用 `@capacitor/preferences`
2. webDir `..` 无效 -> 指向独立 `mobile/www` 副本
3. sdkmanager license 拒绝 -> 手动下载 SDK 组件 (platform-tools 7.7MB + android-34 60.6MB + build-tools 55.6MB)
4. platform-34 官方 zip 名是 `platform-34-ext12_r01.zip` (ext 版本)
5. gradle wrapper 下载超时 -> 腾讯镜像 `mirrors.cloud.tencent.com/gradle/gradle-8.2.1-all.zip` (184MB) 放入缓存
6. gradle 8.11.1 缓存损坏 -> 改回 8.2.1

## 手动构建命令 (网页更新后重新打包)
```bat
cd /d D:\health-chn\mobile
robocopy D:\health-chn www /E /XD mobile .git node_modules .github /XF *.zip /NFL /NDL /NJH /NJS /NP
npx cap sync android
cd android && gradlew.bat assembleDebug
```

## 手机安装
- 安卓手机开启「未知来源」安装
- 传输 `D:\health-chn\悦动健康-v1.0.apk` 到手机安装
- 或连接 USB 后 `adb install 悦动健康-v1.0.apk`