# 7game-lite 文档索引

> 所有项目文档的统一入口。新增文档时必须在此注册。
> **最后更新**：2026-04-02 (Phase TG-3 Quick Orient + 全面注册)

## Quick Orient（30 秒定位）

> 项目：纯文字 MUD + AI 灵智弟子 + 活世界
> 当前状态：见 [handoff.md](project/handoff.md)
> 路径权威源：`.agents/project.yaml`

### 文档权责表

| 文档 | 唯一职责 | 不做什么 |
|------|---------|---------|
| `.agents/project.yaml` | 路径声明的唯一权威源 | 不存内容摘要 |
| `docs/INDEX.md`（本文件） | 全量文档注册 + 导航入口 | 不存产品/架构内容 |
| `MASTER-PRD.md` | 产品定位/经济/系统边界索引 | 不列文件清单 |
| `MASTER-ARCHITECTURE.md` | 架构分层/通信/接入规范索引 | 不列文件清单 |
| `CLAUDE.md` | Claude Code 适配层（引用 AGENTS.md） | 不重复定义规范 |
| `.agents/AGENTS.md` | AI 助手执行规范（完整主规范） | 不重复定义路径 |
| `handoff.md` | 会话断点 + 接手上下文 | 不做全局索引 |

### 按角色阅读路径

| 角色 | 阅读顺序 |
|------|---------|
| 新 AI 会话 | project.yaml → 本文件(Orient) → MASTER-PRD → MASTER-ARCH → handoff |
| /SPM | MASTER-PRD → 当前 Phase PRD → feature-backlog |
| /SGA | MASTER-ARCH → 当前 Phase TDD → arch/ detail 文件 |
| /SGE | TDD → User Stories → 对应代码 |
| Reviewer | review-protocol.md → §0 交付清单对应文件 |

---

## 全局文档（宪法层）

| 文件 | 用途 |
|------|------|
| `project/MASTER-PRD.md` | 全局产品需求索引 |
| `design/MASTER-ARCHITECTURE.md` | 全局架构索引 |

### PRD Detail 文件

| 文件 | 内容 |
|------|------|
| `project/prd/economy.md` | 资源总表 + 漏斗图 + 通胀分析 |
| `project/prd/systems.md` | 已实现 + 规划中系统清单 |
| `project/prd/formulas.md` | 公式函数 + 数据表索引 |
| `project/prd/traceability.md` | 需求追溯链（系统→Phase→PRD→验证脚本） |

### Architecture Detail 文件

| 文件 | 内容 |
|------|------|
| `design/arch/layers.md` | 四层架构 Mermaid + 文件清单 |
| `design/arch/gamestate.md` | GameState 拓扑 + 读写矩阵 |
| `design/arch/pipeline.md` | Tick 执行顺序 + Handler 架构 |
| `design/arch/dependencies.md` | 系统依赖矩阵 + 影响速查 |
| `design/arch/schema.md` | 存档版本链 + 迁移策略 |
| `design/arch/cross-index.md` | 系统交叉索引（系统×Phase×文件×Handler×依赖） |

## 项目管理

| 文件 | 用途 |
|------|------|
| `project/handoff.md` | 会话交接文档（当前断点 + 接手指南 + 关键决策） |
| `project/SOUL-VISION-ROADMAP.md` | 灵魂远景路线图（V4.1） |
| `project/soul-vision-gap-analysis.md` | 六层灵魂循环 Gap 分析（V3.4） |
| `project/task-tracker.md` | 全局进度追踪（Phase 状态 + 累计统计） |
| `project/tech-debt.md` | 技术债务登记簿（架构妥协 + 清偿跟踪） |
| `project/feature-backlog.md` | 需求债务登记簿（降级/暂缓/裁剪需求） |
| `project/handoff-archive.md` | 会话交接历史归档（Phase E~TG-2 详情） |

## 世界线推演（Soul Vision Rethinking）

> 探索性设计文档，用于讨论世界事件系统、NPC 交互、宗门道风等远景设计。
> 结论已沉淀到 `SOUL-VISION-ROADMAP.md` 和 `soul-vision-gap-analysis.md`。

