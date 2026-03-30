# Phase H-γ — 掌门裁决 TDD

> **版本**：v1.0 | **日期**：2026-03-31 | **作者**：/SGA
> **PRD**：[phaseH-gamma-PRD.md](../../features/phaseH-gamma-PRD.md) — `[x] GATE 1 PASSED`
> **User Stories**：[phaseH-gamma-user-stories.md](phaseH-gamma-user-stories.md)

---

## §1 全局对齐检查

### 分层归属

| 变更项 | 层级 | 文件 |
|--------|------|------|
| RulingDef / ActiveRuling / RulingOption 类型 | ① Data | `ruling.ts`（新增） |
| 裁决注册表（12 条） | ① Data | `ruling-registry.ts`（新增） |
| TickContext +pendingStormEvent | ② Engine | `tick-pipeline.ts` |
| world-event-tick.handler 设置 pendingStormEvent | ② Engine | `world-event-tick.handler.ts` |
| IdleEngine 裁决管理（create/resolve/timeout） | ② Engine | `idle-engine.ts` |
| formatRulingWindow / formatRulingResult | ④ Presentation | `mud-formatter.ts` |
| judge 命令 + 裁决回调注册 | ④ Presentation | `main.ts` |

### 跨层通信审计

- X-1 ✅ UI 不修改 GameState（`judge` 命令调用 `engine.resolveRuling()`，Engine 内部修改 sect）
- X-3 ✅ 不重复实现公式
- X-6 ✅ 不新增 Pipeline Handler（变更在 handler 内部和回调分发区）

### GameState 变更

**无新增字段。** sect.ethos 和 sect.discipline 已存在（Phase F0-α），仅变更写入权限：

| 字段 | 旧状态 | 新状态 |
|------|--------|--------|
| sect.ethos | 初始化后只读 | 初始化 + 裁决系统写入 |
| sect.discipline | 初始化后只读 | 初始化 + 裁决系统写入 |

**Owner 变更**：裁决系统（idle-engine.ts 内部）成为 sect.ethos/discipline 的第二个 Writer。无竞态风险——裁决仅在回调分发区（handler 执行完毕后）同步执行。

**零存档迁移。** GameState v5 不变。

---

## §2 Interface 设计

### 2.1 新增类型（ruling.ts）

```typescript
// src/shared/types/ruling.ts

import type { WorldEventPayload, EventPolarity } from './world-event';

/** 裁决定义（静态注册表条目） */
export interface RulingDef {
  /** 裁决 ID，格式 RD-{eventId}-{N} 或 RD-G{polarity}-{N} */
  id: string;
  /** 关联的 WorldEventDef.id（通用池为 null） */
  eventDefId: string | null;
  /** 通用池极性匹配（仅通用裁决使用） */
  polarity: EventPolarity | null;
  /** 选项标签（中文，≤20字） */
  label: string;
  /** 选项描述（中文，1~2 句话） */
  description: string;
  /** 道风漂移值 [-2, +2] */
  ethosShift: number;
  /** 门规漂移值 [-2, +2] */
  disciplineShift: number;
  /** 裁决后 MUD 文案 */
  mudText: string;
}

/** 裁决选项（运行时实例，从 RulingDef 实例化） */
export interface RulingOption {
  /** 选项序号（1-based） */
  index: number;
  /** 选项标签 */
  label: string;
  /** 选项描述 */
  description: string;
  /** 道风漂移值 */
  ethosShift: number;
  /** 门规漂移值 */
  disciplineShift: number;
  /** 裁决后 MUD 文案 */
  mudText: string;
}

/** 活跃裁决（运行时状态，不持久化） */
export interface ActiveRuling {
  /** 触发此裁决的事件载荷 */
  eventPayload: WorldEventPayload;
  /** 事件名称 */
  eventName: string;
  /** 事件渲染文案 */
  eventText: string;
  /** 可选裁决项 */
  options: RulingOption[];
  /** 创建时间戳（inGameWorldTime） */
  createdAt: number;
  /** 过期时间戳 */
  expiresAt: number;
  /** 是否已裁决 */
  resolved: boolean;
}

/** 裁决结算结果 */
export interface RulingResolution {
  /** 选择的选项 */
  option: RulingOption;
  /** 是否超时自动结算 */
  timedOut: boolean;
  /** 超时 fallback 文案（仅超时时有值） */
  timeoutText: string | null;
  /** 道风漂移后的新值 */
  newEthos: number;
  /** 门规漂移后的新值 */
  newDiscipline: number;
}
```

### 2.2 TickContext 新增字段

```typescript
// tick-pipeline.ts TickContext 新增：

/** Phase H-γ: 本 tick 触发的 STORM 事件载荷（world-event-tick 设置） */
pendingStormEvent?: WorldEventPayload;
```

### 2.3 IdleEngine 新增

