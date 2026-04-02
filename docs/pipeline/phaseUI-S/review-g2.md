# Phase UI-S Gate 2 审查报告

**审查日期**：2026-04-02 | **审查对象**：`docs/design/specs/phaseUI-S-TDD.md`
**对照 PRD**：`docs/features/phaseUI-S-PRD.md` (GATE 1 CONDITIONAL PASS, 3 WARNs fixed)
**连续全 PASS 次数**：0（上次为 CONDITIONAL PASS）
**审查角色**：R4 项目经理 / R5 偏执架构师 / R6 找茬QA
**角色适配**：R5 跳过 D3(状态污染)/D4(性能预警) -- 零 GameState 新字段、零 Pipeline 挂载变更，所有逻辑为 O(1) 映射或 O(n) 弟子遍历

---

## Gate 1 WARN 追踪

| # | Gate 1 WARN | 修复状态 | 证据 |
|---|-------------|:--------:|------|
| W1 | sworn-sibling 映射声称"复用"但实为变更 | FIXED | PRD L89 来源列改为"**变更**（现有映射为'结拜'->'金兰'）" |
| W2 | Orientation 推导规则优先级歧义 | FIXED | PRD L106 新增优先级列 + "从上到下，首条匹配即返回（短路）" 注释；gender==unknown 置于优先级 1 |
| W3 | fillSocialTemplate 未在 PRD 登记 + {LOC}/{L} 未决 | FIXED | PRD L164 新增 fillSocialTemplate 条目（标注 待新建）；L166-168 文档化占位符差异决策 |

---

## L0 Content Traceability

Gate 2 审查 TDD，跳过 L0，直接进入 L1。

---

## L1 维度穷举签字

### R4 项目经理 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| R4-D1 | 范围蔓延 | ✅ PASS | TDD §3 列出 8 个文件变更（1 新建 + 7 修改），与 PRD §2.1 IN 的 8 项需求一一对应：A1=social-labels.ts RELATIONSHIP_STATUS_LABEL; A2=getOrientationLabel; A3=command-handler.ts; A4=mud-formatter.ts; B1=social-tick.handler.ts; C1=encounter-templates.ts+social-event-templates.ts 代词参数; D1=getRelationLabel 提取; D2=TAG_SEPARATOR。TDD §1.3 确认零 GameState/Pipeline/存档/npm 变更，与 PRD §2.2 OUT 一致。未发现超出 IN 表的功能。 | TDD §3 L125-136 vs PRD §2.1 L39-49 |
| R4-D2 | 工期评估 | ✅ PASS | TDD 未显式标注工期。PRD §1.3 估算"开发成本 S-M"。8 个文件中 6 个为 S 级（标签映射/分隔符替换），2 个为 M 级（排版重构 + 模板接入）。纯展示层无 GameState 迁移无 Pipeline 变更，整体 S-M 估算合理，不超过 8h 阈值。 | PRD L31 "开发成本 S-M" |
| R4-D3 | 依赖阻塞 | ✅ PASS | TDD §1.3 确认零新 npm 依赖。所有引用的类型（RelationshipStatus, RelationshipTag, Orientation, Gender）和函数（getPronoun, pickSocialTemplate）已在代码中存在并通过 PRD §5 代码对账确认。无外部依赖。 | TDD §1.3 L39; PRD §5 L151-164 行号全部经 grep 验证 |
| R4-D4 | 路线图冲突 | ✅ PASS | 本 Phase 为 I-beta 后续的纯展示补全，不引入新系统或改变既有系统行为。PRD §2.2 OUT 显式排除了"AI 邀约完整流程"和"X-gamma 浮层面板"等后续 Phase 内容。TDD 不与路线图中的后续 Phase 冲突。 | PRD §2.2 L55-58 OUT 表 |
| R4-D5 | 交付验证 | ✅ PASS | TDD §5.7 列出 3 类验证方式：(1) `npm run test:regression` 覆盖 Handler 日志输出变更；(2) `npx tsx scripts/verify-social-system.ts` 覆盖模板变更；(3) 浏览器手动验证覆盖 UI 格式化。PRD §6 成功标准 S6/S7/S8 均有对应 CLI 验证。S1-S5 为浏览器验证——无自动化但符合展示层特性（TD-016 已知限制）。 | TDD §5.7 L195-199; PRD §6 L176-185 |

