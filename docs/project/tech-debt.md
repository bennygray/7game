 # 技术债务登记簿

> **维护者**：/SGA, /SGE
> **规则**：新增债务必须记录来源（哪个 Phase/Review 产生的），清偿时标记日期和 PR/commit。
> **索引入口**：[docs/INDEX.md](../INDEX.md)

---

## 活跃债务

| # | 债务描述 | 来源 | 优先级 | 影响范围 | 计划清偿 |
|---|---------|------|:------:|---------|---------|
| TD-001 | `breakthroughCooldown` 通过 TickContext 暴露，打破 IdleEngine 封装。可考虑移入 GameState 或引入 EngineInternalState | Phase 4 Pipeline 重构 — R5 WARN | P3 | idle-engine, auto-breakthrough handler | 下次触及突破系统时 |
| TD-002 | `core-production` Handler 内联在 idle-engine.ts，未拆分为独立文件。灵气/悟性/灵石/时间/统计 6 步紧密耦合 | Phase 4 Pipeline 重构 — 设计决策 | P2 | idle-engine | 专项引擎重构 Phase |
| TD-003 | ~~`behavior-tree.ts` 副作用模式（直接修改 state），需重构为 Intent 模式以支持弟子间交互~~ | Phase A 原始设计 — @deprecated-pattern 注释 | ~~P2~~ | behavior-tree, idle-engine | ✅ **Phase D 已清偿** — ADR-D01 planIntent+executeIntents |
| TD-004 | 缺少 Pipeline 层级的专项测试（handler 注册顺序、execute 执行顺序验证）。当前回归仅覆盖公式层 | Phase 4 SGE Review — R1/R6 WARN | P2 | tick-pipeline, regression-all.ts | 下次扩展 Pipeline 时 |
| TD-005 | TickPipeline.execute 无 try/catch，单个 handler 异常会中断整个 pipeline | Phase 4 SGE Review — R7 WARN | P3 | tick-pipeline | 下次触及 Pipeline 时 |
| TD-006 | AI 双向对话延迟（最坏 2×5s=10s）可能影响 MUD 日志体验连贯性 | Phase D SPM Review R2-D1 WARN + SGA ADR-D02 | P3 | dialogue-coordinator, llm-adapter | 🔶 **Phase G 部分清偿**：AsyncAIBuffer fire-and-forget 模式消除对话延迟对 tick 的阻塞；灵魂评估延迟通过 deferred correction 隐藏 |
| TD-007 | `behavior-tree.ts` L258-263 import 语句放在文件中间而非顶部，不符合项目规范 | Phase D SGE Review — R6-D1 WARN | P4 | behavior-tree.ts | 下次触及时 |
| TD-008 | `bystander-lines.ts` L77 性格阈值 0.7 未命名为常量; `game-logger.ts` 字节估算 200 未命名 | Phase D SGE Review — R7-D2 WARN | P4 | bystander-lines.ts, game-logger.ts | 下次触及时 |
| TD-009 | `tickDiscipleLegacyImpl` 与 `planIntent+executeIntents` 逻辑重复（@deprecated 向后兼容） | Phase D SGE Review — R7-D4 WARN | P3 | behavior-tree.ts | 下一 Phase 移除 @deprecated |
| TD-010 | `tryConnect` 使用 `this.http['baseUrl']` 访问私有字段，应改为公开 getter 或构造参数 | Phase D Hotfix Review | P4 | llm-adapter.ts | 下次触及时 |
| TD-011 | `docs/INDEX.md` 引用完整性无自动检查机制，已出现幽灵注册。需编写 `scripts/verify-docs-integrity.ts` | Pipeline 规范 Review WARN #2 | P3 | docs/INDEX.md, scripts/ | 下次有空时 |
| TD-012 | 关系系统数值参数（衰减率 ×0.98、标签乘数 ×1.3/×1.5/×0.5、衰减下限 5）均为设计估算值，未经 Monte Carlo 模拟验证。需编写 `scripts/simulate-relationship.ts` 进行参数敏感度分析 | Phase E PRD USER 反馈 | P2 | soul-engine, relationship-handler | Phase E Story #5 验证阶段 |
| TD-013 | `trait-registry.ts` 的 `generateInnateTraits` 函数中 0.8 概率常量（生成 1 个特性的概率）和 `disciple-generator.ts` 的 400 道德相似度归一化分母未命名为常量 | Phase E SGE Review — R7-D2 WARN | P4 | trait-registry.ts, disciple-generator.ts | 下次触及时 |
| TD-014 | `sympathy-handler.ts` 候选池数据清理逻辑中存在硬编码的清理阈值 0.15 | Phase E SGE Review — R7-D3 WARN | P4 | sympathy-handler.ts | 下次触及时 |
| TD-015 | 已有三个专用日志回调（farmLogs/systemLogs/discipleEvents）可逐步迁移到统一管线（onMudLog），消除冗余回调 | Phase H-β ADR-Hβ-01 | P3 | idle-engine.ts, main.ts | 后续 Phase 触及时 |
| TD-016 | MUD 显示类功能缺少自动化验证（当前为浏览器手动验证），未来可引入 E2E 测试框架 | Phase H-β SGA Review R4-D5/R6-D4 WARN | P3 | 测试框架 | 后续 Phase |
| TD-020 | 裁决系统缺少自动化验证脚本（ethosShift clamp、timeout 逻辑），可通过 mock inGameWorldTime 实现 | Phase H-γ SGE Review R6-D4 WARN | P3 | ruling 系统, scripts/ | 后续 Phase |
| TD-021 | `createRuling` 中事件文案渲染逻辑与 `world-event-tick.handler.ts:renderEventText` 高度相似（{D}/{D2} 模板替换），可抽取共享函数 | Phase H-γ SGE Review R7-D4 WARN | P4 | idle-engine.ts, world-event-tick.handler.ts | 下次触及时 |
| TD-022 | `engine-bindings.ts:scheduleAmbientBreath` 使用递归 setTimeout 无清理机制。当前全页刷新无影响，Electron 迁移时需实现 clearTimeout 或 AbortController | Phase X-α SGE Review R6-D4 WARN | P4 | engine-bindings.ts | Electron 迁移时 |
| **BUG-Xγ-01** | ~~`log-manager.ts:renderLines()` 每次 addMainLog 全量 innerHTML 替换 200 行 DOM，导致每秒 ~3000 节点创建/销毁，内存线性暴涨直至系统死机~~ | Phase X-α 引入 — USER 报告 P0 | **P0** | log-manager.ts | ✅ **Phase X-γ 已清偿** |
| TD-023 | z-index 层级管理：flash-overlay(9999) / cmd-area(1000) / panel-overlay(900)。当前手动管理，未来可引入 z-index 常量表 | Phase X-γ ADR-Xγ-01 | P4 | mud-theme.css | 后续 Phase |
| TD-024 | `no-floating-promises`：5 处未处理的 Promise 可能吞掉异步错误 — `game-logger.ts:174,252` / `main.ts:81,89` / `engine-bindings.ts:199` | ESLint 审计 (V0.4.10) | P2 | game-logger, main, engine-bindings | 下次触及时 |
| TD-025 | `require-await`：4 处 async 函数无 await — `llm-adapter.ts:72,90,94,98`（TemplateLLMAdapter 的 mock 方法）。要么去掉 async，要么确认接口需要 | ESLint 审计 (V0.4.10) | P3 | llm-adapter.ts | 下次触及时 |
| TD-026 | `unbound-method`：4 处方法引用未绑定 this — `main.ts:74` / `command-handler.ts:212` / `engine-bindings.ts:68(×2)`。可能导致运行时 this 指向错误 | ESLint 审计 (V0.4.10) | P3 | main, command-handler, engine-bindings | 下次触及时 |
| TD-027 | `prefer-promise-reject-errors`：2 处 reject 非 Error 对象 — `game-logger.ts:65,79`。不利于错误追踪 | ESLint 审计 (V0.4.10) | P4 | game-logger.ts | 下次触及时 |
| TD-028 | `arch/layers.md` §2 缺少 9 个 Data 层文件注册（encounter-templates.ts、world-event-registry.ts、zone-descriptions.ts、ruling.ts、ruling-registry.ts、encounter.ts、world-event.ts、relationship-formulas.ts、causal-rule-registry.ts），导致 MASTER-ARCH §1 文件计数不准 | Phase TG-3 Gate 1 R5-D5 WARN | P2 | arch/layers.md, MASTER-ARCHITECTURE.md | 下次触及架构文档时 |
| TD-029 | CLAUDE.md "灵田(2格)" vs MASTER-PRD "无限格，弟子×3块" 数值不一致，属历史遗留。两个文档对灵田格数描述矛盾 | Phase TG-3 Gate 1 R1-D3 WARN | P3 | CLAUDE.md, MASTER-PRD.md | 下次触及灵田系统时 |

---

## 已清偿

| # | 债务描述 | 清偿日期 | 清偿方式 |
|---|---------|---------|---------|
| TD-003 | `behavior-tree.ts` 副作用模式，重构为 Intent 模式 | 2026-03-28 | Phase D ADR-D01: planIntent 纯函数 + executeIntents 副作用集中 |
