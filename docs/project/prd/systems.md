# 系统清单

> **来源**：MASTER-PRD 拆分 | **维护者**：/SPM, /SGE (交接更新)
> **索引入口**：[MASTER-PRD.md](../MASTER-PRD.md) §4

---

## §1 已实现系统清单

| 系统 | Phase | 分析文档 | 验证状态 |
|------|-------|---------|---------| 
| 修炼引擎（灵气/悟性/灵石） | A | [7game-lite-analysis.md](../../features/7game-lite-analysis.md) | ✅ V1~V8 通过 |
| 弟子行为树（7态切换） | A | [同上](../../features/7game-lite-analysis.md) | ✅ 通过 |
| MUD 文字面板 | A | [同上](../../features/7game-lite-analysis.md) | ✅ 通过 |
| AI 灵智弟子台词 | A | [同上](../../features/7game-lite-analysis.md) | ✅ fallback 模式通过 |
| 灵田种植与收获 | B-α | [7game-lite-phaseB-analysis.md](../../features/7game-lite-phaseB-analysis.md) | ✅ 6 组验证通过 |
| 弟子独立炼丹 | B-α | [同上](../../features/7game-lite-phaseB-analysis.md) | ✅ Monte Carlo 通过 |
| 概率突破引擎 | C | [7game-lite-phaseC-analysis.md](../../features/7game-lite-phaseC-analysis.md) | ✅ 24 AC + 10 数值组 |
| 灵脉密度系统 | C | [同上](../../features/7game-lite-phaseC-analysis.md) | ✅ 通过 |
| 丹药自动消费 | C | [同上](../../features/7game-lite-phaseC-analysis.md) | ✅ 通过 |
| Intent 行为树重构 (TD-003) | D | [phaseD-TDD.md](../../design/specs/phaseD-TDD.md) | ✅ 29 专项 + 56 回归 |
| 弟子间对话系统 (FB-001) | D | [phaseD-PRD.md](../../features/phaseD-PRD.md) | ✅ fallback 模式通过 |
| 结构化日志系统 | D | [phaseD-TDD.md](../../design/specs/phaseD-TDD.md) | ✅ IndexedDB 持久化 |
| NPC 灵魂系统（道德/特性/情绪/关系） | E | [phaseE-PRD.md](../../features/phaseE-PRD.md) | ✅ 47 专项 + 64 回归 |
| 弟子性别系统（代词/名字池/存档迁移） | GS | [phaseGS-PRD.md](../../features/phaseGS-PRD.md) | ✅ 81 回归通过 |
| 社交事件系统（三维关系/性取向/关系状态/社交引擎） | I-beta | [phaseI-beta-PRD.md](../../features/phaseI-beta-PRD.md) | ✅ 回归 111 + social 78 通过 |

---

## §2 世界层规划系统（Phase F0~J）

| 系统 | 目标 Phase | 前置 | 文档状态 |
|------|-----------|------|---------| 
| 地点标签系统（7 Zone） | F0-α | E 完成 | 设计定案（06号文档） |
| 碰面引擎 | F0-α | E 完成 | 设计定案（06号文档） |
| 宗门道风双轴系统 | F0-α | E 完成 | 设计定案（09号文档） |
| 世界事件池 | F0-β | F0-α | 设计定案（06号文档） |
| 五级事件漏斗 | F0-β | F0-α | 设计定案（07号文档） |
| Storyteller 节奏器 | F0-β | F0-α | 设计定案（07号文档） |

> 详细交付物和验收标准见 [SOUL-VISION-ROADMAP.md](../SOUL-VISION-ROADMAP.md)

---

## §3 暂缓系统（经济闭环，世界层就绪后按需排入）

| 系统 | 原计划 Phase | 暂缓原因 | 文档状态 |
|------|:----------:|---------|---------|
| 天劫系统（炼气→筑基） | D（旧） | 不影响灵魂/世界验证，优先级下降 | 待创建 |
| 悬赏任务完整实现（D~B 级） | D（旧） | 骨架已有（bounty-board），完善可延后 | FB-002 |
| 丹毒系统 | E（旧） | 不影响灵魂/世界验证 | 待创建 |
| ~~关系系统（好感度/仇敌）~~ | ~~待定~~ | ~~D 完成~~ | ✅ **Phase E 已实现**（合并入 NPC 灵魂系统 affinity/tags） |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------| 
| 2026-03-28 | 从 MASTER-PRD.md §4.2/4.3 拆出，独立文件 |
| 2026-03-28 | Phase D: +3 已实现系统（Intent重构/弟子对话/结构化日志）；天劫+悬赏移至 Phase E；+关系系统(FB-004)待定 |
| 2026-03-29 | Phase E: +NPC 灵魂系统（含关系系统 FB-004）；天劫+悬赏+丹毒移至 Phase F |
| 2026-03-29 | **对齐 Roadmap V3**：§2 重构为世界层规划系统（6 项）；天劫/悬赏/丹毒移入 §3 暂缓系统；对齐 MASTER-PRD v2.0 |
| 2026-04-02 | Phase GS: +弟子性别系统（Gender type + 名字池 + 代词 + 存档 v6→v7） |
| 2026-04-02 | Phase I-beta: +社交事件系统（三维关系向量 + 性取向 + 离散关系状态 + 社交引擎 + 存档 v7→v8） |
