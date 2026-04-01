# Phase J-Goal -- Gate 2 Party Review

> **日期**：2026-04-01
> **审查对象**：`docs/design/specs/phaseJ-goal-TDD.md` v1.0
> **评审角色**：R4 架构校验 / R5 恶魔辩护 / R6 完成度审计
> **前置文档**：PRD v1.0 (GATE 1 PASSED) / User Stories / MASTER-ARCHITECTURE v1.7

---

## 综合判定

**结果**：CONDITIONAL PASS
**统计**：1 BLOCK / 5 WARN

---

## L0：Content Traceability Pre-Check

> Gate 2（TDD 审查）跳过 L0，直接进入 L1。依据：review-protocol.md "SGA（TDD 审查）跳过 L0，直接进入 L1。"

---

## L1：维度穷举签字

### R4 -- 架构校验（Structural Integrity Auditor）

| 维度 | 判定 | 说明 | 证据 |
|------|:----:|------|------|
| D1 范围蔓延 | PASS | TDD 严格覆盖 PRD 定义的 5 个 GoalType + Layer 5 + 持久化 + MUD + Prompt，未引入超范围功能。新建文件 3 个（goal-data.ts, goal-manager.ts, goal-tick.handler.ts）均为 PRD 需求的直接实现。 | TDD S4 文件计划（L334-L361）严格对应 PRD ss3.1-ss3.7；CLAUDE.md IN/OUT 表中"弟子行为树(8 人 x 7 态)"覆盖目标驱动行为。 |
| D2 工期评估 | PASS | 15 个任务分解合理，关键路径为 T1->T2->T5->T7->T8，并行路径明确标注。复杂度估算 XS/S/M 符合实际（GoalManager 6 方法 = M，handler = S）。 | TDD S7 L455-L476；总估算约 4-5h（2 个 M + 5 个 S + 8 个 XS），未超过单 Phase 8h 红线。 |
| D3 依赖阻塞 | PASS | 无外部依赖。所有依赖均为已存在的内部模块（behavior-tree.ts, soul-engine.ts, tick-pipeline.ts）。Phase IJ v3.0 类型桩已交付（personal-goal.ts 在 src/shared/types/ 已存在，含 GoalType/PersonalGoal/MAX_ACTIVE_GOALS/GOAL_MULTIPLIER_CAP）。 | personal-goal.ts 实际存在（L1-L34, 7 type + interface + 2 const）。 |
| D4 路线图冲突 | PASS | J-Goal 来自 Roadmap J3+J4，与已完成的 Phase IJ v3.0 类型桩承接关系清晰。TDD 未与后续 Phase 冲突。 | SOUL-VISION-ROADMAP.md L311-L312 确认 J3=个人目标系统, J4=目标驱动行为。 |
| D5 交付验证 | PASS | S8 验证计划覆盖 8 个验证组，对应 7 个 US。Monte Carlo V4 覆盖 Layer 5 极端值（N>=1000）。回归 64 组 + tsc --noEmit。 | TDD S8 L481-L506；V1-V8 验证组与 US-JG-01~07 逐一映射。 |

### R5 -- 恶魔辩护（Devil's Advocate）

