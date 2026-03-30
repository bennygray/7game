# Phase X-γ TDD — 面板系统 + 内存修复 + 可点击弟子名

> **Phase**：X-γ "掌门视界·面板系统 + 关键性能修复"
> **PRD**：[phaseX-gamma-PRD.md](../../features/phaseX-gamma-PRD.md) v1.2
> **GATE 1**：✅ 2026-03-31
> **SGA GATE 2 状态**：待签章

---

## Step 1：全局对齐 + Invariant 验证

### 1.1 层级归属

本 Phase 所有变更 **仅涉及 ④ Presentation 层**。

| 变更文件 | 当前存在 | 层级 | 变更性质 |
|---------|:------:|:----:|---------|
| `src/ui/panel-manager.ts` | ❌ **新建** | ④ Presentation | 面板生命周期管理 |
| `src/ui/log-manager.ts` | ✅ | ④ Presentation | 内存修复：innerHTML→appendChild |
| `src/ui/layout.ts` | ✅ | ④ Presentation | 注入面板 Overlay DOM |
| `src/ui/command-handler.ts` | ✅ | ④ Presentation | 命令输出路由：addMainLog→openPanel |
| `src/ui/engine-bindings.ts` | ✅ | ④ Presentation | 裁决回调→自动弹出面板 + 弟子名包装 |
| `src/ui/mud-formatter.ts` | ✅ | ④ Presentation | 新增 wrapDiscipleName() |
| `src/main.ts` | ✅ | ④ Presentation | 注入 PanelManager + 事件委托 |
| `src/styles/mud-theme.css` | ✅ | ④ Presentation | 面板样式 + 可点击弟子名 hover |

### 1.2 跨层通信验证

| 编号 | 通信路径 | 影响 |
|------|---------|------|
| C-6 | `onRulingCreated/onRulingResolved` | **复用不变更** — 仅在 Presentation 端追加 openPanel/closePanel 调用 |
| X-1 | UI 禁止直接修改 GameState | ✅ 遵守 — PanelManager 仅读取 state（查找弟子），不写入 |

### 1.3 Invariant 验证

| PRD Invariant | 架构冲突检查 | 结果 |
|:---:|---------|:----:|
| I1 | 面板不阻塞日志流 — Panel overlay 是独立 DOM 元素，log-manager 独立运行 | ✅ 无冲突 |
| I2 | 面板不拦截输入 — Overlay 之下的 cmd-input 通过 z-index 保持可聚焦 | ⚠️ 需设计 — 见 ADR-Xγ-01 |
| I3 | 同时最多一个面板 — openPanel 先隐式 close | ✅ PanelManager 内部保证 |
| I4 | 面板内容为 formatter 纯函数产出 — 不引入新格式化逻辑 | ✅ 复用现有 formatDiscipleInspect/formatLookOverview 等 |
| I5 | ESC+点击背景关闭 — keydown 全局监听 + overlay click 委托 | ✅ 无冲突 |

### 1.4 GameState 影响

**零 GameState 变更。零存档迁移。存档版本保持 v5。**

| 检查项 | 结果 |
|--------|:----:|
| `game-state.ts` 变更 | ❌ 无 |
| `createDefaultLiteGameState()` 变更 | ❌ 无 |
| `SAVE_VERSION` 变更 | ❌ 无 |
| `migrateVNtoVN+1()` 需求 | ❌ 无 |
| `arch/gamestate.md` 更新 | ❌ 无需 |
| `arch/schema.md` 更新 | ❌ 无需 |

### 1.5 Pipeline 影响

**零 Pipeline 变更。13 个 Handler 不变。**

---

## Step 2：Interface 设计 + 文件变更清单

### 2.1 新增 Interface

