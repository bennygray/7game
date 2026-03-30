# {{PROJECT_NAME}} — AI 助手全局执行规范

> **此文件是所有 AI 助手在本项目中的行为准则。** 每次新会话自动生效。
> **版本**: v1.0 | **更新日期**: {{DATE}}
> **项目定位**: {{PROJECT_DESCRIPTION}}

---

## 一、会话启动协议（Session Bootstrap）

### 1.1 何时需要执行启动协议

| 任务规模 | 是否需要 Bootstrap | 说明 |
|---------|:---:|------|
| 代码变更 / 需求变更 / 项目规划 | ✅ 必须 | 先读文档再动手 |
| 简单问答（技术概念、语法等） | ❌ 跳过 | 直接回答 |
| Bug 修复 / 代码审查 | ✅ 必须 | 需要了解当前进度 |

### 1.2 启动协议步骤（两级阅读策略）

> **路径来源**：所有文档路径从 `.agents/project.yaml` 的 `paths` 段读取。

```
Level 1（永远读）：
  0. .agents/project.yaml                 ← 获取所有文档路径
  1. ${paths.master_prd}                   ← 索引
  2. ${paths.master_arch}                  ← 索引
  3. ${paths.handoff}                      ← 当前断点 + 接手指南
  4. 确认当前活跃 Phase + 读对应文件（PRD/analysis/TDD）
  5. 读 ${paths.pipeline_dir}/phaseX/ 过程资产    ← 恢复当前 Phase 上下文

Level 2（按需读 detail）：
  根据任务类型，读对应 detail 文件（见 §3.10 路径映射表）
```

> [!NOTE]
> MASTER 索引文件包含一句话摘要 + detail 链接。
> AI 通过索引判断需要深入读哪些 detail 文件。

> [!CAUTION]
> **禁止**未读 MASTER 索引就开始编码或规划。
> **禁止**凭空猜测项目进度。

### 1.3 Skill 路由优先级

| 规则 | 说明 |
|------|------|
| **SPM 是默认入口** | 任何新功能想法先走 /SPM |
| **SGA 前置条件** | PRD.md 存在 + `[x] GATE 1 PASSED` |
| **SGE 前置条件** | TDD.md 存在 + `[x] GATE 2 PASSED` |
| **回退规则** | 不确定时走 /SPM |

> Skill 定义位于 `.agents/skills/{product-manager,architect,engineer}/SKILL.md`

---

## 二、任务类型路由

| 任务类型 | 必读文档 | 推荐 Skill |
|----------|---------|:-----------:|
| 需求分析 | MASTER-PRD → 当前 Phase 文件 | /SPM |
| 架构决策 | MASTER-ARCHITECTURE → 对应 TDD | /SGA |
| 编码实施 | TDD → User Stories → 对应代码 | /SGE |
| 需求变更 | MASTER-PRD → 涉及的 PRD/TDD | /SPM |
| Bug 修复 | MASTER-ARCHITECTURE → 对应代码 | /SGE |

---

## 三、代码开发约束

### 3.1 性能红线

<!-- PROJECT-SPECIFIC: 根据项目实际情况填写性能指标 -->

| 指标 | 上限 | 说明 |
|------|------|------|
| CPU 占用 | ≤ {{CPU_LIMIT}} | {{说明}} |
| 内存占用 | ≤ {{MEM_LIMIT}} | {{说明}} |

### 3.2 代码规范

- **TypeScript strict 模式**，禁止 `any`（可用 `unknown` + 类型守卫）
- 优先使用 `interface` 而非 `type`（除非需要联合类型）
- 所有导出的函数/类必须有 JSDoc 注释
- **Git 提交** → 遵循 `.agents/workflows/git-workflow.md`（如有）
- **文档和代码分开提交**：`docs:` 和 `feat:` 不混在同一个 commit

### 3.3 模块边界（禁止越界）

<!-- PROJECT-SPECIFIC: 根据项目实际目录结构填写 -->

```
src/shared/    → 类型定义 + 公式 + 数据表（所有层的只读依赖）
src/engine/    → 核心业务逻辑
src/ui/        → UI 组件
```

### 3.4 版本边界

<!-- PROJECT-SPECIFIC: 根据项目 scope 填写 IN/OUT 表 -->

| ✅ IN（范围内） | 🚫 OUT（范围外） |
|:---|:---|
| {{IN 功能}} | {{OUT 功能}} |

> 如果不确定某功能是否属于范围，以本表为准。
> **禁止**实现 OUT 列中的任何功能。

