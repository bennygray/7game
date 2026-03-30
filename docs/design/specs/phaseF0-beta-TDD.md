# Phase F0-β TDD — 活世界系统架构设计

> **版本**：v1.0 | **维护者**：/SGA | **日期**：2026-03-30
> **关联 PRD**：`docs/features/phaseF0-beta-PRD.md`
> **前置**：Phase F0-α ✅（碰面世界，存档 v5）

---

## Step 1：全局对齐

### 1.1 分层归属

| 新增组件 | 归属层 | 说明 |
|---------|:------:|------|
| `WorldEventDef`, `WorldEventPayload`, `EventSeverity`, `EventScope`, `StorytellerState` | **Shared/Types** | 纯类型定义 |
| `WORLD_EVENT_REGISTRY`, 文案模板 | **Shared/Data** | 静态注册表（只读数据） |
| `Storyteller` 类 | **Engine** | 运行时状态 + 张力计算（不持久化） |
| `world-event-tick.handler.ts` | **Engine/Handlers** | Pipeline 挂载 |
| `'world-event'` SoulEventType 扩展 | **Shared/Types** | 枚举扩展 |
| emotion-pool `'world-event'` 映射 | **Shared/Data** | 映射表扩展 |

### 1.2 Invariant 交叉验证

| PRD Invariant | 现有架构 | 冲突？ |
|--------------|---------|:------:|
| I1: 事件不直接写 GameState | ✅ 符合 EventBus 模式（ADR-E03） | ✅ 无冲突 |
| I2: 只升不降，最多+1 | N/A（新增逻辑） | ✅ 无冲突 |
| I3: AI 不直接写 GameState | ✅ 已有 soul-engine 中介 | ✅ 无冲突 |
| I5: 静态池只增不删 | N/A（新增注册表） | ✅ 无冲突 |
| I6: 张力指数 [0,100] | N/A（新增状态） | ✅ 无冲突 |

### 1.3 存档影响

> **结论：不升级存档版本（保持 v5）**

- `Storyteller` 是纯运行时状态，重启重置
- `WORLD_EVENT_REGISTRY` 是静态常量，不入存档
- 无新 GameState 字段，无需迁移函数

---

## Step 2：Interface 设计

### 2.1 新增类型 — `src/shared/types/world-event.ts`

```typescript
/** 事件严重度五级体系 */
export const EventSeverity = {
  BREATH: 0,     // 喘息 — 纯氛围，不触发 SoulEvent
  RIPPLE: 1,     // 涟漪 — 触发 SoulEvent，轻微情绪
  SPLASH: 2,     // 浪花 — 触发 SoulEvent，中等情绪
  STORM: 3,      // 风暴 — 触发 SoulEvent，强烈情绪 + 喘息期
  CALAMITY: 4,   // 天劫 — F0-β 仅定义，不实际抽取
} as const;
export type EventSeverity = (typeof EventSeverity)[keyof typeof EventSeverity];

/** 事件影响范围 */
export type EventScope = 'single' | 'multi' | 'sect';

/** 事件极性（用于 soul-engine 消费） */
export type EventPolarity = 'positive' | 'negative' | 'neutral';

/** 道风亲和度配置 */
export interface EthosAffinity {
  sign: number;    // +1=霸道亲和, -1=仁道亲和
  factor: number;  // 调节强度 0.0~1.0
}

/** 世界事件定义（静态注册表条目） */
export interface WorldEventDef {
  id: string;
  name: string;
  baseSeverity: EventSeverity;
  weight: number;
  scope: EventScope;
  polarity: EventPolarity;
  canEscalate: boolean;
  ethosAffinity: EthosAffinity;
  /** 条件判定：返回 true 表示此事件可被抽取 */
  condition: (state: LiteGameState) => boolean;
  /** MUD 文案模板（至少 3 条） */
  templates: string[];
}

/** 世界事件运行时载荷（emit 到 EventBus 的数据） */
export interface WorldEventPayload {
  eventDefId: string;
  severity: EventSeverity;
  scope: EventScope;
  polarity: EventPolarity;
  involvedDiscipleIds: string[];
  location: string | null;
  timestamp: number;
}

/** Storyteller 运行时状态（不持久化） */
export interface StorytellerState {
  tensionIndex: number;          // [0, 100] 张力指数
  lastStormTimestamp: number;    // 上次 Lv.3+ 事件的时间戳
  eventHistory: WorldEventPayload[]; // 最近 20 条事件记录
}
```

