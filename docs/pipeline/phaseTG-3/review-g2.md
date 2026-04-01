# Phase TG-3 Gate 2 Review (v1.0 Option B)

> **审查日期**: 2026-04-02 | **审查对象**: `docs/design/specs/phaseTG-3-TDD.md` v1.0 (Option B reversal)
> **关联 PRD**: `docs/features/phaseTG-3-PRD.md` v1.0 (GATE 1 PASSED)
> **关联 User Stories**: `docs/design/specs/phaseTG-3-user-stories.md` v1.0
> **前次审查**: `review-g2-pre.md` (session 013, Option C version, CONDITIONAL PASS, 4 WARN)
> **角色配置**: R1(魔鬼PM) R4(项目经理) R5(偏执架构师) | 跳过: R2(零体验变更) R3(零数值变更)
> **连续全 PASS 次数**: 0

---

## 最终判定

**CONDITIONAL PASS** (0 BLOCK / 3 WARN)

| 统计 | 数量 |
|------|:----:|
| BLOCK | 0 |
| WARN | 3 |
| PASS | 11 |

---

## 前次审查 (Option C) 追踪

| 前次# | 前次问题 | 本次状态 |
|:-----:|---------|---------|
| W1 | 3 SLO diffs only 1 identified | 方向改善（"对齐 AGENTS.md 值"），但仍未枚举全部 3 个差异 --> 本次 W2 |
| W2 | 验证清单未链接 + "等"使删除列表不穷举 | "等"问题已解决（AGENTS.md 不再瘦身）；验证清单仍未链接 --> 本次 W3 |
| W3 | F6 Mermaid 替换文本未指定 | 仍未指定，但 PRD R-D4-02 描述充分（"2 行文字描述"替换 19 行 Mermaid），实施者可从 PRD §2 内容自行提炼 --> 降为 PASS（风险低） |
| W4 | 16+ AGENTS.md 引用会断 | **已解决** -- Option B 保留 AGENTS.md 完整，零引用断裂 |

---

## L0 Content Traceability

> Gate 2 (TDD 审查) 按协议跳过 L0，直接进入 L1。

---

## L1 维度审查

### R1 魔鬼PM (4 维度)

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 1 | D1 ROI | PASS | 纯文档治理，成本 M，每次新会话受益。消除 80% 重复 + 3 个 SLO 差异。 | PRD §1d: 成本 M / 体验增量 4 |
| 2 | D2 认知负担 | PASS | 零玩家面变更，零新概念。Claude Code 会话启动从读 1 个 324 行文件变为读 1 个 80 行适配层 + 按需引用 AGENTS.md 段落。 | TDD §3.1 lines 86-109; 无新操作/新资源/新概念 |
| 3 | D3 范围控制 | PASS | PRD §5 IN/OUT 表清晰。11 个交付物(D1-D11)均被 User Stories 覆盖(US-TG3-01~07)。无"顺便"附加功能。 | PRD §5 lines 171-182; 7 User Stories 覆盖全部 D1-D11 |
| 4 | D4 实施可读性 | WARN | **TDD §3.1 删除列表遗漏 6 个 CLAUDE.md 段落**。TDD 列出 8 个待删段落（性能红线/代码规范/模块边界/AI 约束/禁止事项/数值验证/测试脚本/跨项目复用），但 CLAUDE.md 另有 6 个段落（编码前置条件 L71/版本边界 L159/回归测试+Tick Pipeline 挂载协议 L226/文档模块化规则 L244/Pipeline 过程资产规范 L264/交接文档 L277）同样与 AGENTS.md 重复，却未出现在删除列表或保留列表中。实施者不知该删还是留。若全保留，预期行数将从 ~80 行膨胀至 ~166 行，远超目标。 | CLAUDE.md `## ` headings grep: 17 sections; TDD §3.1 delete list: 8; retain list: 3 (常用命令/启动协议/Trinity); unlisted: 6; AGENTS.md equivalents confirmed at §3.5/§3.9/§3.10/§3.11/§3.12/§四(L289) |

### R5 偏执架构师 (5 维度)

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 5 | D1 耦合度 | PASS | Option B 保持 AGENTS.md 完整独立可用，CLAUDE.md 单向引用 AGENTS.md。无循环权威。TDD §1.2 I2 确认单向层级。 | TDD §1.2 line 28; ADR-TG3-01 line 180-197 |
| 6 | D2 扩展性 | PASS | 新增文件（cross-index.md/traceability.md/handoff-archive.md）均为行追加型，未来 Phase 只需追加行。新 Phase 注册到这些索引表只需改 1 个文件。 | TDD §3.4 line 159; §3.5 line 169 |
| 7 | D3 状态污染 | PASS | 零 GameState 变更。TDD §1.1 6 项检查全部"否"。 | TDD §1.1 lines 14-20 |
| 8 | D4 性能预警 | PASS | 零运行时影响。纯文档治理，无 tick 逻辑。 | TDD §5.7 line 256: "零代码 Phase" |
| 9 | D5 命名一致 | PASS | 新文件路径遵循现有约定: cross-index.md 放 arch/ 下（与 layers/gamestate/pipeline/dependencies/schema 同级），traceability.md 放 prd/ 下（与 economy/systems/formulas 同级），handoff-archive.md 放 project/ 下（与 handoff.md 同级）。 | TDD §2.1 F4/F8/F9 路径; project.yaml paths 约定 |

