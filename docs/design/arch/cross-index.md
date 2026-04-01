# 系统交叉索引

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §4.5
> **数据来源**：`prd/systems.md` + `arch/pipeline.md` + 各 Phase walkthrough/handoff 交叉比对

---

## §1 已实现系统交叉表

| # | 系统 | 引入 Phase | 核心文件 | Handler (Phase:Order) | 依赖系统 |
|---|------|-----------|---------|----------------------|---------|
| 1 | 修炼引擎（灵气/悟性/灵石） | A | `idle-engine.ts`, `idle-formulas.ts` | core-production (300:0) | shared/formulas |
| 2 | 弟子行为树（7态切换） | A → D 重构 | `behavior-tree.ts`, `intent-executor.ts` | disciple-tick (600:0) | farm-engine, alchemy-engine |
| 3 | MUD 文字面板 | A | `ui/mud-panel.ts`, `ui/mud-formatter.ts` | — (UI 层) | idle-engine |
| 4 | AI 灵智弟子台词 | A | `ai/llm-adapter.ts`, `ai/prompts/` | — (AI 层) | soul-engine |
| 5 | 灵田种植与收获 | B-α | `farm-engine.ts`, `seed-table.ts` | farm-tick (500:0) | shared/formulas |
| 6 | 弟子独立炼丹 | B-α | `alchemy-engine.ts`, `recipe-table.ts` | — (behavior-tree 内) | farm-engine |
| 7 | 概率突破引擎 | C | `breakthrough-engine.ts`, `realm-formulas.ts` | auto-breakthrough (200:10) | pill-consumer, realm-table |
| 8 | 灵脉密度系统 | C | `realm-table.ts` | — (core-production 内) | 修炼引擎 |
| 9 | 丹药自动消费 | C | `pill-consumer.ts` | boost-countdown (100:0), breakthrough-aid (200:0), cultivate-boost (700:0) | recipe-table, realm-formulas |
| 10 | Intent 行为模式 | D | `intent-executor.ts` | disciple-tick (600:0) | behavior-tree, farm/alchemy |
| 11 | 弟子间对话系统 | D | `dialogue-coordinator.ts` | dialogue-tick (650:0) | soul-engine, llm-adapter |
| 12 | 结构化日志系统 | D | `game-logger.ts` | — (TickContext 注入) | — |
| 13 | NPC 灵魂系统 | E | `soul-engine.ts`, `soul-evaluator.ts` | soul-tick (500:10), soul-event (625:0) | EventBus, trait-registry |
| 14 | 灵魂闭环（四层权重） | F | `behavior-tree.ts` (权重叠加) | — (disciple-tick 内) | soul-engine, 关系系统 |
| 15 | 地点标签系统（7 Zone） | F0-α | `zone-descriptions.ts` | — (encounter-tick 内) | — |
| 16 | 碰面检定引擎 | F0-α | `encounter-tick.handler.ts`, `encounter-templates.ts` | encounter-tick (610:0) | 地点标签, soul-engine |
| 17 | 宗门道风系统 | F0-α | `game-state.ts` (sectEthos) | — (soul-event 内) | encounter-engine |
| 18 | 世界事件池 + Storyteller | F0-β | `world-event-registry.ts`, `storyteller.ts` | world-event-tick (605:0) | EventBus, soul-engine |
| 19 | 五级事件漏斗 | F0-β | `world-event.ts` (WorldEventSeverity) | world-event-tick (605:0) | storyteller |
| 20 | AsyncAI Buffer | G | `async-ai-buffer.ts`, `action-executor.ts` | ai-result-apply (625:5) | soul-evaluator, llm-adapter |
| 21 | MUD 世界呈现 | H-α | `ui/mud-formatter.ts`, `zone-descriptions.ts` | — (UI 层) | idle-engine |
| 22 | 统一日志管线 | H-β | `idle-engine.ts` (onMudLog) | — (Engine 绑定) | game-logger |
| 23 | 掌门裁决 | H-γ | `ruling.ts`, `ruling-registry.ts` | — (world-event-tick 信号 → IdleEngine) | world-event, 道风系统 |
| 24 | 关系记忆 | IJ | `relationship-memory-manager.ts` | — (双写嵌入现有 handler) | soul-engine, encounter |
| 25 | 叙事片段 | IJ | `narrative-snippet-builder.ts` | — (AI 层) | relationship-memory |
| 26 | 个人目标系统 | J-Goal | `goal-manager.ts` | goal-tick (500:20) | soul-engine, behavior-tree |
| 27 | 因果引擎 | I-alpha | `causal-evaluator.ts`, `causal-rule-registry.ts` | causal-tick (612:0) | relationship-memory, goal-manager, encounter |

---

## §2 统计

- **已实现系统**：27 个
- **Pipeline Handler**：15 个（见 `arch/pipeline.md` §2）
- **涉及 Phase**：A, B-α, C, D, E, F, F0-α, F0-β, G, H-α, H-β, H-γ, IJ, J-Goal, I-alpha（共 15 个）

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-04-02 | Phase TG-3 新建，覆盖 A~I-alpha 全部 27 个系统 |
