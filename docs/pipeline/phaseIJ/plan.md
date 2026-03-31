# Phase IJ — 实施计划

> **日期**：2026-03-31 | **角色**：/SGA
> **版本**：v2.0（对齐 RelationshipMemory 模型）

---

## 实施顺序

### 第一批（类型定义，可并行）

| # | 任务 | 文件 | 复杂度 |
|---|------|------|:------:|
| T1 | RelationshipMemory / KeyRelationshipEvent / 常量 | `src/shared/types/relationship-memory.ts` | S |
| T2 | 设计接口（CausalRule / PersonalGoal / T2NpcProfile） | `src/shared/types/causal-event.ts` + `personal-goal.ts` + `t2-npc.ts` | S |

### 第二批（核心逻辑）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T3 | RelationshipMemoryManager 类（记录/查询/摘要构建/矛盾覆盖） | `src/engine/relationship-memory-manager.ts` | T1 |

### 第三批（集成）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T4 | TickContext 扩展 | `src/engine/tick-pipeline.ts` | T3 |
| T5 | idle-engine 实例化 + 注册 + 双写 | `src/engine/idle-engine.ts` | T3, T4 |
| T6 | dialogue-coordinator 双写 | `src/engine/dialogue-coordinator.ts` | T3 |
| T7 | soul-engine 双写 | `src/engine/soul-engine.ts` | T3 |
| T8 | buildRelationshipPromptSegment() | `src/ai/soul-prompt-builder.ts` | T1 |
| T9 | SoulEvaluator 关系摘要注入 | `src/ai/soul-evaluator.ts` | T3, T8 |

### 第四批（验证 + 收尾）

| # | 任务 | 文件 | 依赖 |
|---|------|------|:----:|
| T10 | debug 命令 `relationships <弟子名>` | `src/ui/command-handler.ts` | T3 |
| T11 | 回归 + 关系记忆专项测试 | `scripts/` | T1~T9 |
| T12 | 更新 arch/ 文档 | `docs/design/arch/` | T4 |

---

## 关键 ADR

| ADR | 决策 |
|-----|------|
| ADR-IJ-01 | RelationshipMemoryManager 在 engine/ 独立类，TickContext 注入 |
| ADR-IJ-02 | 运行时内存，PoC 不持久化 |
| ADR-IJ-03 | 双写策略（旧路径不变 + 新路径并行） |
| ADR-IJ-04 | 不新增 Pipeline handler（废弃 v1.0 的 505:0） |
| ADR-IJ-05 | 不硬编码 Prompt 注入量上限，由 PoC 确定 |
| ADR-IJ-06 | 设计接口放 shared/types |
