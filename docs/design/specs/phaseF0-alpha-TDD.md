# Phase F0-α: 碰面世界 — TDD (Technical Design Document)

> **版本**：v1.0 | **维护者**：/SGA | **日期**：2026-03-30
> **状态**：GATE 2 审阅中
> **上游**：[phaseF0-alpha-PRD.md](../../features/phaseF0-alpha-PRD.md) — GATE 1 PASSED 2026-03-30
> **存档版本**：v4 → v5

---

## Step 1：全局对齐

### 1.1 分层归属

| 新增/变更 | 层 | 文件 |
|----------|:--:|----|
| `LocationTag`、`EncounterResult`、事件极性扩展 | ① Data | `src/shared/types/encounter.ts` [NEW] |
| `SoulEventType` + `SOUL_EVENT_POLARITY` 扩展 | ① Data | `src/shared/types/soul.ts` [MODIFY] |
| 碰面 Fallback 文案 | ① Data | `src/shared/data/encounter-templates.ts` [NEW] |
| `SectState` 新增 `ethos` + `discipline` | ① Data | `src/shared/types/game-state.ts` [MODIFY] |
| `encounter-tick.handler.ts` | ② Engine | `src/engine/handlers/encounter-tick.handler.ts` [NEW] |
| v4→v5 迁移 + `SAVE_VERSION` 更新 | ② Engine | `src/engine/save-manager.ts` [MODIFY] |
| `createDefaultLiteGameState()` 更新 | ① Data | `src/shared/types/game-state.ts` [MODIFY] |
| `TickPhase.ENCOUNTER` 新增 | ② Engine | `src/engine/tick-pipeline.ts` [MODIFY] |
| Handler 注册 | ② Engine | `src/engine/idle-engine.ts` [MODIFY] |

### 1.2 Invariant 对齐

全部 5 条 PRD Invariant 与现有架构无冲突（详见 SGA Step 1 对齐检查）。

---

## Step 2：Interface 设计 + GameState 变更

### 2.1 [NEW] `src/shared/types/encounter.ts` — 碰面类型定义

```typescript
/** 地点标签 — 6 个 Zone (PRD §3.1 R-F0α-E1) */
export const LocationTag = {
  SECT_HALL:      'sect-hall',
  DAN_ROOM:       'dan-room',
  LING_TIAN:      'ling-tian',
  BACK_MOUNTAIN:  'back-mountain',
  LING_SHOU_SHAN: 'ling-shou-shan',
  BOUNTY_FIELD:   'bounty-field',
} as const;
export type LocationTag = (typeof LocationTag)[keyof typeof LocationTag];

/** 碰面结果 — 4 种 (PRD §3.1 R-F0α-E2) */
export const EncounterResult = {
  CHAT:     'chat',
  DISCUSS:  'discuss',
  CONFLICT: 'conflict',
  NONE:     'none',
} as const;
export type EncounterResult = (typeof EncounterResult)[keyof typeof EncounterResult];

/** 地点中文名映射 (PRD §4.1) */
export const LOCATION_LABEL: Record<LocationTag, string> = {
  'sect-hall':      '宗门大殿',
  'dan-room':       '丹房',
  'ling-tian':      '灵田',
  'back-mountain':  '后山',
  'ling-shou-shan': '灵兽山',
  'bounty-field':   '悬赏任务区',
};

/** 行为 → 地点映射表 (PRD §3.3 F-F0α-01) */
import type { DiscipleBehavior } from './game-state';
export const BEHAVIOR_LOCATION_MAP: Record<DiscipleBehavior, LocationTag> = {
  meditate: 'back-mountain',
  alchemy:  'dan-room',
  farm:     'ling-tian',
  explore:  'ling-shou-shan',
  bounty:   'bounty-field',
  rest:     'sect-hall',
  idle:     'sect-hall',
};

/** 纯函数：推导弟子所在地点 (PRD §3.3 F-F0α-01) */
export function getDiscipleLocation(behavior: DiscipleBehavior): LocationTag {
  return BEHAVIOR_LOCATION_MAP[behavior];
}

// ===== 碰面引擎常量 (PRD §3.3 F-F0α-02) =====

/** 碰面扫描间隔（秒/tick） */
export const ENCOUNTER_SCAN_INTERVAL_SEC = 5;
/** 同一对弟子碰面冷却（秒） */
export const ENCOUNTER_COOLDOWN_SEC = 60;
/** 碰面基础概率 */
export const BASE_ENCOUNTER_CHANCE = 0.20;

// ===== 碰面结果概率表 (PRD §3.3 F-F0α-03) =====

/** 好感度分档阈值 */
export const AFFINITY_BAND = {
  FRIEND_THRESHOLD:  60,   // avg_aff >= 60
  HOSTILE_THRESHOLD: -60,  // avg_aff <= -60
} as const;

/**
 * 概率表 — 加权随机权重（非百分比，但按 PRD 1:1 对应）
 * 表格按 [discuss, chat, conflict, none] 排列
 */
export const ENCOUNTER_PROBABILITY_TABLE: Record<
  'friend' | 'hostile' | 'neutral',
  { discuss: number; chat: number; conflict: number; none: number }
> = {
  friend:  { discuss: 50, chat: 50, conflict:  0, none:  0 },
  hostile: { discuss:  0, chat: 10, conflict: 60, none: 30 },
  neutral: { discuss:  5, chat: 30, conflict:  5, none: 60 },
};

/** 碰面事件元数据负载 (PRD §3.1 R-F0α-E6) */
export interface EncounterEventPayload {
  partnerId: string;
  partnerName: string;
  location: LocationTag;
  encounterResult: Exclude<EncounterResult, 'none'>;
  avgAffinity: number;
}
```

