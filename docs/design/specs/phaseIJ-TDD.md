# Phase IJ — NPC 深度智能预研 TDD

> **版本**：v2.0 | **日期**：2026-03-31
> **Phase 类型**：预研型（设计定案 + 核心 PoC）
> **前置**：PRD v2.0 `[x] GATE 1 PASSED` — 2026-03-31
> **维护者**：/SGA

---

## §1 范围与约束

| 项目 | 说明 |
|------|------|
| 关系记忆系统 | 设计 + PoC 代码（RelationshipMemory + Prompt 关系摘要注入） |
| 因果事件 / 个人目标 / T2 NPC | 仅 Interface 设计（零实现代码） |
| 存档版本 | v5 不变，PoC 用运行时内存结构 |
| Pipeline | 不新增 handler（关系事件记录嵌入现有写入点） |
| 回归 | 64/64 必须通过，零 breaking change |
| Prompt 注入量 | 不硬编码上限，由 Phase IJ-PoC 实验确定甜蜜点 |

### v2.0 核心变更（对比 v1.0）

| 维度 | v1.0（已废弃） | v2.0 |
|------|---------------|------|
| 核心数据结构 | 个人 MemoryEntry[] 按弟子 ID 索引 | RelationshipMemory 按 A↔B pairKey 索引 |
| Prompt 注入 | 个人记忆三层（[永]/[近]/[刻]）全量注入 | A↔B 关系摘要（好感+标签+关键事件） |
| 注入时机 | 所有 AI 调用 | 仅当 A 与 B 发生交互时注入 A→B 摘要 |
| 容量策略 | 20 条硬限 + 150 token 硬限 | 不硬限制，PoC 实验确定 |
| Pipeline | 新增 memory-tick handler (505:0) | 不新增 handler，记录嵌入现有写入点 |
| MemoryManager | 个人记忆管理（记录/淘汰/TTL/矛盾） | 关系记忆管理（记录/查询/摘要构建） |

---

## §2 文件变更清单

### 新增文件

| 文件 | 层级 | 用途 |
|------|------|------|
| `src/shared/types/relationship-memory.ts` | Data | RelationshipMemory / KeyRelationshipEvent / 常量 |
| `src/shared/types/causal-event.ts` | Data | CausalRule / CausalTriggerType（仅设计） |
| `src/shared/types/personal-goal.ts` | Data | PersonalGoal / GoalType（仅设计） |
| `src/shared/types/t2-npc.ts` | Data | T2NpcProfile（仅设计） |
| `src/engine/relationship-memory-manager.ts` | Engine | RelationshipMemoryManager 类 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/ai/soul-prompt-builder.ts` | +`buildRelationshipPromptSegment()` + `buildSoulEvalPrompt()` 注入关系摘要 |
| `src/engine/idle-engine.ts` | 实例化 RelationshipMemoryManager + `recordAIMemory()` 双写关系事件 |
| `src/engine/dialogue-coordinator.ts` | 双写 RelationshipMemoryManager.recordEvent() |
| `src/ai/soul-evaluator.ts` | evaluateEmotion/evaluateDecisionAndMonologue 注入关系摘要段 |
| `src/engine/soul-engine.ts` | updateRelationshipTags() 后双写 keyEvent |

---

## §3 Interface 设计

### 3.1 关系记忆类型 (`src/shared/types/relationship-memory.ts`)

```typescript
import type { RelationshipTag } from './game-state';

/**
 * R-M01: 扩展现有 RelationshipEdge，增加关系记忆
 * 按 A↔B 配对索引（pairKey = `${sourceId}:${targetId}`）
 */
export interface RelationshipMemory {
  /** A→B 方向（与 RelationshipEdge 一致） */
  sourceId: string;
  targetId: string;

  /** 已有数据（从 RelationshipEdge 实时读取，此处为缓存引用） */
  affinity: number;           // 好感 [-100, +100]
  tags: RelationshipTag[];    // friend / rival / ...

  /** 新增：改变关系的关键事件摘要 */
  keyEvents: KeyRelationshipEvent[];

  /** 新增：统计量（不注入 prompt，仅用于规则引擎） */
  encounterCount: number;     // 碰面次数
  lastEncounterTick: number;  // 上次碰面 tick
  dialogueCount: number;      // 对话次数
}

