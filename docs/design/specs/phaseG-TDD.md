# Phase G — AI 觉醒 TDD（技术设计文档）

> **Phase**: G (AI 觉醒) | **Skill**: /SGA (Gate 2)
> **PRD**: [`features/phaseG-PRD.md`](../../features/phaseG-PRD.md) — `[x] GATE 1 PASSED` 2026-03-30
> **架构参考**: [`MASTER-ARCHITECTURE.md`](../MASTER-ARCHITECTURE.md)
> **存档版本**: v5 → **v5 不变**（I6 零存档迁移）

---

## Step 1：全局对齐 + Invariant 验证

### 1.1 分层归属

| 新文件 | 层级 | 理由 |
|--------|:----:|------|
| `src/engine/async-ai-buffer.ts` | ② Engine | 异步请求队列，TickContext 扩展组件 |
| `src/engine/handlers/ai-result-apply.handler.ts` | ② Engine | Pipeline Handler：AI 结果异步应用 |
| `src/engine/action-executor.ts` | ② Engine | AI 决策→GameState 效果中介（维护 I1） |
| `src/ai/soul-evaluator.ts` | ③ AI | 中央 AI 评估服务，包装所有调用模式 |
| `src/ai/few-shot-examples.ts` | ③ AI | 按道德阵营的 few-shot 示例库 |
| `src/ai/action-pool-builder.ts` | ③ AI | 行为动作候选池构建器（类比 emotion-pool） |

| 修改文件 | 层级 | 变更范围 |
|----------|:----:|---------|
| `src/engine/tick-pipeline.ts` | ② Engine | TickContext +asyncAIBuffer 字段 |
| `src/engine/idle-engine.ts` | ② Engine | 实例化 buffer + 注册 handler + 注入 context |
| `src/engine/handlers/soul-event.handler.ts` | ② Engine | 按 severity 路由 AI 调用 |
| `src/engine/soul-engine.ts` | ② Engine | 导出 fallbackEvaluate 供 handler 引用 |
| `src/ai/soul-prompt-builder.ts` | ③ AI | +SectContext +describeEthos +describeMoral |
| `src/main.ts` | ④ Presentation | SoulEvaluator 初始化 + auto-connect |

### 1.2 Invariant 对照验证

| PRD Invariant | 架构实现 | 冲突？ |
|:---|:---|:---:|
| I1 AI 不直接写 GameState | soul-engine 中介 + action-executor 中介，AI 结果经 applyEvaluationResult 校验后写入 | ✅ 无冲突 |
| I2 AI 不阻塞 Tick | AsyncAIBuffer fire-and-forget，fallback 同步执行在当前 tick，AI 结果 deferred 到下一 tick | ✅ 无冲突 |
| I3 AI 离线 fallback | soul-event.handler 检查 `evaluator?.canCall()`，不满足则仅 fallback；evaluateDecision 失败抛异常，catch 后 fallback 保留 | ✅ 无冲突 |
| I4 delta 硬上限 [-5,+5] | ai-result-apply.handler 中 correctionDelta 经 clampDelta 裁剪 | ✅ 无冲突 |
| I5 候选池硬约束 | json_schema `enum` 字段限制情绪/动作码在候选池内（llama.cpp GBNF 硬件级约束） | ✅ 无冲突 |
| I6 零存档迁移 | 无新 GameState 持久化字段，AsyncAIBuffer/emotionMap 均为运行时状态 | ✅ 无冲突 |

### 1.3 现有架构冲突检查

| 检查点 | 结果 |
|--------|------|
| X-1 禁止 UI 层修改 GameState | ✅ main.ts 仅初始化 SoulEvaluator，不写 state |
| X-5 禁止硬编码 prompt | ✅ 所有 prompt 在 `ai/soul-prompt-builder.ts`，few-shot 在 `ai/few-shot-examples.ts` |
| X-6 修改 Pipeline 必须更新文档 | ✅ 新增 Handler 需同步更新 `arch/pipeline.md` |
| GameState 多写者 | ✅ 无新字段，ai-result-apply 通过已有 applyEvaluationResult 写入（Owner=soul-engine） |

---

## Step 2：Interface 设计 + 数据变更 + 存档迁移策略

### 2.1 新增类型/接口

#### `src/engine/async-ai-buffer.ts`

