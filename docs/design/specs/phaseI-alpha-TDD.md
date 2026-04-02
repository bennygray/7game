# Phase I-alpha TDD — 因果引擎 + 高级关系标签

> **版本**：v1.0 | **日期**：2026-04-01
> **角色**：/SGA（Gate 2）
> **前置**：PRD v1.1 `[x] GATE 1 PASSED`
> **状态**：Draft

---

## Step 1：全局对齐检查表

| # | 检查项 | 结论 |
|---|--------|------|
| A1 | CausalRuleEvaluator 所属层？ | Engine (`src/engine/causal-evaluator.ts`) ✅ |
| A2 | causal-rule-registry 所属层？ | Shared/Data (`src/shared/data/causal-rule-registry.ts`) ✅ |
| A3 | relationship-formulas 所属层？ | Shared/Formulas (`src/shared/formulas/relationship-formulas.ts`) ✅ |
| A4 | 新增 SoulEventType 兼容性？ | 扩展联合类型 + SOUL_EVENT_POLARITY + EMOTION_CANDIDATE_POOL ✅ |
| A5 | GameState 版本？ | v6 不变，零迁移 ✅ |
| A6 | 运行时状态模式？ | Map-based cooldown，同 encounter-tick/storyteller ✅ |
| A7 | PRD Invariant vs 架构冲突？ | 6 项均无冲突 ✅ |
| A8 | 跨层通信？ | Engine→Shared 只读，Engine→EventBus→soul-event 复用现有路径 ✅ |

---

## Step 2：Interface 设计 + 数据变更

### S2.1 扩展 `src/shared/types/soul.ts`

#### 新增 6 个 SoulEventType

```typescript
// 追加到 SoulEventType 联合类型
| 'causal-provoke'       // 因果·挑衅
| 'causal-gift'          // 因果·赠礼
| 'causal-theft'         // 因果·窃取
| 'causal-jealousy'      // 因果·嫉妒
| 'causal-seclusion'     // 因果·闭关
| 'causal-ethos-clash'   // 因果·道风冲突
```

#### 扩展 SOUL_EVENT_POLARITY

```typescript
// 追加到 SOUL_EVENT_POLARITY
'causal-provoke':     'negative',
'causal-gift':        'positive',
'causal-theft':       'negative',
'causal-jealousy':    'negative',
'causal-seclusion':   'positive',
'causal-ethos-clash': 'negative',
```

#### 新增高级标签阈值常量

```typescript
export const ADVANCED_TAG_THRESHOLDS = {
  mentor: {
    assignAffinity: 80,
    removeAffinity: 60,
    starGap: 2,
  },
  grudge: {
    assignAffinity: -40,
    removeAffinity: -20,
    negativeEventCount: 3,
  },
  admirer: {
    assignAffinity: 60,
    removeAffinity: 40,
    positiveEventCount: 3,
  },
} as const;

/**
 * RelationshipTag 中文映射表
 * 用于 MUD 日志、prompt 构建等需要中文展示的场景
 * POC-3a 教训#7：命名必须避免歧义，使用明确极性词
 */
export const RELATIONSHIP_TAG_LABELS: Record<RelationshipTag, string> = {
  friend:  '至交',
  rival:   '宿敌',
  mentor:  '师长',
  admirer: '仰慕',
  grudge:  '宿怨',
} as const;
```

### S2.2 扩展 `src/shared/data/emotion-pool.ts`

**变更 A**：新增 6 个因果事件类型的候选情绪池条目到 `EMOTION_CANDIDATE_POOL`：

```typescript
'causal-provoke': {
  self:     ['anger', 'contempt', 'pride', 'neutral'],
  observer: ['fear', 'worry', 'anger', 'neutral'],
},
'causal-gift': {
  self:     ['joy', 'gratitude', 'pride', 'neutral'],
  observer: ['admiration', 'joy', 'envy', 'neutral'],
},
'causal-theft': {
  self:     ['guilt', 'pride', 'contempt', 'neutral'],
  observer: ['anger', 'contempt', 'fear', 'neutral'],
},
'causal-jealousy': {
  self:     ['envy', 'anger', 'shame', 'neutral'],
  observer: ['contempt', 'sadness', 'neutral', 'worry'],
},
'causal-seclusion': {
  self:     ['sadness', 'worry', 'relief', 'neutral'],
  observer: ['admiration', 'worry', 'neutral', 'sadness'],
},
'causal-ethos-clash': {
  self:     ['anger', 'contempt', 'sadness', 'neutral'],
  observer: ['worry', 'fear', 'neutral', 'anger'],
},
```

**变更 B**：`fallbackGenerateThought()` 中 self templates（`Record<SoulEventType, string>` 全量类型，L189）需补 6 条因果事件模板：

