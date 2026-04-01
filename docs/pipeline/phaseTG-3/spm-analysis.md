# Phase TG-3 SPM 分析 — 文档关系梳理 + 交叉索引 + 追溯链

> **Phase**: TG-3 | **来源**: FB-020(c) | **日期**: 2026-04-02
> **前置**: TG-1 ✅ (重审执行保障) + TG-2 ✅ (审查上下文+Step5+INDEX补全)

---

## Step 1: 第一性原理解构

### 1.0 需求债务检查

FB-020(c) 匹配 — 本次清偿。原始范围："TG-3 START-HERE + 交叉索引 + 追溯链"。

用户扩展要求：
- 检查 START-HERE.md 是否可用 INDEX.md 替代
- 文档关系梳理（大量重复功能未引用或声明）
- 文档存放位置的声明管理

### 1a. 5-Why

```
为什么需要 TG-3？→ 新会话接手效率低
为什么效率低？→ 文档关系混乱，多入口竞争
为什么混乱？→ CLAUDE.md/AGENTS.md 80% 重复，主从名不副实
为什么名不副实？→ 项目演进中从未做关系审计
→ 根因：缺乏文档权责声明和关系管理机制
```

### 1b. Invariant

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | 每类信息有且仅有一个权威文档 | 信息分歧 |
| I2 | 文档间引用关系必须单向层级 | 无法判定正确版本 |
| I3 | MASTER 索引 ≤ 150 行 | 索引变 detail |
| I4 | CLAUDE.md 必须是主文件 | AI 会话信息不完整 |

### 1c. 最小组件

文档权责声明表 — 明确每个文档的唯一职责和禁区。

### 1d. 核心体验

新 AI 会话 30 秒内定位到正确文档，无混淆。ROI: M成本 / 4分体验。

---

## Step 2: 深度审计

### 2.0 审计方法

启动 2 个 Explore agent 并行执行全量审计：
- Agent 1：10 个核心文件的内容重复矩阵 + 孤立内容 + 循环引用 + 角色冲突 + handoff 膨胀分析
- Agent 2：8 个 detail 文件与 MASTER 父文件的委托关系 + 交叉引用缺口 + 版本漂移

### 2.1 审计发现

8 个问题（P1-P8）+ 3 个缺失能力（M1-M3），详见 [`phaseTG-3-PRD.md §2`](../../features/phaseTG-3-PRD.md#2-深度审计发现)。

### 2.2 用户决策

- D1: CLAUDE.md 作为主文件（选项 C）
- D2: handoff 历史归档到 handoff-archive.md（选项 B）
- D3: 8 个问题全部纳入 TG-3

---

## Step 3: User Story 映射

7 个 User Story，覆盖 11 个交付物（D1-D11）。详见 `phaseTG-3-user-stories.md`。

| Story | 交付物 | 复杂度 |
|-------|-------|:------:|
| US-TG3-01 | D1 CLAUDE↔AGENTS 反转 | M |
| US-TG3-02 | D2 handoff 瘦身+归档 | M |
| US-TG3-03 | D3+D4 MASTER 修正 | S |
| US-TG3-04 | D5 INDEX Quick Orient | M |
| US-TG3-05 | D6 cross-index | M |
| US-TG3-06 | D7 traceability | M |
| US-TG3-07 | D8+D9+D10+D11 启动协议+protocol+互引 | S |

---

## 产出物清单

| 产出物 | 路径 | 状态 |
|--------|------|:----:|
| PRD | `docs/features/phaseTG-3-PRD.md` | ✅ v1.0 |
| User Stories | `docs/design/specs/phaseTG-3-user-stories.md` | ✅ v1.0 |
| SPM 分析 | `docs/pipeline/phaseTG-3/spm-analysis.md` | ✅ |
| Plan | `docs/pipeline/phaseTG-3/plan.md` | ✅ |
