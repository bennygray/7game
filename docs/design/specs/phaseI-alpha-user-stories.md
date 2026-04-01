# Phase I-alpha User Stories — 因果引擎 + 高级关系标签

> **版本**：v1.0 | **日期**：2026-04-01
> **来源 PRD**：`docs/features/phaseI-alpha-PRD.md`
> **依赖**：Phase IJ ✅, Phase J-Goal ✅, Phase F0 ✅

---

## Story #1：因果规则注册表

**标题**：作为系统，我需要一个静态因果规则注册表，存储 6 条因果规则的完整定义

**AC**：

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 注册表已加载 | 读取 CAUSAL_RULE_REGISTRY | 返回 6 条 CausalRule，id 为 CR-01~CR-06 | PRD §5.1 |
| AC2 | 注册表数组 | 检查冻结状态 | `Object.isFrozen(CAUSAL_RULE_REGISTRY) === true` | INV-4 |
| AC3 | 每条规则 | 检查模板 | 每条规则至少 3 条 MUD 文案模板 | PRD §5.7 |

**依赖**：无
**复杂度**：S

---

## Story #2：CausalRuleEvaluator 核心扫描

**标题**：作为引擎，我需要一个 CausalRuleEvaluator 按间隔扫描弟子，检查因果规则条件

**AC**：

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 引擎运行 | 每 300 ticks | CausalRuleEvaluator.evaluate() 被调用一次 | PRD §5.1 CAUSAL_SCAN_INTERVAL_TICKS=300 |
| AC2 | 扫描执行 | A→B affinity=-70 且同地 | 触发 CR-01（挑衅），emit causal-provoke SoulEvent | PRD §5.1 C1 |
| AC3 | 扫描执行 | A.goodEvil=-65 且 spiritStones>=100 | 触发 CR-03（窃取），emit causal-theft SoulEvent | PRD §5.1 C3 |
| AC4 | 扫描执行 | 多条规则同时满足 | 仅触发 priority 最高的 1 条（INV-2） | PRD §5.1 priority 排序 |
| AC5 | 规则刚触发 | 同一规则+同一对在 cooldown 内 | 不触发（跳过） | PRD §5.2 |
| AC6 | 所有条件 | 规则条件检查 | 条件为纯函数，不修改 state（INV-6） | PRD §2.2 INV-6 |

**依赖**：Story #1
**复杂度**：L

---

## Story #3：因果事件→SoulEvent 管线

**标题**：作为引擎，因果事件触发后需通过 EventBus 传递到 soul-event handler

**AC**：

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | CR-01 触发 | emit SoulEvent | type='causal-provoke', metadata 含 ruleId+targetId+location | PRD §5.1 C1 metadata |
| AC2 | soul-event handler 消费 | 处理 causal-provoke | 从 PRD §5.6 候选池选取情绪，执行 delta 修正 | PRD §5.6 |
| AC3 | SPLASH 级因果事件 | AI 路由 | 触发 AI 独白（Call2），同现有 SPLASH 路由 | PRD §5.8 |
| AC4 | STORM 级因果事件 (CR-03) | AI 路由 + 裁决 | 触发 AI 全决策 + pendingStormEvent 标记 | PRD §5.8 |
| AC5 | 因果事件触发 | MUD 日志 | 从 3 条模板随机选取 1 条，替换 {A}/{B}/{L} | PRD §5.7 |

**依赖**：Story #2
**复杂度**：M

---

## Story #4：高级关系标签自动管理

**标题**：作为 soul-engine，我需要在 updateRelationshipTags() 中自动赋予/移除 mentor/grudge/admirer 标签

**AC**：

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | A→B affinity=85, A.star=5, B.star=3 | updateRelationshipTags | A→B.tags 含 'mentor' | PRD §5.3 mentor |
| AC2 | A→B affinity=55（< 60） | updateRelationshipTags | A→B.tags 不含 'mentor'（已移除） | PRD §5.3 mentor 移除 |
| AC3 | A→B affinity=-45, 负面事件(affinityDelta<0)>=3 | updateRelationshipTags | A→B.tags 含 'grudge' | PRD §5.3 grudge |
| AC4 | A→B affinity=-15（> -20） | updateRelationshipTags | A→B.tags 不含 'grudge'（已移除） | PRD §5.3 grudge 移除 |
| AC5 | A→B affinity=65, B 有正面特性, 正向事件>=3 | updateRelationshipTags | A→B.tags 含 'admirer' | PRD §5.3 admirer |
| AC6 | A→B affinity=35（< 40） | updateRelationshipTags | A→B.tags 不含 'admirer'（已移除） | PRD §5.3 admirer 移除 |

**依赖**：无（修改现有函数）
**复杂度**：M

---

## Story #5：高级标签行为效果

**标题**：作为行为树/碰面系统，高级标签需产生实际效果

**AC**：

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | B 有 mentor A 标签，A 与 B 同地 | 计算 B 的行为权重 | B.meditate 权重 ×1.2 | PRD §5.5 mentor |
| AC2 | A 有 grudge B 标签，A 与 B 同地 | decideEncounterResult | conflict 权重从 60→75 | PRD §5.5 grudge |
| AC3 | A 有 admirer B 标签 | 情绪评估消费候选池 | 正面情绪候选权重 +0.2 | PRD §5.5 admirer |

**依赖**：Story #4
**复杂度**：M

---

## Story #6：Pipeline 集成 + 验证

**标题**：作为引擎，causal-tick handler 需注册到 TickPipeline 并通过全量验证

**AC**：

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 引擎启动 | 读取 Pipeline | causal-tick 在 TickPhase 612:0 注册 | 计划 §3.3 |
| AC2 | TickContext | 检查字段 | ctx.causalEvaluator 存在 | — |
| AC3 | tsc --noEmit | 编译 | 零错误 | — |
| AC4 | npm run test:regression | 回归 | 64/64 通过 | — |
| AC5 | verify-phaseI-alpha-causal.ts | 专项 | ≥30 断言通过，含 Monte Carlo N=1000 | PRD §1.3 |

**依赖**：Story #1-5
**复杂度**：M

---

## 依赖关系图

```
Story #1 (注册表)
    ↓
Story #2 (Evaluator 核心)
    ↓
Story #3 (SoulEvent 管线)
    ↓                    Story #4 (标签管理)
    ↓                        ↓
    ↓                    Story #5 (标签效果)
    ↓                        ↓
    └───── Story #6 (集成+验证) ──┘
```