```typescript
// 追加到 fallbackGenerateThought() self templates
'causal-provoke':     `${discipleName}冷哼一声："今日且让你知道厉害。"`,
'causal-gift':        `${discipleName}微微一笑，将礼物递了出去。`,
'causal-theft':       `${discipleName}心中暗忖："这些灵石，不过是取回该拿的。"`,
'causal-jealousy':    `${discipleName}攥紧了拳头，心中难以平静。`,
'causal-seclusion':   `${discipleName}叹了口气，默默走向闭关洞。`,
'causal-ethos-clash': `${discipleName}低声道："此道非我道……"`,
```

> ⚠️ **遗漏修复 v1.2**：`Record<SoulEventType, string>` 非 Partial，新增 SoulEventType 后不补条目会导致 tsc 编译错误。

### S2.2b 扩展 `src/ai/soul-prompt-builder.ts`

`getEventDescription()` 中 selfDesc 和 observerDesc 均为 `Record<SoulEventType, string>`（L248/L265），需补 6 条：

```typescript
// selfDesc 追加
'causal-provoke':     '你与仇人碰面，主动挑衅',
'causal-gift':        '你向至交赠送了一份礼物',
'causal-theft':       '你偷取了宗门灵石',
'causal-jealousy':    '你因同门的突破而心生嫉妒',
'causal-seclusion':   '你连续受挫，决定闭关静修',
'causal-ethos-clash': '你感到自身道心与宗门道风不合',

// observerDesc 追加
'causal-provoke':     `你的同门${actorName}与人起了冲突`,
'causal-gift':        `你的同门${actorName}向人赠送了礼物`,
'causal-theft':       `你的同门${actorName}似乎做了不光彩的事`,
'causal-jealousy':    `你的同门${actorName}似乎对他人的突破心怀嫉妒`,
'causal-seclusion':   `你的同门${actorName}受挫后选择了闭关`,
'causal-ethos-clash': `你的同门${actorName}对宗门近况颇有微词`,
```

> ⚠️ **遗漏修复 v1.2**：soul-prompt-builder 是 AI 层文件，SGA 初版遗漏了 AI 层对 SoulEventType 的全量依赖。

### S2.3 新文件 `src/shared/data/causal-rule-registry.ts`

```typescript
import type { CausalRule } from '../types/causal-event';
import { EventSeverity } from '../types/world-event';

/** MUD 文案模板（每条规则 3 条） */
export interface CausalMudTemplate {
  ruleId: string;
  templates: string[];  // length >= 3
}

/**
 * 因果规则注册表 — 6 条规则
 * INV-4: Object.freeze，只增不删
 */
export const CAUSAL_RULE_REGISTRY: readonly CausalRule[] = Object.freeze([
  // C1-C6 按 PRD §5.1 定义
]);

/**
 * 因果 MUD 文案模板
 * 每条规则至少 3 条模板，使用 {A}/{B}/{L} 占位符
 */
export const CAUSAL_MUD_TEMPLATES: readonly CausalMudTemplate[] = Object.freeze([
  // 18 条模板，按 PRD §5.7 定义
]);

/** 扫描间隔（ticks） */
export const CAUSAL_SCAN_INTERVAL_TICKS = 300;
```

**设计决策**：`CausalRule.condition` 字段类型为 `Record<string, unknown>`（已存在于类型桩），运行时由 `CausalRuleEvaluator` 解释。不修改 `CausalRule` 接口——条件检查逻辑封装在 evaluator 的 `checkCondition()` 方法中而非 condition 对象内。

### S2.4 新文件 `src/shared/formulas/relationship-formulas.ts`

高级标签的赋予/移除判断函数。纯函数，无副作用。

```typescript
import type { RelationshipMemory } from '../types/relationship-memory';
import type { LiteDiscipleState } from '../types/game-state';
import { ADVANCED_TAG_THRESHOLDS } from '../types/soul';

/**
 * mentor 标签是否应赋予
 * 条件：A→B affinity >= 80 AND A.starRating >= B.starRating + 2
 */
export function shouldAssignMentor(
  affinity: number,
  sourceStarRating: number,
  targetStarRating: number,
): boolean;

/**
 * mentor 标签是否应移除
 * 条件：A→B affinity < 60
 */
export function shouldRemoveMentor(affinity: number): boolean;

/**
 * grudge 标签是否应赋予
 * 条件：A→B affinity <= -40 AND 负面事件(affinityDelta < 0) >= 3
 */
export function shouldAssignGrudge(
  affinity: number,
  memory: RelationshipMemory | null | undefined,
): boolean;

/**
 * grudge 标签是否应移除
 * 条件：A→B affinity > -20
 */
export function shouldRemoveGrudge(affinity: number): boolean;

/**
 * admirer 标签是否应赋予
 * 条件：A→B affinity >= 60 AND B 有正面特性 AND 正向事件 >= 3
 */
export function shouldAssignAdmirer(
  affinity: number,
  target: LiteDiscipleState,
  memory: RelationshipMemory | null | undefined,
): boolean;

/**
 * admirer 标签是否应移除
 * 条件：A→B affinity < 40
 */
export function shouldRemoveAdmirer(affinity: number): boolean;
```

