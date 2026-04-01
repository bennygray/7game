# Phase J-Goal — 个人目标系统 TDD（技术设计文档）

> **版本**：v1.0 | **日期**：2026-04-01
> **前置 PRD**：`docs/features/phaseJ-goal-PRD.md` v1.0（GATE 1 PASSED）
> **维护者**：/SGA
> **GATE 2**：`[x] GATE 2 PASSED` — 2026-04-01（CONDITIONAL PASS, 1 BLOCK fixed / 5 WARN, USER 确认接受）

---

## S1 全局对齐

### 1.1 六层归属

| 层 | 涉及 | 变更类型 |
|----|------|---------|
| ⑥World（世界层） | — | 无 |
| ①Data（数据层） | `personal-goal.ts`, `goal-data.ts`, `game-state.ts` | 类型扩展 + 新数据文件 |
| ②Perception（感知层） | `soul-prompt-builder.ts` | Prompt 注入 |
| ③Decision（决策层） | `behavior-tree.ts`, `disciple-tick.handler.ts` | Layer 5 权重叠加 |
| ④Social（社交层） | `soul-engine.ts`, `soul-event.handler.ts` | 事件驱动目标触发 |
| ⑤Presentation（呈现层） | `goal-tick.handler.ts` (new) | MUD 文案输出 |

### 1.2 跨层审计

| 跨层路径 | 方向 | 合规性 |
|----------|------|--------|
| ①Data → ③Decision | 目标乘数表从 goal-data.ts 读取，应用到 behavior-tree.ts | ✅ 只读依赖，data→engine |
| ④Social → ①Data | processSoulEvent 触发后写入目标到 GameState.goals | ✅ engine 内部写 state |
| ①Data → ②Perception | goal prompt segment 从 GameState 读取 | ✅ AI 层只读 state |
| ⑤Presentation → ①Data | goal-tick handler 递减 TTL，写 GameState.goals | ✅ engine handler 写 state |

### 1.3 GameState 变更

```typescript
// LiteGameState v5 → v6
interface LiteGameState {
  version: number;  // 5 → 6
  // ... existing fields ...
  goals: PersonalGoal[];  // 新增：全局目标池
}
```

v5→v6 迁移：新增 `goals: []` 空数组，零风险向后兼容。

---

## S2 Interface 设计

### 2.1 修改 `src/shared/types/personal-goal.ts`

```typescript
/** R-G01: 个人目标实例（v2 — Phase J-Goal 扩展） */
export interface PersonalGoal {
  id: string;
  discipleId: string;               // +新增：归属弟子 ID
  type: GoalType;
  target: Record<string, unknown>;
  assignedAtTick: number;
  ttl: number;                       // 改：移除 null（I3 强制 TTL）
  remainingTtl: number;              // +新增：剩余 TTL（每 tick 递减）
  behaviorMultipliers: Record<string, number>;
}
```

**变更摘要**：
- `+discipleId: string` — 全局池中区分归属
- `ttl: number | null` → `ttl: number` — 不变量 I3 强制 TTL
- `+remainingTtl: number` — 运行时递减，初始值 = ttl

### 2.2 新建 `src/shared/data/goal-data.ts`

纯数据文件，位于 `src/shared/data/`（与 `trait-registry.ts` 同级）。

```typescript
import type { GoalType } from '../types/personal-goal';
import type { DiscipleBehavior } from '../types/game-state';

/** 目标行为乘数表（PRD §3.2） */
export const GOAL_BEHAVIOR_MULTIPLIERS: Record<GoalType, Record<DiscipleBehavior, number>>;

/** 目标 TTL 表（PRD §3.1） */
export const GOAL_TTL: Record<GoalType, number>;

/** 目标中文标签（MUD 文案用） */
export const GOAL_LABEL: Record<GoalType, string>;

/** MUD 文案模板（PRD §3.5） */
export const GOAL_MUD_TEXT: {
  assigned: Record<GoalType, string>;
  completed: Record<GoalType, string>;
  expired: Record<GoalType, string>;
};

/** 定期扫描间隔（ticks） */
export const GOAL_SCAN_INTERVAL = 60;

/** 目标触发来源分类 */
export const EVENT_DRIVEN_GOALS: GoalType[] = ['breakthrough', 'revenge', 'friendship'];
export const PERIODIC_GOALS: GoalType[] = ['seclusion', 'ambition'];
```

