# Phase TG-1 — Technical Design Document (TDD)

> **版本**: v1.0 | **日期**: 2026-04-01
> **PRD**: `docs/features/phaseTG-1-PRD.md` v1.0 (GATE 1 PASSED)
> **Phase 类型**: 流程治理（纯文档修改，无代码）

---

## S1 全局对齐

| 检查项 | 结果 |
|--------|------|
| 分层归属 | `.agents/skills/` 流程治理层（不属于游戏四层架构） |
| GameState 变更 | 无 |
| Pipeline 变更 | 无 |
| 存档迁移 | 无 |
| Invariant 冲突 | 无 |

---

## S2 修改规格

### S2.1 review-protocol.md — 判定完整性校验段

**插入位置**: `_shared/review-protocol.md` L120（关闭 ``` 后）与 L122（`## 按需角色激活规则`）之间

**插入内容**:

```markdown
## 判定完整性校验（硬约束）

> 此步骤在写入审查报告文件**之前**必须执行。违反此约束的报告**无效**，必须重写。

1. 统计所有 L1 维度判定中 BLOCK / WARN / PASS 的数量
2. 根据统计结果确定唯一合法判定：

| 统计结果 | 唯一合法判定 |
|---------|------------|
| BLOCK > 0 | 🔴 BLOCKED |
| BLOCK = 0, WARN > 0 | ⚠️ CONDITIONAL PASS |
| BLOCK = 0, WARN = 0 | ✅ PASS |

3. 写入前自检 — 以下任一情况出现则报告无效：
   - 头部判定为 "CONDITIONAL PASS" 但统计行 BLOCK > 0
   - 头部判定为 "PASS" 但统计行 WARN > 0
   - 统计数字与 L1 表格中实际 BLOCK/WARN 行数不一致
```

### S2.2 三个 SKILL.md — 禁止自审 + 文件命名硬约束

**修改文件**: SPM SKILL.md / SGA SKILL.md / SGE SKILL.md
**插入位置**: 各文件"评审循环协议"步骤 2b 之后、步骤 2c 之前

SPM (`product-manager/SKILL.md` L294-295 之间):

```markdown
   > ⚠️ **禁止自审（硬约束）**
   > 修复后的重新审查**必须**再次调用 `@doc-reviewer` 执行完整四层防线。
   > 禁止在同一轮报告中标记"已修复"并自行将 BLOCK 改判为 PASS/CONDITIONAL PASS。
   > **原则**：修复是作者行为，审查是独立评审行为，二者不可合并。
   >
   > **文件命名硬约束**：第 N+1 轮审查必须产出新文件 `review-gX-v(N+1).md`。
   > 写入前检查：上一版文件（如 `review-g1.md`）必须已存在。
   > 如目标文件不符合递增序列 → 停止，修正命名后再写入。
```

SGA (`architect/SKILL.md` L212-213 之间): 同上文本，修复对象改为"TDD / ADR"。

SGE (`engineer/SKILL.md` L253-254 之间): 同上文本，修复对象改为"代码 / 测试"。

### S2.3 三个 SKILL.md — 签章清单新增项

**SPM** (`product-manager/SKILL.md` L313，`- [ ] Party Review 无 BLOCK 项` 之前):
```markdown
- [ ] **评审文件完整性**：如第 1 轮有 BLOCK，则 `review-g1-v2.md`（或更高版本）必须存在
```

**SGA** (`architect/SKILL.md` L235，`- [ ] Party Review 无 BLOCK 项` 之前):
```markdown
- [ ] **评审文件完整性**：如第 1 轮有 BLOCK，则 `review-g2-v2.md`（或更高版本）必须存在
```

**SGE** (`engineer/SKILL.md` L274，`- [ ] Party Review 无 BLOCK 项` 之前):
```markdown
- [ ] **评审文件完整性**：如第 1 轮有 BLOCK，则 `review-g3-v2.md`（或更高版本）必须存在
```

---

## S3 文件变更汇总

| # | 文件 | 操作 | 变更内容 |
|---|------|------|---------|
| M1 | `.agents/skills/_shared/review-protocol.md` | 修改 | L120-122 之间插入"判定完整性校验"段（~20 行） |
| M2 | `.agents/skills/product-manager/SKILL.md` | 修改 | L294-295 之间插入"禁止自审"段（~8 行）+ L313 签章清单 +1 item |
| M3 | `.agents/skills/architect/SKILL.md` | 修改 | L212-213 之间插入"禁止自审"段（~8 行）+ L235 签章清单 +1 item |
| M4 | `.agents/skills/engineer/SKILL.md` | 修改 | L253-254 之间插入"禁止自审"段（~8 行）+ L274 签章清单 +1 item |

**新增文件**: 0
**修改文件**: 4
**总变更行数**: ~50 行

---

## S4 ADR

### ADR-TG1-01: 三层拦截

| 维度 | 内容 |
|------|------|
| 背景 | Phase J-Goal/I-alpha 重审循环被跳过，有三种失效模式 |
| 方案 A | 仅 review-protocol.md 加判定校验（单点） |
| 方案 B | 报告层(R1) + 执行层(R2+R3) + 签章层(R4) 三层拦截 |
| 决策 | 方案 B |
| 理由 | 三层独立，任一层失败都被下一层拦截。成本差异极小 |
| 后果 | 4 个文件各加 10-20 行文本；无运行时代价 |

---

## S5 关联性影响审计

### 5.1 类型扩展引用追踪
N/A — 无类型新增/扩展。

### 5.2 函数签名变更影响面
N/A — 无函数签名变更。

### 5.3 副效果映射
N/A — 无 PRD 副效果。

### 5.4 Handler 联动
N/A — 无 Handler 变更。

### 5.5 产出校验
4 个修改文件与 S3 文件变更汇总一致。无遗漏。

---

## S6 验证计划

| # | 验证项 | 方法 | 对应 US |
|---|--------|------|--------|
| V1 | review-protocol.md 包含"判定完整性校验"段 | grep "判定完整性校验" review-protocol.md | US-TG1-01 |
| V2 | 三个 SKILL.md 包含"禁止自审"段 | grep "禁止自审" 三个文件 | US-TG1-02 |
| V3 | 三个 SKILL.md 签章清单包含"评审文件完整性"项 | grep "评审文件完整性" 三个文件 | US-TG1-03 |
| V4 | 插入位置正确（不破坏现有内容） | 读取修改后文件上下文确认结构完整 | 全部 |

---

## S7 Task 分解

| # | Task | 依赖 | 复杂度 |
|---|------|------|:------:|
| T1 | review-protocol.md 插入判定校验段 | — | XS |
| T2 | SPM SKILL.md 插入禁止自审段 + 签章 item | T1 | XS |
| T3 | SGA SKILL.md 插入禁止自审段 + 签章 item | T1 | XS |
| T4 | SGE SKILL.md 插入禁止自审段 + 签章 item | T1 | XS |
| T5 | 验证（V1-V4） | T1-T4 | XS |
