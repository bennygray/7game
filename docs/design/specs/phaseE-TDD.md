# Phase E — NPC 灵魂系统 TDD（技术设计文档）

> **Phase**: E (v0.5) | **Skill**: /SGA (Gate 2)
> **PRD**: [`features/phaseE-PRD.md`](../../features/phaseE-PRD.md) — `[x] GATE 1 PASSED` 2026-03-29
> **架构参考**: [`MASTER-ARCHITECTURE.md`](../MASTER-ARCHITECTURE.md)
> **存档版本**: v3 → **v4**

---

## Step 1：全局对齐 + Invariant 验证

### 1.1 分层归属

| 新文件 | 层级 | 理由 |
|--------|:----:|------|
| `src/shared/types/soul.ts` | ① Data | 类型定义：MoralAlignment, TraitDef, SoulEvaluationResult, EmotionTag, SoulEventType |
| `src/shared/data/trait-registry.ts` | ① Data | TRAIT_REGISTRY 数据表（12 个 TraitDef） |
| `src/shared/data/emotion-pool.ts` | ① Data | 事件→候选池映射表 + Delta 方向修正表 |
| `src/engine/soul-engine.ts` | ② Engine | 灵魂评估核心：buildCandidatePool → AI 调用 → correctDelta → apply |
| `src/engine/event-bus.ts` | ② Engine | 事件总线：发布-订阅模式 |
| `src/engine/handlers/soul-tick.handler.ts` | ② Engine | Pipeline Handler：衰减 + 后天特性检测 |
| `src/engine/handlers/soul-event.handler.ts` | ② Engine | Pipeline Handler：事件队列消费 + AI 评估调度 |
| `src/ai/soul-prompt-builder.ts` | ③ AI | 灵魂评估 prompt 构建（候选池 + 弟子上下文 → prompt） |

### 1.2 Invariant 对照验证

| PRD Invariant | 架构实现 | 冲突？ |
|:---|:---|:---:|
| I1 引擎仲裁 | soul-engine 的 correctDeltaDirection + clampDelta 在 AI 输出后强制执行 | ✅ 无冲突 |
| I2 AI 不可用 fallback | soul-engine 检测 llm-adapter 连接状态，失败→规则引擎随机选情绪+模板独白 | ✅ 无冲突 |
| I3 规则验证 | AI 不直接写 GameState，soul-engine 作为中介校验后写入 | ✅ 无冲突 |
| I4 结构化输出 | llama.cpp response_format json_schema 约束（PoC-1 已验证 100%） | ✅ 无冲突 |
| I5 变化硬上限 | clampDelta([-5,+5]) + R-E2 道德 ±5 | ✅ 无冲突 |
| I6 双向独立 | RelationshipEdge 按 (sourceId, targetId) 有向存储，A→B ≠ B→A | ✅ 无冲突 |

### 1.3 现有架构冲突检查

| 检查点 | 结果 |
|--------|------|
| 跨层通信禁令 X-5 (`禁止代码硬编码 prompt`) | ✅ prompt 在 `ai/soul-prompt-builder.ts`，不在 engine 中 |
| 跨层通信禁令 X-6 (`修改 Pipeline 必须更新文档`) | ✅ 新增 Handler 将同步更新 `arch/pipeline.md` |
| GameState 多写者 | ⚠️ 需明确 Owner — 见 Step 2 |

---

## Step 2：Interface 设计 + GameState 变更 + 存档迁移策略

### 2.1 新增类型（`src/shared/types/soul.ts`）

