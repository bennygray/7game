# Phase I-beta TDD — 社交事件系统（技术设计文档）

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：/SGA | **状态**：Draft → Gate 2 审查
> **PRD**：[phaseI-beta-PRD.md](../../features/phaseI-beta-PRD.md)
> **User Stories**：[phaseI-beta-user-stories.md](phaseI-beta-user-stories.md)
> **前置**：Phase GS ✅ + Phase I-alpha ✅

---

## §0 全局对齐检查清单

| # | 检查项 | 结论 | 依据 |
|---|--------|:----:|------|
| G-1 | 新系统归属哪个架构层？ | ② Engine + ① Data | 关系向量是 Data 层类型；社交引擎逻辑在 Engine 层 |
| G-2 | 新字段归属 GameState 哪个节点？ | `relationships[]` 扩展 + `disciples[].orientation` 新增 | gamestate.md §1 |
| G-3 | 是否需要新 Tick Handler？ | ✅ 新增 `social-tick` handler（612 阶段内） | 社交邀约/解除扫描需独立 handler |
| G-4 | 是否需要新迁移函数？ | ✅ `migrateV7toV8()` | schema.md §1 版本链 v7→v8 |
| G-5 | 是否与现有 INV 冲突？ | 无冲突 | I-alpha INV-4（规则只增不删）兼容 |
| G-6 | 多写者风险？ | ⚠️ `relationships[]` 新增 social-tick 写者 | 需审计，见 §1 ADR-Iβ-01 |

### G-6 多写者审计

**`relationships[]` 当前写者**（grep 证据）：
1. `disciple-generator.ts:205` — 初始化 W
2. `soul-engine.ts:202` (`applyEvaluationResult`) — delta W
3. `soul-engine.ts:267-272` (`decayRelationships`) — 衰减 W
4. `soul-engine.ts:233-234` (`updateRelationshipTags`) — tags W

**新增写者**：
5. `social-tick handler` — 社交邀约成功后写入离散状态 + delta

**安全性分析**：social-tick 在 Pipeline Phase 612（CAUSAL_EVAL 同阶段）执行，soul-engine 写入在 Phase 625（SOUL_EVAL）。时序固定，**无并发风险**。但需确保 social-tick 对 relationships 的写入在 soul-engine 的衰减/标签更新之前完成。

**决策**：social-tick handler 注册在 phase=612, order=5（causal-tick 之后），所有写入在 soul-engine (phase=625) 之前。见 ADR-Iβ-01。

---

## §1 ADR 决策日志

### ADR-Iβ-01: RelationshipStatus 写入权归属

**背景**：Gate 1 W3 指出离散关系状态（lover/sworn-sibling/nemesis）的"唯一写者"需明确。

**候选方案**：
- A) 复用 causal-tick handler（扩展因果规则）
- B) 新建独立 social-tick handler

**决策**：**B — 新建 social-tick handler**

**理由**：
1. 社交邀约需要 2 轮 AI 调用，不是简单的"条件→事件"因果逻辑
2. causal-evaluator 的 `checkPairCondition` 模式不支持异步 AI 调用
3. 社交系统有独立的冷静期管理（不同于因果冷却）
4. 关注点分离：因果规则是"触发条件→灵魂事件"，社交引擎是"数值阈值→AI 邀约→关系状态变更"

**Handler 规格**：
- name: `social-tick`
- phase: `TickPhase.CAUSAL_EVAL` (612)
- order: 5（causal-tick order=0 之后）
- 唯一写入 `RelationshipEdge.status` 字段

### ADR-Iβ-02: affinity→closeness 的重命名策略

**背景**：99 处 `affinity` 引用，20+ 文件涉及。

**候选方案**：
- A) 一次性全量重命名 affinity→closeness
- B) 保留 affinity 作为别名，逐步淘汰
- C) 在 RelationshipEdge 中新增三维字段，保留 affinity 为计算属性

**决策**：**A — 一次性全量重命名**

**理由**：
1. 别名方案（B）增加长期维护成本，混淆字段语义
2. 计算属性方案（C）引入不必要的间接层
3. 通过 `tsc --noEmit` + regression 可确保重命名完整无遗漏
4. 迁移函数 `migrateV7toV8` 负责存档兼容

### ADR-Iβ-03: 社交邀约 AI 调用架构

**背景**：邀约流程需 2 轮 AI 调用（发起判定 + 接受判定），如何接入现有 AI 层。

**候选方案**：
- A) 同步阻塞（social-tick 内直接 await AI 调用）
- B) 复用 AsyncAIBuffer（fire-and-forget，下个 tick 应用结果）
- C) 独立的社交 AI 队列（SocialAIQueue）

**决策**：**B — 复用 AsyncAIBuffer**

**理由**：
1. 邀约不需要即时结果，下个 tick 收到判定完全可接受
2. 复用现有 AsyncAIBuffer 减少新代码量
3. 同步阻塞（A）会冻结 tick，违反性能红线
4. 独立队列（C）过度设计

