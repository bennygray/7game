# 7game 项目文档体系审计报告

> **审计日期**：2026-03-31  
> **审计范围**：`docs/`、`.agents/`、Trinity Pipeline 五文件一致性  
> **审计目的**：评估文档体系是否足以支撑多智能体自辩论系统的落地

---

## 一、总体评价

| 维度 | 评分 | 说明 |
|:---:|:---:|------|
| **骨架完整性** | ⭐⭐⭐⭐⭐ | `AGENTS.md` + `project.yaml` + 3 SKILL 定义 + Pipeline README 规范极其完善 |
| **规则严谨度** | ⭐⭐⭐⭐⭐ | Gate 前置条件、禁止事项、写入路径映射表、CoVe 协议等工业级 |
| **历史一致性** | ⭐⭐⭐ | 早期 Phase（A-D）缺失过程资产；中期开始(E+)逐步规范化 |
| **实际执行合规率** | ⭐⭐⭐ | 规范很完善但执行不完全——多个 Phase 缺失 plan/task/walkthrough |
| **多 Agent 就绪度** | ⭐⭐⭐ | 框架到位但需要补齐执行层实物，才能被外部 Agent 可靠引用 |

---

## 二、逐 Phase 文档完整性审计

### 规范要求（来自 Pipeline README）
每个 Phase 应有 5 个文件：`spm-analysis.md` + `plan.md` + `task.md` + `review.md` + `walkthrough.md`

### 审计矩阵

| Phase | spm | plan | task | review | walkthrough | 合规率 | 备注 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|------|
| **A** | ❌ | ❌ | ❌ | ❌ | ❌ | 0% | 目录仅有 .gitkeep |
| **B-α** | ❌ | ✅ | ❌ | ❌ | ❌ | 20% | 仅有 plan |
| **C** | ❌ | ✅ | ❌ | ❌ | ❌ | 20% | 仅有 plan |
| **D** | ❌ | ❌ | ❌ | ❌ | ❌ | 0% | 目录仅有 .gitkeep |
| **E** | ✅ | ❌ | ❌ | ✅ | ❌ | 40% | 有非规范文件(poc-1b-report, sga-review) |
| **F** | ✅ | ❌ | ✅ | ✅ | ❌ | 60% | 缺 plan + walkthrough |
| **F0-α** | ✅ | ❌ | ✅ | ✅ | ❌ | 60% | 缺 plan + walkthrough |
| **F0-β** | ✅ | ❌ | ✅ | ❌ | ❌ | 40% | 缺 plan + review + walkthrough |
| **G** | ✅ | ✅ | ❌ | ✅ | ✅ | 80% | 缺 task |
| **H-α** | ❌ | ❌ | ✅ | ❌ | ❌ | 20% | 仅有 task |
| **H-β** | ✅ | ✅ | ❌ | ✅ | ✅ | 80% | 缺 task（最接近满分） |
| **H-γ** | ✅ | ❌ | ❌ | ✅ | ✅ | 60% | 缺 plan + task |
| **X-α** | ✅ | ✅ | ✅ | ✅ | ✅ | 100% | ✅ **唯一满分** + 有额外的 sge-review |
| **X-β** | ✅ | ❌ | ✅ | ✅ | ✅ | 80% | 缺 plan |
| **X-γ** | — | — | — | ✅ | — | — | 仅有 review，pipeline 目录中无 spm/plan/task/walk |
| **Y** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% | 有额外文件(backend-code-review, backend-review-fix-task) |
| **Z** | ✅ | ❌ | ❌ | ❌ | ❌ | 20% | 仅 SPM 完成 (正常，Phase 还在进行中) |

### 审计统计

| 指标 | 数值 |
|------|------|
| 总 Phase 数 | 17 |
| 满分 Phase（5/5） | **1**（X-α） |
| 合规率 ≥ 80% | 3（G, H-β, X-α） |
| 合规率 ≥ 60% | 7 |
| 合规率 < 40% | 7 |
| 总应有文件 | 85（17 × 5） |
| 实际文件 | 41 |
| **总缺失文件** | **44（52%）** |

---

## 三、问题分级

### A 级：必须修复（阻碍多 Agent 系统运行）