| 维度 | 判定 | 说明 | 证据 |
|------|:----:|------|------|
| D1 耦合度 | WARN | ADR-JG-03 将 GoalManager 作为 processSoulEvent 的第 8 个可选参数注入。函数签名已达 8 参数，这不是循环依赖问题，但参数列表过长（>5）是代码坏味道，增加未来维护成本。每次新系统需要钩入 processSoulEvent 就加一个参数的模式不可持续。 | soul-engine.ts L347-L355 当前 7 参数（含 4 optional），TDD ADR-JG-03（L276-L293）再加第 8 个。依赖方向 engine->engine 合规（goal-manager -> soul-engine 无反向），但参数数量警告成立。 |
| D2 扩展性 | PASS | 新增 GoalType 只需 3 处修改：(1) personal-goal.ts 添加枚举值, (2) goal-data.ts 添加乘数/TTL/文案, (3) 如果事件驱动则在 processSoulEvent 钩子中加触发条件。GoalManager 本身无需修改。这是合理的扩展点数量（<3 核心文件）。 | TDD S2.2 goal-data.ts 数据驱动设计（L72-L100）；GoalManager.assignGoal 接受 GoalType 泛型参数，不硬编码类型判断。 |
| D3 状态污染 | PASS | 新增 `goals: PersonalGoal[]` 字段有唯一写入者: GoalManager（通过 goal-tick handler 和 processSoulEvent 钩子调用）。其他系统只读。全局池设计（而非嵌套到 disciple 内）避免了弟子级字段膨胀。 | TDD S1.3 LiteGameState +goals（L34-L41）；S2.3 GoalManager 是唯一操作方法提供者（L110-L156），assignGoal/removeGoal/tickGoals 均操作 state.goals。 |
| D4 性能预警 | PASS | goal-tick handler 每 tick 执行 tickGoals（O(G)=O(16)上限 = 8弟子x2目标）+ checkCompletions（O(G)扫描）+ 每 60 tick 一次 periodicScan（O(D)=O(8)）。均为 O(n) 或更好，不在热循环中做重计算。 | TDD S3 goal-tick handler（L315-L328）：3 个操作；MAX_ACTIVE_GOALS=2 x 8弟子 = 最多 16 个目标，扫描代价微不足道。 |
| D5 命名一致 | PASS | GoalManager 命名与 RelationshipMemoryManager 一致（无状态服务类模式）。goal-tick.handler.ts 遵循 handlers/ 目录命名约定（同 farm-tick.handler.ts, soul-tick.handler.ts）。goal-data.ts 在 shared/data/ 下与 trait-registry.ts 同级。 | TDD S4 N1-N3 文件路径（L337-L340）与 layers.md ss2 文件清单（L92-L97）的命名模式一致。 |

### R6 -- 完成度审计（Adversarial QA）

