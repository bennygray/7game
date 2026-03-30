# Phase G — AI 觉醒 实施计划

> **Phase**：G | **SGA 日期**：2026-03-30
> **TDD**：[`phaseG-TDD.md`](../../design/specs/phaseG-TDD.md)
> **PRD**：[`phaseG-PRD.md`](../../features/phaseG-PRD.md)

---

## 实施顺序

### 阶段 1：G0 异步基础设施（前置条件）

| 步骤 | 任务 | 文件 | 依赖 |
|:----:|------|------|------|
| 1.1 | 创建 AsyncAIBuffer 类 | `src/engine/async-ai-buffer.ts` [NEW] | — |
| 1.2 | 创建 ai-result-apply handler | `src/engine/handlers/ai-result-apply.handler.ts` [NEW] | 1.1 |
| 1.3 | TickContext 添加 asyncAIBuffer 字段 | `src/engine/tick-pipeline.ts` [MOD] | 1.1 |
| 1.4 | IdleEngine 实例化 buffer + 注册 handler + 注入 context | `src/engine/idle-engine.ts` [MOD] | 1.1, 1.2, 1.3 |

**验证**：TypeScript 编译通过 + regression 64/64

### 阶段 2：G1+G5+G6 AI 评估服务 + Prompt 增强

| 步骤 | 任务 | 文件 | 依赖 |
|:----:|------|------|------|
| 2.1 | soul-prompt-builder 新增 SectContext/describeEthos/describeMoral | `src/ai/soul-prompt-builder.ts` [MOD] | — |
| 2.2 | 创建 SoulEvaluator 中央评估服务 | `src/ai/soul-evaluator.ts` [NEW] | 2.1 |
| 2.3 | soul-event.handler 扩展 severity 路由 + AI 提交 | `src/engine/handlers/soul-event.handler.ts` [MOD] | 阶段1, 2.2 |
| 2.4 | main.ts 初始化 SoulEvaluator + auto-connect | `src/main.ts` [MOD] | 2.2, 2.3 |

**验证**：TypeScript 编译 + regression + AI 离线时 fallback 正常

### 阶段 3：G3 反派偏置修复

| 步骤 | 任务 | 文件 | 依赖 |
|:----:|------|------|------|
| 3.1 | 创建 few-shot 示例库 | `src/ai/few-shot-examples.ts` [NEW] | — |
| 3.2 | SoulEvaluator 集成 few-shot + describeMoral | `src/ai/soul-evaluator.ts` [MOD] | 3.1, 2.1 |

**验证**：TypeScript 编译 + 检查 evil 弟子 prompt 包含邪恶示例

### 阶段 4：G4 行为决策系统

| 步骤 | 任务 | 文件 | 依赖 |
|:----:|------|------|------|
| 4.1 | 创建行为动作候选池构建器 | `src/ai/action-pool-builder.ts` [NEW] | — |
| 4.2 | 创建 AI 行为执行器（决策→GameState 中介） | `src/engine/action-executor.ts` [NEW] | — |
| 4.3 | SoulEvaluator 集成双阶段 Pipeline | `src/ai/soul-evaluator.ts` [MOD] | 4.1 |
| 4.4 | soul-event.handler 集成 STORM 路由 | `src/engine/handlers/soul-event.handler.ts` [MOD] | 4.2, 4.3 |

**验证**：TypeScript 编译 + regression + STORM 事件触发双阶段调用

### 阶段 5：架构文档更新

| 步骤 | 任务 | 文件 |
|:----:|------|------|
| 5.1 | pipeline.md Handler 12→13 + TickContext 更新 | `docs/design/arch/pipeline.md` |
| 5.2 | layers.md +6 新文件 | `docs/design/arch/layers.md` |
| 5.3 | dependencies.md +10 新依赖 | `docs/design/arch/dependencies.md` |
| 5.4 | tech-debt.md TD-006 更新 | `docs/project/tech-debt.md` |
| 5.5 | handoff.md Phase G 交付记录 | `docs/project/handoff.md` |

### 阶段 6：G7 验证

- [ ] TypeScript 编译零错误
- [ ] regression-all.ts 64/64 通过
- [ ] AI 离线时 fallback 正常运行
- [ ] AI 在线时 Lv.2 事件触发独白
- [ ] AI 在线时 Lv.3 事件触发双阶段决策
- [ ] 反派弟子不默认选善良选项
- [ ] tick pipeline 不被 AI 调用阻塞

---

## 文件变更汇总

| 类型 | 文件 | Phase |
|:----:|------|:-----:|
| NEW | `src/engine/async-ai-buffer.ts` | G0 |
| NEW | `src/engine/handlers/ai-result-apply.handler.ts` | G0 |
| NEW | `src/ai/soul-evaluator.ts` | G1 |
| NEW | `src/ai/few-shot-examples.ts` | G3 |
| NEW | `src/ai/action-pool-builder.ts` | G4 |
| NEW | `src/engine/action-executor.ts` | G4 |
| MOD | `src/engine/tick-pipeline.ts` | G0 |
| MOD | `src/engine/idle-engine.ts` | G0 |
| MOD | `src/engine/handlers/soul-event.handler.ts` | G1/G2/G4 |
| MOD | `src/ai/soul-prompt-builder.ts` | G5/G6 |
| MOD | `src/main.ts` | G1 |