### S2.5 新文件 `src/engine/causal-evaluator.ts`

```typescript
import type { LiteGameState, LiteDiscipleState } from '../shared/types/game-state';
import type { EventBus } from './event-bus';
import type { RelationshipMemoryManager } from './relationship-memory-manager';
import type { GoalManager } from './goal-manager';
import type { GameLogger } from '../shared/types/logger';

/**
 * 因果规则评估器
 *
 * 运行时状态：
 * - cooldownMap: Map<string, number> 冷却记录
 * - recentBreakthroughs: Map<string, number> 最近突破记录（C4 用）
 * - consecutiveFailures: Map<string, number> 连续失败计数（C5 用）
 *
 * INV-2: 每次 evaluate() 最多触发 1 个事件
 * INV-3: 所有 Map 为运行时，不持久化
 * INV-6: 条件检查为纯函数，不修改 state
 */
export class CausalRuleEvaluator {
  private cooldownMap = new Map<string, number>();
  private recentBreakthroughs = new Map<string, number>();
  private consecutiveFailures = new Map<string, number>();

  /**
   * 主入口：扫描所有弟子，检查 6 条因果规则
   *
   * @param state GameState（只读）
   * @param currentTick 当前 tick
   * @param eventBus 发射 SoulEvent
   * @param logger MUD 日志输出
   * @returns 是否触发了事件
   */
  evaluate(
    state: Readonly<LiteGameState>,
    currentTick: number,
    eventBus: EventBus,
    logger: GameLogger,
    relationshipMemoryManager?: RelationshipMemoryManager,
    goalManager?: GoalManager,
  ): boolean;

  /**
   * 记录突破事件（由 soul-event handler 或 auto-breakthrough handler 调用）
   * 用于 C4 嫉妒规则的"最近 50 tick 内突破"追踪
   */
  recordBreakthrough(discipleId: string, tick: number): void;

  /**
   * 记录突破失败（由 soul-event handler 调用）
   * 用于 C5 连败规则的计数追踪
   */
  recordBreakthroughFailure(discipleId: string): void;

  /**
   * 重置连败计数（突破成功时调用）
   */
  resetBreakthroughFailure(discipleId: string): void;
}
```

**evaluate() 内部流程**：

1. 遍历所有弟子对 (solo rules 单弟子, pair rules 双弟子)
2. 对每条规则 (priority 降序)：
   a. 检查冷却：`cooldownMap.get(cooldownKey) + rule.cooldownTicks > currentTick` → skip
   b. 检查条件（纯函数）
   c. 匹配成功 → emit SoulEvent + 记录冷却 + 输出 MUD 日志 + **return true**（INV-2: 最多 1 个）
3. 无匹配 → return false

### S2.6 扩展 `src/engine/soul-engine.ts` — updateRelationshipTags()

当前 `updateRelationshipTags()` 仅管理 friend/rival，将 mentor/admirer/grudge 保留为"手动标签"不自动管理（L211）。

**变更方案**：在同一函数中增加高级标签的赋予/移除逻辑。需要额外参数：

```typescript
export function updateRelationshipTags(
  state: LiteGameState,
  subjectId: string,
  relationshipMemoryManager?: RelationshipMemoryManager,
): void {
  for (const edge of state.relationships) {
    if (edge.sourceId !== subjectId) continue;

    const tags: RelationshipTag[] = [];

    // 基础标签（现有逻辑）
    if (edge.affinity >= RELATIONSHIP_TAG_THRESHOLDS.friend) tags.push('friend');
    if (edge.affinity <= RELATIONSHIP_TAG_THRESHOLDS.rival) tags.push('rival');

    // 高级标签（新增）
    const source = state.disciples.find(d => d.id === edge.sourceId);
    const target = state.disciples.find(d => d.id === edge.targetId);
    const memory = relationshipMemoryManager?.getMemory(edge.sourceId, edge.targetId);

    if (source && target) {
      if (shouldAssignMentor(edge.affinity, source.starRating, target.starRating)) {
        tags.push('mentor');
      }
      if (shouldAssignGrudge(edge.affinity, memory)) {
        tags.push('grudge');
      }
      if (shouldAssignAdmirer(edge.affinity, target, memory)) {
        tags.push('admirer');
      }
    }

    edge.tags = tags;
  }
}
```

**关键变更**：不再"保留手动标签"——所有 5 个标签均由此函数统一管理（INV-5）。

**函数签名变更影响**：`processSoulEvent()` 中已传入 `relationshipMemoryManager`，只需透传到 `updateRelationshipTags()`。

### S2.7 扩展 `src/engine/tick-pipeline.ts` — TickContext

```typescript
// 新增字段
export interface TickContext {
  // ...existing fields...
  /** Phase I-alpha: 因果规则评估器 */
  causalEvaluator?: CausalRuleEvaluator;
}
```