| 维度 | 判定 | 说明 | 证据 |
|------|:----:|------|------|
| D1 边界穷举 | WARN | TDD S2.3 checkCompletions JSDoc 仅提及 "breakthrough-success, friend 标签等"（L135），但 PRD ss3.1 定义了 5 种 GoalType 各自不同的完成条件：breakthrough=突破成功事件, revenge=与目标碰面正面互动或好感>=0, seclusion=TTL 耗尽, friendship=friend 标签, ambition=TTL 耗尽。TDD 没有为 revenge 完成条件给出详设伪码。revenge 的完成条件"与目标碰面且发生正面互动（或目标好感回升至>=0）"需要在 checkCompletions 中检查 affinity 状态或碰面事件，但 checkCompletions 运行在 goal-tick(500:20)，此时 encounter(610) 和 soul-eval(625) 尚未执行，存在与 revenge 触发同样的时序问题。 | TDD S2.3 L135-L138: checkCompletions 描述不完整。PRD ss3.1 revenge 完成条件（PRD L64）需检查好感值和碰面事件，但 goal-tick(500) 早于 encounter(610)。 |
| D2 并发竞态 | BLOCK | TDD S6 T-EV-02（L420）revenge 触发条件写作 `event.type === 'encounter'`，但实际代码中不存在名为 `encounter` 的 SoulEventType。代码中的碰面事件类型为 `encounter-chat`、`encounter-discuss`、`encounter-conflict`（soul.ts L98-L100）。若按 TDD 实现，revenge 目标永远无法被触发。此外，revenge 触发条件要求"负面碰面结果"，按语义应仅匹配 `encounter-conflict`，TDD 需明确指定使用哪些具体事件类型。 | soul.ts L90-L101: SoulEventType 枚举列表中无 'encounter'，只有 'encounter-chat'/'encounter-discuss'/'encounter-conflict'。encounter-tick.handler.ts L64-L68 确认使用这三个具体类型。 |
| D3 回归风险 | WARN | 修改涉及 3 个核心文件的函数签名：(1) behavior-tree.ts getEnhancedPersonalityWeights +goals 参数, (2) behavior-tree.ts planIntent +goals 参数, (3) soul-engine.ts processSoulEvent +goalManager 参数。三者均为 optional trailing 参数，不改变现有调用方签名。但 getEnhancedPersonalityWeights 被 planIntent 调用、planIntent 被 disciple-tick.handler 调用，影响链长度=3，且 Layer 5 改变了行为权重的输出值，直接影响弟子行为选择概率。验证计划 V4 覆盖了 Layer 5，但 TDD 未明确 V4 是否包含"移除所有目标后回归到 Layer 4 完全一致"的断言（仅 S8 V4 描述中提到"零目标时概率分布与 Layer 4 完全一致"）。 | TDD S3 ADR-JG-02（L229-L262）修改 behavior-tree.ts；dependencies.md ss3（L77-L79）显示 behavior-tree 直接影响 disciple-tick, farm-engine, alchemy-engine。S8 V4（L496-L499）有覆盖但描述简略。 |
| D4 可测试性 | PASS | S8 验证计划 V1-V8 覆盖全部 7 个 US 的所有 AC。Monte Carlo N>=1000 覆盖 Layer 5 极端值。V7 覆盖 v5->v6 迁移。所有验证可通过 `scripts/verify-phaseJ-goal.ts` 自动执行。 | TDD S8 L481-L506: 8 个验证组，V1=事件触发(US-JG-01 AC1-3)，V2=守卫(AC4-5,US-JG-02 AC3)，V3=定期扫描(US-JG-02 AC1-2)，V4=Layer 5(US-JG-03 AC1-3)，V5=生命周期(US-JG-04 AC1-3)，V6=MUD(US-JG-05 AC1-3)，V7=迁移(US-JG-06 AC1-3)，V8=Prompt(US-JG-07 AC1-2)。 |
| D5 存档兼容 | WARN | 迁移函数 migrateV5toV6 设计合理（新增 goals:[] 空数组，L370-L378），但 TDD 的 SAVE_VERSION 提升到 6 后，save-manager.ts 的兜底逻辑（L216: `result['version'] = SAVE_VERSION`）会将版本强制覆写为 SAVE_VERSION 常量值。如果 SAVE_VERSION=6 但 createDefaultLiteGameState 未同步更新（仍返回 version:5），则新建游戏的状态版本与存档版本不一致。TDD S5 提到 "createDefaultLiteGameState() 更新"（L389-L393），但 S4 M2 只写了"+goals:[], v6 注释, createDefault"，未明确 version:5->6 的变更。 | save-manager.ts L26: `const SAVE_VERSION = 5;` 需改为 6。game-state.ts L279-L283: createDefaultLiteGameState 返回 `version: 5` 需改为 6。TDD S5 L389-L393 提到了 createDefault 的 goals 字段更新但未提及 version 字段更新。TDD S4 M2（L347）描述 "v6 注释" 但不够明确。 |

---

## L2：CoVe 证据验证

### CoVe #1 -- R6-D2 BLOCK: revenge 触发事件类型不匹配

**原结论**：BLOCK -- TDD T-EV-02 使用 `event.type === 'encounter'`，但代码中无此事件类型。

**验证问题**：
1. 代码中 SoulEventType 是否包含字面量 `encounter`？
2. encounter-tick handler emit 的事件类型具体是什么？
3. processSoulEvent 执行时接收到的 event.type 会是什么值？

**独立答案**：
1. 否。`src/shared/types/soul.ts` L90-L101 列举了所有 SoulEventType：`alchemy-success`, `alchemy-fail`, `harvest`, `meditation`, `explore-return`, `breakthrough-success`, `breakthrough-fail`, `encounter-chat`, `encounter-discuss`, `encounter-conflict`, `world-event`。没有裸 `encounter` 类型。
2. `encounter-tick.handler.ts` L64-L68 定义了映射 `{ chat: 'encounter-chat', discuss: 'encounter-discuss', conflict: 'encounter-conflict' }`。EventBus emit 的是这三个具体类型。
3. processSoulEvent 在 soul-event.handler.ts L85 被调用，传入 EventBus drain 出的 SoulEvent。事件类型只可能是上述枚举值之一。