### 2.3 新建 `src/engine/goal-manager.ts`

无状态服务类（模式同 `RelationshipMemoryManager`）。状态在 `GameState.goals` 中，GoalManager 只提供操作方法。

```typescript
import type { PersonalGoal, GoalType } from '../shared/types/personal-goal';
import type { LiteGameState, LiteDiscipleState } from '../shared/types/game-state';

export class GoalManager {
  /**
   * 分配目标给弟子（含 G1/G2/G3 守卫）
   * @returns 分配的目标，或 null（被守卫拒绝）
   */
  assignGoal(
    state: LiteGameState,
    discipleId: string,
    type: GoalType,
    target: Record<string, unknown>,
    currentTick: number,
  ): PersonalGoal | null;

  /**
   * 移除指定目标
   */
  removeGoal(state: LiteGameState, goalId: string): void;

  /**
   * 每 tick 递减所有目标的 remainingTtl
   * 返回已过期的目标列表
   */
  tickGoals(state: LiteGameState): PersonalGoal[];

  /**
   * 检查完成条件，返回已完成的目标列表
   *
   * 完成条件（按目标类型）：
   * - breakthrough: state 中弟子 realm/subRealm 已超过 target 记录值
   *   （由 breakthrough-success 事件驱动修改 state 后，下一 tick 检测）
   * - revenge: 与 targetDiscipleId 的 affinity ≥ 0（怨念消解）
   * - friendship: targetDiscipleId 已有 'friend' 标签
   * - seclusion/ambition: 仅靠 TTL 过期完成（无主动完成条件）
   *
   * 注意：均为状态轮询，在 goal-tick(500:20) 中每 tick 检查
   */
  checkCompletions(state: LiteGameState): PersonalGoal[];

  /**
   * 定期扫描：基于性格分配 seclusion/ambition
   * @param currentTick 用于判断扫描间隔
   */
  periodicScan(state: LiteGameState, currentTick: number): void;

  /**
   * 获取指定弟子的活跃目标
   */
  getGoalsForDisciple(state: LiteGameState, discipleId: string): PersonalGoal[];

  /**
   * 获取指定弟子的 Layer 5 合成乘数
   * 无目标时返回空 Record（全 ×1.0 语义）
   */
  getLayer5Multipliers(state: LiteGameState, discipleId: string): Record<string, number>;
}
```

**守卫逻辑**（在 `assignGoal` 内部）：

```
G1: getGoalsForDisciple(discipleId).length >= MAX_ACTIVE_GOALS → reject
G2: 已有同类型目标 → reject
G3: 事件驱动目标触发时，若槽位被定期目标占满：
    - 找到 remainingTtl 最小的 PERIODIC 目标
    - removeGoal 该目标
    - 重新尝试分配
```

**Layer 5 合成公式**：

```
multipliers = {}
for each goal of disciple:
  for each behavior in goal.behaviorMultipliers:
    multipliers[behavior] = (multipliers[behavior] ?? 1.0) * goal.behaviorMultipliers[behavior]
for each behavior in multipliers:
  multipliers[behavior] = clamp(multipliers[behavior], 1/GOAL_MULTIPLIER_CAP, GOAL_MULTIPLIER_CAP)
  // i.e. clamp(value, 0.5, 2.0)
return multipliers
```

### 2.4 TickContext 扩展

```typescript
// src/engine/tick-pipeline.ts — TickContext 新增字段
export interface TickContext {
  // ... existing fields ...
  /** Phase J-Goal: 目标管理器 */
  goalManager?: GoalManager;
}
```

---

## S3 Pipeline 设计

