# Phase UI-S — 社交系统显示与模板补全 PRD

> **版本**：v1.1 | **日期**：2026-04-02
> **作者**：/SPM | **状态**：GATE 1 CONDITIONAL PASS → 修复中
> **前置 Phase**：I-beta（社交事件系统 v0.6.0）✅

---

## §1 背景与动机

### 1.1 问题陈述

Phase I-beta 交付了完整的社交系统后端（三维关系向量、性取向、离散关系状态、社交引擎、13 类社交模板），但前端 UI 严重滞后。玩家几乎感知不到社交系统在运作。

### 1.2 5-Why 根因

```
为什么需要社交 UI 补全？
→ 玩家感知不到社交系统在运作
  → 后端数据（status/orientation/模板）未在前端展示
    → I-beta 优先交付机制正确性，UI 留为下一步
      → 修仙 MUD 核心乐趣是"看见弟子们活着"——社交关系是"活"的核心证据
        → 根因：文字 MUD 的叙事沉浸感依赖于信息的可见性与中文化
```

### 1.3 核心体验锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 玩家通过 MUD 文本能清晰感知弟子间的社交动态——谁暗恋谁、谁结拜了、谁成仇了 |
| **ROI** | 开发成本 S-M（纯前端+模板，无新系统） vs 体验增量 4/5（社交可见性 20%→90%） |
| **循环挂载** | 社交系统 → MUD 日志+面板 → 玩家感知 → 掌门裁决策略 → 影响社交走向 |

---

## §2 范围

### 2.1 IN（8 项）

| ID | 项目 | 分类 |
|----|------|------|
| A1 | Status 中文化（crush→倾慕, lover→道侣, sworn-sibling→金兰, nemesis→宿敌） | Core |
| A2 | Orientation 显示（inspect 面板 + relationships 命令，修仙风标签） | Core |
| A3 | `relationships` 命令补全（合并 edge.status 显示） | Core |
| A4 | 关系区排版优化（双行布局） | Core |
| B1 | 社交模板接入（wire `pickSocialTemplate()` + 新建 `fillSocialTemplate()` 到 social-tick.handler） | Core |
| C1 | 代词占位符（两套模板均加 `{P_A}/{P_B}`，复用 `getPronoun()`）— 合并 FB-026 | Debt |
| D1 | 提取 `getRelationLabel()` 到共享工具 | Debt |
| D2 | 统一 tag 分隔符（→ 中点 `·`） | Debt |

### 2.2 OUT

| 项目 | 原因 |
|------|------|
| AI 邀约完整流程（AsyncAIBuffer 扩展） | 独立 Phase，social-tick.handler.ts L51-53 TODO |
| X-γ 浮层面板 | FB-017 独立 Phase |
| sect 命令弟子名单 | 超出社交显示补全范围 |
| 新增 GameState 字段或公式 | 纯展示层变更 |

### 2.3 需求债务清偿

| 债务 | 处理 |
|------|------|
| FB-026（碰面模板性别化文案） | **本次清偿** — 合并入 C1 |
| FB-005（关系面板 UI） | **部分清偿** — A4 排版优化 |

---

## §3 不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | UI 显示的关系数据必须与 GameState 完全同步 | 显示错乱 |
| I2 | 所有面向玩家的文本必须为中文 | 破坏沉浸感 |
| I3 | 模板占位符替换后不得残留 `{X}` | 日志可读性崩塌 |
| I4 | 代词必须与弟子 gender 字段一致（他/她/其） | 性别错位 |
| I5 | 纯 UI/展示层变更不得修改 GameState 计算逻辑 | 副效果→回归风险 |

---

## §4 规则与数值

### 4.1 RelationshipStatus 中文标签映射

| 英文枚举值 | 中文标签 | 来源 |
|-----------|---------|------|
| crush | 倾慕 | 新增（现有代码无 crush 标签） |
| lover | 道侣 | 沿用现有 getRelationLabel 映射 |
| sworn-sibling | 金兰 | **变更**（现有映射为"结拜"→改为"金兰"，更贴合修仙义结用语） |
| nemesis | 宿敌 | 沿用现有 getRelationLabel 映射 |

### 4.2 RelationshipTag 中文标签映射

| 英文枚举值 | 中文标签 |
|-----------|---------|
| friend | 知己 |
| rival | 对头 |
| mentor | 师恩 |
| admirer | 仰慕 |
| grudge | 积怨 |