```typescript
// ===== 道德系统 =====
export interface MoralAlignment {
  goodEvil: number;   // [-100, +100]
  lawChaos: number;   // [-100, +100]
}

// ===== 特性系统 =====
export interface DiscipleTrait {
  defId: string;              // 指向 TRAIT_REGISTRY 的 id
  acquiredAt?: number;        // 后天特性获取时间戳（innate 无此字段）
}

export interface TraitDef {
  id: string;
  name: string;
  category: 'innate' | 'acquired';
  polarity: 'positive' | 'negative' | 'neutral';
  effects: TraitEffect[];
  aiHint: string;
  trigger?: AcquiredTrigger;
}

export interface TraitEffect {
  type: 'behavior-weight' | 'relationship-modifier' | 'moral-drift' | 'emotion-weight';
  target: string;
  value: number;
}

export interface AcquiredTrigger {
  condition: string;
  probability: number;
}

// ===== 情绪与事件 =====
export type EmotionTag =
  | 'joy' | 'anger' | 'envy' | 'admiration'
  | 'sadness' | 'fear' | 'contempt' | 'neutral'
  | 'jealousy' | 'gratitude' | 'guilt' | 'worry'
  | 'shame' | 'pride' | 'relief';

export type SoulEventType =
  | 'alchemy-success' | 'alchemy-fail'
  | 'harvest' | 'meditation' | 'explore-return'
  | 'breakthrough-success' | 'breakthrough-fail';

export type SoulEventPolarity = 'positive' | 'negative';

export type SoulRole = 'self' | 'observer';

// ===== AI 评估结果 =====
export interface SoulEvaluationResult {
  emotion: EmotionTag;
  intensity: 1 | 2 | 3;
  relationshipDeltas: Array<{
    targetId: string;
    delta: number;
    reason: string;
  }>;
  innerThought: string;
}

// ===== 关系标签 =====
export type RelationshipTag = 'friend' | 'rival' | 'mentor' | 'admirer' | 'grudge';
```

### 2.2 GameState 变更（`game-state.ts`）

#### LiteDiscipleState 新增字段

```typescript
export interface LiteDiscipleState {
  // ... 现有字段不变 ...

  // === Phase E 新增 ===

  /** 道德双轴 */
  moral: MoralAlignment;
  /** 初始道德（生成时记录，不可变，用于 R-E14 趋同夹值） */
  initialMoral: MoralAlignment;
  /** 特性列表（先天1~2 + 后天0~3） */
  traits: DiscipleTrait[];
}
```

#### RelationshipEdge 升级

```typescript
export interface RelationshipEdge {
  sourceId: string;
  targetId: string;
  /** 好感度 -100 ~ +100（替代原 value 字段） */
  affinity: number;
  /** 关系标签（可叠加） */
  tags: RelationshipTag[];
  /** 最后交互时间戳（用于衰减计算） */
  lastInteraction: number;
}
```

> **Breaking Change**: `RelationshipEdge.value` → `affinity`，旧字段在迁移中转换。

#### Owner 矩阵（新增字段）

| 字段 | 唯一写入者 | 读取者 |
|------|-----------|--------|
| `disciples[].moral` | soul-engine（AI 评估 + 自然漂移） | soul-prompt-builder, soul-engine |
| `disciples[].initialMoral` | disciple-generator（生成时一次性写入，此后不可变） | soul-engine（R-E14 趋同夹值参考） |
| `disciples[].traits` | soul-engine（生成 + 后天获取） | behavior-tree（权重修正）, soul-prompt-builder |
| `relationships[].affinity` | soul-engine（AI delta + 规则 delta） | behavior-tree, soul-prompt-builder, main.ts |
| `relationships[].tags` | soul-engine（标签自动分配） | behavior-tree, soul-prompt-builder |
| `relationships[].lastInteraction` | soul-engine | soul-tick.handler（衰减计算） |

### 2.3 createDefaultLiteGameState 更新

```typescript
// disciple 默认值（在 disciple-generator.ts 中生成）
const moral = {
  goodEvil: randomInt(-30, 30),   // R-E1
  lawChaos: randomInt(-30, 30),   // R-E1
};
{
  moral,
  initialMoral: { ...moral },     // 引用拷贝，此后不可变
  traits: generateInnateTraits(),  // 随机 1~2 个先天特性（R-E5 + R-E8 互斥规则）
}

// relationship 默认值
{
  sourceId, targetId,
  affinity: computeInitialAffinity(discipleA, discipleB), // R-E9 公式
  tags: [],
  lastInteraction: Date.now(),
}
```

### 2.4 存档迁移 v3 → v4

