# Phase F0-β: 活世界 — 实施计划

> **目标**：为宗门引入世界事件池 + 五级事件漏斗 + Storyteller 节奏器，让世界有"新鲜事"发生
> **前置**：Phase F0-α ✅（碰面世界已交付，12 个 handler，存档 v5）

---

## Gate 进度

| Gate | 状态 | 产出物 |
|------|:----:|-------|
| GATE 1 (SPM) | ✅ CONDITIONAL PASS | PRD + 6 User Stories + Party Review |
| GATE 2 (SGA) | ✅ PASS | TDD + ADR-F0β-01 + Party Review |
| GATE 3 (SGE) | 🔄 待执行 | 代码 + 验证 |

---

## 架构决策摘要

| 决策 | 结论 |
|------|------|
| 存档版本 | **保持 v5**（Storyteller 纯运行时） |
| Pipeline 阶段 | **WORLD_EVENT = 605**（弟子 AI 后、碰面前） |
| Storyteller 存储 | **运行时 class**（不持久化，ADR-F0β-01） |
| TickContext | **无变更**（复用 eventBus + logger） |

---

## 文件变更清单

### 新增文件（5 个）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `src/shared/types/world-event.ts` | EventSeverity, EventScope, WorldEventDef, WorldEventPayload, StorytellerState |
| 2 | `src/shared/data/world-event-registry.ts` | 12 个 WorldEventDef + 36 条文案模板 |
| 3 | `src/engine/storyteller.ts` | Storyteller 类（张力 + 概率 + 道风调节） |
| 4 | `src/engine/handlers/world-event-tick.handler.ts` | Phase 605 Handler |
| 5 | `scripts/verify-phaseF0-beta.ts` | 30+ 条专项验证 |

### 修改文件（5 个）

| # | 文件 | 变更 |
|---|------|------|
| 1 | `src/shared/types/soul.ts` | +SoulEventType 'world-event' + POLARITY 映射 |
| 2 | `src/shared/data/emotion-pool.ts` | +buildCandidatePool 'world-event' 4 条 + fallback |
| 3 | `src/engine/tick-pipeline.ts` | +TickPhase.WORLD_EVENT = 605 |
| 4 | `src/engine/idle-engine.ts` | +import + register worldEventTickHandler |
| 5 | `scripts/regression-all.ts` | +F0-β 专项测试整合 |

---

## 验证计划

```bash
# 1. TypeScript 编译
npx tsc --noEmit

# 2. F0-β 专项验证（30+ 条）
npx tsx scripts/verify-phaseF0-beta.ts

# 3. 全量回归
npx tsx scripts/regression-all.ts
```

验证要点：事件池完整性、张力公式、喘息期、严重度升级、道风权重、EventBus emit、MUD 日志分级

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-30 | 初始创建（SPM GATE 1 后） |
| 2026-03-30 | GATE 2 通过：架构决策确认 |
