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

---

## §2 规划中系统清单

| 系统 | 目标 Phase | 前置 | 文档状态 |
|------|-----------|------|---------| 
| 天劫系统（炼气→筑基） | E | D 完成 | 待启动 |
| 悬赏任务（D~B 级） | E | D 完成 | 待启动 |
| 丹毒系统 | F | E 完成 | 待启动 |
| 关系系统（好感度/仇敌） | 待定 | D 完成 | FB-004 待启动 |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-PRD.md §4.2/4.3 拆出，独立文件 |
| 2026-03-28 | Phase D: +3 已实现系统（Intent重构/弟子对话/结构化日志）；天劫+悬赏移至 Phase E；+关系系统(FB-004)待定 |