### S2.8 数据变更汇总

| 文件 | 变更类型 | 变更内容 |
|------|---------|---------|
| `src/shared/types/soul.ts` | 扩展 | +6 SoulEventType, +6 SOUL_EVENT_POLARITY, +ADVANCED_TAG_THRESHOLDS |
| `src/shared/data/emotion-pool.ts` | 扩展 | +6 EMOTION_CANDIDATE_POOL 条目 |
| `src/shared/data/causal-rule-registry.ts` | **新文件** | 6 规则 + 18 MUD 模板 + 常量 |
| `src/shared/formulas/relationship-formulas.ts` | **新文件** | 6 个标签判断纯函数 |
| `src/engine/causal-evaluator.ts` | **新文件** | CausalRuleEvaluator 类 |
| `src/engine/handlers/causal-tick.handler.ts` | **新文件** | TickHandler 包装 |
| `src/engine/soul-engine.ts` | 修改 | updateRelationshipTags 扩展 |
| `src/engine/tick-pipeline.ts` | 扩展 | TickContext +causalEvaluator |
| `src/engine/idle-engine.ts` | 扩展 | 实例化+注册+注入 |

### S2.9 迁移策略

**GameState v6 不变**。零迁移。

所有新状态（cooldownMap, recentBreakthroughs, consecutiveFailures）均为 `CausalRuleEvaluator` 实例内的运行时 Map，页面刷新后重置——同 encounter-tick 的 `cooldowns: Map<string, number>` 和 storyteller 的 `StorytellerState` 模式。

---

## Step 3：Pipeline 挂载 + 依赖矩阵

### S3.1 新 Handler: causal-tick

| 属性 | 值 |
|------|---|
| name | `causal-tick` |
| phase | `612`（新增 TickPhase.CAUSAL_EVAL） |
| order | `0` |
| 文件 | `src/engine/handlers/causal-tick.handler.ts` |
| 系统 | causal-evaluator |
| 来源 | Phase I-alpha |

**TickPhase 新增**：

```typescript
export const TickPhase = {
  // ...existing...
  /** 612: 因果规则扫描（Phase I-alpha）— 碰面后、灵魂事件前 */
  CAUSAL_EVAL: 612,
  // ...existing...
} as const;
```

**位置论证**：

```
605 WORLD_EVENT  → 世界事件抽取
610 ENCOUNTER    → 碰面检定（产出 encounter-* SoulEvent）
612 CAUSAL_EVAL  → 因果规则扫描（需要碰面后的最新关系状态）
625 SOUL_EVAL    → 灵魂事件评估（消费因果事件产出的 SoulEvent）
```

因果规则在 encounter(610) 之后执行，确保碰面产生的关系变化可被因果规则读取；在 soul-event(625) 之前执行，确保因果事件的 SoulEvent 能在同一 tick 被消费。

### S3.2 Handler 实现骨架

```typescript
import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { CAUSAL_SCAN_INTERVAL_TICKS } from '../../shared/data/causal-rule-registry';

/** 扫描累计器 */
let scanAccumulatorTicks = 0;

export const causalTickHandler: TickHandler = {
  name: 'causal-tick',
  phase: TickPhase.CAUSAL_EVAL,
  order: 0,

  execute(ctx: TickContext): void {
    if (!ctx.causalEvaluator) return;

    scanAccumulatorTicks++;
    if (scanAccumulatorTicks < CAUSAL_SCAN_INTERVAL_TICKS) return;
    scanAccumulatorTicks = 0;

    const currentTick = Math.floor(ctx.state.inGameWorldTime);
    ctx.causalEvaluator.evaluate(
      ctx.state,
      currentTick,
      ctx.eventBus,
      ctx.logger,
      ctx.relationshipMemoryManager,
      ctx.goalManager,
    );
  },
};
```

### S3.3 依赖矩阵增量

**§1 Engine 层依赖矩阵新增行**：

| 文件 ↓ 依赖 → | game-state | soul.ts | causal-event.ts | encounter.ts | emotion-pool.ts | relationship-memory.ts | relationship-formulas.ts |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **causal-evaluator** | R | R | R | R (getDiscipleLocation) | — | R (via RM Manager) | R |
| **handlers/causal-tick** | R | — | — | — | — | — | — |

**§2 Engine 层内部依赖新增**：

| 文件 ↓ 依赖 → | tick-pipeline | event-bus | causal-evaluator | relationship-memory-manager | goal-manager |
|:---|:---:|:---:|:---:|:---:|:---:|
| **causal-evaluator** | — | W (emit) | — | R | R (C5 闭关目标) |
| **handlers/causal-tick** | R | — | R (evaluate) | — | — |
| **idle-engine** | R | — | R (实例化) | — | — |

### S3.4 对现有 Handler 的副作用