**流程**：
```
social-tick 扫描 → 发现满足条件的弟子对
  → 提交 Call-1 到 AsyncAIBuffer（标记为 social-invitation-initiate）
  → 下个 ai-result-apply tick 收到结果
  → 如 willInitiate=true → 提交 Call-2 到 AsyncAIBuffer（标记为 social-invitation-respond）
  → 再下个 ai-result-apply tick 收到结果
  → 如 accepted=true → 建立关系 + 生成事件
```

> **延迟代价**：邀约从扫描到最终结果需 2~3 个 tick（~6~9 秒）。可接受——玩家感知为"弟子思考了一会儿"。

### ADR-Iβ-04: KeyRelationshipEvent.affinityDelta 迁移策略

**背景**：`KeyRelationshipEvent.affinityDelta` 已被 relationship-memory-manager 和 narrative-snippet-builder 大量引用。

**候选方案**：
- A) 重命名为 `closenessDelta`（保持单值）
- B) 拆为三维 `{ closenessDelta, attractionDelta, trustDelta }`

**决策**：**A — 重命名为 closenessDelta，保持单值**

**理由**：
1. 关系记忆的 keyEvents 用于 AI prompt 注入和叙事片段生成，closeness 是主轴
2. 三维 delta 增加 prompt token 消耗（每事件 ×3 字段），在 1024 token 预算内压力大
3. 叙事片段构建器的 FRAMING_PHRASES 和 TEMPLATES 按单值区间设计
4. attraction/trust delta 信息可从事件类型推断，无需逐事件存储

---

## §2 数据层变更（① Data）

### 2.0 createDefaultLiteGameState() 更新

**文件**：`src/shared/types/game-state.ts`

`createDefaultLiteGameState()` 必须同步更新：
1. `version: 7` → `version: 8`
2. `relationships` 默认结构：`closeness: 0, attraction: 0, trust: 0, status: null`（替代 `affinity: 0`）
3. `disciples[]` 默认结构：包含 `orientation` 字段（由 `generateOrientation(gender)` 生成）

> **风险说明**：如不更新 version，新游戏存档在 save→load 时会触发 `migrateV7toV8`，对已经是 v8 结构的数据执行迁移，导致 `rel.affinity` 为 undefined，closeness 被覆盖为 0，造成数据损坏。

### 2.1 RelationshipEdge 重构

**文件**：`src/shared/types/game-state.ts`
**当前**（L198-208）：
```typescript
export interface RelationshipEdge {
  sourceId: string;
  targetId: string;
  affinity: number;
  tags: RelationshipTag[];
  lastInteraction: number;
}
```

**变更后**：
```typescript
export interface RelationshipEdge {
  sourceId: string;
  targetId: string;
  /** 亲疏度 [-100, +100]（原 affinity） */
  closeness: number;
  /** 吸引力 [0, 100]（受性取向门控） */
  attraction: number;
  /** 信赖度 [-100, +100] */
  trust: number;
  /** 关系标签（可叠加，由 soul-engine 自动分配） */
  tags: RelationshipTag[];
  /** 离散关系状态（唯一，由 social-tick 管理） */
  status: RelationshipStatus | null;
  /** 最后交互时间戳（用于衰减计算） */
  lastInteraction: number;
}
```

### 2.2 RelationshipStatus 新类型

**文件**：`src/shared/types/soul.ts`

```typescript
/** Phase I-beta: 离散关系状态 */
export type RelationshipStatus = 'crush' | 'lover' | 'sworn-sibling' | 'nemesis';
```

> **crush 是单向的**（A→B 有 crush 不代表 B→A 有）；lover/sworn-sibling/nemesis 是双向的（建立时同时写入双向 edge）。

### 2.3 Orientation 新类型 + 字段

**文件**：`src/shared/types/game-state.ts`

```typescript
/** Phase I-beta: 性取向权重 */
export interface Orientation {
  /** 对男性的吸引力权重 [0, 1] */
  maleAttraction: number;
  /** 对女性的吸引力权重 [0, 1] */
  femaleAttraction: number;
}
```

**LiteDiscipleState 新增字段**（在 `gender` 之后）：
```typescript
  /** Phase I-beta: 性取向权重（生成后不可变） */
  orientation: Orientation;
```

### 2.4 SoulEvaluationResult.relationshipDeltas 重构

**文件**：`src/shared/types/soul.ts` (L174-179)

**当前**：
```typescript
relationshipDeltas: Array<{
  targetId: string;
  delta: number;
  reason: string;
}>;
```

**变更后**：
```typescript
relationshipDeltas: Array<{
  targetId: string;
  closeness: number;   // [-5, +5]
  attraction: number;  // [-5, +5]
  trust: number;       // [-5, +5]
  reason: string;
}>;
```

### 2.5 SoulEventType 新增 13 个社交事件

**文件**：`src/shared/types/soul.ts` (L90-108)

在 `'causal-ethos-clash'` 之后追加：
```typescript
  // Phase I-beta: 社交事件
  | 'social-flirt'
  | 'social-confession'
  | 'social-confession-accepted'
  | 'social-confession-rejected'
  | 'social-sworn-proposal'
  | 'social-sworn-accepted'
  | 'social-sworn-rejected'
  | 'social-nemesis-declare'
  | 'social-nemesis-accepted'
  | 'social-nemesis-rejected'
  | 'social-lover-broken'
  | 'social-sworn-broken'
  | 'social-nemesis-resolved'
```

