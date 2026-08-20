# 悦动健康 · 项目状态锚点（会话压缩后据此恢复）

> 本文件是唯一可靠的持久记忆。对话上下文被压缩后，先读本文件再继续工作。

## 项目本质
- App：悦动健康（健康管理）——**纯本地、无账号、无云同步**
- 用户哲学（最高优先）：**简单、高效、只做两件事：饮食记录 + 运动记录**。其他功能反复确认后已全部移除（登录/邮箱/微信/搜索/文章/计划/成就/报告/BMI/卡路里页/喝水/体重记录/本周概览）
- 产品状态：移动优先纯 App（桌面 navbar/footer 移动端隐藏），8 个页面

## 目录与版本
- 部署/源：D:\health-chn（git 仓库，git push 目标 pillish1/health-chn → GitHub Pages https://pillish1.github.io/health-chn/）
- 工作副本：D:\deepseek new\sport-health-website（每次改动后 Copy-Item 同步）
- 当前版本：v1.28-20260820（app3 SPA 单页版，5 Tab：首页/饮食/运动/统计/我的；APK 入口已是 SPA；GitHub Pages Web 端仍为多页面版）（APK 命名：悦动健康-vX.Y-YYYYMMDD.apk，保留历史；.apk-version 记计数）
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

## 协作模式（2026-08-20 更新）

> 参与者：**仅 DeepSeek Harness（全权负责）**。小怀川（OpenClaw）已退出，不再参与。
> 原多 Agent 协议保留备查（下方「多 Agent 协作协议（历史）」）。当前无需登记交接，改动即测即提交即可。

### 规矩
1. **唯一真源**：`D:\health-chn`（git 仓库）。旧工作副本 `D:\deepseek new\sport-health-website` 不再作为开发真源，勿参考其中已删除的旧页面（achievements/admin/bmi/report/tracker 等均为已砍功能）。
2. **动手前声明**：任何 agent 开始改代码前，先在本文件「当前状态」区登记，并 git commit 一次（"chore: 交接 - xxx 开始任务"）。
3. **完成后交接**：改完 → 测试 → git commit → 更新本文件「当前状态」区（做了什么/验证情况/下一步建议）。
4. **用户是唯一调度者**：任务分配、谁先谁后，由用户说了算。
5. **不主动抢活**：对方登记在案的任务，另一方不碰；有不同意见写进「当前状态」区留给用户决定。