```typescript
/** AI 请求的 fallback 快照 */
export interface FallbackSnapshot {
  result: SoulEvaluationResult;  // fallback 产出的评估结果
  discipleId: string;             // 弟子 ID
  timestamp: number;              // 事件时间戳（TTL 基准）
}

/** 已完成的 AI 结果条目 */
export interface CompletedAIResult {
  key: string;                     // 去重 key: `${timestamp}:${discipleId}`
  aiResult: SoulEvaluationResult;  // AI 评估结果
  fallbackSnapshot: FallbackSnapshot;
  completedAt: number;             // 完成时间戳
}

/** AsyncAIBuffer — 异步 AI 请求缓冲区 */
export class AsyncAIBuffer {
  submit(key: string, aiPromise: Promise<SoulEvaluationResult>, fallbackSnapshot: FallbackSnapshot): void;
  drain(): CompletedAIResult[];
  get pendingCount(): number;
  get completedCount(): number;
}
```

**设计常量**：
| 常量 | 值 | PRD 来源 |
|------|---|---------|
| TTL_MS | 10,000 | PRD §3.3 |
| MAX_PENDING | 50 | PRD §3.3 |

#### `src/ai/soul-evaluator.ts`

```typescript
export class SoulEvaluator {
  constructor(baseUrl?: string);            // 默认 'http://127.0.0.1:8080'
  isAvailable(): boolean;
  tryConnect(): Promise<boolean>;           // 检查 /v1/models 端点
  canCall(): boolean;                       // connected + 间隔 >= MIN_CALL_INTERVAL_MS

  evaluateEmotion(event, subject, role, state): Promise<SoulEvaluationResult>;
  evaluateMonologue(event, subject, role, emotion, state): Promise<{ innerThought: string }>;
  evaluateDecisionAndMonologue(event, subject, role, state): Promise<SoulEvaluationResult & { actionCode?: string }>;
}
```

**设计常量**：
| 常量 | 值 | PRD 来源 |
|------|---|---------|
| MIN_CALL_INTERVAL_MS | 30,000 | PRD §3.4 |
| Call1 timeout | 800ms | PRD §3.4 |
| Call2 timeout | 700ms | PRD §3.4 |
| evaluateEmotion timeout | 5,000ms | PRD §3.3 |
| temperature | 0.6 | poc-2e 验证 |

#### `src/ai/action-pool-builder.ts`

```typescript
export interface ActionOption {
  code: string;                              // 动作码（GBNF enum 约束）
  label: string;                             // 中文标签
  moralAlign: 'good' | 'evil' | 'neutral';  // G3: 道德倾向
}

export function buildActionPool(
  eventType: string,
  eventDefId: string | undefined,
  goodEvil: number,
): ActionOption[];
```

**候选池规模**：4 类事件池（COMBAT/SOCIAL/OPPORTUNITY/CONFLICT）各 4-5 选项 + 1 DEFAULT 池 + 1 breakthrough-fail 特殊池。

**G3 道德过滤**：goodEvil > +30 移除 evil 选项；goodEvil < -30 移除 good 选项；过滤后 < 2 选项则不执行过滤。

#### `src/engine/action-executor.ts`

```typescript
export interface ActionEffect {
  relationshipDeltaBonus: number;   // [-3, +3] 关系 delta 加成
  logSuffix: string;                // MUD 日志描述
}

export function applyActionEffect(result: SoulEvaluationResult, actionCode: string, actorId: string): SoulEvaluationResult;
export function getActionLogSuffix(actionCode: string): string;
```

#### `src/ai/soul-prompt-builder.ts` 新增

```typescript
/** 宗门上下文（G5 prompt 注入） */
export interface SectContext {
  name: string;
  ethos: number;       // [-100, +100]
  discipline: number;  // [-100, +100]
}

// SoulPromptInput 扩展
interface SoulPromptInput {
  // ... 原有字段
  sectContext?: SectContext;  // G5: 宗门上下文
}

// 新增导出函数
export function describeEthos(ethos: number, discipline: number): string;
export function describeMoral(goodEvil: number, lawChaos: number): string;
```

