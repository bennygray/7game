# Phase TG-3 — TDD: 文档关系梳理 + 交叉索引 + 追溯链

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：SGA | **状态**：Draft → 待 Gate 2
> **关联 PRD**：`docs/features/phaseTG-3-PRD.md` v1.0 — `[x] GATE 1 PASSED`

---

## §1 全局对齐

### 1.1 架构层级归属

本 Phase 为纯文档治理（零代码变更），不涉及四层架构的任何层级。

| 检查项 | 结果 |
|--------|------|
| 新增代码文件？ | 否 |
| 新增 GameState 字段？ | 否 |
| 新增 Pipeline Handler？ | 否 |
| 新增依赖？ | 否 |
| 存档迁移？ | 否 |

### 1.2 PRD Invariant 对照

| # | Invariant | 架构兼容性 |
|---|-----------|-----------|
| I1 | 每类信息有且仅有一个权威文档 | ✅ 通过文档权责表实现 |
| I2 | 文档间引用单向层级 | ✅ CLAUDE.md→AGENTS.md 单向引用；MASTER→detail 单向委托 |
| I3 | MASTER 索引 ≤ 150 行 | ✅ PRD R-D4-02 瘦身方案确保 |
| I4 | CLAUDE.md 必须是主文件 | ✅ CLAUDE.md 为 Claude Code 自动读取的主入口，引导至 AGENTS.md 完整规范 |

---

## §2 文件变更规划

### 2.1 变更汇总

| # | 文件 | 变更类型 | PRD 交付物 | 依赖 |
|---|------|---------|-----------|------|
| F1 | `CLAUDE.md` | 修改（瘦身） | D1 适配层瘦身 + D9 启动协议 | — |
| F2 | `.agents/AGENTS.md` | 修改（微调） | D1 SLO 修正（保持完整） | F1 |
| F3 | `docs/project/handoff.md` | 修改（瘦身） | D2 | F4 |
| F4 | `docs/project/handoff-archive.md` | 新建 | D2 历史归档 | — |
| F5 | `docs/design/MASTER-ARCHITECTURE.md` | 修改 | D3 修正 + D6 指针 | F8 |
| F6 | `docs/project/MASTER-PRD.md` | 修改 | D4 修正+瘦身 + D7 指针 | F9 |
| F7 | `docs/INDEX.md` | 修改 | D5 Quick Orient + 注册 | F1~F9 全部完成后 |
| F8 | `docs/design/arch/cross-index.md` | 新建 | D6 交叉索引 | — |
| F9 | `docs/project/prd/traceability.md` | 新建 | D7 追溯链 | — |
| F10 | `.agents/project.yaml` | 修改 | D8 路径注册 | — |
| F11 | `.agents/skills/_shared/review-protocol.md` | 修改 | D10 触发表 | — |
| F12 | `docs/design/arch/gamestate.md` | 修改（+1行互引） | D11 | — |
| F13 | `docs/design/arch/schema.md` | 修改（+1行互引） | D11 | — |
| F14 | `docs/design/arch/pipeline.md` | 修改（+1行互引） | D11 | — |
| F15 | `docs/design/arch/dependencies.md` | 修改（+1行互引） | D11 | — |

**总计**：3 新建 + 12 修改 = 15 个文件

### 2.2 执行顺序（依赖图）

```
Phase 1（无依赖，可并行）:
  F4  handoff-archive.md（新建）
  F8  cross-index.md（新建）
  F9  traceability.md（新建）
  F10 project.yaml（路径注册）
  F11 review-protocol.md（触发表）
  F12~F15 detail 互引（4 文件各加 1 行）

Phase 2（依赖 Phase 1 新文件）:
  F1  CLAUDE.md（瘦身为适配层 + 启动协议更新）
  F5  MASTER-ARCHITECTURE.md（修正 + cross-index 指针）
  F6  MASTER-PRD.md（修正 + 瘦身 + traceability 指针）

Phase 3（依赖 Phase 2）:
  F2  AGENTS.md（SLO 微调，保持完整）
  F3  handoff.md（瘦身，引用 archive）

Phase 4（依赖全部完成）:
  F7  INDEX.md（Quick Orient + 全面注册）
```

---

## §3 关键变更详细设计

### 3.1 CLAUDE.md 瘦身方案 (F1)

**当前状态**：324 行，开头声明"本文件是 AGENTS.md 的适配层"

> **决策变更**：原选项 C（CLAUDE.md 为主）因 W4 可移植性风险反转为选项 B。