**对比结果**：一致 -- TDD 使用的 `event.type === 'encounter'` 在运行时永远不会匹配任何事件，revenge 目标将永远无法被事件驱动触发。
**最终判定**：维持 BLOCK -- 必须修改为 `event.type === 'encounter-conflict'`（或 `event.type.startsWith('encounter-')` 配合额外过滤条件）。

---

### CoVe #2 -- R5-D1 WARN: processSoulEvent 8 参数

**原结论**：WARN -- 8 参数过多，模式不可持续。

**验证问题**：
1. processSoulEvent 当前有多少参数？有多少是 optional？
2. 项目中其他核心函数最多有多少参数？
3. 是否有替代模式（如 options 对象）被项目使用？

**独立答案**：
1. soul-engine.ts L347-L355 当前 7 参数：event(必), state(必), logger(必), onSoulLog?(可选), emotionMap?(可选), relationshipMemoryManager?(可选), narrativeSnippetBuilder?(可选)。4 个 optional trailing。加上 goalManager 将变为 8 参数（5 个 optional）。
2. grep 搜索其他核心函数：planIntent 有 4 参数（L274-L278），getEnhancedPersonalityWeights 有 3 参数（L138-L142）。processSoulEvent 已是参数最多的函数。
3. TickContext 使用接口对象模式注入依赖。processSoulEvent 目前不用此模式，但 TDD 在 soul-event.handler.ts 调用处已从 ctx 取值传入（L85），理论上可改为传入 ctx 子集。

**对比结果**：一致 -- 8 参数确实过多，但属于代码风格警告非阻塞性问题。
**最终判定**：维持 WARN -- 建议未来将 optional 参数收敛为 options 对象（`{ emotionMap?, rmm?, nsb?, goalManager? }`），但不阻塞本 Phase。

---

### CoVe #3 -- R6-D1 WARN: revenge 完成条件缺乏详设

**原结论**：WARN -- checkCompletions 未详设 revenge 完成条件，且存在时序问题。

**验证问题**：
1. PRD 中 revenge 的完成条件具体是什么？
2. checkCompletions 在 goal-tick(500:20) 运行，能否获取到当前 tick 的碰面结果？
3. TDD 中是否有其他地方描述了 revenge 的完成检测机制？

**独立答案**：
1. PRD ss3.1 L64: "完成条件：与目标碰面且发生正面互动（或目标好感回升至 >= 0）"。这需要检查 affinity 或检测碰面事件。
2. goal-tick 在 phase 500:20 运行，encounter-tick 在 610 运行。因此 checkCompletions 无法获取"当前 tick 的碰面结果"。但 affinity 值（state.relationships[].affinity）是持久化的，上一 tick 的碰面结果已写入。因此"好感回升至>=0"这条可以在 500 时检查（基于上一 tick 的状态）。但"与目标碰面且发生正面互动"这条需要事件检测，无法在 500 时检查当前 tick 的碰面。
3. TDD 中未在 processSoulEvent 钩入点添加 revenge 完成检测。ADR-JG-01 仅覆盖了事件驱动的"触发"，未覆盖事件驱动的"完成"。

**对比结果**：一致 -- revenge 完成条件存在设计空白。`checkCompletions` 可检查持久化的 affinity>=0，但"与目标碰面且正面互动"需要事件驱动检测（类似于 revenge 触发），TDD 未设计此路径。
**最终判定**：维持 WARN -- revenge 完成条件部分可在 goal-tick 中通过 affinity 检查实现（affinity>=0），但"碰面正面互动"部分需要额外钩入点或简化为纯 affinity 阈值条件。建议 TDD 明确选择一种方案。

---

### CoVe #4 -- R6-D3 WARN: Layer 5 回归风险

**原结论**：WARN -- 影响链长度=3，改变行为权重输出。

**验证问题**：
1. getEnhancedPersonalityWeights 新增的 goals 参数是否 optional？不传时是否等价于无 Layer 5？
2. 验证计划 V4 是否包含零目标回归断言？