| 现有 Handler | 影响 | 说明 |
|-------------|------|------|
| soul-event (625:0) | **直接修改** | (1) `getEventSeverity()` 扩展 causal-\* 分支；(2) C3 causal-theft 事件消费时执行 `state.spiritStones -= 20` 副效果（见 S3.4b） |
| ai-result-apply (625:5) | **直接修改** | `updateRelationshipTags()` 调用处需透传 `ctx.relationshipMemoryManager`（签名变更联动） |
| encounter-tick (610:0) | **直接修改** | grudge 标签碰面冲突概率修正（见 S3.6） |
| auto-breakthrough (200:10) | **直接修改** | 突破成功/失败需调用 `ctx.causalEvaluator?.recordBreakthrough()` / `recordBreakthroughFailure()`（C4/C5 数据源，时序关键：必须在 612 前记录） |

**getEventSeverity() 扩展**：在 `soul-event.handler.ts` 中增加因果事件的 severity 识别：

```typescript
// 因果事件：从 metadata.severity 读取（CausalRuleEvaluator 在 emit 时写入）
if (event.type.startsWith('causal-')) {
  const severity = (event.metadata as Record<string, unknown> | undefined)?.severity;
  return typeof severity === 'number' ? severity : EventSeverity.RIPPLE;
}
```

### S3.4b C3 灵石扣除执行位置

C3 窃取事件触发后，`spiritStones -= 20` 副效果在 `soul-event.handler.ts` 的 `execute()` 中执行：

```typescript
// soul-event.handler.ts execute() 内，processSoulEvent 调用后
if (event.type === 'causal-theft') {
  ctx.state.spiritStones = Math.max(0, ctx.state.spiritStones - 20);
  ctx.systemLogs.push('[系统] 宗门灵石库失窃，损失灵石 20 枚。');
}
```

**位置论证**：副效果在 soul-event handler (625:0) 消费事件时执行，而非 causal-evaluator (612) 触发时执行。理由：
1. INV-6 要求因果规则条件为纯函数，不修改 state — evaluator 只 emit，不写 state
2. soul-event handler 是 GameState 写入的统一通道（INV-1）
3. C3 是 STORM 级事件，会触发裁决窗口，灵石扣除应在事件正式"结算"时发生

### S3.4c auto-breakthrough 联动细节

在 `auto-breakthrough.handler.ts` 的 `execute()` 中，突破完成后追加因果系统通知：

```typescript
// 在 ctx.eventBus.emit(...) 之后追加：
if (ctx.causalEvaluator) {
  if (btLog.success) {
    ctx.causalEvaluator.recordBreakthrough(actorId, Math.floor(ctx.state.inGameWorldTime));
    ctx.causalEvaluator.resetBreakthroughFailure(actorId);
  } else {
    ctx.causalEvaluator.recordBreakthroughFailure(actorId);
  }
}
```

**时序关键**：auto-breakthrough (200) → causal-tick (612) → soul-event (625)。record 必须在 200 阶段完成，612 阶段的因果扫描才能读取到"最近 50 tick 内突破"数据。若延迟到 625 则当 tick 的因果扫描无法感知该突破。

### S3.5 回归影响评估

| 影响范围 | 风险 | 说明 |
|---------|:----:|------|
| soul.ts 类型扩展 | 低 | 联合类型追加，不破坏现有 |
| SOUL_EVENT_POLARITY 扩展 | 低 | Record 新增 key，不影响现有 key |
| emotion-pool 扩展（3 处） | **中** | EMOTION_CANDIDATE_POOL + fallbackGenerateThought 全量 Record 必须补齐 |
| soul-prompt-builder 扩展（2 处） | **中** | getEventDescription selfDesc/observerDesc 全量 Record 必须补齐 |
| updateRelationshipTags 签名变更 | **中** | 新增可选参数 `relationshipMemoryManager?`，**2 个调用处**需透传（soul-engine L383 + ai-result-apply L59） |
| auto-breakthrough 联动 | **中** | 需追加 causalEvaluator record 调用（C4/C5 数据源） |
| TickContext 扩展 | 低 | 新增可选字段 `causalEvaluator?` |
| TickPhase 新增 CAUSAL_EVAL | 低 | 新增常量，不影响现有值 |
| getEventSeverity 扩展 | 低 | 新增 `causal-*` 分支 |
| C3 spiritStones 副效果 | 低 | soul-event handler 内条件扣除 |

**必须回归**：
- `npm run test:regression`（64/64）
- `tsc --noEmit` 零错误
- `npm run lint` 零错误

### S3.6 标签行为效果挂载点

| 标签 | 效果 | 挂载位置 | 实现方式 |
|------|------|---------|---------|
| mentor | meditate ×1.2 | `behavior-tree.ts` Layer 3 | 在现有 friend/rival 同地检测逻辑后追加 mentor 检测 |
| grudge | conflict 权重 60→75 | `encounter.ts` `decideEncounterResult()` 或调用方 | 新增参数 `hasGrudge?: boolean`，在 hostile 分档时修正 conflict 权重 |
| admirer | 正面情绪 +0.2 | `emotion-pool.ts` 消费逻辑 或 `soul-engine.ts` | 在 `applyTraitWeights()` 后追加 admirer 加权 |

