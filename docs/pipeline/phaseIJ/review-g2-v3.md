# Phase IJ Gate 2 — TDD v3.0 审查报告

**审查日期**：2026-04-01 | **审查对象**：`docs/design/specs/phaseIJ-TDD.md` v3.0
**对照 PRD**：`docs/features/phaseIJ-PRD.md` v3.0（GATE 1 PASSED 2026-04-01）
**激活角色**：R4(项目经理) R5(偏执架构师) R6(找茬QA)
**连续全 PASS 次数**：0

---

## L0 追溯结果

> Gate 2（TDD 审查）跳过 L0，直接进入 L1。

---

## L1 维度审查

### R4 项目经理

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 1 | D1 范围蔓延 | ✅ | TDD §1 L11-22 明确列出范围：关系记忆（设计+PoC）、Narrative Snippet（设计+代码）、L2/L6 切换、因果事件/个人目标/T2 仅接口设计。与 PRD §1.1 范围一致，无越界功能。 | TDD §1 L11-22; PRD §1.1 |
| 2 | D2 工期评估 | ✅ | §10 L649-689 分 5 批 15 个任务，T1-T2 为 S 级并行类型定义，T3-T4 核心逻辑 M 级，T5-T10 集成，T11-T14 收尾，T15 PoC 可选。批次结构合理，无超大单任务。 | TDD §10 L649-689 |
| 3 | D3 依赖阻塞 | ⚠️ | TDD §5.5 L537 声称 "ai-server 响应中包含 `modelSize: '0.8B' \| '2B'` 字段"，但实际 `/api/infer` 响应为 `{ content, parsed }`（ai-server.ts L523），`modelSizeMB` 仅在 `/api/health` 响应中（ai-server.ts L455）。0.8B 降级路径的 modelSize 获取机制未落地。 | ai-server.ts L523, L449-456; TDD §5.5 L537 |
| 4 | D4 路线图冲突 | ✅ | Phase IJ 在 SOUL-VISION-ROADMAP v4.1 中为"预研型"Phase，TDD 保持此定位（§1 L4）。宪法变更（§9 ADR-IJ-09 L645）已声明需同步更新 CLAUDE.md，与 PRD §1.6 一致。 | TDD §1 L4; §9 ADR-IJ-09 L645 |
| 5 | D5 交付可验证 | ✅ | T12 明确要求"回归测试 + 关系记忆专项测试 + narrative snippet 测试"（§10 L681），T15 narrative PoC 有独立验证方案。64/64 回归为硬门槛（§1 L20）。 | TDD §10 L681; §1 L20 |

### R5 偏执架构师

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 6 | D1 耦合度 | ✅ | 依赖方向清晰：shared/types → Engine(RelationshipMemoryManager) → AI(NarrativeSnippetBuilder, soul-prompt-builder, soul-evaluator)。AI 层不反向依赖 Engine 层的实现，通过 TickContext 可选字段注入（§6 L567-574）。NarrativeSnippetBuilder 仅依赖 shared/types（§4.5.1 L346-347），无循环依赖。 | TDD §4.5.1 L346-347; §6 L567-574 |
| 7 | D2 扩展性 | ✅ | 新增一个 RelationshipTag 只需：(1) soul.ts 加枚举值 (2) CONCLUSION_PHRASES 加一行 (3) TEMPLATES 按需加条件。改 2 个文件。框架短语表（§4.5.2 L420-428）按区间匹配，新增区间只需插入一行。 | TDD §4.5.2 L420-441 |
| 8 | D3 状态污染 | ✅ | PoC 阶段不修改 GameState（§7 L584 "不改存档 schema，v5 不变"）。RelationshipMemoryManager 数据在运行时 Map 中（§4.1 L250），唯一写入者是 Manager 自身（recordEvent/recordEncounter/recordDialogue）。narrativeSnippet 字段唯一写入者是 NarrativeSnippetBuilder 通过 updateNarrativeSnippet（§4.1 L295-299）。 | TDD §7 L584; §4.1 L250, L295-299 |
| 9 | D4 性能预警 | ✅ | buildByRules() 规则拼接为 O(k) 其中 k=keyEvents 数量（上限 10，§3.1 L111）。buildRelationshipSummary 为 O(k) 排序取 top-3。Narrative snippet 规则拼接"≤5ms"（§6 L545）。AI 预生成通过 AsyncAIBuffer 异步，不阻塞 tick。 | TDD §6 L545; §3.1 L111 |
| 10 | D5 命名一致 | ✅ | 新文件路径遵循分层：`shared/types/relationship-memory.ts`（Data 层）、`engine/relationship-memory-manager.ts`（Engine 层）、`ai/narrative-snippet-builder.ts`（AI 层）。与现有命名模式一致（如 `soul-evaluator.ts`、`soul-prompt-builder.ts`）。 | TDD §2 L39-58 |

