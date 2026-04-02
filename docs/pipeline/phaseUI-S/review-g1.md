# Phase UI-S Gate 1 审查报告

**审查日期**：2026-04-02 | **审查对象**：`docs/features/phaseUI-S-PRD.md` + `docs/design/specs/phaseUI-S-user-stories.md`
**连续全 PASS 次数**：0（上次为 CONDITIONAL PASS）
**审查角色**：R1 魔鬼PM / R2 资深玩家（适配提升）/ R5 偏执架构师
**跳过角色**：R3 数值策划（本 Phase 纯 UI 零公式零数值，所有标签映射为硬编码字符串，不涉及数值平衡）/ R4 项目经理（不涉及跨版本影响，存档版本不变）

---

## L0 Content Traceability

| Story# | AC# | Data Anchor | 追溯结果 | 状态 |
|--------|-----|-------------|---------|------|
| UIS-01 | AC1-4 | PRD §4.1 映射表 | PRD L85-90：4 行完整映射（crush/lover/sworn-sibling/nemesis → 倾慕/道侣/金兰/宿敌） | ✅ |
| UIS-02 | AC1 | PRD §4.2 映射表 | PRD L94-100：5 行完整映射（friend/rival/mentor/admirer/grudge → 知己/对头/师恩/仰慕/积怨） | ✅ |
| UIS-02 | AC2 | PRD §4.6 | PRD L138-143：3 行分隔符变更表 | ✅ |
| UIS-03 | AC1-4 | PRD §4.3 推导规则 | PRD L106-114：7 行条件→标签推导表 | ✅ |
| UIS-04 | AC1 | PRD §4.3 | 同上 | ✅ |
| UIS-04 | AC2 | PRD §4.1 | 同 UIS-01 | ✅ |
| UIS-04 | AC4 | PRD §4.6 | 同 UIS-02 AC2 | ✅ |
| UIS-05 | AC2-5 | PRD §4.5 | PRD L129-136：4 行颜色方案表 | ✅ |
| UIS-06 | AC1-7 | PRD §4.4 映射表 | PRD L118-127：7 行事件→模板映射 | ✅ |
| UIS-06 | AC8 | 不变量 I3 | PRD L75：I3 定义完整 | ✅ |
| UIS-07 | AC1-3 | 不变量 I4 | PRD L76：I4 定义完整 | ✅ |
| UIS-07 | AC5 | — | AC5 引用"encounter-templates 至少 4 条模板含 {P_A}/{P_B}"，数量要求无 PRD 锚定，但这是实施量化标准而非可枚举数据，可接受 | ✅ |
| UIS-07 | AC6 | — | 同理 AC5 | ✅ |
| UIS-08 | AC2-3 | PRD §4.6 | 同上 | ✅ |

**L0 结论**：全部通过，无 BLOCK。进入 L1。

---

## L1 维度穷举签字