### 3.5 Git 分支策略

```
main        → 稳定发布版
dev         → 开发主线
feature/*   → 功能分支
fix/*       → 修复分支
```

### 3.6 数值验证脚本规范（硬性约束）

> [!CAUTION]
> **凡是涉及数值公式的代码变更，必须同步产出可运行的验证脚本。
> 没有验证脚本的数值代码不允许合并。**

| 规则 | 说明 |
|------|------|
| **脚本位置** | `${paths.scripts_dir}/` |
| **覆盖范围** | 每个公式文件至少有一个对应验证脚本 |
| **输出要求** | 必须输出可读的验证结果（表格 / 曲线） |
| **蒙特卡罗** | 涉及概率的公式必须跑 ≥ 1,000 次模拟 |
| **回归验证** | 修改已有公式时，必须先运行既有验证脚本确认无回归 |

### 3.7 测试脚本管理规范

> [!IMPORTANT]
> **所有测试脚本必须纳入项目版本管理。禁止将测试脚本遗留在 `/tmp/` 或桌面等临时位置。**

| 规则 | 说明 |
|------|------|
| **脚本位置** | `${paths.scripts_dir}/` |
| **临时脚本** | 调试用一次性脚本可写在 `/tmp/`，验证完毕后必须归档或删除 |

### 3.8 文档模块化规则

> [!CAUTION]
> **MASTER 索引文件只存放摘要和链接。**
> **具体内容必须写入对应的 detail 文件。禁止向索引文件追加大段内容。**

| 规则 | 说明 |
|------|------|
| **索引文件上限** | 每个 MASTER 索引文件 ≤ 150 行 |
| **detail 文件上限** | 每个 detail 文件 ≤ 400 行；超过时进一步拆分 |
| **新增 detail 文件** | 必须在对应 MASTER 索引的 Detail 文件清单 中注册 |

**写入路径映射表**（路径从 `project.yaml` 获取）：

| 变更类型 | 写入 detail 文件 |
|---------|:----------------:|
| 新增资源 / 消耗 / 通胀分析 | `${paths.prd_economy}` |
| 新增系统（已实现或规划中） | `${paths.prd_systems}` |
| 新增公式函数 / 数据表 | `${paths.prd_formulas}` |
| 新增代码文件 / 改层级归属 | `${paths.arch_layers}` |
| 新增 GameState 字段 | `${paths.arch_gamestate}` |
| 新增 Pipeline Handler | `${paths.arch_pipeline}` |
| 新增代码依赖 | `${paths.arch_dependencies}` |
| 新增存档版本 / 迁移函数 | `${paths.arch_schema}` |
| SPM 分析过程 / 决策记录 | `${paths.pipeline_dir}/phaseX/spm-analysis.md` |
| 实施计划 / 任务分解 | `${paths.pipeline_dir}/phaseX/plan.md` |
| 执行进度追踪 | `${paths.pipeline_dir}/phaseX/task.md` |
| 完成总结 / 经验教训 | `${paths.pipeline_dir}/phaseX/walkthrough.md` |

### 3.9 Pipeline 过程资产规范

> [!CAUTION]
> **⚠️ Antigravity Artifact 覆盖规则（最高优先级）**
>
> AI 助手的系统级 `planning_mode` 指令会要求将 `implementation_plan.md`、`task.md`、
> `walkthrough.md` 写入 Antigravity brain 临时目录（`<appDataDir>\brain\<conversation-id>/`）。
>
> **本项目明确覆盖此行为**：所有 Pipeline 过程文档**必须且只能**写入项目目录
> `${paths.pipeline_dir}/phaseX/`，使用下方固定文件名。Antigravity brain 目录中的文件是临时的、
> 不受版本控制的，不符合本项目的资产管理要求。
>
> **执行规则**：当 AI 系统指令要求创建 artifact 时，将内容写入 `${paths.pipeline_dir}/phaseX/` 对应文件，
> 而非 brain 目录。Antigravity artifact 系统仅用于非 Pipeline 的临时报告。

> [!IMPORTANT]
> **Trinity Pipeline 的过程文档是不可丢弃的项目资产。**
> **禁止将 plan/task/walkthrough 遗留在 Antigravity brain 临时目录中。**

