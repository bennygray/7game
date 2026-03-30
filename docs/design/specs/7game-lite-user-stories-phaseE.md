# Phase E — User Stories

> **Phase**: E (v0.5) | **系统**: NPC 灵魂系统（道德 × 特性 × 关系 × AI 事件评估）
> **创建日期**: 2026-03-29
> **PRD 来源**: `docs/features/phaseE-PRD.md`
> **Story 数量**: 5 条

---

## 依赖拓扑

```
#1 道德+特性+关系 数据层 ─────────────────────┐
#2 事件总线 ──────────────────────────────────┼─→ #4 AI 三层流水线 ──→ #5 集成闭环+迁移
#3 规则引擎（候选池+后处理） ─────────────────┘
```

---

## Story #1 `[复杂度: M]`

> 作为**开发者**，我希望弟子拥有道德双轴值、特性列表和升级版关系边，以便于 AI 评估器和规则引擎有结构化的人格数据可用。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 新游戏创建 | `createDefaultLiteGameState()` 调用 | 每个弟子拥有 `moral: { goodEvil, lawChaos }` 字段，值在 [-30, +30] 范围内 | PRD §3.1 R-E1 |
| 2 | 新游戏创建 | 弟子生成 | 每个弟子拥有 1~2 个先天特性 `traits: DiscipleTrait[]`，每个 trait 的 `defId` 存在于 `TRAIT_REGISTRY` 中（12 个定义，见 PRD §3.2） | PRD §3.2 T1~T12 |
| 3 | `TRAIT_REGISTRY` 已定义 | 查看注册表 | 包含 12 个 TraitDef（见 PRD §3.2 完整定义表），覆盖 positive(5: loyal/empathetic/grateful/adventurous/compassionate) / negative(4: greedy/envious/vengeful/timid) / neutral(3: proud/stubborn/ambitious) | PRD §3.2 L128~L146 |
| 4 | 新游戏创建 | 关系边生成 | `RelationshipEdge` 包含 `affinity = randomInt(-10,10) + moralBonus(A,B)`（公式见 PRD §3.3 L180~L192）、`tags: []`、`lastInteraction` | PRD §3.3 R-E9 |
| 5 | 存档 v3 加载 | `migrateV3toV4()` 调用 | 自动为所有弟子补充 `moral`（随机）、`traits`（随机 1 先天）、关系边升级为带 `affinity/tags/lastInteraction` 格式 | — |

**依赖**: 无

---

## Story #2 `[复杂度: S]`

> 作为**开发者**，我希望有一个事件总线系统，以便于游戏中的各种事件能被发布并被 AI 评估器订阅。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | EventBus 实例已创建 | `eventBus.emit('alchemy-success', { discipleId, quality, ... })` | 事件被分发到所有注册的监听器 | — |
| 2 | AI SoulEvaluator 已订阅 | 事件发出 | evaluator 收到事件，为每个相关弟子触发评估（不在 tick 热循环中，使用 setTimeout/microtask） | — |
| 3 | 无监听器注册 | 事件发出 | 事件静默丢弃，无报错，引擎正常运行（I2 fallback） | — |
| 4 | 同一 tick 内发出 3 个事件 | tick 结束 | 事件按顺序处理，不重叠（队列模式） | — |

**依赖**: 无

---

## Story #3 `[复杂度: M]`

> 作为**开发者**，我希望规则引擎能根据事件类型×关系×道德预筛情绪候选池，并在 AI 输出后执行 Delta 方向修正，以便于 AI 评估结果既有创意又保证数值正确性。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 事件类型=`alchemy-success`，反应者角色=`observer` | `buildCandidatePool(event, subject)` | 返回 4 个候选情绪 `['admiration', 'envy', 'joy', 'neutral']`，非空 | PRD §3.4.2 映射表 内联 |
| 2 | 事件类型=`alchemy-fail`，反应者角色=`self` | `buildCandidatePool(event, subject)` | 返回 `['sadness', 'anger', 'shame', 'neutral']`（PRD §3.4.2 负面事件 self 池） | PRD §3.4.2 内联 |
| 3 | AI 输出 `delta=+10`，反应者角色=`self`，事件正负性=负面 | `correctDeltaDirection(delta, role, eventPolarity)` | 返回 `-10`（负面事件 self 的 delta 强制为负） | PRD §3.4.3 修正规则表 |
| 4 | AI 输出 `delta=+8`，反应者角色=`self`，事件正负性=正面 | `correctDeltaDirection(delta, role, eventPolarity)` | 返回 `+8`（正面事件 self 的 delta 保持正向） | PRD §3.4.3 修正规则表 |
| 5 | AI 输出 `delta=+15`（超出范围） | `clampDelta(delta)` | 返回 `+5`（R-E11 夹值 [-5, +5]） | PRD §3.3 R-E11 |
| 6 | 反应者角色=`observer` | `correctDeltaDirection(delta, role, eventPolarity)` | 返回原始 delta（观察者不干预方向） | PRD §3.4.3 修正规则表 |

