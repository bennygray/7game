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
   - 路径：`${paths.specs_dir}/[name]-TDD.md`
2. ✅ TDD.md 中有 `[x] GATE 2 PASSED` 签章？
3. 如任一条件不满足 → **拒绝执行**，输出提示让 USER 先完成 SGA 流程

---

## 上下文协议（Bootstrap）

1. 读 `.agents/project.yaml` — 获取所有文档路径（**必须最先读取**）
2. 读已签章的 TDD.md — 理解 interface、Pipeline 挂载、迁移策略
3. 读对应的 User Stories 文件 — 理解 AC 验收标准
4. 读 `${paths.tech_debt}` — 检查可顺带清偿的技术债务
5. 读 `${paths.feature_backlog}` — 检查可顺带清偿的需求债务
6. 读 `${paths.handoff}` — 理解当前断点和上下文（必读）
7. 读 `${paths.pipeline_dir}/phaseX/plan.md` — 理解实施计划（必读）
8. 读 `AGENTS.md` 数值验证、测试脚本、文档模块化规则
9. 按需读 `${paths.arch_schema}` — 涉及存档迁移时
10. 按需读 `${paths.arch_pipeline}` — 涉及 Pipeline 挂载时

> **路径解析**：`${paths.xxx}` 指 `.agents/project.yaml` 中 `paths:` 段对应的值。

---

## Step 1：编码实施

- 遵循 TDD 的 interface 定义（**不得擅改**）
- 遵循 TDD 的 Pipeline 挂载方案
- 按 Data Layer → Engine Layer → UI Layer 顺序实现
- 遵循 AGENTS.md 文档先行原则（先文档 → 确认 → 编码）

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

- 遵循 AGENTS.md 数值验证脚本规范
- 为本系统编写验证脚本 `${paths.scripts_dir}/[system]-verify.ts`
- 覆盖 PRD 中定义的所有公式
- 验证极端情况

---

## Step 3：全局回归

- 执行全量回归测试
- **必须退出码 0** 才能继续
- 如果回归失败：
  1. 先假设是新代码的问题
  2. 修复新代码
  3. 如确认是回归脚本本身的 Bug，记录并修复脚本
- 引用 `references/regression-protocol.md`

---

## Code Quality Gate（编码完成后逐项检查）

### 前端 Quality Gate

类型安全:
- [ ] `npm run lint` 零 error
- [ ] 零 `as any` / `as unknown`（如需强转，声明专用接口或类型守卫）
- [ ] 零 `(window as any)` 全局挂载（通过依赖注入）

边界合规:
- [ ] UI 层（src/ui/）零 GameState 直接写入（只读访问 + Engine API 调用）
- [ ] UI 层零 `document.getElementById` 直接调用（通过 layout.ts 注入引用）
- [ ] UI 层零 `localStorage` / `fetch` 直接调用（通过注入服务）

状态管理:
- [ ] 模块级 `let` 变量 = 0（用闭包封装或 Context 注入）
- [ ] 所有 setTimeout/setInterval 有 dispose 清理路径

一致性:
- [ ] 同类功能使用同一实现模式（如别名统一走映射表）
- [ ] 格式化逻辑统一在 mud-formatter.ts（不内联在 command-handler switch 中）

测试:
- [ ] 新增纯函数有对应单元测试
- [ ] `npm run test:regression` 通过

### 后端 Quality Gate

架构合规:
- [ ] 前端 AI 调用全部走 ai-server (port 3001)，不直连 llama-server
- [ ] 端点命名与 CLAUDE.md `/api/infer` 规范一致
- [ ] CORS 仅允许 localhost origin
- [ ] server/ 不导入 src/ui/ 或 src/engine/

稳定性:
- [ ] 子进程有崩溃自动恢复逻辑
- [ ] HTTP server 有 graceful shutdown
- [ ] 请求体有大小限制

输入校验:
- [ ] POST 端点校验必需字段，缺失返回 400
- [ ] JSON.parse 失败返回 400（不是 500）

AI 推理:
- [ ] 推理超时有 fallback
- [ ] Prompt 不硬编码（在 src/ai/prompts/ 或 ai-server 常量区）

---

## Party Review Gate

### 角色配置

| 类型 | 角色 | 维度数 |
|------|------|:-----:|
| **必选** | R1 魔鬼PM | 3 |
| **必选** | R6 找茬QA | 5 |
| **必选** | R7 资深程序员 | 7 |

### 角色适配规则

| Phase 类型 | 判定条件 | 调整 |
|-----------|---------|------|
| 纯文档 / 零代码 | 无新增/修改 .ts 文件 | R7 跳过，R1 聚焦 D3 范围控制 |
| 纯 UI | 无 Engine/AI 层变更 | R6 跳过 D2 并发竞态 |
| 全栈 | 涉及 Engine + UI/AI | 全部保留 |

> 跳过的角色/维度标记：`> R?/D? [名称]：本 Phase 不适用，跳过。`

### 执行流程

调用 `@doc-reviewer` 在独立上下文中执行审查：

```
@doc-reviewer 审查 Phase [X] Gate 3。
TDD: ${paths.specs_dir}/[name]-TDD.md
User Stories: ${paths.specs_dir}/[name]-user-stories.md
变更文件: [列出本次变更的文件]
角色配置:
  必选: R1(魔鬼PM) R6(找茬QA) R7(资深程序员)
  适配: [参照上方角色适配规则表]
```

