# 审查报告 -- Phase IJ Gate 1 (PRD v3.0)

> **审查日期**: 2026-04-01
> **审查对象**: `docs/features/phaseIJ-PRD.md` (v3.0)
> **审查协议**: review-protocol.md v1.2, 四层防线 L0-L3
> **连续全 PASS 次数**: 0（首次审查）

**激活角色**:
- R1 魔鬼PM（必选）
- R2 资深玩家（按需：涉及核心体验变更 -- NPC 行为决策）
- R3 数值策划（必选）
- R4 项目经理（按需：涉及跨版本影响 -- 模型升级 + Token 上限变更）
- R5 偏执架构师（必选）

---

## L0 Content Traceability Pre-Check

### L0.1 Data Anchor 追溯表

| Story# | AC/引用 | Data Anchor | 追溯结果 | 状态 |
|--------|---------|-------------|---------|:----:|
| IJ-01 | RelationshipMemory 结构 | PRD S4 R-M01 (L104-131) | 完整 interface 定义，含 keyEvents[], narrativeSnippet?, 统计量 | ✅ |
| IJ-02 | \|affinityDelta\| >= 5 + 矛盾覆盖 | PRD S4 R-M02/R-M03 (L136-144) | 阈值5明确，容量10条/对，溢出淘汰规则完整；矛盾覆盖50 tick间隔明确 | ✅ |
| IJ-03 | RelationshipMemoryManager 方法列表 | PRD S9 IJ-03 AC (L365) | AC 列出 record/get/buildSummary/getNarrativeSnippet 四方法 + 运行时 Map 存储 | ✅ |
| IJ-04 | L2/L6 切换表 | PRD S4.5 R-M08 (L193-202) | Data Anchor 声明 "S4.5 R-M08 切换表"，追溯确认：5行事件等级映射表完整 | ✅ |
| IJ-05 | SoulEvaluator 集成 | PRD S9 IJ-05 AC (L366) | AC 描述按事件等级选 L2/L6，传入关系摘要；对应规则 R-M04/R-M08 存在 | ✅ |
| IJ-08 | Narrative Snippet 规则拼接完整规则 | PRD S4.5 R-M09 (L204-245) | Data Anchor 声明 "S4.5 R-M09 完整规则表"，追溯确认：7档框架短语 + 事件串联模板 + 5类归纳定性 + 完整示例 | ✅ |
| IJ-09 | L2/L6 动态切换 | PRD S4.5 R-M08 (L193-202) | 同 IJ-04 追溯，切换表完整 | ✅ |
| IJ-10 | ai-server 模型检测 | PRD S9 IJ-10 AC (L376), Data Anchor "V4 报告 S6.3" | V4 报告 L332-333 确认 `[x] ai-server.ts 支持自动模型检测（优先 2B）` 已实现 | ✅ |
| IJ-11 | AI 预生成 PoC | PRD S9 IJ-11 AC (L377) | AC 含异步调用 + 缓存 + P95 <= 2000ms 目标，对应 R-M07 (L183-189) 三层降级策略 | ✅ |

### L0.2 缺失 Data Anchor 检查

| Story# | AC 内容 | 问题 | 状态 |
|--------|--------|------|:----:|
| IJ-04 | "Lv.0-1 注入 L2（好感+标签+1事件）" | L2 格式在 R-M05 (L156-160) 有完整模板 | ✅ |
| IJ-08 | "框架句+事件串联+归纳定性" | R-M09 (L209-244) 三步骤全展开 | ✅ |

**L0 结论**: 所有 Data Anchor 追溯成功，无缺失。L0 通过。

---

## L1 维度穷举签字