> [!CAUTION]
> 以下问题会导致外部 Agent（Codex Evaluator）无法定位和引用正确的文档。

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| **A-1** | 非规范文件名 | E, X-α, Y | `sga-review.md`、`sge-review.md`、`poc-1b-report.md`、`backend-code-review.md`、`backend-review-fix-task.md` — 均不在规范的 5 个文件名列表中 |
| **A-2** | X-γ 无独立 pipeline 目录 | X-γ | `phaseX-gamma/` 仅有 `review.md`，无 spm-analysis。其他文件散落在 X-α 目录中 |
| **A-3** | review.md 的 Gate 归属不清 | 多个 Phase | review.md 应记录"哪个 Gate 的 Review？"目前多个 Phase 的 review 混合了 SPM/SGA/SGE 多阶段的审查记录，但无清晰分段 |
| **A-4** | GATE 签章不统一 | 全局 | 早期 Phase 无 `[x] GATE N PASSED` 格式签章；部分 Phase 的签章位于 PRD/TDD 末尾，部分位于 review.md — 外部 Agent 无法可靠定位 |

### B 级：应该修复（影响文档可用性和追溯性）

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| **B-1** | 早期 Phase(A-D) 过程资产空白 | A, B-α, C, D | 这些 Phase 在 Trinity 规范建立前完成，缺乏回填 |
| **B-2** | verification 目录稀疏 | 多个 Phase | 17 个 Phase 仅有 3 份验证记录（A, C, E-PoC）；Phase F 以后的专项验证结果未存档 |
| **B-3** | User Stories 不连续 | H-α, F0-α, X-α/β | Phase H-α 有 PRD+TDD 但无 User Stories；Phase F0-α 有 TDD 但无 Stories |
| **B-4** | INDEX.md 与实际不同步 | INDEX.md | Pipeline 资产表落后于实际（如 X-α 已有 6 个文件，INDEX 仅标注部分） |
| **B-5** | task-tracker 文档索引列缺失 | task-tracker.md | Phase F 标注 "spm-analysis" 但实际 features 目录中有完整 PRD |

### C 级：建议修复（提升文档体验）

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| **C-1** | 文件大小差异极大 | 全局 | spm-analysis 从 981B(X-α plan) 到 18KB(E spm-analysis)，缺乏深度标准 |
| **C-2** | 缺少文档版本号 | PRD/TDD | 部分 PRD 没有头部版本号标注 |
| **C-3** | handoff.md 过长 | handoff.md | 232 行（12KB），大量已完成的 Phase 详情应归档到各 Phase 的 walkthrough |

---

## 四、正面发现（做得好的部分）

> [!TIP]
> 以下设计在行业内罕见，质量极高：

| 编号 | 亮点 | 说明 |
|------|------|------|
| ✨-1 | **AGENTS.md 是工业级的** | 466 行，涵盖性能红线、模块边界、安全约束、版本边界、禁止事项。这是给 AI Agent 的"操作手册"，水准极高 |
| ✨-2 | **SKILL 三文件定义精确** | SPM/SGA/SGE 各有清晰的前置条件、Bootstrap 读取链、Step 流程、Gate 签章、产出物归档表 |
| ✨-3 | **写入路径映射表** | AGENTS.md §3.10 明确定义了"什么类型的变更写入哪个 detail 文件"，这是防止文档膨胀的关键设计 |
| ✨-4 | **Gate 前置条件硬编码** | SGA 必须检查 `GATE 1 PASSED`，SGE 必须检查 `GATE 2 PASSED`——这就是天然的"准入接口" |
| ✨-5 | **Pipeline README 是绝佳规范** | 定义了固定文件名、生产者、生命周期、与正式交付物的关系——这个设计本身已经是多 Agent 就绪的 |
| ✨-6 | **project.yaml 路径解耦** | 所有 Skill 通过 `${paths.xxx}` 引用路径，而非硬编码——天然支持外部 Agent 解析 |
| ✨-7 | **反合理化 + CoVe** | `_shared/anti-rationalization.md` 和 `_shared/cove-protocol.md` 是对抗 LLM 确认偏误的机制性设计 |

---

## 五、多 Agent 系统落地的 4 个前置条件评估

### 前置 1：GATE 签章可被程序化检测
**现状**：⚠️ 部分就绪

| 条件 | 状态 | 说明 |
|------|:---:|------|
| GATE 1 签章格式统一 | ⚠️ | 后期 Phase(G+) 有 `[x] GATE 1 PASSED`，早期无 |
| GATE 2 签章格式统一 | ⚠️ | 同上 |
| GATE 3 签章格式统一 | ⚠️ | 同上 |
| 签章位置固定 | ❌ | 有些在 PRD 末尾，有些在 TDD 末尾，有些在 review.md |

**需要做**：
- 统一所有签章到 PRD/TDD 末尾，使用严格格式 `[x] GATE N PASSED — YYYY-MM-DD`
- 外部 Agent 可以用 `grep "GATE 1 PASSED"` 一行命令验证

