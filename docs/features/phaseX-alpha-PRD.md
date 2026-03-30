# Phase X-α PRD — 掌门视界：交互与展现层重构

> **版本**：v1.0 | **创建日期**：2026-03-31
> **Phase**：X-α | **SPM 状态**：Step 1~3 进行中
> **前置**：Phase H-γ ✅ | **存档迁移**：无（v5 不变）

---

## §1 第一性原理解构

### 1a. 5-Why 根因链

```
Q1: 为什么要梳理交互与展现层？
A:  信息杂乱无章，虽然已有 21 个系统但玩家感受不到。

Q2: 为什么玩家感受不到？
A:  所有信息（修炼灵气+60、soul-engine内部评估、弟子对话、世界事件）
    全部混在同一个日志滚动区域，重要事件瞬间被冲走。

Q3: 为什么混在一起？
A:  展现层从 Phase A 开始就是快速原型模式——main.ts 606 行巨石，
    零 CSS 文件，无日志分区，无信息层级。

Q4: 为什么到现在才改？
A:  前15个Phase聚焦于引擎/AI/世界层建设，展现层一直是"能用就行"。
    现在引擎层已稳定（13 Handler + 64 回归），是时候让玩家真正"看到"世界。

Q5: 什么是最根本的问题？
A:  **信息的信噪比** — 系统产出了丰富的世界信息，但展现层
    没有对信息进行分级、分区、分层呈现，导致用户的认知带宽被噪声占满。
```

**根因**：引擎已经在输出"活世界"的信号，但展现层的信息架构没有跟上，导致信号被噪声淹没。

### 1b. Invariant 声明

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | 展现层改造不得修改 Engine/AI/Data 层的任何代码 | 引擎回归风险 |
| I2 | GameState v5 不变，零存档迁移 | 存档兼容性 |
| I3 | 回归测试 64/64 必须持续通过 | 系统稳定性 |
| I4 | 不引入重 DOM 框架（React/Vue/Svelte） | Electron 迁移预期 |
| I5 | MUD 文字基调保持（不做 GUI 游戏化） | 产品定位 |
| I6 | 所有现有命令功能不丢失 | 向后兼容 |

### 1c. 最小组件检验

> 如果只保留一个核心功能，是哪个？

**日志分区**。把混在一起的所有信息按语义分成至少两个区域（主事件流 + 系统低频消息），让玩家第一次能"看清"世界在发生什么。

### 1d. 核心体验锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 掌门打开 MUD，一眼就知道宗门在发生什么——弟子在哪、事件如何、道风几何 |
| **开发成本** | M（中等）— 纯展现层重构，不涉及新系统设计 |
| **体验增量** | ⭐⭐⭐⭐⭐（5/5）— 直接决定玩家能否感知 Phase E~H 的所有成果 |
| **循环挂载** | [引擎产出] → [展现层分级/分区/格式化] → [玩家认知] → [命令干预] → [引擎] |

---

## §2 规则与边界

### §2.1 业务实体

本 Phase 不引入新的 GameState 实体。改造的是**展现层的信息架构**：

| 概念 | 定义 | 持久化 |
|------|------|:------:|
| **日志分区（LogZone）** | 将 MUD 日志按语义分成不同区域显示 | ❌ |
| **消息分级（MessageTier）** | 将回调消息分为"玩家关注"和"系统内部"两级 | ❌ |
| **命令历史栈** | 记录玩家输入的命令历史，支持 ↑/↓ 翻阅 | ❌ |

### §2.2 日志分区规则

> [!IMPORTANT]
> **这是 Phase X-α 的核心规则——决定什么信息在哪里显示。**

#### 分区定义

| 区域 ID | 名称 | 位置 | 高度 | 说明 |
|---------|------|------|:----:|------|
| `main-log` | 主事件流 | 页面中央，占据主要空间 | flex-grow | 弟子行为、对话、碰面、世界事件、裁决、突破 |
| `system-bar` | 系统消息条 | 主事件流下方 | 固定 ~60px / 可折叠 | 修炼灵气累计、灵田收获、soul-engine 内部评估、环境呼吸 |
| `status-bar` | 状态栏 | 顶部固定 | 固定 ~36px | 仙历/宗门/境界/灵气/灵石/悟性（与现有一致） |
| `cmd-input` | 命令输入 | 底部固定 | 固定 ~40px | 命令输入框（从顶部移到底部） |