```typescript
export function migrateV3toV4(state: any): LiteGameState {
  // 1. 弟子：补充 moral + traits
  for (const d of state.disciples) {
    if (!d.moral) {
      d.moral = {
        goodEvil: randomInt(-30, 30),
        lawChaos: randomInt(-30, 30),
      };
    }
    if (!d.initialMoral) {
      d.initialMoral = { ...d.moral }; // 迁移时以当前 moral 作为初始值
    }
    if (!d.traits) {
      d.traits = generateInnateTraits(); // 随机 1 个先天特性
    }
  }

  // 2. 关系边：value → affinity + tags + lastInteraction
  state.relationships = state.relationships.map((r: any) => ({
    sourceId: r.sourceId,
    targetId: r.targetId,
    affinity: r.value ?? r.affinity ?? 0,  // v3 的 value 映射到 affinity
    tags: r.tags ?? [],
    lastInteraction: r.lastInteraction ?? Date.now(),
  }));

  // 3. 版本号
  state.version = 4;
  return state;
}
```

**迁移规则**：
- `RelationshipEdge.value` → `affinity`（直接映射）
- 新弟子 moral 随机生成（[-30, +30]）
- 新弟子 traits 随机 1 个先天特性
- 关系边新增 `tags: []` + `lastInteraction: Date.now()`

---

## Step 3：Tick Pipeline 挂载规划 + 依赖矩阵

### 3.1 新增 Handler

| Handler | Phase | Order | 频率 | 职责 |
|---------|:-----:|:-----:|------|------|
| `soul-tick` | 500 (SYSTEM_TICK) | 10 | 每 tick | 关系衰减（每 5min ×0.98） + 道德自然漂移 + 后天特性触发检测 |
| `soul-event` | 625 (SOUL_EVAL) | 0 | 每 tick 消费 ≤1 个事件 | 从事件队列取出 1 个事件 → 异步 AI 评估(不阻塞 tick) → 结果回写下一 tick → 写 GameState |

#### 新增 TickPhase

```typescript
export const TickPhase = {
  // ... 现有 ...
  SOUL_EVAL: 625,  // 在 DISCIPLE_AI(600) 之后、DIALOGUE(650) 之前
} as const;
```

**挂载位置理由**：
- `soul-tick`(500) 在 SYSTEM_TICK 阶段：与 farm-tick 同级，处理周期性更新
- `soul-event`(625) 在 SOUL_EVAL 阶段：在行为决策(600)之后获取行为结束事件，在对话(650)之前生成灵魂日志

#### Pipeline 更新后执行顺序

```
100 BUFF_COUNTDOWN → 200 PRE_PRODUCTION → 300 RESOURCE_PROD
→ 500 SYSTEM_TICK (farm-tick:0, soul-tick:10)
→ 600 DISCIPLE_AI (disciple-tick:0)
→ 625 SOUL_EVAL (soul-event:0) ← 新增
→ 650 DIALOGUE (dialogue-tick:0)
→ 700 POST_PRODUCTION
```

### 3.2 事件总线设计

```typescript
// src/engine/event-bus.ts

export interface SoulEvent {
  type: SoulEventType;
  actorId: string;          // 执行行为的弟子 ID
  timestamp: number;
  metadata?: Record<string, any>; // 额外数据（如炼丹品质）
}

export class EventBus {
  private queue: SoulEvent[] = [];

  emit(event: SoulEvent): void {
    this.queue.push(event);
  }

  drain(): SoulEvent[] {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }
}
```

**事件发射点**（在 `intent-executor.ts` 中注入）：
- `end-behavior` 时，根据 `outcomeTag` 发射对应 `SoulEvent`
- breakthrough-engine 突破成功/失败时发射

### 3.3 soul-engine 核心流程

```
[EventBus.drain()] → for each event:
  → for each disciple (except actor for observer / actor for self):
    → role = (disciple === actor) ? 'self' : 'observer'
    → candidates = buildCandidatePool(event.type, role)    // 数据表查找
    → traitWeights = getTraitEmotionWeights(disciple)       // 特性加权
    → IF (AI available):
        → result = await soulPromptBuilder.build(...)
                   → llmAdapter.infer(prompt, jsonSchema)
        → result = correctDeltaDirection(result, event, role)
        → result = clampDeltas(result, [-5, +5])
      ELSE:
        → result = fallbackEvaluate(candidates, role)       // 规则引擎
    → applyDeltas(state, disciple, result)                  // 写 GameState
    → updateTags(state, disciple)                           // 标签检查
    → emitSoulLog(disciple, result)                         // MUD 日志
```

### 3.4 依赖矩阵新增