### 当前状态
- 当前操作者：**DeepSeek Harness（全权）**——v1.35 套餐编辑功能+全面代码清理+文件夹规整，待手机验证
- 最近操作记录：
  - Harness 套餐编辑+全面清理（v1.35，本提交）：①套餐功能从「只能存/套用」升级为完整管理——套餐管理器(列表+套用/编辑/删除+从今天新建)、套餐编辑器(改名/增删食物，复用食物选择器)，jsdom 5 项流程全过 ②死代码清理：app-shell3 删 if(false)残留块、ydb 删未用 idbGet/idbGetAll、MPA plans 删被覆盖的坏 saveWorkout、icons 删12个死图标(plus/eye/trash/camera/photo/mail/cloud/logout/shield/heart/bell/arrow-right)并补 activity/star 缺失图标、style.css 删全部死选择器(result-panel/plan-day/action-item/stat-card/tag.purple/myplan-banner) ③文件夹规整：删 gitignored 开发迭代(app/app2/views/views2/fix_plans.py 等11项)、删遗留 deploy-github.bat/push-to-github.bat(引用已废弃工作副本)、DESIGN-onboarding.md 移入 docs/。全量测试(12个)通过，v1.35 APK 3.73MB
  - Harness 一周深度体验模拟（v1.34，本提交）：构造完整一周数据(建档+6天饮食15餐+5天训练+3次体重+留1天中断)逐一核对——首页摄入/消耗/连续天数/周圆点、饮食跨日期导航、运动日历标记、统计聚合(6天/15餐/5训练日/5610kcal/体重-1.0)、成就解锁4个、我的页统计，全部正确；MPA 网页版同数据也正确。深度使用发现 SPA 缺「复制昨天」(MPA 有)，已补上。期间修正了测试脚本自身的3处误报(种子日期方向/颜色规范化/图例计入)
  - Harness 修复记一餐无法记录（v1.33，本提交）：用户反馈「记一餐→选食物→无法记录」。根因=所有弹窗打开后用 document.querySelector('.yk-modal-mask.show') 取弹窗，但嵌套弹窗(选食物弹窗→记餐弹窗)时 querySelector 拿到旧的选食物弹窗，记餐弹窗的克重滑块#gram为null→TypeError崩溃→保存按钮没绑上→点了没记录。修复=改用 YK.openModal 的返回值(它本来就返回新建弹窗)，共修 7 处(foods3v2 openMeal/openPicker/openManual/saveTpl + plans3 + stats3 + profile3)。同时按需求加「克重自由输入」：记餐弹窗从仅滑块(10-500g步长10)改为 滑块+数字输入框(1-3000g 任意值双向同步)，MPA 网页版同样加上。jsdom 验证：米饭800g→928kcal 计算正确、保存成功、全流程回归绿
  - Harness SPA 细节修复（v1.32，本提交）：①charts.js 折线图面积渐变 ID 固定为 areaGrad，同页多图(统计页体重/摄入/消耗)ID 冲突导致填充色全取第一张图的颜色，改为 areaGradSeq 唯一 ID ②导入备份补全——profile3(SPA) 缺 checkins/achievements、profile(MPA) 缺 weights/achievements，导出有导入丢=数据丢失，两处都补齐 ③foods3v2 记餐弹窗克数计算只显示蛋白，补碳水/脂肪 ④foods3v2 日期标签点了没反应，补隐藏 date input + showPicker(MPA 有的功能 SPA 漏了)。jsdom 全流程回归通过
  - Harness 修复运动部位切换失灵（v1.31，本提交）：用户反馈「选了一个部位就卡住，切不走」。根因=添加训练弹窗的部位按钮逐按钮绑 onclick，但点击后 drawM() 重渲染按钮组导致新按钮无事件；改为容器事件委托（ms.addEventListener + closest），重渲染后依然有效；顺带修套用有氧计划时把 plan 的 reps 预填为分钟数。jsdom test-app3-muscle 验证部位切换+保存正常
  - Harness SPA 全面修 bug（v1.30，本提交，16 处）：①home3 首页「记一餐」goFoodsQuick 写在 hourGreeting return 后不可达→ReferenceError，移到模块级 ②home3 消耗 totalBurn=bmr+bmr*1.2+burn 高估2倍，改 bmr×活动系数 ③home3 摄入数字变灰后不恢复 ④app-shell3 建档标题新用户恒显「编辑」（p||{} 永远真值），改先判 hasProfile ⑤storage-error 监听从 if 里挪出 ⑥plans3 套用计划立即记录+再弹窗确认=双重记录/ReferenceError(openAddPlan 嵌套在 openAdd 内不可达)，整体重构为单一 openAddModal(prefill)，套用只预填、确认才记一次 ⑦plans3/stats3 消耗用固定60kg→档案体重 ⑧stats3 体重记录无 UI 入口(#ykAddW 不存在)，补按钮 ⑨about3 版本号写死 v1.25→常量 ⑩foods3v2 恢复拼音搜索(全拼+首字母)，py-map/py-foods 重新入包 ⑪ydb WebView 里跳过自动下载导出。jsdom test-app3-flows 全绿（消耗2571/记一餐/拼音/套用计划只记一次/体重按钮/版本）
  - Harness 修复 SPA 白屏（v1.29，本提交）：根因=app3.html 加载了多页面版 app.js，其 initOnboarding 在无档案数据时跳转 welcome.html，而 SPA 版 APK 已瘦身掉该文件→404→白屏。修复=从 app3.html 移除 app.js（SPA 的 UI 由 app-shell3.js 提供，views3 全用 YK.*，零依赖 app.js；app-shell3 自身定义 YDJK_UI 会覆盖 app.js 的）。jsdom 验证：导航尝试 0 次、5 Tab 全渲染、无 JS 报错。app-shell3 版本 v120→v121
  - Harness 完成 v1.28 SPA 打包（本提交）：①views3/profile3.js 字符串拼接断行语法错误（「我的」页会崩）已修复 ②build-apk.ps1 丢 BOM 导致 PowerShell 解析中文崩溃，重存 UTF-8 BOM ③build-apk.ps1 瘦身：排除旧多页面+app/app2 开发迭代+fix_plans.py，且先清空 mobile/www 再同步（robocopy /MIR+/XF 不会删目标残留的排除文件）；APK 从 60+ 冗余文件瘦到 22 个 SPA 必需文件（3.72MB）④jsdom 冒烟 app3 SPA：6 视图注册+5 Tab 全渲染✓（唯一报错为 jsdom 不支持 IndexedDB，真机无碍）⑤.gitignore 隔离 app/app2/views/views2 等开发迭代 ⑥APK 清理：删 v1.25/26/27 过渡版，v1.23 归档
  - Harness 完成记录体验打磨第二轮（commit a22cd2b）：①运动收藏的跨部位动作保存时 muscle 误用当前部位 tab（wkCurrentMuscle），改回动作本身的 a.muscle（收藏了「慢跑」在胸 tab 里点选，之前会存成胸部）②记一餐「补记」取消后 presetMealType 残留，导致下次主「记一餐」误预设成别的餐次，主按钮点击时清空 ③深色模式 --primary-dark(#1d4ed8) 作文字色偏暗，food-card kcal/克数/选中 radio 低对比，暗色下改 #60a5fa。jsdom test-muscle/test-preset 通过，style.css?v=91
  - Harness 完成记录体验打磨（commit d97b679）：①记一餐排序失效——v1.23 换胶囊菜单后 renderFoods 仍读已删除的 sortSel，升/降序点了不生效，改为模块级 currentSort ②排序按钮点击后图标丢失——动态 innerHTML 的 <i data-icon> 未被 icons.js 注入，改用 YDJK_ICON('sort') ③运动建议「训练次数」原来按动作数累加、同一天多动作会误判为多次，改为按天计数。jsdom test-sort/test-suggest 通过，缓存版本 v77→v78
  - Harness 完成 UX 三问题（commit 7df8d6e）：①记一餐筛选/排序改胶囊按钮组+弹出菜单(原两个 select 丑且逻辑割裂) ②训练时长自动推导=组数×3并显示在汇总(去手动输入, 修逻辑脱节), 收藏加 toast 提示去向 ③storage 防崩溃: setJSON 捕获 QuotaExceeded + storage-error 事件提示, getAllWorkouts/collectAllData 解析保护
  - Harness 完成P0 #1（commit 0388368）：拼音搜索修复——py-foods.js 全拼索引(624条)+foodMatchScore 全拼/首字母双匹配；jsdom 验证 luosifen/jxr/mifan/jirou 全通过
  - Harness 完成P0 #4/#9（commit 570699b）：导入覆盖式防重复(验证1旧→2新无重复)、套餐命名换promptDialog
  - 小怀川食物库 370→480（家常菜+50/海鲜+60/豆制品/小吃面点/快餐火锅/饮品水果蔬菜+40），修复原数据 47 处历史重复 + merge 双逗号 bug；动作库 123→156（有氧/徒手/拉伸/器械+33），修复 ACTIONS 数组空洞（注释行误加逗号）
  - 小怀川搜索升级：拼音首字母查表 py-map.js（568 字，pinyin 库离线生成）+ 别名 + 匹配度评分排序 + 防抖 + 家常菜 tab
  - 小怀川修复：建档完成跳转首页、welcome 文案、弹窗横向滑动、顶部精简（去 m-header/breadcrumb）
  - Harness 复核 v1.18 通过；建档表单 v2（commit 3104735）；智能建议（f0459cb/c13a7c9 + 小怀川 9498c24）
- 进行中任务：v1.35 已打包（套餐编辑+代码清理），待用户手机安装验证
    - Harness 全面整改 v1.25（未打包）：①新增 stats.html 统计分析页（周/月/全部范围切换、体重趋势、摄入趋势、训练消耗、蛋白质趋势、成就徽章、训练部位分布）②storage.js 新增体重记录/成就系统/训练计划模板/自动备份提醒 ③plans.js 新增距离/配速字段、记住上次部位（localStorage）、训练计划一键套用 ④foods.js 新增"存为套餐"支持多食物组合 ⑤profile.js 新增备份提醒 ⑥app.js 新增成就自动解锁 ⑦sw.js v78→v92 ⑧style.css 深色模式对比度优化 + 新组件样式

    - Harness v1.25+ App 化改造：新增 app.html（SPA 入口）+ app.css（App 专属样式）+ app-shell.js（路由系统）+ 6 个视图文件（home/foods/plans/stats/profile/about）。从多页面 MPA 升级为单页面 App，页面切换无刷新带过渡动画，全局固定 m-header + 底部 Tab，加载动画优化。

- 最近完成：
    - 2026-08-20 v1.28 SPA 版打包（app3 单页 App，5 Tab，含统计分析/成就/体重；profile3 修复 + 打包瘦身）
    - 2026-08-20 v1.25 全面整改（统计分析/体重追踪/成就徽章/训练计划/距离配速/备份提醒/多食物套餐）

  - 2026-08-20 v1.24 记录体验打磨（排序失效修复/排序图标/运动建议天数/肌肉归属/补记预设/深色模式对比度）
  - 2026-08-20 v1.20 数据扩充（食物 480 / 动作 156 / 搜索拼音）
  - 2026-08-20 v1.22 拼音搜索修复（全拼+首字母双匹配，commit 0388368）
  - 2026-08-20 v1.23 UX 修复（记一餐工具条/训练时长自动推导/storage 防崩溃）
  - 2026-08-19 v1.18 建档表单 v2 / v1.17 智能建议 / v1.15 死代码清理
- 下一步（待用户指派）：
    - ✅ 成就徽章（已实现：10 个徽章，自动解锁+展示在统计页）
    - ⬜ 云同步（待评估方案）
    - ⬜ IndexedDB 迁移（待评估）
    - ⬜ Vite + TypeScript 工程化（待评估）

  - ⬜ 成就徽章（用户未确认）
- 注意：工作副本 `D:\deepseek new\sport-health-website` 残留已砍功能旧页面，如需使用请先与 health-chn 对齐


