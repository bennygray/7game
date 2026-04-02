# Phase IJ — NPC 深度智能预研 TDD

> **版本**：v3.0 | **日期**：2026-04-01
> **Phase 类型**：预研型（设计定案 + 核心 PoC）
> **前置**：PRD v3.0 `[x] GATE 1 PASSED` — 2026-04-01
> **维护者**：/SGA

---

## §1 范围与约束

| 项目 | 说明 |
|------|------|
| 关系记忆系统 | 设计 + PoC 代码（RelationshipMemory + Prompt 关系摘要注入） |
| Narrative Snippet 系统 | 设计 + 代码（规则拼接器 + 模板降级 + AI 预生成接口） |
| L2/L6 动态切换 | 按事件等级路由 context level |
| 因果事件 / 个人目标 / T2 NPC | 仅 Interface 设计（零实现代码） |
| 存档版本 | v5 不变，PoC 用运行时内存结构 |
| Pipeline | 不新增 handler（关系事件记录嵌入现有写入点） |
| 回归 | 64/64 必须通过，零 breaking change |
| Prompt 上限 | 1024 tokens（从 512 放宽，PRD §1.6 宪法变更声明） |
| 推荐模型 | Qwen3.5-2B（降级方案 0.8B + L3 单级） |

### v3.0 核心变更（对比 v2.0）

| 维度 | v2.0 | v3.0 |
|------|------|------|
| 推荐模型 | 0.8B | **2B**（0.8B 降级） |
| 甜蜜点 | L3 单级 | **L6（决策）/ L2（日常）双级** |
| Prompt 上限 | 512 tokens | **1024 tokens** |
| Narrative Snippet | 不存在 | **新增三层降级系统** |
| 新增文件 | 5 | **6**（+narrative-snippet-builder.ts） |
| 修改文件 | 5 | **5**（同，但变更内容不同） |

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
| `src/ai/narrative-snippet-builder.ts` | AI | NarrativeSnippetBuilder（规则拼接 + 模板 + AI 预生成接口） |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/ai/soul-prompt-builder.ts` | +`buildRelationshipPromptSegment()` L2/L6 双级 + 事件等级路由 |
| `src/engine/idle-engine.ts` | 实例化 RelationshipMemoryManager + NarrativeSnippetBuilder + 双写 |
| `src/engine/dialogue-coordinator.ts` | 双写 RelationshipMemoryManager.recordDialogue() |
| `src/ai/soul-evaluator.ts` | evaluateEmotion/evaluateDecisionAndMonologue 按事件等级选 L2/L6 注入关系摘要 |
| `src/engine/soul-engine.ts` | updateRelationshipTags() 后双写 keyEvent + 触发 narrativeSnippet 更新 |

---

## §3 Interface 设计

### 3.1 关系记忆类型 (`src/shared/types/relationship-memory.ts`)

```typescript
import type { RelationshipTag } from './soul';

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
  tags: RelationshipTag[];    // friend / rival / mentor / admirer / grudge

  /** 改变关系的关键事件摘要 */
  keyEvents: KeyRelationshipEvent[];

  /** 叙事片段缓存（由 NarrativeSnippetBuilder 生成，L6 Prompt 注入用） */
  narrativeSnippet?: string;  // ≤80 字符

  /** 统计量（不注入 prompt，仅用于规则引擎） */
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

/** R-M02: 每对关系的 keyEvents 存储上限 */
export const KEY_EVENTS_SOFT_LIMIT = 10;

/** R-M03: 矛盾覆盖窗口（同类事件在此 tick 范围内替换而非追加） */
export const CONTRADICTION_TICK_WINDOW = 50;

/** v3.0: Prompt 总量上限（从 512 放宽） */
export const MAX_PROMPT_TOKENS = 1024;

/** v3.0: Narrative snippet 最大字符数 */
export const NARRATIVE_SNIPPET_MAX_CHARS = 80;

/**
 * 生成关系对的唯一��
 * A→B 和 B→A 是两个不同的 RelationshipMemory
 */
