# 建档页改造方案（v1.18 候选）

> 提出：小怀川 2026-08-19 | 实现：Harness（UI 视觉）+ 小怀川（验证/打包）
> 背景：用户反馈"建档页面做得不好"+"建档完成应回首页"（跳转已修，commit 8a995ae）

## 问题诊断
1. 6 项裸表单一屏塞满，小屏需滚动
2. 年龄/身高/体重有默认值（25/170/60）→ 用户直接点保存，档案是错的
3. 活动水平用 select 下拉，移动端体验差，且无解释
4. 校验提示笼统（"请填写有效的身高体重"，不说哪项错）
5. 每项字段无说明，用户不知道填来干嘛

## 改造目标
手机上 30 秒完成建档，无默认值误导，每项看得懂。保持现有设计语言（玻璃拟态/渐变/克制）。

## 具体改动

### 1. 表单结构（app.js 的 buildProfileForm 重写）
三段卡片式（复用现有 .form-section / .card 样式）：

```
[基本信息]
  性别：男/女 大按钮（保留现状，radio-pill）
  年龄：数字输入，留空，placeholder="如 25"，hint="用于计算基础代谢"
  身高(cm)：数字输入，留空，placeholder="如 170"，单位后缀 cm（.input-group .suffix），hint="与体重一起计算每日热量目标"
  体重(kg)：数字输入，留空，placeholder="如 60"，单位后缀 kg，hint="每周在同一时间称最准"

[健康目标]
  减脂塑形 🔥 / 保持健康 🌿 / 增肌增重 💪（radio-pill 保留），
  每个下方小字用 DATA.GOALS 的 desc 字段（已有："制造热量缺口，减掉多余脂肪"等）

[日常活动水平]（select 下拉 → 卡片式单选）
  5 项 radio-pill 纵向排列，每项 label + desc 小字：
    久坐少动 / 轻度活动(每周1-3次) / 中度活动(每周3-5次) / 高度活动(每周6-7次) / 极高强度(体力劳动或每天两练)
  hint="选最接近你日常状态的一项，之后可随时改"
```

### 2. 校验（submitProfileForm 改造）
- 逐项校验：先 age 后 height 再 weight，哪项错提示哪项（"请填写年龄" / "年龄需在 10-100 之间"）
- 范围校验保留（height 80-250，weight 20-300，age 10-100）
- 表单加 required 标记（视觉上小红点，.field label .req 已有样式）

### 3. 弹窗滚动
- .modal 内容区加 max-height: 82vh; overflow-y: auto（小屏 6 项+按钮不溢出）
- 底部按钮区（.modal-footer 或现有 flex 容器）保持可见

### 4. 移动端细节
- 数字输入 font-size: 16px（防 iOS 聚焦自动缩放）
- radio-pill label padding 加大到触控 ≥48px

### 5. 不动的东西
- 建档完成跳首页逻辑（已修，勿回退）
- 编辑档案模式（isEdit）：预填现有值 + 保存不跳转，照旧
- welcome.html 流程与文案（已修 493 种）

## 验收标准
- [ ] 新用户：welcome → 立即开始 → 表单全留空 → 填 4 项 + 选 2 项 → 保存 → 跳首页，能量卡按新档案渲染
- [ ] 空表单直接提交 → 逐项提示，不笼统
- [ ] 编辑档案：预填现值，保存不跳转，toast 提示已更新
- [ ] 深色模式无异常
- [ ] 375px 小屏：无横向滚动，保存按钮可见
- [ ] jsdom 冒烟 + 完整测试全绿，打包 v1.18

## 分工
- Harness：app.js buildProfileForm/submitProfileForm + style.css modal/radio-pill 微调
- 小怀川：验收测试 + 打包 v1.18
- 注意：app.js 刚被我改过跳转（8a995ae），Harness 改时勿覆盖 submitProfileForm 的跳转段；若冲突以 git diff 为准
