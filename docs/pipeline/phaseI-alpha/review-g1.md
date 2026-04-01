# Phase I-alpha Gate 1 Review

> **日期**：2026-04-01 | **轮次**：1（修复后）
> **审查对象**：PRD v1.0 + User Stories v1.0

---

## 审查结果：CONDITIONAL PASS

| 级别 | 数量 | 说明 |
|:----:|:----:|------|
| BLOCK | 0 | 1 BLOCK 已修复 |
| WARN | 4 | 见下方 |

---

## BLOCK（已修复）

### BLOCK-1：grudge 标签依赖不存在的字段 ✅ FIXED

- **原问题**：PRD 中 grudge 赋予条件引用 `KeyRelationshipEvent.type` 字段，但该接口无 type 字段
- **修复**：改用 `keyEvents` 中 `affinityDelta < 0` 的条目计数作为"负面事件次数"代理
- **影响**：PRD §5.3 grudge + §5.4 汇总表已更新

---

## WARN

### WARN-1：情绪候选池格式与 PRD 不一致 ✅ FIXED

- **原问题**：PRD §5.6 使用 `emotion(weight)` 加权格式，但代码中 `EMOTION_CANDIDATE_POOL` 是 `EmotionTag[]`（等概率）
- **修复**：PRD §5.6 已改为 `EmotionTag[]` 格式，与代码一致

### WARN-2：C3 窃取副效果的执行位置未明确

- **描述**：PRD §5.1 C3 说"经由 soul-event handler 执行"扣 20 灵石，但现有 handler 无扣资源能力
- **处置**：推迟到 SGA/SGE 阶段决定具体执行点（可在 causal-evaluator 触发时直接扣除，或新增副效果回调）
- **风险**：低（仅 20 灵石，不影响经济平衡）

### WARN-3：C4 嫉妒规则需追踪"最近 50 tick 突破"

- **描述**：EventBus 是 drain 模式，历史事件不可回溯；需 CausalEvaluator 维护 recentBreakthroughs Map
- **处置**：SGA 阶段设计 recentBreakthroughs 追踪机制
- **风险**：低（实现简单）

### WARN-4：admirer 标签"正向事件>=3"可能在刷新后丢失

- **描述**：RelationshipMemory 是运行时的；刷新后 keyEvents 清空，但 admirer 标签已写入 GameState 持久化
- **处置**：可接受——标签一旦赋予就持久化在 `RelationshipEdge.tags[]` 中，仅移除依赖 affinity 阈值（不依赖 RM）
- **风险**：低

---

## 角色审查摘要

### R1 魔鬼PM
- PRD 5-Why 根因链清晰，核心体验锚定到"因果闭环"
- INV-1~6 不变量完整，无遗漏
- 建议：C3 窃取的灵石扣除应在 PRD 中更精确描述执行点 → **WARN-2**

### R2 资深玩家
- 因果事件让世界有"故事感"，文案质量可接受
- 担忧 grudge 在刷新后可能"无缘无故"存在（标签持久但记忆清空） → **WARN-4**（可接受）
- 建议：C1 挑衅文案可增加弟子性格差异化（后续优化）

### R3 数值策划
- 6 条规则的冷却+优先级+严重度配置合理
- Monte Carlo 验证目标（30 分钟≥3 事件）可达成性需实际跑批
- grudge 改用 affinityDelta<0 计数是合理的代理指标
- 标签阈值设计无重叠（MECE ✅）

### R5 偏执架构师
- CausalRule 类型桩已存在，无需新增核心类型
- TickPhase 612:0 位置合理（encounter 610 之后，soul-event 625 之前）
- GameState 不变（v6）是最佳选择
- 冷却 Map 运行时模式与 encounter-tick/storyteller 一致

---

## 签章

```
审查结果：CONDITIONAL PASS（0 BLOCK / 4 WARN）
WARN-1: ✅ 已修复（情绪池格式对齐）
WARN-2: 推迟到 SGA（C3 副效果执行点）
WARN-3: 推迟到 SGA（C4 突破追踪机制）
WARN-4: 可接受（标签持久化，RM 仅用于赋予判断）
```
