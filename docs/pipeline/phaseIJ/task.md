# Phase IJ v3.0 — 执行追踪

> **开始日期**：2026-04-01 | **完成日期**：2026-04-01
> **执行角色**：/SGE | **TDD 版本**：v3.0

---

## 第一批（类型定义，并行）

| # | 任务 | 文件 | 状态 | 说明 |
|---|------|------|:----:|------|
| T1 | RelationshipMemory / KeyRelationshipEvent / 常量 / ContextLevel | `shared/types/relationship-memory.ts` | ✅ | 完整定义，含 EVENT_THRESHOLD=5, MAX_KEY_EVENTS=10 等常量 |
| T2 | 设计接口（CausalRule / PersonalGoal / T2NpcProfile） | `shared/types/causal-event.ts` + `personal-goal.ts` + `t2-npc.ts` | ✅ | 仅接口设计（设计定案），不含实现逻辑 |

## 第二批（核心逻辑）

| # | 任务 | 文件 | 状态 | 说明 |
|---|------|------|:----:|------|
| T3 | RelationshipMemoryManager 类 | `engine/relationship-memory-manager.ts` | ✅ | 运行时 Map 存储，含 recordEvent/recordEncounter/recordDialogue + 矛盾覆盖 + 软上限淘汰 |
| T4 | NarrativeSnippetBuilder（规则拼接 + 模板） | `ai/narrative-snippet-builder.ts` | ✅ | 三步规则拼接（框架短语 + 事件串联 + 归纳定性）+ 模板降级 + 缓存 |

## 第三批（集成）

| # | 任务 | 文件 | 状态 | 说明 |
|---|------|------|:----:|------|
| T5 | TickContext 扩展 | `engine/tick-pipeline.ts` | ✅ | 新增 optional 字段 relationshipMemoryManager? + narrativeSnippetBuilder? |
| T6 | idle-engine 实例化 + 注册 + 双写 | `engine/idle-engine.ts` | ✅ | 实例化 Manager + Builder，注入 TickContext |
| T7 | dialogue-coordinator 双写 | `engine/dialogue-coordinator.ts` | ✅ | recordDialogue 双向记录（A→B, B→A） |
| T8 | soul-engine 双写 + snippet 触发 | `engine/soul-engine.ts` | ✅ | recordEvent（|delta| >= 5 guard）+ updateNarrativeSnippet 调用 |
| T9 | buildRelationshipPromptSegment() L2/L6 | `ai/soul-prompt-builder.ts` | ✅ | L0→null, L2→好感+标签+1事件, L6→完整摘要+narrativeSnippet |
| T10 | SoulEvaluator 关系摘要注入 | `ai/soul-evaluator.ts` | ✅ | getContextLevel 动态切换 + evaluateEmotion 改为 named params |

## 第四批（验证 + 收尾）

| # | 任务 | 文件 | 状态 | 说明 |
|---|------|------|:----:|------|
| T11 | debug 命令 `relationships <弟子名>` | `ui/command-handler.ts` | ✅ | 含 escapeHtml 防 XSS |
| T12 | 回归测试 + 关系记忆专项测试 + narrative snippet 测试 | `scripts/verify-phaseIJ-relationship-memory.ts` | ✅ | 回归 64/64 + 专项 38/38 |
| T13 | 更新 arch/ 文档 | `docs/design/arch/` | ✅ | layers.md + pipeline.md + dependencies.md 已更新 |
| T14 | 宪法文档更新 | `CLAUDE.md` + `docs/project/MASTER-PRD.md` | ✅ | 模型 2B / prompt 1024 / 内存红线同步更新 |

## 第五批（PoC，可选）

| # | 任务 | 文件 | 状态 | 说明 |
|---|------|------|:----:|------|
| T15 | Narrative Snippet AI 预生成 PoC | — | ⏭️ 跳过 | Optional，登记为未来任务（IJ-11） |

---

## 统计

| 指标 | 值 |
|------|-----|
| 总任务 | 15 |
| 完成 | 14 |
| 跳过 | 1（T15, optional） |
| 阻塞 | 0 |
| 新增文件 | 7 |
| 修改文件 | 9 |
