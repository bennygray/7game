# 系统依赖矩阵

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §4
> **最后更新**：Phase 4 Pipeline 重构

---

## §1 Engine 层依赖矩阵

> 行 = 文件，列 = 被依赖文件。R = 读取，W = 写入/调用

| 文件 ↓ 依赖 → | game-state | idle-formulas | realm-formulas | alchemy-formulas | realm-table | recipe-table | seed-table | realm-display |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **idle-engine** | R/W | R | — | — | R | — | — | — |
| **tick-pipeline** | R | — | — | — | — | — | — | — |
| **handlers/boost-countdown** | R/W | — | — | — | — | — | — | — |
| **handlers/breakthrough-aid** | R/W | — | — | — | — | — | — | — |
| **handlers/auto-breakthrough** | R/W | — | — | — | — | — | — | — |
| **handlers/farm-tick** | R/W | — | — | — | — | — | — | — |
| **handlers/disciple-tick** | R/W | — | — | — | — | — | — | — |
| **handlers/cultivate-boost** | R/W | — | — | — | — | — | — | — |
| **behavior-tree** | R/W | — | — | — | — | — | — | — |
| **farm-engine** | R/W | — | — | R | — | R | R | — |
| **alchemy-engine** | R/W | — | — | R | — | R | — | — |
| **breakthrough-engine** | R/W | — | R | — | — (间接via realm-formulas) | R | — | R |
| **pill-consumer** | R/W | — | R | — | — | R | — | — |
| **save-manager** | R/W | — | — | — | — | — | — | — |
| **disciple-generator** | W | — | — | — | — | — | — | — |

---

## §2 Engine 层内部依赖

| 文件 ↓ 依赖 → | idle-engine | tick-pipeline | behavior-tree | farm-engine | alchemy-engine | breakthrough-engine | pill-consumer |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **idle-engine** | — | R | — | — | — | R | R |
| **tick-pipeline** | — | — | — | — | — | — | — |
| **handlers/boost-countdown** | — | R | — | — | — | — | R |
| **handlers/breakthrough-aid** | — | R | — | — | — | — | R |
| **handlers/auto-breakthrough** | — | R | — | — | — | R | — |
| **handlers/farm-tick** | — | R | — | R | — | — | — |
| **handlers/disciple-tick** | — | R | R | — | — | — | — |
| **handlers/cultivate-boost** | — | R | — | — | — | — | R |
| **behavior-tree** | — | — | — | R | R | — | — |
| **breakthrough-engine** | — | — | — | — | — | — | R |

---

## §3 影响分析速查

> "改 X 影响谁？"

| 改动文件 | 直接影响 | 间接影响 |
|---------|---------|---------| 
| `game-state.ts` | **全部 Engine 文件 + 全部 Handler** | main.ts, save-manager.ts |
| `tick-pipeline.ts` | idle-engine, **全部 handlers** | main.ts（通过 idle-engine） |
| `idle-formulas.ts` | idle-engine | main.ts（显示灵气速率） |
| `realm-formulas.ts` | breakthrough-engine, pill-consumer | idle-engine（通过突破改 realm） |
| `alchemy-formulas.ts` | farm-engine, alchemy-engine | behavior-tree（通过选种/选丹方） |
| `realm-table.ts` | idle-engine, breakthrough-engine | 全局灵气速率 |
| `recipe-table.ts` | farm-engine, alchemy-engine, breakthrough-engine, pill-consumer | 丹药效果全局 |
| `farm-engine.ts` | handlers/farm-tick, behavior-tree | materialPouch 变更 |
| `alchemy-engine.ts` | behavior-tree | pills[] 变更 |
| `breakthrough-engine.ts` | handlers/auto-breakthrough, idle-engine | realm/subRealm 变更 → 全局影响 |
| `pill-consumer.ts` | handlers/boost-countdown, breakthrough-aid, cultivate-boost, idle-engine | buff 状态变更 |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-ARCHITECTURE.md §4 拆出 |
| 2026-03-28 | Phase 4 重构: 新增 tick-pipeline + 6 个 handler 文件的依赖关系 |