### R1 魔鬼PM 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| R1-D1 | ROI | ✅ PASS | PRD §1.3 明确标注"开发成本 S-M vs 体验增量 4/5"。8 项变更中 6 项为 S 级纯函数映射/字符串替换，2 项为 M 级（排版 + 模板接入）。社交可见性从约 20% 提升到 90%（PRD §1.3），玩家感知增量显著。ROI 合格。 | PRD L31 |
| R1-D2 | 认知负担 | ✅ PASS | 零新操作、零新资源、零新概念。所有变更对玩家侧的影响是"原有英文变中文"和"原有单行变双行"。`relationships` 命令已存在（command-handler.ts L388），本次仅补全内容。无新学习成本。 | PRD §2.1 A1-A4 均为标签替换，非新系统 |
| R1-D3 | 范围控制 | ⚠️ WARN | PRD §2.1 B1"社交模板接入"修改 `social-tick.handler.ts` 的硬编码日志为模板化日志。这是 handler 层代码变更，非"纯前端"——PRD 标题为"社交系统前端显示补全"，但 B1 修改的是 engine/handlers/ 下的后端文件。虽然 B1 不修改 GameState 计算逻辑（符合不变量 I5），但 PRD 标题与实际范围存在语义偏差。此外，B1 中 `pickSocialTemplate()` 已存在但当前未被 social-tick.handler 调用（handler 使用硬编码中文），wiring 需要新增 `fillSocialTemplate()` 函数（PRD 未提及此函数，仅在 plan.md L85 出现），PRD §5 代码对账清单中缺少 `fillSocialTemplate` 的条目。 | PRD L46 B1 vs PRD 标题 L1；PRD §5 无 fillSocialTemplate 条目 |
| R1-D4 | 实施可读性 | ⚠️ WARN | (1) PRD §4.1 L88-90 声称 lover/sworn-sibling/nemesis "复用 getRelationLabel 映射"，但 grep 搜索 social-tick.handler.ts L73 显示现有映射为 `sworn-sibling → 结拜`，PRD 却将其改为 `金兰`。PRD 未说明这是一个 **变更**，而是呈现为"复用"——开发者可能误以为只需提取现有函数，实际需要修改映射值。(2) PRD §4.3 取向推导规则存在 **规则优先级歧义**：第 5 行 `maleAttr>0 AND femaleAttr>0 → 兼慕` 和第 7 行 `gender==unknown → 无慕` 可能同时为真（unknown 性别弟子可能有 nonzero attraction 值，因 `generateOrientation('unknown')` 走 else 分支，disciple-generator.ts L91/L101 可产出非零值）。PRD 未标注规则优先级。 | social-tick.handler.ts L73: `case 'sworn-sibling': return '结拜'`; disciple-generator.ts L85-103 |

### R2 资深玩家 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| R2-D1 | 30秒乐趣 | ✅ PASS | 社交系统后端已在运行，每次 social-tick 扫描产生事件都有日志输出。本次变更将这些日志从硬编码单调文案升级为模板化多样文案，且面板信息从英文变中文。玩家在 30 秒内即可通过 `look` 命令看到中文关系标签，无需等待。即时正反馈。 | PRD §1.2 第 5 层根因、US-UIS-01 AC1 |
| R2-D2 | 数字感知 | ✅ PASS | 本 Phase 不新增数值公式，不改变数字量级。现有数字（亲/引/信 [-100,+100]）保持不变，仅将显示分隔符从空格改为中点。数字感知层面无变化。不适用的维度依据：PRD §2.2 OUT L58"新增 GameState 字段或公式"被显式排除。 | PRD §2.2 L58; PRD §4.6 分隔符变更仅改展示格式 |
| R2-D3 | 操作动机 | ✅ PASS | 核心变更是"已有信息的可见性提升"，不是"新增可选系统"。玩家不需要主动使用新功能——中文标签和模板文案自动出现在 `look`/`inspect`/日志中。这是被动接收式增强，无"不用也行"的风险。 | PRD §1.3 循环挂载："社交系统→MUD 日志+面板→玩家感知" |
| R2-D4 | 挫败感管控 | ✅ PASS | 本 Phase 纯展示层，不引入任何失败/惩罚机制。社交事件的成功/失败判定在 social-engine.ts 后端已有（Phase I-beta 交付），本次仅改变其日志呈现方式。不适用的维度依据：纯 UI 变更不新增任何负面结果路径。 | PRD §3 不变量 I5 |