**SOUL_EVENT_POLARITY 新增**（L119-140 之后）：
```typescript
  'social-flirt':                'positive',
  'social-confession':           'positive',
  'social-confession-accepted':  'positive',
  'social-confession-rejected':  'negative',
  'social-sworn-proposal':       'positive',
  'social-sworn-accepted':       'positive',
  'social-sworn-rejected':       'negative',
  'social-nemesis-declare':      'negative',
  'social-nemesis-accepted':     'negative',
  'social-nemesis-rejected':     'negative',
  'social-lover-broken':         'negative',
  'social-sworn-broken':         'negative',
  'social-nemesis-resolved':     'positive',
```

### 2.6 CausalTriggerType 新增

**文件**：`src/shared/types/causal-event.ts` (L8-14)

追加两个 union 成员：
```typescript
  | 'social-invitation'   // Phase I-beta: 社交邀约阈值触发
  | 'social-dissolution'  // Phase I-beta: 社交关系解除条件触发
```

### 2.7 标签阈值常量重构

**文件**：`src/shared/types/soul.ts`

**RELATIONSHIP_TAG_THRESHOLDS** — 字段名 affinity→closeness（值不变）：
```typescript
export const RELATIONSHIP_TAG_THRESHOLDS = {
  friend:   60,   // closeness >= 60 → friend
  rival:   -60,   // closeness <= -60 → rival
} as const;
```

**ADVANCED_TAG_THRESHOLDS** — 字段名重命名 + mentor/grudge 增加 trust：
```typescript
export const ADVANCED_TAG_THRESHOLDS = {
  mentor: {
    assignCloseness: 80,   // was assignAffinity
    removeCloseness: 60,   // was removeAffinity
    assignTrust: 40,       // NEW
    starGap: 2,
  },
  grudge: {
    assignCloseness: -40,  // was assignAffinity
    removeCloseness: -20,  // was removeAffinity
    assignTrust: -20,      // NEW
    negativeEventCount: 3,
  },
  admirer: {
    assignCloseness: 60,   // was assignAffinity
    removeCloseness: 40,   // was removeAffinity
    positiveEventCount: 3,
  },
} as const;
```

### 2.8 RelationshipMemory 适配

**文件**：`src/shared/types/relationship-memory.ts`

```typescript
// 变更清单：
// - affinity: number → closeness: number
// - 新增 attraction: number, trust: number
// - KeyRelationshipEvent.affinityDelta → closenessDelta (ADR-Iβ-04)
```

### 2.9 Encounter 模块适配

**文件**：`src/shared/types/encounter.ts`

```typescript
// 变更清单：
// - EncounterResult 新增 FLIRT: 'flirt' 成员
// - AFFINITY_BAND → CLOSENESS_BAND（重命名，值不变）
// - getAvgAffinity → getAvgCloseness（重命名，参数类型更新）
// - ENCOUNTER_PROBABILITY_TABLE 新增 'crush-lover' 分档行
// - decideEncounterResult 签名变更：新增 hasRomanticInterest 参数
```

**新增 crush/lover 分档**：
```typescript
'crush-lover': {
  discuss: 20,
  chat: 60,
  flirt: 15,
  none: 5,
}
```

### 2.10 relationship-formulas 适配

**文件**：`src/shared/formulas/relationship-formulas.ts`

全部 6 个函数签名从 `(affinity: number, ...)` 改为 `(closeness: number, trust: number, ...)`。

| 函数 | 当前签名 | 变更后签名 |
|------|---------|----------|
| `shouldAssignMentor` | `(affinity, srcStar, tgtStar)` | `(closeness, trust, srcStar, tgtStar)` |
| `shouldRemoveMentor` | `(affinity)` | `(closeness, trust)` |
| `shouldAssignGrudge` | `(affinity, memory)` | `(closeness, trust, memory)` |
| `shouldRemoveGrudge` | `(affinity)` | `(closeness, trust)` |
| `shouldAssignAdmirer` | `(affinity, target, memory)` | `(closeness, target, memory)` |
| `shouldRemoveAdmirer` | `(affinity)` | `(closeness)` |

**新增函数**：
```typescript
/** 性格兼容度计算（五维欧几里得距离归一化） */
export function compatibilityScore(a: Personality, b: Personality): number;

/** closeness 天花板应用（PRD §5.6） */
export function applyCompatibilityCeiling(
  currentCloseness: number,
  delta: number,
  compatibility: number,
): number;

/** attraction 有效权重计算 */
export function effectiveAttraction(
  sourceOrientation: Orientation,
  targetGender: Gender,
): number;
```

### 2.11 social-event-templates 新数据文件

**文件**：`src/shared/data/social-event-templates.ts`（新建）

存放 PRD §5.9 的 13 类 × ≥3 条 MUD 文案模板。结构：
```typescript
export const SOCIAL_EVENT_TEMPLATES: Record<
  SocialEventType,
  string[]
> = { ... };
```

### 2.12 causal-rule-registry 扩展

**文件**：`src/shared/data/causal-rule-registry.ts`

