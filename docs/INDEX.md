# 7game-lite 文档索引

> 所有项目文档的统一入口。新增文档时必须在此注册。

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

### Architecture Detail 文件

| 文件 | 内容 |
|------|------|
| `design/arch/layers.md` | 四层架构 Mermaid + 文件清单 |
| `design/arch/gamestate.md` | GameState 拓扑 + 读写矩阵 |
| `design/arch/pipeline.md` | Tick 执行顺序 + Handler 架构 |
| `design/arch/dependencies.md` | 系统依赖矩阵 + 影响速查 |
| `design/arch/schema.md` | 存档版本链 + 迁移策略 |

## 项目管理

| 文件 | 用途 |
|------|------|
| `project/handoff.md` | 会话交接文档（当前断点 + 接手指南 + 关键决策） |
| `project/SOUL-VISION-ROADMAP.md` | 灵魂远景路线图（Phase F0~J 战略规划 V3） |
| `project/soul-vision-gap-analysis.md` | 六层灵魂循环 Gap 分析（V3） |
| `project/task-tracker.md` | 全局进度追踪（Phase 状态 + 累计统计） |
| `project/tech-debt.md` | 技术债务登记簿（架构妥协 + 清偿跟踪） |
| `project/feature-backlog.md` | 需求债务登记簿（降级/暂缓/裁剪需求） |

## 世界线推演（Soul Vision Rethinking）

> 探索性设计文档，用于讨论世界事件系统、NPC 交互、宗门道风等远景设计。
> 结论已沉淀到 `SOUL-VISION-ROADMAP.md` 和 `soul-vision-gap-analysis.md`。

| 文件 | 内容 |
|------|------|
| `project/soul-vision-rethinking/01-market-research-and-gap-analysis.md` | 市场调研 + 初始 Gap 分析 |
| `project/soul-vision-rethinking/02-architecture-and-model-constraints.md` | 架构约束 + 模型能力边界 |
| `project/soul-vision-rethinking/03-hybrid-decision-architecture.md` | 混合决策架构推演 |
| `project/soul-vision-rethinking/04-hybrid-decision-test-plan.md` | 混合决策测试计划 |
| `project/soul-vision-rethinking/05-poc-2c-findings-and-conclusion.md` | PoC-2c~2e 验证结论 |
| `project/soul-vision-rethinking/06-spm-world-director-exploration.md` | 世界线推演核心（MUD调研 + 四维决策 + 验证阻塞诊断） |
| `project/soul-vision-rethinking/07-spm-event-density-severity.md` | 五级事件漏斗 + Storyteller 节奏设计 |
| `project/soul-vision-rethinking/08-spm-ai-capacity-estimation.md` | T1/T2 NPC 双层架构 + AI 容量估算 |
| `project/soul-vision-rethinking/09-spm-sect-alignment.md` | 宗门道风(仁/霸)×门规(律/放)立场系统 |

## Trinity 分析进度

| 文件 | 状态 | 覆盖系统 |
|------|------|---------| 
| `features/7game-lite-analysis.md` | Phase A ✅ | 7game-lite 核心循环 |
| `features/7game-lite-phaseB-analysis.md` | Phase B-α ✅ | 灵田+炼丹核心 |
| `features/7game-lite-phaseC-analysis.md` | Phase C ✅ | 突破+灵脉+丹药使用 |
| `features/phaseD-PRD.md` | Phase D ✅ (Trinity SPM) | AI对话+日志+Intent重构 |
| `features/phaseE-PRD.md` | Phase E ✅ (Trinity SPM GATE 1 通过) | NPC灵魂系统（道德×特性×关系×AI事件评估） |
| `features/phaseF-PRD.md` | Phase F ✅ | 灵魂闭环（特性×情绪×关系→行为权重） |
| `features/phaseF0-alpha-PRD.md` | Phase F0-α ✅ | 碰面世界（地点·碰面·道风） |
| `features/phaseF0-beta-PRD.md` | Phase F0-β ✅ | 活世界（事件池·五级漏斗·Storyteller） |
| `features/phaseG-PRD.md` | Phase G ✅ | AI觉醒（async缓冲·情绪接入·独白·双阶段决策） |
| `features/phaseH-alpha-PRD.md` | Phase H-α ✅ | MUD世界呈现（look/分级日志/状态栏/环境呼吸） |
| `features/phaseH-beta-PRD.md` | Phase H-β ✅ | 世界缝合（统一日志管线/inspect/sect命令） |
| `features/phaseH-gamma-PRD.md` | Phase H-γ ✅ | 掌门裁决（STORM裁决窗口/judge命令/道风漂移） |

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

### 技术设计文档 (TDD)

