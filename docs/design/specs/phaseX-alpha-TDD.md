# Phase X-α TDD — 交互与展现层重构

> **版本**：v1.0 | **创建日期**：2026-03-31
> **前置**：PRD GATE 1 ✅（2026-03-31）
> **存档迁移**：无（v5 不变）| **Pipeline 变更**：无（13 Handler 不变）

---

## Step 1：全局对齐

### 层级归属

本 Phase 的所有变更**完全限定在④ Presentation 层**（`src/main.ts` + `src/ui/`）。

| 变更类型 | 影响层 | Engine 改动 | Data 改动 | AI 改动 |
|---------|:------:|:---------:|:--------:|:------:|
| CSS 抽离 | ④ | ❌ | ❌ | ❌ |
| main.ts 拆分 | ④ | ❌ | ❌ | ❌ |
| 布局重排 | ④ | ❌ | ❌ | ❌ |
| 日志分区 | ④ | ❌ | ❌ | ❌ |
| 命令增强 | ④ | ❌ | ❌ | ❌ |

### Invariant 验证

| PRD Invariant | 架构冲突检查 | 结果 |
|---------------|------------|:----:|
| I1 不修改 Engine/AI/Data | 全部变更在 src/ui/ + src/main.ts + src/styles/ | ✅ |
| I2 GameState v5 不变 | 不新增/修改任何 interface | ✅ |
| I3 回归 64/64 | 不修改 Handler | ✅ |
| I4 不引入重 DOM 框架 | 纯 CSS + vanilla TS | ✅ |
| I5 MUD 文字基调 | 保持等宽字体 + 深色主题 | ✅ |

### GameState 变更

**无。** v5 不变。零存档迁移。

### Pipeline 变更

**无。** 13 个 Handler 不变。TickContext 不变。

---

## Step 2：文件设计

### 新增文件（5 个）

| # | 文件路径 | 类型 | 职责 | 行数估算 |
|---|---------|------|------|:--------:|
| N1 | `src/styles/mud-theme.css` | CSS | 主题变量 + 组件 class | ~120 |
| N2 | `src/ui/command-handler.ts` | TS | 命令解析 + 路由 + 历史 | ~250 |
| N3 | `src/ui/engine-bindings.ts` | TS | 引擎回调绑定 + 消息路由 | ~200 |
| N4 | `src/ui/log-manager.ts` | TS | 双区日志管理 + DOM 更新 | ~120 |
| N5 | `src/ui/layout.ts` | TS | DOM 初始化 + 布局结构 | ~80 |

### 修改文件（3 个）

| # | 文件路径 | 变更描述 |
|---|---------|---------|
| M1 | `src/main.ts` | 606→<150 行：保留初始化+启动，其余拆出 |
| M2 | `src/ui/mud-formatter.ts` | `<span style="color:...">` → `<span class="mud-severity-xxx">` |
| M3 | `index.html` | 引入 CSS 文件（Vite 自动处理） |

### 不修改的层

| 层 | 文件数 | 说明 |
|----|:-----:|------|
| ① Data | 16 | 零修改 |
| ② Engine | 25 | 零修改 |
| ③ AI | 8+ | 零修改 |

---

## Step 3：Interface 设计

### N1. `src/styles/mud-theme.css` — CSS 变量体系

```css
/* =====  颜色变量  ===== */
:root {
  /* 基础 */
  --mud-bg:         #1a1a2e;
  --mud-bg-dark:    #0d0d1a;
  --mud-bg-panel:   #0d0d2a;
  --mud-text:       #c8b88b;
  --mud-text-dim:   #8a8a6a;
  --mud-border:     #333;

  /* 语义色 */
  --mud-accent:     #7a8aba;
  --mud-gold:       #ffd700;
  --mud-red:        #ff4444;
  --mud-green:      #50fa7b;
  --mud-cyan:       #8bc8c8;

  /* 严重度 */
  --mud-severity-breath:   #4a4a4a;
  --mud-severity-ripple:   #8a8a6a;
  --mud-severity-splash:   #c8b88b;
  --mud-severity-storm:    #ffd700;
  --mud-severity-calamity: #ff4444;

  /* 字体 */
  --mud-font:       'Courier New', 'SimHei', monospace;
  --mud-font-size:  14px;

  /* 布局 */
  --status-bar-height: 36px;
  --cmd-input-height:  42px;
  --system-bar-height: 60px;
}
```

