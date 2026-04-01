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
> **输入**：签章 PRD.md + `${paths.master_arch}`
> **输出**：TDD.md + ADR
> **上游**：SPM（需 GATE 1 签章）
> **下游**：SGE（需 GATE 2 签章）

---

## 前置检查（硬约束）

触发本 Skill 时，**必须首先验证**：

1. ✅ PRD.md 文件存在？
   - 路径：`${paths.features_dir}/[name]-PRD.md` 或 `${paths.features_dir}/[name]-analysis.md`
2. ✅ PRD.md 中有 `[x] GATE 1 PASSED` 签章？（旧格式视为已签章）
3. 如任一条件不满足 → **拒绝执行**，输出提示让 USER 先完成 SPM 流程

---

## 上下文协议（Bootstrap）

1. 读 `.agents/project.yaml` — 获取所有文档路径（**必须最先读取**）
2. 读 `${paths.master_arch}`（索引）— 理解全局架构和约束
3. 读 `${paths.arch_gamestate}` — 理解数据拓扑（必读）
4. 读 `${paths.arch_pipeline}` — 理解 Pipeline 架构（必读）
5. 读 `${paths.tech_debt}` — 检查技术债务（必读）
6. 读 `${paths.handoff}` — 理解当前断点和上下文（必读）
7. 读 `${paths.pipeline_dir}/phaseX/spm-analysis.md` — 理解 SPM 分析决策（必读）
8. 按需读 `${paths.arch_dependencies}`、`${paths.arch_schema}`
9. 读已签章的 PRD.md — 理解本次需求的规则和数值
10. 读 `AGENTS.md` 模块边界、Pipeline 挂载协议、文档模块化规则

> **路径解析**：`${paths.xxx}` 指 `.agents/project.yaml` 中 `paths:` 段对应的值。

---

## Step 1：全局对齐 + Invariant 验证

- 对照 `${paths.arch_layers}` 分层架构，确认新系统属于哪一层
- 对照 `${paths.arch_gamestate}` 数据拓扑，确认新字段的 Owner
- 验证 PRD 中的 Invariant 是否与现有架构冲突
- 产出：全局对齐检查表

---

## Step 2：Interface 设计 + 数据变更 + 迁移策略

- 设计新增/修改的 TypeScript `interface`
- 设计数据结构新字段（含默认值）
- 设计默认状态创建函数更新方案
- 设计迁移函数策略
- 遵循 MASTER-ARCHITECTURE 新系统接入规范
- 产出：Interface 草案 + 迁移策略

---

## Step 3：Pipeline 挂载规划 + 依赖矩阵更新 + 回归影响评估

- 确定新系统挂载到 Pipeline 的哪个阶段（参考 `${paths.arch_pipeline}`）
- 更新依赖矩阵（参考 `${paths.arch_dependencies}`）
- 评估对现有系统的影响范围
- 产出：Pipeline 挂载方案 + 依赖变更 + 回归清单

---

## Step 4：ADR 决策日志

- 对重要架构决策，使用 `_shared/templates/adr-template.md` 格式记录
- 备选方案对比 → 决策 → 理由 → 后果
- 产出：ADR 记录（追加到 TDD.md 末尾）

---

## Step 5：关联性影响审计（硬约束，FB-019 教训）

> **背景**：Phase I-alpha Gate 2 中 TDD v1.0 遗漏 4 项关联变更（修改文件 8→11），
> 由用户人工审查发现。根因：缺少强制性的代码引用追踪步骤。
> 此步骤在 Step 4 完成后、Party Review 之前**必须执行**。

### 5.1 类型扩展引用追踪

当 TDD 新增联合类型成员（如 `SoulEventType`）或扩展 `interface` 时：