新增 CR-07 ~ CR-12 社交因果规则（PRD §5.7）。
现有 CR-01/CR-02 的 `affinityMin/affinityMax` 条件字段重命名为 `closenessMin/closenessMax`。

---

## §3 引擎层变更（② Engine）

### 3.1 soul-engine.ts 重构

**影响范围**：99 处 affinity 引用中最密集的文件（~15 处）

| 函数 | 变更内容 |
|------|---------|
| `applyEvaluationResult` (L198-210) | `edge.affinity + delta` → 三维独立应用：`edge.closeness += rd.closeness`, `edge.attraction += rd.attraction`, `edge.trust += rd.trust`；clamp 各维度到各自范围 |
| `updateRelationshipTags` (L222-260) | 阈值判定从 `edge.affinity` → `edge.closeness`（friend/rival）+ `edge.closeness + edge.trust`（mentor/grudge）；新增 crush 自动标记（`edge.attraction >= 50 → status = 'crush'`，`< 30 → 解除 crush`） |
| `decayRelationships` (L265-280) | 单一 `AFFINITY_DECAY_RATE` → 三维独立衰减率；新增 lover/sworn-sibling 关系保护（衰减率 ×0.5） |
| `processSoulEvent` (L397-450) | 构建 `SoulEvaluationResult` 时使用三维 delta |
| `recordRelationshipEvent` (L425-440) | `affinityDelta` → `closenessDelta` |

**新增常量**：
```typescript
const CLOSENESS_DECAY_RATE = 0.98;
const ATTRACTION_DECAY_RATE = 0.99;
const TRUST_DECAY_RATE = 0.995;
const CLOSENESS_DECAY_THRESHOLD = 5;
const ATTRACTION_DECAY_THRESHOLD = 3;
const TRUST_DECAY_THRESHOLD = 3;
const RELATIONSHIP_PROTECTION_FACTOR = 0.5;  // lover/sworn-sibling 衰减减免
```

**删除常量**：
```typescript
// 删除：const AFFINITY_DECAY_RATE = 0.98;
```

### 3.2 social-engine.ts 新模块

**文件**：`src/engine/social-engine.ts`（新建）

**职责**：社交邀约扫描 + 冷静期管理 + AI 邀约结果处理

```typescript
/** 冷静期记录（运行时，不持久化） */
interface CooldownEntry {
  pairKey: string;        // `${a.id}-${b.id}` 排序后
  relationType: 'lover' | 'sworn-sibling' | 'nemesis';
  expiresAtTick: number;
}

/** attraction 累积限速记录 */
interface AttractionAccumulator {
  pairKey: string;
  windowStartTick: number;
  accumulated: number;
}

export class SocialEngine {
  private cooldowns: CooldownEntry[] = [];
  private attractionAccumulators: Map<string, AttractionAccumulator> = new Map();

  /** 扫描所有弟子对，检查邀约/解除条件 */
  scanForSocialEvents(state: LiteGameState, currentTick: number): SocialScanResult[];

  /** 处理 AI 邀约返回结果 */
  processInvitationResult(state: LiteGameState, result: SocialAIResult): void;

  /** 应用 attraction 限速（PRD §5.1） */
  applyAttractionRateLimit(pairKey: string, delta: number, currentTick: number): number;
  // 算法伪代码：
  //   if (delta <= 0) return delta;  // 负向 delta 不受限速
  //   let acc = this.attractionAccumulators.get(pairKey);
  //   if (!acc || currentTick - acc.windowStartTick >= 300) {
  //     acc = { pairKey, windowStartTick: currentTick, accumulated: 0 };
  //   }
  //   const remaining = Math.max(0, 5 - acc.accumulated);
  //   const clamped = Math.min(delta, remaining);
  //   acc.accumulated += clamped;
  //   this.attractionAccumulators.set(pairKey, acc);
  //   return clamped;

  /** 检查冷静期 */
  isOnCooldown(pairKey: string, type: string, currentTick: number): boolean;

  /** 设置冷静期 */
  setCooldown(pairKey: string, type: string, durationTicks: number, currentTick: number): void;
}
```

### 3.3 social-tick.handler.ts 新 Handler

**文件**：`src/engine/handlers/social-tick.handler.ts`（新建）

```typescript
export const socialTickHandler: TickHandler = {
  name: 'social-tick',
  phase: TickPhase.CAUSAL_EVAL,  // 612
  order: 5,                       // after causal-tick (order=0)
  execute(ctx: TickContext): void {
    // 1. 扫描邀约条件（复用 SocialEngine.scanForSocialEvents）
    // 2. 扫描解除条件
    // 3. 提交 AI 请求到 AsyncAIBuffer
    // 4. crush 自动标记/解除（无需 AI）
  },
};
```

**扫描间隔**：复用 `CAUSAL_SCAN_INTERVAL_TICKS = 300`（与因果规则同频）。

### 3.4 disciple-generator.ts 适配

| 函数 | 变更内容 |
|------|---------|
| `generateInitialRelationships` (L205-225) | `affinity` → `closeness`；新增 `attraction: 0`, `trust: randomInt(0,10) + moralBonus`, `status: null` |
| `generateDisciple` | 新增 `orientation` 字段生成（按 PRD §4.2 分布表） |