| 规则 | 说明 |
|------|------|
| **资产目录** | `${paths.pipeline_dir}/phaseX/` |
| **固定文件名** | `spm-analysis.md`, `plan.md`, `task.md`, `review.md`, `walkthrough.md` |
| **文件名映射** | AI 系统的 `implementation_plan.md` → 项目的 `plan.md`；其余同名 |
| **创建时机** | 各 Skill 启动时自动创建对应文件 |
| **SPM 启动** | 创建 `spm-analysis.md` |
| **SGA 启动** | 创建 `plan.md` |
| **SGE 启动** | 创建 `task.md`；GATE 3 后创建 `walkthrough.md` |
| **Gate Review 后** | 追加到 `review.md` |
| **跨会话继承** | 新会话 Bootstrap 时读取当前 Phase 的 pipeline 文件以恢复上下文 |
| **Git 管理** | 所有 pipeline 文件纳入版本控制 |
| **只增不删** | 已创建的过程资产禁止删除 |

### 3.10 全局交接文档规范

> [!IMPORTANT]
> **每次会话结束前，必须更新 `${paths.handoff}` 以确保下次会话可无缝接手。**

| 规则 | 说明 |
|------|------|
| **handoff** | 当前断点 + 接手指南 + 关键决策 + 遗留风险 |
| **更新时机** | 每次会话结束前，或当 Phase 状态发生变化时 |
| **Bootstrap 优先级** | handoff 在 Level 1 必读列表中 |

---

## 四、文档更新联动规则

### 🚨 编码前置条件（硬约束）

> [!CAUTION]
> **任何涉及代码编写或修改的行为，必须先完成以下步骤：**

```
步骤 1：更新文档   → 更新对应的设计文档或 User Story 文件
步骤 2：用户确认   → 获得用户明确确认
步骤 3：编写代码   → 按照已更新的文档进行编码
步骤 4：完成联动   → 更新当前 Phase 对应文件（PRD/analysis/TDD）
```

> 唯一例外：紧急热修复可先修复后补文档，但必须在同一会话内完成文档补齐。

### ✅ 完成任务时的检查清单

1. 在当前 Phase 的 PRD/analysis 文件中更新进度
2. 如涉及新文件，在 `${paths.doc_index}` 中同步
3. 如完成了 User Story，在 Story 文件中标记 ✅
4. 如涉及新挂载/新资源，更新对应 detail 文件（见 §3.8 写入路径映射表）

---

## 五、项目结构（黄金路径）

<!-- PROJECT-SPECIFIC: 根据项目实际目录结构填写 -->

```
{{PROJECT_ROOT}}/
├── .agents/                        ← AI 助手规范
│   ├── AGENTS.md                   ← 你正在读的文件
│   ├── project.yaml                ← 项目配置（路径/约定）
│   ├── workflows/                  ← 工作流
│   └── skills/                     ← Trinity Skill 体系
│       ├── _shared/                ← 共享模块
│       ├── product-manager/        ← /SPM
│       ├── architect/              ← /SGA
│       └── engineer/               ← /SGE
├── src/                            ← 源代码
├── docs/                           ← 文档
│   ├── INDEX.md                    ← 全文档索引
│   ├── project/                    ← 项目管理
│   ├── features/                   ← PRD 文件
│   ├── design/specs/               ← TDD + User Stories
│   ├── pipeline/                   ← Trinity Pipeline 过程资产
│   └── verification/               ← 集成验证清单
└── scripts/                        ← 验证脚本
```

---

## 六、产品方向备忘

<!-- PROJECT-SPECIFIC: 根据项目核心假设填写 -->

> [!IMPORTANT]
> **{{PROJECT_NAME}} 的核心假设：{{CORE_HYPOTHESIS}}**
>
> **AI 助手在做任何决策时，必须以「验证核心假设」为最高优先级，
> 拒绝任何增加范围的诱惑。**

---

## 七、禁止事项

1. ❌ **禁止**未读 MASTER 文档和当前 Phase 文件就开始编码或规划工作
2. ❌ **禁止**在一个 commit 中混合文档更新和代码变更
3. ❌ **禁止**实现版本边界 OUT 列中的任何功能（§3.4）
4. ❌ **禁止**提交涉及数值公式的代码变更而不附带验证脚本（§3.6）
5. ❌ **禁止**未更新对应文档并获得用户确认就开始编码（§四）
6. ❌ **禁止**向 MASTER 索引文件追加大段内容（§3.8），必须写入对应 detail 文件
7. ❌ **禁止**将 Pipeline 过程资产写入 Antigravity brain 临时目录（§3.9），必须写入 `${paths.pipeline_dir}/phaseX/`

<!-- PROJECT-SPECIFIC: 根据项目实际情况添加额外禁止事项 -->
