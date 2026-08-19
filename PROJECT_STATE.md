# 悦动健康 · 项目状态锚点（会话压缩后据此恢复）

> 本文件是唯一可靠的持久记忆。对话上下文被压缩后，先读本文件再继续工作。

## 项目本质
- App：悦动健康（健康管理）——**纯本地、无账号、无云同步**
- 用户哲学（最高优先）：**简单、高效、只做两件事：饮食记录 + 运动记录**。其他功能反复确认后已全部移除（登录/邮箱/微信/搜索/文章/计划/成就/报告/BMI/卡路里页/喝水/体重记录/本周概览）
- 产品状态：移动优先纯 App（桌面 navbar/footer 移动端隐藏），8 个页面

## 目录与版本
- 部署/源：D:\health-chn（git 仓库，git push 目标 pillish1/health-chn → GitHub Pages https://pillish1.github.io/health-chn/）
- 工作副本：D:\deepseek new\sport-health-website（每次改动后 Copy-Item 同步）
- 当前版本：v1.12-20260819（APK 命名：悦动健康-vX.Y-YYYYMMDD.apk，保留历史；.apk-version 记计数）
- 打包：D:\health-chn\build-apk.ps1 一键打包（同步 www → gradle → 版本化命名），调用：pwsh 里 & build-apk.ps1

## 页面结构（8 页）
- index.html：能量卡（摄入环+建议摄入+今日消耗[基础代谢+日常活动+运动]+净摄入状态标签+营养条+记一餐/记运动按钮）→ 今日待办（饮食/运动状态）→ 今日简览 → 一周圆点 → 今日建议
- foods.html：日期导航 → 摄入卡（大数字/剩余）→ 4 时段分组记录（早餐/午餐/晚餐/加餐，空时段有补记按钮，预设餐次）
- plans.html：运动日历（主入口，点日期选日）→ 当日训练记录（含🔥消耗估算+编辑✎+删除）→ 运动建议
- profile.html：设置（健康档案编辑/深色模式/关于）+ 数据备份（导出/导入 JSON）
- welcome.html（新用户引导，纯静态）、about.html、404.html

## 关键技术事实
- 纯静态多页：HTML + assets/css/style.css + assets/js/{icons.js,storage.js,data.js,charts.js,app.js} + assets/js/pages/{home,foods,plans,profile}.js
- 图标系统：icons.js 41+ 个 SVG（<i class="ic" data-icon="xxx"> 自动注入；JS 动态用 window.YDJK_ICON('name')）
- 数据：localStorage，前缀 ydjk:。workouts:ydjk:meals: 按日期键；checkins 用于连续天数（streak 联动 workouts）；collectAllData() 导出备份
- 消耗计算（MET 法）：kcal = MET×3.5×体重/200×分钟；MET 按动作/部位（MET_MUSCLE/MET_CARDIO）；时长未填按组数×3 估算
- 总消耗模型：基础代谢(BMR, Mifflin-St Jeor) + 日常活动(BMR×(活动系数-1)) + 运动消耗；净摄入=摄入-总消耗
- 建档字段：gender/age/height/weight/goal(cut|keep|bulk)/activity(5级)；目标=TDEE±调整
- 日期记录：饮食/运动都支持任意日期查看+补记+编辑+删除

## 视觉设计语言（重要）
- 品牌渐变：**蓝 #3b82f6 → 天蓝 #06b6d4 → 青绿 #14b8a6**（**用户明确不喜欢紫色**，全站已清零；也不喜欢突兀的大按钮）
- 风格：页面氛围光斑背景、能量卡玻璃拟态、主按钮/大标题/tab选中渐变、环形图渐变、深色模式全适配
- 图标独立设计线性 SVG；tab 固定底部+当前页渐变胶囊高亮

## 用户偏好（沟通/交付）
- 每改必测：jsdom 验证（D:\jsdom-test\node_modules，跑 test-*.js），先测 Web 再打包；打包用脚本自动版本号
- 简洁优先，讨厌冗余/花哨/突兀；喜欢"艺术品感"但克制
- 中文沟通；执行型（"你来执行"/"干吧"），但大的设计方向先给方案
- 深色模式要维护

## 环境事实
- pwsh 工具：**不要传 workdir 参数**（会 spawn 不存在的 powershell.exe 报错），用命令内 Set-Location
- 后台 pwsh 任务可用（git push 重试循环：120s×30）
- gradle 构建：JAVA_HOME=D:\jdk17, ANDROID_HOME=D:\Android, ANDROID_SDK_ROOT=D:\Android（显式设置）
- git push github.com:443 经常抖动 → 后台重试循环
- jsdom 在 D:\jsdom-test（require('D:/jsdom-test/node_modules/jsdom')）；node --check 校验 JS 语法
- 文件编码：UTF-8 无 BOM；pwsh Get-Content 需 -Encoding UTF8 读中文；.ps1 脚本需 UTF-8 BOM
- 死文件注意：mobile\** 是 Capacitor 构建产物，改动不涉及；robocopy 同步 www 排除 .git/node_modules/mobile/*.apk/*.log/*.ps1 等

## 已知待办 / 下一步（按用户反馈优先级）
- 无明确进行中任务；用户可能继续提 UI 细节或功能优化
- 升级方案（用户看过）：常用食物/套餐一键记、摄入趋势/周报、成就/提醒、智能建议（未开工）
- 测试时注意：手机上的按钮位置/间距、深色模式效果
