# Phase D — User Stories

> **Phase**: D (v0.4) | **系统**: AI 深化 + Log 系统 + Intent 重构
> **创建日期**: 2026-03-28
> **PRD 来源**: `docs/features/phaseD-PRD.md`
> **Story 数量**: 5 条

---

## 依赖拓扑

```
#1 Logger 基础设施 ──────────────────────────────────┐
#2 Intent 重构 (TD-003) ──┐                          │
#3 旁观评论 Fallback ──────┼──→ #4 AI 对话系统 ──→ #5 集成迁移
```

---

## Story #1 `[复杂度: S]`

> 作为**开发者**，我希望有一个结构化的 Logger 系统，以便于按类别和级别追踪游戏运行事件并持久化到 IndexedDB。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) |
|-----|-----------------|----------------|----------------|
| 1 | GameLogger 实例已创建 | 调用 `logger.info(LogCategory.ENGINE, 'idle-engine', '引擎已启动')` | LogEntry 被写入内存缓冲区，包含 timestamp/level/category/source/message |
| 2 | 缓冲区有 50 条日志 | 30s 定时器触发 flush | 日志批量写入 IndexedDB `7game-logs` store，缓冲区清空 |
| 3 | IndexedDB 中日志数据总量超过 1MB | flush 执行时 | 自动删除最旧 50% 条目（rotation），写入新日志后总量 ≤ 1MB |
| 4 | Logger 级别设为 INFO | 调用 `logger.debug(...)` | 该条日志**不**进入缓冲区（被过滤） |
| 5 | 缓冲区已有 500 条日志（上限） | 新日志写入 | 最旧的日志被移除，缓冲区保持 ≤ 500 条 |
| 6 | 页面即将关闭 (beforeunload) | 触发紧急 flush | 缓冲区内容同步写入 IndexedDB |

**依赖**: 无

---

## Story #2 `[复杂度: M]`

> 作为**开发者**，我希望 behavior-tree 重构为 Intent 模式，以便于引擎能在执行前看到全部弟子意图并协调跨弟子交互。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) |
|-----|-----------------|----------------|----------------|
| 1 | 弟子 A 行为计时器归零 | `planIntent(A, deltaS, state)` 调用 | 返回 `BehaviorIntent { type: 'end-behavior', oldBehavior: 'alchemy', auraReward: 4 }`，**不修改** state |
| 2 | 弟子 A 当前 IDLE | `planIntent(A, deltaS, state)` 调用 | 返回 `BehaviorIntent { type: 'start-behavior', newBehavior: 'farm', duration: 25 }`，**不修改** state |
| 3 | 4 名弟子的 Intent 已收集 | `executeIntents(intents, state)` 调用 | state 被统一修改（灵气奖励、行为切换、FARM/ALCHEMY 引擎触发），返回 `DiscipleBehaviorEvent[]` |
| 4 | Intent 中有 FARM start | executeIntents 执行 | `tryPlant(d, state)` 在 executeIntents 内调用，副作用在此处集中执行 |
| 5 | Intent 中有 ALCHEMY end | executeIntents 执行 | `settleAlchemy(d, state)` 在 executeIntents 内调用，日志正确收集 |
| 6 | 重构后运行全部 56 条回归测试 | `npx tsx scripts/regression-all.ts` | 全部通过（0 failure），结果与重构前一致 |

**依赖**: Story #1（使用 Logger 输出调试日志）

---

## Story #3 `[复杂度: S]`

> 作为**玩家**，我希望弟子在旁观其他弟子行为结束时能说出符合情境的模板台词，以便于在 AI 不可用时也有社交互动感。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) |
|-----|-----------------|----------------|----------------|
| 1 | AI fallback 模式 + 弟子 B 旁观弟子 A 炼丹成功 | 调用 `generateBystaderLine('alchemy-success', B.personality)` | 返回一句旁观评论（如"哟，又出丹了？让我看看品质"），非空，非普通行为台词 |
| 2 | 弟子 B 性格 aggressive ≥ 0.7 | 生成旁观评论 | 台词带性格前缀（如"哼！你的丹药能跟我比？"） |
| 3 | outcomeTag 为 5 种之一 (alchemy-success/alchemy-fail/harvest/meditation/explore-return) | 调用 fallback | 每种 outcomeTag 至少有 5 条模板台词 |
| 4 | outcomeTag 为 'rest' 或未知 | 调用 fallback | 返回 null（不触发旁观评论） |

