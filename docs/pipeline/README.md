# Trinity Pipeline 过程资产

> **用途**：存储每个 Phase 在 Trinity Pipeline（SPM → SGA → SGE）执行过程中产生的工作文档。
> **定位**：这些是 **不可丢弃的项目资产**，记录了每次需求从构想到交付的完整决策链。
> **维护者**：所有 Trinity Skill（/SPM, /SGA, /SGE）

---

## 目录结构

```
docs/pipeline/
├── README.md                     ← 本文件（规范说明）
├── phaseA/                       ← Phase A 过程资产
│   ├── spm-analysis.md           ← SPM 分析（第一性原理 + 价值锚定 + 决策记录）
│   ├── plan.md                   ← 实施路线图
│   ├── task.md                   ← SGE 执行追踪（living document）
│   ├── review.md                 ← Party Review 报告（独立存储）
│   └── walkthrough.md            ← 完成总结（变更清单 + 验证结果）
├── phaseB-alpha/
│   └── ...
└── phaseE/
    └── ...
```

---

## 文件命名规范

### Phase 目录命名

| 格式 | 示例 |
|------|------|
| `phase{大写字母}` | `phaseA`, `phaseB`, `phaseC` |
| 子阶段用连字符 | `phaseB-alpha`, `phaseB-beta` |

### 文件命名（固定，不可自定义）

| 文件 | 生产者 | 生命周期 | 说明 |
|------|--------|---------|------|
| `spm-analysis.md` | /SPM | Phase 启动时创建 | 第一性原理分析、5-Why、Invariant、决策记录、PoC 计划 |
| `plan.md` | /SGA | GATE 1 后创建 | **实施路线图**：实施顺序、时间估算、风险清单、Story 拆解执行计划。不重复 TDD 的 interface 设计和 ADR（那些在 `design/specs/phaseX-TDD.md` 中）。 |
| `task.md` | /SGE | GATE 2 后创建 | 执行进度追踪（`[ ]`/`[/]`/`[x]` 清单） |
| `review.md` | /SPM, /SGA, /SGE | 各 Gate Review 后创建 | Party Review 报告（独立存储，不再追加到 PRD/TDD 末尾） |
| `walkthrough.md` | /SGE | GATE 3 后创建 | 变更总结、截图/录屏、验证结果、经验教训 |

---

## 与正式交付物的关系

```
Pipeline 过程资产（过程记录）    ←→    正式交付物（产品规格）
─────────────────────────────       ─────────────────────────
docs/pipeline/phaseX/               docs/features/phaseX-PRD.md
  spm-analysis.md                   docs/design/specs/phaseX-TDD.md
  plan.md                           docs/design/specs/phaseX-user-stories.md
  task.md                           docs/verification/phaseX-verification.md
  review.md
  walkthrough.md
```

> **关键区分**：
> - `docs/features/` + `docs/design/specs/` = **正式交付物**（PRD、TDD、User Stories）
> - `docs/pipeline/` = **过程资产**（分析、计划、执行追踪、Review、总结）
> - 两者互补，不替代

---

## 全局文件互补

| 全局文件 | 定位 | 更新频率 |
|---------|------|---------|
| `docs/project/handoff.md` | 当前断点 + 接手指南 | 每次会话结束 |
| `docs/project/task-tracker.md` | Phase 级进度仪表盘 | Phase 变更时 |

> pipeline/phaseX/ 是 per-phase 细节，handoff + task-tracker 是跨 Phase 全局视图。

---

## 写入规则

1. **创建时机**：每个文件在对应 Skill 启动时自动创建（如 SPM 启动时创建 `spm-analysis.md`）
2. **更新策略**：`task.md` 为 living document，SGE 执行过程中持续更新
3. **Review 追加**：`review.md` 在每个 Gate Review 后追加新的 Review 报告
4. **只增不删**：已创建的过程资产禁止删除，可追加内容
5. **跨会话继承**：新会话应读取当前 Phase 的 pipeline 文件以恢复上下文
6. **Git 管理**：所有 pipeline 文件纳入版本控制（非 .gitignore）

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-28 | 初始创建，建立 Pipeline 过程资产规范 |
| 2026-03-28 | Review 修正：新增 review.md；plan.md 定义明确化；新增全局文件互补说明 |