### R5 偏执架构师 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| R5-D1 | 耦合度 | ✅ PASS | 新建 `social-labels.ts` 位于 Data 层（shared/utils/），依赖 soul.ts 和 game-state.ts 类型定义。消费者为 Presentation 层（mud-formatter, command-handler）和 Engine 层（social-tick.handler）。依赖方向为 Presentation/Engine -> Data（单向），与现有架构模式一致（如 encounter-templates.ts 被 encounter-tick.handler 导入）。不引入循环依赖。getRelationLabel 从 social-tick.handler 提取到 shared/utils 是解耦行为（消除 handler 本地重复）。 | TDD §1.1 L13-22 层级归属; dependencies.md §1 现有模式 |
| R5-D2 | 扩展性 | ⚠️ WARN | TDD §2.3 将 `getEncounterText` 签名从 5 参数扩展为 7 参数（result, nameA, nameB, locationLabel, randomFn?, pronounA?, pronounB?）。`fillEncounterTemplate` 从 4 参数扩展为 6 参数。review-protocol §0.1 规定"新增 API 参数 >= 6 -> 建议 options 对象重构"。当前设计中，调用者如需传代词但使用默认 randomFn，必须写 `getEncounterText(result, a, b, loc, undefined, pronA, pronB)` -- 中间的 `undefined` 是 API 人体工学缺陷。未来若再加参数（如弟子称号/头衔），签名会继续膨胀。建议引入 options 对象：`getEncounterText(result, { nameA, nameB, locationLabel, pronounA?, pronounB?, randomFn? })`。 | TDD §2.2 L86-93 (6 params); TDD §2.3 L104-108 (7 params); review-protocol §0.1 "参数数>=6" |
| R5-D3 | 状态污染 | -- | 跳过。零 GameState 新字段（TDD §1.3 L36）。所有变更为纯展示函数，入参 GameState，出参 string/HTML，不写入 GameState。PRD §3 I5 禁止修改 GameState 计算逻辑。 | TDD §1.3 L36 |
| R5-D4 | 性能预警 | -- | 跳过。所有新增逻辑为 O(1) Record 查找或 O(n) 弟子遍历。无 tick 热循环新增重计算。 | TDD §1.1 层级归属均为 Data/Presentation |
| R5-D5 | 命名一致 | ⚠️ WARN | TDD §5.6 行 1 将新增代码文件的注册目标写为"INDEX.md"，但 MASTER-ARCHITECTURE §6.3 L109 明确规定"新增代码文件 -> arch/layers.md"。`social-labels.ts` 应注册到 `layers.md` Data 层文件清单（当前清单有 20 个文件），而非 INDEX.md。此外，`src/shared/utils/` 是一个全新的子目录，layers.md Mermaid 图和文件清单中不存在 `utils/` 分类——需要在 layers.md 中明确 utils/ 的归属（是 Data 层的子目录还是独立分类）。 | MASTER-ARCHITECTURE L109: "新增代码文件 -> arch/layers.md"; layers.md L94 Data 层清单无 utils/; TDD §5.6 L187 写 "INDEX.md" |

