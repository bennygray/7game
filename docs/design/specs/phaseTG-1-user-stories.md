# Phase TG-1 — User Stories

> **版本**: v1.0 | **日期**: 2026-04-01
> **PRD**: `docs/features/phaseTG-1-PRD.md` v1.0

---

## US-TG1-01: 判定完整性校验

**标题**: 作为 Trinity Pipeline 执行者，我需要审查报告的判定标签与统计数字必须一致，以防止 BLOCK 穿透门禁

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|------------|
| AC1 | 审查报告 L1 汇总有 BLOCK > 0 | 写入最终判定时 | 判定 = BLOCKED，不能写 CONDITIONAL PASS 或 PASS | PRD §3.1 判定映射表 |
| AC2 | 审查报告 L1 汇总有 WARN > 0 且 BLOCK = 0 | 写入最终判定时 | 判定 = CONDITIONAL PASS | PRD §3.1 判定映射表 |
| AC3 | 头部判定与统计数字矛盾 | 报告写入前校验 | 报告无效，必须重写 | PRD §3.1 禁止的矛盾模式 |

**依赖**: 无
**复杂度**: XS

---

## US-TG1-02: 禁止自审 + 文件命名硬约束

**标题**: 作为 Trinity Pipeline 执行者，当 BLOCK 被修复后，我必须重新调用 @doc-reviewer 产出独立审查文件，禁止自审自判

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|------------|
| AC1 | 第 N 轮审查发现 BLOCK | 修复完成后 | 必须重新调用 @doc-reviewer 执行完整四层防线 | PRD §3.2 |
| AC2 | 第 N 轮审查发现 BLOCK | 修复完成后 | 禁止在同一轮报告中标记"已修复"并自行改判 | PRD §3.2 禁止行为 |
| AC3 | 第 N+1 轮审查产出 | 写入文件时 | 文件名为 review-gX-v(N+1).md，父 agent 检查上一版文件存在 | PRD §3.3 |

**依赖**: US-TG1-01
**复杂度**: S

---

## US-TG1-03: 签章前文件完整性检查

**标题**: 作为 Trinity Pipeline 执行者，签章前我必须验证：如果第 1 轮有 BLOCK，则重审文件（v2+）必须存在

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|------------|
| AC1 | 第 1 轮审查有 BLOCK | 签章前检查 | review-gX-v2.md（或更高版本）文件必须存在 | PRD §3.4 |
| AC2 | 第 1 轮审查无 BLOCK | 签章前检查 | 不要求 v2 文件存在 | 现有流程不变 |
| AC3 | v2 文件应存在但不存在 | 签章前检查 | 签章无效，必须补执行重审 | PRD §3.4 |

**依赖**: US-TG1-02
**复杂度**: XS