```css
/* ===== 严重度 class（PRD S-04） ===== */
.mud-severity-breath   { color: var(--mud-severity-breath); }
.mud-severity-ripple   { color: var(--mud-severity-ripple); }
.mud-severity-splash   { color: var(--mud-severity-splash); }
.mud-severity-storm    { color: var(--mud-severity-storm); font-weight: bold; }
.mud-severity-calamity { color: var(--mud-severity-calamity); font-weight: bold; }

/* 框线效果（STORM+ 级别） */
.mud-severity-storm::before,
.mud-severity-storm::after { content: '═══ '; }
/* SPLASH 级别加「」装饰 */
.mud-severity-splash::before { content: '「'; }
.mud-severity-splash::after  { content: '」'; }
```

### N2. `src/ui/command-handler.ts` — 命令系统

```typescript
/** 命令处理器接口 */
export interface CommandContext {
  state: LiteGameState;
  engine: IdleEngine;
  llmAdapter: LLMAdapter;
  addMainLog: (html: string) => void;
  addSystemLog: (html: string) => void;
}

/** 初始化命令系统：绑定输入框事件、历史管理 */
export function initCommandSystem(
  inputEl: HTMLInputElement,
  ctx: CommandContext,
): void;

/** 命令历史栈（最多 50 条） */
// 内部状态，不对外暴露
```

### N3. `src/ui/engine-bindings.ts` — 引擎回调

```typescript
/** 绑定所有引擎回调到 UI */
export function bindEngineCallbacks(
  engine: IdleEngine,
  state: LiteGameState,
  llmAdapter: LLMAdapter,
  logManager: LogManager,
): void;
```

### N4. `src/ui/log-manager.ts` — 双区日志管理

```typescript
export interface LogManager {
  /** 添加到主事件流 */
  addMainLog(html: string): void;
  /** 添加到系统消息条 */
  addSystemLog(html: string): void;
  /** DOM 元素引用（初始化时注入） */
  init(mainLogEl: HTMLElement, systemBarEl: HTMLElement): void;
}

export function createLogManager(): LogManager;
```

### N5. `src/ui/layout.ts` — DOM 初始化

```typescript
/** 创建并注入 DOM 布局，返回关键元素引用 */
export interface LayoutElements {
  statusBar: HTMLElement;
  mainLog: HTMLElement;
  systemBar: HTMLElement;
  cmdInput: HTMLInputElement;
}

export function initLayout(appEl: HTMLElement): LayoutElements;
```

### M2. `src/ui/mud-formatter.ts` — class 化改造

| 函数 | 改前 | 改后 |
|------|------|------|
| `formatSeverityLog` | `<span style="color:${color}">` | `<span class="mud-severity-${name}">` |
| `formatLookOverview` | 多处 `style="color:#xxx"` | `class="mud-zone-title"` / `class="mud-text-dim"` 等 |
| `formatDiscipleProfile` | 同上 | 同上 |
| `formatDiscipleInspect` | 同上 | 同上 |
| `formatSectProfile` | 同上 | 同上 |
| `formatRulingWindow` | 同上 | 同上 |
| `formatRulingResult` | 同上 | 同上 |
| `formatStatusBar` | 内联 `<b>` | `class="mud-text-bold"` |

**新增映射常量**（mud-formatter.ts 内部）：

```typescript
const SEVERITY_CLASS: Record<number, string> = {
  [EventSeverity.BREATH]:   'mud-severity-breath',
  [EventSeverity.RIPPLE]:   'mud-severity-ripple',
  [EventSeverity.SPLASH]:   'mud-severity-splash',
  [EventSeverity.STORM]:    'mud-severity-storm',
  [EventSeverity.CALAMITY]: 'mud-severity-calamity',
};
```

---

## Step 4：布局 DOM 结构

### 新布局（PRD L-01~L-05）