### R6 找茬QA 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| R6-D1 | 边界穷举 | ✅ PASS | TDD §2.1 `getRelationshipStatusLabel` 签名为 `(status: RelationshipStatus | null): string | null`，显式处理 null（US-UIS-01 AC5）。`getOrientationLabel` 输入 Orientation+Gender，PRD §4.3 优先级表已修复（gender==unknown 优先级 1），7 条规则覆盖所有 Gender x Attraction 组合。`fillEncounterTemplate`/`fillSocialTemplate` 的 pronounA/pronounB 为可选参数，不传时模板中的 {P_A}/{P_B} 行为需确认——但 TDD §2.2 仅列签名，未说明不传代词时 {P_A}/{P_B} 如何处理（是保留原样还是替换为空串）。不过 US-UIS-07 AC4 明确要求"模板不含 {P_A}/{P_B} 时正常输出，无残留"，而非"不传代词时"。总体边界处理合格。 | TDD §2.1 L72; PRD §4.3 L106-116; US-UIS-07 AC4 L143 |
| R6-D2 | 并发竞态 | ✅ PASS | TDD §1.3 确认零 Pipeline 挂载变更。social-tick.handler 的 phase=612/order=5 不变（pipeline.md L80）。所有变更为日志输出字符串替换或 UI 渲染函数，不影响 GameState 写入顺序。不存在新的同阶段多写者风险。 | TDD §1.3 L37; pipeline.md L80 social-tick(612:5) |
| R6-D3 | 回归风险 | ⚠️ WARN | TDD §3 file #6 变更描述为"删除本地 getRelationLabel，改用模板化日志输出"，但 TDD 全文未提供 social-tick.handler 模板化的伪代码或接口说明。PRD §4.4 定义了 7 种事件类型到模板键的映射（crush-mark->social-flirt, invitation/lover->social-confession 等），但 TDD 未描述 handler 内部如何根据 `r.type + r.relationType` 路由到对应 SocialEventType、如何调用 `pickSocialTemplate()` + `fillSocialTemplate()`、如何获取代词参数。这是本 Phase 最复杂的代码变更（涉及 handler 逻辑重写），缺少实施细节增加了回归风险——开发者需自行从 PRD §4.4 推导映射逻辑。对比：TDD §2.2/§2.3 为签名扩展提供了完整的变更前后对比，但 §3 file #6 仅一句话带过。 | TDD §3 L133 "删除本地 getRelationLabel，改用模板化日志输出" vs PRD §4.4 L118-128 的 7 条映射规则; TDD 全文 grep "crush-mark\|invitation\|dissolution" 无结果 |
| R6-D4 | 可测试性 | ✅ PASS | TDD §5.7 明确列出 3 条验证路径：(1) `npm run test:regression` 覆盖 Handler 日志变更；(2) `npx tsx scripts/verify-social-system.ts` 覆盖模板函数；(3) 浏览器手动验证覆盖 UI 排版。§5.5 指出 verify-phaseF0-alpha.ts L172 的 getEncounterText 调用因可选参数不受影响。PRD §6 S6 tsc 零错误 + S7 回归全通过提供基线保障。 | TDD §5.7 L195-199; §5.5 L178-181 |
| R6-D5 | 存档兼容 | ✅ PASS | TDD §1.3 L38 确认零存档迁移（存档版本保持 v8）。code 验证 SAVE_VERSION=8（save-manager.ts L26）。本 Phase 不新增 GameState 持久化字段，不修改存档结构。旧存档加载后 UI 展示使用现有 GameState 字段（gender, orientation, status, tags），这些字段在 v8 迁移中已有默认值处理。 | TDD §1.3 L38; save-manager.ts L26; TDD §5.8 L203 |

---

## L1 汇总

| 判定 | 数量 | 条目 |
|:----:|:----:|------|
| PASS | 10 | R4-D1~D5, R5-D1, R6-D1, R6-D2, R6-D4, R6-D5 |
| WARN | 3 | R5-D2, R5-D5, R6-D3 |
| BLOCK | 0 | -- |
| 跳过 | 2 | R5-D3, R5-D4（适配规则） |

---

## L2 CoVe 证据验证

### CoVe #1 -- R5-D2 扩展性 (WARN): getEncounterText 7 参数

**原结论**：WARN -- getEncounterText 从 5 参数扩展为 7 参数，fillEncounterTemplate 从 4 扩展为 6，超过 review-protocol 6 参数阈值。中间 undefined 占位问题。

**验证问题**：
1. 当前 getEncounterText 的签名确实是 5 个参数吗？扩展后确实是 7 个吗？
2. encounter-tick.handler 的调用处是否需要传 undefined 来跳过 randomFn？
3. review-protocol §0.1 是否确实规定了 6 参数阈值？