**新增函数**：
```typescript
/** 根据性别 + 随机概率生成性取向 */
export function generateOrientation(gender: Gender): Orientation;
```

### 3.5 save-manager.ts 迁移

**新增函数**：`migrateV7toV8(state)`

```typescript
function migrateV7toV8(state: Record<string, unknown>): void {
  // 1. RelationshipEdge: affinity → closeness + attraction + trust + status
  //    closeness = affinity
  //    attraction = 0
  //    trust = Math.round(affinity * 0.5)
  //    status = null
  //
  // 2. disciples[]: 新增 orientation 字段
  //    根据 gender + 随机概率按分布表生成
  //
  // 3. version = 8
}
```

**SAVE_VERSION**: 7 → 8

### 3.6 relationship-memory-manager.ts 适配

| 方法 | 变更 |
|------|------|
| `recordEvent` (L30-37) | `affinityDelta` → `closenessDelta` |
| `syncFromEdge` (L101-104) | `memory.affinity = edge.affinity` → `memory.closeness = edge.closeness; memory.attraction = edge.attraction; memory.trust = edge.trust` |
| `buildSummary` (L120-145) | 好感 → 亲疏，affinityDelta → closenessDelta |
| `getOrCreate` (L160-170) | 初始值 `affinity: 0` → `closeness: 0, attraction: 0, trust: 0` |

### 3.7 causal-evaluator.ts 适配

| 函数 | 变更 |
|------|------|
| `checkAffinityThreshold` (L108-135) | 方法名 → `checkClosenessThreshold`；`edge.affinity` → `edge.closeness`；condition 字段 `affinityMin/Max` → `closenessMin/Max` |

### 3.8 goal-manager.ts 适配

| 位置 | 变更 |
|------|------|
| L156-157 | `edge.affinity >= 0` → `edge.closeness >= 0` |

### 3.9 TickContext 扩展

**文件**：`src/engine/tick-pipeline.ts`

```typescript
// TickContext 新增：
socialEngine?: SocialEngine;  // Phase I-beta: 社交引擎
```

### 3.10 idle-engine.ts 注册

```typescript
// 构造函数新增：
this.socialEngine = new SocialEngine();
this.pipeline.register(socialTickHandler);

// ctx 注入新增：
ctx.socialEngine = this.socialEngine;
```

---

## §4 AI 层变更（③ AI）

### 4.1 soul-prompt-builder.ts 重构

| 变更点 | 详情 |
|--------|------|
| `SOUL_EVAL_JSON_SCHEMA` | `delta: number` → `closeness/attraction/trust` 三字段 |
| Few-shot examples | 更新为三维 delta 格式（PRD §5.5 三个示例） |
| 关系上下文注入 | 注入三维数值 + 离散状态（如有） |
| 性取向 hint | 当目标存在时，注入 `effectiveAttraction` 提示 AI 是否应输出 attraction |

### 4.2 few-shot-examples.ts 更新

所有 `"delta":N` → `"closeness":N, "attraction":N, "trust":N` 格式。

### 4.3 soul-evaluator.ts 适配

| 函数 | 变更 |
|------|------|
| `parseSoulEvalResult` (L438-468) | 解析逻辑从单一 `delta` → 三维 `closeness/attraction/trust` |
| 格式校验 | 新增三维字段存在性校验 |
| 重试逻辑 | 校验失败 → 重试（≤2 次，INV-5）→ 降级（取任意 delta 或 closeness 作为 closeness，其余 0） |

**新增邀约判定 prompt schema**：
```typescript
// Call-1: 发起判定
{ willInitiate: boolean, reason: string }

// Call-2: 接受判定
{ accepted: boolean, reason: string }
```

### 4.4 narrative-snippet-builder.ts 适配

| 位置 | 变更 |
|------|------|
| FRAMING_PHRASES (L36-55) | `affinity` 区间 → `closeness` 区间 |
| TEMPLATES (L57-80) | `condition(affinity, tags)` → `condition(closeness, tags)` |
| `selectFramingPhrase` (L294-295) | 参数 `affinity: number` → `closeness: number` |
| `buildByTemplate` (L121) | 参数 `affinity: number` → `closeness: number` |
| `buildEventChain` (L306-310) | `affinityDelta` → `closenessDelta`（排序逻辑不变） |
| `buildByRules` / 主入口 | `memory.affinity` → `memory.closeness` |

### 4.5 ai-result-apply.handler.ts 适配

| 位置 | 变更 |
|------|------|
| L43-45 | `aiRd.delta` → `aiRd.closeness / aiRd.attraction / aiRd.trust` |
| 新增 | 处理社交邀约返回的 `SocialAIResult` 类型 |

---

## §5 表现层变更（④ Presentation）

### 5.1 mud-formatter.ts 适配

| 位置 | 变更 |
|------|------|
| L328-334 | `rel.affinity` → `rel.closeness`；增加 attraction/trust 显示 |
| 新增 | 社交事件 MUD 文案渲染（13 类模板选择 + {A}/{B}/{L} 替换） |

