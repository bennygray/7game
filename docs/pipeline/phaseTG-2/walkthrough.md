# Phase TG-2 — Walkthrough

> **日期**：2026-04-02
> **主题**：审查上下文交付 + 影响审计扩展 + INDEX 补全
> **清偿**：FB-020(b)

---

## 交付物总览

| # | 交付物 | 目标文件 | 变更量 |
|---|--------|---------|:------:|
| T1 | Reviewer 上下文交付协议 | `review-protocol.md` | +45 行 |
| T2 | SKILL.md 调用模板更新 ×3 | SPM/SGA/SGE SKILL.md | +28 行 |
| T3 | SGA Step 5.5-5.9 扩展 | SGA SKILL.md | +55 行 |
| T4 | INDEX.md 全量补全 | `docs/INDEX.md` | +80 行 |

**共 5 个文件修改**，零新增文件，零代码变更。

---

## T1: review-protocol.md v1.2→v1.3

新增 `§0 上下文交付清单`，定义三种 Gate 各自需要交付给 @doc-reviewer 的文件列表：
- Gate 1: 6 项（审查协议 + personas + PRD + User Stories + 项目约束摘要 + 前置 review）
- Gate 2: 7 项（+ 架构索引 + Pipeline + 依赖）
- Gate 3: 6 项（+ 代码变更清单 + 验证脚本输出）

已知限制：`.agents/` 路径无 project.yaml 条目，使用硬编码路径（可接受 — 目录结构固定）。

## T2: 三个 SKILL.md 调用模板

每个 SKILL.md 的 @doc-reviewer 调用模板更新为：
1. 结构化上下文交付列表（引用 review-protocol.md §0）
2. 文件存在检查指令（"缺失→停止，向 USER 报告"）

## T3: SGA Step 5 扩展

| 子步骤 | 审计维度 | 产出 |
|--------|---------|------|
| 5.5 | 测试脚本影响 | 影响表 |
| 5.6 | 文档一致性 | 5 项检查表 |
| 5.7 | 回归测试范围 | 执行清单 |
| 5.8 | 存档迁移链 | 一行结果 |
| 5.9 | 产出与校验（原 5.5 重编号） | 文件数比对 |

SGA Signoff 括号同步更新为 8 维度。

## T4: INDEX.md 全量补全

| 类别 | 新增数 |
|------|:-----:|
| PRD/Analysis | +9 |
| TDD | +9 |
| User Stories | +5 |
| 验证脚本 | +9 |
| Pipeline Phase 行 | +11 |
| 特殊过程资产 | +14 |

自检验证：45 个新增条目全部文件存在 ✅

---

## Gate 审查结果

| Gate | 判定 | BLOCK | WARN | 说明 |
|------|------|:-----:|:----:|------|
| Gate 1 | CONDITIONAL PASS | 0 | 3 | 标题编号/TDD 计数/自检方法 — 全修复 |
| Gate 2 | CONDITIONAL PASS | 0 | 4 | 自检范围/signoff/TDD 条目/.agents 路径 — 全修复 |
| Gate 3 | CONDITIONAL PASS | 0 | 2 | trinity-guardian/review.md 遗漏 — 已补入 |

---

## 遗留到 TG-3

- START-HERE.md 入口文档
- 交叉索引（Phase 间依赖引用）
- 需求追溯链（FB→PRD→TDD→Code 全链路）