### R4 项目经理 (5 维度)

| # | 维度 | 判定 | 说明 | 证据 |
|---|------|:----:|------|------|
| 10 | D1 范围蔓延 | PASS | 全部 11 个交付物属文档治理范畴（TG 系列目的）。无功能代码变更。PRD §5 OUT 列排除了代码变更/Skill 流程修改。 | PRD §5 lines 171-182; TDD §1.1 lines 14-20 |
| 11 | D2 工期评估 | PASS | 15 文件但多数为 1 行追加（F12-F15 各加 1 行互引）。PRD §6.5 已添加实施后验证清单（Gate 1 W5 修复）。复杂度集中在 F1(CLAUDE.md 瘦身) 和 F3(handoff 瘦身)，均为 M 级。 | PRD §6.5 V1-V7; TDD §2.2 依赖图 4 阶段 |
| 12 | D3 依赖阻塞 | PASS | 零外部依赖。所有 15 个文件均为项目内文档。TDD §2.1 依赖列只有文件间顺序依赖。 | TDD §2.1 依赖列; §2.2 执行顺序 |
| 13 | D4 路线图冲突 | PASS | TG 系列与功能 Phase 正交。不影响 I-beta/I/J 路线。task-tracker 已注册 TG-3。 | task-tracker.md L15; MASTER-PRD §5 |
| 14 | D5 交付验证 | WARN | **TDD §5.9 未链接 PRD §6.5 验证清单 (V1-V7)**。PRD 定义了 7 项可自动化的实施后检查（SLO 零差异/cross-index 行数/traceability 覆盖/INDEX 注册/MASTER 行数/handoff 行数/零断链），但 TDD §5.9 仅写"文件变更汇总表覆盖 15 个文件"。SGE 实施后可能不执行这些验证。 | TDD §5.9 line 267 vs PRD §6.5 lines 197-208 |

---

## L2 CoVe 验证

### CoVe -- W1 (R1-D4: 6 个 CLAUDE.md 段落未列入删除/保留列表)

**原结论**: WARN -- TDD §3.1 删除列表遗漏 6 个段落，实施者无法判断去留。

**验证问题**:
1. 这 6 个 CLAUDE.md 段落是否在 AGENTS.md 中有等价内容？
2. 保留这 6 个段落是否会导致 CLAUDE.md 超出 ~80 行目标？
3. PRD R-D1-04 的删除范围是否已覆盖这 6 个段落？

**独立答案**:
1. 全部有等价内容: 编码前置条件 = AGENTS.md §四 L289; 版本边界 = §3.5 L137; 回归测试/Tick Pipeline = §3.9 L197; 文档模块化 = §3.10 L207; Pipeline 过程资产 = §3.11 L237; 交接文档 = §3.12 L270。（证据: grep "编码前置|版本边界|回归测试|文档模块化|过程资产|交接文档" on AGENTS.md）
2. 6 段合计 ~86 行。加上 TDD 计划保留的 ~80 行 = ~166 行，远超目标。（证据: CLAUDE.md 行号区间 L71-89, L159-177, L226-241, L244-262, L264-275, L277-283）
3. PRD R-D1-04 使用"等"字（"性能红线、代码规范、模块边界、AI 约束、禁止事项**等**"），语义上覆盖但未穷举。TDD §3.1 本应将 PRD 的"等"展开为完整列表。

**对比结果**: 一致
**最终判定**: 维持 WARN

---

### CoVe -- W2 (R1-D4 补充: SLO 差异未枚举)

**原结论**: WARN -- TDD 说"修正 SLO 差异"但未列出具体差异项。

**验证问题**:
1. CLAUDE.md 和 AGENTS.md 之间有多少个 SLO 数值差异？
2. "对齐 AGENTS.md 值"是否足够明确，不需要逐项列举？

**独立答案**:
1. 3 个差异: (a) 后端内存 2GB (CLAUDE.md L108) vs 1GB (AGENTS.md L88); (b) prompt budget 1024 tokens (CLAUDE.md L184) vs 512 tokens (AGENTS.md L396); (c) 模型规格 Qwen3.5-2B (CLAUDE.md L183) vs Qwen3.5-0.8B (AGENTS.md L395)。
2. 方向明确（以 AGENTS.md 为准），但 (b) 和 (c) 不在典型"性能红线"段落而在"AI 层专项约束"段落。实施者若只 grep 性能红线段，会遗漏 (b)(c)。逐项列举是安全网，尤其 PRD R-D1-05 要求"零差异"。

**对比结果**: 一致
**最终判定**: 维持 WARN -- 但不升级为 BLOCK，因为方向无歧义，风险为遗漏而非方向错误。合并入 W1 作为子项更合适，但为清晰起见保持独立编号。

---

### CoVe -- W3 (R4-D5: PRD §6.5 验证清单未链接)