```typescript
// src/ui/panel-manager.ts — [NEW]

export interface PanelManager {
  /** 打开面板（若已有面板，先关闭再打开） */
  openPanel(title: string, contentHtml: string): void;
  /** 关闭当前面板 */
  closePanel(): void;
  /** 当前是否有面板打开 */
  isOpen(): boolean;
}

/**
 * 创建 PanelManager 实例
 * @param overlayEl — .mud-panel-overlay 容器引用
 * @param titleEl — #panel-title 元素
 * @param bodyEl — #panel-body 元素
 * @param closeBtn — #panel-close 按钮
 */
export function createPanelManager(
  overlayEl: HTMLElement,
  titleEl: HTMLElement,
  bodyEl: HTMLElement,
  closeBtn: HTMLElement,
): PanelManager;
```

### 2.2 修改 Interface

```typescript
// src/ui/command-handler.ts — CommandContext 扩展

interface CommandContext {
  state: LiteGameState;
  engine: IdleEngine;
  llmAdapter: LLMAdapter;
  logManager: LogManager;
  panelManager: PanelManager;  // [NEW] 面板管理器注入
}
```

### 2.3 新增纯函数

```typescript
// src/ui/mud-formatter.ts — 追加导出

/** 包装弟子名为可点击 span（PRD §2.9 CK-01/CK-04） */
export function wrapDiscipleName(name: string, discipleId: string): string;
```

### 2.4 文件变更全量清单

| # | 文件 | 操作 | 变更摘要 | 行数估算 |
|---|------|:----:|---------|:-------:|
| 1 | `src/ui/panel-manager.ts` | **NEW** | PanelManager 接口 + createPanelManager 工厂 + ESC/click 事件绑定 | ~60 |
| 2 | `src/ui/log-manager.ts` | **MOD** | renderLines→appendLine 增量 DOM；移除 mainLines/systemLines 数组 | ~40 (Δ-22) |
| 3 | `src/ui/layout.ts` | **MOD** | innerHTML 追加 .mud-panel-overlay DOM 结构 | ~15 (Δ+12) |
| 4 | `src/ui/command-handler.ts` | **MOD** | CommandContext +panelManager；look/inspect/sect/judge 路由改 openPanel | ~20 (Δ) |
| 5 | `src/ui/engine-bindings.ts` | **MOD** | onRulingCreated→openPanel；onRulingResolved→closePanel；弟子名→wrapDiscipleName | ~15 (Δ) |
| 6 | `src/ui/mud-formatter.ts` | **MOD** | +wrapDiscipleName()；formatLookOverview 弟子名包装 | ~10 (Δ) |
| 7 | `src/main.ts` | **MOD** | +createPanelManager 初始化 + 注入 CommandContext + 弟子名点击事件委托 | ~15 (Δ) |
| 8 | `src/styles/mud-theme.css` | **MOD** | +面板 overlay/panel/header/body 样式 + .mud-disciple-link hover | ~60 (Δ) |

> **总影响**：1 个新文件 + 7 个修改文件，全部在 ④ Presentation 层。

---

## Step 3：依赖矩阵更新 + 回归影响评估

### 3.1 新增依赖

| 文件 | 新增依赖 | 方向 |
|------|---------|:----:|
| `panel-manager.ts` | 无外部依赖（纯 DOM 操作） | — |
| `command-handler.ts` | → `panel-manager.ts` (PanelManager) | → |
| `main.ts` | → `panel-manager.ts` (createPanelManager) | → |
| `main.ts` | → `mud-formatter.ts` (formatDiscipleInspect) | → (已有) |
| `engine-bindings.ts` | → `mud-formatter.ts` (wrapDiscipleName) | → (已有文件，新函数) |

### 3.2 依赖方向验证

```
main.ts → panel-manager.ts → (无外部依赖)
main.ts → command-handler.ts → panel-manager.ts
main.ts → engine-bindings.ts → mud-formatter.ts
```

> ✅ 全部单向依赖，无循环。panel-manager.ts 是叶节点（零外部依赖）。

### 3.3 回归影响评估

| 影响范围 | 风险 | 验证方式 |
|---------|:----:|---------|
| `log-manager.ts` 内存修复改变渲染机制 | **中** | tsc 编译 + 浏览器手动验证日志正常滚动 |
| `command-handler.ts` look/inspect/sect/judge 输出路由变更 | **低** | 命令仍可执行，仅输出目标变化 |
| `engine-bindings.ts` 弟子名包装可能影响日志格式 | **低** | escapeHtml 保证安全，grep 验证所有弟子名输出点 |
| 回归脚本 64/64 | **低** | 回归脚本仅测试 Engine/Data 层逻辑，不测试 UI |