export function makePairKey(sourceId: string, targetId: string): string {
  return `${sourceId}:${targetId}`;
}

/**
 * v3.0: Context level 枚举
 * 由事件等级决定使用哪个级别（PRD R-M08）
 */
export type ContextLevel = 'L0' | 'L2' | 'L6';
```

### 3.2 因果��件 (`src/shared/types/causal-event.ts`) — 仅设计

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
  /** 优先��（同时触发时取最高） */
  priority: number;
}

/** R-C02: 冷���状态 */
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

/** R-G01: 个���目标实例 */
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
   */
  recordEncounter(sourceId: string, targetId: string, tick: number): void;
  recordDialogue(sourceId: string, targetId: string, tick: number): void;

  /**
   * 获取 A→B ��关系记忆
   * 不存在则返回 null
   */
  getMemory(sourceId: string, targetId: string): RelationshipMemory | null;

  /**
   * 从 RelationshipEdge 同步 affinity / tags
   * 每次构建摘要前调用，确保数据一致
   */
  syncFromEdge(edge: RelationshipEdge): void;

  /**
   * 构建 Prompt 用的关系摘要文本
   * 输出格式由 contextLevel 决定（L2 或 L6）
   */
  buildRelationshipSummary(
    sourceId: string,
    targetId: string,
    targetName: string,
    contextLevel: ContextLevel
  ): string | null;

  /**
   * v3.0: 更新 narrative snippet 缓存
   * 由 NarrativeSnippetBuilder 生成后写入
   */
  updateNarrativeSnippet(
    sourceId: string,
    targetId: string,
    snippet: string
  ): void;
}
```

### 4.2 核心算法

**R-M02 关键事件记录：**
```
IF |affinityDelta| >= EVENT_THRESHOLD:
  检查矛盾覆盖（同类事件 ≤50 tick 内，同类 = 同 content 前缀 或 ��� CausalRule ID）
  IF 有矛盾 → REPLACE
  ELSE → APPEND
  IF keyEvents.length > KEY_EVENTS_SOFT_LIMIT:
    淘汰 |affinityDelta| 最小的事件（同 |delta| 按 tick 升序淘汰最旧的）
  触发 NarrativeSnippetBuilder.rebuild()
```

**关系摘要构建（L2/L6 双级）：**
```
1. syncFromEdge() 同步最新 affinity/tags
2. IF contextLevel == 'L0': return null
3. 拼接好感值 + 标签
4. IF contextLevel == 'L2':
     取 |affinityDelta| 最大的 1 条事件（无事件则跳过）
5. IF contextLevel == 'L6':
     取 |affinityDelta| 降序前 3 条事件（无事件则跳过）
     + narrativeSnippet（从 memory.narrativeSnippet 读取，undefined 则省略此段）
     + 个人近况（如有，undefined 则省略）
6. 返回完整摘要文本
```

### 4.3 双写��略（ADR-IJ-03，继承 v2.0）

| 调用点 | 文件 | 旧路径 | 新路径 |
|--------|------|--------|--------|
| 关系变更 | `soul-engine.ts` | `updateRelationshipTags()` | +`recordEvent()` + 触发 snippet rebuild |
| 对话 | `dialogue-coordinator.ts` | `addShortTermMemory()` | +`recordDialogue()` |
| AI 记忆 | `idle-engine.ts:recordAIMemory()` | `addShortTermMemory()` | +`recordEvent()`（如达阈值） |
| 碰面 | `encounter-tick handler` | — | +`recordEncounter()` |

---

## §4.5 NarrativeSnippetBuilder 架构

### 4.5.1 类设计 (`src/ai/narrative-snippet-builder.ts`)