/**
 * R-M02: 记录改变关系的重大事件
 * 仅当 |affinityDelta| >= EVENT_THRESHOLD 时记录
 */
export interface KeyRelationshipEvent {
  /** 摘要文本（≤30 字符） */
  content: string;
  /** 发生时的游戏 tick */
  tick: number;
  /** 这次事件带来的好感变化 */
  affinityDelta: number;
}

/** R-M02: 关键事件记录阈值 */
export const EVENT_THRESHOLD = 5;

/** R-M02: 每对关系的 keyEvents 存储上限（防止无限增长，溢出淘汰 |delta| 最小的） */
export const KEY_EVENTS_SOFT_LIMIT = 10;

/** R-M03: 矛盾覆盖窗口（同类事件在此 tick 范围内替换而非追加） */
export const CONTRADICTION_TICK_WINDOW = 50;

/**
 * 生成关系对的唯一键
 * 注意：A→B 和 B→A 是两个不同的 RelationshipMemory
 */
export function makePairKey(sourceId: string, targetId: string): string {
  return `${sourceId}:${targetId}`;
}
```

### 3.2 因果事件 (`src/shared/types/causal-event.ts`) — 仅设计

```typescript
/** R-C01: 因果触发类型 */
export type CausalTriggerType =
  | 'affinity-threshold'    // 好感度达标
  | 'moral-threshold'       // 道德偏移达标
  | 'relationship-tag'      // 特定标签（rival/friend）
  | 'consecutive-failure'   // 连续失败
  | 'ethos-conflict'        // 道风冲突
  | 'goal-driven';          // 目标驱动

/** R-C01: 因果触发规则 */
export interface CausalRule {
  id: string;
  name: string;
  triggerType: CausalTriggerType;
  /** 触发条件参数 */
  condition: Record<string, unknown>;
  /** 产生的事件类型 */
  resultEventType: string;
  /** 事件等级 */
  resultSeverity: number;
  /** R-C02: 冷却（ticks） */
  cooldownTicks: number;
  /** 优先级（同时触发时取最高） */
  priority: number;
}

/** R-C02: 冷却状态 */
export interface CausalCooldownState {
  ruleId: string;
  disciplePairKey: string;
  lastFireTick: number;
}
```

### 3.3 个人目标 (`src/shared/types/personal-goal.ts`) — 仅设计

```typescript
/** R-G01: 目标类型 */
export type GoalType =
  | 'breakthrough'
  | 'revenge'
  | 'seclusion'
  | 'friendship'
  | 'ambition';

/** R-G01: 个人目标实例 */
export interface PersonalGoal {
  id: string;
  type: GoalType;
  /** 目标参数（目标弟子 ID / 境界等级等） */
  target: Record<string, unknown>;
  /** 分配时的 tick */
  assignedAtTick: number;
  /** TTL（ticks），null=无限 */
  ttl: number | null;
  /** R-G02: 行为偏移乘数（Layer 5，cap ×2.0） */
  behaviorMultipliers: Record<string, number>;
}

/** R-G02: 最大同时活跃目标数 */
export const MAX_ACTIVE_GOALS = 2;
/** R-G02: 行为乘数上限 */
export const GOAL_MULTIPLIER_CAP = 2.0;
```

### 3.4 T2 NPC (`src/shared/types/t2-npc.ts`) — 仅设计

```typescript
/** R-T01: T2 原型 */
export type T2Archetype =
  | 'scattered-monk'
  | 'merchant'
  | 'beast'
  | 'rival-sect'
  | 'hermit';

/** R-T01: T2 幕后 NPC 档案 */
export interface T2NpcProfile {
  id: string;
  name: string;
  archetype: T2Archetype;
  /** 威胁等级 1-3 */
  threat: 1 | 2 | 3;
  /** 对宗门态度 [-100, +100] */
  disposition: number;
  /** 距下次行动的 tick */
  cooldown: number;
  /** 当前位置（null=不在宗门范围） */
  zone: string | null;
}

