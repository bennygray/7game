# Phase TG-3 — PRD: 文档关系梳理 + 交叉索引 + 追溯链

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：SPM | **状态**：Draft → 待 Gate 1
> **前置**：Phase TG-1 ✅ (重审执行保障) + Phase TG-2 ✅ (审查上下文+Step5+INDEX补全)
> **清偿**：FB-020(c)

---

## §1 背景与动机

### 1a. 5-Why 根因链

```
为什么需要 TG-3？→ 新会话接手效率低，文档关系混乱
为什么混乱？→ 多个文件争当"入口"，职责边界不清
为什么边界不清？→ CLAUDE.md/AGENTS.md 内容 80% 重复且主从关系名不副实
为什么名不副实？→ 项目演进中文档不断追加，从未做过关系审计
为什么没做审计？→ 缺乏文档治理机制，各阶段只关注功能文档
→ 根因：文档体系缺乏权责声明和关系管理机制
```

### 1b. Invariant

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | 每类信息有且仅有一个权威文档 | 信息分歧，维护时遗漏更新 |
| I2 | 文档间引用关系必须是单向层级，禁止循环权威 | 无法判定哪个版本正确 |
| I3 | MASTER 索引文件 ≤ 150 行 | 索引变成第二个 detail |
| I4 | Claude Code 自动读取的 CLAUDE.md 必须是主文件 | AI 会话启动时信息不完整或过时 |

### 1c. 最小组件检验

如果只保留一个核心功能 → **文档权责声明表**。明确每个文档的唯一职责和禁区，是解决所有下游问题的基础。

### 1d. 核心体验锚定

- **核心体验**：任何新 AI 会话在 30 秒内定位到正确文档，无混淆
- **ROI**：开发成本 M / 体验增量 4（每次新会话都受益）
- **循环挂载**：所有后续 Phase 的 SPM→SGA→SGE 都依赖文档体系的清晰度

---

## §2 深度审计发现

全量审计（2026-04-02 本会话执行）发现 8 个问题：

### CRITICAL

| # | 问题 | 证据 |
|---|------|------|
| P1 | **CLAUDE.md ↔ AGENTS.md 80% 内容重复** | CLAUDE.md 324行 vs AGENTS.md 466行，Bootstrap/性能/代码规范/模块边界/禁止事项几乎逐段一致；SLO 已有差异（后端内存 2GB vs 1GB） |
| P2 | **handoff.md 无限膨胀** | 335+ 行，其中 200+ 行是 Phase E~TG-2 的历史归档，从未清理 |

### HIGH

| # | 问题 | 证据 |
|---|------|------|
| P3 | **MASTER-ARCHITECTURE 数据过期** | §1 写 "22 Data 文件" 实际 20；§3 写 "13 Handler" 实际 15 |
| P4 | **MASTER-PRD ↔ feature-backlog 范围冲突** | §4.1 天劫标 ✅IN，backlog FB-013 标 ⏸PAUSED |
| P5 | **孤立内容未注册** | .agents/skills/ 三个 SKILL.md 未在 INDEX 注册；pipeline/README.md 无回链 |
| P6 | **Detail 文件缺同级互引** | gamestate↔schema、pipeline↔dependencies 互不知道对方存在 |
| P7 | **soul-vision-rethinking 01-05 未标记历史** | INDEX 列出 9 个文件但读者无法区分活跃 vs 已归档 |
| P8 | **project.yaml 缺少 skills_dir** | .agents/skills/ 是系统关键目录但未在路径注册表中 |

### 缺失能力

| # | 缺失 | 影响 |
|---|------|------|
| M1 | 无系统×Phase×文件交叉索引 | 无法回答"某系统由哪个 Phase 引入" |
| M2 | 无需求→验证追溯链 | 无法从需求追踪到验证脚本 |
| M3 | 无 START-HERE 快速入口 | 新会话需读 4+ 文件才能定位（**决策：INDEX.md 吸收此角色**） |

---

## §3 用户决策

| # | 决策 | 选项 |
|---|------|------|
| D1 | ~~CLAUDE.md 作为主文件~~ → **AGENTS.md 保持完整主规范，CLAUDE.md 瘦身为适配层** | ~~选项 C~~ → **选项 B**（变更于 Gate 2 后，因 W4 可移植性风险） |
| D2 | handoff.md 历史集中归档到 handoff-archive.md | 选项 B |
| D3 | 审计 8 个问题全部纳入 TG-3 | 一次性处理 |
| D4 | 不创建 START-HERE.md，INDEX.md 吸收功能 | 避免第 4 个竞争入口 |

---

## §4 交付物规格

### D1: AGENTS.md 保持主规范，CLAUDE.md 瘦身为适配层

**目标**：AGENTS.md 保持完整主规范（可移植到 Antigravity 等项目），CLAUDE.md 瘦身为 Claude Code 专用适配层。