```typescript
import type { RelationshipMemory } from '../shared/types/relationship-memory';
import type { RelationshipTag } from '../shared/types/soul';

/**
 * PRD R-M07~R-M10: Narrative Snippet 三��降级构建器
 * 层级 1: AI 预生成（需 PoC 验证，接口预留）
 * 层级 2: 规则拼接（本 Phase 实现）
 * 层级 3: 模板插值（本 Phase 实现）
 */
export class NarrativeSnippetBuilder {

  /**
   * 规则拼接生成 narrative snippet（层级 2）
   * PRD R-M09 完整逻辑
   * @returns ≤80 字符的叙事段落（超限时从事件串联末尾截断）
   * 边界：keyEvents 为空时跳过事件串联，仅输出框架短语+归纳定性
   */
  buildByRules(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): string;

  /**
   * 模板插值生成 narrative snippet（层级 3 降级）
   * PRD R-M10 8 个模板
   * @returns 模板填充后的叙事段落
   */
  buildByTemplate(
    sourceName: string,
    targetName: string,
    affinity: number,
    tags: RelationshipTag[]
  ): string;

  /**
   * AI 预生成接口（层级 1，PoC 阶段）
   * IJ-11: 异步调用 AI 生成叙事摘要
   * @returns Promise<string | null> — null 表示 AI 不可用，fallback 到规则拼接
   */
  buildByAI(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): Promise<string | null>;

  /**
   * 统一入口：按三层降级策略��成 snippet
   * 1. 尝试返回已缓存的 AI 预生成结果
   * 2. 无缓存 → 规则拼接
   * 3. 规则拼接异常 → 模板插值
   */
  getSnippet(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): string;

  /**
   * 触发 AI 预生成（异步，不阻塞）
   * 在 keyEvent 记录后调用
   */
  triggerAIPregenerate(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): void;
}
```

### 4.5.1b PoC 验证结论（IJ-11 + S7 A/B）

> 原始数据：`docs/pipeline/phaseIJ-poc/walkthrough-ai-model-testing.md` §IJ-11

**IJ-11 核心发现**：AI（2B）可自主生成 NarrativeSnippet，六维通过率 92%，P95=338ms。
`buildByAI` + `triggerAIPregenerate` 接口已获验证，形成完整自循环：AI 生成叙事 → 叙事注入 prompt → 驱动 AI 决策。

**S7 A/B 测试发现——NarrativeSnippet 措辞是行为控制旋钮**：

| 变体 | 性格 | Snippet 措辞 | 行为结果 | 含义 |
|------|------|-------------|---------|------|
| E-内敛 | 内敛沉默 | "暗慕从未表白" | HIDE 100% | 保守措辞→自保行为 |
| E-温和 | 温和坚毅 | "情根深种赴汤蹈火" | FIGHT/PROTECT 100% | 激烈措辞→出手行为 |

**设计指导**：
- Snippet 措辞**不是装饰品**，而是 AI 决策的关键输入信号
- `buildByRules()` 的框架短语和归纳定性措辞需要与期望行为对齐
- 中低负面关系(-25~-35) 的残余 PROTECT bias 可通过 snippet 措辞微调消除

### 4.5.2 规则拼接数据表

**框架短语表（PRD R-M09 步骤 1）：**

```typescript
const FRAMING_PHRASES: Array<{ min: number; max: number; template: string }> = [
  { min: -100, max: -60, template: '{A}与{B}势同水火' },
  { min: -59,  max: -30, template: '{A}与{B}积怨已深' },
  { min: -29,  max: -10, template: '{A}与{B}关系不睦' },
  { min: -9,   max: 9,   template: '{A}与{B}并无深交' },
  { min: 10,   max: 29,  template: '{A}与{B}颇有好感' },
  { min: 30,   max: 59,  template: '{A}与{B}交情匪浅' },
  { min: 60,   max: 100, template: '{A}与{B}情同手足' },
];
```

**归纳定性表（PRD R-M09 步骤 3）：**

```typescript
const CONCLUSION_PHRASES: Record<string, string> = {
  rival:   '——屡次三番，此人不可信。',
  grudge:  '——其心可诛，不可不防。',
  friend:  '——患难与共，值得以命相托。',
  mentor:  '——恩重如山，当铭记于心。',
  admirer: '——仰慕之情溢于言表。',
  default: '——时日将证一切。',
};
```

**模板表（PRD R-M10，8 个）：**

```typescript
const TEMPLATES: Array<{ condition: (a: number, t: RelationshipTag[]) => boolean; template: string }> = [
  // T1-T8 按 PRD R-M10 定义
];
```