### R5 偏执架构师 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| R5-D1 | 耦合度 | ✅ PASS | 依赖方向为 UI → shared/types + shared/data（单向）。新增的 `getRelationLabel` 提取到 shared/utils 是解耦行为（消除 social-tick.handler 本地重复）。`getOrientationLabel` 为新增纯函数，输入 Orientation+Gender 输出 string，无副效果。不引入循环依赖。 | PRD §2.1 D1 提取方向; social-tick.handler.ts L70-77 是提取源 |
| R5-D2 | 扩展性 | ✅ PASS | 新增 RelationshipStatus/Tag 成员时只需在映射表中加一行（`getRelationLabel` 新增 case），改 1 个文件。Orientation 推导规则为 if-else 链，新增取向类型改 1 个函数。符合 <3 文件标准。 | PRD §4.1 映射表结构 + §4.3 推导规则结构 |
| R5-D3 | 状态污染 | ✅ PASS | PRD §2.2 OUT L58 明确排除"新增 GameState 字段"，§3 不变量 I5 禁止修改 GameState 计算逻辑。所有变更为纯展示函数（入参 GameState，出参 string/HTML），不写入 GameState。 | PRD §2.2 L58, §3 I5 |
| R5-D4 | 性能预警 | ✅ PASS | 所有新增逻辑为 O(1) 映射查找（Record/switch）或 O(n) 遍历弟子关系列表（n=8，上限 56 条 edge）。无 tick 热循环新增重计算——模板选取使用 Math.random() + 数组索引。 | 现有 mud-formatter.ts renderRelationsSection L320-341 已为 O(n) |
| R5-D5 | 命名一致 | ⚠️ WARN | PRD §5 代码对账中 `fillEncounterTemplate` 在 encounter-templates.ts L46 确认存在（已验证），但社交模板侧缺少对应的 `fillSocialTemplate` 函数。PRD 计划新增此函数（仅在 plan.md L85 提及），但 PRD 本身未列入 §5 代码对账或 §2.1 IN 清单中。一个开发者仅读 PRD+US 无法知道需要创建此函数。此外，encounter-templates 使用 `{LOC}` 占位符，而 social-event-templates 使用 `{L}`——PRD 未提及这个命名不一致是否需要统一。 | encounter-templates.ts L41 `{LOC}` vs social-event-templates.ts L4 `{L}` |

---

## L1 汇总

| 判定 | 数量 | 条目 |
|:----:|:----:|------|
| PASS | 10 | R1-D1, R1-D2, R2-D1~D4, R5-D1~D4 |
| WARN | 3 | R1-D3, R1-D4, R5-D5 |
| BLOCK | 0 | — |

---

## L2 CoVe 证据验证

### CoVe #1 — R1-D3 范围控制 (WARN)

**原结论**：WARN — B1 修改 handler 层代码，与"纯前端"标题语义偏差；`fillSocialTemplate` 未在 PRD §5 登记。

**验证问题**：
1. B1 修改的 social-tick.handler.ts 是否仅改变日志输出，不修改 GameState 写入逻辑？
2. PRD §5 代码对账清单是否包含 `fillSocialTemplate` 条目？
3. 现有 social-event-templates.ts 中是否已有 fill 类函数？

**独立答案**：
1. 是。social-tick.handler.ts L38-39, L49-50, L55-56 的变更仅涉及 `ctx.logger.info()` 调用的字符串参数，不涉及 `ctx.state` 的写入。`scanForSocialEvents` 返回的 results 会在 handler 中调用 `socialEngine` 方法修改 GameState（如 crush 标记），但这部分逻辑不在 B1 范围内（B1 仅替换日志文案）。（证据：social-tick.handler.ts L36-58 全文）
2. 否。PRD §5 代码对账清单（L149-161）共 11 个条目，无 `fillSocialTemplate`。（证据：PRD L149-163）
3. 否。social-event-templates.ts 仅导出 `pickSocialTemplate`（L98），无 fill 函数。（证据：social-event-templates.ts L97-101 完整文件尾）

**对比结果**：一致 — B1 确实不改 GameState 逻辑（I5 不违反），但"纯前端"标题仍有语义偏差；`fillSocialTemplate` 确实缺失。
**最终判定**：维持 WARN（降级为"标题语义偏差 + 代码对账不完整"，非 BLOCK 级，因 I5 未违反）

---

### CoVe #2 — R1-D4 实施可读性 (WARN)

**原结论**：WARN — (1) §4.1 sworn-sibling 映射声称"复用"但实际需变更（结拜→金兰）；(2) §4.3 取向推导规则优先级歧义（unknown 可同时匹配"兼慕"和"无慕"）。

**验证问题**：
1. 现有 getRelationLabel 中 sworn-sibling 的映射值是什么？
2. `generateOrientation('unknown')` 是否可能产生 maleAttraction>0 AND femaleAttraction>0 的结果？
3. PRD §4.3 是否标注了规则的评估顺序或优先级？