### 前置 2：过程资产可被 Agent 可靠定位
**现状**：⚠️ 部分就绪

| 条件 | 状态 | 说明 |
|------|:---:|------|
| 固定文件名 5 个 | ✅ | 规范已定义 |
| 所有 Phase 都有目录 | ✅ | 17 个目录存在 |
| 文件名 100% 规范化 | ❌ | 6 个非规范文件名存在 |
| 文件内容有标准章节 | ❌ | 无统一的 frontmatter 或 header sections |

**需要做**：
- 非规范文件名的内容合并到规范文件中（如 `sge-review.md` → 追加到 `review.md`）
- 每个文件增加 YAML frontmatter（`phase`, `gate`, `status`, `date`）方便 Agent 解析

### 前置 3：文档交接有机器可读的校验点
**现状**：⚠️ 部分就绪

| 条件 | 状态 | 说明 |
|------|:---:|------|
| SPM → SGA 交接校验 | ✅ | SGA SKILL.md 检查 PRD + GATE 1 |
| SGA → SGE 交接校验 | ✅ | SGE SKILL.md 检查 TDD + GATE 2 |
| SGE → GATE 3 校验 | ✅ | SGE SKILL.md 检查 AC/回归/Review |
| 校验可被脚本执行 | ❌ | 目前是 LLM 阅读检查，缺乏脚本化校验 |

**需要做**：
- 编写 `scripts/gate-check.py`：自动扫描 PRD/TDD 文件中的 GATE 签章
- 外部 Agent 运行此脚本即可判断当前 Phase 的 Gate 状态

### 前置 4：Agent 可理解项目上下文
**现状**：✅ 已就绪

| 条件 | 状态 | 说明 |
|------|:---:|------|
| project.yaml 路径映射 | ✅ | 所有路径都可程序化获取 |
| handoff.md 当前断点 | ✅ | 包含充分的上下文信息 |
| AGENTS.md 全局规范 | ✅ | 466 行工业级手册 |
| SKILL 定义 Bootstrap | ✅ | 每个 Skill 定义了精确的读取链 |

---

## 六、修复优先级建议

### 第一优先级：多 Agent 落地必需（1-2 天）

| # | 动作 | 工作量 |
|---|------|:---:|
| 1 | 统一 GATE 签章格式并固定位置（扫描所有 PRD/TDD 补充） | 2h |
| 2 | 合并 6 个非规范文件名到对应的 5 个标准文件中 | 1h |
| 3 | 编写 `scripts/gate-check.py`（扫描签章、检查文件完整性） | 2h |
| 4 | 每个 pipeline 文件添加 YAML frontmatter 头 | 2h |

### 第二优先级：提升追溯性（2-3 天）

| # | 动作 | 工作量 |
|---|------|:---:|
| 5 | 回填 Phase A-D 的 walkthrough（从 handoff 中提取） | 3h |
| 6 | 补全缺失的 verification 记录（F 以后的 Phase） | 3h |
| 7 | INDEX.md 和 task-tracker 与实际文件同步 | 2h |
| 8 | handoff.md 瘦身（已完成 Phase 详情迁移到各 walkthrough） | 2h |

### 第三优先级：锦上添花

| # | 动作 | 工作量 |
|---|------|:---:|
| 9 | 补全缺失的 User Stories（H-α 等） | 1h/Phase |
| 10 | 文件深度标准化（最小 500B，最大 20KB） | 持续 |
| 11 | 文档健康度 Dashboard 脚本 | 3h |

---

## 七、最终判定

> [!IMPORTANT]
> **结论：文档框架设计是顶级的（⭐⭐⭐⭐⭐），执行一致性需要补强（⭐⭐⭐）。**
>
> 您的 Trinity Pipeline 规范、SKILL 定义、AGENTS.md 手册在我见过的个人项目中是最专业的水准。
> 但规范和执行之间有约 52% 的差距（85 个应有文件中缺失 44 个）。
>
> **对多 Agent 系统的影响**：框架上已经准备好了（Gate 前置条件、路径映射、固定文件名），
> 但外部 Agent 需要的是**实物文件**而非**规范承诺**。如果 Codex Evaluator 被要求
> "审查 Phase F 的 plan.md"，它会发现这个文件不存在。
>
> **建议**：先执行第一优先级的 4 项修复（约 1 天），让签章格式统一 + 文件名规范化 + 
> Gate 检查脚本就位，然后 M0/M1 就可以启动了。过程中逐步回填历史 Phase 的缺失文件。