| 新文件 ↓ 依赖 → | game-state | soul.ts | trait-registry | emotion-pool | llm-adapter | event-bus |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **soul-engine** | R/W | R | R | R | R | R |
| **event-bus** | — | R | — | — | — | — |
| **soul-tick.handler** | R/W | R | R | — | — | — |
| **soul-event.handler** | R | — | — | — | — | R |
| **soul-prompt-builder** | R | R | R | R | — | — |
| **intent-executor** (修改) | — | — | — | — | — | W |
| **disciple-generator** (修改) | W | R | R | — | — | — |
| **behavior-tree** (修改) | R | R | R | — | — | — |

### 3.5 回归影响评估

| 改动文件 | 影响范围 | 风险 |
|---------|---------|:----:|
| `game-state.ts` | **全局** — 所有 Engine+Handler | 🟡 字段新增（非破坏），RelationshipEdge 字段重命名（破坏 → 迁移兜底）|
| `intent-executor.ts` | dialogue-coordinator, disciple-tick | 🟢 仅新增 EventBus.emit 调用，不改现有逻辑 |
| `disciple-generator.ts` | save-manager | 🟢 新增 moral/traits 生成，不改现有 |
| `behavior-tree.ts` | disciple-tick, intent-executor | 🟡 行为权重需注入特性修正，需确保回归 |
| `save-manager.ts` | 全局存档 | 🟡 新增 migrateV3toV4 + SAVE_VERSION=4 |

**回归测试计划**：
- `npx tsx scripts/regression-all.ts` — 全部现有 Phase A-D 测试
- `npx tsx scripts/verify-phaseE.ts` — Phase E 专项 10 组验证
- 手动验证：v3 存档加载 → 迁移 → 游戏正常运行

---

## Step 4：ADR 决策日志

### ADR-E01：事件总线 vs 直接调用

| | 方案 A：EventBus（发布-订阅） | 方案 B：直接调用 soul-engine |
|---|---|---|
| **耦合度** | ✅ intent-executor 不 import soul-engine | ❌ intent-executor → soul-engine 直接依赖 |
| **可测试性** | ✅ EventBus 可独立测试 | ⚠️ 需 mock soul-engine |
| **扩展性** | ✅ 未来新事件消费者只需订阅 | ❌ 每个消费者都需修改 intent-executor |
| **复杂度** | ⚠️ 多一个类 | ✅ 最简实现 |

**决策**：**方案 A — EventBus**。符合 I2（AI 不可用时 EventBus 仍正常运行），且 soul-engine 的 async AI 调用不应耦合到 intent-executor 的同步流程中。

### ADR-E02：soul-tick vs soul-event 拆分

| | 方案 A：单一 Handler | 方案 B：拆分为两个 Handler |
|---|---|---|
| **职责清晰** | ❌ 周期性更新 + 事件处理混在一起 | ✅ 各自职责单一 |
| **性能** | ⚠️ 每 tick 都检查事件队列 | ✅ soul-tick 不关心事件，soul-event 仅在有事件时工作 |
| **Pipeline 顺序** | ⚠️ 难以控制是否在 AI 行为之后 | ✅ 可精确放在 DISCIPLE_AI(600) 和 DIALOGUE(650) 之间 |

**决策**：**方案 B — 拆分**。周期性更新（衰减/漂移）是 SYSTEM_TICK 职责，事件评估需要 disciple-tick 的结果（行为决策）作为输入，需在其后执行。

### ADR-E03：TickContext 扩展 vs EventBus 全局实例

| | 方案 A：通过 TickContext 传递 EventBus | 方案 B：EventBus 为全局单例 |
|---|---|---|
| **测试性** | ✅ tick 内注入，可替换 mock | ⚠️ 全局状态，需 reset |
| **可控性** | ✅ 生命周期与 tick 绑定 | ❌ 生命周期不受控 |
| **修改量** | ⚠️ 需修改 TickContext interface | ✅ 无需改 TickContext |

**决策**：**方案 A — TickContext 注入**。保持与现有 `systemLogs`/`discipleEvents` 一致的模式。在 TickContext 新增 `eventBus: EventBus` 字段。

---

## SGA Signoff