### R1 魔鬼PM 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 1 | D1 ROI | ✅ PASS | 开发成本 M（核心 PoC + 两个新系统），体验增量高（V4 证明 L6 叙事使 T4 正确率从 20%->80%，是 NPC "灵魂感" 的基础设施）。ROI >= 3。 | PRD L57-66 V4 数据；L202 决策正确率对比 |
| 2 | D2 认知负担 | ✅ PASS | 新系统面向引擎内部（RelationshipMemory/NarrativeSnippet），玩家端零新操作、零新概念。L2/L6 切换对玩家透明。 | PRD L148-149 注入时机为自动；S2 (L72-81) 交付目标均为引擎/AI层 |
| 3 | D3 范围控制 | ✅ PASS | IN/OUT 边界明确：S2 交付表 (L72-81) 列出"设计+PoC"与"仅设计定案"分级；不变量 I3 (L347) 禁止持久化；I6 (L351) 禁止实施完整 T2。每个功能点均有对应 User Story（IJ-01~IJ-06, IJ-08~IJ-11）。 | PRD S2 L72-81, S8 L344-353, S9 L359-377 |
| 4 | D4 实施可读性 | ⚠️ WARN | **问题 1**: R-M09 归纳定性引用 `enemy` 标签 (L235)，但现有 `RelationshipTag` 仅有 `'friend' \| 'rival' \| 'mentor' \| 'admirer' \| 'grudge'`（`src/shared/types/soul.ts` L173）。`enemy` 不存在于代码库中。开发者需要反问"enemy 是新增标签还是写错了？" **问题 2**: R-M10 模板表 (L253) 条件列使用 `rival`/`friend`/`any`/`无tag` 等匹配条件，但 R-M09 (L235) 额外使用了 `enemy`，两处标签集不一致。 | `src/shared/types/soul.ts` L173: `'friend' \| 'rival' \| 'mentor' \| 'admirer' \| 'grudge'`; PRD L235 引用 `enemy` |

### R2 资深玩家 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 5 | D1 30秒乐趣 | ✅ PASS | 叙事性上下文不是"30秒能看到"的功能，但它直接影响 NPC 台词质量（V4 T4 正确率从 20%->80%）。玩家感知到的是"弟子面对仇人不再无脑救人"，这是即时可感知的行为差异。 | V4 报告 S4.2 T4 L6 行为分布 (L190-193) |
| 6 | D2 数字感知 | ✅ PASS | 本 Phase 不引入玩家可见数值。affinity/encounterCount 均为引擎内部数据。Narrative snippet 输出给玩家的是文字叙事而非数字，符合 MUD 体验。 | PRD R-M01 (L121-124) 统计量不注入 prompt；R-M05 (L156-170) 输出是自然语言 |
| 7 | D3 操作动机 | ✅ PASS | 本系统完全自动化，玩家无需主动操作。增益在于"弟子行为更有灵魂感"。不存在"不用也行"的风险，因为系统嵌入引擎管线自动执行。 | PRD R-M04 (L148-150) 注入时机自动；S2 (L72-81) 全部为引擎层交付 |
| 8 | D4 挫败感管控 | ✅ PASS | 本系统不引入任何可失败的玩家操作。Narrative snippet 三层降级 (R-M07 L183-189) 保证永远有叙事产出（AI预生成->规则拼接->模板），无"无叙事"的挫败场景。 | PRD R-M07 (L183-189) 三层降级策略 |

