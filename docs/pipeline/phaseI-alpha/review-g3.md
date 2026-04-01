# Phase I-alpha Gate 3 Review Report

**Review Date**: 2026-04-01 | **Reviewed Artifact**: Implementation code (5 new + 13 modified files)
**Consecutive Full PASS Count**: 0 (Gate 2 was CONDITIONAL PASS)
**Reviewer Roles**: R1 (魔鬼PM), R6 (找茬QA), R7 (资深程序员)

---

## L0 Content Traceability

> Skipped per review-protocol.md: L0 applies only when review object contains User Stories with Data Anchor columns. This is Gate 3 (code review); L0 is not applicable.

---

## L1 Dimension Audit

### R1 魔鬼PM 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 ROI | ✅ | 开发成本 M，体验增量 4/5。6 条因果规则让弟子行为从"随机"变为"有因有果"，直接服务核心乐趣假设。实现零 GameState 迁移、零新依赖，成本可控。验证脚本 30/30 + 回归 64/64 确认交付完整。（Evidence: verify-phaseI-alpha-causal.ts 30 assertions, test:regression 64/64） |
| D2 认知负担 | ✅ | 玩家零新概念、零新操作。因果事件通过 MUD 日志自然呈现（causal-rule-registry.ts L28-L77 共 18 条中文模板），无需玩家主动触发或学习。标签效果（mentor 修炼×1.2、grudge 冲突 75%）在后台运行，不暴露给玩家。 |
| D3 范围控制 | ✅ | IN/OUT 边界清晰：6 规则 + 3 标签 + 1 handler，与 PRD §5.1-5.3 一一对应。无"顺便"功能。C3 灵石扣除（soul-event.handler.ts L93-95）和 C5 目标赋予（causal-evaluator.ts L318-327）均在 PRD §5.1 中明确定义。 |
| D4 实施可读性 | ✅ | 代码实现与 TDD v1.2 完全对齐。每个规则在 causal-rule-registry.ts 中完整定义（ID、触发类型、条件、结果事件、冷却、优先级），不存在模糊占位。关系公式在 relationship-formulas.ts 中作为纯函数实现（6 函数，每个 ≤15 行），参数和阈值均从 ADVANCED_TAG_THRESHOLDS 常量读取。 |

### R6 找茬QA 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 边界穷举 | ⚠️ | causal-evaluator.ts L319: `state as LiteGameState` 将 `Readonly<LiteGameState>` 强制转为可变类型，传递给 `goalManager.assignGoal()`。goalManager.assignGoal() 会写入 `state.personalGoals`（goal-manager.ts L40-47），这意味着 causal-evaluator 通过类型转换间接写入了 GameState，与 INV-1（EventBus only, no direct GameState write）存在语义冲突。运行时安全（assignGoal 仅 push 到 personalGoals 数组），但类型系统被绕过。（Evidence: causal-evaluator.ts L281 `state: Readonly<LiteGameState>`, L319 `state as LiteGameState`） |
| D2 并发竞态 | ✅ | Pipeline ordering 610→612→625 正确。causal-tick (612:0) 在 encounter-tick (610:0) 之后读取关系状态，在 soul-event (625:0) 之前 emit SoulEvent。scanAccumulatorTicks 为模块级变量（causal-tick.handler.ts L17），tick pipeline 同步执行无竞态。auto-breakthrough (200:10) 的 recordBreakthrough/recordFailure 调用在 causal scan (612) 之前完成，数据流正确。 |
| D3 回归风险 | ✅ | `updateRelationshipTags()` 签名变更（+可选参数）向后兼容。现有唯一调用方 ai-result-apply.handler.ts 已更新传参（L65 传入 ctx.relationshipMemoryManager）。soul-engine.ts L383 processSoulEvent 内部调用也已更新。mentor/grudge/admirer 此前从未被任何代码赋值（grep 确认），从"保留手动标签"到"统一计算"的语义变更安全。test:regression 64/64 通过确认无回归。 |
| D4 可测试性 | ✅ | verify-phaseI-alpha-causal.ts 30 断言覆盖：注册表完整性(3)、C1-C6 触发/非触发(12)、冷却机制(3)、max-1-event(1)、标签赋予/移除(6)、Monte Carlo N=1000(2)。所有 User Story AC 均可通过自动化脚本验证。Monte Carlo 结果 avg 4.0 events/30min（目标≥3）。 |
| D5 存档兼容 | ✅ | GameState 保持 v6，零新字段。所有新运行时状态（cooldownMap、recentBreakthroughs、consecutiveFailures）均为 CausalRuleEvaluator 实例 Map（causal-evaluator.ts L32-34），不持久化（INV-3）。旧存档加载完全不受影响。（Evidence: causal-evaluator.ts header comment "INV-3: 所有 Map 为运行时，不持久化"） |

