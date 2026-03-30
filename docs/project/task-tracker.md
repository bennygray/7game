# 7game-lite — 全局进度追踪

> **最后更新**：2026-03-30

---

## Phase 状态总览

| Phase | 版本 | 主题 | SPM | SGA | SGE | 状态 |
|-------|------|------|:---:|:---:|:---:|:----:|
| A | v0.1 | 核心循环（修炼+弟子+MUD） | ✅ | ✅ | ✅ | 🟢 完成 |
| B-α | v0.2 | 灵田+炼丹 | ✅ | ✅ | ✅ | 🟢 完成 |
| C | v0.3 | 突破+灵脉+丹药使用 | ✅ | ✅ | ✅ | 🟢 完成 |
| D | v0.4 | AI对话+日志+Intent重构 | ✅ | ✅ | ✅ | 🟢 完成 |
| E | v0.5 | NPC灵魂（道德×特性×关系） | ✅ | ✅ | ✅ | 🟢 完成 |
| — | — | 世界线推演（探索性脑暴） | ✅ | — | — | 🟢 定案 |
| — | — | Roadmap V3.1 审阅修复 + 文档对齐 | ✅ | — | — | 🟢 完成 |
| F | v0.8 | 灵魂闭环（特性×情绪×关系→行为权重） | ✅ | ✅ | ✅ | 🟢 完成 |
| F0-α | v0.6 | 碰面世界（地点·碰面·道风） | ✅ | ✅ | ✅ | 🟢 完成 |
| F0-β | v0.6 | 活世界（事件池·漏斗·Storyteller） | ✅ | ✅ | ✅ | 🟢 完成 |
| H-α | v0.2 | MUD世界呈现（look/分级日志/sticky状态栏/环境呼吸） | ✅ | ✅ | ✅ | 🟢 完成 |
| G | v0.4.2 | AI觉醒（async缓冲/情绪接入/独白/双阶段决策/反派修复） | ✅ | ✅ | ✅ | 🟢 完成 |

---

## 当前 Phase 详情

**Phase G 已完成** — AI 觉醒

- SPM GATE 1 ✅ → SGA GATE 2 ✅ → SGE GATE 3 ✅
- 25/26 AC 通过（1 AC P95 需实游验证）
- **下一步**：待用户确认后进入下一 Phase

---

## 累计统计

| 指标 | 数值 |
|------|------|
| 已实现系统 | 19 个（修炼、弟子×8、MUD、灵田、炼丹、突破、灵脉、丹药消费、AI对话、结构化日志、Intent、Tick Pipeline、灵魂事件总线、灵魂评估引擎、碰面引擎、世界事件系统、Storyteller、MUD世界呈现、AI觉醒系统） |
| 回归测试 | 64 组全通过 |
| 专项验证 | Phase E 47 + Phase F 12 + Phase F0-α 52 + Phase F0-β 108 = **219 条** |
| 技术债务 | TD-001~TD-014（2 个已清偿：TD-001 Pipeline 重构、TD-003 Intent；TD-006 部分清偿） |
| 需求债务 | FB-001~FB-015（2 个已清偿：FB-001 弟子对话、FB-004 关系系统；FB-010/FB-012 部分清偿） |
| GameState 版本 | v5（Phase G 零存档迁移） |
| Tick Handler 数量 | 13 个 |
| 弟子数量 | 8 人（4 初始 + 4 Phase D 新增） |
| AI 模型 | Qwen3.5-0.8B（llama-server 子进程，GPU -ngl 99） |
| 世界线推演文档 | 9 份（soul-vision-rethinking/01~09） |
| 宪法文档版本 | MASTER-PRD v2.0 / Roadmap V3.3 / MASTER-ARCHITECTURE v1.4 |

---

## Phase 文档索引

| Phase | PRD/Analysis | TDD | User Stories | Verification | Pipeline |
|-------|:----------:|:---:|:-----------:|:----------:|:--------:|
| A | [analysis](../features/7game-lite-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseA.md) | [verify](../verification/7game-lite-phaseA-verification.md) | — |
| B-α | [analysis](../features/7game-lite-phaseB-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseB-alpha.md) | — | [plan](../pipeline/phaseB-alpha/plan.md) |
| C | [analysis](../features/7game-lite-phaseC-analysis.md) | — | [stories](../design/specs/7game-lite-user-stories-phaseC.md) | [verify](../verification/7game-lite-phaseC-verification.md) | [plan](../pipeline/phaseC/plan.md) |
| D | [PRD](../features/phaseD-PRD.md) | [TDD](../design/specs/phaseD-TDD.md) | [stories](../design/specs/7game-lite-user-stories-phaseD.md) | — | — |
| E | [PRD](../features/phaseE-PRD.md) | [TDD](../design/specs/phaseE-TDD.md) | [stories](../design/specs/7game-lite-user-stories-phaseE.md) | [poc-1 report](../verification/phaseE-poc1-soul-system-report.md) | [spm-analysis](../pipeline/phaseE/spm-analysis.md) |
| F | [spm-analysis](../pipeline/phaseF/spm-analysis.md) | — | — | — | [task](../pipeline/phaseF/task.md) |
| F0-α | [spm-analysis](../pipeline/phaseF0-alpha/spm-analysis.md) | [TDD](../design/specs/phaseF0-alpha-TDD.md) | — | — | [task](../pipeline/phaseF0-alpha/task.md) |
| F0-β | [spm-analysis](../pipeline/phaseF0-beta/spm-analysis.md) | — | — | — | [task](../pipeline/phaseF0-beta/task.md) |
| H-α | [PRD](../features/phaseH-alpha-PRD.md) | [TDD](../design/specs/phaseH-alpha-TDD.md) | — | — | [task](../pipeline/phaseH-alpha/task.md) |
| G | [PRD](../features/phaseG-PRD.md) | [TDD](../design/specs/phaseG-TDD.md) | [stories](../design/specs/phaseG-user-stories.md) | — | [spm](../pipeline/phaseG/spm-analysis.md) [plan](../pipeline/phaseG/plan.md) [review](../pipeline/phaseG/review.md) [walk](../pipeline/phaseG/walkthrough.md) |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-28 | 初始创建，回填 Phase A-D 历史状态 |
| 2026-03-29 | Phase E 标记完成(✅)；新增世界线推演条目(定案)；新增 Phase F0 规划中；更新累计统计(v4/64测试/14系统/9份推演文档) |
| 2026-03-29 | **V3.1 审阅修复**：F0→F0-α/F0-β；新增文档对齐条目；需求债务更新(FB-001~015,2已清偿)；新增宪法文档版本跟踪 |
| 2026-03-30 | **文档同步修复**：Phase F/F0-α/F0-β 标记完成(✅)；累计统计更新(v5/17系统/12 handler/219专项)；文档索引补全 F/F0-α/F0-β |
| 2026-03-30 | **Phase H-α 完成**：look命令+分级日志+固定状态栏+环境呼吸；已实现系统 17→18；TD-015 新增；文档索引更新 |
| 2026-03-30 | **Phase G 完成**：AI觉醒（async缓冲+情绪接入+独白+双阶段决策+反派修复）；Handler 12→13；已实现系统 18→19；TD-006 部分清偿；FB-010/012 部分清偿；Roadmap V3.3 |