### 2.2 [MODIFY] `src/shared/types/soul.ts` — SoulEventType 扩展

新增 3 个碰面事件类型到 `SoulEventType` 联合类型：

```diff
export type SoulEventType =
  | 'alchemy-success'
  | 'alchemy-fail'
  | 'harvest'
  | 'meditation'
  | 'explore-return'
  | 'breakthrough-success'
- | 'breakthrough-fail';
+ | 'breakthrough-fail'
+ | 'encounter-chat'      // Phase F0-α: 碰面闲聊
+ | 'encounter-discuss'   // Phase F0-α: 碰面论道
+ | 'encounter-conflict'; // Phase F0-α: 碰面冲突
```

`SOUL_EVENT_POLARITY` 同步扩展：

```diff
export const SOUL_EVENT_POLARITY: Record<SoulEventType, SoulEventPolarity> = {
  // ... 现有 7 条 ...
+ 'encounter-chat':     'positive',
+ 'encounter-discuss':  'positive',
+ 'encounter-conflict': 'negative',
};
```

### 2.3 [NEW] `src/shared/data/encounter-templates.ts` — Fallback 文案

```typescript
import type { EncounterResult } from '../types/encounter';

/** 碰面 Fallback 文案模板 (PRD §4.2) */
export const ENCOUNTER_TEMPLATES: Record<
  Exclude<EncounterResult, 'none'>,
  string[]
> = {
  chat: [
    '{A}在{LOC}遇到了{B}，两人有一搭没一搭地聊了几句。',
    '{B}路过{LOC}，{A}叫住了对方，闲谈片刻。',
    '{A}和{B}在{LOC}不期而遇，随口聊了几句宗门琐事。',
  ],
  discuss: [
    '{A}与{B}在{LOC}席地而坐，交流起修炼心得。',
    '{A}和{B}就某个功法的诀窍辩论了起来，两人都有所领悟。',
    '{B}向{A}请教了一个难题，{A}倾囊相授，一时相谈甚欢。',
  ],
  conflict: [
    '气氛有些紧张，{A}和{B}在{LOC}发生了言语上的冲突。',
    '{A}见到{B}后冷哼一声，两人互相挖苦了几句。',
    '{A}与{B}在{LOC}差点动起手来，幸好旁人拉住了。',
  ],
};
```

### 2.4 [MODIFY] `src/shared/types/game-state.ts` — SectState 扩展

```diff
export interface SectState {
  name: string;
  level: SectLevel;
  reputation: number;
  auraDensity: number;
  stoneDripAccumulator: number;
  tributePills: number;
+ /** Phase F0-α: 道风 [-100, +100]，-100=仁 ↔ +100=霸 */
+ ethos: number;
+ /** Phase F0-α: 门规 [-100, +100]，-100=放 ↔ +100=律 */
+ discipline: number;
}
```