### R3 数值策划 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 9 | D1 漏斗平衡 | ✅ PASS | 本 Phase 不引入新资源产出/消耗。RelationshipMemory 是纯信息层，不涉及灵石/灵气/丹药经济循环。 | PRD S3 (L86-97) 业务实体全部为信息型（Memory/Event/Goal/NPC）；无资源字段 |
| 10 | D2 极端模拟 | ⚠️ WARN | **keyEvents 容量上限 10 条/每对关系 (R-M02 L139)**。8 弟子 = C(8,2) = 28 对关系，最大 280 条事件。内存无问题。但 **矛盾覆盖规则 R-M03 (L144)** 的 50 tick 间隔窗口需极端验证：如果同类型事件在 51 tick 后再次发生，不触发覆盖，而是新增一条，会导致类似事件堆叠占满 10 条配额。若 2 个弟子反复碰面冲突（间隔 > 50 tick），10 条全部被同类事件填满，其他类型事件被 |delta| 最小淘汰挤出。 | PRD R-M02 L139, R-M03 L144 |
| 11 | D3 公式验证 | ✅ PASS | affinity [-100, +100] 已在 PhaseE 定义并有代码实现（`src/shared/types/game-state.ts` L164）；\|affinityDelta\| >= 5 阈值明确 (R-M02 L136)；乘数 cap x2.0 (R-G02 L303)；7档框架短语 affinity 区间完整覆盖 [-100, +100] (R-M09 L211-220)。 | 代码 `game-state.ts` L164; PRD L136, L211-220, L303 |
| 12 | D4 Sink 完备 | ✅ PASS | 不引入新资源，不适用。原因：本 Phase 所有新增实体（RelationshipMemory, NarrativeSnippet, CausalRule, PersonalGoal, T2NpcProfile）均为信息/规则型，不参与资源经济循环。 | PRD S3 L86-97 业务实体清单 |
| 13 | D5 二阶效应 | ⚠️ WARN | **目标系统 R-G02 (L303) 的行为偏移乘法叠加**可能产生二阶效应。例如：`breakthrough` 目标给 meditate x1.5，而 `ambition` 给 meditate x1.3，两者叠加 = x1.95（接近 cap x2.0）。若再有情绪权重偏移（Phase F 已实现），三层叠加可能使某个行为权重远高于其他行为，导致行为单一化。PRD 的 Pre-Mortem PM-4 (L394) 提到了 "capped x2.0 + 随机扰动"，但**随机扰动的具体机制未在 PRD 中定义**。 | PRD R-G02 L303, PM-4 L394；缺少随机扰动公式 |
| 14 | D6 规格完整 | 🔴 BLOCK | **问题 1**: 因果规则 C5 (L274) 引用 `introvert >= 0.7`，C6 (L275) 引用 `sect.ethos`，目标规则 R-G01 (L296-297) 引用 `introvert >= 0.6`, `extravert >= 0.6`, `conscientiousness >= 0.7`。但实际代码 `PersonalityTraits` 接口 (`game-state.ts` L103-108) 的维度是 `aggressive / persistent / kind / lazy / smart`，不包含 introvert/extravert/conscientiousness。PRD 使用了 Big Five 术语但代码使用了自定义五维。这使得"设计定案"无法直接编码。**问题 2**: `enemy` 标签在 R-M09 (L235) 被引用但不在现有 `RelationshipTag` 类型中（见 R1-D4）。**问题 3**: Narrative snippet AI 预生成 (IJ-11) 的 prompt 模板未定义 -- AC 说"异步调用 AI 生成 1 句叙事"但未指定 prompt 格式、输入参数、输出约束。虽然标记为 PoC，但"仅设计定案"的子系统也应有接口级定义。 | `game-state.ts` L103-108 五维为 aggressive/persistent/kind/lazy/smart; `soul.ts` L173 RelationshipTag 无 enemy; PRD L274-275, L296-297 引用不存在的字段名 |
| 15 | D7 内容追溯 | ✅ PASS | 所有 User Story AC 的 Data Anchor 均已在 L0 层追溯通过。IJ-04 锚定 R-M08、IJ-08 锚定 R-M09、IJ-10 锚定 V4 报告 S6.3，均可展开为完整数据。 | L0 追溯表全部 ✅ |

### R4 项目经理 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 16 | D1 范围蔓延 | 🔴 BLOCK | **关键冲突**: PRD v3.0 将模型从 `Qwen3.5-0.8B` 升级为 `Qwen3.5-2B` (PRD L62)，Token 上限从 512 放宽至 1024 (PRD L66)。但 CLAUDE.md 作为项目宪法仍规定：(1) `模型规格: Qwen3.5-0.8B`（CLAUDE.md L183）；(2) `prompt <= 512 tokens`（CLAUDE.md L184）；(3) `内存占用 <= 1GB 含 Qwen 0.8B GGUF 模型 (~800MB)`（CLAUDE.md L108）。2B 模型文件 1.2GB + VRAM 1.9GB，已超出 CLAUDE.md 1GB 内存红线。此外，MASTER-PRD S4.1 OUT 列（MASTER-PRD L88）标记 `LoRA 微调 / 大模型切换` 为 OUT。0.8B->2B 可被解读为"大模型切换"。**在 CLAUDE.md 和 MASTER-PRD 未同步更新之前，PRD v3.0 的模型/Token 变更缺乏宪法级授权。** | CLAUDE.md L108, L183-184; MASTER-PRD L88; PRD L62, L66 |
| 17 | D2 工期评估 | ⚠️ WARN | User Stories 总复杂度 = 3S + 5M = 约 13 单位工时。预研阶段还需 PoC 验证（IJ-11 narrative AI 预生成），总工期可能超过 8h。不过预研型 Phase 允许更大弹性。 | PRD S9 复杂度标注：IJ-01(S), IJ-02(S), IJ-03(M), IJ-04(M), IJ-05(M), IJ-08(M), IJ-09(S), IJ-10(S), IJ-11(M) |
| 18 | D3 依赖阻塞 | ✅ PASS | 外部依赖为 Qwen3.5-2B GGUF 模型，V4 报告确认已下载并集成 (`[x]` L332)，ai-server 已支持自动检测 (`[x]` L333)。无未验证外部依赖。 | V4 报告 S6.3 L332-333 行动项全部 checked |
| 19 | D4 路线图冲突 | ⚠️ WARN | MASTER-PRD S5 (L119-120) 列 Phase I 和 J 为 v0.9/v1.0 独立阶段。PRD v3.0 将两者合并为 Phase IJ 预研，改变了路线图结构。虽然 PRD S1.1 (L15-19) 解释了合并原因且合理，但 MASTER-PRD 尚未更新以反映合并。 | MASTER-PRD L119-120; PRD L15-19 |
| 20 | D5 交付验证 | ✅ PASS | 可交付物中：PoC 代码可运行验证（IJ-03, IJ-08, IJ-11），设计文档可人工审查（IJ-06），接口定义可类型检查。IJ-11 含量化验收标准（P95 <= 2000ms）。 | PRD S9 各 Story AC 描述 |