---

## §5 Prompt 注入设计

### 5.1 L2/L6 动态切换（soul-prompt-builder.ts）

```typescript
/**
 * v3.0: 根据事件等级选择 context level
 * PRD R-M08
 */
export function getContextLevel(eventSeverity: number): ContextLevel {
  if (eventSeverity >= 2) return 'L6';  // Lv.2+ 浪花/风暴/天劫
  return 'L2';                           // Lv.0-1 呼吸/涟漪
}

/**
 * v3.0: 构建关系摘要注入段（L2/L6 双级）
 */
export function buildRelationshipPromptSegment(
  summary: string | null,
  contextLevel: ContextLevel
): string;
```

### 5.2 输出格式

**L2 格式（≤ ~40 tokens）：**
```
【与李沐阳的关系】
好感：-45（死对头）
关键经历：上月因争夺破境草翻脸(-20)
```

**L6 格式（≤ ~150 tokens）：**
```
【与李沐阳的关系】
好感：-45（死对头）
关键经历：因争夺破境草翻脸(-20)；裁决中被掌门判有过(-15)；在灵兽山被其暗算(-10)
张清风与李沐阳积怨已深。此人曾因争夺破境草翻脸，又在裁决中被掌门判有���，更在灵兽山暗中算计——屡次三番，此人不可信。
个人近况：筑基突破成功，实力大增
```

### 5.3 注入位置

在 `buildSoulEvalPrompt()` 中，身份段落之后、事件描述之前插入：

```
{身份段落}

{关系摘要段（L2 或 L6）}          ← 新增

刚才发生了：{事件描述}
从以下情绪中选择...
```

### 5.4 SoulEvaluator 集成

`SoulEvaluator` 的评估方法签名变更：

```typescript
evaluateEmotion(params: {
  // ...现有参数
  relationshipMemoryManager?: RelationshipMemoryManager;
  narrativeSnippetBuilder?: NarrativeSnippetBuilder;
  targetDiscipleId?: string;
  targetDiscipleName?: string;
  eventSeverity?: number;  // v3.0: 用于 L2/L6 切换
}): Promise<EmotionResult>;
```

逻辑：
1. 有 `relationshipMemoryManager` + `targetDiscipleId` + `eventSeverity` → 调用 `getContextLevel(eventSeverity)` 选择 L2/L6
2. L6 时：先调用 `narrativeSnippetBuilder.getSnippet()` → 写入 `memory.narrativeSnippet`（确保缓存最新）
3. 调用 `buildRelationshipSummary(sourceId, targetId, targetName, contextLevel)`（L6 时从 memory.narrativeSnippet 读取已缓存的 snippet）
4. 注入 prompt
5. 无上述参数 → 行为不变

### 5.5 0.8B 降级路径

当 ai-server 检测到加载的模型为 0.8B 时：
- `getContextLevel()` 始终返回 `'L2'`（忽略事件等级）
- `buildRelationshipSummary()` 使用 L3 级别（好感+标签+3事件，无 narrative snippet）
- narrative snippet 构建器不触发

实现方式：SoulEvaluator 启动时通过 `/api/health` 查询 `modelSizeMB` 字段（ai-server.ts L455），据此推断模型规格（≤1000MB → '0.8B'，>1000MB → '2B'），缓存为 `cachedModelSize` 并据此路由。后续推理请求无需重复查询。

---

## §6 Pipeline 影响

### 不新增 Handler（继承 v2.0 ADR-IJ-04）