`createDefaultLiteGameState()` 更新：

```diff
sect: {
  name: '无名小宗', level: 1, reputation: 0,
  auraDensity: 1.0, stoneDripAccumulator: 0, tributePills: 0,
+ ethos: 0, discipline: 0,  // 默认中庸，开局选择后可覆盖
},
```

### 2.5 存档迁移策略 v4 → v5

```typescript
/**
 * v4 → v5 显式迁移 (Phase F0-α)
 *
 * - SectState 增 ethos / discipline（默认 0 = 中庸）
 */
function migrateV4toV5(raw: Record<string, unknown>): void {
  const sect = raw['sect'] as Record<string, unknown> | undefined;
  if (sect && typeof sect === 'object') {
    if (sect['ethos'] === undefined) sect['ethos'] = 0;
    if (sect['discipline'] === undefined) sect['discipline'] = 0;
  }
  raw['version'] = 5;
  console.log('[SaveManager] v4 → v5 迁移完成');
}
```

`SAVE_VERSION` 更新：`4 → 5`

`migrateSave()` 添加链式调用：

```diff
  if ((raw['version'] as number) < 4) {
    migrateV3toV4(raw);
  }
+ if ((raw['version'] as number) < 5) {
+   migrateV4toV5(raw);
+ }
```

### 2.6 Owner 声明（GameState 新增字段）

| 字段 | Owner（唯一写入者） | 读取者 |
|------|:---:|---------|
| `sect.ethos` | `createDefaultLiteGameState()` 初始化 + 未来 Phase H 裁决 | 未来 AI prompt + 事件池权重 |
| `sect.discipline` | 同上 | 同上 |

**F0-α 中无运行时写入者** — 初始化后只读（直到 Phase H 引入裁决漂移）。

---

## Step 3：Tick Pipeline 挂载 + 依赖矩阵

### 3.1 Pipeline 挂载

**新增 TickPhase**：

```typescript
/** 610: 碰面检定（Phase F0-α）— DISCIPLE_AI(600) 之后、SOUL_EVAL(625) 之前 */
ENCOUNTER: 610,
```

**新增 Handler**：

| # | Handler | Phase | Order | 文件 |
|---|---------|:-----:|:-----:|------|
| 11 | `encounter-tick` | 610 | 0 | `handlers/encounter-tick.handler.ts` |

**执行时序保证**：

```
600 disciple-tick  → 弟子行为已确定（behavior 字段已更新）
610 encounter-tick → 基于 behavior 推导 location → 碰面检定 → emit EventBus + MUD 日志
625 soul-event     → drain EventBus（F0-α 中 encounter 事件被 drain 但无特殊处理）
```

### 3.2 encounter-tick handler 内部架构

```
encounter-tick handler
├── 前置判定：tickCount % 5 !== 0 → return
├── 分组：按 getDiscipleLocation(d.behavior) 分组 8 弟子
├── 配对枚举：每个 ≥2 人的地点 → C(n,2) 无序对
├── 冷却检查：pairKey → cooldownMap.get(pairKey)
├── 概率掷骰：random() < 0.20
├── 结果判定：avgAffinity → band → ENCOUNTER_PROBABILITY_TABLE → 加权随机
├── 事件发射：result !== 'none' → eventBus.emit(×2 双向)
└── MUD 日志：result !== 'none' → 模板替换 → logger 输出
```

**运行时状态（不持久化）**：

```typescript
// 挂载在 handler 模块作用域（闭包级别）
const cooldownMap = new Map<string, number>();  // pairKey → lastEncounterTimestamp
```

- `cooldownMap` 生命周期 = 页面生命周期
- 刷新/重启后自动清零 → 第一轮 tick 不受冷却限制（可接受）

### 3.3 TickContext 变更

**F0-α 不需要扩展 TickContext**。encounter-tick handler 通过现有字段运作：
- `ctx.state.disciples` — 读取行为
- `ctx.state.relationships` — 读取 affinity
- `ctx.eventBus` — emit 碰面事件
- `ctx.logger` — 输出 MUD 日志

### 3.4 依赖矩阵更新

| 文件 ↓ 依赖 → | game-state | encounter.ts | encounter-templates.ts | soul.ts | tick-pipeline | event-bus |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **encounter-tick.handler** | R | R | R | R | R | W(emit) |
| **soul.ts** | — | — | — | — | — | — |
| **encounter.ts** | R(DiscipleBehavior) | — | — | — | — | — |