### 3.4 回归计划

1. `npx tsc --noEmit` — 编译零错误
2. `npx tsx scripts/regression-all.ts` — 64/64 通过
3. `wc -l src/main.ts` ≤ 150 行（HC-4）
4. 浏览器手动验证：
   - 日志正常滚动（内存修复）
   - look/inspect/sect/judge 命令打开面板
   - ESC / 背景点击关闭面板
   - STORM 裁决自动弹出面板
   - 弟子名可点击打开灵魂档案
   - 内存不再线性增长（任务管理器观察 10 分钟）

---

## Step 4：ADR 决策日志

### ADR-Xγ-01：面板 Overlay 与命令输入的 z-index 策略

**上下文**：PRD I2 要求面板不拦截命令输入。但 Overlay 是全屏半透明遮罩，会覆盖底部的 `cmd-input`。

**备选方案**：

| 方案 | 说明 | 优劣 |
|------|------|------|
| A：Overlay 排除 cmd-area | Overlay 高度设为 `calc(100% - cmd-area-height)` | ✅ cmd-input 始终可用；⚠️ 底部露出影响视觉 |
| B：Overlay 全屏 + pointer-events passthrough | Overlay 全屏，但 cmd-area 的 z-index 高于 overlay | ✅ 视觉完整；✅ cmd-input 可用；⚠️ z-index 管理 |
| C：打开面板时自动 focus 面板 | 面板捕获焦点，ESC 关闭后 refocus cmd-input | ❌ 打断输入流 |

**决策**：**方案 B** — cmd-area z-index 设为 `z-index: 1000`，Overlay 设为 `z-index: 900`。
- 原因：保持 Overlay 视觉完整性（半透明遮罩覆盖日志区），同时 cmd-input 始终在最上层可输入。
- 后果：z-index 管理复杂度 +1，但本项目 z-index 层级少（仅 flash-overlay 9999 + panel-overlay 900 + cmd-area 1000），可接受。

### ADR-Xγ-02：log-manager 移除 JS 数组缓冲

**上下文**：当前 `log-manager.ts` 维护 `mainLines[]` 和 `systemLines[]` 数组作为日志缓冲。修复为增量 DOM 后，DOM 本身即可作为唯一状态源。

**备选方案**：

| 方案 | 说明 | 优劣 |
|------|------|------|
| A：保留 JS 数组 + 增量 DOM | 数组仍然存在，DOM 也追加 | ❌ 双重状态源；内存仍有冗余 |
| B：移除 JS 数组，DOM 即唯一源 | appendChild + removeChild，不再维护字符串数组 | ✅ 内存最优；✅ 单一状态源 |

**决策**：**方案 B** — 移除 `mainLines[]` 和 `systemLines[]`，DOM 即唯一状态源。
- 原因：消除双重状态带来的内存冗余和同步风险。
- 后果：无法通过 JS 数组获取历史日志文本——但当前无此需求。

### ADR-Xγ-03：弟子名点击事件委托位置

**上下文**：弟子名点击需要访问 `state`（查找弟子数据）和 `panelManager`（打开面板），事件委托需要绑定在合适的位置。

**备选方案**：

| 方案 | 说明 | 优劣 |
|------|------|------|
| A：在 main.ts 中绑定 | main.ts 已有 state、panelManager 引用 | ✅ 自然位置；⚠️ main.ts 行数增长 |
| B：在 engine-bindings.ts 中绑定 | 需额外传参 panelManager | ❌ engine-bindings 职责是引擎回调，不应处理 UI 事件 |
| C：在 panel-manager.ts 中提供 registerClickDelegate 方法 | PanelManager 提供绑定 API | ⚠️ PanelManager 需依赖 state+formatter |

**决策**：**方案 A** — 在 `main.ts` 初始化阶段绑定事件委托。
- 原因：main.ts 已持有所有必要引用（state、panelManager、formatter），新增 ~10 行足以实现。
- 后果：main.ts 由 114 行增至约 130 行，仍在 ≤150 行约束内。