### R5 偏执架构师 审查

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 21 | D1 耦合度 | ✅ PASS | RelationshipMemory 扩展 RelationshipEdge（单向依赖：RelationshipMemory -> RelationshipEdge）。NarrativeSnippetBuilder 依赖 RelationshipMemory（单向）。soul-prompt-builder 消费摘要（单向）。不变量 I4 (L349) 要求因果事件走 EventBus 标准管线。依赖方向为 shared -> engine -> ai，符合分层架构。 | PRD R-M01 L106（扩展 RelationshipEdge）; I4 L349（EventBus）; TDD v2.0 S2 文件清单 shared/engine/ai 分层 |
| 22 | D2 扩展性 | ✅ PASS | 新增 CausalRule 为数据驱动（规则表 R-C01），新增规则只需添加表项，无需改核心代码。GoalType 为枚举扩展，新增目标类型只需添加枚举项 + 行为偏移配置。Narrative snippet 规则拼接基于配置表（7档框架+5类归纳），扩展只改配置。 | PRD R-C01 L268-277 规则表; R-G01 L292-298 目标枚举; R-M09 L209-240 配置表 |
| 23 | D3 状态污染 | ⚠️ WARN | RelationshipMemory 在 PoC 阶段使用运行时 Map (I3 L347)，不持久化到 GameState，故暂无状态污染。但正式实施时 keyEvents/narrativeSnippet 必须进入 GameState（存档需要），此时 RelationshipMemory 的写入者需要明确。PRD 未定义正式实施时的 Owner（写入者）——R-M02 说"交互产生"，但 soul-engine、dialogue-coordinator、soul-event.handler 都可能是写入点。 | PRD I3 L347（运行时 Map）; R-M02 L136-140 未指定具体写入 handler |
| 24 | D4 性能预警 | ✅ PASS | 关系记忆查询为 O(1) Map 访问（pairKey 索引）。Narrative snippet 规则拼接复杂度 O(k) 其中 k = min(3, keyEvents.length)，极低。因果事件扫描每 soul-tick 对 C(8,2)=28 对关系检查 8 条规则 = 224 次条件判断，仍为常数级（弟子数固定 8 人）。 | PRD R-C02 L279-283（每 soul-tick 扫描）; 8 弟子固定约束（MASTER-PRD L33） |
| 25 | D5 命名一致 | ✅ PASS | 文件命名遵循项目约定：`relationship-memory.ts`/`relationship-memory-manager.ts` 符合 kebab-case。类型命名 RelationshipMemory/KeyRelationshipEvent 符合 PascalCase 约定。方法名 record/get/buildSummary/getNarrativeSnippet 符合 camelCase。 | PRD S4 R-M01 L104-131; TDD v2.0 S2 L38-44 文件清单 |

---

## L1 汇总