**describeEthos 阈值映射**（PRD §3.6）：
| 范围 | 道风描述 |
|------|---------|
| ethos > 50 | "宗门崇尚强者，弱肉强食" |
| ethos > 20 | "宗门风气偏向刚猛" |
| ethos < -50 | "宗门以仁义为本，扶危济困" |
| ethos < -20 | "宗门风气偏向温和" |
| discipline > 50 | "门规森严，不容逾矩" |
| discipline > 20 | "门规较为严格" |
| discipline < -50 | "门风自由，弟子各行其是" |
| discipline < -20 | "门规较为宽松" |
| 均在 [-20,+20] | "宗门风气中正平和" |

**describeMoral 阈值映射**（PRD §3.7）：
| 范围 | 善恶描述 |
|------|---------|
| goodEvil > 50 | "你心怀正义，以善为本" |
| goodEvil > 20 | "你心性偏善" |
| goodEvil < -50 | "你内心阴暗，行事不择手段" |
| goodEvil < -20 | "你心性偏恶" |

#### `src/ai/few-shot-examples.ts`

```typescript
export function selectFewShotExamples(
  goodEvil: number,
): Array<{ role: 'user' | 'assistant'; content: string }>;
```

**选择规则**（PRD §3.10）：goodEvil < -20 → 2 对邪恶示例；goodEvil > +20 → 1 对善良示例；中立 → 无 few-shot。

### 2.2 TickContext 扩展

```typescript
export interface TickContext {
  // ... 原有字段
  asyncAIBuffer?: AsyncAIBuffer;  // Phase G: 异步 AI 缓冲区（可选，buffer 未创建时为 undefined）
}
```

Owner: idle-engine（实例化）→ tick context 注入。

### 2.3 GameState 变更：无

Phase G 不引入任何新的持久化字段（I6）。所有运行时状态：
- `AsyncAIBuffer` — IdleEngine 实例属性
- `emotionMap` — IdleEngine 实例属性（Phase F 已有）
- `SoulEvaluator` — main.ts 模块级实例

### 2.4 存档迁移：不需要

存档版本保持 v5 不变。

---

## Step 3：Pipeline 挂载 + 依赖矩阵更新 + 回归影响评估

### 3.1 Pipeline 挂载

新增 1 个 Handler，总计 12 → **13**：

| # | Handler 名称 | Phase | Order | 文件 | 来源 |
|---|-------------|:-----:|:-----:|------|------|
| 13 | `ai-result-apply` | 625 (SOUL_EVAL) | 5 | `handlers/ai-result-apply.handler.ts` | Phase G |

**挂载位置选择理由**：
- Phase 625 SOUL_EVAL，Order 5 — 紧跟 soul-event (625:0) 之后
- soul-event 先执行同步 fallback + 异步 AI 提交
- ai-result-apply 在同一 phase drain 已完成的 AI 结果（来自前几个 tick 的异步调用）
- 先 fallback 后 AI 修正 = Deferred Correction 模式

```
625:0 soul-event    → 同步 fallback + 异步 submit
625:5 ai-result-apply → drain + correction delta
```

### 3.2 依赖变更

#### Engine→Data 新增依赖

| 文件 ↓ 依赖 → | emotion-pool | soul types | world-event types |
|:---|:---:|:---:|:---:|
| **async-ai-buffer** | — | R（SoulEvaluationResult） | — |
| **ai-result-apply.handler** | R（clampDelta） | R（EMOTION_LABEL） | — |
| **action-executor** | — | R（SoulEvaluationResult） | — |

#### Engine→Engine 新增依赖

| 文件 ↓ 依赖 → | soul-engine | async-ai-buffer | action-executor |
|:---|:---:|:---:|:---:|
| **idle-engine** | — | R/W（实例化+注入） | — |
| **ai-result-apply.handler** | R（applyEvaluationResult, updateRelationshipTags） | R（drain） | — |
| **soul-event.handler** | R（fallbackEvaluate） | R（submit） | R（applyActionEffect） |

#### AI→Data/Engine 新增依赖

| 文件 ↓ 依赖 → | trait-registry | emotion-pool | soul-prompt-builder | few-shot-examples | action-pool-builder |
|:---|:---:|:---:|:---:|:---:|:---:|
| **soul-evaluator** | R（getTraitDef） | R（buildCandidatePool） | R（build*Prompt, describeEthos） | R（selectFewShotExamples） | R（buildActionPool） |

#### Presentation→AI 新增依赖

| 文件 ↓ 依赖 → | soul-evaluator |
|:---|:---:|
| **main.ts** | R（实例化+tryConnect） |

