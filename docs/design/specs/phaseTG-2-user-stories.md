# Phase TG-2 — User Stories

> **版本**：v1.0 | **日期**：2026-04-02
> **关联 PRD**：`docs/features/phaseTG-2-PRD.md` v1.0

---

## US-TG2-01: Reviewer 上下文交付协议

**标题**：作为 Pipeline 执行者，我需要标准化的 reviewer 上下文清单，以确保 @doc-reviewer 在独立上下文中拥有足够信息执行高质量审查。

### AC（Acceptance Criteria）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | review-protocol.md 已更新 | 读取 §0 段 | 包含 Gate 1 / Gate 2 / Gate 3 三个上下文清单，每个清单 ≥5 项必交付文件 | PRD §3 D1 R-D1-02 |
| 2 | SPM SKILL.md @doc-reviewer 调用模板 | 发起 Gate 1 审查 | 模板包含 Gate 1 上下文清单中所有文件的 `${paths.xxx}` 引用 | PRD §3 D1 R-D1-03~04 |
| 3 | SGA SKILL.md @doc-reviewer 调用模板 | 发起 Gate 2 审查 | 模板包含 Gate 2 上下文清单中所有文件的引用，含 MASTER-ARCHITECTURE + pipeline + dependencies | PRD §3 D1 R-D1-02 |
| 4 | SGE SKILL.md @doc-reviewer 调用模板 | 发起 Gate 3 审查 | 模板包含 Gate 3 上下文清单中所有文件的引用，含代码变更清单 + 验证脚本输出摘要 | PRD §3 D1 R-D1-02 |
| 5 | 调用模板中引用了不存在的文件 | 父 agent 执行文件存在检查 | 停止调用，向 USER 报告缺失文件 | PRD §3 D1 R-D1-05 |

**依赖**：无
**复杂度**：S

---

## US-TG2-02: SGA Step 5 扩展 (5.5-5.9)

**标题**：作为 SGA 架构师，我需要扩展的关联性审计维度，以覆盖测试脚本/文档一致性/回归范围/存档迁移四类关联，防止遗漏修改文件。

### AC（Acceptance Criteria）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | SGA SKILL.md Step 5 已更新 | 读取 5.5 段 | 包含"测试脚本影响审计"：列出被 TDD 涉及的公式/逻辑文件 → grep verify-*.ts 引用 → 产出影响表 | PRD §3 D2 R-D2-01 (5.5) |
| 2 | SGA SKILL.md Step 5 已更新 | 读取 5.6 段 | 包含"文档一致性审计"：检查 INDEX.md / gamestate.md / pipeline.md 更新计划 → 产出检查表 | PRD §3 D2 R-D2-01 (5.6) |
| 3 | SGA SKILL.md Step 5 已更新 | 读取 5.7 段 | 包含"回归测试范围确定"：根据修改文件清单→确定必须运行的 test suite → 产出执行清单 | PRD §3 D2 R-D2-01 (5.7) |
| 4 | SGA SKILL.md Step 5 已更新 | 读取 5.8 段 | 包含"存档迁移链完整性"：检查新增持久化字段→确认 migrateVxToVy + schema.md 已规划 | PRD §3 D2 R-D2-01 (5.8) |
| 5 | 原 5.5 "产出与校验" | 读取重编号后的位置 | 已重编号为 5.9，校验范围声明覆盖 5.1-5.8 | PRD §3 D2 R-D2-02~03 |

**依赖**：无
**复杂度**：S

---

## US-TG2-03: INDEX.md 全量补全

**标题**：作为新会话接手者，我需要 INDEX.md 完整注册所有 docs/ 下的文档文件，以便快速定位任何 Phase 的产出物。

### AC（Acceptance Criteria）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| 1 | INDEX.md 已更新 | 查看 "Trinity 分析进度" 段 | 包含 Phase X-α/β/γ、IJ-PoC、IJ、J-Goal、I-alpha、TG-1、TG-2 的 PRD 条目（共 +9） | PRD §3 D3 R-D3-01 |
| 2 | INDEX.md 已更新 | 查看 "技术设计文档" 段 | 包含 phaseI-alpha/IJ/J-goal/TG-1/X-alpha/X-beta/X-gamma/Z 的 TDD 条目 | PRD §3 D3 R-D3-01 |
| 3 | INDEX.md 已更新 | 查看 "User Stories" 段 | 包含 phaseI-alpha/J-goal/TG-1/X-gamma 的 user stories 条目 | PRD §3 D3 R-D3-01 |
| 4 | INDEX.md 已更新 | 查看 "验证脚本" 段 | 包含 verify-phaseE/F/F0-α/F0-β/I-alpha/IJ/J-goal + verify-ui-formatter + regression-all（共 +9） | PRD §3 D3 R-D3-01 |
| 5 | INDEX.md 已更新 | 查看 "Pipeline 过程资产" 表 | 包含 Phase X-α/β/γ、Y、Z、IJ(gate files)、J-Goal、I-alpha、TG-1、TG-2 + trinity-guardian + infra-review 行 | PRD §3 D3 R-D3-01 |
| 6 | INDEX.md 补全完成 | 对每个新增条目执行文件存在检查 | 所有引用的文件路径均存在于文件系统中 | PRD §3 D3 R-D3-04 |

**依赖**：US-TG2-01、US-TG2-02 完成后再补全（包含 TG-2 自身条目）
**复杂度**：M（文件数量多，但每个条目简单）
