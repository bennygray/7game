# Phase I-beta: SGE Walkthrough

> 编码实施过程记录

## 执行策略

采用 6 层编码计划 (TDD §4)，从数据层向上逐层修改：

```
L0 Data → L1 Formula → L2 Registry → L3 Engine → L4 Handler → L5 AI/UI → L6 New
```

## 关键决策

### ADR-Iβ-01: social-tick 独立 handler
社交扫描不复用 causal-tick，新建 social-tick handler (phase=612, order=5)。
原因：职责不同，social-tick 是唯一写入 edge.status 的模块。

### ADR-Iβ-02: 一次性全量重命名 affinity→closeness
99 处引用跨 20+ 文件，采用 one-shot 全量重命名而非渐进。
原因：减少中间不一致状态，tsc 可立即验证。

### ADR-Iβ-03: 复用 AsyncAIBuffer
社交邀约 AI 调用通过现有 AsyncAIBuffer 异步提交，延迟 2-3 ticks。
原因：避免新建异步基础设施，当前延迟可接受。

### ADR-Iβ-04: KeyRelationshipEvent 保持单值 closenessDelta
不扩展为三维 delta，节省 prompt tokens。
原因：历史事件只需记录最显著维度变化。

## 编码过程

1. **L0 类型层**: 修改 5 个类型文件，定义三维向量结构
2. **L1-L5 适配**: 并行 agent 修改 20+ 文件，消除 70+ tsc 错误
3. **L6 新文件**: 创建 SocialEngine、social-tick handler、MUD 模板
4. **Pipeline 注册**: TickContext +socialEngine, idle-engine 注册 handler
5. **验证**: tsc 0 errors → regression 111/0 → social verify 78/0

## 遇到的问题

- Gate 2 BLOCK: TDD 遗漏 createDefaultLiteGameState 版本更新 → 补充 §2.0
- Gate 2 WARN: rate-limiter 缺少伪代码 → 补充算法描述
- social-tick.handler 使用了错误的 logger API (addEntry vs info) → 立即修复
- social-engine.ts 有未使用的 import → 清理
- V-4 断言使用了错误的函数签名 → 修正为实际 API

## 变更文件清单 (30+ 文件)

### 新建 (3)
- `src/engine/social-engine.ts`
- `src/engine/handlers/social-tick.handler.ts`
- `src/shared/data/social-event-templates.ts`

### 修改 — 类型 (5)
- `src/shared/types/game-state.ts`
- `src/shared/types/soul.ts`
- `src/shared/types/causal-event.ts`
- `src/shared/types/encounter.ts`
- `src/shared/types/relationship-memory.ts`

### 修改 — 引擎 (10)
- `src/engine/soul-engine.ts`
- `src/engine/disciple-generator.ts`
- `src/engine/save-manager.ts`
- `src/engine/relationship-memory-manager.ts`
- `src/engine/causal-evaluator.ts`
- `src/engine/goal-manager.ts`
- `src/engine/action-executor.ts`
- `src/engine/tick-pipeline.ts`
- `src/engine/idle-engine.ts`
- `src/engine/handlers/encounter-tick.handler.ts`

### 修改 — AI (4)
- `src/ai/soul-prompt-builder.ts`
- `src/ai/few-shot-examples.ts`
- `src/ai/soul-evaluator.ts`
- `src/ai/narrative-snippet-builder.ts`

### 修改 — UI (2)
- `src/ui/mud-formatter.ts`
- `src/ui/command-handler.ts`

### 修改 — 数据 (3)
- `src/shared/formulas/relationship-formulas.ts`
- `src/shared/data/causal-rule-registry.ts`
- `src/shared/data/encounter-templates.ts`
- `src/shared/data/emotion-pool.ts`

### 修改 — Handler (1)
- `src/engine/handlers/ai-result-apply.handler.ts`

### 验证脚本 (2)
- `scripts/verify-social-system.ts` (新建)
- `scripts/regression-all.ts` (追加 social suite)