**独立答案**：
1. 是。encounter-templates.ts L61-67 当前签名：`getEncounterText(result, nameA, nameB, locationLabel, randomFn?)` = 5 参数。TDD §2.3 L104-108 扩展为 `getEncounterText(result, nameA, nameB, locationLabel, randomFn?, pronounA?, pronounB?)` = 7 参数。（证据：encounter-templates.ts L61-67; TDD L104-108）
2. 是。encounter-tick.handler.ts L204-208 当前调用 `getEncounterText(result, a.name, b.name, locationLabel)` 不传 randomFn（使用默认值 Math.random）。扩展后若要传代词，必须写 `getEncounterText(result, a.name, b.name, locationLabel, undefined, pronounA, pronounB)` 或 `getEncounterText(result, a.name, b.name, locationLabel, Math.random, pronounA, pronounB)`。（证据：encounter-tick.handler.ts L204-208）
3. 是。review-protocol.md L74: "新增 API 参数 -> 参数数 >= 6 -> 建议 options 对象重构"。（证据：review-protocol.md L74）

**对比结果**：一致 -- 三个子问题均证实原 WARN。
**最终判定**：维持 WARN。建议 TDD 在 §4 ADR 中记录为什么选择追加可选参数而非 options 对象（可能是最小变更原则），或改用 options 对象设计。

---

### CoVe #2 -- R5-D5 命名一致 (WARN): layers.md vs INDEX.md

**原结论**：WARN -- TDD §5.6 将新文件注册目标误写为 INDEX.md，应为 layers.md；shared/utils/ 是新目录但 layers.md 无 utils/ 分类。

**验证问题**：
1. MASTER-ARCHITECTURE §6.3 对"新增代码文件"的注册目标是什么？
2. layers.md Data 层文件清单中是否存在 utils/ 分类或子目录？
3. TDD §5.6 行 1 写的注册目标是什么？

**独立答案**：
1. `arch/layers.md`。MASTER-ARCHITECTURE L109: "新增代码文件 -> arch/layers.md"。（证据：MASTER-ARCHITECTURE.md L109）
2. 否。layers.md L94 Data 层文件清单仅包含 `types/`、`formulas/`、`data/` 三个子目录下的 20 个文件，无 `utils/` 分类。Mermaid 图（L51-66）中 Data 子图也不含 utils。（证据：layers.md L51-66, L94）
3. "INDEX.md"。TDD L187: "新增代码文件 -> INDEX.md 更新？ ✅ social-labels.ts 需登记"。（证据：TDD L187）

**对比结果**：一致 -- TDD 注册目标指向错误文档；新目录在层级架构中未定位。
**最终判定**：维持 WARN。应改为"新增代码文件 -> layers.md 更新？ ✅ social-labels.ts 需登记到 Data 层；utils/ 子目录需在 layers.md Mermaid 图和文件清单中注册"。

---

### CoVe #3 -- R6-D3 回归风险 (WARN): social-tick.handler 模板化细节缺失

**原结论**：WARN -- TDD 对 social-tick.handler 模板化仅一句话描述，缺少事件类型到模板键的路由映射、pickSocialTemplate/fillSocialTemplate 调用方式、代词获取方式等实施细节。

**验证问题**：
1. TDD 全文是否包含 social-tick.handler 的模板化伪代码或接口描述？
2. TDD 是否引用或映射了 PRD §4.4 的 7 种事件类型到模板键的对应关系？
3. TDD §2.4 的 fillSocialTemplate 签名是否说明了如何从 handler 上下文获取代词？