**原结论**: WARN -- TDD §5.9 未引用 PRD §6.5 V1-V7。

**验证问题**:
1. TDD 中是否有任何段落引用 PRD §6.5 或 V1-V7？
2. SGE 是否有其他途径获取验证清单（如直接读 PRD）？

**独立答案**:
1. grep "V1|V2|V3|V4|V5|V6|V7|验证清单|§6.5" on TDD: 零匹配。（证据: grep 结果为空）
2. SGE 在 Gate 3 流程中确实会读 PRD（review-protocol §0 Gate 3 交付清单不含 PRD，但 SKILL.md 要求 SGE 读 TDD + User Stories）。然而 TDD 是 SGE 的主要执行依据，遗漏验证清单链接会增加遗忘风险。

**对比结果**: 一致
**最终判定**: 维持 WARN

---

## L3 结构化辩论

无角色间矛盾，跳过。

---

## Devil's Advocate 反向验证

> L1 未全 PASS（3 WARN），但按协议仍执行历史模式检查。

### 历史高频模式检查

| # | 历史模式 | 本次检查 | 结果 |
|---|---------|---------|------|
| 1 | task-tracker/roadmap 未同步（出现 4+ 次） | task-tracker L15 已注册 TG-3。handoff.md L22 提及 TG-3。 | 无问题 |
| 2 | 文档引用交叉断裂（TG-3 前次 W4 的教训） | Option B 保留 AGENTS.md 完整，16+ 引用不受影响。 | 已解决 |
| 3 | TDD 遗漏 PRD 某些交付物的详细设计 | TDD §3 详细设计覆盖 F1/F2/F3/F8/F9（5/15），其余 10 个文件为 1 行变更或指针添加，自明性较高。F5/F6（MASTER 文件修正）虽未有 §3.x 段，但 PRD R-D3/R-D4 规格已足够精确（改数字/删 Mermaid/加指针）。 | 可接受 |
| 4 | 签章/模板更新遗漏（TG-2 W1） | TDD SGA Signoff 格式正确，包含 8 项检查。 | 无问题 |
| 5 | INDEX.md 新文件注册遗漏（TG-2 W2） | TDD F7 明确规划 INDEX.md 更新，PRD R-D5-05 覆盖 TG-3 自身注册。 | 无问题 |

### 假设场景

**场景 A**: "如果实施者只读 TDD §3.1 删除列表，不额外检查 CLAUDE.md 全量段落？"
--> 6 个未列段落被遗留在 CLAUDE.md 中，导致瘦身后 ~166 行而非 ~80 行。User Story AC2 ("<=100 行") 会失败，但要到 Gate 3 才能发现。应在 TDD 中穷举以前置预防。

**场景 B**: "如果实施者修正了内存 SLO 差异但漏掉了 prompt budget 和模型规格差异？"
--> PRD R-D1-05 "零差异" 要求被违反。V1 验证（grep 性能红线数值逐条比对）应能捕获，前提是实施者知道 prompt/模型不在"性能红线"段而在"AI 约束"段。TDD 枚举 3 个差异可完全消除此风险。

---

## WARN 汇总

| # | 来源 | 问题 | 建议修复 |
|---|------|------|---------|
| W1 | R1-D4 | TDD §3.1 删除列表遗漏 6 个 CLAUDE.md 段落 | ✅ **已修复** — §3.1 补充为 14 个完整删除段落列表 |
| W2 | R1-D4 | TDD §3.1 "修正 SLO 差异" 未枚举具体差异项 | ✅ **已修复** — §3.1 第 6 点补充 3 处差异枚举（内存/prompt/模型） |
| W3 | R4-D5 | TDD §5.9 未链接 PRD §6.5 验证清单 | ✅ **已修复** — §5.9 追加 PRD §6.5 V1-V7 链接 |

---

## 改进建议

1. **穷举删除范围**: TDD §3.1 应将 CLAUDE.md 的 17 个 `## ` 级段落逐一标注为"删除"或"保留"，消除实施歧义。当前 8 删除 + 3 保留 = 11，遗漏 6 个。
2. **SLO 差异清单化**: 当 PRD 要求"零差异"时，TDD 应将全部差异项列为 checklist，而非笼统说"修正差异"。这是可重复的审查模式 -- 任何"零 X"约束都应有完整 X 列表。
3. **验证清单前向链接**: TDD §5.9 应链接 PRD §6.5 的 V1-V7，确保 SGE 在实施后有明确的验收步骤。这是连续第 2 次出现此类遗漏（前次 Option C 版本同一问题），建议在 SGA SKILL.md 模板中固化此检查项。

---

## 判定完整性校验

| 检查项 | 结果 |
|--------|------|
| BLOCK 数 = 0 | 确认 |
| WARN 数 = 3 | 确认 (W1 + W2 + W3) |
| PASS 数 = 11 | 确认 (R1: D1/D2/D3 + R5: D1/D2/D3/D4/D5 + R4: D1/D2/D3) |
| 头部判定 = CONDITIONAL PASS | 合法 (BLOCK=0, WARN>0) |
| L1 表格行数 = 14 = 4+5+5 | 一致 |