### R6 找茬QA

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 11 | D1 边界穷举 | ⚠️ | (a) keyEvents 为空时 buildByRules() 的行为：PRD R-M09 步骤 2 定义了"0 条事件→跳过"，但 TDD 未在 §4.5.1 buildByRules 签名注释中明确此边界。(b) affinity 边界完整：FRAMING_PHRASES 覆盖 [-100,100] 无缝隙（§4.5.2 L420-428）。(c) narrativeSnippet 为 undefined 时 L6 摘要如何处理：§4.2 L325 写"+ narrativeSnippet（如有）"但 buildRelationshipSummary 签名无体现。 | TDD §4.5.2 L420-428; §4.2 L318-328; PRD R-M09 步骤 2 |
| 12 | D2 并发竞态 | ✅ | 双写点分布在不同 Pipeline 阶段：encounter-tick(610) → soul-event(625) → dialogue-tick(650)。同一 tick 内严格顺序执行（§6 L549-563），不存在同阶段多写者竞态。NarrativeSnippetBuilder.triggerAIPregenerate 通过 AsyncAIBuffer 异步（§4.5.1 L404-411），结果在下一 tick 的 ai-result-apply(625:5) 应用。 | TDD §6 L549-563; §4.5.1 L404-411 |
| 13 | D3 回归风险 | ✅ | 所有新参数均为 optional（§5.4 L516-519 `relationshipMemoryManager?`, `narrativeSnippetBuilder?`, `eventSeverity?`）。不传则行为不变（§5.4 L528-529）。§8 回归评估表确认 64 组测试零影响（L604-609）。soul-prompt-builder 和 soul-evaluator 为低风险（仅 additive）。 | TDD §5.4 L516-529; §8 L602-609 |
| 14 | D4 可测试性 | ✅ | T12（§10 L681）规划了三类测试：回归 64/64 + 关系记忆专项 + narrative snippet 专项。NarrativeSnippetBuilder.buildByRules() 为纯函数，输入确定输出确定，天然可测试。L2/L6 切换 getContextLevel() 也是纯函数。 | TDD §10 L681; §5.1 L463-466 |
| 15 | D5 存档兼容 | ✅ | §7 明确"不改存档 schema，v5 不变"（L584）。运行时 Map 页面刷新即清空（L584-586）。未来正式化路径（L590-596）规划了 v5→v6 迁移，但不在本 Phase 范围内。 | TDD §7 L584-596 |

---

## L2 CoVe 证据验证

### W1（R4-D3）：modelSize 获取机制不匹配

**原始发现**：TDD §5.5 声称 `/api/infer` 响应含 `modelSize` 字段，但实际代码不支持。

**验证问题**：
1. `/api/infer` 的实际响应结构是什么？
2. `/api/health` 是否包含可推断模型大小的字段？
3. SoulEvaluator 能否从其他途径获取模型信息？

**独立验证**：
1. `ai-server.ts` L523: `sendJson(res, 200, { content, parsed }, origin)` — 仅 content + parsed，无 modelSize。
2. `ai-server.ts` L450-456: `/api/health` 响应含 `modelSizeMB`（数值，如 800），可据此推断 0.8B/2B。
3. 现有 `src/ai/llm-adapter.ts` 封装了前端到后端的通信，可在此层增加 health 查询缓存。

**判定**：维持 ⚠️ WARN。机制可行（通过 /api/health），但 TDD 描述与实际不符，实施时可能导致混乱。建议修正 §5.5 为"通过 /api/health 查询 modelSizeMB 判断，缓存在 SoulEvaluator"。

### W2（R6-D1）：边界条件文档不充分

**原始发现**：keyEvents 为空时和 narrativeSnippet 为 undefined 时的行为未在 TDD 中明确。

**验证问题**：
1. PRD R-M09 是否定义了空事件行为？
2. TDD 的 buildRelationshipSummary 是否处理了 snippet 缺失？

**独立验证**：
1. PRD L253: "0 条事件: （跳过事件串联）" — PRD 定义了，TDD 应映射此行为。
2. TDD §4.2 L325: "+ narrativeSnippet（如有）" — 用"如有"暗示了处理，但未明确返回什么。

**判定**：维持 ⚠️ WARN。不阻塞设计，但建议在 §4.5.1 buildByRules 的 JSDoc 中补充空事件行为说明，在 §4.2 补充 snippet 缺失时 L6 摘要的精确格式。

---

## L3 结构化辩论

> 无角色间矛盾，跳过。

---