| 判定 | 条目数 | 详情 |
|:----:|:------:|------|
| ✅ PASS | 18 | R1-D1/D2/D3, R2-D1/D2/D3/D4, R3-D1/D3/D4/D7, R4-D3/D5, R5-D1/D2/D4/D5 |
| ⚠️ WARN | 5 | R1-D4(#4), R3-D2(#10), R3-D5(#13), R4-D2(#17), R4-D4(#19), R5-D3(#23) |
| 🔴 BLOCK | 2 | R3-D6(#14), R4-D1(#16) |

---

## L2 CoVe 证据验证

### CoVe-1 -- R1-D4 WARN: `enemy` 标签不存在

**原结论**: WARN -- PRD R-M09 (L235) 引用 `enemy` 标签，但 `RelationshipTag` 无此值。

**验证问题**:
1. `enemy` 是否在代码库任何地方被定义或规划？
2. PRD 是否声明了 `RelationshipTag` 的扩展计划？

**独立答案**:
1. Grep `enemy` in `src/` 返回 0 结果。`src/shared/types/soul.ts` L173 明确定义 `RelationshipTag = 'friend' | 'rival' | 'mentor' | 'admirer' | 'grudge'`，无 `enemy`。
2. PRD R-M01 (L113) 直接写 `tags: RelationshipTag[]` 并注释 `// friend / rival / ...`，未声明新增 `enemy`。R-M09 (L235) 和 R-M10 未列入完整标签扩展计划。

**对比结果**: 一致 -- `enemy` 确实不存在，且 PRD 未声明扩展。
**最终判定**: 维持 WARN。这是规格不完整但不阻塞（可在 TDD 阶段补充为 `rival` 的映射或新增标签）。

---

### CoVe-2 -- R3-D2 WARN: 矛盾覆盖 50 tick 窗口可能导致事件堆叠

**原结论**: WARN -- 同类型事件间隔 > 50 tick 时不触发覆盖，可能占满 10 条配额。

**验证问题**:
1. 因果事件冷却是多少 tick？同一规则同一对弟子间隔多久可再次触发？
2. 10 条淘汰策略（\|affinityDelta\| 最小优先淘汰）是否足以保持事件多样性？

**独立答案**:
1. PRD R-C02 (L283): 同一规则同一对弟子 30 tick 冷却。矛盾覆盖窗口 50 tick (R-M03 L144)。因此 30 < 50，同一规则连续触发的事件会被矛盾覆盖（30 tick 间隔在 50 tick 窗口内）。问题出在**不同规则**产生同类型事件时：例如 C1（挑衅）和 C7（复仇）都可能对同一对弟子产生冲突事件，但因规则 ID 不同，可能不被归为"同类型"。PRD R-M03 未定义"同类型"的具体含义。
2. 淘汰策略按 \|affinityDelta\| 最小淘汰是合理的（保留影响最大的事件），但不保证类型多样性。

**对比结果**: 部分一致 -- 矛盾覆盖的"同类型"定义模糊是真实问题，但同一规则的冷却 < 覆盖窗口这一点缓解了主要风险。
**最终判定**: 维持 WARN（降低严重性评估，但"同类型"定义模糊确实存在）。

---

### CoVe-3 -- R3-D5 WARN: 目标系统行为偏移乘法叠加 + 随机扰动未定义

**原结论**: WARN -- 多层乘法叠加接近 cap，且"随机扰动"机制未定义。

**验证问题**:
1. PRD 中"随机扰动"是否在任何章节有定义？
2. Phase F 的行为权重系统是否已有扰动机制？

**独立答案**:
1. Grep `随机扰动` / `random.*perturbation` / `noise` 在 PRD 中仅出现在 PM-4 (L394) "capped x2.0 + 随机扰动" 一句话，无具体公式或参数。
2. Grep `perturb|noise|jitter|随机扰动` in `src/engine/` 返回 0 结果。Phase F 行为权重系统无现有扰动机制。

**对比结果**: 一致 -- "随机扰动"确实是 PRD 中未定义的悬空引用。
**最终判定**: 维持 WARN。目标系统为"仅设计定案"，扰动机制可在正式实施 Phase 补全。但 Pre-Mortem 不应引用不存在的缓解措施。

---

### CoVe-4 -- R3-D6 BLOCK: 性格维度术语不匹配

**原结论**: BLOCK -- PRD 因果/目标规则引用 Big Five 术语（introvert/extravert/conscientiousness），但代码使用 aggressive/persistent/kind/lazy/smart。

**验证问题**:
1. `introvert` / `extravert` / `conscientiousness` 是否在代码库中以任何形式存在？
2. 是否存在 Big Five 到自定义五维的映射关系？
3. 这些规则标记为"仅设计定案"是否降低了 BLOCK 的严重性？

**独立答案**:
1. Grep `introvert|extravert|conscientiousness` in `src/` 返回 0 结果。这些字段名完全不存在于代码库。
2. Grep `BigFive|big.*five|mapping.*personality` 返回 0 结果。无映射关系。实际五维为 `aggressive / persistent / kind / lazy / smart` (`game-state.ts` L103-108)。
3. PRD S2 (L77-78) 标记因果事件和个人目标为"仅设计定案"。设计定案的目的是"接口定义 + 数据结构 + 规则表"，但如果规则表引用了不存在的字段名，那么设计定案本身就有错误——未来 TDD/SGE 无法基于此定案编码。

**对比结果**: 一致 -- 字段名确实不匹配，且无映射关系存在。
**最终判定**: 维持 BLOCK。设计定案的核心价值在于"可直接转化为 TDD/代码"，引用不存在的字段名使其无法转化。需要将 introvert/extravert/conscientiousness 映射到实际的 aggressive/persistent/kind/lazy/smart 或明确声明字段扩展计划。

---

### CoVe-5 -- R4-D1 BLOCK: 模型/Token 变更与 CLAUDE.md 宪法冲突

**原结论**: BLOCK -- PRD 变更模型 0.8B->2B、Token 512->1024，与 CLAUDE.md 宪法条款冲突。

**验证问题**:
1. CLAUDE.md 的模型/Token/内存约束是否有条件限定词（如"默认""建议"）还是硬约束？
2. PRD 是否声明了对 CLAUDE.md 的变更申请或豁免？
3. MASTER-PRD OUT "大模型切换" 是否涵盖 0.8B->2B？

**独立答案**:
1. CLAUDE.md L107-108: `| 内存占用 | <= 1GB | 含 Qwen 0.8B GGUF 模型（~800MB） |` -- 写在"性能红线"表中，用"红线"一词表明是硬约束。L183: `| 模型规格 | Qwen3.5-0.8B（GGUF Q4_K_M），llama-server 子进程 |` -- 写在"AI 层专项约束"表中，无条件限定。L184: `| 推理预算 | 输出 <= 256 tokens，prompt <= 512 tokens |` -- 同表同格式，均为硬约束。
2. PRD S1.5 (L54-66) 说明了升级理由和 V4 数据支撑，但未声明"本 PRD 需要同步更新 CLAUDE.md"。
3. MASTER-PRD L88 OUT: `LoRA 微调 / 大模型切换`。"大模型切换"字面上可涵盖同系列不同规格的升级（0.8B->2B）。但也可理解为"切换到完全不同的大模型（如 GPT/Claude）"。解释有歧义。

**对比结果**: 一致 -- CLAUDE.md 确实是硬约束，PRD 确实未声明宪法变更。
**最终判定**: 维持 BLOCK。建议：PRD 应在 S1.5 明确声明"本 Phase 需同步更新以下宪法文档"并列出具体变更项，或在 PRD 通过后立即更新 CLAUDE.md 和 MASTER-PRD。宪法变更需要在 Gate 1 审查时被明确记录为前置条件。

---

### CoVe-6 -- R4-D2 WARN: 工期可能超 8h

**原结论**: WARN -- 总复杂度 3S+5M 约 13 单位。

**验证问题**:
1. 预研型 Phase 是否有不同的工期标准？
2. 哪些 Story 可以并行执行？

**独立答案**:
1. PRD S0 (L4) 标记 `Phase 类型：预研型（设计定案 + 核心 PoC）`。项目中无针对预研型 Phase 的特殊工期标准。
2. IJ-01/02 (S) 可并行于 IJ-06 (M)。IJ-08/09 (M/S) 依赖 IJ-01。IJ-11 (M) 依赖 IJ-08。关键路径: IJ-01 -> IJ-03 -> IJ-08 -> IJ-11 = S+M+M+M = 约 9 单位。

**对比结果**: 一致 -- 确实可能超 8h，但预研 Phase 有更大弹性。
**最终判定**: 维持 WARN。

---

### CoVe-7 -- R4-D4 WARN: 路线图未更新

**原结论**: WARN -- MASTER-PRD 仍列 Phase I/J 为独立阶段。

**验证问题**:
1. MASTER-PRD 是否有关于 Phase I/J 合并的任何记录？

**独立答案**:
1. MASTER-PRD L119-120 仍列 `| v0.9 | I | 深度世界 |` 和 `| v1.0 | J | 涌现与深度 |` 为独立行项，无合并说明。

**对比结果**: 一致。
**最终判定**: 维持 WARN。

---

### CoVe-8 -- R5-D3 WARN: 正式实施时 RelationshipMemory 写入者未定义

**原结论**: WARN -- PoC 阶段用运行时 Map 暂无问题，但正式实施时需要明确 Owner。

**验证问题**:
1. PRD 是否在任何地方声明了正式实施的 Owner 分配？
2. 现有 RelationshipEdge 的写入者是谁？

**独立答案**:
1. PRD 中无 Owner 矩阵。R-M02 (L136) 说"一次交互产生的好感变化"触发记录，但未指定哪个 handler 负责写入。
2. Grep `affinity` write in `src/engine/`: `soul-engine.ts` 和 `ai-result-apply.handler.ts` 都写入 RelationshipEdge.affinity。

**对比结果**: 一致。
**最终判定**: 维持 WARN。PoC 阶段可接受，但 TDD 必须定义 Owner 矩阵。

---

## L3 结构化辩论

### 辩论 1: R3-D6 BLOCK vs R5-D2 PASS（性格术语不匹配 vs 扩展性）

R5 在 D2 判定 PASS（扩展性好，新增目标只需枚举项），但 R3 在 D6 判定 BLOCK（规则引用了不存在的字段名）。

**不存在真正矛盾**: R5 评估的是架构扩展性（结构上是否支持新增），R3 评估的是规格完整性（引用的字段是否存在）。两者评审维度不同，不冲突。R5 的 PASS 评估的是"如果字段名正确，架构是可扩展的"，R3 的 BLOCK 评估的是"字段名本身不正确"。

**结论**: 无需辩论，维持 R3-D6 BLOCK。

---

## Devil's Advocate 反向验证

> L1 存在 WARN 和 BLOCK，不满足"全部 PASS"触发条件。但鉴于首次审查需要建立基线，仍执行部分 Devil's Advocate 检查。

### DA-1: 历史高频问题模式检查

MEMORY.md 为空（首次审查），无历史模式可用。跳过，记录为基线建立。

### DA-2: "如果 X 出错了会怎样" 假设场景

**假设 1: 如果规则拼接产出的 narrative snippet 质量远低于 V4 手写样例，导致 PROTECT bias 未被有效打破？**

验证：PRD PM-7 (L397) 承认此风险（概率低，影响高），缓解为"归纳定性短语针对性设计"。R-M09 的归纳短语（"此人不可信""其心可诛"）确实是 V4 L6 叙事片段的核心功能元素。但 V4 测试使用的是**手写叙事**（如 "李沐阳趁其闭关造谣，暗中拉拢弟子"），而规则拼接产出的是**模板化叙事**（如"此人曾因争夺破境草翻脸，又在裁决中被判有过，更在灵兽山暗算——屡次三番，此人不可信"）。两者风格不同。IJ-11 (Narrative Snippet AI 预生成 PoC) 是唯一验证此假设的 Story，但它被标记为 PoC 而非必须交付。如果 PoC 失败且规则拼接效果不足，Narrative Snippet 系统的核心价值主张（打破 PROTECT bias）可能不成立。

**发现**: PRD Assumption Audit A-5 (L407) 正确记录了此待验证假设。但 Assumption Audit 未定义 A-5 失败时的 fallback 策略（如果规则拼接不够打破 bias，且 AI 预生成也失败，整个 Narrative Snippet 系统的价值如何保底？）。建议在 Pre-Mortem 补充"两层都失败"的应急方案。

**假设 2: 如果 2B 模型在玩家设备上不可用（GPU VRAM < 4GB），降级到 0.8B 后 L3 甜蜜点的 Narrative Snippet 系统变成无用组件？**

验证：V4 报告 S5.2 (L287-300) 定义了降级方案 `0.8B + L3/L4`，L3 甜蜜点不使用 narrative snippet。这意味着整个 Narrative Snippet 系统（R-M07~R-M10, IJ-08~IJ-11，约占 PRD v3.0 新增内容的 40%）在降级场景下完全无用。PRD 未讨论这一 ROI 问题。

**发现**: PRD S1.5 强调 narrative snippet 是"必要组件"(L65)，但降级方案完全不使用它。这两个声明存在张力。建议 PRD 明确 narrative snippet 在 0.8B 降级场景下的处置（完全跳过/简化版使用/强制要求 2B）。

### DA-3: CLAUDE.md Token 变更的连锁影响

如果 prompt 上限从 512 提升到 1024，现有 `soul-evaluator.ts` 的 `maxTokens` 配置（L148: 200, L194: 150, L276: 50, L321: 150）加上 prompt 本身不会超标，但现有 prompt 模板是否有基于 512 上限的隐含假设需要检查。这属于 TDD/SGE 阶段的工作，但 PRD 应声明变更影响范围。

---

## 最终判定

### 🔴 BLOCKED

本次审查发现 **2 个 BLOCK + 5 个 WARN**，判定为 **BLOCKED**。

### BLOCK 条目（必须修复后重新审查）

| # | 来源 | 问题 | 修复建议 |
|---|------|------|---------|
| B1 | R3-D6 (#14) | 因果/目标规则引用 `introvert`/`extravert`/`conscientiousness` 字段，代码中不存在（实际为 `aggressive/persistent/kind/lazy/smart`）；`enemy` 标签不在 RelationshipTag 中 | 方案 A: 建立 Big Five -> 自定义五维的映射表并写入 PRD；方案 B: 将规则改写为使用实际字段名（如 introvert -> 1-aggressive? kind?）；`enemy` 改为 `rival`（最接近语义）或声明新增标签计划 |
| B2 | R4-D1 (#16) | 模型 0.8B->2B、Token 512->1024 与 CLAUDE.md 宪法硬约束冲突 | PRD S1.5 需增加"宪法变更声明"段落，列出需同步更新的文档（CLAUDE.md L108/L183/L184, MASTER-PRD L88 OUT 列）。或者将模型/Token 变更作为 Phase IJ 的正式前置条件，在 Gate 1 通过后、TDD 启动前完成宪法更新。 |

### WARN 条目（记入技术债务/改进建议）

| # | 来源 | 问题 | 建议 |
|---|------|------|------|
| W1 | R1-D4 (#4) | `enemy` 标签引用不一致（与 B1 重叠但 R1 视角为可读性） | 同 B1 修复 |
| W2 | R3-D2 (#10) | 矛盾覆盖 R-M03 的"同类型"定义模糊 | 在 R-M03 补充"同类型"的判定标准（如：同一 CausalRule ID? 同一事件等级? 同一行为类型?） |
| W3 | R3-D5 (#13) | 行为偏移乘法叠加的"随机扰动"未定义 | PM-4 缓解措施改为"capped x2.0"（已定义）+ "扰动机制待正式实施 Phase 设计"（诚实标注），删除当前的"随机扰动"引用 |
| W4 | R4-D2 (#17) | 工期估算可能超 8h | 可接受（预研 Phase 弹性），但建议在 TDD 中明确里程碑拆分 |
| W5 | R4-D4 (#19) | MASTER-PRD 路线图未反映 Phase I/J 合并 | Gate 1 通过后同步更新 MASTER-PRD S5 |
| W6 | R5-D3 (#23) | 正式实施时 RelationshipMemory 写入 Owner 未定义 | TDD 阶段必须定义 Owner 矩阵 |

### 改进建议（即使未来修复 BLOCK 后仍建议改进）

1. **Narrative Snippet 在 0.8B 降级场景的处置策略**: PRD 声明 narrative snippet 是"必要组件"，但降级方案(0.8B+L3)完全不使用它。建议在 PRD 中明确：降级时 narrative snippet 是跳过还是简化使用，避免 40% 新增设计在降级场景下浪费。

2. **Assumption Audit A-5 失败时的 Fallback**: 当前仅记录"待验证"，但未定义验证失败后的应急方案。建议补充：如果规则拼接叙事无法有效打破 PROTECT bias，且 AI 预生成 PoC 也未达标，Phase IJ 的交付策略如何调整（缩减范围? 仅交付 L2 级别? 接受 bias?）。

3. **IJ-11 (AI 预生成 PoC) 的 prompt 模板**: 即使标记为 PoC，也建议在 PRD 中给出 prompt 模板的草案或约束（输入字段、输出格式、字符上限），降低 TDD 阶段的歧义。

---

*报告生成时间: 2026-04-01 | 审查协议: review-protocol.md v1.2 | CoVe 协议: cove-protocol.md v1.0*
