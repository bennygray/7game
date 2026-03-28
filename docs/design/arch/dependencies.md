# 系统依赖矩阵

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §4

---

## §1 Engine 层依赖矩阵

> 行 = 文件，列 = 被依赖文件。R = 读取，W = 写入/调用

| 文件 ↓ 依赖 → | game-state | idle-formulas | realm-formulas | alchemy-formulas | realm-table | recipe-table | seed-table | realm-display |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **idle-engine** | R/W | R | — | — | R | — | — | — |
| **behavior-tree** | R/W | — | — | — | — | — | — | — |
| **farm-engine** | R/W | — | — | R | — | R | R | — |
| **alchemy-engine** | R/W | — | — | R | — | R | — | — |
| **breakthrough-engine** | R/W | — | R | — | — (间接via realm-formulas) | R | — | R |
| **pill-consumer** | R/W | — | R | — | — | R | — | — |
| **save-manager** | R/W | — | — | — | — | — | — | — |
| **disciple-generator** | W | — | — | — | — | — | — | — |

---

## §2 Engine 层内部依赖

| 文件 ↓ 依赖 → | idle-engine | behavior-tree | farm-engine | alchemy-engine | breakthrough-engine | pill-consumer |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **idle-engine** | — | R | R | — | R | R |
| **behavior-tree** | — | — | R | R | — | — |
| **breakthrough-engine** | — | — | — | — | — | R |

---

## §3 影响分析速查

> "改 X 影响谁？"

| 改动文件 | 直接影响 | 间接影响 |
|---------|---------|---------| 
| `game-state.ts` | **全部 Engine 文件** | main.ts, save-manager.ts |
| `idle-formulas.ts` | idle-engine | main.ts（显示灵气速率） |
| `realm-formulas.ts` | breakthrough-engine, pill-consumer | idle-engine（通过突破改 realm） |
| `alchemy-formulas.ts` | farm-engine, alchemy-engine | behavior-tree（通过选种/选丹方） |
| `realm-table.ts` | idle-engine, breakthrough-engine | 全局灵气速率 |
| `recipe-table.ts` | farm-engine, alchemy-engine, breakthrough-engine, pill-consumer | 丹药效果全局 |
| `farm-engine.ts` | idle-engine（tick 中调用）, behavior-tree | materialPouch 变更 |
| `alchemy-engine.ts` | behavior-tree | pills[] 变更 |
| `breakthrough-engine.ts` | idle-engine | realm/subRealm 变更 → 全局影响 |
| `pill-consumer.ts` | idle-engine, breakthrough-engine | buff 状态变更 |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-ARCHITECTURE.md §4 拆出 |