```html
<div id="mud-container" class="mud-container">
  <!-- 顶部状态栏 (sticky) -->
  <div id="status-bar" class="mud-status-bar">...</div>

  <!-- 主事件流 (flex-grow，自动填满) -->
  <div id="main-log" class="mud-main-log"></div>

  <!-- 系统消息条 (固定高度，可折叠) -->
  <div id="system-bar" class="mud-system-bar">
    <div class="mud-system-bar__header">
      <span>系统</span>
      <button class="mud-system-bar__toggle">▼</button>
    </div>
    <div class="mud-system-bar__content"></div>
  </div>

  <!-- 命令输入 (底部固定) -->
  <div class="mud-cmd-area">
    <span class="mud-cmd-prompt">&gt;</span>
    <input id="cmd-input" class="mud-cmd-input"
           placeholder="输入命令 (help 查看列表)..." />
  </div>
</div>
```

### Flexbox 布局

```css
.mud-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.mud-status-bar   { flex-shrink: 0; height: var(--status-bar-height); }
.mud-main-log     { flex: 1; overflow-y: auto; }
.mud-system-bar   { flex-shrink: 0; max-height: var(--system-bar-height); }
.mud-cmd-area     { flex-shrink: 0; height: var(--cmd-input-height); }
```

---

## Step 5：消息路由实现（PRD R-01~R-13）

在 `engine-bindings.ts` 中实现路由逻辑：

```typescript
// R-01: 修炼日志 → system-bar
engine.setOnTick(() => {
  tickCounter++;
  if (tickCounter % 5 === 0) {
    logManager.addSystemLog(formatSeverityLog(...));  // → system-bar
  }
  updateStatusBar();
});

// R-02: 灵田日志 → system-bar
engine.setOnFarmTickLog((logs) => {
  for (const log of logs) logManager.addSystemLog(...);
});

// R-03: 系统日志 → system-bar
engine.setOnSystemLog((logs) => {
  for (const log of logs) logManager.addSystemLog(...);
});

// R-04~R-07: 统一管线路由
engine.setOnMudLog((entries) => {
  for (const entry of entries) {
    if (entry.source === 'soul-engine') {
      logManager.addSystemLog(formatSeverityLog(...));  // R-04 → system-bar
    } else {
      logManager.addMainLog(formatSeverityLog(...));    // R-05/06/07 → main-log
    }
  }
});

// R-08: 对话 → main-log
engine.setOnDialogue((exchange) => { logManager.addMainLog(...); });

// R-09/10: 弟子行为 → main-log
engine.setOnDiscipleBehaviorChange((events) => { logManager.addMainLog(...); });

// R-11: 突破 → main-log
engine.setOnBreakthrough((_, btLog) => { logManager.addMainLog(...); });

// R-12: 裁决 → main-log
engine.setOnRulingCreated((ruling) => { logManager.addMainLog(...); });

// R-13: 环境呼吸 → system-bar
scheduleAmbientBreath(() => { logManager.addSystemLog(...); });
```

---

## Step 6：命令历史实现（PRD CMD-01~CMD-03）

```typescript
// command-handler.ts 内部
const history: string[] = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex < history.length - 1) {
      historyIndex++;
      inputEl.value = history[history.length - 1 - historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      inputEl.value = history[history.length - 1 - historyIndex];
    } else {
      historyIndex = -1;
      inputEl.value = '';
    }
  } else if (e.key === 'Enter') {
    const cmd = inputEl.value.trim();
    if (cmd) {
      history.push(cmd);
      if (history.length > MAX_HISTORY) history.shift();
      // CMD-02: 命令回显
      ctx.addMainLog(`<span class="mud-cmd-echo">&gt; ${escapeHtml(cmd)}</span>`);
    }
    historyIndex = -1;
    handleCommand(cmd, ctx);
    inputEl.value = '';
  }
});
```

---

## ADR

### ADR-Xα-01: CSS class 命名约定

- **决策**：所有 CSS class 使用 `mud-` 前缀
- **备选**：BEM 命名（`mud__element--modifier`）— 过于冗长
- **理由**：规模较小（~30 个 class），简短前缀足够隔离；Electron 迁移时可能整体替换，无需过度工程化
- **后果**：formatter 输出 class 名与 CSS 文件隐式耦合（SPM Review R5-D4 已标记为低风险）