**独立答案**：
1. 现有映射为 `结拜`（social-tick.handler.ts L73: `case 'sworn-sibling': return '结拜'`）。PRD §4.1 L89 写的是 `金兰`，且标注"复用 getRelationLabel 映射"——这与现有代码矛盾。（证据：social-tick.handler.ts L73）
2. 是。`generateOrientation` 对非 'male' 的 gender 走 else 分支（disciple-generator.ts L91, L96, L101）。对于 'unknown'，因 `gender === 'male'` 为 false，双性恋分支（L92-L96）返回 `{ maleAttraction: 1, femaleAttraction: 0.5 }`。这满足 PRD §4.3 第 5 行条件（maleAttr>0 AND femaleAttr>0），但同时 gender==unknown 匹配第 7 行条件。（证据：disciple-generator.ts L85-103）
3. 否。PRD §4.3 L106-114 的表格使用 `|条件|标签|` 格式，无"优先级"列或"先匹配先胜"等说明。规则之间存在可重叠区域。（证据：PRD L106-114）

**对比结果**：一致 — 两个子问题均得到代码级证实。
**最终判定**：维持 WARN。开发者需要明确：(1) §4.1 sworn-sibling 是从"结拜"改为"金兰"（非"复用"）；(2) §4.3 需在 gender==unknown 规则上标注"优先级最高，先于其他条件评估"或调整表格顺序。

---

### CoVe #3 — R5-D5 命名一致 (WARN)

**原结论**：WARN — `fillSocialTemplate` 未在 PRD 注册；`{LOC}` vs `{L}` 占位符命名不一致。

**验证问题**：
1. PRD §2.1 IN 的 8 项中是否有任何一项提及新增 `fillSocialTemplate` 函数？
2. encounter-templates 和 social-event-templates 的占位符命名是否一致？
3. PRD 或 User Stories 中是否提及占位符命名统一？

**独立答案**：
1. 否。PRD §2.1 L39-49 的 8 个 ID（A1-A4, B1, C1, D1, D2）中，B1 仅提及"wire `pickSocialTemplate()` 到 social-tick.handler"，未提及新建 fill 函数。（证据：PRD L46）
2. 否。encounter-templates.ts L41 JSDoc: `{A}/{B}/{LOC}`；social-event-templates.ts L4 JSDoc: `{A}/{B}/{L}`。地点占位符命名不一致。（证据：encounter-templates.ts L41, social-event-templates.ts L4）
3. 否。PRD 全文和 User Stories 全文均未提及 `{LOC}` vs `{L}` 的命名差异或统一计划。（证据：grep `{LOC}` 在 PRD/US 中无结果）

**对比结果**：一致 — 三个子问题均证实原 WARN。
**最终判定**：维持 WARN。建议 PRD 补充：(a) 将 `fillSocialTemplate` 新增加入 §2.1 IN 或 §5 代码对账；(b) 决定是否统一 `{LOC}`/`{L}` 占位符命名。

---

## Devil's Advocate 反向验证

### 历史高频问题模式匹配

从 MEMORY.md 提取前 5 条高频模式：

| # | 历史模式 | 本次检查结果 |
|---|---------|-------------|
| 1 | **治理文档未注册**（MASTER-PRD/ROADMAP/traceability 缺少新 Phase 条目）——第 8 次出现 | **命中**：grep 搜索 `UI-S` 在 MASTER-PRD、SOUL-VISION-ROADMAP、prd/traceability.md 中均无结果。MASTER-PRD §5 路线图表中 I-beta 仍标注 "SPM 进行中"（实际已完成），UI-S 未注册。ROADMAP 未更新。task-tracker.md L49 有 UI-S 条目但其他治理文档全部缺失。 |
| 2 | **stale JSDoc / 标签映射不一致**（第 4 次出现） | **命中**：PRD §4.1 L88-90 三行声称"复用 getRelationLabel 映射"但现有映射中 sworn-sibling→结拜（非金兰）。这既是"stale"也是"不一致"。 |
| 3 | **task-tracker 缺失/过时** | task-tracker.md L49 已有 UI-S 条目，状态为"待启动"。尚可接受。 |
| 4 | **PRD 代码行号引用偏移** | PRD §5 行号引用已逐一验证：soul.ts L220/L223, game-state.ts L32/L37-42/L51/L56/L227, encounter.ts L44/L56, social-event-templates.ts L98, encounter-templates.ts L46 — 全部准确。 |
| 5 | **MASTER-PRD changelog 未更新** | **命中**：MASTER-PRD 最后一条 changelog 为 v2.2（2026-04-02 +Phase GS），I-beta 完成和 UI-S 启动均未记录。 |