v3.0 同样不新增 Pipeline Handler。Narrative snippet 的规则拼接在 prompt 构建时同步执行（≤5ms），AI 预生成通过 AsyncAIBuffer 异步执行。

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
610:0  encounter-tick       ← ��写 recordEncounter()
625:0  soul-event           ← 双写 recordEvent() + triggerAIPregenerate()
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
  /** Phase IJ v3.0: 叙事片段构建器 */
  narrativeSnippetBuilder?: NarrativeSnippetBuilder;
}
```

---

## §7 迁移策略

### PoC 阶段（�� Phase）

- **不改存档 schema**，v5 不变
- RelationshipMemoryManager 数据在 `Map<string, RelationshipMemory>` 中，页面刷新即清空
- 旧 `shortTermMemory: string[]` 和 `RelationshipEdge` 持续工作
- NarrativeSnippet 缓存在 RelationshipMemory.narrativeSnippet 中，同样页面刷新清空

### 未来正式化路径

```
1. RelationshipEdge 扩展字段：keyEvents / narrativeSnippet / encounterCount / dialogueCount
2. migrateV5toV6(): 为所有 relationships 初始化新字段
3. SAVE_VERSION 升级到 6
4. 移除双写，RelationshipMemoryManager 直接操作 GameState
5. 根据 Narrative PoC 结论决定 AI 预生成是否正式化
```

---

## §8 回归影响评估

| 影响范围 | 风险 | 说明 |
|---------|:----:|------|
| 现有 13 handlers | ✅ 零影响 | 不新增/不修改任何现有 handler 逻辑 |
| RelationshipEdge 序列化 | ✅ 零影响 | 不修改接口，不增加持久化字段 |
| 64 组回归测试 | ✅ 零影响 | 新代码全部 additive，旧路径不变 |
| soul-prompt-builder | ⚠️ 低风险 | 仅在有关系摘要时插入文本，无则不变 |
| soul-evaluator | ⚠️ 低风险 | 新参数均为 optional，不传则行为不变 |
| narrative-snippet-builder | ✅ 零影响 | 纯新增文件，不影响现有代码 |

---

## §9 ADR 决策日志

### ADR-IJ-01~06（继承 v2.0，不变）

| ADR | 决策 | 状态 |
|-----|------|:----:|
| ADR-IJ-01 | RelationshipMemoryManager 作为 Engine 层独立类 | 保留 |
| ADR-IJ-02 | 运行时内存，PoC 不持久化 | 保留 |
| ADR-IJ-03 | 双写策略 | 保留 |
| ADR-IJ-04 | 不新增 Pipeline Handler | 保留 |
| ADR-IJ-05 | 不硬编码 Prompt 注入量上限 | **更新**：上限从 512→1024 |
| ADR-IJ-06 | 设计接口放 shared/types | 保留 |

### ADR-IJ-07：NarrativeSnippetBuilder 放 AI 层（v3.0 新增）

**背景**：Narrative snippet 需要文本生成能力（规则拼接 + 未来 AI 预生成）。
**决策**：创建 `src/ai/narrative-snippet-builder.ts`，归属 AI 层。
**理由**：(1) 规则拼接是"文本生成"而非"引擎逻辑"，属于 AI 层职责 (2) AI 预生成需要调用 LLM，必须在 AI 层 (3) 统一放 AI ���避免分裂
**备选**：① 放 Engine 层 → 规则拼接可以，但 AI 预生成调用违反层级约束 ② 拆两个文件 → 不必要的复杂度

### ADR-IJ-08：L2/L6 按事件等级切换（v3.0 新增）

**背景**：V4 基准测试证明 2B 在 L3 的决策正确率仅 20%，L6 达 80%。但 L6 token 开销较大，日常场景不需要。
**决策**：事件等级 Lv.0-1 用 L2，Lv.2+ 用 L6。
**理由**：(1) 与现有五级漏斗自然对齐 (2) Lv.2+ 是需要 NPC 做道德判断的场景，正是 PROTECT bias 出现的场景 (3) 切换逻辑极简（一个 if），不增加复杂度
**备选**：① 按 AI 调用类型切换 → 情绪评估也可能需要叙事上下文 ② 全部 L6 → 日常��景浪费 token

### ADR-IJ-09：Prompt 上限 512→1024（v3.0 新增）

**背景**：L6 含 narrative snippet + 个人近况预估需 ~400-450 tokens，���上基础 prompt ~200 tokens，总量 ~650，超过 512。
**决策**：放宽到 1024 tokens。
**理由**：(1) 2B 模型 32K 上下文窗口，1024 仅占 3% (2) V4 测试中 2B 在 ~450 token prompt 下表现最佳 (3) 预留未来扩展空间
**宪法变更**：需同步更新 CLAUDE.md L184（PRD §1.6 宪法变更声明）

---

## §10 实施计划

### 第一批（类型定义，可并行）

| # | 任务 | 文件 | 复杂度 |
|---|------|------|:------:|
| T1 | RelationshipMemory / KeyRelationshipEvent / 常量 / ContextLevel | `shared/types/relationship-memory.ts` | S |
| T2 | 设计接口（CausalRule / PersonalGoal / T2NpcProfile） | `shared/types/causal-event.ts` + `personal-goal.ts` + `t2-npc.ts` | S |

### 第二批（核心逻辑）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T3 | RelationshipMemoryManager 类 | `engine/relationship-memory-manager.ts` | T1 |
| T4 | NarrativeSnippetBuilder（规则拼接 + 模板） | `ai/narrative-snippet-builder.ts` | T1 |

### 第三批（集成）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T5 | TickContext 扩展 | `engine/tick-pipeline.ts` | T3, T4 |
| T6 | idle-engine 实例化 + 注册 + 双写 | `engine/idle-engine.ts` | T3, T4, T5 |
| T7 | dialogue-coordinator 双写 | `engine/dialogue-coordinator.ts` | T3 |
| T8 | soul-engine 双写 + snippet 触发 | `engine/soul-engine.ts` | T3, T4 |
| T9 | buildRelationshipPromptSegment() L2/L6 | `ai/soul-prompt-builder.ts` | T1, T4 |
| T10 | SoulEvaluator 关系摘要注入 | `ai/soul-evaluator.ts` | T3, T4, T9 |

### 第四批（验证 + 收尾）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T11 | debug 命令 `relationships <弟子名>` | `ui/command-handler.ts` | T3 |
| T12 | 回归测试 + 关系记忆专项测试 + narrative snippet 测试 | `scripts/` | T1~T10 |
| T13 | 更新 arch/ 文档 | `docs/design/arch/` | T5 |
| T14 | 宪��文档更新（CLAUDE.md + MASTER-PRD） | `CLAUDE.md`, `docs/project/MASTER-PRD.md` | GATE 2 通过后 |

### 第五批（PoC，可选）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T15 | Narrative Snippet AI 预生成 PoC | `docs/pipeline/phaseIJ-poc/scripts/` | T4, T6 |

---

## GATE 2 签章

```
## SGA Signoff

