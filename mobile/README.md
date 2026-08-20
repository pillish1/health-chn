# 悦动健康 · 移动 App 打包（Capacitor）

将现有网页打包成 Android/iOS 原生 App。

## 环境要求
- Node.js 16+
- Android Studio（打包 Android 需要）
- 可选：Xcode（打包 iOS，仅 Mac）

## 打包步骤

### 1. 安装依赖
\`\`\`bash
cd D:\\health-chn\\mobile
npm install
\`\`\`

### 2. 添加 Android 平台
\`\`\`bash
npx cap add android
\`\`\`

### 3. 同步网页代码
\`\`\`bash
npx cap sync
\`\`\`

### 4. 打开 Android Studio 打包 APK
\`\`\`bash
npx cap open android
\`\`\`
在 Android Studio 中：Build → Build APK

## 上架
- Android：华为/小米/OPPO/vivo/腾讯应用宝 等市场（需开发者账号，多数免费）
- iOS：Apple Developer（99 美元/年）

## 说明
- 网页代码在 webDir: ..（health-chn 根目录）
- 本地通知插件已配置（App 内提醒）
- 云端同步通过 Supabase（已就绪）


## 环境检测（打包前）
运行以下命令确认环境：
\`\`\`bash
node --version     # 需 16+
java -version      # 需 17+（Android Gradle 要求）
echo $env:ANDROID_HOME  # 应指向 Android SDK
\`\`\`

### 安装 Android SDK（如未安装）
1. 下载 Android Studio：https://developer.android.com/studio
2. 安装时勾选 "Android SDK" 和 "Android Virtual Device"
3. 完成后 SDK 位于 %LOCALAPPDATA%\\Android\\Sdk

### 生成 APK
\`\`\`bash
cd D:\\health-chn\\mobile
npm install
npx cap add android
npx cap sync
npx cap open android
# Android Studio 中：Build → Build App Bundle(s) / APK(s)
\`\`\`
