# 悦动健康 · 项目状态锚点（会话压缩后据此恢复）

> 本文件是唯一可靠的持久记忆。对话上下文被压缩后，先读本文件再继续工作。

## 项目本质
- App：悦动健康（健康管理）——**纯本地、无账号、无云同步**
- 用户哲学（最高优先）：**简单、高效、只做两件事：饮食记录 + 运动记录**。其他功能反复确认后已全部移除（登录/邮箱/微信/搜索/文章/计划/成就/报告/BMI/卡路里页/喝水/体重记录/本周概览）
- 产品状态：移动优先纯 App（桌面 navbar/footer 移动端隐藏），8 个页面

## 目录与版本
- 部署/源：D:\health-chn（git 仓库，git push 目标 pillish1/health-chn → GitHub Pages https://pillish1.github.io/health-chn/）
- 工作副本：D:\deepseek new\sport-health-website（每次改动后 Copy-Item 同步）
- 当前版本：v1.15-20260819（小怀川清理 storage 死代码后打包）（APK 命名：悦动健康-vX.Y-YYYYMMDD.apk，保留历史；.apk-version 记计数）
- 打包：D:\health-chn\build-apk.ps1 一键打包（同步 www → gradle → 版本化命名），调用：pwsh 里 & build-apk.ps1
- 备份含套餐数据（collectAllData/导入均含 mealTemplates，commit 2149f3c）
- 历史 APK 归档：D:\health-chn\archives\（根目录只留最新 3 版）；项目根目录保持干净（已清理构建日志/edge调试数据/过时seo文件）

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
- 升级方案进度（2026-08-19 19:20 核实 git 历史后更新）：
  - ✅ **常用食物/套餐一键记**（Harness 已完成：复制昨天一键套用 + 我的套餐存/用/删 + 食物库扩充 253→493 种，commit d211285）
  - ✅ **摄入趋势/周报**（Harness 已完成：首页本周总结周报，7 天圆点 + 饮食/训练消耗/蛋白质达标，commit 1f69261）
  - ⬜ 成就/提醒（提醒=本地通知已实现；成就未开工）
  - ✅ **智能建议（规则版）**（2026-08-19 完成：小怀川实现规则引擎 YDJK.getSmartTips(date)，10 条规则/纯本地/0 成本/warn 优先/最多 3 条；Harness 实现 UI 渲染层 c13a7c9 + 兕底规则 f0459cb）
- 测试时注意：手机上的按钮位置/间距、深色模式效果

## 多 Agent 协作协议（2026-08-19 起）

> 参与者：DeepSeek Harness（原搭建者）+ 小怀川（OpenClaw，2026-08-19 加入）
> 本协议防止两个 agent 互相覆盖代码。**同一时间只允许一个 agent 改文件。**

### 规矩
1. **唯一真源**：`D:\health-chn`（git 仓库）。旧工作副本 `D:\deepseek new\sport-health-website` 不再作为开发真源，勿参考其中已删除的旧页面（achievements/admin/bmi/report/tracker 等均为已砍功能）。
2. **动手前声明**：任何 agent 开始改代码前，先在本文件「当前状态」区登记，并 git commit 一次（"chore: 交接 - xxx 开始任务"）。
3. **完成后交接**：改完 → 测试 → git commit → 更新本文件「当前状态」区（做了什么/验证情况/下一步建议）。
4. **用户是唯一调度者**：任务分配、谁先谁后，由用户说了算。
5. **不主动抢活**：对方登记在案的任务，另一方不碰；有不同意见写进「当前状态」区留给用户决定。

### 当前状态
- 当前操作者：**小怀川（OpenClaw）**——智能建议规则引擎完成，打包 v1.17 中
- 最近操作记录：
  - Harness UI 验证智能建议完成（v1.17）：三场景全过（无档案1条建档提示/记录完整绿色鼓励/叠加warn排前），SVG图标渲染正常；深夜规则测试注意：数据需带ts(走addMeal)，直接写localStorage会误触发
  - 小怀川智能建议规则引擎完成：storage.js 新增 YDJK.getSmartTips(date)（10 条规则：建档/饮食未记/摄入偏低/偏高/蛋白达标/无运动/连续未动(仅老用户)/连续打卡 3·7·30 天/深夜进食/记录完整；warn 优先最多 3 条；纯本地 0 成本；场景测试+回归全绿）
  - Harness 智能建议规则版完成（commit f0459cb）：多条建议列表（蛋白质/断练/部位单一/记录中断），统一渲染到首页 dashTipBody（修复旧单条系统未接入的 bug）
  - Harness 19:05-19:10 套餐+周报（commit d211285/1f69261，已核实保留）
  - 小怀川 storage 死代码清理（commit b72c5e6，已核实无损）
  - Harness 备份补全套餐（commit 2149f3c）
- 进行中任务：打包 v1.17（含智能建议）
- 最近完成：
  - 2026-08-19 智能建议规则引擎（getSmartTips，v1.17 待装）
  - 2026-08-19 storage.js 死代码清理（v1.15，已归档验证）
  - 2026-08-19 清理项目（归档 APK/删构建日志/新增 PROJECT_STATE.md，v1.12）
- 下一步（待用户指派）：
  - ⬜ 成就徽章（用户未确认，需克制版方案）
- 注意：工作副本 `D:\deepseek new\sport-health-website` 残留已砍功能旧页面，如需使用请先与 health-chn 对齐

### 分工建议（用户可调整）
- **DeepSeek Harness**：UI 视觉细节、页面交互（它一直在调这些）
- **小怀川（OpenClaw）**：代码优化、死代码清理、打包测试、token 成本控制