**独立答案**：
1. 否。TDD §3 L133 对 social-tick.handler 的变更描述为"删除本地 getRelationLabel，改用模板化日志输出"。全文 grep "crush-mark"/"invitation"/"dissolution" 在 TDD 中无结果（仅在 PRD 中出现）。无伪代码、无流程图、无接口描述。（证据：TDD L133; grep 无结果）
2. 否。TDD 全文未提及 PRD §4.4 的映射表。TDD §5.3 仅写"PRD 无副效果描述（纯展示变更）。不适用。"但 B1 的模板接入本身就是一个有实施复杂度的变更——handler 需要根据 scanForSocialEvents 返回的 `r.type`（crush-mark/invitation/dissolution）和 `r.relationType`（lover/sworn-sibling/nemesis）路由到 13 种 SocialEventType 中的 7 种。（证据：TDD §5.3 L168-170; PRD §4.4 L118-127 列出 7 种映射）
3. 部分。TDD §2.4 L115-119 定义了 fillSocialTemplate 签名含 pronounA?/pronounB?，但未说明 handler 如何获取弟子的 gender 来调用 getPronoun()。handler 当前代码通过 `getDiscipleName(ctx, r.sourceId)` 获取名字（L67），但无 gender 获取逻辑。（证据：social-tick.handler.ts L66-68 仅获取 name 不获取 gender; TDD §2.4 L115-119）

**对比结果**：一致 -- TDD 对 B1 的实施细节确实空白。
**最终判定**：维持 WARN。建议在 TDD §2 中增加一个小节（如 §2.5 "social-tick.handler 模板化设计"），包含：(a) r.type+r.relationType -> SocialEventType 路由表（可引用 PRD §4.4）；(b) 调用链伪代码（pickSocialTemplate -> fillSocialTemplate）；(c) 代词获取方式（从 ctx.state.disciples 查找 gender -> getPronoun）。

---

## L3 结构化辩论

无角色间矛盾。R5-D2 和 R6-D3 关注不同维度（API 设计 vs 实施覆盖度），不冲突。

---

## Devil's Advocate 反向验证

### 历史高频问题模式匹配

从 MEMORY.md 提取前 5 条高频模式：

| # | 历史模式 | 出现次数 | 本次检查结果 |
|---|---------|:-------:|-------------|
| 1 | 治理文档未注册（MASTER-PRD/ROADMAP/traceability） | 8 | Gate 1 已标注此问题并列入改进建议。TDD 本身不负责治理文档注册（由 SGE Gate 3 处理）。本次不重复标注。 |
| 2 | stale JSDoc / 标签映射不一致 | 5 | Gate 1 W1 已修复（PRD L89 改为"变更"）。TDD §2.1 RELATIONSHIP_STATUS_LABEL 中 sworn-sibling 映射为"金兰"，与修复后的 PRD 一致。无新增不一致。 |
| 3 | task-tracker 缺失/过时 | 5 | Gate 1 已确认 task-tracker.md L49 有 UI-S 条目。TDD 不涉及 task-tracker 维护。 |
| 4 | PRD 代码行号引用偏移 | 4 | TDD §2.2 引用 fillEncounterTemplate L46 -> 验证正确。TDD §2.3 引用 getEncounterText L61 -> 验证正确。TDD §5.2 引用 encounter-tick.handler L204 -> 验证正确。TDD §5.2 引用 encounter-templates.ts L70 -> 验证正确。全部准确。 |
| 5 | 文档注册指向错误目标 | 新模式 | **命中** -- TDD §5.6 行 1 将 layers.md 误写为 INDEX.md（已在 R5-D5 标注）。 |

### 假设场景验证

**场景 1**：如果开发者按 TDD §3 file #4"renderRelationsSection 重构...+orientation 显示"实施，将 orientation 显示放入 renderRelationsSection，会怎样？

验证：renderRelationsSection 被 `formatDiscipleProfile`（look 命令，L268）和 `formatDiscipleInspect`（inspect 命令，L448）共同调用。US-UIS-03 AC5 明确要求 "look A" 不显示取向（仅 inspect 显示）。如果 orientation 放入 renderRelationsSection，look 命令也会显示取向，违反 AC5。

结论：TDD §3 file #4 变更描述"renderRelationsSection 重构...+orientation 显示"存在歧义。Orientation 显示应放在 `formatDiscipleInspect` 的 header 区域（L405-414 附近），而非 renderRelationsSection。但此歧义不升级为 BLOCK——US-UIS-03 AC5 已明确约束，合格开发者会在实施时注意。将此作为改进建议记录。

**场景 2**：如果 fillSocialTemplate 不传代词参数（pronounA/pronounB 为 undefined），模板中的 {P_A}/{P_B} 会变成什么？