**变更**：
1. 保持开头适配层声明（已正确描述实际角色）
2. 删除与 AGENTS.md 重复的 14 个段落（~240 行），替换为引用指针：
   - 性能红线 → "→ 见 AGENTS.md §性能红线"
   - 代码规范 → "→ 见 AGENTS.md §代码规范"
   - 模块边界 → "→ 见 AGENTS.md §模块边界"
   - AI 约束 → "→ 见 AGENTS.md §AI 层专项约束"
   - 禁止事项 → "→ 见 AGENTS.md §禁止事项"
   - 数值验证 → "→ 见 AGENTS.md §数值验证"
   - 测试脚本 → "→ 见 AGENTS.md §测试脚本管理"
   - 跨项目复用 → "→ 见 AGENTS.md §跨项目复用"
   - 编码前置条件 → "→ 见 AGENTS.md §编码前置条件"
   - 版本边界 → "→ 见 AGENTS.md §版本边界"
   - 回归测试/Tick Pipeline → "→ 见 AGENTS.md §回归测试"
   - 文档模块化规则 → "→ 见 AGENTS.md §文档模块化规则"
   - Pipeline 过程资产规范 → "→ 见 AGENTS.md §Pipeline 过程资产规范"
   - 交接文档 → "→ 见 AGENTS.md §交接文档"
3. 保留 Claude Code 专用内容：常用命令、启动协议（含 Quick Orient）、Trinity Skill 路由表
4. Level 1 启动协议：project.yaml 后插入 INDEX.md Quick Orient
5. SOUL-VISION-ROADMAP 移至 Level 2
6. 修正 3 处 SLO 差异（CLAUDE.md 对齐 AGENTS.md 值）：
   - 后端内存：CLAUDE.md "2GB" → 对齐 AGENTS.md "1GB"
   - Prompt 预算：CLAUDE.md "1024 tokens" → 对齐 AGENTS.md "512 tokens"
   - 模型规格：CLAUDE.md "Qwen3.5-2B" → 对齐 AGENTS.md "0.8B"
   > 注：若 AGENTS.md 值需更新，应先更新 AGENTS.md 再对齐 CLAUDE.md
7. 添加注释："路径以 project.yaml 为准"

**预期行数**：~80 行

### 3.2 AGENTS.md 保持方案 (F2)

**当前状态**：466 行，完整主规范

**策略**：AGENTS.md 不做瘦身，保持完整独立可用。

**理由**：
1. 16+ 处代码注释/Skill/Persona 引用 `AGENTS.md §N`，瘦身会破坏全部引用
2. `.agents/` 目录设计为跨项目可移植（Antigravity 等），AGENTS.md 必须独立完整
3. 非 Claude Code 工具（如未来的 Cursor/Windsurf）只读 `.agents/` 即可获得完整规范

**变更**：
1. 修正 SLO 差异（如有，以 AGENTS.md 现有值为准）
2. 无结构性变更

**预期行数**：~466 行（不变）

### 3.3 handoff.md 瘦身方案 (F3)

**当前状态**：335+ 行

**目标结构**（≤ 100 行）：

```markdown
# 7game-lite — 会话交接文档

> 元信息（5 行）

## 当前断点（≤20 行）
  - 当前活跃 Phase + 状态
  - 下一步

## 上一 Phase 摘要（≤10 行）
  - Phase 名称 + 关键交付 + Gate 状态

## 关键决策（≤15 行）
  - 最近 3 条决策表

## 接手指南（≤10 行）
  - 必读文档列表 + 验证命令

## 遗留风险（≤15 行）
  - 活跃风险表

> 详细历史见 [handoff-archive.md](handoff-archive.md)
```

### 3.4 cross-index.md 数据方案 (F8)

数据来源交叉比对：
1. `prd/systems.md` §1（14 个基础系统）
2. `arch/pipeline.md` §2（15 个 Handler）
3. 各 Phase walkthrough/handoff 记录（F0-α~I-alpha 新增系统）
4. INDEX.md Phase PRD 列表

取并集，预期 ≥ 20 个系统行。

### 3.5 traceability.md 数据方案 (F9)

数据来源：
1. INDEX.md §Trinity 分析进度（全部 PRD 文件）
2. INDEX.md §User Stories（全部 Story 文件）
3. INDEX.md §验证脚本（全部 verify-*.ts）
4. 按 Phase 逐行映射

---

## §4 ADR