**跨层通信验证**：
- ② Engine → ① Data：✅ 正确方向（向下依赖）
- ③ AI → ① Data：✅ 正确方向
- ③ AI → ③ AI 内部：✅ 同层依赖
- ④ Presentation → ③ AI：✅ 正确方向（初始化注入）
- ② Engine → ③ AI：⚠️ `soul-event.handler` 引用 `SoulEvaluator` 类型 — 通过 `initSoulEventEvaluator()` 注入模式解耦，handler 不直接 import evaluator 实例，而是由 main.ts 注入引用。实际代码中 handler import 了 SoulEvaluator 类型用于类型标注，这是类型级依赖而非实例级依赖，可接受。

### 3.3 回归影响评估

| 影响范围 | 风险 | 说明 |
|---------|:----:|------|
| soul-event.handler | **中** | 核心修改：添加 AI 路由逻辑。但 fallback 路径不变（processSoulEvent 调用不变） |
| tick-pipeline | **低** | 仅 TickContext 新增可选字段 asyncAIBuffer |
| idle-engine | **低** | 新增 buffer 实例化 + handler 注册（第 13 个） |
| soul-prompt-builder | **低** | 新增函数，不修改现有函数签名 |
| main.ts | **低** | 新增初始化代码，不影响现有命令 |
| 存档 | **零** | 无存档变更 |

### 3.4 回归测试要求

```bash
npx tsx scripts/regression-all.ts    # 64/64 必须通过
```

关键回归路径：
- soul-event fallback 评估仍正常（AI 离线时）
- emotionMap 读写不受影响
- relationship delta 计算正确（clampDelta 保护）

---

## Step 4：ADR 决策日志

### ADR-G-01：Fire-and-Forget + Deferred Correction vs 同步 AI 调用

| 项 | 内容 |
|----|------|
| **决策** | 采用异步 fire-and-forget 模式，fallback 立即执行，AI 结果作为修正叠加 |
| **备选** | (A) 同步等待 AI 返回（阻塞 tick）; (B) 缓存上次 AI 结果用于下次事件 |
| **理由** | 方案 A 违反 I2（AI 最坏 10s 延迟直接卡死游戏）；方案 B 结果不匹配当前事件语境。Fire-and-Forget 已在 DialogueCoordinator 的 processing flag 模式中验证可行。correctionDelta = aiDelta - fallbackDelta 保证修正方向正确 |
| **后果** | 玩家先看到 fallback 结果，后续 tick 看到 AI 修正（独白更新、情绪微调）。极少数情况下 AI 结果被 TTL 丢弃，fallback 保留 |

### ADR-G-02：双阶段 Pipeline vs 单次调用

| 项 | 内容 |
|----|------|
| **决策** | Lv.3 STORM 事件使用 Call1(决策 800ms) + Call2(独白 700ms) 双阶段 |
| **备选** | 单次调用同时产出决策+独白 |
| **理由** | poc-2d 验证单次调用时决策和独白互相干扰（70% 准确率）；poc-2e 双阶段提升到 75% 且独白质量更高。分离关注点：Call1 纯逻辑判断，Call2 纯文学渲染 |
| **后果** | 总延迟 P95 ≤ 1500ms（实测 1084ms）；Call1 超时=全 fallback，Call1 成功+Call2 超时=AI 决策+fallback 独白，优雅降级 |

### ADR-G-03：反派偏置三管齐下 vs 单一修复

| 项 | 内容 |
|----|------|
| **决策** | Three-prong 修复：few-shot 示例 + describeMoral 自然语言注入 + 道德感知候选池物理过滤 |
| **备选** | (A) 仅 few-shot; (B) 仅 system prompt 描述; (C) 仅候选池过滤 |
| **理由** | poc-2e T03/T15 明确显示单一方案不够——LLM 的正能量偏置需要多层面纠正。few-shot 给示范，describeMoral 给语境，候选池过滤给硬约束。三者互补不冗余 |
| **后果** | 新增 `few-shot-examples.ts` 文件（~80 行）；describeMoral 和候选池过滤增加 prompt 构建复杂度但 token 开销可控 |

### ADR-G-04：模块注入模式 vs 直接 import