> **变更记录**：原选项 C（CLAUDE.md 为主）于 Gate 2 后因 W4 可移植性风险反转为选项 B。
> 原因：AGENTS.md 被 16+ 处代码/Skill/Persona 引用（`AGENTS.md §N`），瘦身会破坏全部引用；
> 且 `.agents/` 目录设计为跨项目可移植，AGENTS.md 必须保持独立完整。

R-D1-01: AGENTS.md 保持现有完整内容（466 行），不做瘦身。修正 SLO 差异（以 AGENTS.md 值为准）。
R-D1-02: CLAUDE.md 保持开头声明"本文件是 AGENTS.md 的 Claude Code 适配层"（原有声明已正确）。
R-D1-03: CLAUDE.md 瘦身为 ~80 行适配层，仅保留：Claude Code 专用配置（常用命令、启动协议摘要）+ 关键约束摘要 + "→ 见 AGENTS.md §X"引用指针。
R-D1-04: 删除 CLAUDE.md 中与 AGENTS.md 重复的段落（性能红线、代码规范、模块边界、AI 约束、禁止事项等），替换为引用指针。
R-D1-05: 两个文件的 SLO/规范/禁令数值必须零差异（CLAUDE.md 对齐 AGENTS.md）。

### D2: handoff.md 瘦身 + 历史归档

R-D2-01: 新建 `docs/project/handoff-archive.md`，迁入 Phase E~TG-2 历史详情。
R-D2-02: handoff.md 瘦身至 ≤100 行，仅保留：当前断点（≤20行）+ 上一 Phase 摘要（≤10行）+ 关键决策表（≤15行，仅最近 3 条）+ 接手指南（≤10行）+ 遗留风险（≤15行）。
R-D2-03: handoff-archive.md 按 Phase 倒序排列，每段保留原始内容不做删改。
R-D2-04: handoff.md 必须包含指向 handoff-archive.md 的链接（"详细历史见 [handoff-archive.md](handoff-archive.md)"）。

### D3: MASTER-ARCHITECTURE 过期数据修正

R-D3-01: §1 表 Data 层文件数 22→20（与 layers.md §2 当前清单对齐；layers.md 本身缺少 9 个文件的注册，已记入 tech-debt TD-028）。
R-D3-02: §3 描述和 C-1 通信路径 13→15 Handler。
R-D3-03: 版本号 v1.7→v1.8。

### D4: MASTER-PRD 范围冲突修复 + 瘦身

R-D4-01: §4.1 IN/OUT 表中天劫/悬赏/丹毒行末标注"⏸ 暂缓，见 FB-013~015"。
R-D4-02: §2 Mermaid 图（19 行）替换为 2 行文字描述（回收 17 行）。
R-D4-03: 瘦身后总行数 ≤ 150。

### D5: INDEX.md Quick Orient + 孤立内容注册

R-D5-01: 标题下方插入 Quick Orient 区（~25 行）：项目定位 + 状态指针 + 文档权责表（7 文档）+ 按角色阅读路径（5 角色）。
R-D5-02: 注册 .agents/skills/ 三个 SKILL.md（新增"Skill 定义文件"分区）。
R-D5-03: Pipeline 过程资产段添加 pipeline/README.md 回链。
R-D5-04: soul-vision-rethinking 01-05 标注"（历史，已沉淀到 ROADMAP）"。
R-D5-05: 注册 TG-3 自身 PRD/TDD/User Stories/pipeline 条目。

### D6: 系统交叉索引

R-D6-01: 新建 `docs/design/arch/cross-index.md`（~100 行）。
R-D6-02: 表结构：系统名 × 引入 Phase × 核心文件 × Handler(Phase:Order) × 依赖系统。
R-D6-03: 覆盖 ≥20 个已实现系统。数据来源：交叉比对 `prd/systems.md`（14 个基础系统）+ `arch/pipeline.md`（15 个 Handler 对应的系统）+ INDEX.md Phase PRD 条目（F0-α~I-alpha 新增系统），取并集。
R-D6-04: MASTER-ARCHITECTURE 新增 §4.5 指针节 + Detail 清单注册。

### D7: 需求追溯链

R-D7-01: 新建 `docs/project/prd/traceability.md`（~80 行）。
R-D7-02: 表结构：系统 × Phase × PRD 文件 × User Stories × 验证脚本 × 测试数。
R-D7-03: 覆盖全部已实现 Phase（A~TG-2）。
R-D7-04: MASTER-PRD 新增 §6.5 指针节 + Detail 清单注册。

### D8: project.yaml 路径注册

R-D8-01: 追加 `arch_cross_index: "docs/design/arch/cross-index.md"`。
R-D8-02: 追加 `prd_traceability: "docs/project/prd/traceability.md"`。
R-D8-03: 追加 `skills_dir: ".agents/skills"`。