### 5.2 command-handler.ts 适配

| 位置 | 变更 |
|------|------|
| L398 | `mem.affinity` → `mem.closeness`，新增 attraction/trust 显示 |
| L400 | `ev.affinityDelta` → `ev.closenessDelta` |
| inspect 命令 | 新增离散关系状态显示（道侣/金兰/宿敌/暗恋） |

---

## §6 Pipeline 挂载注册表

### 6.1 新增 Handler

| # | Handler 名称 | Phase | Order | 文件 | 系统 | 来源 |
|---|-------------|:-----:|:-----:|------|------|------|
| 16 | `social-tick` | 612 | 5 | `handlers/social-tick.handler.ts` | social-engine | Phase I-beta |

### 6.2 Pipeline 执行顺序（更新后）

```
100 BUFF_COUNTDOWN
200 PRE_PRODUCTION
  → auto-breakthrough (200:10)
300 RESOURCE_PROD
500 SYSTEM_TICK
  → soul-tick (500:10)
  → goal-tick (500:20)
600 DISCIPLE_AI
605 WORLD_EVENT
610 ENCOUNTER
612 CAUSAL_EVAL
  → causal-tick (612:0)
  → social-tick (612:5)    ← NEW
625 SOUL_EVAL
  → soul-event (625:0)
  → ai-result-apply (625:5)
650 DIALOGUE
700 POST_PRODUCTION
```

> **设计理由**：social-tick 在 causal-tick 之后执行（order=5 vs order=0），因为社交扫描可能需要因果规则的结果。两者都在 encounter-tick 之后（phase=610 < 612），确保碰面事件先完成。

### 6.3 依赖矩阵新增行

| 文件 ↓ 依赖 → | game-state | soul.ts | encounter.ts | relationship-formulas | causal-rule-registry |
|:---|:---:|:---:|:---:|:---:|:---:|
| **social-engine** | R/W | R | R | R | — |
| **handlers/social-tick** | R | — | — | — | — |

---

## §7 存档 Schema v7→v8

### 7.1 版本变更链追加

| 版本 | Phase | 新增字段 | 删除字段 | 迁移函数 |
|:----:|:-----:|---------|---------|---------|
| **v8** | I-beta | `RelationshipEdge.{closeness,attraction,trust,status}`, `disciples[].orientation` | `RelationshipEdge.affinity` | `migrateV7toV8()` |

### 7.2 迁移逻辑

```typescript
function migrateV7toV8(state: Record<string, unknown>): void {
  const s = state as Record<string, any>;

  // 1. RelationshipEdge 迁移
  if (Array.isArray(s.relationships)) {
    for (const rel of s.relationships) {
      const oldAffinity = (rel.affinity as number) ?? 0;
      rel.closeness = oldAffinity;
      rel.attraction = 0;
      rel.trust = Math.round(oldAffinity * 0.5);
      rel.status = null;
      delete rel.affinity;
    }
  }

  // 2. disciples[].orientation 生成
  if (Array.isArray(s.disciples)) {
    for (const d of s.disciples) {
      if (!d.orientation) {
        d.orientation = generateOrientation(d.gender ?? 'male');
      }
    }
  }

  s.version = 8;
}
```

### 7.3 迁移链更新

```
V7 -->|migrateV7toV8| V8 -->|defaults 兜底| FINAL
```

---

## §8 影响审计（SGA Step 5）

### 8.1 类型追溯（5.1）

| 类型/接口 | 引用文件数 | 影响范围 |
|----------|:---------:|---------|
| `RelationshipEdge` | 6 | game-state, disciple-generator, relationship-memory-manager, save-manager, soul-engine, soul.ts |
| `RelationshipTag` | 7 | + narrative-snippet-builder, ai-result-apply.handler, encounter-templates |
| `SoulEvaluationResult` | 5 | async-ai-buffer, soul-evaluator, soul-engine, soul.ts, ai-result-apply.handler |
| `SoulEventType` | 7 | soul-prompt-builder, causal-evaluator, soul.ts, emotion-pool, intent-executor, event-bus, encounter-tick.handler |
| `RelationshipMemory` | 8 | narrative-snippet-builder, command-handler, relationship-memory, dialogue-coordinator, causal-evaluator, idle-engine, soul-engine, relationship-formulas |

### 8.2 函数签名影响（5.2）

| 函数 | 定义位置 | 调用位置 | 签名变更 |
|------|---------|---------|---------|
| `shouldAssignMentor` | relationship-formulas:22 | soul-engine:242 | +trust 参数 |
| `shouldRemoveMentor` | relationship-formulas:35 | soul-engine (implicit) | +trust 参数 |
| `shouldAssignGrudge` | relationship-formulas:45 | soul-engine:245 | +trust 参数 |
| `shouldRemoveGrudge` | relationship-formulas:60 | soul-engine (implicit) | +trust 参数 |
| `shouldAssignAdmirer` | relationship-formulas:70 | soul-engine:248 | affinity→closeness |
| `shouldRemoveAdmirer` | relationship-formulas:95 | soul-engine (implicit) | affinity→closeness |
| `getAvgAffinity` | encounter.ts:180 | encounter-tick.handler:144 | 重命名→getAvgCloseness, 参数类型更新 |
| `decideEncounterResult` | encounter.ts:153 | encounter-tick.handler:153 | +hasRomanticInterest 参数 |
| `applyEvaluationResult` | soul-engine:~198 | ai-result-apply.handler:~40 | delta→三维 |