**依赖**: 无

---

## Story #4 `[复杂度: M]`

> 作为**玩家**，我希望弟子行为结束时有概率触发另一名弟子的旁观评论，并且发起弟子可以回应，以便于感受弟子间的社交互动和宗门生活氛围。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) |
|-----|-----------------|----------------|----------------|
| 1 | 弟子 A 炼丹结束（成功） | DialogueCoordinator 检查触发 | 以 50% 概率生成 DialogueTrigger，选择 1 名非冷却中弟子 B 作为 responder |
| 2 | DialogueTrigger 已生成，AI 后端可用 | AI `generateDialogue()` 调用 | 返回 ≤ 2 轮 `DialogueRound[]`：[B评论, A回应]，每轮台词非空 |
| 3 | DialogueTrigger 已生成，AI 后端**不**可用 | fallback 触发 | 使用 Story #3 的旁观评论模板，仅生成 1 轮（B评论），无 A 回应 |
| 4 | 弟子 B 在 60s 内已作为 responder 参与过对话 | A 行为结束且触发概率命中 | B 被跳过（冷却中），选择其他非冷却弟子；若全部冷却，本次不触发 |
| 5 | 同一 tick 内 2 名弟子同时行为结束 | DialogueCoordinator 处理 | 最多触发 1 组对话（R-D1c 限制） |
| 6 | 对话完成（含 rounds） | MUD 日志输出 | 格式：`[对话] B对A说："台词"` `[对话] A回应："台词"`，颜色区分于普通行为日志 |
| 7 | 对话完成 | 短期记忆更新 | 双方 AISoulContext.shortTermMemory 各追加本次对话摘要 |
| 8 | AI 单轮推理超过 5s | 超时处理 | 该轮降级为 fallback 台词，不阻塞后续流程 |

**依赖**: Story #2（Intent 模式提供全弟子意图视图）, Story #3（fallback 台词池）

---

## Story #5 `[复杂度: S]`

> 作为**开发者**，我希望全局 console.log 替换为 Logger 调用，并验证对话系统端到端功能正常，以便于所有系统事件可按类别追踪。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) |
|-----|-----------------|----------------|----------------|
| 1 | 全部 9 处 console.log 已替换 | `grep -r "console.log" src/` 搜索 | 返回 0 结果（除开发调试入口外无 console.log） |
| 2 | 引擎运行 60s | 检查 IndexedDB `7game-logs` store | 存在 ≥ 10 条 LogEntry，涵盖 ENGINE + DISCIPLE + AI 三个 category |
| 3 | 引擎运行 120s，AI fallback 模式 | 观察 MUD 日志 | 至少出现 1 次弟子间对话（50% 概率 × ~8 次行为结束 ≈ 期望 4 次） |
| 4 | 回归测试 | `npx tsx scripts/regression-all.ts` | 全部 56 条通过，无回归 |
| 5 | 开发者查看 IndexedDB | 打开 DevTools → Application → IndexedDB → 7game-logs | 日志条目可按 timestamp 排序浏览，结构清晰 |

**依赖**: Story #1, #2, #4

---

## 复杂度与预估

| Story | 复杂度 | 预估 | 关键风险 |
|-------|--------|------|---------|
| #1 Logger 基础设施 | S | 0.5d | IndexedDB API 兼容性 |
| #2 Intent 重构 | M | 1d | FARM/ALCHEMY 副作用迁移需谨慎 |
| #3 旁观评论 Fallback | S | 0.5d | 台词质量 |
| #4 AI 对话系统 | M | 1.5d | AI 延迟 × 2轮 = 性能风险 |
| #5 集成迁移 | S | 0.5d | — |
| **总计** | — | **4d** | — |