### ADR-TG3-01: AGENTS.md 保持完整主规范，CLAUDE.md 瘦身为适配层

**背景**：CLAUDE.md 和 AGENTS.md 内容 80% 重复。CLAUDE.md 声称是"适配层"但实为 324 行完整规范。

**备选方案**：
- A) 删除 CLAUDE.md → Claude Code 无项目规范
- **B) CLAUDE.md 瘦身为真适配层，AGENTS.md 保持完整（选定）**
- ~~C) CLAUDE.md 为主文件，AGENTS.md 瘦身为补充（Gate 2 后撤回）~~

**决策历程**：初始选定 C，Gate 2 审查发现 W4 — 16+ 处代码/Skill/Persona 引用 `AGENTS.md §N`，瘦身 AGENTS.md 会破坏全部引用。用户指出这意味着 `.agents/` 流程无法移植到 Antigravity 等项目，要求反转为选项 B。

**决策理由**：
1. `.agents/` 目录设计为跨项目可移植，AGENTS.md 必须独立完整
2. 16+ 处既有引用不可破坏
3. CLAUDE.md 瘦身为适配层后，声明与实际角色一致（消除名不副实问题）
4. Claude Code 自动读取 CLAUDE.md ~80 行 → 引用 AGENTS.md 详细段落，信息完整且无冗余

**后果**：Claude Code 会话启动需读两个文件（CLAUDE.md 适配层 + AGENTS.md 完整规范），但 CLAUDE.md 已在启动协议中引导读取 AGENTS.md，无额外负担。

### ADR-TG3-02: INDEX.md 吸收 START-HERE 角色

**背景**：审计报告建议新建 START-HERE.md 作为快速入口。但 INDEX.md 已声明为"统一入口"。

**备选方案**：
- A) 新建 START-HERE.md → 第 4 个竞争入口
- **B) INDEX.md 添加 Quick Orient 区（选定）**

**决策理由**：避免入口点增殖。INDEX.md 加 25 行 Quick Orient 即可满足"30 秒定位"需求。

### ADR-TG3-03: handoff.md 历史集中归档

**背景**：handoff.md 335+ 行，200+ 行为过期历史。

**备选方案**：
- A) 分散到各 pipeline/phaseX/archive.md → 信息碎片化
- **B) 集中到 handoff-archive.md（选定）**
- C) 直接删除 → 丢失决策上下文

**决策理由**：集中归档保留完整历史链，单文件便于全文检索。

---

## §5 关联性影响审计

### 5.1 类型扩展引用追踪

N/A — 零代码变更，无类型扩展。

### 5.2 函数签名变更影响面

N/A — 零代码变更。

### 5.3 PRD 副效果→执行位置映射

N/A — 零代码变更，无运行时副效果。

### 5.4 Handler 联动检查

N/A — 零 Pipeline 变更。

### 5.5 测试脚本影响审计

N/A — 零代码变更。

### 5.6 文档一致性审计

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 新增文件 → INDEX.md 更新计划？ | ✅ R-D5-05 + F7 明确包含 |
| 2 | 新增 GameState 字段？ | N/A |
| 3 | 新增 Pipeline Handler？ | N/A |
| 4 | 新增依赖？ | N/A |
| 5 | 新增资源/公式？ | N/A |

### 5.7 回归测试范围

零代码 Phase — 无需运行回归测试。

### 5.8 存档迁移链完整性

| 检查项 | 结果 |
|--------|------|
| TDD 是否新增 GameState 持久化字段？ | 否 |
| 标注 | 零迁移 |

### 5.9 产出与校验

文件变更汇总表（§2.1）覆盖 15 个文件。Step 5.1-5.8 审计确认零代码关联。

实施完成后须执行 PRD §6.5 一致性验证清单（V1-V7）。

---

## SGA Signoff

- [x] Interface 设计完整 — N/A（零代码）
- [x] 迁移策略完整 — 零迁移
- [x] Pipeline 挂载方案确认 — N/A
- [x] 依赖矩阵已更新 — N/A
- [x] Step 5 关联性审计已执行（全部 N/A 除 5.6 文档一致性 ✅）
- [x] 评审文件完整性：review-g2.md 存在，CONDITIONAL PASS (0 BLOCK / 3 WARN 全处置)
- [x] Party Review 无 BLOCK 项
- [x] 技术债务已登记（TD-028, TD-029 于 Gate 1 记入）

签章：`[x] GATE 2 PASSED` — 2026-04-02