### 8.3 副效果映射（5.3）

| 写入目标 | 当前写者 | 新增写者 | 冲突风险 |
|---------|---------|---------|:--------:|
| `edge.closeness` | soul-engine (applyEval + decay) | social-engine (邀约后果) | 低：时序隔离（612 vs 625） |
| `edge.attraction` | 无（新字段） | soul-engine + social-engine | 低：同上 |
| `edge.trust` | 无（新字段） | soul-engine + social-engine | 低：同上 |
| `edge.status` | 无（新字段） | social-engine（唯一） | 无 |
| `edge.tags` | soul-engine (updateRelationshipTags) | 不变 | 无 |

### 8.4 Handler 联动审查（5.4）

| Handler | 联动影响 | 处理 |
|---------|---------|------|
| encounter-tick (610:0) | affinity→closeness；新增 flirt 碰面结果分支 | 重构 |
| causal-tick (612:0) | affinityMin/Max→closenessMin/Max | 适配 |
| soul-event (625:0) | SoulEventType 新增 13 个 | 适配 emotion-pool |
| ai-result-apply (625:5) | delta→三维 delta | 重构 |
| goal-tick (500:20) | affinity→closeness (revenge goal) | 适配 |

### 8.5 测试脚本影响（5.5）

| 脚本 | 影响 | 处理 |
|------|------|------|
| `scripts/regression-all.ts` | 所有引用 affinity 的用例需更新为 closeness | 更新 |
| 新增 | `scripts/verify-social-system.ts` — 社交系统专项验证 | 新建 |

### 8.6 文档一致性（5.6）

| 文档 | 需更新内容 |
|------|-----------|
| `arch/gamestate.md` | RelationshipEdge 属性更新 + 多写者审计 + 读写矩阵 |
| `arch/pipeline.md` | +social-tick handler 注册 + TickContext +socialEngine |
| `arch/dependencies.md` | +social-engine 行 + social-tick 行 |
| `arch/schema.md` | +v8 变更链 |
| `arch/layers.md` | +social-engine.ts + social-tick.handler.ts |
| `arch/cross-index.md` | +社交事件系统条目 |
| `prd/systems.md` | +社交事件系统 |
| `docs/project/handoff.md` | 更新当前 Phase 状态 |
| `docs/project/task-tracker.md` | 更新 I-beta 行 |
| `docs/project/SOUL-VISION-ROADMAP.md` | +I-beta 条目（Phase I 分解为 I-alpha/I-beta/I-gamma） |

### 8.7 回归测试范围（5.7）

**必须回归的现有功能**：
1. 关系标签分配（friend/rival/mentor/admirer/grudge）— closeness 基准
2. 关系衰减（三维独立衰减率）
3. 碰面系统（closeness 分档 + 新增 flirt）
4. 因果规则（CR-01/CR-02 closenessMin/Max）
5. AI 灵魂评估（三维 delta 输出解析）
6. 关系记忆（closenessDelta 排序+显示）
7. 叙事片段（closeness 区间选择）
8. 存档迁移链（v1→v2→...→v7→v8）
9. MUD 显示（关系数值 + 标签 + 状态）

### 8.8 迁移链完整性（5.8）

```
v1 → v2 → v3 → v4 → v5 → v6 → v7 → v8 (NEW)
```

每一步迁移函数已在 save-manager.ts 中链式注册。v8 新增需在 `if (version < 8)` 之后插入 `migrateV7toV8(state)` 调用。

---

## §9 编码执行顺序

按依赖拓扑排序，分 5 层执行：