#### 消息路由规则（R-路由）

| 规则ID | 来源回调 | 当前行为 | 新路由 | 理由 |
|--------|---------|---------|--------|------|
| R-01 | `onTick`（每5s修炼灵气日志） | → main log | → `system-bar` | 低频、低信息量 |
| R-02 | `onFarmTickLog`（灵田/收获） | → main log | → `system-bar` | 低频、系统内部 |
| R-03 | `onSystemLog`（自动服丹） | → main log | → `system-bar` | 系统内部 |
| R-04 | `onMudLog` source=`soul-engine` | → main log | → `system-bar` | 内部评估，对玩家无意义 |
| R-05 | `onMudLog` source=`encounter` | → main log | → `main-log` ✅保持 | 弟子碰面是核心事件 |
| R-06 | `onMudLog` source=`world-event` | → main log | → `main-log` ✅保持 | 世界事件是核心事件 |
| R-07 | `onMudLog` source=`ai-result-apply` | → main log | → `main-log` ✅保持 | AI 决策结果是核心事件 |
| R-08 | `onDialogue`（弟子对话） | → main log | → `main-log` ✅保持 | 核心互动内容 |
| R-09 | `onDiscipleBehaviorChange`（行为开始/结束） | → main log | → `main-log` ✅保持 | 弟子动态是核心 |
| R-10 | `onDiscipleBehaviorChange`（AI 台词） | → main log | → `main-log` ✅保持 | 弟子个性表达 |
| R-11 | `onBreakthrough`（突破） | → main log | → `main-log` ✅保持 | 高关注事件 |
| R-12 | `onRulingCreated/Resolved`（裁决） | → main log | → `main-log` ✅保持 | 高关注事件 |
| R-13 | `scheduleAmbientBreath`（环境呼吸） | → main log | → `system-bar` | 氛围文字，不应占主区 |

**汇总**：

| 路由到 | 来源数 | 包含 |
|--------|:------:|------|
| `main-log` | 8 | 弟子行为+对话+碰面+世界事件+AI决策+突破+裁决+AI台词 |
| `system-bar` | 5 | 修炼灵气+灵田+自动服丹+soul-engine内部+环境呼吸 |

### §2.3 布局规则

| 规则ID | 规则 | 理由 |
|--------|------|------|
| L-01 | 输入框固定在页面底部 | MUD 惯例 + USER 要求 |
| L-02 | 状态栏固定在页面顶部（保持现有） | 不变 |
| L-03 | 主日志区自动填满可用空间（flex-grow） | 替代 max-height: 400px |
| L-04 | 系统消息条固定在主日志区下方，可折叠 | 默认展开，点击折叠/展开 |
| L-05 | 系统消息条最多显示最近 5 条，滚动覆盖 | 避免系统消息占过多空间 |

### §2.4 CSS 主题规则

| 规则ID | 规则 | 当前状态 |
|--------|------|---------|
| S-01 | 所有颜色必须通过 CSS 变量定义 | ❌ 当前 20+ 硬编码值 |
| S-02 | 所有组件样式必须通过 CSS class 应用 | ❌ 当前全部内联 style |
| S-03 | mud-formatter.ts 输出 class 而非内联 style | ❌ 当前输出 `<span style=...>` |
| S-04 | 日志严重度着色通过 CSS class 实现 | ❌ 当前在 JS 中拼颜色字符串 |

### §2.5 main.ts 拆分规则

| 规则ID | 规则 | 目标 |
|--------|------|------|
| M-01 | 命令解析逻辑拆分到 `src/ui/command-handler.ts` | ~200 行迁出 |
| M-02 | 引擎回调绑定拆分到 `src/ui/engine-bindings.ts` | ~150 行迁出 |
| M-03 | 日志管理拆分到 `src/ui/log-manager.ts` | ~80 行迁出 |
| M-04 | main.ts 只保留初始化 + 启动 | 目标 < 150 行 |

### §2.6 命令历史规则