### 4.3 Orientation 取向标签推导规则

输入：`Orientation.maleAttraction` [0,1], `Orientation.femaleAttraction` [0,1], `Gender`

> **评估顺序**：从上到下，首条匹配即返回（短路）。`gender==unknown` 置于最高优先级。

| 优先级 | 条件 | 标签 |
|:------:|------|------|
| 1 | gender==unknown | 无慕 |
| 2 | maleAttr==0 AND femaleAttr==0 | 无慕 |
| 3 | maleAttr>0 AND femaleAttr>0 | 兼慕 |
| 4 | gender==male, femaleAttr>0, maleAttr==0 | 慕异 |
| 5 | gender==female, maleAttr>0, femaleAttr==0 | 慕异 |
| 6 | gender==male, maleAttr>0, femaleAttr==0 | 慕同 |
| 7 | gender==female, femaleAttr>0, maleAttr==0 | 慕同 |

### 4.4 社交事件 → 模板映射

| social-tick 事件类型 | relationType | SocialEventType 模板键 |
|---------------------|-------------|----------------------|
| crush-mark | — | social-flirt |
| invitation | lover | social-confession |
| invitation | sworn-sibling | social-sworn-proposal |
| invitation | nemesis | social-nemesis-declare |
| dissolution | lover | social-lover-broken |
| dissolution | sworn-sibling | social-sworn-broken |
| dissolution | nemesis | social-nemesis-resolved |

### 4.5 Status Badge 颜色

| Status | CSS 颜色方案 |
|--------|------------|
| 倾慕 | 粉色调（--mud-pink 或 #e8a0bf） |
| 道侣 | 金色调（--mud-gold 或 #c8a868） |
| 金兰 | 蓝色调（--mud-blue 或 #6ba3d6） |
| 宿敌 | 红色调（--mud-red） |

### 4.6 统一分隔符

| 位置 | 当前 | 变更后 |
|------|------|--------|
| mud-formatter tags | `,` (逗号) | `·` (中点) |
| command-handler tags | `/` (斜杠) | `·` (中点) |
| 指标间分隔（亲/引/信） | 空格 | `·` (中点) |

---

## §5 代码对账清单

| 引用字段 | 代码位置 | 状态 |
|---------|---------|:----:|
| `RelationshipStatus` | soul.ts L223 | ✅ |
| `RelationshipTag` | soul.ts L220 | ✅ |
| `RelationshipEdge.status` | game-state.ts L227 | ✅ |
| `Gender` | game-state.ts L32 | ✅ |
| `Orientation` | game-state.ts L37-42 | ✅ |
| `getPronoun(gender)` | game-state.ts L51 | ✅ |
| `getGenderLabel(gender)` | game-state.ts L56 | ✅ |
| `BEHAVIOR_LOCATION_MAP` | encounter.ts L56 | ✅ |
| `LOCATION_LABEL` | encounter.ts L44 | ✅ |
| `pickSocialTemplate(eventType)` | social-event-templates.ts L98 | ✅ |
| `fillEncounterTemplate(...)` | encounter-templates.ts L46 | ✅ |
| `fillSocialTemplate(...)` | **待新建** — social-event-templates.ts 中新增 | 🆕 |

> **占位符命名**：encounter-templates 使用 `{LOC}`，social-event-templates 使用 `{L}`。
> **决策**：保持各自现有命名不统一（两套模板独立演化，fillSocialTemplate 处理 `{L}`，fillEncounterTemplate 处理 `{LOC}`）。
> 各自的 fill 函数负责对应占位符，调用方无需关心差异。

**零不匹配项（1 个待新建项）。**

---

## §6 成功标准

| # | 标准 | 验证方式 |
|---|------|---------|
| S1 | `look <弟子>` 关系区显示中文 status badge + 中文 tags | 浏览器 |
| S2 | `inspect <弟子>` header 显示性取向（修仙风标签） | 浏览器 |
| S3 | `relationships <弟子>` 显示 edge.status + orientation | 浏览器 |
| S4 | 社交事件 MUD 日志使用多样化模板（非硬编码） | 等待 social-tick 触发 |
| S5 | 碰面/社交文案中出现正确代词（他/她/其） | 等待 encounter/social 触发 |
| S6 | `npx tsc --noEmit` 零错误 | CLI |
| S7 | 回归测试全通过 | regression-all.ts |
| S8 | 社交验证全通过 | verify-social-system.ts |