### ADR-Xα-02: 系统消息条折叠策略

- **决策**：默认展开，显示最近 5 条，可手动折叠
- **备选 A**：默认折叠 — 玩家可能不知道有系统消息
- **备选 B**：不可折叠 — 占空间
- **理由**：新玩家需要看到修炼灵气在增长（引导感），老玩家折叠后节省空间
- **后果**：需要一个折叠按钮的 click 事件处理

### ADR-Xα-03: main.ts 拆分策略 — 公共状态注入

- **决策**：通过注入对象（CommandContext / LogManager）而非全局变量共享状态
- **备选**：使用全局 singleton — 与 Electron 迁移冲突
- **理由**：依赖注入模式让模块可独立测试，且 Electron 迁移时可轻松替换注入
- **后果**：main.ts 需要创建 context 对象并传递给各模块

---

## SGA Review

### R4 项目经理

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| R4-D1 | 进度可控性 | ✅ | 5 个 Story 依赖链清晰，S0→S1→S3/S4→S5 |
| R4-D2 | 跨版本影响 | ✅ | 零 GameState 变更，零存档迁移 |
| R4-D3 | 技术债务管理 | ✅ | TD-015（旧回调迁移）本 Phase 不处理，保持现状 |
| R4-D4 | 文档同步 | ✅ | 需更新 layers.md（Presentation 2→7 文件） |
| R4-D5 | 工期估算 | ✅ | 3~5 天合理 |

### R5 偏执架构师

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| R5-D1 | 层级违反 | ✅ | 全部在 ④ Presentation 层 |
| R5-D2 | 依赖方向 | ✅ | 新 UI 模块 → Engine 公开接口（单向） |
| R5-D3 | 循环依赖 | ✅ | log-manager / command-handler / engine-bindings 互不依赖 |
| R5-D4 | 可测试性 | ⚠️ | log-manager 和 command-handler 依赖 DOM（HTMLElement），不可纯单元测试。但本 Phase 不做 E2E（TD-016），浏览器手动验证足够 |
| R5-D5 | Electron 兼容 | ✅ | 纯 DOM API + CSS，Electron 原生支持 |

### R6 找茬QA

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| R6-D1 | 回归覆盖 | ✅ | regression-all.ts 64/64 不涉及 UI 层 |
| R6-D2 | 边界条件 | ✅ | 命令历史边界（空/满/循环）在 PRD AC 中已覆盖 |
| R6-D3 | 性能风险 | ✅ | 日志 DOM 操作与现有一致，新增折叠按钮 click 开销忽略 |
| R6-D4 | 可验证性 | ⚠️ | 布局/日志分区只能浏览器手动验证（TD-016 已标记），无自动化 |
| R6-D5 | 向后兼容 | ✅ | 所有 10 个命令功能保留 |

### 汇总

| # | 角色 | 维度 | 判定 | CoVe |
|---|------|------|:----:|------|
| 1 | R4 全 5 维度 | — | ✅ | — |
| 2 | R5-D1~D3/D5 | — | ✅ | — |
| 3 | R5-D4 可测试性 | — | ⚠️ | 维持 WARN: TD-016 已覆盖 |
| 4 | R6-D1~D3/D5 | — | ✅ | — |
| 5 | R6-D4 可验证性 | — | ⚠️ | 维持 WARN: TD-016 已覆盖 |

**最终判定：⚠️ CONDITIONAL PASS** — 2 个 WARN 均已被 TD-016 覆盖。

---

## GATE 2 签章

```
## SGA Signoff

- [x] Interface 设计完整（5 新文件 + 3 修改文件）
- [x] 迁移策略完整（无迁移需求）
- [x] Pipeline 挂载方案确认（无变更）
- [x] 依赖矩阵已更新（仅 Presentation 层内部）
- [x] Party Review 无 BLOCK 项 ✅
- [x] 技术债务已登记（WARN 项已被 TD-016 覆盖）

签章：[x] GATE 2 PASSED — 2026-03-31
```