### 2.2 扩展 — `src/shared/types/soul.ts`

```typescript
// SoulEventType 新增：
| 'world-event'       // Phase F0-β: 世界事件

// SOUL_EVENT_POLARITY 新增：
'world-event': 'positive',  // 默认正向（实际极性由 metadata.polarity 运行时覆盖）
```

### 2.3 不变量守卫

- `WorldEventDef.condition` 为纯函数，只读 GameState
- `Storyteller` 实例挂载于 `IdleEngine`，不序列化
- `WorldEventPayload` 通过 EventBus emit，不写入 GameState

---

## Step 3：Pipeline 挂载方案

### 3.1 新增 Handler

```
world-event-tick | Phase: 605 (WORLD_EVENT) | Order: 0 | 文件: handlers/world-event-tick.handler.ts
```

**位置论证**：

```
600 DISCIPLE_AI     ← 弟子行为已确定（含 location）
605 WORLD_EVENT     ← 🆕 世界事件抽取（依赖弟子 location）
610 ENCOUNTER       ← 碰面检定（可与世界事件叠加）
625 SOUL_EVAL       ← 灵魂评估（消费世界事件的 SoulEvent）
```

### 3.2 TickPhase 新增

```typescript
export const TickPhase = {
  // ... 现有
  DISCIPLE_AI:      600,
  WORLD_EVENT:      605,  // 🆕 Phase F0-β: 世界事件抽取
  ENCOUNTER:        610,
  // ... 后续
} as const;
```

### 3.3 TickContext 无变更

世界事件通过 `ctx.eventBus` emit SoulEvent，通过 `ctx.logger` 输出 MUD 日志。
不需要新增 TickContext 字段。

### 3.4 依赖矩阵新增

| 文件 | 依赖 |
|------|------|
| `handlers/world-event-tick.handler.ts` | R: game-state, world-event-registry, storyteller; W: EventBus(emit), Logger(log) |
| `storyteller.ts` | R: game-state (sect.ethos, relationships), world-event-registry |
| `world-event-registry.ts` | R: game-state (condition 判定) |

### 3.5 回归影响评估

| 影响范围 | 分析 |
|---------|------|
| `soul.ts` | 新增 SoulEventType 成员 → emotion-pool.ts 必须同步扩展 |
| `emotion-pool.ts` | 新增 'world-event' 映射 → 不影响现有映射 |
| `tick-pipeline.ts` | 新增 TickPhase.WORLD_EVENT = 605 → 不影响现有 phase 值 |
| `idle-engine.ts` | 导入并注册新 handler → 不影响现有逻辑 |
| `soul-event.handler.ts` | 已有能力消费 SoulEvent → 无需修改（'world-event' 走通用路径） |

**回归风险**：低。纯增量变更，不修改任何现有接口。

---

## Step 4：ADR

### ADR-F0β-01：Storyteller 状态存储方案

**状态**：ACCEPTED

**背景**：Storyteller 需要记录张力指数和事件历史。是否持久化到 GameState？

**备选方案对比**：

| 维度 | 方案 A：GameState 持久化 | 方案 B：运行时状态（采用） |
|------|-----------------------|------------------------|
| 存档版本 | 需升级 v5→v6 + 迁移函数 | 保持 v5，无迁移 |
| 复杂度 | 高（新字段 + 序列化 + 迁移） | 低（类内部 state） |
| 重启体验 | 张力延续 | 张力重置为 30（初始值） |
| 设计一致性 | 破坏"纯运行时"原则 | ✅ 符合 PRD I4: Storyteller 无存档 |

**决策**：方案 B。Storyteller 为纯运行时状态，重启后张力重置为初始值 30。这是设计意图——每次会话都从"平静"开始，自然升温。

**后果**：
- 正面：零迁移成本，架构简洁
- 负面：长时间运行累积的张力在刷新页面后丢失
- 技术债务：无

---

## SGA Signoff

- [x] Interface 设计完整（所有新类型有 Owner）
- [x] 不需要存档迁移（保持 v5）
- [x] Pipeline 挂载方案确认（Phase 605）
- [x] 依赖矩阵已更新（§3.4）
- [x] Party Review 待执行
- [x] 技术债务：无新增（SPM 4 个 WARN 已在 tech-debt.md 登记范围内）

签章：`[x] GATE 2 PASSED` — 2026-03-30

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-30 | 初始创建：TDD v1.0 + ADR-F0β-01 |
