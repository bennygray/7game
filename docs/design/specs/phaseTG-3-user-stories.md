# Phase TG-3 — User Stories

> **版本**：v1.0 | **日期**：2026-04-02
> **关联 PRD**：`docs/features/phaseTG-3-PRD.md` v1.0

---

## US-TG3-01: AGENTS.md 保持主规范，CLAUDE.md 瘦身为适配层

**标题**：作为 Claude Code 用户，我需要 AGENTS.md 保持完整主规范（跨项目可移植），CLAUDE.md 瘦身为真正的适配层，以消除 80% 内容重复和 SLO 差异。

> **变更记录**：原方案为 CLAUDE.md 主→AGENTS.md 瘦身，Gate 2 后因 W4 可移植性风险反转。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | CLAUDE.md 已瘦身 | 读取文件头部 | 保持声明"本文件是 AGENTS.md 的 Claude Code 适配层" | PRD §4 D1 R-D1-02 |
| 2 | CLAUDE.md 已瘦身 | 统计行数 | ≤ 100 行，仅含 Claude Code 专用配置 + "→ 见 AGENTS.md §X"引用指针 | PRD §4 D1 R-D1-03 |
| 3 | AGENTS.md 保持完整 | 统计行数 | ~466 行，内容不做瘦身删减 | PRD §4 D1 R-D1-01 |
| 4 | 两文件 SLO 对比 | grep 性能红线数值 | 零差异（CLAUDE.md 对齐 AGENTS.md 值） | PRD §4 D1 R-D1-05 |

**依赖**：无
**复杂度**：M

---

## US-TG3-02: handoff.md 瘦身 + 历史归档

**标题**：作为新会话接手者，我需要 handoff.md 仅包含活跃上下文（≤100行），历史详情集中归档，以快速定位当前断点。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | handoff.md 已瘦身 | 统计行数 | ≤ 100 行 | PRD §4 D2 R-D2-02 |
| 2 | handoff.md 已瘦身 | 读取内容 | 包含：当前断点 + 上一 Phase 摘要 + 关键决策（最近 3 条）+ 接手指南 + 遗留风险 | PRD §4 D2 R-D2-02 |
| 3 | handoff-archive.md 已创建 | 读取内容 | 包含 Phase E~TG-2 历史详情，按 Phase 倒序，内容不做删改 | PRD §4 D2 R-D2-01/03 |
| 4 | handoff.md 含归档链接 | 搜索 "archive" 关键字 | 包含指向 handoff-archive.md 的链接 | PRD §4 D2 R-D2-04 |

**依赖**：无
**复杂度**：M

---

## US-TG3-03: MASTER 文件修正

**标题**：作为架构审查者，我需要 MASTER-ARCHITECTURE 数据与实际代码一致，MASTER-PRD 范围定义与 feature-backlog 无冲突。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | MASTER-ARCHITECTURE §1 | 读取 Data 层行 | 文件数 = 20（非 22） | PRD §4 D3 R-D3-01 |
| 2 | MASTER-ARCHITECTURE §3/C-1 | 读取 Handler 数 | Handler 数 = 15（非 13） | PRD §4 D3 R-D3-02 |
| 3 | MASTER-ARCHITECTURE 版本号 | 读取头部 | v1.8 | PRD §4 D3 R-D3-03 |
| 4 | MASTER-PRD §4.1 IN/OUT 表 | 读取天劫/悬赏/丹毒行 | 标注"⏸ 暂缓，见 FB-013~015" | PRD §4 D4 R-D4-01 |
| 5 | MASTER-PRD | 统计行数 | ≤ 150 行（§2 Mermaid 已替换为文字） | PRD §4 D4 R-D4-02/03 |

**依赖**：无
**复杂度**：S

---

## US-TG3-04: INDEX.md Quick Orient + 全面注册

**标题**：作为新 AI 会话，我需要 INDEX.md 提供 30 秒定位能力（Quick Orient）并注册所有孤立文档，以成为真正的统一入口。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | INDEX.md Quick Orient | 读取标题下方 | 包含文档权责表（7 个文档 × 唯一职责 × 不做什么） | PRD §4 D5 R-D5-01 |
| 2 | INDEX.md Quick Orient | 读取阅读路径 | 包含 5 个角色（新 AI 会话/SPM/SGA/SGE/Reviewer）的阅读顺序 | PRD §4 D5 R-D5-01 |
| 3 | INDEX.md 新分区 | 搜索 "Skill" | 包含 .agents/skills/ 三个 SKILL.md 注册条目 | PRD §4 D5 R-D5-02 |
| 4 | INDEX.md pipeline 段 | 搜索 "README" | pipeline/README.md 有回链 | PRD §4 D5 R-D5-03 |
| 5 | INDEX.md 世界线推演段 | 读取 01-05 条目 | 标注"（历史，已沉淀到 ROADMAP）" | PRD §4 D5 R-D5-04 |
| 6 | INDEX.md | 搜索 "phaseTG-3" | TG-3 的 PRD/User Stories/pipeline 条目已注册 | PRD §4 D5 R-D5-05 |