**独立答案**：
1. TDD ADR-JG-02 L261: "两个函数均为最后一个参数添加 `goals?: PersonalGoal[]`，保持向后兼容"。Optional 参数，不传时 Layer 5 代码块不执行（L237: `if (goals && goals.length > 0)`），等价于无 Layer 5。
2. TDD S8 V4 L498: "零目标时概率分布与 Layer 4 完全一致" -- 明确包含此断言。Monte Carlo N>=1000 验证。

**对比结果**：部分矛盾 -- 回归风险实际低于原估计。Optional 参数 + 零目标守卫 + Monte Carlo 零目标断言三重保障。但影响链长度=3 且改变行为概率仍需关注。
**最终判定**：维持 WARN（降低紧迫度） -- 回归风险已有充分缓解措施，但建议 V4 明确添加"前 4 层参数不变时，有目标 vs 无目标的行为概率差异在预期范围内"的断言。

---

### CoVe #5 -- R6-D5 WARN: createDefaultLiteGameState version 同步

**原结论**：WARN -- version:5->6 的变更在 TDD 中不够明确。

**验证问题**：
1. save-manager.ts 的 migrateSave 兜底逻辑是否会自动修正 version？
2. createDefaultLiteGameState 返回的 version 在新建游戏时是否影响后续流程？

**独立答案**：
1. save-manager.ts L216: `result['version'] = SAVE_VERSION;` -- 是的，migrateSave 最后会强制将版本覆写为 SAVE_VERSION 常量。因此只要 SAVE_VERSION=6，旧存档迁移后版本号正确。
2. createDefaultLiteGameState 返回的 version 用于新建游戏。若不更新为 6，新建游戏保存后 state.version=5，下次加载时触发 migrateV5toV6（虽然结果等价但多一次不必要的迁移）。更严重的是：如果 SAVE_VERSION=6 而 createDefault 返回 version:5，saveGame 写入的 JSON 包含 version:5，但 loadGame 时 migrateSave 会将其升为 6 -- 行为一致但版本号不对称。

**对比结果**：一致 -- 问题存在但因兜底逻辑不会导致数据丢失，属于代码卫生问题。
**最终判定**：维持 WARN -- TDD S4 M2 应明确列出 `createDefaultLiteGameState() version: 5 -> 6` 变更。

---

## L3：结构化辩论

> 无角色间矛盾，跳过 L3。

---

## Devil's Advocate

### 历史高频问题模式检查

基于 MEMORY.md review_session_001.md 和 review_session_002.md 的历史模式：

| # | 历史模式 | 当前文档检查结果 |
|---|---------|----------------|
| 1 | PRD/TDD 引用不存在的函数名 | 已发现：TDD T-EV-02 使用 `event.type === 'encounter'`，但代码中无此事件类型（已标记 BLOCK）。TDD 引用的 `getRealmAuraCost` 在 realm-formulas.ts L38 确认存在。 |
| 2 | Pipeline 时序依赖未解决 | ADR-JG-01 正确解决了事件驱动触发的时序问题（钩入 processSoulEvent, phase 625 内执行）。但 revenge 完成检测的时序问题（CoVe #3）属于同类遗漏。 |
| 3 | 文档间引用不一致 | TDD S3 ADR-JG-01 引用 "soul-engine.ts:347+" 和 "L366/L377-378/L381-399/L400+"，经验证：L347 是函数签名（正确），但 L366 对应的 fallbackEvaluate 调用实际在 L366（正确），L377-378 对应 applyEvaluationResult + updateRelationshipTags 实际在 L378-L379（偏差 1 行，可接受）。 |
| 4 | Roadmap 文档未同步更新 | Gate 1 review 已发现并标记。TDD 本身不负责 Roadmap 更新，此项不适用于 Gate 2。 |
| 5 | 5 层权重叠加无全局 cap | TDD S2.3 Layer 5 合成公式（L173-L181）有 clamp [0.5, 2.0]，针对 Layer 5 乘数有局部 cap。但 Layer 1-4 的权重乘以 Layer 5 的 clamp 后值，最终 `max(0, ...)` 保证非负。无全局权重 cap 是 pre-existing 设计决策，不因本 TDD 恶化。 |