### ADR-JG-01：事件驱动目标触发时序（解决 TDD-1）

**问题**：goal-tick handler 在 SYSTEM_TICK:500 运行，早于 ENCOUNTER:610 和 SOUL_EVAL:625。若将事件驱动触发放在 goal-tick 中，无法读取当前 tick 的 encounter 结果和 affinity delta。

**决策**：事件驱动目标触发**不在 goal-tick 中**，而是钩入 `processSoulEvent()` 尾部（phase 625 执行时）。

**实现**：

```
processSoulEvent() 执行流（soul-engine.ts:347+）：
  L366: fallbackEvaluate → result
  L377-378: applyEvaluationResult + updateRelationshipTags
  L381-399: Phase IJ 双写（RelationshipMemory）
  ← 新增钩入点 →
  L400+: 事件驱动目标触发
    - 遍历 result.relationshipDeltas
    - 若 event.type = 'encounter' + rival 标签 + delta < -5 → assignGoal(revenge)
    - 若 affinity 升至 ≥ 40 + 无 friend 标签 → assignGoal(friendship)
    - 若 event.type = 'breakthrough-fail' → assignGoal(breakthrough)
```

**理由**：
1. 在 phase 625 运行，encounter(610) 已完成，affinity delta 已写入 state
2. 可直接获取 `result.relationshipDeltas` 中的 delta 值
3. `updateRelationshipTags()` 已执行，可检查最新的 friend/rival 标签
4. 不增加新 Handler，不改变 Pipeline 阶段数

**替代方案（已排除）**：
- 方案 A: 新 Handler 在 626 阶段 → 增加 handler 复杂度，且需从 EventBus 再取事件
- 方案 B: 下一 tick 回溯检测 → 延迟一个 tick，行为响应不及时

### ADR-JG-02：Layer 5 挂载

**决策**：在 `getEnhancedPersonalityWeights()` 现有 Layer 4（L208）之后、非负 clamp（L210）之前插入 Layer 5。

**挂载位置**：`behavior-tree.ts:208`（Layer 4 emotion 修正之后）

```typescript
// === Layer 5: 个人目标乘数（Phase J-Goal） ===
if (goals && goals.length > 0) {
  const goalMultipliers = goalManager.getLayer5Multipliers(state, d.id);
  // 或直接内联计算 — 取决于是否注入 goalManager
  for (const w of weights) {
    const m = goalMultipliers[w.behavior];
    if (m !== undefined) {
      w.weight *= m;
    }
  }
}
```

**参数传递链**：

```
disciple-tick.handler.ts:
  planIntent(disciple, deltaS, state, emotionState, goals)
                                                     ↑ 新增

behavior-tree.ts planIntent():
  getEnhancedPersonalityWeights(d, state, emotionState, goals)
                                                        ↑ 新增
```

两个函数均为**最后一个参数**添加 `goals?: PersonalGoal[]`，保持向后兼容（不变量 I5）。

`disciple-tick.handler.ts` 获取 goals 的方式：

```typescript
// disciple-tick.handler.ts:31-33
const goals = ctx.goalManager
  ? ctx.goalManager.getGoalsForDisciple(ctx.state, disciple.id)
  : [];
const emotionState = ctx.emotionMap.get(disciple.id) ?? null;
allIntents.push(...planIntent(disciple, ctx.deltaS, ctx.state, emotionState, goals));
```

### ADR-JG-03：GoalManager 注入 soul-engine

**决策**：`processSoulEvent()` 新增第 8 个可选参数 `goalManager?: GoalManager`。

**理由**：沿用现有模式 — 函数已有 7 参数（4 个 optional trailing），第 8 个 optional 不改变调用约定。

```typescript
export function processSoulEvent(
  event: SoulEvent,
  state: LiteGameState,
  logger: GameLogger,
  onSoulLog?: (msg: string) => void,
  emotionMap?: Map<string, DiscipleEmotionState>,
  relationshipMemoryManager?: RelationshipMemoryManager,
  narrativeSnippetBuilder?: NarrativeSnippetBuilder,
  goalManager?: GoalManager,  // +新增
): void {
```