**依赖**：US-TG3-01~03 完成后注册（含 TG-3 自身条目）
**复杂度**：M

---

## US-TG3-05: 系统交叉索引

**标题**：作为 SGA 架构师，我需要一张系统×Phase×文件×Handler×依赖的交叉索引，以快速定位任何系统的引入历史和依赖关系。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | cross-index.md 已创建 | 统计系统行数 | ≥ 20 个系统行 | PRD §4 D6 R-D6-03 |
| 2 | cross-index.md 表结构 | 读取表头 | 包含 5 列：系统名 / 引入 Phase / 核心文件 / Handler / 依赖系统 | PRD §4 D6 R-D6-02 |
| 3 | MASTER-ARCHITECTURE | 搜索 "cross-index" | 存在 §4.5 指针节 + Detail 清单注册行 | PRD §4 D6 R-D6-04 |
| 4 | project.yaml | 搜索 "cross_index" | 存在 `arch_cross_index` 路径条目 | PRD §4 D8 R-D8-01 |

**依赖**：US-TG3-03（MASTER-ARCH 修正后再添加指针）
**复杂度**：M

---

## US-TG3-06: 需求追溯链

**标题**：作为质量审计者，我需要从任何系统追溯到其 Phase→PRD→User Stories→验证脚本的完整链路。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | traceability.md 已创建 | 统计 Phase 覆盖 | 覆盖全部已实现 Phase（A~TG-2） | PRD §4 D7 R-D7-03 |
| 2 | traceability.md 表结构 | 读取表头 | 包含 6 列：系统 / Phase / PRD / User Stories / 验证脚本 / 测试数 | PRD §4 D7 R-D7-02 |
| 3 | MASTER-PRD | 搜索 "traceability" | 存在 §6.5 指针节 + Detail 清单注册行 | PRD §4 D7 R-D7-04 |
| 4 | project.yaml | 搜索 "traceability" | 存在 `prd_traceability` 路径条目 | PRD §4 D8 R-D8-02 |

**依赖**：US-TG3-03（MASTER-PRD 修正后再添加指针）
**复杂度**：M

---

## US-TG3-07: 启动协议 + review-protocol + Detail 互引

**标题**：作为 Pipeline 执行者，我需要启动协议引导到 INDEX Quick Orient，review-protocol 包含变更模式速查，detail 文件包含同级互引。

### AC

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | CLAUDE.md Level 1 | 读取启动协议 | INDEX.md Quick Orient 为 step 1（project.yaml 之后） | PRD §4 D9 R-D9-01 |
| 2 | CLAUDE.md Level 2 | 读取启动协议 | SOUL-VISION-ROADMAP 在 Level 2（非 Level 1） | PRD §4 D9 R-D9-02 |
| 3 | review-protocol.md §0.1 | 读取触发模式表 | 包含 7 个变更模式→检查项映射 | PRD §4 D10 R-D10-02 |
| 4 | arch/gamestate.md | 搜索 "schema" | 包含 → "版本迁移见 schema.md" | PRD §4 D11 R-D11-01 |
| 5 | arch/schema.md | 搜索 "gamestate" | 包含 → "字段定义见 gamestate.md" | PRD §4 D11 R-D11-02 |
| 6 | arch/pipeline.md | 搜索 "dependencies" | 包含 → "影响分析见 dependencies.md" | PRD §4 D11 R-D11-03 |
| 7 | arch/dependencies.md | 搜索 "pipeline" | 包含 → "执行顺序见 pipeline.md" | PRD §4 D11 R-D11-04 |
| 8 | project.yaml | 搜索 "skills_dir" | 存在 `skills_dir: ".agents/skills"` | PRD §4 D8 R-D8-03 |

**依赖**：US-TG3-04 完成后（启动协议引用 INDEX Quick Orient）
**复杂度**：S
