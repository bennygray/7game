# Phase I-alpha Walkthrough

**Phase**: I-alpha (因果引擎 + 高级关系标签)
**Pipeline**: SPM (Gate 1 ✅) → SGA (Gate 2 ✅) → SGE (Gate 3 ✅)
**Date**: 2026-04-01

---

## What Was Built

Phase I-alpha 实现了因果事件运行时（6 条规则）和高级关系标签（3 种），让弟子之间的互动从"随机碰面"升级为"有因有果的戏剧冲突"。

### 因果规则系统

| Rule | Trigger | Effect | Severity |
|------|---------|--------|:--------:|
| C1 仇人挑衅 | affinity ≤ -60 + 同地 | emit causal-provoke | SPLASH |
| C2 至交赠礼 | affinity ≥ 80 + 同地 | emit causal-gift | RIPPLE |
| C3 邪心窃取 | 善恶 ≤ -60 + 灵石 ≥ 100 | emit causal-theft + 灵石 -20 | STORM |
| C4 对手嫉妒 | rival 标签 + 对方近期突破 + 同地 | emit causal-jealousy | SPLASH |
| C5 连败闭关 | 连败 ≥ 3 + 攻击性低 | emit causal-seclusion + 赋予闭关目标 | RIPPLE |
| C6 道风冲突 | 宗门道风与弟子善恶差 ≥ 120 | emit causal-ethos-clash | SPLASH |

### 高级标签

| Tag | Assign | Remove | Effect |
|-----|--------|--------|--------|
| mentor | affinity ≥ 80 + 星级差 ≥ 2 | affinity < 60 | 同地修炼权重 ×1.2 |
| grudge | affinity ≤ -40 + 负面事件 ≥ 3 | affinity > -20 | hostile碰面冲突 60→75% |
| admirer | affinity ≥ 60 + 正面特性 + 正面事件 ≥ 3 | affinity < 40 | 正面情绪权重 +0.2 |

### Architecture

- **TickPhase 612 (CAUSAL_EVAL)**: encounter(610) 后、soul-event(625) 前
- **扫描频率**: 每 300 ticks (~5min)
- **INV-2**: 每次 evaluate() 最多触发 1 个事件
- **INV-3**: 冷却/突破记录/连败计数均为运行时 Map，不持久化
- **INV-5**: updateRelationshipTags() 统一管理全部 5 种标签
- **GameState v6 不变**, 零存档迁移

---

## Key Decisions

1. **Strategy Pattern (ADR-Ia-01)**: 规则条件在 evaluator 中 switch/case 实现，不用 data-driven DSL。6 条规则不需要 DSL 的灵活性。
2. **TickPhase 612 (ADR-Ia-02)**: 在 encounter 后扫描确保读取最新碰面结果。
3. **C5 GoalManager 直接调用 (ADR-Ia-04)**: 闭关目标在 causal scan 时立即赋予，不等到 soul-event 625。
4. **关系公式函数接受 `null | undefined` (Gate 2 WARN #11 fix)**: 兼容 getMemory() 返回 null 和可选链 ?.operator 返回 undefined。

---

## Review History

| Gate | Verdict | BLOCK | WARN |
|------|:-------:|:-----:|:----:|
| Gate 1 (SPM) | CONDITIONAL PASS | 1 (fixed) | 4 |
| Gate 2 (SGA) | CONDITIONAL PASS | 0 | 5 |
| Gate 3 (SGE) | CONDITIONAL PASS | 0 | 2 |

### Gate 3 WARNs (tech debt)

1. `causal-evaluator.ts` L319 `state as LiteGameState` 绕过 Readonly — C5 GoalManager 调用需可变引用
2. `soul-event.handler.ts` L94 `spiritStones - 20` 硬编码 — 建议提取为常量

---

## Lessons Learned

1. **SGA 关联性审计至关重要**: TDD v1.0 遗漏 4 项关联变更（emotion-pool, soul-prompt-builder, auto-breakthrough, ai-result-apply），由用户人工审查发现。TDD v1.2 补全后 SGE 编码零返工。FB-019 已永久纳入 SGA 流程。
2. **Full Record 策略有效**: `emotion-pool.ts` 和 `soul-prompt-builder.ts` 使用 `Record<SoulEventType, ...>`（非 Partial），新增 SoulEventType 时 tsc 立即报错，防止遗漏。
3. **Monte Carlo 验证有价值**: 30 断言验证基础正确性，Monte Carlo N=1000 验证频率合理性（avg 4.0 events/30min, target ≥3）。