---

## SGA Party Review

### 角色配置

| 类型 | 角色 | 维度数 |
|------|------|:-----:|
| 必选 | R4 项目经理 | 5 |
| 必选 | R5 偏执架构师 | 5 |
| 必选 | R6 找茬QA | 5 |

### L0：Content Traceability

> SGA Review 的 L0 跳过（仅 SPM User Story 审查触发 L0）。

### L1：维度穷举签字

#### R4 项目经理 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 交付可行性 | ✅ | 8 个文件变更，新增 1 文件，全部在 Presentation 层。复杂度 S~M，无技术障碍。 |
| D2 进度风险 | ✅ | 无外部依赖，无 Engine/Data 变更降低耦合风险。 |
| D3 跨版本影响 | ✅ | 零存档迁移，零 GameState 变更，向后完全兼容。 |
| D4 依赖完整性 | ✅ | 新增 panel-manager.ts 为叶节点（零外部依赖），依赖方向全部单向。 |
| D5 回归覆盖 | ✅ | 64/64 回归 + tsc 编译 + 4 项浏览器手动验证。TD-016 已记录 E2E 测试缺失。 |

#### R5 偏执架构师 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 耦合度 | ✅ | PanelManager 零外部依赖，通过 CommandContext 注入到 command-handler。依赖方向全部 ④→④（层内单向）。 |
| D2 扩展性 | ✅ | openPanel(title, html) 通用 API，新增面板类型仅需 1 行调用。 |
| D3 状态污染 | ✅ | 零 GameState 变更（HC-3）。PanelManager 仅维护 display 状态（DOM 原生）。ADR-Xγ-02 消除双重状态源。 |
| D4 性能预警 | ✅ | 内存修复将每秒 DOM 操作从 ~3000 降至 ~15。面板 open/close 为 O(1) CSS 属性切换。 |
| D5 命名一致 | ✅ | `panel-manager.ts` 命名与 `log-manager.ts` 一致。`mud-panel-*` CSS class 遵循 ADR-Xα-01。`wrapDiscipleName` 遵循 formatter 纯函数命名约定。 |

#### R6 找茬QA 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 边界值 | ✅ | MAIN_LOG_MAX=200 溢出时 removeChild 首个子节点。SYSTEM_LOG_MAX=5 同。面板最大高度 70vh + overflow-y: auto 处理超长内容。 |
| D2 错误路径 | ✅ | ESC 在无面板时无副作用。点击不存在的 disciple-id → findById 返回 undefined → 不弹面板。judge 无活跃裁决 → 系统提示。 |
| D3 竞态条件 | ✅ | openPanel 先隐式 close（L-01）消除多面板竞态。STORM 自动推送与手动 judge 互不冲突（同一 activeRuling）。 |
| D4 回归覆盖 | ✅ | 编译 + 64/64 回归 + 浏览器 6 项手动验证全面覆盖。 |
| D5 代码质量 | ✅ | ADR-Xγ-01/02/03 对关键决策有完整记录。z-index 策略明确（900 overlay / 1000 cmd-area / 9999 flash）。 |

### L2/L3

> 全部 L1 维度均为 ✅ PASS，无 WARN/BLOCK，跳过 L2/L3。

### 最终判定

✅ **PASS** — 全部 15 条维度审查均为 PASS，无 WARN/BLOCK。

---

## SGA Signoff

- [x] Interface 设计完整（PanelManager 接口 + wrapDiscipleName 纯函数 + CommandContext 扩展）
- [x] 迁移策略完整（零迁移 — 无 GameState / 存档变更）
- [x] Pipeline 挂载方案确认（零 Pipeline 变更 — 无新 Handler）
- [x] 依赖矩阵已更新（panel-manager.ts 为叶节点，3 条新依赖全部单向）
- [x] Party Review 无 BLOCK 项
- [x] 技术债务已登记（BUG-Xγ-01 本 Phase 清偿 + TD-022 保持不变）

签章：`[x] GATE 2 PASSED` — 2026-03-31
