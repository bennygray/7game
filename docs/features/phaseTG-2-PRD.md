# Phase TG-2 — PRD: 审查上下文交付 + 影响审计扩展 + INDEX 补全

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：SPM | **状态**：Draft → 待 Gate 1
> **前置**：Phase TG-1 完成（三层拦截机制，FB-020(a) 已清偿）
> **清偿**：FB-020(b)

---

## §1 背景与动机

Phase TG-1 解决了审查报告"判定结果自相矛盾"问题（BLOCK>0 但判 CONDITIONAL PASS）。
但审查**深度**仍有系统性风险：

1. **@doc-reviewer 上下文不足**：独立上下文启动时缺少项目约束和关联文档，审查可能浮于表面
2. **SGA Step 5 覆盖不全**：5.1-5.5 只审计代码关联（类型/签名/副效果/Handler），遗漏测试脚本/文档/回归/迁移链
3. **INDEX.md 严重滞后**：8+ Phase 的 50+ 文件未注册，新会话无法通过 INDEX 发现项目文档

---

## §2 Invariant

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | doc-reviewer 收到的上下文必须足够独立执行四层防线 | 审查形式化，BLOCK 漏检 |
| I2 | SGA Step 5 必须覆盖所有可能产生编译/运行时错误的关联变更 | 重复 FB-019（遗漏修改文件） |
| I3 | INDEX.md 必须是 docs/ 下所有 .md 文件的完整索引 | 文档不可发现 |

---

## §3 交付物规格

### D1: Reviewer 上下文交付协议

**目标文件**：`review-protocol.md` 新增 §0 + 三个 SKILL.md 调用模板更新

**规则**：

R-D1-01: review-protocol.md 新增 "§0 上下文交付清单" 段，位于 "执行流程" 之前。

R-D1-02: 上下文清单按 Gate 类型分三组：