| 文件 | 内容 |
|------|------|
| `project/soul-vision-rethinking/01-market-research-and-gap-analysis.md` | 市场调研 + 初始 Gap 分析（历史，已沉淀到 ROADMAP） |
| `project/soul-vision-rethinking/02-architecture-and-model-constraints.md` | 架构约束 + 模型能力边界（历史，已沉淀到 ROADMAP） |
| `project/soul-vision-rethinking/03-hybrid-decision-architecture.md` | 混合决策架构推演（历史，已沉淀到 ROADMAP） |
| `project/soul-vision-rethinking/04-hybrid-decision-test-plan.md` | 混合决策测试计划（历史，已沉淀到 ROADMAP） |
| `project/soul-vision-rethinking/05-poc-2c-findings-and-conclusion.md` | PoC-2c~2e 验证结论（历史，已沉淀到 ROADMAP） |
| `project/soul-vision-rethinking/06-spm-world-director-exploration.md` | 世界线推演核心（MUD调研 + 四维决策 + 验证阻塞诊断） |
| `project/soul-vision-rethinking/07-spm-event-density-severity.md` | 五级事件漏斗 + Storyteller 节奏设计 |
| `project/soul-vision-rethinking/08-spm-ai-capacity-estimation.md` | T1/T2 NPC 双层架构 + AI 容量估算 |
| `project/soul-vision-rethinking/09-spm-sect-alignment.md` | 宗门道风(仁/霸)×门规(律/放)立场系统 |

## Trinity 分析进度（PRD）

| 文件 | 状态 | 覆盖系统 |
|------|------|---------|
| `features/7game-lite-analysis.md` | Phase A ✅ | 7game-lite 核心循环 |
| `features/7game-lite-phaseB-analysis.md` | Phase B-α ✅ | 灵田+炼丹核心 |
| `features/7game-lite-phaseC-analysis.md` | Phase C ✅ | 突破+灵脉+丹药使用 |
| `features/phaseD-PRD.md` | Phase D ✅ | AI对话+日志+Intent重构 |
| `features/phaseE-PRD.md` | Phase E ✅ | NPC灵魂系统（道德×特性×关系×AI事件评估） |
| `features/phaseF-PRD.md` | Phase F ✅ | 灵魂闭环（特性×情绪×关系→行为权重） |
| `features/phaseF0-alpha-PRD.md` | Phase F0-α ✅ | 碰面世界（地点·碰面·道风） |
| `features/phaseF0-beta-PRD.md` | Phase F0-β ✅ | 活世界（事件池·五级漏斗·Storyteller） |
| `features/phaseG-PRD.md` | Phase G ✅ | AI觉醒（async缓冲·情绪接入·独白·双阶段决策） |
| `features/phaseH-alpha-PRD.md` | Phase H-α ✅ | MUD世界呈现（look/分级日志/状态栏/环境呼吸） |
| `features/phaseH-beta-PRD.md` | Phase H-β ✅ | 世界缝合（统一日志管线/inspect/sect命令） |
| `features/phaseH-gamma-PRD.md` | Phase H-γ ✅ | 掌门裁决（STORM裁决窗口/judge命令/道风漂移） |
| `features/phaseX-alpha-PRD.md` | Phase X-α ✅ | 掌门视界（CSS+巨石拆分+布局+日志分区+命令历史） |
| `features/phaseX-beta-PRD.md` | Phase X-β ✅ | 命令增强（Tab补全+别名+图标+闪烁） |
| `features/phaseX-gamma-PRD.md` | Phase X-γ ✅ | 面板系统（浮层+可点击弟子+内存修复） |
| `features/phaseIJ-poc-PRD.md` | Phase IJ-PoC ✅ | 0.8B/2B 关系上下文利用验证 |
| `features/phaseIJ-PRD.md` | Phase IJ ✅ | NPC 深智预研（关系记忆·叙事·L2/L6） |
| `features/phaseJ-goal-PRD.md` | Phase J-Goal ✅ | 个人目标系统（GoalType·Layer 5·事件触发） |
| `features/phaseI-alpha-PRD.md` | Phase I-alpha ✅ | 因果引擎+高级关系标签 |
| `features/phaseTG-1-PRD.md` | Phase TG-1 ✅ | Trinity Pipeline 重审执行保障 |
| `features/phaseTG-2-PRD.md` | Phase TG-2 ✅ | 审查上下文交付+影响审计扩展+INDEX补全 |
| `features/phaseTG-3-PRD.md` | Phase TG-3 🔧 | 文档关系梳理+交叉索引+追溯链 |