- [x] Interface 设计完整（所有新字段有 Owner — 见 §2.2 Owner 矩阵）
- [x] 存档迁移策略完整（migrateV3toV4 已规划 — 见 §2.4）
- [x] Pipeline 挂载方案确认（SYSTEM_TICK:500 + SOUL_EVAL:625 — 见 §3.1）
- [x] 依赖矩阵已更新（§3.4）
- [x] Party Review 无 BLOCK 项（CONDITIONAL PASS 6W/0B — 见 `pipeline/phaseE/sga-review.md`）
- [x] 技术债务已登记（TD-012 关系参数验证，见 `docs/project/tech-debt.md`）

签章：`[x] GATE 2 PASSED` — 2026-03-29

> **Review 备注**：W3（AI 阻塞）和 W4（initialMoral）已在 TDD 中修正。W1（工期）和 W5（重命名 grep）在 SGE 阶段处理。

---

## SGE Party Review 报告

### R1 魔鬼PM 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 ROI | ✅ | 8 个新文件系统完整；玩家可见 [灵魂] 日志增加弟子活力感，ROI 达标 |
| D2 认知负担 | ✅ | 玩家 0 新操作，灵魂评估完全自动触发，输出清晰 |
| D3 范围控制 | ✅ | 所有文件均在 TDD IN 表内，breakthrough 事件触发已延后登记 |

### R6 找茬QA 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 边界穷举 | ✅ | clampDelta/decayRelationships 有完整边界保护；所有候选池非空已验证 |
| D2 并发竞态 | ✅ | soul-event 异步 fire-and-forget，单线程 JS 无竞态；每 tick ≤1 事件 |
| D3 回归风险 | ✅ | 56/56 回归全通过；value→affinity 全量扫描替换 |
| D4 可测试性 | ✅ | 核心函数全部纯函数，verify-phaseE.ts 47 项全通过 |
| D5 存档兼容 | ✅ | v3→v4 链式迁移在 save-manager 实现，mock 验证通过 |

**⚠️ WARN-1 (R6-D1)**: `emotion-pool.ts` 候选池原有 `sympathy` 无效情绪 → 已在 SGE 阶段清理修复

### R7 资深程序员 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 单一职责 | ✅ | 所有函数 < 50 行，职责清晰（soulTickUpdate/processSoulEvent/fallbackEvaluate） |
| D2 Magic Number | ⚠️ WARN | `0.8`（generateInnateTraits 概率）+ `400`（道德归一化分母）未命名 → TD-013 |
| D3 错误处理 | ✅ | soul-event.handler catch 块；buildCandidatePool 兜底；getEdge 有 undefined guard |
| D4 重复代码 | ✅ | fallbackEvaluate 与 processSoulEvent 职责清晰分离，无重复 |
| D5 命名质量 | ✅ | 所有导出函数命名自解释 |
| D6 注释质量 | ✅ | 每文件有 ADR/Story 引用，核心逻辑有 WHY 注释 |
| D7 性能意识 | ✅ | tick 热路径 O(n=8)；decayRelationships O(56) 可接受；soul-event 异步不阻塞 |

**⚠️ WARN-2 (R7-D2)**: 见 TD-013，下次触及时提取

### SGE Party Review 最终判定

> ⚠️ **CONDITIONAL PASS**: 2 WARN, 0 BLOCK。可交付。
> - WARN-1 (R6-D1): `sympathy` 无效情绪 → 已修复
> - WARN-2 (R7-D2): `0.8/400` 未命名 → 记入 TD-013

---

## SGE Delivery

- [x] 所有 User Story 的 AC 已验证通过（verify-phaseE.ts 47/47）
- [x] `npx tsc --noEmit` 退出码 0
- [x] `npm run test:regression` 退出码 0 (56/56 passed)
- [x] Party Review 无 BLOCK 项（2 WARN）
- [x] 交接文档已更新（handoff.md + tech-debt.md）

签章：`[x] GATE 3 PASSED` — 2026-03-29

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-29 | TDD 初始创建：Step 1-4 + 3 个 ADR |
| 2026-03-29 | Party Review 修正：W3 soul-event 异步非阻塞 + W4 新增 initialMoral 字段。GATE 2 签章 |
| 2026-03-29 | SGE 编码完成：8 新文件 + 4 修改文件，tsc 0 errors，56/56 回归，47/47 专项验证。GATE 3 签章 |