验证：TDD §2.4 仅定义了 fillSocialTemplate 签名，未定义实现。但参考现有 fillEncounterTemplate 的实现模式（encounter-templates.ts L52-55 使用 `.replace(/\{LOC\}/g, locationLabel)`），如果 pronounA 为 undefined，`.replace(/\{P_A\}/g, undefined)` 会将 {P_A} 替换为字符串 "undefined"——这违反 PRD 不变量 I3（不得残留占位符）和 I4（代词必须正确）。TDD 应在 fillSocialTemplate 实现中说明：pronounA 为 undefined 时，不执行 {P_A} 替换（保留原样），或替换为空串。

结论：此边界行为未在 TDD 中明确。但因 US-UIS-07 AC4 要求"模板不含 {P_A}/{P_B} 时正常输出"，且 TDD 的 fillSocialTemplate 是新建函数可自由设计，开发者有足够信息做正确实现。作为改进建议记录，不升级。

---

## 最终判定

### 统计

| 判定 | 数量 |
|:----:|:----:|
| BLOCK | 0 |
| WARN | 3 |
| PASS | 10 |
| 跳过 | 2 |

### 判定完整性校验

- BLOCK = 0, WARN = 3 > 0 --> 唯一合法判定 = **CONDITIONAL PASS**
- 头部判定 = CONDITIONAL PASS，与统计一致
- L1 表格中 WARN 行数 = 3（R5-D2, R5-D5, R6-D3），与统计一致

---

## CONDITIONAL PASS

可进入 Gate 3（SGE），以下 3 个 WARN 需在 TDD 修订或 SGE 实施中处理：

### WARN 修复清单

| # | 问题 | 修复建议 | 来源 |
|---|------|---------|------|
| W1 | `getEncounterText` 7 参数 + `fillEncounterTemplate` 6 参数超过 6 参数阈值；randomFn 后追加可选参数导致 undefined 占位 | (a) 在 TDD §4 ADR 中记录保持追加可选参数的理由（最小变更原则）；或 (b) 改用 options 对象：`getEncounterText(result, opts: { nameA, nameB, locationLabel, pronounA?, pronounB?, randomFn? })` | R5-D2 |
| W2 | TDD §5.6 行 1 将新文件注册目标误写为"INDEX.md"，应为"layers.md"；`src/shared/utils/` 是全新子目录，layers.md 无 utils/ 分类 | (a) 将 §5.6 行 1 改为"新增代码文件 -> layers.md 更新？"；(b) SGE 实施时在 layers.md Data 层文件清单中注册 social-labels.ts 并定位 utils/ 子目录 | R5-D5 |
| W3 | social-tick.handler 模板化实施细节缺失：无事件类型到模板键的路由映射、无调用链伪代码、无代词获取方式 | 在 TDD §2 中增加 §2.5"social-tick.handler 模板化设计"，包含 (a) r.type+r.relationType -> SocialEventType 路由表（引用 PRD §4.4）；(b) pickSocialTemplate -> fillSocialTemplate 调用链伪代码；(c) 代词获取方式（ctx.state.disciples.find -> gender -> getPronoun） | R6-D3 |

### 改进建议

1. **TDD §3 file #4 orientation 放置位置澄清**：当前描述"renderRelationsSection 重构...+orientation 显示"存在歧义。renderRelationsSection 被 look 和 inspect 命令共享，但 US-UIS-03 AC5 要求 look 不显示取向。建议将 §3 file #4 变更描述拆分为：(a) renderRelationsSection 重构（中文标签+双行布局）；(b) formatDiscipleInspect header 新增 orientation 显示。避免开发者将 orientation 逻辑放入共享的 renderRelationsSection。

2. **fillSocialTemplate/fillEncounterTemplate 对 undefined 代词参数的行为**：当 pronounA/pronounB 为 undefined 时，{P_A}/{P_B} 占位符的处理方式未明确。建议在 TDD §2.2/§2.4 的函数说明中加注："pronounA 为 undefined 时，{P_A} 不做替换（函数应跳过该 replace 步骤）"，以保证不变量 I3 不被违反，也不会产出 "undefined" 字符串。