## 设计文档

### User Stories

| 文件 | 用途 |
|------|------|
| `design/specs/7game-lite-user-stories-phaseA.md` | Phase A User Stories (5 条) |
| `design/specs/7game-lite-user-stories-phaseB-alpha.md` | Phase B-α User Stories (4 条) |
| `design/specs/7game-lite-user-stories-phaseC.md` | Phase C User Stories (5 条) |
| `design/specs/7game-lite-user-stories-phaseD.md` | Phase D User Stories (5 条) |
| `design/specs/7game-lite-user-stories-phaseE.md` | Phase E User Stories (5 条) |
| `design/specs/phaseF-user-stories.md` | Phase F User Stories |
| `design/specs/phaseF0-alpha-user-stories.md` | Phase F0-α User Stories |
| `design/specs/phaseF0-beta-user-stories.md` | Phase F0-β User Stories |
| `design/specs/phaseG-user-stories.md` | Phase G User Stories |
| `design/specs/phaseH-beta-user-stories.md` | Phase H-β User Stories |
| `design/specs/phaseH-gamma-user-stories.md` | Phase H-γ User Stories |
| `design/specs/phaseX-gamma-user-stories.md` | Phase X-γ User Stories |
| `design/specs/phaseI-alpha-user-stories.md` | Phase I-alpha User Stories |
| `design/specs/phaseJ-goal-user-stories.md` | Phase J-Goal User Stories |
| `design/specs/phaseTG-1-user-stories.md` | Phase TG-1 User Stories |
| `design/specs/phaseTG-2-user-stories.md` | Phase TG-2 User Stories |
| `design/specs/phaseTG-3-user-stories.md` | Phase TG-3 User Stories |

### 技术设计文档 (TDD)

| 文件 | 用途 |
|------|------|
| `design/specs/phaseD-TDD.md` | Phase D 技术设计文档 |
| `design/specs/phaseE-TDD.md` | Phase E 技术设计文档 |
| `design/specs/phaseF-TDD.md` | Phase F 技术设计文档 |
| `design/specs/phaseF0-alpha-TDD.md` | Phase F0-α 技术设计文档 |
| `design/specs/phaseF0-beta-TDD.md` | Phase F0-β 技术设计文档 |
| `design/specs/phaseG-TDD.md` | Phase G 技术设计文档 |
| `design/specs/phaseH-alpha-TDD.md` | Phase H-α 技术设计文档 |
| `design/specs/phaseH-beta-TDD.md` | Phase H-β 技术设计文档 |
| `design/specs/phaseH-gamma-TDD.md` | Phase H-γ 技术设计文档 |
| `design/specs/phaseX-alpha-TDD.md` | Phase X-α 技术设计文档 |
| `design/specs/phaseX-beta-TDD.md` | Phase X-β 技术设计文档 |
| `design/specs/phaseX-gamma-TDD.md` | Phase X-γ 技术设计文档 |
| `design/specs/phaseZ-TDD.md` | Phase Z 技术设计文档 |
| `design/specs/phaseIJ-TDD.md` | Phase IJ 技术设计文档 |
| `design/specs/phaseJ-goal-TDD.md` | Phase J-Goal 技术设计文档 |
| `design/specs/phaseI-alpha-TDD.md` | Phase I-alpha 技术设计文档 |
| `design/specs/phaseTG-1-TDD.md` | Phase TG-1 技术设计文档 |
| `design/specs/phaseTG-2-TDD.md` | Phase TG-2 技术设计文档 |
| `design/specs/phaseTG-3-TDD.md` | Phase TG-3 技术设计文档 |

