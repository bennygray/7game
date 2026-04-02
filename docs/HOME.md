---
aliases: [Home, Dashboard]
tags: [meta/navigation]
---

# 7game-lite Knowledge Hub

## Quick Nav — Level 1 必读

| 文档 | 职责 |
|------|------|
| [INDEX](INDEX.md) | 文档权责表 + 按角色阅读路径 |
| [MASTER-PRD](project/MASTER-PRD.md) | 产品索引 |
| [MASTER-ARCHITECTURE](design/MASTER-ARCHITECTURE.md) | 架构索引 |
| [Handoff](project/handoff.md) | 当前断点 + 接手指南 |
| [Task Tracker](project/task-tracker.md) | Phase 级进度仪表盘 |
| [Feature Backlog](project/feature-backlog.md) | 功能债务清单 |
| [Tech Debt](project/tech-debt.md) | 技术债务登记簿 |
| [Soul Vision Roadmap](project/SOUL-VISION-ROADMAP.md) | 灵魂远景路线图 |

---

## Architecture Detail

| 模块 | 文档 |
|------|------|
| 四层架构 | [layers](design/arch/layers.md) |
| GameState 拓扑 | [gamestate](design/arch/gamestate.md) |
| Tick Pipeline | [pipeline](design/arch/pipeline.md) |
| 依赖矩阵 | [dependencies](design/arch/dependencies.md) |
| 存档版本链 | [schema](design/arch/schema.md) |
| 交叉索引 | [cross-index](design/arch/cross-index.md) |

---

## PRD Detail

| 模块 | 文档 |
|------|------|
| 经济系统 | [economy](project/prd/economy.md) |
| 系统清单 | [systems](project/prd/systems.md) |
| 公式索引 | [formulas](project/prd/formulas.md) |
| 追溯链 | [traceability](project/prd/traceability.md) |

---

## Soul Vision 探索

| 编号 | 文档 |
|------|------|
| 01 | [市场调研](project/soul-vision-rethinking/01-market-research.md) |
| 02 | [竞品分析](project/soul-vision-rethinking/02-competitive-analysis.md) |
| 03 | [核心理念](project/soul-vision-rethinking/03-core-philosophy.md) |
| 04 | [系统设计](project/soul-vision-rethinking/04-system-design.md) |
| 05 | [叙事框架](project/soul-vision-rethinking/05-narrative-framework.md) |
| 06 | [世界事件](project/soul-vision-rethinking/06-world-events.md) |
| 07 | [NPC 交互](project/soul-vision-rethinking/07-npc-interactions.md) |
| 08 | [门派哲学](project/soul-vision-rethinking/08-sect-philosophy.md) |
| 09 | [门派对齐](project/soul-vision-rethinking/09-sect-alignment.md) |

---

## 最近修改的 Pipeline 文档

```dataview
TABLE file.mtime AS "修改时间"
FROM "docs/pipeline"
WHERE file.ext = "md"
SORT file.mtime DESC
LIMIT 15
```

## 所有 PRD

```dataview
TABLE file.name AS "PRD"
FROM "docs/features"
WHERE file.ext = "md"
SORT file.name ASC
```

## 最近日记

```dataview
TABLE file.ctime AS "创建时间"
FROM "docs/journal"
SORT file.name DESC
LIMIT 7
```