### R7 资深程序员 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 函数单一 | ✅ | 最长函数 `checkRelationshipTag()` 约 30 行（causal-evaluator.ts L179-L223），职责单一（遍历 recentBreakthroughs → 查 rival 标签 → 冷却检查）。`fireEvent()` 约 45 行（L277-L328），包含冷却记录+emit+MUD+C5 副效果 4 个步骤，但均为线性流程无分支嵌套。`encounter-tick.handler.ts execute()` 较长（L98-221, ~120 行），但这是 Phase F0-α 遗留代码，本次仅新增 grudge 判定逻辑 6 行（L147-153）。 |
| D2 Magic Number | ⚠️ | soul-event.handler.ts L94: `ctx.state.spiritStones - 20` — 硬编码 20 枚灵石扣除。此值应提取为 `causal-rule-registry.ts` 中的命名常量（如 `THEFT_SPIRIT_STONES_COST`）。当前位置在 handler 中，与规则定义分离，后续维护者可能遗漏。其余所有阈值均正确提取为常量（ADVANCED_TAG_THRESHOLDS、CAUSAL_SCAN_INTERVAL_TICKS、各规则 cooldownTicks/priority）。（Evidence: soul-event.handler.ts L94） |
| D3 错误处理 | ✅ | causal-evaluator.ts 条件检查函数均为纯函数，对 null/undefined 有防御：L137 `if (!source \|\| !target) continue`、L166 `if (!d.moral) continue`、L197 `if (!discipleA) continue`。getRandomCausalMudText 有 fallback（causal-rule-registry.ts L175-176）。causal-tick.handler.ts L25 `if (!ctx.causalEvaluator) return` 防御未注入场景。 |
| D4 重复代码 | ✅ | C1/C2 共用 `checkAffinityThreshold()` 方法（causal-evaluator.ts L124-155），条件通过 `affinityMin`/`affinityMax` 参数化区分。C3/C5/C6 各有独立检查函数，逻辑不同（moral vs failure-count vs ethos-gap），不构成重复。soul-event.handler.ts L57-65 world-event 和 causal-* 的 severity 读取逻辑相似但不完全相同（world-event 匹配 `event.type === 'world-event'`，causal 匹配 `startsWith('causal-')`），保持独立可读性更好。 |
| D5 命名质量 | ✅ | 函数命名自解释：`shouldAssignMentor`/`shouldRemoveMentor`（布尔 should 前缀）、`checkAffinityThreshold`/`checkMoralThreshold`（check 前缀）、`recordBreakthrough`/`resetBreakthroughFailure`（动作明确）。变量名清晰：`scanAccumulatorTicks`、`cooldownKey`、`recentBreakthroughs`。无 temp/data 等模糊命名。 |
| D6 注释质量 | ✅ | 每个文件头有 Phase 来源 + TDD/PRD 交叉引用（如 causal-evaluator.ts L9-15）。每条规则有 ID 注释（如 `/** C1/C2: affinity-threshold */`）。INV 不变量在文件头和代码中标注（如 `// INV-2: 最多触发 1 个事件`）。ADR 引用明确（如 `// ADR-Ia-04`）。 |
| D7 性能意识 | ✅ | 扫描频率 300 ticks/次，非扫描 tick 仅执行 `scanAccumulatorTicks++` + 一次比较，近零成本（causal-tick.handler.ts L27-28）。规则按 priority 降序排序使用 `[...CAUSAL_RULE_REGISTRY].sort()`（causal-evaluator.ts L56）每次扫描创建一次浅拷贝数组（6 元素），可接受。弟子遍历 O(n) n=8、配对遍历 O(n²) n=8=28 次，远低于性能红线。 |

---

## L2 CoVe Evidence Verification

### CoVe #1 — R6-D1: `Readonly<LiteGameState>` 被 `as LiteGameState` 绕过 (WARN)

**Original Conclusion**: WARN — causal-evaluator.ts L319 类型转换绕过 Readonly。

**Verification Questions**:
1. `goalManager.assignGoal()` 是否实际写入 state？
2. 是否有替代方案避免类型转换？

**Independent Answers**:
1. 是。`assignGoal()` 将新 PersonalGoal push 到 `state.personalGoals` 数组（goal-manager.ts L40-47），这是实际写入。但此写入在语义上属于"赋予目标"副效果，与 causal-evaluator 的"条件检查纯函数"定位不同。（Evidence: goal-manager.ts L40-47）
2. 替代方案：将 GoalManager 调用移到 soul-event.handler.ts 处理 `causal-seclusion` 事件时执行（类似 C3 灵石扣除的处理方式）。但 ADR-Ia-04 说明这会使目标赋予延迟一个 pipeline phase，且 C5 规则语义是"立即闭关"。当前实现是有意为之的 trade-off。