## 验证记录

| 文件 | 用途 |
|------|------|
| `verification/7game-lite-phaseA-verification.md` | Phase A 集成验证结果 (V1~V8 全部通过) |
| `verification/7game-lite-phaseC-verification.md` | Phase C 集成验证结果 (24 AC + 10 数值组) |
| `verification/phaseE-poc1-soul-system-report.md` | Phase E PoC-1 NPC灵魂系统测试报告 (9轮×20场景) |

## 验证脚本

| 文件 | 用途 |
|------|------|
| `scripts/regression-all.ts` | 全局回归测试（64 组） |
| `scripts/verify-phaseB-alpha.ts` | Phase B-α 数值验证 (6 组) |
| `scripts/verify-phaseC.ts` | Phase C 数值验证 (10 组) |
| `scripts/verify-phaseD-intent.ts` | Phase D Intent 等价性验证 (10 组/29 断言) |
| `scripts/verify-phaseE.ts` | Phase E 灵魂系统专项验证 (47 组) |
| `scripts/verify-phaseF.ts` | Phase F 灵魂闭环专项验证 (12 组) |
| `scripts/verify-phaseF0-alpha.ts` | Phase F0-α 碰面世界专项验证 (52 组) |
| `scripts/verify-phaseF0-beta.ts` | Phase F0-β 活世界专项验证 (108 组) |
| `scripts/verify-phaseI-alpha-causal.ts` | Phase I-alpha 因果引擎专项验证 (30 组) |
| `scripts/verify-phaseIJ-relationship-memory.ts` | Phase IJ 关系记忆专项验证 (38 组) |
| `scripts/verify-phaseJ-goal.ts` | Phase J-Goal 目标系统专项验证 (66 组) |
| `scripts/verify-ui-formatter.ts` | MUD 格式化单元测试 (65 组) |

---

## Pipeline 过程资产

> 详见 [`pipeline/README.md`](pipeline/README.md) 了解完整规范。