| 规则ID | 规则 |
|--------|------|
| CMD-01 | ↑ 键回溯上一条命令，↓ 键向下（最多保留 50 条） |
| CMD-02 | 命令回显：用户输入的命令显示在日志中 `> look 张清风` |
| CMD-03 | 空命令不记录历史 |

---

## §2.7 规格深度自检

| C# | 检查项 | 状态 | 证据锚点 |
|----|--------|:----:|---------|
| C1 | 实体全量枚举 | ✅ | §2.1 3 个概念定义（L72~L78） |
| C2 | 规则映射表 | ✅ | §2.2 R-01~R-13 消息路由表（L94~L117） |
| C3 | 公式全参数 | ⬜ | 不适用 — 本 Phase 无新数值公式 |
| C4 | 阈值/标签表 | ✅ | §2.2 分区定义表（L86~L92） + §2.3 布局规则（L125~L131） |
| C5 | Fallback 文案 | ⬜ | 不适用 — 本 Phase 不新增文案 |
| C6 | 效果数值表 | ⬜ | 不适用 — 本 Phase 无数值效果 |

**C1~C4 全部 ✅ 或 ⬜，准入 Step 3。**

---

## §3 User Story 映射

### Story #0 — CSS 主题抽离

**As a** 开发者,
**I want to** 将所有内联样式抽离为独立 CSS 文件 + CSS 变量体系,
**So that** 后续 UI 改动不需要修改 TypeScript 文件。

| AC | Given | When | Then |
|----|-------|------|------|
| AC0-1 | 项目中无 CSS 文件 | 创建 `src/styles/mud-theme.css` | 定义至少 12 个 CSS 变量（颜色）+ 组件 class |
| AC0-2 | mud-formatter.ts 输出 `<span style="color:...">` | 改为输出 `<span class="severity-xxx">` | 所有 severity 着色通过 CSS class 控制 |
| AC0-3 | main.ts initUI() 中 ~50 行内联 style | 迁移到 CSS class | initUI() 中零内联 style（允许 layout 级 style） |

**依赖**：无
**复杂度**：S

---

### Story #1 — main.ts 拆分

**As a** 开发者,
**I want to** 将 main.ts 的命令、回调、日志管理拆分为独立模块,
**So that** main.ts 只保留初始化逻辑（< 150 行）。

| AC | Given | When | Then |
|----|-------|------|------|
| AC1-1 | 命令逻辑在 main.ts L226-411 | 拆分到 `src/ui/command-handler.ts` | handleCommand 函数和所有 case 分支移出 |
| AC1-2 | 回调绑定在 main.ts L420-555 | 拆分到 `src/ui/engine-bindings.ts` | 所有 engine.setOnXxx 调用移出 |
| AC1-3 | 日志管理在 main.ts L167-222 | 拆分到 `src/ui/log-manager.ts` | mudLogs/addMudLog/updateLogDisplay/routeLogEntryToMud 移出 |
| AC1-4 | 拆分完成后 | 计算 main.ts 行数 | ≤ 150 行 |
| AC1-5 | 拆分完成后 | `npx tsc --noEmit` | 零编译错误 |
| AC1-6 | 拆分完成后 | 浏览器中运行 | 功能 100% 等价（所有命令可用，日志正常显示） |

**依赖**：Story #0（CSS theme）
**复杂度**：M

---

### Story #2 — 布局重排

**As a** 掌门（玩家）,
**I want to** 命令输入框在底部、日志区自动填满屏幕,
**So that** 操作符合 MUD 直觉且大屏不浪费空间。

| AC | Given | When | Then |
|----|-------|------|------|
| AC2-1 | 命令输入框在页面中部 | 布局重排后 | 输入框固定在页面底部（position: sticky/fixed） |
| AC2-2 | 日志区 max-height: 400px | 布局重排后 | 日志区 flex-grow 自动填满可用空间 |
| AC2-3 | 状态栏在页面顶部 | 布局重排后 | 保持 sticky top（不变） |
| AC2-4 | 任意尺寸窗口（800px~1920px） | 加载页面 | 日志区高度自适应，无大片空白 |

**依赖**：Story #0
**复杂度**：S

