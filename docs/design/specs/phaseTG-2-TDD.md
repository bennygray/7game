# Phase TG-2 — TDD: 审查上下文交付 + 影响审计扩展 + INDEX 补全

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：SGA | **状态**：Draft → 待 Gate 2
> **前置**：PRD v1.0 `[x] GATE 1 PASSED` — 2026-04-02

---

## §1 全局对齐

### 1.1 层级归属

本 Phase 修改的文件全部位于**文档/流程层**，不涉及 src/ 或 server/ 代码：

| 文件 | 层级 | 性质 |
|------|------|------|
| `.agents/skills/_shared/review-protocol.md` | 流程定义 | 修改（+§0 段） |
| `.agents/skills/product-manager/SKILL.md` | 流程定义 | 修改（调用模板更新） |
| `.agents/skills/architect/SKILL.md` | 流程定义 | 修改（Step 5 扩展 + 调用模板更新） |
| `.agents/skills/engineer/SKILL.md` | 流程定义 | 修改（调用模板更新） |
| `docs/INDEX.md` | 文档索引 | 修改（全量补全） |

### 1.2 Invariant 验证

| PRD Invariant | 架构冲突 | 结论 |
|---------------|---------|------|
| I1 doc-reviewer 上下文充分 | 无冲突 — 新增内容是增量 | ✅ |
| I2 Step 5 覆盖全关联 | 无冲突 — 插入新子步骤不影响已有 5.1-5.4 | ✅ |
| I3 INDEX 完整 | 无冲突 — 纯追加 | ✅ |

---

## §2 修改规划

### T1: review-protocol.md 新增 §0 上下文交付清单

**位置**：在 `## 执行流程` 段之前插入新段 `## §0：上下文交付清单（调用方必读）`

**内容**：三个 Gate 的上下文文件列表（PRD R-D1-02 完整规格）

```markdown
## §0：上下文交付清单（调用方必读）

> **此段面向调用 @doc-reviewer 的父 agent**。
> 在发起审查前，必须将以下文件交付给 doc-reviewer。
> 缺失文件 → 停止调用，向 USER 报告。

### Gate 1 (SPM → doc-reviewer)

| # | 交付内容 | 路径 |
|---|---------|------|
| 1 | 审查协议 | `.agents/skills/_shared/review-protocol.md`（注：无 project.yaml 条目，硬编码路径） |
| 2 | 角色定义 | `.agents/skills/_shared/personas/` 下对应角色文件（同上） |
| 3 | PRD 文件 | `${paths.features_dir}/[name]-PRD.md` |
| 4 | User Stories | `${paths.specs_dir}/[name]-user-stories.md` |
| 5 | 项目约束摘要 | CLAUDE.md §版本边界 + §模块边界（≤30 行摘要） |
| 6 | 前置 review | 上一 Phase 的 review 报告（如有延续 WARN） |

> **已知限制**：`.agents/` 路径在 project.yaml 中无 paths 条目，审查协议和角色定义使用硬编码路径。
> 这是可接受的偏差 — `.agents/` 目录结构在项目间固定，不需要动态解析。

### Gate 2 (SGA → doc-reviewer)

| # | 交付内容 | 路径 |
|---|---------|------|
| 1 | 审查协议 | `.agents/skills/_shared/review-protocol.md` |
| 2 | 角色定义 | `.agents/skills/_shared/personas/` 下对应角色文件 |
| 3 | TDD 文件 | `${paths.specs_dir}/[name]-TDD.md` |
| 4 | PRD 文件（已签章） | `${paths.features_dir}/[name]-PRD.md` |
| 5 | 架构索引 | `${paths.master_arch}` |
| 6 | Pipeline + 依赖 | `${paths.arch_pipeline}` + `${paths.arch_dependencies}` |
| 7 | Gate 1 review | `${paths.pipeline_dir}/phaseX/review-g1.md` |

### Gate 3 (SGE → doc-reviewer)

| # | 交付内容 | 路径 |
|---|---------|------|
| 1 | 审查协议 | `.agents/skills/_shared/review-protocol.md` |
| 2 | 角色定义 | `.agents/skills/_shared/personas/` 下对应角色文件 |
| 3 | TDD 文件 | `${paths.specs_dir}/[name]-TDD.md` |
| 4 | 代码变更清单 | 文件名 + 变更摘要（由 SGE 编译） |
| 5 | 验证脚本输出 | tsc / lint / regression / 专项测试结果摘要 |
| 6 | Gate 2 review | `${paths.pipeline_dir}/phaseX/review-g2.md` |
```

**预估行数**：+45 行

---

### T2: 三个 SKILL.md 调用模板更新

**SPM SKILL.md** — Party Review Gate 段中 @doc-reviewer 调用模板：

当前模板（约 L263-273）：
```
@doc-reviewer 审查 Phase [X] Gate 1。
PRD: ${paths.features_dir}/[name]-PRD.md
User Stories: ${paths.specs_dir}/[name]-user-stories.md
角色配置: ...
```