| Phase | spm-analysis | plan | task | review | walkthrough |
|-------|:----------:|:----:|:----:|:------:|:-----------:|
| B-α | — | ✅ [`plan`](pipeline/phaseB-alpha/plan.md) | — | — | — |
| C | — | ✅ [`plan`](pipeline/phaseC/plan.md) | — | — | — |
| **E** | ✅ [`spm`](pipeline/phaseE/spm-analysis.md) | — | — | ✅ [`review`](pipeline/phaseE/review.md) | — |
| **F** | ✅ [`spm`](pipeline/phaseF/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseF/task.md) | ✅ [`review`](pipeline/phaseF/review.md) | — |
| **F0-α** | ✅ [`spm`](pipeline/phaseF0-alpha/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseF0-alpha/task.md) | ✅ [`review`](pipeline/phaseF0-alpha/review.md) | — |
| **F0-β** | ✅ [`spm`](pipeline/phaseF0-beta/spm-analysis.md) | ✅ [`plan`](pipeline/phaseF0-beta/plan.md) | ✅ [`task`](pipeline/phaseF0-beta/task.md) | ✅ [`review`](pipeline/phaseF0-beta/review.md) | — |
| **H-α** | ✅ [`spm`](pipeline/phaseH-alpha/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseH-alpha/task.md) | ✅ [`review`](pipeline/phaseH-alpha/review.md) | ✅ [`walk`](pipeline/phaseH-alpha/walkthrough.md) |
| **G** | ✅ [`spm`](pipeline/phaseG/spm-analysis.md) | ✅ [`plan`](pipeline/phaseG/plan.md) | — | ✅ [`review`](pipeline/phaseG/review.md) | ✅ [`walk`](pipeline/phaseG/walkthrough.md) |
| **H-β** | ✅ [`spm`](pipeline/phaseH-beta/spm-analysis.md) | ✅ [`plan`](pipeline/phaseH-beta/plan.md) | — | ✅ [`review`](pipeline/phaseH-beta/review.md) | ✅ [`walk`](pipeline/phaseH-beta/walkthrough.md) |
| **H-γ** | ✅ [`spm`](pipeline/phaseH-gamma/spm-analysis.md) | — | — | ✅ [`review`](pipeline/phaseH-gamma/review.md) | ✅ [`walk`](pipeline/phaseH-gamma/walkthrough.md) |
| **X-α** | ✅ [`spm`](pipeline/phaseX-alpha/spm-analysis.md) | ✅ [`plan`](pipeline/phaseX-alpha/plan.md) | ✅ [`task`](pipeline/phaseX-alpha/task.md) | ✅ [`review`](pipeline/phaseX-alpha/review.md) | ✅ [`walk`](pipeline/phaseX-alpha/walkthrough.md) |
| **X-β** | ✅ [`spm`](pipeline/phaseX-beta/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseX-beta/task.md) | ✅ [`review`](pipeline/phaseX-beta/review.md) | ✅ [`walk`](pipeline/phaseX-beta/walkthrough.md) |
| **X-γ** | ✅ [`spm`](pipeline/phaseX-gamma/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseX-gamma/task.md) | ✅ [`review`](pipeline/phaseX-gamma/code-review.md) | — |
| **Y** | ✅ [`spm`](pipeline/phaseY/spm-analysis.md) | ✅ [`plan`](pipeline/phaseY/plan.md) | — | ✅ [`backend-review`](pipeline/phaseY/backend-code-review.md) | — |
| **Z** | ✅ [`spm`](pipeline/phaseZ/spm-analysis.md) | ✅ [`plan`](pipeline/phaseZ/plan.md) | ✅ [`task`](pipeline/phaseZ/task.md) | ✅ [`review`](pipeline/phaseZ/review.md) | ✅ [`walk`](pipeline/phaseZ/walkthrough.md) |
| **IJ-PoC** | ✅ [`spm`](pipeline/phaseIJ-poc/spm-analysis.md) | — | — | ✅ [`review`](pipeline/phaseIJ-poc/review.md) | — |
| **IJ** | ✅ [`spm`](pipeline/phaseIJ/spm-analysis.md) | ✅ [`plan`](pipeline/phaseIJ/plan.md) | ✅ [`task`](pipeline/phaseIJ/task.md) | ✅ [`g1-v3`](pipeline/phaseIJ/review-g1-v3.md) [`g2-v3`](pipeline/phaseIJ/review-g2-v3.md) [`g3-v3`](pipeline/phaseIJ/review-g3-v3.md) | ✅ [`walk`](pipeline/phaseIJ/walkthrough.md) |
| **J-Goal** | ✅ [`spm`](pipeline/phaseJ-goal/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseJ-goal/task.md) | ✅ [`g1`](pipeline/phaseJ-goal/review-g1.md) [`g2`](pipeline/phaseJ-goal/review-g2.md) [`g3`](pipeline/phaseJ-goal/review-g3.md) | ✅ [`walk`](pipeline/phaseJ-goal/walkthrough.md) |
| **I-alpha** | ✅ [`spm`](pipeline/phaseI-alpha/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseI-alpha/task.md) | ✅ [`g1`](pipeline/phaseI-alpha/review-g1.md) [`g2`](pipeline/phaseI-alpha/review-g2.md) [`g3`](pipeline/phaseI-alpha/review-g3.md) | ✅ [`walk`](pipeline/phaseI-alpha/walkthrough.md) |
| **TG-1** | ✅ [`spm`](pipeline/phaseTG-1/spm-analysis.md) | — | ✅ [`task`](pipeline/phaseTG-1/task.md) | ✅ [`g1`](pipeline/phaseTG-1/review-g1.md) [`g2`](pipeline/phaseTG-1/review-g2.md) [`g3`](pipeline/phaseTG-1/review-g3.md) | ✅ [`walk`](pipeline/phaseTG-1/walkthrough.md) |
| **TG-2** | ✅ [`spm`](pipeline/phaseTG-2/spm-analysis.md) | — | — | ✅ [`g1`](pipeline/phaseTG-2/review-g1.md) [`g2`](pipeline/phaseTG-2/review-g2.md) [`g3`](pipeline/phaseTG-2/review-g3.md) | ✅ [`walk`](pipeline/phaseTG-2/walkthrough.md) |
| **TG-3** | ✅ [`spm`](pipeline/phaseTG-3/spm-analysis.md) | ✅ [`plan`](pipeline/phaseTG-3/plan.md) | — | ✅ [`g1`](pipeline/phaseTG-3/review-g1.md) [`g2`](pipeline/phaseTG-3/review-g2.md) [`g3`](pipeline/phaseTG-3/review-g3.md) | ✅ [`walk`](pipeline/phaseTG-3/walkthrough.md) |

