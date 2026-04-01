# Phase TG-1 — Trinity Pipeline 重审执行保障 (PRD)

> **版本**: v1.0 | **日期**: 2026-04-01
> **Phase 类型**: 流程治理（非游戏功能）
> **前置审计**: `docs/pipeline/trinity-guardian/process-audit-2026-04-01.md`

---

## §1 背景与动机

### 1.1 问题陈述

Phase J-Goal 和 Phase I-alpha 的 Gate Review 执行中发现三类违规：

1. **判定矛盾**: Phase J-Goal Gate 2 报告头部写 "CONDITIONAL PASS" 但统计为 "1 BLOCK / 5 WARN"。协议定义 CONDITIONAL PASS = 0 BLOCK，一个 active BLOCK（revenge 事件类型不匹配）穿透门禁
2. **自审自判**: Phase I-alpha Gate 1 的 BLOCK 被内联修复后自行改判，未重新调用 @doc-reviewer，无 v2 文件
3. **签章遗漏**: 两个 Phase 均未在签章前检查重审文件是否存在

### 1.2 5-Why 根因

```
为什么 BLOCK 穿透了？→ 判定标签与统计矛盾
为什么矛盾未被发现？→ 无校验规则
为什么修复后未重审？→ 协议是声明式的，无结构性防护
为什么签章也没拦住？→ 签章清单无重审文件完整性检查
根因：流程可靠性依赖执行者自觉性，缺乏机械性防护
```

### 1.3 核心体验

| 维度 | 内容 |
|------|------|
| 核心价值 | Gate Review 判定可信赖 — PASS/CONDITIONAL PASS 意味着真的没有 BLOCK |
| ROI | 成本 XS（纯文档修改 4 个文件） vs 流程可靠性增量 5/5 |
| 循环挂载 | 嵌入现有 SPM/SGA/SGE 每个 Gate Review 流程 |

---

## §2 不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | BLOCK > 0 的审查判定必须为 BLOCKED | active BLOCK 穿透门禁，缺陷进入下游 |
| I2 | 修复后必须由独立 reviewer 重新审查 | 修复质量无保证，review 形同虚设 |
| I3 | 签章前必须验证重审文件存在性 | 跳过重审的行为无法被最终拦截 |

---

## §3 规则定义

### SS3.1 判定完整性校验规则（R1）

在审查报告写入文件**之前**，必须执行判定校验：

| 统计结果 | 唯一合法判定 |
|---------|------------|
| BLOCK > 0 | BLOCKED |
| BLOCK = 0, WARN > 0 | CONDITIONAL PASS |
| BLOCK = 0, WARN = 0 | PASS |

**禁止的矛盾模式**:
- 头部 "CONDITIONAL PASS" + 统计 BLOCK > 0
- 头部 "PASS" + 统计 WARN > 0
- 统计数字与 L1 表格实际行数不一致

违反此校验的报告**无效**，必须重写。

### SS3.2 禁止自审规则（R2）

修复 BLOCK 后的重新审查**必须**再次调用 `@doc-reviewer` 执行完整四层防线。

**禁止行为**:
- 在同一轮报告中标记 "已修复" 并自行将 BLOCK 改判为 PASS
- 父 agent 自行验证修复正确性并跳过重审
- 将修复和审查合并为一个动作

**原则**: 修复是作者行为，审查是独立评审行为，二者不可合并。

### SS3.3 文件命名递增规则（R3）

重审轮次 N+1 必须产出新文件 `review-gX-v(N+1).md`:
- 第 1 轮: `review-gX.md`
- 第 2 轮: `review-gX-v2.md`
- 第 3 轮: `review-gX-v3.md`

父 agent 写入前检查: 上一版文件是否存在。如 `review-g2.md` 存在则新文件必须为 `review-g2-v2.md`。目标文件名不符合递增序列 → 命名错误，停止并修正。

### SS3.4 签章前文件完整性检查（R4）

签章前新增检查项:
- 如第 1 轮审查有 BLOCK → `review-gX-v2.md`（或更高版本）**必须**存在
- 如第 1 轮审查无 BLOCK → 不要求 v2 文件
- v2 文件应存在但不存在 → 签章无效，必须补执行重审

---

## §4 修改范围

### IN（本 Phase 范围）

| 修改点 | 文件 | 内容 |
|--------|------|------|
| 判定校验段 | `review-protocol.md` ~L119 后 | 新增"判定完整性校验"硬约束段 |
| 禁止自审 + 文件命名 | SPM SKILL.md ~L294 后 | 步骤 2b 后插入禁止自审段 + 强化步骤 2c |
| 禁止自审 + 文件命名 | SGA SKILL.md ~L212 后 | 同上 |
| 禁止自审 + 文件命名 | SGE SKILL.md ~L253 后 | 同上 |
| 签章检查 | SPM SKILL.md ~L313 | 签章清单新增 item |
| 签章检查 | SGA SKILL.md ~L234 | 签章清单新增 item |
| 签章检查 | SGE SKILL.md ~L274 | 签章清单新增 item |

### OUT（不在本 Phase）

- Reviewer subagent 上下文扩展 → Phase TG-2
- SGA Step 5 新增 5.5-5.9 → Phase TG-2
- INDEX.md 补全 → Phase TG-2
- START-HERE.md / 交叉索引 / 追溯链 → Phase TG-3

---

## §5 成功指标

| 指标 | 验证方式 |
|------|---------|
| 下一次 Gate Review 不出现判定矛盾 | 检查报告头部 vs 统计数字 |
| BLOCK 修复后产出 v2 文件 | ls review-gX-v2.md |
| 签章清单包含文件完整性检查 | grep SKILL.md |

---

## §6 需求债务

本 Phase 是 FB-019（SGA 关联性审计缺陷，已清偿）的延续。注册新条目:

**FB-020**: Trinity Pipeline 重审循环 + 审查上下文 + 影响分析扩展
- (a) TG-1 重审执行保障 — 本 Phase 清偿
- (b) TG-2 reviewer 上下文 + Step 5 扩展 — 后续
- (c) TG-3 文档索引完善 — 后续