**mentor 效果 — behavior-tree.ts Layer 3 扩展**：

```typescript
// Layer 3 现有逻辑检测 friend/rival nearby
// 追加：检测是否有 mentor 在同地
let hasMentorNearby = false;
for (const other of state.disciples) {
  if (other.id === d.id) continue;
  if (getDiscipleLocation(other.behavior) !== myLocation) continue;
  const edge = state.relationships.find(
    r => r.sourceId === d.id && r.targetId === other.id,
  );
  if (edge?.tags.includes('mentor')) hasMentorNearby = true;
}

if (hasMentorNearby) {
  for (const w of weights) {
    if (w.behavior === DB.MEDITATE) {
      w.weight *= MENTOR_MEDITATE_MULTIPLIER; // 1.2
    }
  }
}
```

**grudge 效果 — encounter.ts 修正**：

方案：在 `encounter-tick.handler.ts` 调用 `decideEncounterResult()` 前检测 grudge，若有 grudge 则使用修正后的权重表。不修改 `decideEncounterResult()` 本体签名（保持向后兼容），而是在 handler 层做权重覆盖。

```typescript
// encounter-tick.handler.ts 中
const hasGrudge = edgeAB?.tags.includes('grudge') || edgeBA?.tags.includes('grudge');
if (hasGrudge && band === 'hostile') {
  // 使用修正权重：conflict 60→75, none 30→15
  result = decideGrudgeEncounter(randomFn);
} else {
  result = decideEncounterResult(avgAffinity, randomFn);
}
```

**admirer 效果 — soul-engine.ts 情绪加权**：

在 `fallbackEvaluate()` 中的 `applyTraitWeights()` 之后，检测 admirer 标签并对正面情绪增加权重：

```typescript
// 检测 admirer 标签
const hasAdmirer = state.relationships.some(
  r => r.sourceId === subject.id && r.targetId === event.actorId && r.tags.includes('admirer'),
);
if (hasAdmirer) {
  // 正面情绪额外加权（通过重复添加 +0.2 的等效数量）
  const positiveEmotions: EmotionTag[] = ['joy', 'gratitude', 'admiration', 'pride', 'relief'];
  // +0.2 权重 ≈ 额外添加 1 个正面情绪到候选池
  for (const e of positiveEmotions) {
    if (weightedCandidates.includes(e)) {
      weightedCandidates.push(e); // 增加 1 次出现 ≈ +0.2 概率
    }
  }
}
```

---

## Step 4：ADR 决策日志

### ADR-Iα-01：因果规则条件——Strategy 模式 vs 数据驱动

| 维度 | 方案 A: Strategy 模式 | 方案 B: 数据驱动 |
|------|---------------------|-----------------|
| 描述 | 每条规则的条件是一个函数：`condition: (state, a, b) => boolean` | 条件是 JSON 对象：`condition: { field: 'affinity', op: '<=', value: -60 }` |
| 优势 | 灵活、直观、复杂条件无障碍 | 可序列化、可配置 |
| 劣势 | 不可序列化 | 复杂条件需要 DSL，C4/C5 需要外部状态 |

**决策**：方案 A — Strategy 模式。

**理由**：
1. 6 条规则中 C4（需查 recentBreakthroughs Map）和 C5（需查 consecutiveFailures Map）依赖 evaluator 运行时状态，数据驱动无法表达
2. 规则不需要序列化（INV-4: 静态代码，不从配置加载）
3. 当前规模仅 6 条，不需要通用 DSL 的工程投入

**实现**：`CausalRule.condition` 保持 `Record<string, unknown>` 类型桩不变（不修改接口），实际条件检查在 `CausalRuleEvaluator` 内以 `switch(rule.id)` 分发。

**后果**：新增规则需修改 evaluator 代码。可接受——INV-4 保证规则只增不删，且 I-beta 规模可控。

---

### ADR-Iα-02：TickPhase 612 — 新增常量 vs 复用 ENCOUNTER(610)

| 维度 | 方案 A: 新增 CAUSAL_EVAL=612 | 方案 B: 复用 ENCOUNTER=610, order=5 |
|------|---------------------------|--------------------------------------|
| 语义清晰度 | 独立阶段名，Pipeline 文档可读 | 同阶段内排序，需查 order 才知先后 |
| 插入安全性 | 612 在 610-625 之间有唯一位置 | order=5 在同阶段内排序，无冲突 |
| 未来扩展 | I-beta 可能需要 614、616 等 | 需更多 order 值 |

**决策**：方案 A — 新增 `CAUSAL_EVAL = 612`。