### D9: 启动协议更新

R-D9-01: CLAUDE.md Level 1 在 project.yaml 之后插入 INDEX.md Quick Orient 为 step 1。
R-D9-02: SOUL-VISION-ROADMAP 从 Level 1 降级到 Level 2。
R-D9-03: 标注"路径以 project.yaml 为准，此处仅列阅读顺序"。

### D10: review-protocol.md 触发模式检查表

R-D10-01: §0 之后插入 §0.1 变更模式→检查项速查表。
R-D10-02: 覆盖 7 个触发模式：新增 enum/GameState 字段/函数签名/Handler/运行时数据结构/现有逻辑/API 参数。

### D11: Detail 文件同级互引

R-D11-01: `arch/gamestate.md` 添加 → "版本迁移见 schema.md"。
R-D11-02: `arch/schema.md` 添加 → "字段定义见 gamestate.md"。
R-D11-03: `arch/pipeline.md` 添加 → "影响分析见 dependencies.md"。
R-D11-04: `arch/dependencies.md` 添加 → "执行顺序见 pipeline.md"。

---

## §5 范围边界

| ✅ IN | 🚫 OUT |
|:------|:-------|
| CLAUDE.md/AGENTS.md 主从反转 | 修改 Skill 流程本身（SPM/SGA/SGE Step 内容） |
| handoff 瘦身+归档 | 修改 review-protocol L0-L3 四层防线逻辑 |
| MASTER 文件修正+指针 | 新建 START-HERE.md |
| INDEX Quick Orient + 全面注册 | 修改代码文件 |
| cross-index + traceability 新建 | 修改已有 Phase 的 PRD/TDD 内容 |
| detail 互引 + project.yaml | 重组 docs/ 目录结构 |
| 启动协议更新 | |
| review-protocol 触发表 | |

---

## §6 Pre-Mortem

| 风险 | 概率 | 影响 | 缓解 |
|------|:----:|:----:|------|
| AGENTS.md 瘦身可能丢失非 Claude Code 工具所需的内容 | 中 | 中 | 保留 AGENTS.md 独有段落完整内容，仅删重复段 |
| handoff-archive 迁移后旧链接失效 | 低 | 低 | handoff.md 中保留 archive 文件链接 |
| cross-index 数据可能遗漏早期 Phase 系统 | 中 | 低 | 交叉比对 prd/systems.md + arch/pipeline.md + INDEX.md |
| MASTER-PRD Mermaid 删除后降低可读性 | 低 | 低 | 文字描述保留完整闭环逻辑 |
| 11 交付物/15 文件协调风险 | 中 | 中 | 实施后执行一致性验证清单（见 §6.5） |

### §6.5 实施后一致性验证清单

实施完成后，必须逐项验证：

| # | 验证项 | 方法 |
|---|--------|------|
| V1 | CLAUDE.md / AGENTS.md SLO 零差异 | grep 性能红线数值，逐条比对 |
| V2 | cross-index 系统数 ≥ pipeline.md Handler 数 | 行数计数 |
| V3 | traceability.md Phase 覆盖 = INDEX.md Phase 列表 | 逐行比对 |
| V4 | 所有新文件已注册到 INDEX.md | grep 文件名 |
| V5 | MASTER-PRD ≤ 150 行 / MASTER-ARCH ≤ 150 行 | wc -l |
| V6 | handoff.md ≤ 100 行 | wc -l |
| V7 | 零断链 | 所有 Markdown 链接目标文件存在 |

### §6.6 Scope 外已知债务（Gate 1 审查发现）

| # | 问题 | 处置 |
|---|------|------|
| TD-028 | layers.md §2 缺少 9 个 Data 层文件（encounter-templates.ts 等） | 记入 tech-debt，不纳入 TG-3 |
| TD-029 | CLAUDE.md "灵田(2格)" vs MASTER-PRD "无限格，弟子×3块" 数值不一致 | 记入 tech-debt，不纳入 TG-3 |

---

## §7 Assumption Audit

| 假设 | 验证方式 | 风险 |
|------|---------|:---:|
| CLAUDE.md 是 Claude Code 唯一自动读取的项目配置 | Claude Code 文档确认 | 低 |
| AGENTS.md 80 行足以覆盖非重复内容 | 实际瘦身后行数统计 | 中 |
| handoff.md 100 行足以承载活跃上下文 | 下一次会话交接验证 | 低 |
| cross-index 20+ 系统行覆盖全部已实现系统 | 比对 prd/systems.md 清单 | 低 |

---

## USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] 评审文件完整性：review-g1.md 存在，CONDITIONAL PASS (0 BLOCK / 5 WARN 全处置)
- [x] Party Review 无 BLOCK 项

签章：`[x] GATE 1 PASSED` — 2026-04-02