- [x] Interface 设计完整（所有新字段有 Owner）
- [x] 迁移策略完整（PoC 不迁移，正式化路径已规划）
- [x] Pipeline 方案确认（不新增 handler，双写嵌入现有写入点）
- [x] 依赖矩阵已规划（实施时更新 dependencies.md）
- [x] Party Review 无 BLOCK 项（review-g2-v3.md: 0 BLOCK / 2 WARN 已修复）
- [x] 技术债务已识别（双写临时债务 + narrative snippet AI 预生成待 PoC）
- [x] 宪法变更声明已确认（PRD §1.6，T14 实施）

签章：[x] GATE 2 PASSED — 2026-04-01
```

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-31 | v1.0 | 初始创建（基于个人 MemoryEntry 模型） |
| 2026-03-31 | v2.0 | 重大重写：核心数据从 MemoryEntry 改为 RelationshipMemory |
| 2026-04-01 | **v3.0** | **V4 基准测试驱动升级**：新增 NarrativeSnippetBuilder（§4.5）；soul-prompt-builder 重写为 L2/L6 双级（§5）；SoulEvaluator 增加事件等级路由（§5.4）；新增 0.8B 降级路径（§5.5）；新增 ADR-IJ-07/08/09；实施计划新增 T4/T14/T15；常量 MAX_PROMPT_TOKENS=1024 |
| 2026-04-02 | v3.1 | **PoC 结论回写**：+§4.5.1b IJ-11 AI 自生成验证 + S7 A/B "snippet 措辞=行为旋钮"发现 |