**调用方更新**：`soul-event.handler.ts` 中调用 `processSoulEvent()` 时从 `ctx.goalManager` 取出传入。

### ADR-JG-04：Prompt 注入

**决策**：在 `src/ai/soul-prompt-builder.ts` 新增 `buildGoalPromptSegment()` 函数。

```typescript
/**
 * 构建目标 prompt 段落
 * 无目标时返回空字符串（不注入）
 */
export function buildGoalPromptSegment(goals: PersonalGoal[]): string;
```

输出格式（PRD §3.7）：

```
当前心愿：冲击突破（剩余约 180 个时辰）
```

多个目标时每行一条。挂载点：soul-prompt-builder 中构建弟子上下文时调用，位于已有 trait/relationship 段之后。

### goal-tick handler（SYSTEM_TICK:500, order:20）

**位置**：新建 `src/engine/handlers/goal-tick.handler.ts`

**职责**（每 tick 执行）：
1. TTL 递减：`goalManager.tickGoals(state)` → 返回已过期目标 → emit `goal-expired` + MUD 文案
2. 完成检查：`goalManager.checkCompletions(state)` → 返回已完成目标 → emit `goal-completed` + MUD 文案
3. 定期扫描：`goalManager.periodicScan(state, currentTick)` → 可能分配 seclusion/ambition → emit `goal-assigned` + MUD 文案

**排序**：`phase: SYSTEM_TICK(500), order: 20`（在 soulTickHandler 500:10 之后）

**MUD 输出**：通过 `ctx.discipleEvents.push()` 发送，级别：
- goal-assigned / goal-completed → Lv.2 涟漪级
- goal-expired → Lv.1 呼吸级

---

## S4 文件计划

### 新建文件（3 个）

| # | 文件路径 | 职责 | 行数估算 |
|---|---------|------|:-------:|
| N1 | `src/shared/data/goal-data.ts` | 乘数表 + TTL + 标签 + MUD 文案 + 扫描间隔 | ~120 |
| N2 | `src/engine/goal-manager.ts` | GoalManager 服务类（6 方法 + 守卫逻辑） | ~180 |
| N3 | `src/engine/handlers/goal-tick.handler.ts` | goal-tick Handler（TTL/完成/扫描） | ~100 |

### 修改文件（10 个）

| # | 文件路径 | 变更 |
|---|---------|------|
| M1 | `src/shared/types/personal-goal.ts` | +discipleId, +remainingTtl, ttl→non-nullable |
| M2 | `src/shared/types/game-state.ts` | LiteGameState +goals, createDefaultLiteGameState +goals:[] + version:6, 接口注释 v5→v6 |
| M3 | `src/engine/tick-pipeline.ts` | TickContext +goalManager? |
| M4 | `src/engine/idle-engine.ts` | 实例化 GoalManager + 注册 goal-tick handler |
| M5 | `src/engine/behavior-tree.ts` | getEnhancedPersonalityWeights +goals 参数 + Layer 5 块; planIntent +goals 参数 + 传递 |
| M6 | `src/engine/handlers/disciple-tick.handler.ts` | 从 ctx 取 goals 传入 planIntent |
| M7 | `src/engine/soul-engine.ts` | processSoulEvent +goalManager 参数 + 事件驱动触发钩子 |
| M8 | `src/engine/handlers/soul-event.handler.ts` | 传递 ctx.goalManager 给 processSoulEvent |
| M9 | `src/engine/save-manager.ts` | SAVE_VERSION 5→6 + migrateV5toV6 函数 |
| M10 | `src/ai/soul-prompt-builder.ts` | +buildGoalPromptSegment() + 在构建上下文时调用 |

### 验证文件（1 个）

| # | 文件路径 | 职责 |
|---|---------|------|
| V1 | `scripts/verify-phaseJ-goal.ts` | 专项验证脚本（目标分配/守卫/Layer 5/生命周期/迁移） |