更新为：
```
@doc-reviewer 审查 Phase [X] Gate 1。

上下文交付（参照 review-protocol.md §0 Gate 1 清单）：
  1. 审查协议: .agents/skills/_shared/review-protocol.md
  2. 角色定义: [列出本次激活的 personas/*.md 文件]
  3. PRD: ${paths.features_dir}/[name]-PRD.md
  4. User Stories: ${paths.specs_dir}/[name]-user-stories.md
  5. 项目约束: CLAUDE.md §版本边界 + §模块边界 摘要
  6. 前置 review: [如有前置 Phase WARN 延续，附 review 文件路径]

角色配置:
  必选: R1(魔鬼PM) R3(数值策划) R5(偏执架构师)
  按需: R2(资深玩家,条件:涉及核心体验变更) R4(项目经理,条件:涉及跨版本影响)
  适配: [参照上方角色适配规则表]

⚠️ 调用前检查：上述所有文件必须存在。缺失 → 停止，向 USER 报告。
```

**SGA SKILL.md** — Party Review Gate 段，同理更新为 Gate 2 清单格式。

**SGE SKILL.md** — Party Review Gate 段，同理更新为 Gate 3 清单格式。

**每个文件预估**：+8~12 行（净增）

---

### T3: SGA SKILL.md Step 5 扩展 (5.5-5.9)

**位置**：在 `### 5.5 产出与校验` 之前插入 4 个新子步骤

**新增内容**：

```markdown
### 5.5 测试脚本影响审计

当 TDD 涉及公式文件（`src/shared/formulas/`）或核心逻辑文件时：

1. 列出 TDD 修改/新增的所有公式/逻辑文件
2. Grep `scripts/verify-*.ts` 和 `scripts/regression-*.ts` 中对这些文件的 import
3. 被引用的脚本 → 评估是否需要更新断言或新增 case
4. 产出：测试脚本影响表

| 公式/逻辑文件 | 引用脚本 | 需更新 | 说明 |
|-------------|---------|:-----:|------|

### 5.6 文档一致性审计

检查 TDD 的修改清单是否已包含必要的文档更新：

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 新增代码文件 → `docs/INDEX.md` 更新计划？ | ✅/❌/N/A |
| 2 | 新增 GameState 字段 → `arch/gamestate.md` 更新计划？ | ✅/❌/N/A |
| 3 | 新增 Pipeline Handler → `arch/pipeline.md` 更新计划？ | ✅/❌/N/A |
| 4 | 新增依赖 → `arch/dependencies.md` 更新计划？ | ✅/❌/N/A |
| 5 | 新增资源/公式 → `prd/economy.md` 或 `prd/formulas.md` 更新计划？ | ✅/❌/N/A |

❌ 项 → 必须补充到 TDD 修改文件清单。

### 5.7 回归测试范围确定

根据 TDD 的修改文件清单，确定必须运行的测试套件：

| 条件 | 必须运行 |
|------|---------|
| 修改 Pipeline / Handler / GameState | `npm run test:regression`（regression-all.ts 64 组） |
| 修改对应 Phase 的公式或逻辑 | `npx tsx scripts/verify-phaseX.ts` |
| 修改 UI 格式化 | `npx tsx scripts/verify-ui-formatter.ts` |
| 修改 AI 后端 | `npm run test:ai-stress` |
| 零代码变更（纯文档） | 无需运行（标注"零代码 Phase"） |

产出：回归测试执行清单（SGE 在编码完成后执行）。

### 5.8 存档迁移链完整性

| 检查项 | 结果 |
|--------|------|
| TDD 是否新增 GameState 持久化字段？ | 是 / 否 |
| 如是：migrateVxToVy 已规划？ | ✅/❌ |
| 如是：schema.md 更新已列入？ | ✅/❌ |
| 如否：标注"零迁移" | — |
```

然后将原 `### 5.5 产出与校验` **重编号为 `### 5.9 产出与校验`**，并将校验范围从"5.1-5.4"扩展为"5.1-5.8"。

同时更新 SGA Signoff 清单中 Step 5 括号描述：
- 原文："(类型引用追踪 + 签名影响面 + 副效果映射 + Handler 联动)"
- 新文："(类型引用追踪 + 签名影响面 + 副效果映射 + Handler 联动 + 测试脚本 + 文档一致性 + 回归范围 + 迁移链)"

**预估行数**：+55 行

---

### T4: INDEX.md 全量补全

详细补全内容（按 INDEX.md 现有分段结构）：

**§ Trinity 分析进度** 新增 8 行：
```
| phaseX-alpha-PRD.md | Phase X-α ✅ | 掌门视界（CSS+巨石拆分+布局+日志分区+命令历史） |
| phaseX-beta-PRD.md | Phase X-β ✅ | 命令增强（Tab补全+别名+图标+闪烁） |
| phaseX-gamma-PRD.md | Phase X-γ ✅ | 面板系统（浮层+可点击弟子+内存修复） |
| phaseIJ-poc-PRD.md | Phase IJ-PoC ✅ | 0.8B/2B 关系上下文利用验证 |
| phaseIJ-PRD.md | Phase IJ ✅ | NPC 深智预研（关系记忆·叙事·L2/L6） |
| phaseJ-goal-PRD.md | Phase J-Goal ✅ | 个人目标系统 |
| phaseI-alpha-PRD.md | Phase I-alpha ✅ | 因果引擎+高级关系标签 |
| phaseTG-1-PRD.md | Phase TG-1 ✅ | Trinity Pipeline 重审执行保障 |
```