1. **Grep 全量类型引用**：对每个被扩展的类型 T，执行 `grep "Record<T"` + `grep ": T[]"` + `grep ": T ="` 搜索全部 `src/` 和 `server/`
2. **逐个判定**：每个引用点是 `Record<T, ...>`（全量）还是 `Partial<Record<T, ...>>`：
   - **全量 Record**：新增成员后若不补条目 → **tsc 编译错误** → 必须列入修改文件
   - **Partial Record**：不补也不报错，但应评估是否需要补
3. **产出**：类型引用追踪表（追加到 TDD 文件变更汇总前）

```markdown
### 类型扩展引用追踪

| 扩展类型 | 引用文件 | 引用形式 | 是否全量 | 需修改 |
|---------|---------|---------|:-------:|:-----:|
| SoulEventType | emotion-pool.ts L23 | Record<SoulEventType, ...> | ✅ 全量 | ✅ |
| SoulEventType | emotion-pool.ts L189 | Record<SoulEventType, string> | ✅ 全量 | ✅ |
| SoulEventType | soul-prompt-builder.ts L248 | Record<SoulEventType, string> | ✅ 全量 | ✅ |
```

### 5.2 函数签名变更影响面扫描

当 TDD 修改现有函数签名（新增/删除/改类型参数）时：

1. **Grep 所有调用处**：对每个签名变更的函数 F，执行 `grep "F("` 搜索全部 `src/` 和 `scripts/`
2. **逐个判定**：每个调用处是否需要适配新签名
3. **特别注意**：
   - 可选参数 `?` 新增：现有调用不报错但可能需要传值才能激活新功能
   - 必选参数新增：所有调用处必须修改
   - 参数类型变更：检查传入值是否兼容
4. **产出**：签名变更影响表

```markdown
### 函数签名变更影响

| 函数 | 变更 | 调用处 | 需适配 |
|------|------|--------|:-----:|
| updateRelationshipTags | +RM? 可选参数 | soul-engine.ts L383 | ✅ 需传 RM |
| updateRelationshipTags | +RM? 可选参数 | ai-result-apply.handler.ts L59 | ✅ 需传 RM |
| updateRelationshipTags | +RM? 可选参数 | verify-phaseE.ts L165 | ⚠️ 测试脚本，传 undefined 可接受 |
```

### 5.3 PRD 副效果→TDD 执行位置映射

当 PRD 描述了"副效果"（如资源扣除、状态赋予）时：

1. 逐条列出 PRD 中所有副效果描述
2. 确认 TDD 中每条副效果有**明确的执行位置**（哪个文件、哪个函数、哪个阶段）
3. 无执行位置的副效果 → 必须补充

### 5.4 Handler 联动检查

当新系统依赖其他 Handler 产出的数据（如"最近突破记录"）时：

1. 确认数据源 Handler 是否需要修改（追加 record/notify 调用）
2. 确认 Pipeline 时序是否满足（数据写入阶段 < 数据消费阶段）
3. 将联动修改的 Handler 列入修改文件清单

### 5.5 测试脚本影响审计

当 TDD 涉及公式文件（`src/shared/formulas/`）或核心逻辑文件时：

1. 列出 TDD 修改/新增的所有公式/逻辑文件
2. Grep `scripts/verify-*.ts` 和 `scripts/regression-*.ts` 中对这些文件的 import
3. 被引用的脚本 → 评估是否需要更新断言或新增 case
4. **产出**：测试脚本影响表

```markdown
| 公式/逻辑文件 | 引用脚本 | 需更新 | 说明 |
|-------------|---------|:-----:|------|
```

> 零代码 Phase → 标注"N/A — 零代码变更"。

### 5.6 文档一致性审计

检查 TDD 的修改清单是否已包含必要的文档更新：

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 新增代码文件 → `docs/INDEX.md` 更新计划？ | ✅/❌/N/A |
| 2 | 新增 GameState 字段 → `arch/gamestate.md` 更新计划？ | ✅/❌/N/A |
| 3 | 新增 Pipeline Handler → `arch/pipeline.md` 更新计划？ | ✅/❌/N/A |
| 4 | 新增依赖 → `arch/dependencies.md` 更新计划？ | ✅/❌/N/A |
| 5 | 新增资源/公式 → `prd/economy.md` 或 `prd/formulas.md` 更新计划？ | ✅/❌/N/A |