/** R-T02: 行为循环间隔 */
export const T2_BEHAVIOR_INTERVAL = 60;
```

---

## §4 RelationshipMemoryManager 架构

### 4.1 类设计 (`src/engine/relationship-memory-manager.ts`)

```typescript
import type { RelationshipMemory, KeyRelationshipEvent } from '../shared/types/relationship-memory';
import type { RelationshipEdge } from '../shared/types/game-state';

export class RelationshipMemoryManager {
  /**
   * 运行时内存存储（不持久化）
   * key = `${sourceId}:${targetId}`
   */
  private memories: Map<string, RelationshipMemory> = new Map();

  /**
   * 记录关键事件（含矛盾覆盖）
   * 仅当 |affinityDelta| >= EVENT_THRESHOLD 时调用
   */
  recordEvent(
    sourceId: string,
    targetId: string,
    event: KeyRelationshipEvent
  ): void;

  /**
   * 更新统计量（碰面/对话计数）
   * 每次 A↔B 交互时调用，不产生 keyEvent
   */
  recordEncounter(sourceId: string, targetId: string, tick: number): void;
  recordDialogue(sourceId: string, targetId: string, tick: number): void;

  /**
   * 获取 A→B 的关系记忆
   * 如果不存在，返回基于 RelationshipEdge 的初始值
   */
  getMemory(sourceId: string, targetId: string): RelationshipMemory | null;

  /**
   * 从 RelationshipEdge 同步 affinity / tags
   * 每次构建摘要前调用，确保数据一致
   */
  syncFromEdge(edge: RelationshipEdge): void;

  /**
   * 构建 Prompt 用的关系摘要文本
   * 输出格式：
   *   【与{targetName}的关系】
   *   好感：{affinity}（{tag}）
   *   关键经历：{event1}({delta})；{event2}({delta})；...
   */
  buildRelationshipSummary(
    sourceId: string,
    targetId: string,
    targetName: string
  ): string | null;
}
```

### 4.2 核心算法

**R-M02 关键事件记录：**
```
IF |affinityDelta| >= EVENT_THRESHOLD:
  检查矛盾覆盖（同类事件 ≤50 tick 内）
  IF 有矛盾 → REPLACE
  ELSE → APPEND
  IF keyEvents.length > KEY_EVENTS_SOFT_LIMIT:
    淘汰 |affinityDelta| 最小的事件
```

**R-M03 矛盾覆盖：**
```
IF 已有事件 WHERE |tick差| ≤ CONTRADICTION_TICK_WINDOW:
  REPLACE 旧事件 WITH 新事件
ELSE:
  APPEND 新事件
```

**关系摘要构建：**
```
1. syncFromEdge() 同步最新 affinity/tags
2. 拼接好感值 + 标签
3. keyEvents 按 |affinityDelta| 降序排列
4. 每条事件格式："{content}({delta})"，分号连接
5. 返回完整摘要文本
```

### 4.3 双写策略（ADR-IJ-03）

PoC 阶段所有写入点同时调用：
1. 旧路径（`addShortTermMemory()` / `updateRelationshipTags()` 等）— 保持不变
2. 新路径（`relationshipMemoryManager.recordEvent()` / `.recordEncounter()` 等）— 运行时，不持久化

| 调用点 | 文件 | 旧路径 | 新路径 |
|--------|------|--------|--------|
| 关系变更 | `soul-engine.ts` | `updateRelationshipTags()` | +`recordEvent()` |
| 对话 | `dialogue-coordinator.ts` | `addShortTermMemory()` | +`recordDialogue()` |
| AI 记忆 | `idle-engine.ts:recordAIMemory()` | `addShortTermMemory()` | +`recordEvent()`（如达阈值） |
| 碰面 | `encounter-tick handler` | — | +`recordEncounter()` |

---

## §5 Prompt 注入设计

### 5.1 新增函数 (`soul-prompt-builder.ts`)

```typescript
/**
 * 构建关系摘要注入段
 * @param summary - RelationshipMemoryManager.buildRelationshipSummary() 的输出
 * @returns 可直接拼入 prompt 的关系摘要文本，null 时不注入
 */
