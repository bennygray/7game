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
| `project/SOUL-VISION-ROADMAP.md` | 灵魂远景路线图（Phase F~J 战略规划） |
| `project/task-tracker.md` | 全局进度追踪（Phase 状态 + 累计统计） |
| `project/tech-debt.md` | 技术债务登记簿（架构妥协 + 清偿跟踪） |
| `project/feature-backlog.md` | 需求债务登记簿（降级/暂缓/裁剪需求） |

## Trinity 分析进度

| 文件 | 状态 | 覆盖系统 |
|------|------|---------| 
| `features/7game-lite-analysis.md` | Phase A ✅ | 7game-lite 核心循环 |
| `features/7game-lite-phaseB-analysis.md` | Phase B-α ✅ | 灵田+炼丹核心 |
| `features/7game-lite-phaseC-analysis.md` | Phase C ✅ | 突破+灵脉+丹药使用 |
| `features/phaseD-PRD.md` | Phase D ✅ (Trinity SPM) | AI对话+日志+Intent重构 |
| `features/phaseE-PRD.md` | Phase E ✅ (Trinity SPM GATE 1 通过) | NPC灵魂系统（道德×特性×关系×AI事件评估） |

## 设计文档

| 文件 | 用途 |
|------|------|
| `design/specs/7game-lite-user-stories-phaseA.md` | Phase A User Stories (5 条) |
| `design/specs/7game-lite-user-stories-phaseB-alpha.md` | Phase B-α User Stories (4 条) |
| `design/specs/7game-lite-user-stories-phaseC.md` | Phase C User Stories (5 条) |
| `design/specs/7game-lite-user-stories-phaseD.md` | Phase D User Stories (5 条) |
| `design/specs/7game-lite-user-stories-phaseE.md` | Phase E User Stories (5 条) |
| `design/specs/phaseD-TDD.md` | Phase D 技术设计文档 (Trinity SGA+SGE) |
| `design/specs/phaseE-TDD.md` | Phase E 技术设计文档 (Trinity SGA) |

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
| **E** | ✅ [`spm-analysis.md`](pipeline/phaseE/spm-analysis.md) | 待创建 | 待创建 | ✅ [`review.md`](pipeline/phaseE/review.md) | 待创建 |

---

## 文档格式说明

| Phase | 格式 | 说明 |
|-------|------|------|
| A / B-α / C | 旧 SGPA 十步分析 | `features/xxx-analysis.md`，保留不动 |
| D+（新增） | 新 Trinity 三文件 | `features/[name]-PRD.md` + `design/specs/[name]-TDD.md` + `verification/[name]-verification.md` |
| D+（过程资产） | Pipeline 五文件 | `pipeline/phaseX/{spm-analysis,plan,task,review,walkthrough}.md` |

> 详见 `MASTER-PRD.md` §7 文档格式说明。