> doc-reviewer 在独立上下文中加载 `_shared/review-protocol.md` 和对应 `personas/*.md`，
> 执行四层防线（L1→L2→L3）+ Devil's Advocate。
> 审查报告由父 agent 写入 `${paths.pipeline_dir}/phaseX/review-g3.md`。

---

## Step 4：交接更新

编码和验证完成后，更新以下文档（按 AGENTS.md 写入路径映射表）：

- [ ] **必更新** → 更新 `${paths.task_tracker}`（Phase 状态总览 + 累计统计）
- [ ] **必更新** → 更新 `${paths.handoff}`（当前断点 + 已交付表格）
- [ ] 如涉及 Roadmap Phase 完成 → 更新 `${paths.roadmap}`（标记 Phase ✅）
- [ ] 如涉及 Gap 分析层级变化 → 更新 `soul-vision-gap-analysis.md`（层百分比更新）
- [ ] 新增资源/系统 → 更新 `${paths.prd_economy}` + `${paths.prd_systems}`
- [ ] 新增公式 → 更新 `${paths.prd_formulas}`
- [ ] 新增代码文件 → 更新 `${paths.arch_layers}`
- [ ] 新增数据字段 → 更新 `${paths.arch_gamestate}` + `${paths.arch_schema}`
- [ ] 新增 Pipeline 挂载 → 更新 `${paths.arch_pipeline}`
- [ ] 新增依赖 → 更新 `${paths.arch_dependencies}`
- [ ] 新增文件 → 更新 `${paths.doc_index}`
- [ ] 更新 AGENTS.md（如有新的项目约束）
- [ ] 技术债务变更 → 更新 `${paths.tech_debt}`
- [ ] 需求债务变更 → 更新 `${paths.feature_backlog}`
- [ ] **完成 `${paths.pipeline_dir}/phaseX/walkthrough.md`**（变更总结 + 验证结果）

### 产出物归档表

| 产出物 | 保存路径 |
|--------|---------|
| 验证结果 | `${paths.verification_dir}/[name]-verification.md` |
| **执行追踪** | `${paths.pipeline_dir}/phaseX/task.md`（执行过程中持续更新） |
| **完成总结** | `${paths.pipeline_dir}/phaseX/walkthrough.md`（变更清单 + 验证结果） |

---

## Step 4 硬约束

> [!IMPORTANT]
> 以下文件必须存在且非空，否则 GATE 3 签章无效。
> Phase IJ v3.0 曾遗漏 task.md 和 walkthrough.md，事后补写。

| 文件 | 最低内容要求 |
|------|------------|
| `${paths.pipeline_dir}/phaseX/task.md` | 每个 Task 的状态（完成/跳过/阻塞）+ 原因 |
| `${paths.pipeline_dir}/phaseX/walkthrough.md` | 变更文件清单 + 验证结果摘要 + 遗留项 |
| `${paths.handoff}` | 当前断点 + 下一步建议 |

### GATE 3 签章前置验证

在签章前，执行以下自动检查：

1. `ls ${paths.pipeline_dir}/phaseX/task.md` — 文件存在
2. `ls ${paths.pipeline_dir}/phaseX/walkthrough.md` — 文件存在
3. 新增代码文件是否已登记到 `${paths.arch_layers}` — grep 验证
4. 新增 Pipeline handler 是否已登记到 `${paths.arch_pipeline}` — grep 验证
5. 新增依赖是否已登记到 `${paths.arch_dependencies}` — grep 验证

任何一项失败 → 补全后再签章。

---

## GATE 3 签章

### 评审循环协议

1. 执行 Party Review（调用 `@doc-reviewer`），记为第 1 轮
2. 如果结果包含 🔴 BLOCK：
   a. 向 USER 呈现所有 BLOCK 项 + WARN 项
   b. 逐条修复 BLOCK 项（修改代码 / 测试）
   c. 重新执行 Party Review（完整四层防线，不可跳过已修复项），记为第 N+1 轮
   d. 重复 2a-2c 直到 0 BLOCK
3. 如果结果为 CONDITIONAL PASS（有 WARN 无 BLOCK）：
   a. 向 USER 呈现所有 WARN 项
   b. USER 确认接受 / 要求修复
   c. 接受的 WARN 记入 `${paths.tech_debt}` 技术债务
4. **评审次数上限 = 3 轮**。第 3 轮仍有 BLOCK → 停止循环，向 USER 报告累计未解决项，由 USER 决定：
   - 接受风险继续（记入技术债务 + 风险标注）
   - 回退到 SGA 修改设计
   - 拆分交付（先交付已通过部分）
5. 评审报告版本号递增：`review-g3.md` → `review-g3-v2.md` → `review-g3-v3.md`

### 签章清单

```markdown
## SGE Delivery

- [ ] 所有 User Story 的 AC 已验证通过
- [ ] 数值验证脚本退出码 0
- [ ] 全量回归退出码 0
- [ ] Party Review 无 BLOCK 项（或 USER 已确认接受风险）
- [ ] 交接文档已更新
- [ ] Pipeline 过程资产已归档（task.md + walkthrough.md）
- [ ] GATE 3 前置验证全部通过

签章：`[x] GATE 3 PASSED` — [日期]
```

---

## 引用共享模块

- `_shared/review-protocol.md` — Party Review 四层防线
- `_shared/cove-protocol.md` — CoVe 证据验证
- `_shared/communication-rules.md` — 沟通纪律
- `_shared/anti-rationalization.md` — 反合理化（查看 SGE 专属部分）
- `_shared/personas/devil-pm.md` — R1
- `_shared/personas/adversarial-qa.md` — R6
- `_shared/personas/senior-programmer.md` — R7