| 项 | 内容 |
|----|------|
| **决策** | SoulEvaluator 通过 `initSoulEventEvaluator()` 函数注入到 soul-event.handler 模块 |
| **备选** | Handler 直接 import SoulEvaluator 实例 |
| **理由** | Handler 属于 Engine 层（②），SoulEvaluator 属于 AI 层（③）。直接 import 会引入 Engine→AI 的运行时依赖。通过注入模式，main.ts（④）负责连接两层，Engine 层仅持有类型引用 |
| **后果** | AI 离线时 evaluator 变量为 null，handler 自动跳过 AI 路由——天然满足 I3 |

---

## 架构文档更新清单

| 文件 | 更新内容 | 执行者 |
|------|---------|:------:|
| `arch/pipeline.md` | Handler 12→13，+ai-result-apply(625:5)；TickContext +asyncAIBuffer；变更日志 Phase G | /SGE |
| `arch/layers.md` | Engine +3 文件（async-ai-buffer, ai-result-apply.handler, action-executor）；AI +3 文件（soul-evaluator, few-shot-examples, action-pool-builder） | /SGE |
| `arch/dependencies.md` | +10 条新依赖关系（见 §3.2） | /SGE |
| `arch/gamestate.md` | 无变更 | — |
| `arch/schema.md` | 无变更 | — |
| `tech-debt.md` | TD-006 部分清偿说明（AI 延迟通过异步缓冲区解决） | /SGE |

---

## Party Review 报告

### R4 项目经理（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 工期评估 | ✅ | 6 新文件 + 6 修改文件，M 复杂度，核心逻辑已有 poc-2e 验证 |
| 2 | 风险评估 | ✅ | I2（不阻塞 tick）通过 AsyncAIBuffer 保证；I3（fallback）通过 null 检查保证 |
| 3 | 技术债务 | ✅ | TD-006 部分清偿；无新增高优债务 |
| 4 | 依赖管理 | ✅ | 零新外部依赖；跨层依赖方向正确（注入模式解耦） |
| 5 | 文档同步 | ✅ | 更新清单覆盖 pipeline/layers/dependencies 三大文档 |

### R5 偏执架构师（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 层间耦合 | ✅ | Engine→AI 通过注入模式解耦（ADR-G-04）；无反向依赖 |
| 2 | 不变量完整性 | ✅ | I1~I6 均有对应架构实现且无冲突（§1.2 验证表） |
| 3 | 竞态防护 | ✅ | key 去重 + TTL GC + MAX_PENDING 容量驱逐 + canCall() 限速 |
| 4 | 持久化安全 | ✅ | 零 GameState 新字段，零存档迁移 |
| 5 | 降级路径 | ✅ | AI 离线=null evaluator；Call1 超时=全 fallback；Call1 OK+Call2 超时=AI 决策+fallback 独白 |

### R6 找茬QA（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 回归覆盖 | ✅ | regression-all.ts 64/64 覆盖引擎层核心路径 |
| 2 | 边界条件 | ✅ | MAX_PENDING 驱逐、TTL 过期丢弃、候选池过滤后 <2 保留、few-shot 中立区无注入 |
| 3 | 错误处理 | ✅ | AI promise catch 静默丢弃、structuredCompletion AbortError 处理、JSON parse 容错 |
| 4 | 性能 | ⚠️ | delta bonus [-3,+3] 未经 Monte Carlo 验证（与 PRD GATE 1 R3 WARN 一致），范围小且 clampDelta 保护 |
| 5 | 可观测性 | ✅ | `[灵魂·AI]` 前缀区分 AI vs fallback 日志；pendingCount/completedCount 监控属性 |

### 最终判定

✅ **PASS** — 14 PASS + 1 WARN（R6-4: delta bonus 未经 Monte Carlo，与 PRD GATE 1 已知风险一致，不阻塞）

---

## SGA Signoff

- [x] Interface 设计完整（6 新文件均有 Owner，所有接口已定义）
- [x] 迁移策略完整（不需要迁移，I6 零存档迁移）
- [x] Pipeline 挂载方案确认（+ai-result-apply 625:5，Handler 12→13）
- [x] 依赖矩阵已更新（10 条新依赖，跨层方向正确，注入模式解耦）
- [x] Party Review 无 BLOCK 项（PASS，1 WARN 不阻塞）
- [x] 技术债务已登记（TD-006 部分清偿）

签章：`[x] GATE 2 PASSED` — 2026-03-30
