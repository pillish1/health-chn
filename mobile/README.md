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
