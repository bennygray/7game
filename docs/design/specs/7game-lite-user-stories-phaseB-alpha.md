# 7game-lite User Stories — Phase B-α: 灵田+炼丹核心

> **生成日期**：2026-03-28（含专家审阅修正）
> **覆盖里程碑**：α1 种子+灵田 → α2 丹方+炼丹 → α3 GameState 重构 → α4 Tick 扩展
> **Story 数量**：4 条
> **依赖**：Phase A Story #1（LiteGameState）、Story #4（弟子行为树）

---

## Story 1 `[M]` — GameState 重构与存档迁移

> 作为开发者，我希望将灵田和炼丹的数据结构集成到 LiteGameState 中，以便于后续系统建立在统一的数据基座上。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 已有 v1 存档（含 `fields: FieldSlot[]`） | 调用 `loadGame()` | 自动迁移为 v2：`fields` 被移除，弟子新增 `farmPlots: []`、`alchemy: { active: false, recipeId: null, remainingTicks: 0 }`，`pills: []`，`sect.tributePills=0`，`version=2` |
| 2 | 无存档（新游戏） | 调用 `createDefaultLiteGameState()` | v2 状态：每弟子含上述默认值，`materialPouch` 含已有类型 |
| 3 | v2 存档已存在 | 调用 `loadGame()` | 不触发迁移，直接返回 |

**依赖**：无（首个 Story，数据基座）

**关键接口**：
```typescript
interface FarmPlot { seedId: string; growthTimeSec: number; elapsedTicks: number; mature: boolean; }
interface DiscipleAlchemyState { active: boolean; recipeId: string | null; remainingTicks: number; }
interface PillItem { defId: string; quality: AlchemyQuality; count: number; }
```

---

## Story 2 `[S]` — 灵田种植与收获

> 作为宗主，我希望弟子在 FARM 行为期间自动种植灵草并在行为结束时收获，以便于获得炼丹所需的原材料。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 弟子 A 进入 FARM 行为，`farmPlots.length < 3`，灵石 ≥5 | FARM 行为开始 | 按需平衡选种（F-B1b：缺口比最大的灵草），种植一块，`spiritStones` 扣减，MUD 输出 `[弟子A] 种下了清心草` |
| 2 | 弟子 A 处于 FARM 行为，有未成熟灵田 | 引擎 tick 每秒 | `elapsedTicks += 2`（FARM ×2 加速），满 `growthTimeSec` 时 `mature=true` |
| 3 | 弟子 A 非 FARM 行为，有未成熟灵田 | 引擎 tick 每秒 | `elapsedTicks += 1`（基础速度），满时 `mature=true` |
| 4 | FARM 行为结束，有已成熟作物 | FARM 行为结算 | 收获：`materialPouch[seedId] += yield`，FarmPlot 移除，MUD 输出 `[弟子A] 收获了清心草 ×2` |
| 5 | `farmPlots.length >= 3` | FARM 行为开始 | 不种新作物，MUD `[弟子A] 灵田已满，照看作物中` |
| 6 | 灵石不足 | FARM 行为开始 | 不种植，MUD `[弟子A] 灵石不足，无法购买种子` |

**依赖**：Story #1

---

## Story 3 `[M]` — 弟子独立炼丹

> 作为宗主，我希望弟子在 ALCHEMY 行为期间自动炼制丹药，成功时 2 颗入仓库 1 颗上缴，失败时废丹碎裂回收灵气。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 弟子 B 进入 ALCHEMY，材料充足 | ALCHEMY 行为开始 | 按需分配选丹方（库存最少优先），扣材料+灵石，`alchemy.active=true`，MUD `[弟子B] 开炉炼制回灵丹` |
| 2 | `alchemy.active=true`，经过 `craftTimeSec` tick | ALCHEMY 结算（成功） | 二段掷骰 → 3 颗同品质丹药：2 入 `pills[]`，`tributePills += 1`。MUD `[弟子B] 炼成回灵丹(中品) ×3！上缴 1 颗，入库 2 颗` |
| 3 | 掷骰判定失败 | ALCHEMY 结算（失败） | 3 废丹就地碎裂，`state.aura += costStones × 0.3 × 3`。MUD `[弟子B] 炼丹失败！废丹碎裂，回收灵气 +9` |
| 4 | 所有丹方材料均不足 | ALCHEMY 行为开始 | 不炼丹，空转给灵气奖励，MUD `[弟子B] 炼丹材料不足，只好整理丹炉` |
| 5 | `alchemy.active=true` | 再次进入 ALCHEMY | 不开新炉，等待完成 |

**依赖**：Story #1, Story #2（灵草来源）

---

## Story 4 `[S]` — 引擎 Tick 扩展

> 作为宗主，我希望灵田生长和炼丹倒计时在引擎 Tick 中自动推进。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 弟子有未成熟灵田 | tick 1 秒 | `elapsedTicks += growthRate`（FARM=2, 其他=1），满值→`mature=true` |
| 2 | 弟子正在炼丹（`alchemy.active`） | tick 1 秒 | `remainingTicks -= 1`，≤0 时标记完成 |
| 3 | 4 弟子运行 60s | 观察性能 | tick < 5ms |

**依赖**：Story #1, #2, #3