```typescript
// ===== 新增回调类型 =====

/** 裁决窗口创建回调 */
export type RulingCreatedCallback = (ruling: ActiveRuling) => void;

/** 裁决结算回调 */
export type RulingResolvedCallback = (resolution: RulingResolution) => void;

// ===== IdleEngine 新增属性 =====

private activeRuling: ActiveRuling | null = null;
private onRulingCreated: RulingCreatedCallback | null = null;
private onRulingResolved: RulingResolvedCallback | null = null;

// ===== IdleEngine 新增方法 =====

/** 注册裁决创建回调 */
setOnRulingCreated(cb: RulingCreatedCallback): void;

/** 注册裁决结算回调 */
setOnRulingResolved(cb: RulingResolvedCallback): void;

/** 获取当前活跃裁决（只读副本） */
getActiveRuling(): ActiveRuling | null;

/**
 * 玩家裁决：选择选项 N
 * @param optionIndex - 选项序号（1-based）
 * @returns RulingResolution 如果成功，null 如果无效
 */
resolveRuling(optionIndex: number): RulingResolution | null;
```

### 2.4 裁决核心逻辑（idle-engine 内部）

```typescript
/**
 * 创建裁决窗口（STORM 事件触发时调用）
 *
 * 1. 从 ruling-registry 查找选项（专属 > 通用池）
 * 2. 构建 ActiveRuling
 * 3. 触发 onRulingCreated 回调
 */
private createRuling(payload: WorldEventPayload, eventText: string): void;

/**
 * 检查裁决超时（每 tick 调用）
 *
 * 如果 activeRuling 存在且 inGameWorldTime > expiresAt：
 * 1. 等概率随机选择一个选项
 * 2. 执行道风漂移
 * 3. 触发 onRulingResolved 回调
 * 4. 清除 activeRuling
 */
private checkRulingTimeout(): void;

/**
 * 执行道风漂移
 *
 * sect.ethos = clamp(sect.ethos + option.ethosShift, -100, 100)
 * sect.discipline = clamp(sect.discipline + option.disciplineShift, -100, 100)
 */
private applyEthosDrift(option: RulingOption): void;
```

### 2.5 裁决注册表查找函数

```typescript
// ruling-registry.ts

/**
 * 查找裁决选项
 *
 * 1. 优先匹配 eventDefId 专属选项
 * 2. 无专属 → fallback 到 polarity 通用池
 * 3. 通用池也无 → 返回空数组（由调用方处理）
 */
export function findRulingOptions(
  eventDefId: string,
  polarity: EventPolarity,
): RulingDef[];
```

### 2.6 新增格式化函数（mud-formatter.ts）

```typescript
/**
 * 渲染裁决窗口（STORM 事件触发时）
 * @param ruling - 活跃裁决
 * @param remainingSeconds - 剩余秒数
 */
export function formatRulingWindow(
  ruling: ActiveRuling,
  remainingSeconds: number,
): string;

/**
 * 渲染裁决结算结果
 * @param resolution - 裁决结算结果
 */
export function formatRulingResult(
  resolution: RulingResolution,
): string;
```

### 2.7 main.ts 命令扩展

```typescript
// judge 命令解析
// 'judge'       → 显示当前裁决窗口（getActiveRuling）
// 'judge N'     → 执行裁决（resolveRuling(N)）
// 无活跃裁决时  → 提示"当前没有待裁决的事件。"
```

---

## §3 Pipeline 挂载

**无新增 Handler。** 变更在两处：

### 3.1 world-event-tick.handler 内部变更

在 handler.execute() 末尾，STORM 事件触发后设置 ctx：

```typescript
// Phase H-γ: 标记 STORM 事件供裁决系统消费
if (payload.severity >= EventSeverity.STORM) {
  ctx.pendingStormEvent = payload;
}
```

### 3.2 idle-engine.tick() 回调分发区变更

在统一日志管线之后、最终 onTick 之前：

```typescript
// Phase H-γ: 裁决超时检查
this.checkRulingTimeout();

// Phase H-γ: STORM 事件 → 创建裁决窗口
if (ctx.pendingStormEvent && !this.activeRuling) {
  const text = /* 从 log entries 中提取事件文案 */;
  this.createRuling(ctx.pendingStormEvent, text);
}
```

### 执行时序

```
Pipeline.execute(ctx)    ← 所有 handler 执行完毕
  ↓
ctx.farmLogs → onFarmTickLog              ← 既有
ctx.discipleEvents → onDiscipleBehaviorChange  ← 既有
ctx.systemLogs → onSystemLog              ← 既有
dialogueTriggers → dialogueCoordinator    ← 既有
  ↓
ctx.logger.flush() → onMudLog             ← Phase H-β
  ↓
checkRulingTimeout()                      ← 新增（Phase H-γ）
pendingStormEvent → createRuling()        ← 新增（Phase H-γ）
  ↓
onTick → 最终通知                          ← 既有
```

---

## §4 文件变更清单

