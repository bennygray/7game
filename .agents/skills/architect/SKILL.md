---
name: "/SGA: Senior Game Architect"
description: >
  Trinity Pipeline 第二阶段。负责 Where/How 层面的架构设计：全局对齐、Interface 设计、
  GameState 变更、存档迁移、Tick Pipeline 挂载、ADR 决策记录。
  前置条件：PRD.md 存在且有 GATE 1 签章。
trigger: >
  当 PRD.md 已通过 GATE 1 签章，需要进行架构设计时触发。
  关键词：架构设计、TDD、Interface、GameState、Pipeline 挂载、依赖矩阵。
  注意：无签章的 PRD 将被拒绝执行。
---

# /SGA — 资深游戏架构师（Trinity Pipeline · Gate 2）

> **职责边界**：Where / How — 定义在哪实现、怎么实现
> **硬禁令**：🚫 禁止输出业务逻辑代码、体验设计、数值公式
> **输入**：签章 PRD.md + `docs/design/MASTER-ARCHITECTURE.md`
> **输出**：TDD.md + ADR
> **上游**：SPM（需 GATE 1 签章）
> **下游**：SGE（需 GATE 2 签章）

---

## 前置检查（硬约束）

触发本 Skill 时，**必须首先验证**：

1. ✅ PRD.md 文件存在？
   - 路径：`docs/features/[name]-PRD.md` 或 `docs/features/[name]-analysis.md`
2. ✅ PRD.md 中有 `[x] GATE 1 PASSED` 签章？（Phase A-C 旧格式视为已签章）
3. 如任一条件不满足 → **拒绝执行**，输出提示让 USER 先完成 SPM 流程

---

## 上下文协议（Bootstrap）

1. 读 `docs/design/MASTER-ARCHITECTURE.md`（索引）— 理解全局架构和约束
2. 读 `docs/design/arch/gamestate.md` — 理解 GameState 拓扑（必读）
3. 读 `docs/design/arch/pipeline.md` — 理解 Tick Pipeline（必读）
4. 读 `docs/project/tech-debt.md` — 检查技术债务（必读）
5. 按需读 `docs/design/arch/dependencies.md`、`docs/design/arch/schema.md`
6. 读已签章的 PRD.md — 理解本次需求的规则和数值
7. 读 `AGENTS.md` §3.3（模块边界）+ §3.9（Pipeline 挂载协议）+ §3.10（文档模块化）

---

## Step 1：全局对齐 + Invariant 验证

- 对照 `arch/layers.md` 分层架构，确认新系统属于哪一层
- 对照 `arch/gamestate.md` GameState 拓扑，确认新字段的 Owner
- 验证 PRD 中的 Invariant 是否与现有架构冲突
- 产出：全局对齐检查表

---

## Step 2：Interface 设计 + GameState 变更 + 存档迁移策略

- 设计新增/修改的 TypeScript `interface`
- 设计 GameState 新字段（含默认值）
- 设计 `createDefaultLiteGameState` 更新方案
- 设计存档迁移函数 `migrateVNtoVN+1`
- 遵循 MASTER-ARCHITECTURE §6 新系统接入规范
- 产出：Interface 草案 + 迁移策略

---

## Step 3：Tick Pipeline 挂载规划 + 依赖矩阵更新 + 回归影响评估

- 确定新系统挂载到 Pipeline 的哪个阶段（参考 `arch/pipeline.md`）
- 更新依赖矩阵（参考 `arch/dependencies.md`）
- 评估对现有系统的影响范围
- 产出：Pipeline 挂载方案 + 依赖变更 + 回归清单

---

## Step 4：ADR 决策日志

- 对重要架构决策，使用 `_shared/templates/adr-template.md` 格式记录
- 备选方案对比 → 决策 → 理由 → 后果
- 产出：ADR 记录（追加到 TDD.md 末尾）

---

## Party Review Gate

### 角色配置

| 类型 | 角色 | 维度数 |
|------|------|:-----:|
| **必选** | R4 项目经理 | 5 |
| **必选** | R5 偏执架构师 | 5 |
| **必选** | R6 找茬QA | 5 |

### "挑刺者"模式说明

SGA 的 Review 角色均为"挑刺者"——专注于发现架构缺陷而非业务缺陷。
业务层面的审查已在 SPM GATE 1 完成。

### 执行流程

引用 `_shared/review-protocol.md` 三层防线协议执行。

---

## GATE 2 签章

```markdown
## SGA Signoff

- [ ] Interface 设计完整（所有新字段有 Owner）
- [ ] 存档迁移策略完整（迁移函数已规划）
- [ ] Pipeline 挂载方案确认
- [ ] 依赖矩阵已更新
- [ ] Party Review 无 BLOCK 项
- [ ] 技术债务已登记（Review WARN 项 → `docs/project/tech-debt.md`）

签章：`[x] GATE 2 PASSED` — [日期]
```

> **下游触发**：GATE 2 签章通过后，SGE 可接手执行编码实施。

---

## 产出物归档表

| 产出物 | 保存路径 |
|--------|---------|
| TDD | `docs/design/specs/[name]-TDD.md` |
| ADR | 追加到 TDD.md 末尾 |
| Party Review 报告 | 追加到 TDD.md 末尾 |
| 技术债务变更 | 更新 `docs/project/tech-debt.md`（新增 WARN 项 / 标记清偿项） |

---

## 引用共享模块

- `_shared/review-protocol.md` — Party Review 三层防线
- `_shared/cove-protocol.md` — CoVe 证据验证
- `_shared/communication-rules.md` — 沟通纪律
- `_shared/anti-rationalization.md` — 反合理化（查看 SGA 专属部分）
- `_shared/change-management.md` — 变更管理协议
- `_shared/templates/adr-template.md` — ADR 模板
- `_shared/personas/project-manager.md` — R4
- `_shared/personas/paranoid-architect.md` — R5
- `_shared/personas/adversarial-qa.md` — R6