**Comparison**: WARN 有据。类型安全被绕过，但运行时安全且有 ADR 支撑。

**Final Verdict**: 维持 ⚠️ WARN。建议未来重构 `assignGoal` 接受 `Readonly<LiteGameState>` 或将目标赋予移至 soul-event handler 统一处理。

---

### CoVe #2 — R7-D2: spiritStones - 20 硬编码 (WARN)

**Original Conclusion**: WARN — soul-event.handler.ts L94 硬编码 20。

**Verification Questions**:
1. 这个值在 PRD 中是否有明确定义？
2. 项目中类似的数值是否提取为常量？

**Independent Answers**:
1. PRD §5.1 C3 定义"灵石 -20"。此值目前仅在 soul-event.handler.ts L94 使用，无其他引用处。（Evidence: PRD §5.1 C3）
2. 项目惯例：因果规则的冷却/阈值全部提取到 causal-rule-registry.ts 常量中（如 cooldownTicks: 1800, condition: { minSpiritStones: 100 }）。但 20 这个扣除量未提取。对比 encounter 系统的 `BASE_ENCOUNTER_CHANCE`（encounter.ts 常量提取）模式，应提取。

**Comparison**: 一致。硬编码不影响正确性但违反项目惯例。

**Final Verdict**: 维持 ⚠️ WARN。建议在 causal-rule-registry.ts 或 soul-event.handler.ts 中提取为 `THEFT_SPIRIT_STONES_COST = 20`。

---

## Summary

| # | 角色 | 维度 | 判定 | 说明 | CoVe 结果 |
|---|------|------|:----:|------|-----------|
| 1 | R1 魔鬼PM | D1 ROI | ✅ | 成本 M / 体验 4/5, 验证 30/30 + 回归 64/64 | — |
| 2 | R1 魔鬼PM | D2 认知负担 | ✅ | 玩家零新概念，MUD 自然呈现 | — |
| 3 | R1 魔鬼PM | D3 范围控制 | ✅ | 与 PRD §5.1-5.3 一一对应，无越界 | — |
| 4 | R1 魔鬼PM | D4 实施可读性 | ✅ | 代码与 TDD v1.2 完全对齐 | — |
| 5 | R6 找茬QA | D1 边界穷举 | ⚠️ | Readonly 被 as 绕过（C5 GoalManager） | 维持 WARN |
| 6 | R6 找茬QA | D2 并发竞态 | ✅ | Pipeline 610→612→625 顺序正确 | — |
| 7 | R6 找茬QA | D3 回归风险 | ✅ | 签名兼容 + grep 确认无冲突 + 64/64 回归 | — |
| 8 | R6 找茬QA | D4 可测试性 | ✅ | 30 断言 + Monte Carlo 覆盖全部 AC | — |
| 9 | R6 找茬QA | D5 存档兼容 | ✅ | GameState v6 不变，运行时 Map 不持久化 | — |
| 10 | R7 资深程序员 | D1 函数单一 | ✅ | 最长函数 ~45 行线性流程 | — |
| 11 | R7 资深程序员 | D2 Magic Number | ⚠️ | spiritStones - 20 硬编码 | 维持 WARN |
| 12 | R7 资深程序员 | D3 错误处理 | ✅ | null/undefined 均有防御 | — |
| 13 | R7 资深程序员 | D4 重复代码 | ✅ | C1/C2 共用方法，无冗余 | — |
| 14 | R7 资深程序员 | D5 命名质量 | ✅ | should/check/record 前缀一致 | — |
| 15 | R7 资深程序员 | D6 注释质量 | ✅ | INV/ADR/Phase 交叉引用完整 | — |
| 16 | R7 资深程序员 | D7 性能意识 | ✅ | 300 tick 扫描 + 168 checks/scan | — |

---

## Final Verdict

**⚠️ CONDITIONAL PASS** — 0 BLOCK, 2 WARN

### WARN Items (Non-blocking, tracked as tech debt)

1. **[WARN #5] Readonly bypass**: `causal-evaluator.ts` L319 `state as LiteGameState` 绕过类型系统。运行时安全但语义上违反 INV-1。建议 I-beta 重构时统一 C5 副效果到 soul-event handler。

2. **[WARN #11] Magic Number**: `soul-event.handler.ts` L94 `spiritStones - 20` 硬编码。建议提取为命名常量 `THEFT_SPIRIT_STONES_COST`。

### Verification Results

| 检查项 | 结果 |
|--------|------|
| `tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors (89 pre-existing warnings) |
| `npm run test:regression` | 64/64 passed |
| `verify-phaseI-alpha-causal.ts` | 30/30 passed |
| Monte Carlo (N=1000) | avg 4.0 events/30min (target ≥3) |

---

## Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-04-01 | v1.0 | Initial Gate 3 review |
