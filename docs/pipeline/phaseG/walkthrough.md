# Phase G — AI 觉醒 Walkthrough

> **Phase**：G | **SGE 完成日期**：2026-03-30
> **TDD**：[phaseG-TDD.md](../../design/specs/phaseG-TDD.md)
> **PRD**：[phaseG-PRD.md](../../features/phaseG-PRD.md)

---

## 变更清单

### 新建文件（6）

| # | 文件 | 层级 | 行数 | 职责 |
|---|------|:----:|:----:|------|
| 1 | `src/engine/async-ai-buffer.ts` | ② | ~95 | 异步 AI 请求队列（TTL+去重+容量驱逐） |
| 2 | `src/engine/handlers/ai-result-apply.handler.ts` | ② | ~80 | Pipeline Handler：drain AI 结果 + correctionDelta 应用 |
| 3 | `src/engine/action-executor.ts` | ② | ~100 | AI 决策→GameState 效果映射（I1 中介） |
| 4 | `src/ai/soul-evaluator.ts` | ③ | ~350 | 中央 AI 评估服务（3 种调用模式） |
| 5 | `src/ai/few-shot-examples.ts` | ③ | ~65 | 按道德阵营 few-shot 示例（反派偏置修复） |
| 6 | `src/ai/action-pool-builder.ts` | ③ | ~130 | 行为动作候选池（GBNF enum 约束） |

### 修改文件（6）

| # | 文件 | 变更内容 |
|---|------|---------|
| 1 | `src/engine/tick-pipeline.ts` | TickContext +asyncAIBuffer 可选字段 |
| 2 | `src/engine/idle-engine.ts` | 实例化 AsyncAIBuffer + 注册 ai-result-apply handler + context 注入 |
| 3 | `src/engine/handlers/soul-event.handler.ts` | severity 路由 + AI 异步提交（RIPPLE/SPLASH/STORM） |
| 4 | `src/ai/soul-prompt-builder.ts` | +SectContext +describeEthos +describeMoral + trait hint 注入 |
| 5 | `src/main.ts` | SoulEvaluator 初始化 + auto-connect + initSoulEventEvaluator 注入 |
| 6 | `src/engine/soul-engine.ts` | 导出 fallbackEvaluate 供 handler 引用 |

### 架构文档更新（5）

| 文件 | 变更 |
|------|------|
| `arch/pipeline.md` | +ai-result-apply(625:5) Handler; TickContext +asyncAIBuffer; Handler 12→13 |
| `arch/layers.md` | Engine 22→25; AI 5+→8+ |
| `arch/dependencies.md` | +6 条新依赖（async-ai-buffer, ai-result-apply, action-executor, soul-event 扩展） |
| `MASTER-ARCHITECTURE.md` | v1.4 变更日志 |
| `tech-debt.md` | TD-006 部分清偿说明 |

---

## 验证结果

### TypeScript 编译

```
npx tsc --noEmit → 零错误
```

### 全量回归

```
regression-all.ts → 64 passed / 0 failed ✅
```

### User Story AC 覆盖

| Story | ACs | 通过 | 说明 |
|-------|:---:|:----:|------|
| #1 异步 AI 缓冲区 | 5 | 5/5 ✅ | TTL/去重/驱逐/correctionDelta 全覆盖 |
| #2 AI 情绪评估接入 | 4 | 4/4 ✅ | severity 路由 + canCall 限速 |
| #3 宗门道风 Prompt 注入 | 4 | 4/4 ✅ | 5 级 ethos + 5 级 discipline 阈值映射 |
| #4 特性 aiHint 注入 | 3 | 3/3 ✅ | eval + monologue 双路径注入 |
| #5 反派偏置修复 | 5 | 5/5 ✅ | few-shot + describeMoral + 候选池过滤 |
| #6 Lv.2 AI 独白渲染 | 3 | 3/3 ✅ | SPLASH→monologue + `[灵魂·AI]` 日志 |
| #7 Lv.3 AI 双阶段决策 | 6 | 5/6 ⚠️ | AC6 P95 ≤ 1500ms 需实游 profiling |

**总计**：25/26 AC ✅，1 AC ⚠️（P95 需实游验证，架构层面已满足 800ms+700ms budget）

### Invariant 验证

| # | 不变量 | 验证方式 | 结果 |
|---|--------|---------|:----:|
| I1 | AI 不直接写 GameState | 代码审查：AI 输出经 soul-engine/action-executor 中介 | ✅ |
| I2 | AI 不阻塞 Tick | 代码审查：AsyncAIBuffer fire-and-forget | ✅ |
| I3 | AI 离线 fallback | 代码审查：evaluator=null 时跳过 AI 路由 | ✅ |
| I4 | delta 硬上限 | 代码审查：clampDelta 在 ai-result-apply 中执行 | ✅ |
| I5 | 候选池硬约束 | 代码审查：json_schema enum 限制 | ✅ |
| I6 | 零存档迁移 | 代码审查：无新 GameState 字段 | ✅ |

---

## Party Review（GATE 3）

### R1 魔鬼PM（3 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | AC 覆盖 | ✅ | 25/26 AC 通过，1 AC 需实游验证（非代码缺陷） |
| 2 | 需求债务 | ✅ | FB-010 部分清偿（action-executor）；FB-012 部分清偿（AI 独白 MUD 输出） |
| 3 | 范围控制 | ✅ | 6 新文件 + 6 修改，符合 TDD 定义范围 |

### R6 找茬QA（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 回归 | ✅ | 64/64 通过 |
| 2 | 类型安全 | ✅ | tsc --noEmit 零错误 |
| 3 | 边界值 | ✅ | TTL 过期 / MAX_PENDING 驱逐 / 候选池最少 2 / 中立无 few-shot |
| 4 | 错误恢复 | ✅ | Promise catch 静默 / AbortError / JSON parse 容错 |
| 5 | 存档安全 | ✅ | 零存档变更 |

### R7 资深程序员（7 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 代码质量 | ✅ | 清晰的关注点分离：buffer/evaluator/executor 各司其职 |
| 2 | 命名规范 | ✅ | 文件名/函数名与项目既有模式一致 |
| 3 | 错误处理 | ✅ | AI 失败路径全部静默降级，不影响游戏流程 |
| 4 | 性能 | ✅ | 同步 fallback 不增加 tick 延迟；异步 AI 不阻塞 |
| 5 | 可维护性 | ✅ | 模块注入模式避免硬耦合；常量可调参 |
| 6 | 安全性 | ⚠️ | soul-evaluator 的 dynamic import (`await import('./soul-prompt-builder')`) 用于 describeMoral — 建议改为静态 import |
| 7 | 文档同步 | ✅ | pipeline/layers/dependencies/tech-debt 均已更新 |

**GATE 3 最终判定**：✅ PASS（14 PASS + 1 WARN，R7-6 动态 import 不阻塞）