---

## S5 存档迁移

### v5 → v6

```typescript
function migrateV5toV6(raw: Record<string, unknown>): void {
  // 1. 新增 goals 空数组
  if (!Array.isArray(raw['goals'])) {
    raw['goals'] = [];
  }
  // 2. 版本号升级
  raw['version'] = 6;
  console.log('[SaveManager] v5 → v6 迁移完成');
}
```

**插入位置**：`save-manager.ts` `migrateSave()` 函数中，在 v4→v5 检查之后：

```typescript
if ((raw['version'] as number) < 6) {
  migrateV5toV6(raw);
}
```

**createDefaultLiteGameState() 更新**：

```typescript
// game-state.ts:279+
goals: [],  // Phase J-Goal: 个人目标池
```

---

## S6 事件驱动触发详设

### 3 个触发器

均在 `processSoulEvent()` 尾部执行（ADR-JG-01），包裹在 `if (goalManager)` 守卫中。

#### T-EV-01: breakthrough 触发

```
触发条件：event.type === 'breakthrough-fail'
检查：
  - disciple.aura >= getRealmAuraCost(realm, subRealm) * 0.7（确认灵气接近门槛）
分配：
  goalManager.assignGoal(state, disciple.id, 'breakthrough', {
    realmTarget: disciple.realm,
    subRealmTarget: disciple.subRealm + 1,
  }, currentTick)
```

#### T-EV-02: revenge 触发

```
触发条件：event.type === 'encounter-conflict'
  （仅冲突碰面；encounter-chat/encounter-discuss 不触发）
对每个 relationshipDelta（rd）：
  - rd.delta < -5
  - 对方有 'rival' 标签（在 updateRelationshipTags 之后检查）
分配：
  goalManager.assignGoal(state, disciple.id, 'revenge', {
    targetDiscipleId: rd.targetId,
  }, currentTick)
```

#### T-EV-03: friendship 触发

```
触发条件：任意 soul-event 导致 affinity 变化
对每个 relationshipDelta（rd）：
  - rd.delta > 0（正向变化）
  - 当前 affinity ≥ 40
  - 对方无 'friend' 标签
分配：
  goalManager.assignGoal(state, disciple.id, 'friendship', {
    targetDiscipleId: rd.targetId,
  }, currentTick)
```

### 3 个守卫（在 GoalManager.assignGoal 内）

| # | 守卫 | 条件 | 动作 |
|---|------|------|------|
| G1 | 槽位已满 | `getGoalsForDisciple(id).length >= MAX_ACTIVE_GOALS` | reject（返回 null） |
| G2 | 类型重复 | 已有同类型目标 | reject（返回 null） |
| G3 | 事件抢占 | 事件驱动触发被 G1 拒绝 + 有可淘汰的定期目标 | 淘汰 remainingTtl 最小的 PERIODIC 目标，重试 |

---

## S7 任务分解

| # | 任务 | 依赖 | 估算 |
|---|------|------|:----:|
| T1 | 修改 `personal-goal.ts`（+discipleId, +remainingTtl, ttl non-nullable） | — | XS |
| T2 | 新建 `goal-data.ts`（乘数表/TTL/标签/文案/间隔） | T1 | S |
| T3 | 修改 `game-state.ts`（+goals 字段, v6 注释, createDefault） | T1 | XS |
| T4 | 修改 `save-manager.ts`（SAVE_VERSION=6, migrateV5toV6） | T3 | XS |
| T5 | 新建 `goal-manager.ts`（GoalManager 类，6 方法 + 守卫） | T1, T2 | M |
| T6 | 修改 `tick-pipeline.ts`（TickContext +goalManager?） | T5 | XS |
| T7 | 新建 `goal-tick.handler.ts`（TTL/完成/扫描 + MUD 输出） | T5, T6 | S |
| T8 | 修改 `idle-engine.ts`（实例化 GoalManager + 注册 handler） | T5, T7 | XS |
| T9 | 修改 `behavior-tree.ts`（+goals 参数, Layer 5 块） | T1 | S |
| T10 | 修改 `disciple-tick.handler.ts`（传递 goals） | T6, T9 | XS |
| T11 | 修改 `soul-engine.ts`（+goalManager 参数 + 事件驱动触发） | T5 | M |
| T12 | 修改 `soul-event.handler.ts`（传递 goalManager） | T6, T11 | XS |
| T13 | 修改 `soul-prompt-builder.ts`（+buildGoalPromptSegment） | T1, T2 | S |
| T14 | 新建 `scripts/verify-phaseJ-goal.ts`（专项验证脚本） | T1-T13 | S |
| T15 | 回归测试 + tsc --noEmit | T14 | S |