❌ 项 → 必须补充到 TDD 修改文件清单。

### 5.7 回归测试范围确定

根据 TDD 的修改文件清单，确定必须运行的测试套件：

| 条件 | 必须运行 |
|------|---------|
| 修改 Pipeline / Handler / GameState | `npm run test:regression`（regression-all.ts） |
| 修改对应 Phase 的公式或逻辑 | `npx tsx scripts/verify-phaseX.ts` |
| 修改 UI 格式化 | `npx tsx scripts/verify-ui-formatter.ts` |
| 修改 AI 后端 | `npm run test:ai-stress` |
| 零代码变更（纯文档） | 无需运行（标注"零代码 Phase"） |

**产出**：回归测试执行清单（SGE 在编码完成后执行）。

### 5.8 存档迁移链完整性

| 检查项 | 结果 |
|--------|------|
| TDD 是否新增 GameState 持久化字段？ | 是 / 否 |
| 如是：migrateVxToVy 已规划？ | ✅/❌ |
| 如是：schema.md 更新已列入？ | ✅/❌ |
| 如否：标注"零迁移" | — |

### 5.9 产出与校验

完成 5.1-5.8 后，**重新核对 TDD 文件变更汇总表**：
- 新发现的文件必须加入修改清单
- 比对前后文件数量差异（如有变化须在 TDD 变更日志中注明）

---

## Party Review Gate

### 角色配置

| 类型 | 角色 | 维度数 |
|------|------|:-----:|
| **必选** | R4 项目经理 | 5 |
| **必选** | R5 偏执架构师 | 5 |
| **必选** | R6 找茬QA | 5 |

### 角色适配规则

| Phase 类型 | 判定条件 | 调整 |
|-----------|---------|------|
| 纯前端 / 零 Pipeline | TDD 不涉及 Pipeline 挂载或 GameState 字段 | R5 聚焦 D1 耦合 + D5 命名，跳过 D3/D4 |
| 纯后端 / 零 UI | TDD 不涉及 UI 组件 | R6 聚焦 D1/D2/D3，跳过 D4/D5 |
| 全栈 | 同时涉及前后端 | 全部保留 |

> 跳过的维度标记：`> D? [维度名]：本 Phase 不适用，跳过。`

### "挑刺者"模式说明

SGA 的 Review 角色均为"挑刺者"——专注于发现架构缺陷而非业务缺陷。
业务层面的审查已在 SPM GATE 1 完成。

### 执行流程

调用 `@doc-reviewer` 在独立上下文中执行审查。

**上下文交付**（参照 `review-protocol.md §0 Gate 2` 清单）：

```
@doc-reviewer 审查 Phase [X] Gate 2。

上下文交付：
  1. 审查协议: .agents/skills/_shared/review-protocol.md
  2. 角色定义: [列出本次激活的 .agents/skills/_shared/personas/*.md 文件]
  3. TDD: ${paths.specs_dir}/[name]-TDD.md
  4. PRD（已签章）: ${paths.features_dir}/[name]-PRD.md
  5. 架构索引: ${paths.master_arch}
  6. Pipeline + 依赖: ${paths.arch_pipeline} + ${paths.arch_dependencies}
  7. Gate 1 review: ${paths.pipeline_dir}/phaseX/review-g1.md

角色配置:
  必选: R4(项目经理) R5(偏执架构师) R6(找茬QA)
  适配: [参照上方角色适配规则表]

⚠️ 调用前检查：上述所有文件必须存在。缺失 → 停止，向 USER 报告。
```

> doc-reviewer 在独立上下文中加载审查协议和角色定义，
> 执行四层防线（L1→L2→L3）+ Devil's Advocate。
> 审查报告由父 agent 写入 `${paths.pipeline_dir}/phaseX/review-g2.md`。