| 层 | 文件 | 内容 | 依赖 |
|:--:|------|------|------|
| L0 | `shared/types/soul.ts` | RelationshipStatus, SoulEventType×13, SOUL_EVENT_POLARITY, 标签阈值重构 | 无 |
| L0 | `shared/types/game-state.ts` | Orientation, RelationshipEdge 重构, LiteDiscipleState +orientation, createDefaultLiteGameState() version→8 | soul.ts |
| L0 | `shared/types/causal-event.ts` | +2 CausalTriggerType | 无 |
| L0 | `shared/types/encounter.ts` | EncounterResult.FLIRT, CLOSENESS_BAND, getAvgCloseness, 新分档 | game-state |
| L0 | `shared/types/relationship-memory.ts` | 三维缓存, closenessDelta | soul.ts |
| L1 | `shared/formulas/relationship-formulas.ts` | 签名重构 +trust, +新函数 | soul.ts, game-state |
| L1 | `shared/data/causal-rule-registry.ts` | CR-07~12, closenessMin/Max 重命名 | causal-event, soul.ts |
| L1 | `shared/data/social-event-templates.ts` | MUD 文案模板 | soul.ts |
| L1 | `shared/data/emotion-pool.ts` | 新增 13 个社交事件的情绪候选池 | soul.ts |
| L2 | `engine/soul-engine.ts` | 三维 apply/decay/tags, crush 自动标记 | L0+L1 全部 |
| L2 | `engine/disciple-generator.ts` | closeness 初始化, +orientation 生成 | game-state |
| L2 | `engine/save-manager.ts` | migrateV7toV8 | game-state |
| L2 | `engine/relationship-memory-manager.ts` | 三维同步, closenessDelta | relationship-memory |
| L2 | `engine/causal-evaluator.ts` | closeness threshold | causal-event |
| L2 | `engine/goal-manager.ts` | affinity→closeness | game-state |
| L2 | `engine/social-engine.ts` | 新建：邀约扫描+冷静期 | game-state, soul.ts, relationship-formulas |
| L3 | `engine/handlers/social-tick.handler.ts` | 新建：Pipeline 挂载 | social-engine, tick-pipeline |
| L3 | `engine/handlers/encounter-tick.handler.ts` | closeness, +flirt, +crush/lover 分档 | encounter.ts |
| L3 | `engine/handlers/ai-result-apply.handler.ts` | 三维 delta 处理 | soul-engine |
| L3 | `engine/handlers/goal-tick.handler.ts` | affinity→closeness | game-state |
| L3 | `engine/idle-engine.ts` | +SocialEngine 实例化+注册 | social-engine |
| L4 | `ai/soul-prompt-builder.ts` | 三维 schema, few-shot, 关系上下文 | soul.ts |
| L4 | `ai/few-shot-examples.ts` | delta→三维格式 | — |
| L4 | `ai/soul-evaluator.ts` | 三维解析+重试+降级 | soul.ts |
| L4 | `ai/narrative-snippet-builder.ts` | affinity→closeness 全量替换 | relationship-memory |
| L5 | `ui/mud-formatter.ts` | closeness 显示 + 社交事件模板 | game-state |
| L5 | `ui/command-handler.ts` | inspect 命令适配 | game-state, relationship-memory |
| L5 | `scripts/regression-all.ts` | 更新 affinity→closeness + 新增社交用例 | 全部 |
| L5 | `scripts/verify-social-system.ts` | 新建：社交系统专项验证 | 全部 |

**总计**：~27 个文件（20 个修改 + 3 个新建 + 4 个脚本/文档）

---

## §10 验证计划

### 10.1 tsc 零错误

每层编码完成后运行 `npx tsc --noEmit`，确保类型一致。

### 10.2 回归测试

```bash
npx tsx scripts/regression-all.ts
```

所有现有用例在 closeness 基准下行为一致。

### 10.3 社交系统专项验证

新建 `scripts/verify-social-system.ts`：

| # | 验证点 | 方法 |
|---|--------|------|
| V-1 | 三维向量独立演化（INV-1） | 构造 edge，分别修改三维，验证互不影响 |
| V-2 | attraction 性取向门控（INV-3） | 异性恋弟子对同性 → attraction delta = 0 |
| V-3 | crush 自动标记/解除 | attraction 50→标记, 30→解除 |
| V-4 | 标签阈值重映射 | closeness ≥60 → friend, etc. |
| V-5 | 衰减率三维独立 | 3 个维度独立衰减率正确 |
| V-6 | 离散关系保护 | lover 对子衰减率 ×0.5 |
| V-7 | 存档迁移 v7→v8 | affinity→closeness, trust=affinity×0.5, orientation 生成 |
| V-8 | AI 三维 delta 解析 + 重试 + 降级 | mock AI 返回各种格式 |
| V-9 | 性格兼容度天花板 | 超过天花板时 delta ×0.1 |
| V-10 | attraction 累积限速 | 300 ticks 内 +5 上限 |

### 10.4 人工验证

启动 `npm run dev` + `npm run ai`，运行 30 分钟观察：
- 弟子间是否出现差异化关系发展
- 社交事件是否在 MUD 日志中正确呈现
- 性取向门控是否有效

---

## §11 技术债务

### 新增

| # | 描述 | 来源 | 优先级 |
|---|------|------|:------:|
| TD-032 | 社交邀约 AI 调用通过 AsyncAIBuffer 间接异步，延迟 2~3 ticks。如需实时响应可引入专用邀约队列 | ADR-Iβ-03 | P4 |
| TD-033 | 冷静期数据不持久化，重启后清零。如需持久可将冷静期写入 GameState | PRD §4.5 设计决策 | P4 |

### 计划清偿

| # | 描述 | 清偿方式 |
|---|------|---------|
| TD-012 | 关系数值参数未经 Monte Carlo 验证 | Phase I-beta SGE 阶段可部分验证三维衰减率 |
| TD-030 | Lv.3 决策缺少关系上下文 | 本 Phase 在 soul-prompt-builder 中注入三维关系 + 离散状态 |

---

## 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-04-02 | v1.0 | 初始创建：完整 TDD 覆盖 §0-§11 |
| 2026-04-02 | v1.1 | Gate 2 BLOCK 修复：+§2.0 createDefaultLiteGameState() 更新；WARN 修复：+rate-limiter 算法伪代码；+SOUL-VISION-ROADMAP 到 §8.6 文档审计 |