## Devil's Advocate 反向验证

### 历史高频问题模式检查

1. **术语不匹配**（Gate 1 B1 模式）：检查 TDD 中引用的类型名是否与代码一致。
   - `RelationshipTag` 引用（TDD L67）→ 确认 `src/shared/types/soul.ts` L173 存在 `'friend' | 'rival' | 'mentor' | 'admirer' | 'grudge'`。
   - CONCLUSION_PHRASES 含 `admirer`（TDD L439）但 PRD R-M09 步骤 3（PRD L257-264）未列出 `admirer`。**发现**：TDD 补全了 PRD 遗漏的 `admirer` tag，这是合理的工程补全（代码中确实存在此 tag），但存在 PRD↔TDD 不一致。登记为改进建议。

2. **宪法冲突**（Gate 1 B2 模式）：检查 TDD 是否引入了新的宪法冲突。
   - TDD §1 L21 "Prompt 上限 1024 tokens" + §9 ADR-IJ-09 L645 "需同步更新 CLAUDE.md L184" — 已有宪法变更声明。
   - T14（§10 L683）明确安排了宪法文档更新。无新冲突。

### 假设场景

**假设 1：如果 NarrativeSnippetBuilder.buildByRules() 生成的文本超过 80 字符会怎样？**
- TDD §4.5.1 L362 注释 "@returns ≤80 字符的叙事段落"，§3.1 L119 定义 `NARRATIVE_SNIPPET_MAX_CHARS = 80`。
- 但 buildByRules 签名中没有截断逻辑描述。框架短语最长"与{B}势同水火"=10字 + 3 条事件串联最长约 60 字 + 归纳短语最长约 15 字 ≈ 85 字。
- **验证**：存在超 80 字符的可能性。实现时需加截断保护。这是实现细节，不阻塞设计，但建议在 §4.5.1 补注"超 80 字符时截断"。

**假设 2：如果 soul-evaluator 在 L6 模式下同时从 buildRelationshipSummary 和 getSnippet 获取 narrative snippet，是否会重复注入？**
- §4.2 L325: buildRelationshipSummary 在 L6 时包含 "+ narrativeSnippet（如有）"
- §5.4 L526: "L6 时额外调用 narrativeSnippetBuilder.getSnippet() 获取叙事片段"
- **验证**：设计意图应为：SoulEvaluator 调用 getSnippet() → 更新 memory.narrativeSnippet → 然后 buildRelationshipSummary 从 memory 中读取。但 §5.4 的描述可能让实施者误解为两处独立获取。建议在 §5.4 明确调用顺序。

---

## 最终判定

### ⚠️ CONDITIONAL PASS

**BLOCK**：0
**WARN**：2

| # | 类型 | 说明 | 建议处理 |
|---|:----:|------|---------|
| W1 | ⚠️ | §5.5 modelSize 获取机制描述与实际 /api/infer 响应不符 | 修正为"通过 /api/health 查询 modelSizeMB，启动时缓存" |
| W2 | ⚠️ | 边界条件（空事件、snippet 缺失）的行为描述不够明确 | 在 §4.5.1 和 §4.2 补充边界行为说明 |

### 改进建议

1. **PRD 补全 admirer**：PRD R-M09 步骤 3 遗漏了 `admirer` tag 的归纳短语，TDD 已自行补全。建议回溯更新 PRD 保持一致性（非阻塞）。
2. **§5.4 明确 snippet 获取→注入的调用顺序**：当前 §5.4 步骤 3 和 §4.2 的 narrativeSnippet 获取存在歧义，建议明确"先 getSnippet() 更新缓存 → 再 buildRelationshipSummary 读取缓存"的时序。
3. **§4.5.1 补充截断保护**：buildByRules 理论上可超 80 字符，建议注明"超限时从事件串联末尾截断"。
4. **依赖矩阵预更新**：TDD 新增 RelationshipMemoryManager 和 NarrativeSnippetBuilder，`docs/design/arch/dependencies.md` 需在 T13 中补充这两个文件的依赖行（已在 T13 计划中，此处提醒确认）。

---

## 变更日志

| 日期 | 事件 |
|------|------|
| 2026-04-01 | Gate 2 首次审查：CONDITIONAL PASS（0 BLOCK / 2 WARN） |
| 2026-04-01 | W1 修复：§5.5 改为通过 /api/health 查询 modelSizeMB |
| 2026-04-01 | W2 修复：§4.5.1 补充空事件边界说明 + §4.2 补充 snippet 缺失处理 + §5.4 明确时序 |
| 2026-04-01 | 改进建议落实：PRD R-M09 补充 admirer 归纳短语 + §4.5.1 补充截断保护 |