| # | 文件 | 变更类型 | 变更内容 |
|---|------|---------|---------|
| 1 | `src/shared/types/ruling.ts` | 新增 | RulingDef, RulingOption, ActiveRuling, RulingResolution 接口 |
| 2 | `src/shared/data/ruling-registry.ts` | 新增 | 12 条裁决定义（Object.freeze）+ findRulingOptions() |
| 3 | `src/engine/tick-pipeline.ts` | 修改 | TickContext +pendingStormEvent 可选字段 |
| 4 | `src/engine/handlers/world-event-tick.handler.ts` | 修改 | STORM 事件设置 ctx.pendingStormEvent |
| 5 | `src/engine/idle-engine.ts` | 修改 | +ActiveRuling 管理 +裁决回调 +超时检查 +道风漂移 |
| 6 | `src/ui/mud-formatter.ts` | 修改 | +formatRulingWindow() +formatRulingResult() |
| 7 | `src/main.ts` | 修改 | +judge 命令 +裁决回调注册 |

**不修改的文件**：storyteller.ts、game-state.ts、存档相关、所有其他 handler。

---

## §5 实施计划

### 实施顺序

```
Step A: ruling.ts 类型定义              ← 独立，最先
Step B: ruling-registry.ts 注册表       ← 依赖 Step A
Step C: tick-pipeline.ts +字段          ← 独立
Step D: world-event-tick.handler 修改    ← 依赖 Step C
Step E: idle-engine.ts 裁决管理         ← 依赖 Step A/B/C
Step F: mud-formatter.ts 格式化         ← 依赖 Step A
Step G: main.ts 命令+回调              ← 依赖 Step E/F
Step H: 回归测试 + 手动验证            ← 依赖 Step G
```

### 验证计划

| # | 验证项 | 方式 | Story 对应 |
|---|--------|------|-----------|
| V1 | 回归测试 64/64 | `npm run test:regression` | AC-15 |
| V2 | TypeScript 编译零错误 | `npx tsc --noEmit` | AC-16 |
| V3 | STORM 事件触发裁决窗口 | 浏览器运行等待 STORM | AC-01 |
| V4 | judge N 命令正常裁决 | 浏览器手动 | AC-04/05/06/07 |
| V5 | 超时自动结算 | 等 5 分钟不裁决 | AC-08/09 |
| V6 | sect 命令验证道风变化 | 裁决后 sect | AC-10/11 |

---

## §6 ADR 决策日志

### ADR-Hγ-01：裁决触发点选择

**背景**：STORM 事件产生于 world-event-tick.handler（Phase 605），但裁决需要在 handler 之外创建（handler 不应直接管理 UI 交互状态）。

**备选方案**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. TickContext 传递 | handler 设置 ctx.pendingStormEvent，idle-engine 回调区消费 | 与 dialogueTriggers 模式一致 | TickContext 增加 1 字段 |
| B. EventBus 事件 | handler emit 特殊事件，idle-engine 监听 | 解耦 | EventBus 每 tick 重建，监听需额外 wire-up |
| C. 回调注入 | handler 接收 onStormEvent 回调 | 直接 | handler 不应持有 UI 回调 |

**决策**：方案 A。

**理由**：
1. 与 dialogueTriggers（Phase D）模式完全一致，团队熟悉
2. TickContext 已有 7 个字段，+1 可接受
3. handler 保持纯数据职责，不持有回调

**后果**：
- TickContext 新增 pendingStormEvent 可选字段
- 如未来有更多 handler 需要传递特殊事件，可考虑泛化为 `pendingEvents: Map<string, unknown>`（TD-019 预留）

### ADR-Hγ-02：ActiveRuling 不持久化

**背景**：裁决窗口是否需要跨页面刷新保持？

**决策**：不持久化。

**理由**：
1. 与 StorytellerState 不持久化一致（ADR-F0β-01）
2. 页面刷新后 Storyteller 重置，原 STORM 事件已消失
3. 裁决窗口 300 秒超时，页面刷新等价于"超时自动结算"
4. 零存档迁移，避免 GameState v6 的复杂性

**后果**：
- 页面刷新会丢失未结算的裁决
- 对挂机玩家无影响（I4：错过不惩罚）

---

## SGA Signoff

- [x] Interface 设计完整（新增 ruling.ts 类型 + ruling-registry.ts 数据，无新 GameState 字段）
- [x] 迁移策略完整（零存档迁移，GameState v5 不变）
- [x] Pipeline 挂载方案确认（无新增 Handler，变更在 handler 内部 + 回调分发区）
- [x] 依赖矩阵无新增跨层方向（idle-engine 新增对 ruling-registry 的 R 依赖）
- [x] Party Review 无 BLOCK 项（1 WARN = TD-016 既有）
- [x] 技术债务已登记（TD-019 预留泛化 pendingEvents）

签章：`[x] GATE 2 PASSED` — 2026-03-31

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-31 | v1.0 | 初始创建 |