---

### Story #3 — 日志分区

**As a** 掌门（玩家）,
**I want to** 重要事件（对话/碰面/世界事件/裁决）和系统内部消息（修炼灵气/灵田/soul-engine）分开显示,
**So that** 我能一目了然地看到宗门正在发生什么。

| AC | Given | When | Then |
|----|-------|------|------|
| AC3-1 | 所有消息在同一个日志区 | 分区后 | `main-log`（主事件流）和 `system-bar`（系统消息条）两个区域 |
| AC3-2 | 修炼灵气+60 日志 | tick 触发 | 显示在 `system-bar`（R-01） |
| AC3-3 | 灵田收获日志 | 灵田 handler 触发 | 显示在 `system-bar`（R-02） |
| AC3-4 | `[soul-engine]` 前缀的评估日志 | soul-event handler 触发 | 显示在 `system-bar`（R-04） |
| AC3-5 | 弟子碰面事件 | encounter handler 触发 | 显示在 `main-log`（R-05） |
| AC3-6 | 世界事件 | world-event handler 触发 | 显示在 `main-log`（R-06） |
| AC3-7 | 弟子对话 | 对话协调器触发 | 显示在 `main-log`（R-08） |
| AC3-8 | 环境呼吸文案 | 定时器触发 | 显示在 `system-bar`（R-13） |
| AC3-9 | 系统消息条 | 默认状态 | 展开显示最近 5 条，可点击折叠 |
| AC3-10 | look/inspect/sect 命令输出 | 用户执行命令 | 显示在 `main-log` |

**依赖**：Story #1（log-manager 拆分）
**复杂度**：M

---

### Story #4 — 命令增强

**As a** 掌门（玩家）,
**I want to** 用 ↑/↓ 翻阅命令历史 + 命令回显到日志,
**So that** 操作更高效、日志更有上下文。

| AC | Given | When | Then |
|----|-------|------|------|
| AC4-1 | 已输入过 `look 张清风` | 按 ↑ 键 | 输入框恢复 `look 张清风` |
| AC4-2 | 已回溯到第一条 | 再按 ↑ 键 | 保持不变（不循环） |
| AC4-3 | 已回溯到某条 | 按 ↓ 键 | 向下翻阅，到底时清空输入框 |
| AC4-4 | 输入 `look 张清风` 并 Enter | 命令执行 | 日志中先显示 `> look 张清风`（灰色回显） |
| AC4-5 | 输入空命令 Enter | — | 不记录历史，不回显 |
| AC4-6 | 历史超过 50 条 | 新增一条 | 最旧的被丢弃 |

**依赖**：Story #1（command-handler 拆分）
**复杂度**：S

---

### Story #5 — 回归验证

**As a** 开发者,
**I want to** 确认展现层重构不破坏现有功能,
**So that** 引擎和 AI 层完全不受影响。

| AC | Given | When | Then |
|----|-------|------|------|
| AC5-1 | 重构完成后 | `npx tsc --noEmit` | 零编译错误 |
| AC5-2 | 重构完成后 | `npx tsx scripts/regression-all.ts` | 64/64 通过 |
| AC5-3 | 重构完成后 | 浏览器中运行 10 分钟 | 所有 10 个命令正常工作 |
| AC5-4 | 重构完成后 | Console 无异常 | 无 JS 错误 |

**依赖**：Story #0~#4 全部完成
**复杂度**：S

---

## §4 Story 依赖图

```
Story #0 CSS 主题抽离
    │
    ├──→ Story #1 main.ts 拆分
    │       │
    │       ├──→ Story #3 日志分区
    │       │
    │       └──→ Story #4 命令增强
    │
    └──→ Story #2 布局重排
    
Story #0~#4 ──→ Story #5 回归验证
```

---

## §5 OUT — 不在 X-α 范围内

| 功能 | 排入 Phase |
|------|-----------|
| Tab 自动补全 | X-β |
| look/inspect 浮层面板 | X-γ |
| STORM 裁决弹窗面板 | X-γ |
| 突破全屏闪烁效果 | X-β |
| 行为图标前缀 | X-β |
| 弟子面板 ESC 关闭 | X-γ |