| 文件 | 用途 |
|------|------|
| `design/specs/phaseD-TDD.md` | Phase D 技术设计文档 (Trinity SGA+SGE) |
| `design/specs/phaseE-TDD.md` | Phase E 技术设计文档 (Trinity SGA) |
| `design/specs/phaseF-TDD.md` | Phase F 技术设计文档 |
| `design/specs/phaseF0-alpha-TDD.md` | Phase F0-α 技术设计文档 |
| `design/specs/phaseF0-beta-TDD.md` | Phase F0-β 技术设计文档 |
| `design/specs/phaseG-TDD.md` | Phase G 技术设计文档 |
| `design/specs/phaseH-alpha-TDD.md` | Phase H-α 技术设计文档 |
| `design/specs/phaseH-beta-TDD.md` | Phase H-β 技术设计文档 |
| `design/specs/phaseH-gamma-TDD.md` | Phase H-γ 技术设计文档 |

## 验证记录

| 文件 | 用途 |
|------|------|
| `verification/7game-lite-phaseA-verification.md` | Phase A 集成验证结果 (V1~V8 全部通过) |
| `verification/7game-lite-phaseC-verification.md` | Phase C 集成验证结果 (24 AC + 10 数值组) |
| `verification/phaseE-poc1-soul-system-report.md` | Phase E PoC-1 NPC灵魂系统测试报告 (9轮×20场景，6种策略对比) |

## 验证脚本

| 文件 | 用途 |
|------|------|
| `scripts/verify-phaseB-alpha.ts` | Phase B-α 数值验证脚本 (6 组) |
| `scripts/verify-phaseC.ts` | Phase C 数值验证脚本 (10 组) |
| `scripts/verify-phaseD-intent.ts` | Phase D Intent 等价性验证 (10 组/29 断言) |

---

## Pipeline 过程资产

> 详见 [`pipeline/README.md`](pipeline/README.md) 了解完整规范。

| Phase | spm-analysis | plan | task | review | walkthrough |
|-------|:----------:|:----:|:----:|:------:|:-----------:|
| A | — | — | — | — | — |
| B-α | — | ✅ [`plan.md`](pipeline/phaseB-alpha/plan.md) | — | — | — |
| C | — | ✅ [`plan.md`](pipeline/phaseC/plan.md) | — | — | — |
| D | — | — | — | — | — |
| **E** | ✅ [`spm-analysis.md`](pipeline/phaseE/spm-analysis.md) | — | — | ✅ [`review.md`](pipeline/phaseE/review.md) | — |
| **F** | ✅ [`spm-analysis.md`](pipeline/phaseF/spm-analysis.md) | — | ✅ [`task.md`](pipeline/phaseF/task.md) | — | — |
| **F0-α** | ✅ [`spm-analysis.md`](pipeline/phaseF0-alpha/spm-analysis.md) | — | ✅ [`task.md`](pipeline/phaseF0-alpha/task.md) | — | — |
| **F0-β** | ✅ [`spm-analysis.md`](pipeline/phaseF0-beta/spm-analysis.md) | — | ✅ [`task.md`](pipeline/phaseF0-beta/task.md) | — | — |
| **H-α** | — | — | ✅ [`task.md`](pipeline/phaseH-alpha/task.md) | — | — |
| **G** | ✅ [`spm-analysis.md`](pipeline/phaseG/spm-analysis.md) | ✅ [`plan.md`](pipeline/phaseG/plan.md) | — | ✅ [`review.md`](pipeline/phaseG/review.md) | ✅ [`walkthrough.md`](pipeline/phaseG/walkthrough.md) |
| **H-β** | ✅ [`spm-analysis.md`](pipeline/phaseH-beta/spm-analysis.md) | ✅ [`plan.md`](pipeline/phaseH-beta/plan.md) | — | ✅ [`review.md`](pipeline/phaseH-beta/review.md) | ✅ [`walkthrough.md`](pipeline/phaseH-beta/walkthrough.md) |
| **H-γ** | ✅ [`spm-analysis.md`](pipeline/phaseH-gamma/spm-analysis.md) | — | — | ✅ [`review.md`](pipeline/phaseH-gamma/review.md) | ✅ [`walkthrough.md`](pipeline/phaseH-gamma/walkthrough.md) |

---

## 文档格式说明

| Phase | 格式 | 说明 |
|-------|------|------|
| A / B-α / C | 旧 SGPA 十步分析 | `features/xxx-analysis.md`，保留不动 |
| D+（新增） | 新 Trinity 三文件 | `features/[name]-PRD.md` + `design/specs/[name]-TDD.md` + `verification/[name]-verification.md` |
| D+（过程资产） | Pipeline 五文件 | `pipeline/phaseX/{spm-analysis,plan,task,review,walkthrough}.md` |

> 详见 `MASTER-PRD.md` §7 文档格式说明。