---

## GATE 2 签章

### 评审循环协议

1. 执行 Party Review（调用 `@doc-reviewer`），记为第 1 轮
2. 如果结果包含 🔴 BLOCK：
   a. 向 USER 呈现所有 BLOCK 项 + WARN 项
   b. 逐条修复 BLOCK 项（修改 TDD / ADR）

   > ⚠️ **禁止自审（硬约束）**
   > 修复后的重新审查**必须**再次调用 `@doc-reviewer` 执行完整四层防线。
   > 禁止在同一轮报告中标记"已修复"并自行将 BLOCK 改判为 PASS/CONDITIONAL PASS。
   > **原则**：修复是作者行为，审查是独立评审行为，二者不可合并。
   >
   > **文件命名硬约束**：第 N+1 轮审查必须产出新文件 `review-gX-v(N+1).md`。
   > 写入前检查：上一版文件（如 `review-g2.md`）必须已存在。
   > 如目标文件不符合递增序列 → 停止，修正命名后再写入。

   c. 重新执行 Party Review（完整四层防线，不可跳过已修复项），记为第 N+1 轮
   d. 重复 2a-2c 直到 0 BLOCK
3. 如果结果为 CONDITIONAL PASS（有 WARN 无 BLOCK）：
   a. 向 USER 呈现所有 WARN 项
   b. USER 确认接受 / 要求修复
   c. 接受的 WARN 记入 `${paths.tech_debt}` 技术债务
4. **评审次数上限 = 3 轮**。第 3 轮仍有 BLOCK → 停止循环，向 USER 报告累计未解决项，由 USER 决定：
   - 接受风险继续（记入技术债务 + 风险标注）
   - 回退到 SPM 重做（需求可能不充分）
   - 拆分 Phase（将复杂设计拆成更小的交付单元）
5. 评审报告版本号递增：`review-g2.md` → `review-g2-v2.md` → `review-g2-v3.md`

### 签章清单

```markdown
## SGA Signoff

- [ ] Interface 设计完整（所有新字段有 Owner）
- [ ] 迁移策略完整（迁移函数已规划）
- [ ] Pipeline 挂载方案确认
- [ ] 依赖矩阵已更新
- [ ] **Step 5 关联性审计已执行**（类型引用追踪 + 签名影响面 + 副效果映射 + Handler 联动 + 测试脚本 + 文档一致性 + 回归范围 + 迁移链）
- [ ] **评审文件完整性**：如第 1 轮有 BLOCK，则 `review-g2-v2.md`（或更高版本）必须存在
- [ ] Party Review 无 BLOCK 项（或 USER 已确认接受风险）
- [ ] 技术债务已登记（Review WARN 项 → `${paths.tech_debt}`）

签章：`[x] GATE 2 PASSED` — [日期]
```

> **下游触发**：GATE 2 签章通过后，SGE 可接手执行编码实施。

---

## 产出物归档表

| 产出物 | 保存路径 |
|--------|---------|
| TDD | `${paths.specs_dir}/[name]-TDD.md` |
| ADR | 追加到 TDD.md 末尾 |
| Party Review 报告 | `${paths.pipeline_dir}/phaseX/review.md`（独立存储） |
| 技术债务变更 | 更新 `${paths.tech_debt}` |
| **实施计划** | `${paths.pipeline_dir}/phaseX/plan.md` |

---

## 引用共享模块

- `_shared/review-protocol.md` — Party Review 四层防线
- `_shared/cove-protocol.md` — CoVe 证据验证
- `_shared/communication-rules.md` — 沟通纪律
- `_shared/anti-rationalization.md` — 反合理化（查看 SGA 专属部分）
- `_shared/change-management.md` — 变更管理协议
- `_shared/templates/adr-template.md` — ADR 模板
- `_shared/personas/project-manager.md` — R4
- `_shared/personas/paranoid-architect.md` — R5
- `_shared/personas/adversarial-qa.md` — R6