### 假设场景验证

**场景 1**：如果开发者按 PRD §4.1"复用 getRelationLabel 映射"直接提取现有函数，会怎样？
- 结果：sworn-sibling 会显示为"结拜"而非 PRD 要求的"金兰"。AC-UIS-01 AC3 会失败（期望"金兰"，实际"结拜"）。开发者需回头修改。
- 影响：返工成本小（改一个 case 语句），但体现了 PRD 描述误导性。

**场景 2**：如果 `gender==unknown` 弟子的 orientation 为 `{maleAttraction:1, femaleAttraction:0.5}`，取向标签显示什么？
- 按 PRD §4.3 表格从上到下评估：第 5 行 `maleAttr>0 AND femaleAttr>0` 命中→"兼慕"；第 7 行 `gender==unknown` 命中→"无慕"。两条都匹配。开发者实现 if-else 时的编写顺序将决定结果——PRD 未规定。
- 影响：gender==unknown 弟子的取向标签可能在不同开发者实现中不一致。鉴于当前 8 名弟子中 unknown 性别的概率较低（`generateGender` 在 disciple-generator.ts 中的分布需确认），实际影响可能有限，但这是一个规格歧义。

---

## 最终判定

### 统计

| 判定 | 数量 |
|:----:|:----:|
| BLOCK | 0 |
| WARN | 3 |
| PASS | 10 |

### 判定完整性校验

- BLOCK = 0, WARN = 3 > 0 --> 唯一合法判定 = **CONDITIONAL PASS**
- 头部判定 = CONDITIONAL PASS，与统计一致
- L1 表格中 WARN 行数 = 3（R1-D3, R1-D4, R5-D5），与统计一致

---

## ⚠️ CONDITIONAL PASS

可进入 Gate 2（SGA），以下 3 个 WARN 需在 PRD 修订中处理：

### WARN 修复清单

| # | 问题 | 修复建议 | 来源 |
|---|------|---------|------|
| W1 | PRD §4.1 sworn-sibling 映射声称"复用 getRelationLabel"但现有值为"结拜"，PRD 要求"金兰"——这是变更而非复用 | 将 §4.1 L89 "来源"列改为"变更（原值：结拜→金兰）"，并在 §4.1 下方加注说明此变更理由 | R1-D4 |
| W2 | PRD §4.3 取向推导规则中 `gender==unknown` 与 `maleAttr>0 AND femaleAttr>0` 存在优先级歧义 | 在 §4.3 表头或脚注中标注"gender==unknown 优先于所有其他条件"，或将 unknown 规则移至表格第一行 | R1-D4 |
| W3 | `fillSocialTemplate` 函数未在 PRD §2.1 IN 或 §5 代码对账中登记；`{LOC}` vs `{L}` 占位符命名不一致未被提及 | (a) §5 代码对账新增 `fillSocialTemplate` 条目（标注"待新建"）或在 §2.1 B1 描述中明确提及；(b) 决定是否统一 `{LOC}`/`{L}` 并记录决策 | R1-D3 + R5-D5 |

### 改进建议

1. **治理文档同步**：UI-S 需注册到 MASTER-PRD §5 路线图、SOUL-VISION-ROADMAP、prd/traceability.md。同时将 I-beta 状态从"SPM 进行中"更新为"已完成"。这是第 8 次出现此类治理缺失，建议在 SPM SKILL.md 中增加 Step 0 自检项"确认 MASTER-PRD + ROADMAP 已更新"。
2. **PRD 标题精确化**：当前标题"社交系统前端显示补全"暗示纯前端变更，但 B1 修改 handler 层日志输出。建议改为"社交系统显示与模板补全"以准确反映范围。
