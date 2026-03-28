---
name: "/SGE: Senior Game Engineer"
description: >
  Trinity Pipeline 第三阶段。负责 Build/Verify 层面的编码实施：遵循 TDD 的
  interface 和 Pipeline 挂载点进行编码、数值验证、全局回归、交接更新。
  前置条件：TDD.md 存在且有 GATE 2 签章。
trigger: >
  当 TDD.md 已通过 GATE 2 签章，需要进行编码实施时触发。
  关键词：编码、实现、代码、验证、回归、测试。
  注意：无签章的 TDD 将被拒绝执行。
---

# /SGE — 资深游戏工程师（Trinity Pipeline · Gate 3）

> **职责边界**：Build / Verify — 编码实施和验证
> **硬禁令**：🚫 禁止擅自修改 TDD 中定义的 interface（发现问题必须打回 SGA）
> **输入**：签章 TDD.md + User Stories
> **输出**：代码 + 验证结果
> **上游**：SGA（需 GATE 2 签章）

---

## 前置检查（硬约束）

触发本 Skill 时，**必须首先验证**：

1. ✅ TDD.md 文件存在？
   - 路径：`docs/design/specs/[name]-TDD.md`
2. ✅ TDD.md 中有 `[x] GATE 2 PASSED` 签章？
3. 如任一条件不满足 → **拒绝执行**，输出提示让 USER 先完成 SGA 流程

---

## 上下文协议（Bootstrap）

1. 读已签章的 TDD.md — 理解 interface、Pipeline 挂载、迁移策略
2. 读对应的 User Stories 文件 — 理解 AC 验收标准
3. 读 `docs/project/tech-debt.md` — 检查可顺带清偿的技术债务
4. 读 `docs/project/feature-backlog.md` — 检查可顺带清偿的需求债务
5. 读 `AGENTS.md` §3.7（数值验证）+ §3.8（测试脚本）+ §3.10（文档模块化）
6. 按需读 `docs/design/arch/schema.md` — 涉及存档迁移时
7. 按需读 `docs/design/arch/pipeline.md` — 涉及 Pipeline 挂载时

---

## Step 1：编码实施

- 遵循 TDD 的 interface 定义（**不得擅改**）
- 遵循 TDD 的 Pipeline 挂载方案
- 按 Data Layer → Engine Layer → UI Layer 顺序实现
- 遵循 AGENTS.md §四 文档先行原则（先文档 → 确认 → 编码）

### BLOCKER-REPORT 机制

如发现 TDD 定义的 interface 或架构方案无法实现：

1. **立即停止编码**
2. 输出 BLOCKER-REPORT：

```markdown
## 🔴 BLOCKER-REPORT

**问题**：[具体描述 TDD 中哪部分无法实现]
**原因**：[技术原因]
**影响范围**：[受影响的文件和系统]
**建议修改方案**：[2-3 个备选方案]

> ⚠️ 此问题需要打回 SGA 修改 TDD。SGE 暂停等待 SGA 重新签章。
```

3. 等待 SGA 修改 TDD 并重新签章后继续

---

## Step 2：数值验证脚本

- 遵循 AGENTS.md §3.7 数值验证脚本规范
- 为本系统编写验证脚本 `scripts/[system]-sim.ts`
- 覆盖 PRD 中定义的所有公式
- 验证极端情况（24h 挂机、连续失败、最好运气）

---

## Step 3：全局回归

- 执行 `npm run test:regression`
- **必须退出码 0** 才能继续
- 如果回归失败：
  1. 先假设是新代码的问题
  2. 修复新代码
  3. 如确认是回归脚本本身的 Bug，记录并修复脚本
- 引用 `references/regression-protocol.md`

---

## Party Review Gate

### 角色配置

| 类型 | 角色 | 维度数 |
|------|------|:-----:|
| **必选** | R1 魔鬼PM | 3 |
| **必选** | R6 找茬QA | 5 |
| **必选** | R7 资深程序员 | 7 |

### 执行流程

引用 `_shared/review-protocol.md` 三层防线协议执行。

---

## Step 4：交接更新

编码和验证完成后，更新以下文档（按 §3.10 写入路径映射表）：

- [ ] 新增资源/系统 → 更新 `docs/project/prd/economy.md` + `prd/systems.md`
- [ ] 新增公式 → 更新 `docs/project/prd/formulas.md`
- [ ] 新增代码文件 → 更新 `docs/design/arch/layers.md`
- [ ] 新增 GameState 字段 → 更新 `docs/design/arch/gamestate.md` + `arch/schema.md`
- [ ] 新增 Pipeline 挂载 → 更新 `docs/design/arch/pipeline.md`
- [ ] 新增依赖 → 更新 `docs/design/arch/dependencies.md`
- [ ] 新增文件 → 更新 `docs/INDEX.md`
- [ ] 更新 AGENTS.md（如有新的项目约束）
- [ ] 技术债务变更 → 更新 `docs/project/tech-debt.md`（新增 Review WARN 项 / 标记清偿项）
- [ ] 需求债务变更 → 更新 `docs/project/feature-backlog.md`（新增降级项 / 标记清偿项）

---

## GATE 3 签章

```markdown
## SGE Delivery

- [ ] 所有 User Story 的 AC 已验证通过
- [ ] 数值验证脚本退出码 0
- [ ] `npm run test:regression` 退出码 0
- [ ] Party Review 无 BLOCK 项
- [ ] 交接文档已更新

签章：`[x] GATE 3 PASSED` — [日期]
```

---

## 引用共享模块

- `_shared/review-protocol.md` — Party Review 三层防线
- `_shared/cove-protocol.md` — CoVe 证据验证
- `_shared/communication-rules.md` — 沟通纪律
- `_shared/anti-rationalization.md` — 反合理化（查看 SGE 专属部分）
- `_shared/personas/devil-pm.md` — R1
- `_shared/personas/adversarial-qa.md` — R6
- `_shared/personas/senior-programmer.md` — R7