### 3.5 回归影响评估

| 变更 | 风险 | 影响系统 | 验证方式 |
|------|:----:|---------|---------|
| `SoulEventType` 扩展 | 🟢 低 | soul-engine（fallback switch）| 确认 switch 有 default 分支 |
| `SectState` 新增字段 | 🟢 低 | 无现有代码读取 ethos/discipline | TypeScript 编译检查 |
| `SAVE_VERSION` 4→5 | 🟡 中 | save-manager 全链迁移 | v1→v5 完整迁移链脚本 |
| 新增 `TickPhase.ENCOUNTER(610)` | 🟢 低 | tick-pipeline 排序 | handler 列表顺序验证 |
| `SOUL_EVENT_POLARITY` 扩展 | 🟢 低 | soul-engine correctDeltaDirection | 确认现有逻辑不会报错 |

**回归测试范围**：
1. `regression-all.ts` 原有 64 条断言全部重跑
2. 新增 v4→v5 迁移链断言（≥3 条）
3. 新增碰面 Monte Carlo 密度统计脚本

---

## Step 4：ADR 决策日志

### ADR-F0α-01：碰面 handler phase=610（新增 TickPhase slot）

- **问题**：Encounter 应挂载在哪个 Pipeline 阶段？
- **备选方案**：
  - A) 复用 `DISCIPLE_AI(600)`，order=10 → 与 disciple-tick 同阶段耦合
  - B) 复用 `SOUL_EVAL(625)`，order=-10 → 语义不匹配（碰面≠灵魂评估）
  - C) **新增 `ENCOUNTER=610`** → 语义独立，排序清晰
- **决策**：C
- **理由**：TickPhase 间距 100 允许中间插入。610 位于 600(DISCIPLE_AI) 和 625(SOUL_EVAL) 之间，语义准确：弟子行为确定后 → 碰面检定 → 灵魂事件评估
- **后果**：TickPhase 枚举增加一个成员；未来 F0-β 的世界事件 handler 可挂载在类似位置

### ADR-F0α-02：碰面冷却 Map 不持久化

- **问题**：冷却状态刷新后丢失是否可接受？
- **备选方案**：
  - A) 持久化到 GameState → 增加存档体积 + 序列化复杂度
  - B) **不持久化** → 刷新后第一轮无冷却保护
- **决策**：B
- **理由**：C(8,2)=28 对，最坏情况刷新后立刻出 1~2 次碰面 → 对用户体验影响微乎其微。持久化 Map 的工程成本远超收益
- **后果**：接受"刷新后碰面立即可能触发"的微小体验波动

### ADR-F0α-03：碰面事件 emit 到 EventBus 但 F0-α 中无消费者

- **问题**：emit 了但 soul-event handler 不认识 encounter 类型，是否浪费？
- **备选方案**：
  - A) F0-α 不 emit → 后续 Phase F 需要改 handler 且无向后兼容
  - B) **emit 但 drain 后丢弃** → Phase F 只需在 soul-event handler 加处理分支
- **决策**：B
- **理由**：EventBus 是 FIFO 队列，drain 后即清空，无资源泄漏。提前 emit 为 Phase F 铺路。MUD 日志由 encounter-tick handler 直接输出，不依赖 soul-event
- **后果**：soul-event handler 需确认 switch/if-else 对未知类型有容错（已有 `processSoulEvent` fallback）

---

## SGA Signoff

- [x] Interface 设计完整（所有新字段有 Owner）
- [x] 存档迁移策略完整（v4→v5 migrateV4toV5 已规划）
- [x] Pipeline 挂载方案确认（TickPhase.ENCOUNTER=610）
- [x] 依赖矩阵已更新（§3.4）
- [x] Party Review 无 BLOCK 项（CONDITIONAL PASS：13 PASS / 2 WARN / 0 BLOCK）
- [x] 技术债务已登记（WARN 项传递给 SGE 作为实施约束）

签章：`[x] GATE 2 PASSED` — 2026-03-30

---

## 变更日志

| 日期 | 变更内容 |
|------|---------| 
| 2026-03-30 | /SGA 完成 Phase F0-α TDD v1.0 |