**§ TDD** 新增 8 行：
```
phaseI-alpha-TDD.md、phaseIJ-TDD.md、phaseJ-goal-TDD.md、phaseTG-1-TDD.md
phaseX-alpha-TDD.md、phaseX-beta-TDD.md、phaseX-gamma-TDD.md、phaseZ-TDD.md
```

**§ User Stories** 新增 4 行：
```
phaseI-alpha-user-stories.md、phaseJ-goal-user-stories.md
phaseTG-1-user-stories.md、phaseX-gamma-user-stories.md
```

**§ 验证脚本** 新增 9+ 行：
```
verify-phaseE.ts、verify-phaseF.ts、verify-phaseF0-alpha.ts、verify-phaseF0-beta.ts
verify-phaseI-alpha-causal.ts、verify-phaseIJ-relationship-memory.ts
verify-phaseJ-goal.ts、verify-ui-formatter.ts、regression-all.ts
```

**§ Pipeline 过程资产** 补全 10+ Phase 行 + 修正已有行的缺失链接。

**含 TG-2 自身条目**（PRD + TDD + User Stories + pipeline 资产）。

---

## §3 ADR

### ADR-TG2-01: Step 5 编号策略

**决策**：在 5.1-5.4 之后插入 5.5-5.8，将原 5.5 重编号为 5.9。

**备选方案**：
- A: 5.1-5.4 不动，新增 5.6-5.9，保持 5.5 原位 → 打破递增顺序（5.5 是"产出与校验"却在 5.6-5.9 之前）
- B: 重编号全部为 5.1-5.9 → 修改已有内容，可能破坏引用
- **C（采用）**: 插入 5.5-5.8，原 5.5→5.9 → 最小变更 + 逻辑递增 + "产出与校验"自然在最后

**后果**：TG-1 review 报告中引用的"Step 5.5"不再指同一内容，但 TG-1 已完成，无后续引用风险。

---

## §4 文件变更汇总

| # | 文件 | 变更类型 | 预估行数 |
|---|------|---------|:-------:|
| 1 | `.agents/skills/_shared/review-protocol.md` | 修改（+§0 段） | +45 |
| 2 | `.agents/skills/product-manager/SKILL.md` | 修改（调用模板扩展） | +10 |
| 3 | `.agents/skills/architect/SKILL.md` | 修改（Step 5.5-5.8 + 5.5→5.9 + 调用模板） | +65 |
| 4 | `.agents/skills/engineer/SKILL.md` | 修改（调用模板扩展） | +10 |
| 5 | `docs/INDEX.md` | 修改（全量补全） | +80 |

**共 5 个文件修改**，零新增文件，零代码变更。

---

## §5 关联性影响审计

### 5.1-5.4 代码关联

**N/A** — 本 Phase 零代码变更，无类型扩展/函数签名/副效果/Handler 联动。

### 5.5 测试脚本影响

**N/A** — 零代码变更，无公式/逻辑文件修改。

### 5.6 文档一致性

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 新增代码文件 → INDEX.md 更新？ | N/A（零新增代码文件） |
| 2 | 新增 GameState 字段 → gamestate.md？ | N/A |
| 3 | 新增 Pipeline Handler → pipeline.md？ | N/A |
| 4 | 新增依赖 → dependencies.md？ | N/A |
| 5 | INDEX.md 自身 → 本 Phase 核心交付物 | ✅ T4 覆盖 |

### 5.7 回归测试范围

**零代码 Phase** → 无需运行回归测试。验证方式：
- 人工审阅修改后的 .md 文件
- `find docs/ -name '*.md' | sort` + `find scripts/ -name '*.ts' | sort` vs INDEX.md diff 确认零遗漏

### 5.8 存档迁移链

零迁移。

### 5.9 产出与校验

5.1-5.8 全部 N/A 或已确认。文件变更汇总：5 个文件修改，与 §4 一致。

---

## SGA Signoff

- [x] Interface 设计完整（N/A — 零 TypeScript interface）
- [x] 迁移策略完整（零迁移）
- [x] Pipeline 挂载方案确认（N/A — 零 Handler）
- [x] 依赖矩阵已更新（N/A — 零依赖变更）
- [x] Step 5 关联性审计已执行（全 N/A，已确认）
- [x] 评审文件完整性：review-g2.md 存在，CONDITIONAL PASS (0 BLOCK / 4 WARN 全修复)
- [x] Party Review 无 BLOCK 项
- [x] 技术债务已登记（无新增 — 零代码 Phase）

签章：`[x] GATE 2 PASSED` — 2026-04-02