export function buildRelationshipPromptSegment(
  summary: string | null
): string;
```

### 5.2 输出格式

**标准格式（L1-L3 层级，PoC 确定后生产使用）：**
```
【与李沐阳的关系】
好感：-45（死对头）
关键经历：因争夺破境草翻脸(-20)；裁决中被掌门判有过(-15)；在灵兽山被其暗算(-10)
```

**扩展格式（L4+ 层级，PoC 验证后可选）：**
```
个人经历：筑基突破成功
【与李沐阳的关系】
好感：-45（死对头）
关键经历：因争夺破境草翻脸(-20)；裁决中被掌门判有过(-15)；在灵兽山被其暗算(-10)
【间接关系】你的好友王灵均也与李沐阳不合（好感：-30）
```

### 5.3 注入位置

在 `buildSoulEvalPrompt()` 中，身份段落之后、事件描述之前插入：

```
{身份段落}

{关系摘要段}          ← 新增

刚才发生了：{事件描述}
从以下情绪中选择...
```

### 5.4 SoulEvaluator 集成

`SoulEvaluator` 的评估方法增加可选 `relationshipMemoryManager` 参数：
- 有 + 当前有交互对象 → 调用 `buildRelationshipSummary()` + `buildRelationshipPromptSegment()` 注入
- 无或无交互对象 → 行为不变（无关系摘要注入）

### 5.5 Token 预估（非硬限）

| 层级 | 预估新增 tokens | 总 prompt tokens |
|:----:|:--------------:|:----------------:|
| L0 | 0 | ~200 |
| L1（好感+标签） | ~20 | ~220 |
| L2（+1 事件） | ~40 | ~240 |
| L3（+3 事件） | ~80 | ~280 |
| L4（+个人经历） | ~100 | ~300 |
| L5（+间接关系） | ~130 | ~330 |

> 具体注入量的最优值由 Phase IJ-PoC 多层级实验确定，此处仅为预估。

---

## §6 Pipeline 影响

### 不新增 Handler

v2.0 不再需要独立的 memory-tick handler（v1.0 的 505:0），原因：
- 关系记忆没有 TTL 衰减需求（keyEvents 是历史事实，不会过期）
- 统计量（encounterCount 等）在交互时同步更新
- 溢出淘汰在 recordEvent() 内即时执行

### 现有 Pipeline 序列不变（13 handlers）

```
100:0  boost-countdown
200:0  breakthrough-aid
200:10 auto-breakthrough
300:0  core-production
500:0  farm-tick
500:10 soul-tick
600:0  disciple-tick
605:0  world-event-tick
610:0  encounter-tick       ← 双写 recordEncounter()
625:0  soul-event           ← 双写 recordEvent()
625:5  ai-result-apply
650:0  dialogue-tick        ← 双写 recordDialogue()
700:0  cultivate-boost
```

### TickContext 扩展

```typescript
export interface TickContext {
  // ... 现有字段 ...
  /** Phase IJ PoC: 关系记忆管理器（运行时，不持久化） */
  relationshipMemoryManager?: RelationshipMemoryManager;
}
```

---

## §7 迁移策略

### PoC 阶段（本 Phase）

- **不改存档 schema**，v5 不变
- RelationshipMemoryManager 数据在 `Map<string, RelationshipMemory>` 中，页面刷新即清空
- 旧 `shortTermMemory: string[]` 和 `RelationshipEdge` 持续工作
- 新的 keyEvents 和统计量仅在运行时可用

### 未来正式化路径

```
1. RelationshipEdge 扩展字段：keyEvents / encounterCount / dialogueCount
2. migrateV5toV6(): 为所有 relationships 初始化新字段
3. SAVE_VERSION 升级到 6
4. 移除双写，RelationshipMemoryManager 直接操作 GameState
5. 根据 PoC 结论决定是否也正式化个人记忆系统
```

---

## §8 回归影响评估

| 影响范围 | 风险 | 说明 |
|---------|:----:|------|
| 现有 13 handlers | ✅ 零影响 | 不新增/不修改任何现有 handler 逻辑 |
| RelationshipEdge 序列化 | ✅ 零影响 | 不修改接口，不增加持久化字段 |
| 64 组回归测试 | ✅ 零影响 | 新代码全部 additive，旧路径不变 |
| soul-prompt-builder | ⚠️ 低风险 | 仅在有关系摘要时插入文本，无则不变 |
| dialogue-coordinator | ⚠️ 低风险 | 追加双写调用，不影响原有逻辑 |
| soul-engine | ⚠️ 低风险 | updateRelationshipTags() 后追加双写 |

---

## §9 ADR 决策日志

### ADR-IJ-01：RelationshipMemoryManager 作为 Engine 层独立类

**背景**：关系记忆逻辑（事件记录/摘要构建/矛盾覆盖）需被多个调用点使用。
**决策**：创建 `RelationshipMemoryManager` 类在 `engine/relationship-memory-manager.ts`，由 IdleEngine 实例化，通过 TickContext 注入。
**理由**：与 AsyncAIBuffer 模式一致。类封装便于独立测试。按 pairKey 索引的 Map 结构天然匹配关系对模型。
**备选**：① 直接扩展 RelationshipEdge → 需改存档 schema ② 静态函数 → 需模块级状态

### ADR-IJ-02：运行时内存，PoC 不持久化

**背景**：PRD 明确不做存档迁移。
**决策**：RelationshipMemoryManager 持有 `Map<string, RelationshipMemory>`，页面刷新即清空。
**理由**：零回归风险，零存档影响。PoC 阶段只需在活跃会话中验证关系摘要对 AI 的影响。
**代价**：页面刷新后关系记忆丢失。可接受。

### ADR-IJ-03：双写策略

**背景**：多个调用点当前已有关系/对话写入逻辑。
**决策**：每个调用点同时保留旧路径 + 新增 RelationshipMemoryManager 调用。
**理由**：旧路径不变 → 零回归。新路径并行 → 可评估。易 grep 移除。

### ADR-IJ-04：不新增 Pipeline Handler（废弃 v1.0 的 505:0）

**背景**：v1.0 设计了 memory-tick handler 处理 TTL 衰减。
**决策**：v2.0 不再需要独立 handler。关系事件是历史事实无需衰减，统计量在交互时即时更新，溢出淘汰在 recordEvent() 内执行。
**理由**：减少 Pipeline 复杂度。关系记忆的写入天然跟随交互事件发生。

### ADR-IJ-05：不硬编码 Prompt 注入量上限（废弃 v1.0 的 150 token 限制）

**背景**：v1.0 拍脑袋定了 150 token 预算。用户反馈：本地模型 token 代价低，瓶颈是 0.8B 理解力上限，应由 PoC 实验确定。
**决策**：代码中不硬编码注入量上限。总 prompt 仍遵守 512 token 上限（I1），但关系摘要在其中占多少比例由 PoC L0-L6 实验结论决定。
**理由**：避免过早优化。实验数据比直觉更可靠。

### ADR-IJ-06：设计接口放 shared/types

**背景**：因果/目标/T2 仅设计，无实现代码。
**决策**：接口放最终位置 `src/shared/types/`，doc comment 标注"Phase IJ 设计，未消费"。
**理由**：未来实施可直接 import，零文件移动。零运行时开销。

---

## §10 Party Review Gate

### R4 项目经理

| 维度 | 评分 | 评语 |
|------|:----:|------|
| D1 工作量 | 8/10 | 5 新文件 + 5 修改文件，PoC 级别合理 |
| D2 依赖链 | 9/10 | 零外部依赖，仅内部模块扩展 |
| D3 进度风险 | 9/10 | 双写策略 + 不新增 handler = 低回归风险 |
| D4 文档对齐 | 9/10 | v2.0 对齐 PRD 关系记忆模型 |
| D5 技术债 | 8/10 | 双写本身是临时债务，promotion 路径清晰 |

**BLOCK**: 无

### R5 偏执架构师

| 维度 | 评分 | 评语 |
|------|:----:|------|
| D1 耦合度 | 9/10 | RelationshipMemoryManager 通过 TickContext 注入，不增加直接耦合 |
| D2 性能 | 9/10 | 8×8=64 对关系 Map，摘要构建 O(events)，可忽略 |
| D3 Pipeline 一致性 | 10/10 | 不新增 handler，零 Pipeline 影响 |
| D4 迁移安全 | 10/10 | 不改存档，零迁移风险 |
| D5 数据一致性 | 8/10 | WARN: affinity/tags 需从 RelationshipEdge 同步，syncFromEdge 调用时机需明确 |

**BLOCK**: 无
**WARN**: syncFromEdge 调用时机

### R6 找茬QA

| 维度 | 评分 | 评语 |
|------|:----:|------|
| D1 测试覆盖 | 8/10 | 事件记录/矛盾覆盖/摘要构建/Prompt 注入 4 类测试场景 |
| D2 边界条件 | 8/10 | WARN: keyEvents 溢出淘汰后仍可能有多条同等 |delta| 的事件，需明确 tie-breaking 规则 |
| D3 回归安全 | 9/10 | 双写 + 不改接口 + 不改存档 = 回归安全 |
| D4 错误处理 | 8/10 | WARN: 无对应 RelationshipEdge 时 getMemory() 行为需明确 |
| D5 可观测性 | 8/10 | WARN: 需 debug 命令查看关系记忆（`relationships <弟子名>`） |

**BLOCK**: 无
**WARN**: tie-breaking / 无 edge 时行为 / debug 命令

### Review 汇总

| 级别 | 数量 | 详情 |
|------|:----:|------|
| BLOCK | 0 | — |
| WARN | 4 | syncFromEdge 时机 / tie-breaking / 无 edge 行为 / debug 命令 |

**WARN 处理**：
1. syncFromEdge → 在 buildRelationshipSummary() 内自动调用（每次构建摘要前同步）
2. tie-breaking → 同等 |delta| 时按 tick 升序淘汰最旧的
3. 无对应 RelationshipEdge → getMemory() 返回 null，buildRelationshipSummary() 返回 null
4. debug 命令 → SGE 实施 scope 添加 `relationships <弟子名>` 命令（T10）

---

## §11 实施计划

### 第一批（类型定义，可并行）

| # | 任务 | 文件 | 复杂度 |
|---|------|------|:------:|
| T1 | RelationshipMemory / KeyRelationshipEvent / 常量 | `shared/types/relationship-memory.ts` | S |
| T2 | 设计接口（CausalRule / PersonalGoal / T2NpcProfile） | `shared/types/causal-event.ts` + `personal-goal.ts` + `t2-npc.ts` | S |

### 第二批（核心逻辑）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T3 | RelationshipMemoryManager 类 | `engine/relationship-memory-manager.ts` | T1 |

### 第三批（集成）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T4 | TickContext 扩展 | `engine/tick-pipeline.ts` | T3 |
| T5 | idle-engine 实例化 + 注册 + 双写 | `engine/idle-engine.ts` | T3, T4 |
| T6 | dialogue-coordinator 双写 | `engine/dialogue-coordinator.ts` | T3 |
| T7 | soul-engine 双写 | `engine/soul-engine.ts` | T3 |
| T8 | buildRelationshipPromptSegment() | `ai/soul-prompt-builder.ts` | T1 |
| T9 | SoulEvaluator 关系摘要注入 | `ai/soul-evaluator.ts` | T3, T8 |

### 第四批（验证 + 收尾）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T10 | debug 命令 `relationships <弟子名>` | `ui/command-handler.ts` | T3 |
| T11 | 回归测试 + 关系记忆专项测试 | `scripts/` | T1~T9 |
| T12 | 更新 arch/ 文档 | `docs/design/arch/` | T4 |

---

## GATE 2 签章

```
## SGA Signoff

- [x] Interface 设计完整（RelationshipMemory / KeyRelationshipEvent 有 Owner）
- [x] 迁移策略完整（PoC 不迁移，正式化路径已规划）
- [x] Pipeline 方案确认（不新增 handler，双写嵌入现有写入点）
- [x] 依赖矩阵已规划（实施时更新 dependencies.md）
- [x] Party Review 无 BLOCK 项
- [x] 技术债务已识别（双写临时债务，promotion 时清偿）

签章：[x] GATE 2 PASSED — 2026-03-31
```

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-31 | v1.0 | 初始创建（基于个人 MemoryEntry 模型） |
| 2026-03-31 | **v2.0** | 重大重写：核心数据从 MemoryEntry 改为 RelationshipMemory；MemoryManager 改为 RelationshipMemoryManager；Prompt 注入从个人三层改为关系摘要；废弃 memory-tick handler 和 150 token 硬限；更新 ADR / Review / 实施计划 |