**理由**：因果引擎是独立系统（非碰面系统的子模块），语义上应有独立阶段。TickPhase 间距 100 的设计初衷就是允许插入。

---

### ADR-Iα-03：高级标签统一管理 vs 分散管理

| 维度 | 方案 A: updateRelationshipTags 统一 | 方案 B: 各系统自行管理 |
|------|-----------------------------------|-----------------------|
| INV-5 | 完全满足 | 违反 |
| 单一入口 | ✅ soul-engine 1 个函数 | ❌ 多个入口 |
| 参数传递 | 需透传 RM Manager | 无额外参数 |

**决策**：方案 A — 统一管理。

**理由**：INV-5 明确要求统一管理入口。当前 `updateRelationshipTags()` 已在 `processSoulEvent()` 中每次事件后调用，扩展即可。需要将 `relationshipMemoryManager` 透传，但该参数已在 `processSoulEvent()` 签名中存在。

---

### ADR-Iα-04：因果事件架构——纯规则 vs AI 辅助（POC-3a 沉淀）

| 维度 | 方案 A: 纯规则引擎（本 Phase） | 方案 B: 规则过滤 + AI 选择（未来扩展） |
|------|------------------------------|--------------------------------------|
| 描述 | CausalRuleEvaluator 条件匹配 → 直接 emit SoulEvent | 规则过滤候选 eventType → AI 从合法候选中选 → Call2 渲染 |
| 正确率 | 100%（确定性规则） | ~85%（POC-3a R2 预估） |
| 复杂度 | 低（6 条规则 switch 分发） | 中（需增加 AI 调用链路） |
| 表达力 | 6 种固定 eventType | 可扩展至更丰富的事件变体 |

**决策**：方案 A — 纯规则引擎（MVP）。

**理由**（基于 POC-3a R2 数据）：
1. AI 独立 eventType 决策正确率仅 56%（POC-3a R2, 25 条），不满足 80% 阈值
2. 规则过滤 + AI 选择预估 ~85%，但增加延迟和复杂度，MVP 不需要
3. 本 Phase 6 条规则条件明确（affinity 阈值 / moral 阈值 / tag 检测），规则引擎完全胜任
4. 方案 B 作为 Phase I-beta 的自然扩展路径保留

**POC-3a 教训沉淀**：
- 教训#7：中文 eventType 命名对歧义敏感——"正面冲突"被模型误读为积极含义。本 Phase §4.2 已用明确极性词（挑衅/窃取/嫉妒），无此问题
- 教训#8：AI 决策必须有规则引擎做合法性过滤——与 Phase E 候选池、Phase G ActionPool 同一架构模式
- 教训#9：Call2 叙事会替错误决策"强行圆说"——本 Phase §5.8 中 STORM 级 Call2 独白仅作渲染，决策由规则引擎完成

**过滤规则参考（方案 B 未来实现时）**：
```
affinity ≥ 30  → 候选: gift, alliance, challenge（禁止负面）
affinity ≤ -30 → 候选: scheme, confrontation, challenge（禁止正面）
-30 < aff < 30 → 候选: avoidance, challenge, gift（禁止极端）
```

> 原始数据：`docs/pipeline/phaseIJ-poc/review-poc-3a-r2.md`、`docs/pipeline/phaseIJ-poc/walkthrough-ai-model-testing.md` §POC-3a

---

### ADR-Iα-05：C5 闭关目标——直接赋予 vs 事件驱动

| 维度 | 方案 A: CausalEvaluator 直接调用 GoalManager | 方案 B: 通过 SoulEvent metadata 传递 |
|------|---------------------------------------------|--------------------------------------|
| 耦合 | Evaluator → GoalManager 直接依赖 | Evaluator 只写 EventBus |
| 时序 | 因果扫描(612)时立即赋予 | 需等 soul-event(625) 消费后才赋予 |

**决策**：方案 A — 直接调用 GoalManager。

**理由**：C5 闭关目标赋予是因果事件的"副效果"，需要在因果事件触发时立即生效（不等 soul-event handler 消费）。且 GoalManager 已是 TickContext 可选依赖，直接传入评估器即可。

---

## 验证规划

### 专项脚本 `scripts/verify-phaseI-alpha-causal.ts`

≥30 断言，覆盖：

| 类别 | 断言数 | 内容 |
|------|:-----:|------|
| 注册表 | 3 | 6 条规则, Object.frozen, 每条 ≥3 模板 |
| C1-C6 触发/不触发 | 12 | 每条规则 2 断言（满足触发 + 不满足不触发） |
| 冷却机制 | 3 | 冷却内不触发, 冷却后触发, 不同对不互斥 |
| 每次最多 1 事件 | 1 | 多规则同时满足仅触发 priority 最高 |
| 标签赋予/移除 | 6 | mentor/grudge/admirer 各 2（赋予+移除） |
| Monte Carlo | 2 | N=1000: 30 分钟≥3 事件, 无事件洪水 |
| 回归 | 3 | tsc, lint, test:regression |
| **合计** | **≥30** | |