| Gate | 必须交付的上下文 |
|------|----------------|
| **Gate 1 (SPM)** | ① review-protocol.md ② 对应 personas/*.md ③ PRD 文件 ④ User Stories 文件 ⑤ CLAUDE.md §版本边界 + §模块边界 摘要（≤30 行） ⑥ 前置 Phase 的 review 报告（如有 WARN 项需延续追踪） |
| **Gate 2 (SGA)** | ① review-protocol.md ② 对应 personas/*.md ③ TDD 文件 ④ PRD 文件（已签章） ⑤ MASTER-ARCHITECTURE.md ⑥ pipeline.md + dependencies.md ⑦ Gate 1 review 报告 |
| **Gate 3 (SGE)** | ① review-protocol.md ② 对应 personas/*.md ③ TDD 文件 ④ 实际代码变更清单（文件名 + 变更摘要） ⑤ 验证脚本输出摘要 ⑥ Gate 2 review 报告 |

R-D1-03: 每个 SKILL.md 的 @doc-reviewer 调用模板必须包含完整的上下文交付指令，格式为结构化列表。

R-D1-04: 上下文交付清单中的每个文件必须使用 `${paths.xxx}` 路径变量（从 project.yaml 解析），禁止硬编码路径。

R-D1-05: 父 agent 在调用 @doc-reviewer 前，必须验证清单中所有文件存在。缺失文件 → 停止调用，向 USER 报告。

### D2: SGA Step 5 扩展 (5.5-5.9)

**目标文件**：`.agents/skills/architect/SKILL.md` Step 5 段

**规则**：

R-D2-01: 在现有 5.1-5.4 之后、5.5（产出与校验）之前，插入四个新子步骤：

**5.5 测试脚本影响审计**
- 列出 TDD 涉及的所有公式文件 / 核心逻辑文件
- Grep `scripts/verify-*.ts` 和 `scripts/regression-*.ts` 中对这些文件的 import/引用
- 被引用的测试脚本 → 评估是否需要更新断言或新增 case
- 产出：测试脚本影响表

**5.6 文档一致性审计**
- TDD 新增的文件（代码文件 / 文档文件）是否已列入 INDEX.md 更新计划
- TDD 新增的 GameState 字段是否已列入 `arch/gamestate.md` 更新计划
- TDD 新增的 Pipeline Handler 是否已列入 `arch/pipeline.md` 更新计划
- 产出：文档一致性检查表（是/否/不适用）

**5.7 回归测试范围确定**
- 根据 TDD 的修改文件清单，确定必须运行的测试套件：
  - `regression-all.ts`：修改 Pipeline/Handler/GameState 时必须
  - `verify-phaseX.ts`：修改对应 Phase 引入的公式或逻辑时必须
  - `verify-ui-formatter.ts`：修改 UI 格式化逻辑时必须
- 产出：回归测试执行清单

**5.8 存档迁移链完整性**
- 检查 TDD 是否新增 GameState 持久化字段
  - 是 → 确认迁移函数 `migrateVxToVy` 已规划 + schema.md 更新已列入
  - 否 → 标注"零迁移"
- 产出：迁移检查结果（一行）

R-D2-02: 原 5.5"产出与校验" 重编号为 **5.9**，内容不变。

R-D2-03: 5.9 的校验范围扩展为 5.1-5.8 全部（原只覆盖 5.1-5.4）。

### D3: INDEX.md 补全

**目标文件**：`docs/INDEX.md`

**规则**：

R-D3-01: 补全以下缺失条目（按实际文件系统扫描结果）：

**PRD/Analysis 缺失**（8 个）：
- phaseX-alpha-PRD.md、phaseX-beta-PRD.md、phaseX-gamma-PRD.md
- phaseIJ-PRD.md、phaseIJ-poc-PRD.md
- phaseJ-goal-PRD.md、phaseI-alpha-PRD.md、phaseTG-1-PRD.md

**TDD 缺失**（8 个）：
- phaseI-alpha-TDD.md、phaseIJ-TDD.md、phaseJ-goal-TDD.md、phaseTG-1-TDD.md
- phaseX-alpha-TDD.md、phaseX-beta-TDD.md、phaseX-gamma-TDD.md、phaseZ-TDD.md

**User Stories 缺失**（4 个）：
- phaseI-alpha-user-stories.md、phaseJ-goal-user-stories.md
- phaseTG-1-user-stories.md、phaseX-gamma-user-stories.md

**验证脚本缺失**（9+ 个）：
- verify-phaseE.ts、verify-phaseF.ts、verify-phaseF0-alpha.ts、verify-phaseF0-beta.ts
- verify-phaseI-alpha-causal.ts、verify-phaseIJ-relationship-memory.ts
- verify-phaseJ-goal.ts、verify-ui-formatter.ts、regression-all.ts

**Pipeline 过程资产缺失**（10+ Phase）：
- X-α、X-β、X-γ（含 code-review、review-fix-task 等特殊文件）
- Y（spm、plan、backend-code-review、backend-review-fix-task）
- Z（全套 spm/plan/review/task/walkthrough）
- IJ（gate review files: review-g1-v3、review-g2-v3、review-g3-v3、task、walkthrough）
- IJ-PoC（review-v2、review-v4 系列 7 个文件）
- J-Goal（全套 spm/review-g1/g2/g3/task/walkthrough）
- I-alpha（全套 spm/review-g1/g2/g3/task/walkthrough）
- TG-1（全套 spm/review-g1/g2/g3/task/walkthrough）
- trinity-guardian（plan、process-audit、review）
- infra-review-v1.2（plan、walkthrough）

R-D3-02: 新增 Phase TG-2 自身的 PRD / User Stories / pipeline 条目。

R-D3-03: Pipeline 过程资产表格使用与现有 Phase 一致的"Phase × 5 列"格式，但对于含多版本 review 文件的 Phase（如 IJ、J-Goal、I-alpha、TG-1），在行内链接后标注版本（如 `review-g1-v3`）。

R-D3-04: 补全后，执行自检验证：`find docs/ -name '*.md' | sort` + `find scripts/ -name '*.ts' | sort` 的输出与 INDEX.md 中所有引用路径做 diff，确保零遗漏。对每个新增条目的文件路径执行存在性检查。

---

## §4 范围边界

| ✅ IN | 🚫 OUT |
|:------|:-------|
| review-protocol.md 新增 §0 | 修改四层防线 L0-L3 本身的逻辑 |
| 三个 SKILL.md 的调用模板更新 | 修改 Step 1-4 的内容 |
| SGA Step 5.6-5.9 新增 | 修改 Step 5.1-5.4 已有内容 |
| INDEX.md 全量补全 | 创建 START-HERE.md（TG-3 范围） |
| | 交叉索引 / 追溯链（TG-3 范围） |

---

## §5 Pre-Mortem

| 风险 | 概率 | 影响 | 缓解 |
|------|:----:|:----:|------|
| 上下文清单过长导致 doc-reviewer 上下文溢出 | 中 | 中 | 使用摘要（≤30 行）而非完整文档 |
| Step 5.6-5.9 增加 SGA 工作量导致阻力 | 低 | 低 | 每步仅需 1 条 grep + 1 个检查表行 |
| INDEX 补全遗漏文件 | 低 | 低 | 执行完后 diff 文件系统 vs INDEX |

---

## §6 Assumption Audit

| 假设 | 验证方式 | 风险等级 |
|------|---------|:-------:|
| doc-reviewer agent 能读取交付的所有文件 | TG-3 首次全流程测试 | 低 |
| Step 5.6-5.9 不会显著延长 SGA 时间 | 下一个 SGA Phase 实测 | 低 |
| INDEX.md 文件列表在本次补全后保持准确 | 每个 Phase 完成时 SGE walkthrough 检查 | 低 |

---

## USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] 评审文件完整性：review-g1.md 存在，CONDITIONAL PASS (0 BLOCK / 3 WARN 全修复)
- [x] Party Review 无 BLOCK 项

签章：`[x] GATE 1 PASSED` — 2026-04-02