### 特殊过程资产

| Phase | 文件 | 用途 |
|-------|------|------|
| E | [`pipeline/phaseE/poc-1b-report.md`](pipeline/phaseE/poc-1b-report.md) | PoC-1b 灵魂系统测试报告 |
| E | [`pipeline/phaseE/sga-review.md`](pipeline/phaseE/sga-review.md) | SGA 架构审查 |
| H-α | [`pipeline/phaseH-alpha/sge-review.md`](pipeline/phaseH-alpha/sge-review.md) | SGE 代码审查 |
| X-α | [`pipeline/phaseX-alpha/sge-review.md`](pipeline/phaseX-alpha/sge-review.md) | SGE 代码审查 |
| X-γ | [`pipeline/phaseX-gamma/review-fix-task.md`](pipeline/phaseX-gamma/review-fix-task.md) | Review 修复任务 |
| Y | [`pipeline/phaseY/backend-review-fix-task.md`](pipeline/phaseY/backend-review-fix-task.md) | 后端 Review 修复任务 |
| IJ-PoC | [`pipeline/phaseIJ-poc/detail-T1.md`](pipeline/phaseIJ-poc/detail-T1.md) ~ [`detail-T5.md`](pipeline/phaseIJ-poc/detail-T5.md) | T1-T5 逐 Level 详细报告 |
| IJ-PoC | [`pipeline/phaseIJ-poc/review-v2.md`](pipeline/phaseIJ-poc/review-v2.md) | Review 第 2 版 |
| IJ-PoC | [`pipeline/phaseIJ-poc/review-v4*.md`](pipeline/phaseIJ-poc/) | V4 基准测试系列报告（6 个文件） |
| TG | [`pipeline/trinity-guardian/process-audit-2026-04-01.md`](pipeline/trinity-guardian/process-audit-2026-04-01.md) | 流程审计报告 |
| TG | [`pipeline/trinity-guardian/plan.md`](pipeline/trinity-guardian/plan.md) | Trinity Guardian 总体计划 |
| TG | [`pipeline/trinity-guardian/review.md`](pipeline/trinity-guardian/review.md) | Trinity Guardian 审查报告 |
| infra | [`pipeline/infra-review-v1.2/plan.md`](pipeline/infra-review-v1.2/plan.md) | 基础设施审查计划 |
| infra | [`pipeline/infra-review-v1.2/walkthrough.md`](pipeline/infra-review-v1.2/walkthrough.md) | 基础设施审查总结 |

---

## Skill 定义文件

| 文件 | 用途 |
|------|------|
| `.agents/skills/product-manager/SKILL.md` | /SPM 产品经理 Skill 定义 |
| `.agents/skills/architect/SKILL.md` | /SGA 架构师 Skill 定义 |
| `.agents/skills/engineer/SKILL.md` | /SGE 工程师 Skill 定义 |
| `.agents/skills/_shared/review-protocol.md` | Party Review 四层防线执行协议 |

---

## 文档格式说明

| Phase | 格式 | 说明 |
|-------|------|------|
| A / B-α / C | 旧 SGPA 十步分析 | `features/xxx-analysis.md`，保留不动 |
| D+（新增） | 新 Trinity 三文件 | `features/[name]-PRD.md` + `design/specs/[name]-TDD.md` + `verification/[name]-verification.md` |
| D+（过程资产） | Pipeline 五文件 | `pipeline/phaseX/{spm-analysis,plan,task,review,walkthrough}.md` |

> 详见 `MASTER-PRD.md` §7 文档格式说明。