**关键路径**：T1 → T2 → T5 → T7 → T8（核心数据到运行时）
**并行路径**：T3/T4（迁移）| T9/T10（Layer 5）| T13（Prompt）可与关键路径并行

---

## S8 验证计划

### 专项验证（verify-phaseJ-goal.ts）

| # | 验证组 | 覆盖 |
|---|--------|------|
| V1 | 目标分配（事件驱动 3 触发器） | US-JG-01 AC1-3 |
| V2 | 目标分配守卫（G1/G2/G3） | US-JG-01 AC4-5, US-JG-02 AC3 |
| V3 | 定期扫描分配 | US-JG-02 AC1-2 |
| V4 | Layer 5 权重叠加（单目标/双目标/零目标） | US-JG-03 AC1-3 |
| V5 | 目标生命周期（完成/过期） | US-JG-04 AC1-3 |
| V6 | MUD 文案输出 | US-JG-05 AC1-3 |
| V7 | v5→v6 迁移 + 持久化 | US-JG-06 AC1-3 |
| V8 | Prompt 注入（有目标/无目标） | US-JG-07 AC1-2 |

### Monte Carlo 验证（TDD-2）

在 V4 中嵌入：跑 1000 次模拟，统计 5 层叠加后各行为概率分布，确保：
- 无单行为概率 > 80%
- 零目标时概率分布与 Layer 4 完全一致
- 双目标 clamp 后乘数在 [0.5, 2.0] 范围内

### 回归

```bash
npm run test:regression   # 64 组全通过
npx tsc --noEmit          # 零错误
```

---

## S9 风险评估

| # | 风险 | 概率 | 影响 | 缓解措施 |
|---|------|:----:|:----:|---------|
| R1 | Layer 5 乘数极端导致行为退化为确定性 | 低 | 高 | clamp [0.5, 2.0] + Monte Carlo V4 |
| R2 | processSoulEvent 参数过多（8 个）可读性下降 | 中 | 低 | 单独 optional trailing，不影响已有调用方。登记技术债：后续 Phase 统一重构为 options 对象 |
| R3 | 定期扫描 60 tick 间隔不易测试 | 低 | 低 | verify 脚本直接调用 periodicScan，绕过间隔 |
| R4 | revenge 目标 targetId 弟子不存在（理论上不可能，8 弟子固定） | 极低 | 低 | GoalManager 内 null check 防御 |
| R5 | goal-tick handler 与 soul-tick handler 同 phase 500 顺序依赖 | 低 | 中 | order: 20 明确在 soul-tick(10) 之后 |

---

## S10 ADR 索引

| ADR | 标题 | 决策 | 位置 |
|-----|------|------|------|
| ADR-JG-01 | 事件驱动触发时序 | 钩入 processSoulEvent L379+ 后（phase 625 内） | S3 |
| ADR-JG-02 | Layer 5 挂载 | getEnhancedPersonalityWeights +goals 参数，L208 后插入 | S3 |
| ADR-JG-03 | GoalManager 注入 soul-engine | processSoulEvent 第 8 参数 | S3 |
| ADR-JG-04 | Prompt 注入 | buildGoalPromptSegment() in soul-prompt-builder.ts | S3 |