---

## 文件变更汇总

### 新文件（5）

| # | 文件路径 | 层 | 用途 |
|---|---------|:--:|------|
| 1 | `src/shared/data/causal-rule-registry.ts` | Shared/Data | 6 规则 + 18 MUD 模板 |
| 2 | `src/shared/formulas/relationship-formulas.ts` | Shared/Formulas | 标签判断纯函数 |
| 3 | `src/engine/causal-evaluator.ts` | Engine | CausalRuleEvaluator 类 |
| 4 | `src/engine/handlers/causal-tick.handler.ts` | Engine/Handlers | TickHandler 包装 |
| 5 | `scripts/verify-phaseI-alpha-causal.ts` | Scripts | 验证脚本 |

### 修改文件（11）

| # | 文件路径 | 变更概要 | v1.2 补充 |
|---|---------|---------|:---------:|
| 1 | `src/shared/types/soul.ts` | +6 SoulEventType, +6 polarity, +ADVANCED_TAG_THRESHOLDS | |
| 2 | `src/shared/data/emotion-pool.ts` | +6 EMOTION_CANDIDATE_POOL + **6 fallbackGenerateThought 模板** | ⚠️ |
| 3 | `src/ai/soul-prompt-builder.ts` | **+6 selfDesc + 6 observerDesc 模板**（Record 全量补齐） | ⚠️ |
| 4 | `src/engine/soul-engine.ts` | updateRelationshipTags 扩展 + admirer 效果 | |
| 5 | `src/engine/tick-pipeline.ts` | +CAUSAL_EVAL=612, TickContext +causalEvaluator | |
| 6 | `src/engine/idle-engine.ts` | 实例化 CausalRuleEvaluator + 注册 handler + 注入 ctx | |
| 7 | `src/engine/handlers/soul-event.handler.ts` | getEventSeverity 扩展 causal-\* + **C3 spiritStones 扣除** | ⚠️ |
| 8 | `src/engine/behavior-tree.ts` | Layer 3 +mentor 效果 | |
| 9 | `src/engine/handlers/encounter-tick.handler.ts` | grudge 标签碰面冲突概率修正 + `decideGrudgeEncounter()` | |
| 10 | `src/engine/handlers/auto-breakthrough.handler.ts` | **+causalEvaluator.record 联动**（C4/C5 数据源） | ⚠️ |
| 11 | `src/engine/handlers/ai-result-apply.handler.ts` | **updateRelationshipTags 签名同步**（透传 RM） | ⚠️ |

### 文档更新（2）

| # | 文件路径 | 变更概要 |
|---|---------|---------|
| 1 | `docs/design/arch/pipeline.md` | +Handler #15 causal-tick, +CAUSAL_EVAL=612 |
| 2 | `docs/design/arch/dependencies.md` | +causal-evaluator/causal-tick 依赖行; auto-breakthrough→causal-evaluator 联动 |

---

## User Story ↔ 实现映射

| Story | 实现文件 | 对应 TDD 章节 |
|:-----:|---------|:------------:|
| #1 注册表 | `causal-rule-registry.ts` | S2.3 |
| #2 Evaluator 核心 | `causal-evaluator.ts` | S2.5 |
| #3 SoulEvent 管线 | `soul-event.handler.ts` 扩展 + `causal-tick.handler.ts` | S3.1, S3.4 |
| #4 标签管理 | `relationship-formulas.ts` + `soul-engine.ts` 扩展 | S2.4, S2.6 |
| #5 标签效果 | `behavior-tree.ts` + `encounter-tick` + `soul-engine.ts` | S3.6 |
| #6 集成验证 | `verify-phaseI-alpha-causal.ts` | 验证规划 |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-01 | v1.0 | 初始创建 |
| 2026-04-01 | v1.1 | Gate 2 WARN 修复：+encounter-tick.handler.ts 到变更清单；shouldAssignGrudge/Admirer 参数类型 `| null | undefined` 对齐 getMemory() 返回值 |
| 2026-04-01 | v1.2 | **关联性审计修复**（4 项遗漏）：+emotion-pool fallbackGenerateThought 模板；+soul-prompt-builder getEventDescription 模板；+auto-breakthrough record 联动；+ai-result-apply RM 透传；+C3 spiritStones 扣除位置明确。修改文件 8→11 |
| 2026-04-02 | v1.3 | **PoC 结论回写**：+ADR-Iα-04（POC-3a 纯规则 vs AI 辅助决策 + 过滤规则参考 + 教训沉淀）；+RelationshipTag 中文映射表 |

---

## USER Approval

- [x] USER 已审阅 TDD 内容
- [x] Party Review 无 BLOCK 项（0 BLOCK / 5 WARN，必修 2 项 + 关联性审计 4 项已修复）

签章：`[x] GATE 2 PASSED` — 2026-04-01