### 假设场景验证

**场景 1：如果 breakthrough 触发后弟子立刻突破成功了会怎样？**

- breakthrough 目标被 assignGoal 在 processSoulEvent（phase 625）中分配。
- 突破检测在 auto-breakthrough handler（phase 200:10）中执行。
- 因此"分配 breakthrough 目标"发生在当前 tick 的 phase 625，而"下一次突破检测"在下一 tick 的 phase 200。
- 如果下一 tick 突破成功，auto-breakthrough emit `breakthrough-success` 事件，该事件在 phase 625 被 processSoulEvent 消费。
- 但 checkCompletions 在 goal-tick(500:20) 运行，此时 `breakthrough-success` 事件尚未发生（它在 200 emit 但在 625 才被 processSoulEvent 消费）。
- 问题：checkCompletions 如何检测到突破成功？它需要读取 state 中的境界变化（realm/subRealm），而非事件。这是可行的（突破在 200 阶段已写入 state），但 TDD 未明确 checkCompletions 对 breakthrough 的检查方式是"检查 state.realm 变化"还是"监听事件"。
- 结论：可行但需明确 checkCompletions 的实现策略（轮询 state vs 事件监听）。

**场景 2：如果 8 个弟子同时触发 seclusion 目标，全员闭关会怎样？**

- TDD S8 V3 覆盖定期扫描。PRD PM3（L251）已识别此风险，评估为"低概率 + 自限性（TTL=200）"。
- 但 TDD 未设计全局同类型上限。如果 8 个弟子 persistent 都 >= 0.6，60 tick 扫描后可能出现 4+ 弟子同时 seclusion。
- seclusion 的乘数表：meditate=1.8, farm=0.6, alchemy=0.6, explore=0.5, rest=1.2, bounty=0.5, idle=0.3。
- 这意味着多数弟子会集中修炼，灵田和炼丹产出会大幅下降。
- 结论：风险存在但 PRD 已接受（PM3），TDD 不需要额外措施。

---

## 改进建议

1. **[必须修复] T-EV-02 事件类型**：将 `event.type === 'encounter'` 修改为 `event.type === 'encounter-conflict'`（或根据语义需要，改为 `event.type.startsWith('encounter-') && rd.delta < -5` 以涵盖所有碰面场景中的负面互动）。同时 T-EV-03 friendship 触发条件"任意 soul-event 导致 affinity 变化"应更精确地列出可触发的事件类型范围。

2. **[建议] revenge 完成条件详设**：TDD S2.3 checkCompletions 应补充 revenge 完成条件的伪码。建议简化为"revenge 目标的 target 弟子 affinity >= 0"（纯 state 轮询，无时序问题），放弃"碰面正面互动"条件（需事件驱动，增加复杂度且收益不大）。

3. **[建议] checkCompletions 实现策略**：明确 checkCompletions 对每种 GoalType 的完成检测方式：breakthrough=检查 state.realm/subRealm 是否达标, revenge=检查 affinity>=0, friendship=检查 friend 标签, seclusion/ambition=仅 TTL 过期（不需要主动完成检测）。

4. **[建议] processSoulEvent 参数收敛**：当前维持 8 参数可行，但建议在本 Phase 完成后将 optional 参数重构为 options 对象，记入 tech-debt。

5. **[建议] createDefaultLiteGameState version 显式化**：TDD S4 M2 应明确列出 `version: 5 -> 6` 变更项，避免实施时遗漏。

---

## 最终判定

**CONDITIONAL PASS** -- 存在 1 个 BLOCK（T-EV-02 事件类型不匹配必须修复），5 个 WARN 记入注意事项。

修复 BLOCK 后可进入 Gate 3 实施阶段。WARN 项建议在实施过程中一并解决（特别是 revenge 完成条件详设和 checkCompletions 实现策略）。