**依赖**: Story #1（需要道德/特性/关系数据）

---

## Story #4 `[复杂度: L]`

> 作为**玩家**，我希望弟子在宗门事件发生时能展现出符合其道德/特性的差异化内心反应，并在 MUD 日志中看到情绪标签和内心独白，以便于感受每个弟子都有独特的「灵魂」。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 弟子 A 炼丹成功，AI 后端可用 | SoulEvaluator 处理事件 | 为相关弟子生成 `SoulEvaluationResult`（emotion + intensity + deltas + innerThought），JSON 格式正确 | PRD §3.5 接口定义 |
| 2 | 弟子 A 炼丹成功，AI 后端**不**可用 | SoulEvaluator fallback | 从候选池随机选 1 情绪，intensity固定 2，delta 按事件正负性固定(+1/-1/0)，innerThought 从 Fallback 模板表随机选 1 条 | PRD §3.5.1 Fallback 规则+模板表(L311~L337) |
| 3 | AI 返回结果 | 后处理执行 | delta 方向修正（PRD §3.4.3）+ 夹值到 [-5, +5]（R-E11）+ 写入 GameState 关系边 | PRD §3.4.3 + §3.3 R-E11 |
| 4 | 关系边 affinity 变化后 | 标签检查 | affinity ≥60 自动添加 `friend` 标签；≤-60 自动添加 `rival` 标签（迟滞区间见 PRD §3.3 R-E12~R-E13） | PRD §3.3 标签触发表(L196~L208) |
| 5 | AI 评估完成 | MUD 日志输出 | 格式：`[灵魂] 张清风感到 愤怒(3)：「此乃天下之大不义！」`，颜色区分于普通行为日志 | — |
| 6 | 关系衰减时间到达 | 每 5 分钟 tick | 所有关系边 affinity 乘以 0.98 向 0 衰减（R-E15: \|affinity\|≤5 时停止衰减） | PRD §3.3 R-E10 + R-E15 |
| 7 | AI 单次推理超过 5s | 超时处理 | 降级为 fallback 结果，不阻塞引擎 | — |
| 8 | 8 弟子同一 tick 内多事件并发 | 评估队列处理 | 队列串行处理，每个评估独立，总延迟 ≤ 8×P95(1.2s) ≈ 9.6s 内完成 | — |

**依赖**: Story #1, #2, #3

---

## Story #5 `[复杂度: S]`

> 作为**开发者**，我希望存档从 v3 迁移到 v4，并验证灵魂系统端到端闭环正常运行，以便于确认所有系统无回归。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | v3 存档加载 | `migrateV3toV4()` | 所有弟子获得道德/特性/升级关系边，version 更新为 4 | — |
| 2 | v4 新游戏运行 5 分钟 | 观察 MUD 日志 | 至少出现 3 次 `[灵魂]` 标签的情绪反应日志 | — |
| 3 | 运行 5 分钟后 | 检查关系边 | 至少 1 对弟子的 affinity 从初始值发生变化 | — |
| 4 | 回归测试 | `npx tsx scripts/regression-all.ts` | 全部现有测试通过 + 新增 Phase E 专项测试通过 | — |
| 5 | Phase E 验证脚本 | `npx tsx scripts/verify-phaseE.ts` | 10 组数值验证通过：道德初始范围(R-E1)、特性分配(R-E5~R-E8)、关系衰减(R-E10+R-E15)、delta 夹值(R-E11)、标签触发(R-E12) | 脚本 Case #1~#10 |

**依赖**: Story #1, #2, #3, #4

---

## 复杂度与预估

| Story | 复杂度 | 预估 | 关键风险 |
|-------|--------|------|---------|
| #1 数据层（道德+特性+关系） | M | 1d | 存档迁移 v3→v4 复杂度 |
| #2 事件总线 | S | 0.5d | 与 TickPipeline 的集成时机 |
| #3 规则引擎（候选池+后处理） | M | 1d | 候选池规则覆盖度 |
| #4 AI 三层流水线 | L | 2d | AI 并发推理 × 8 弟子延迟 |
| #5 集成闭环+迁移 | S | 0.5d | 回归测试 |
| **总计** | — | **5d** | — |
