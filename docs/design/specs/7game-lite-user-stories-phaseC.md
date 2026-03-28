# 7game-lite User Stories — Phase C: 突破+灵脉+丹药使用

> **生成日期**：2026-03-28
> **覆盖里程碑**：C1 GameState v3 → C2 灵脉 → C3 丹药消费 → C4 概率突破 → C5 Tick 扩展
> **Story 数量**：5 条
> **依赖**：Phase B-α Story #1~#4（灵田+炼丹核心）

---

## Story 1 `[S]` — GameState v3 + 存档迁移

> 作为开发者，我希望将突破 buff 和修速丹 buff 集成到 LiteGameState 中，以便于后续突破和丹药系统建立在统一数据基座上。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 已有 v2 存档 | 调用 `loadGame()` | 自动迁移为 v3：新增 `breakthroughBuff: { pillsConsumed: [], totalBonus: 0 }`、`cultivateBoostBuff: null`、`lifetimeStats.pillsConsumed=0`、`lifetimeStats.breakthroughFailed=0`、`version=3` |
| 2 | 无存档（新游戏） | 调用 `createDefaultLiteGameState()` | v3 状态：含上述默认值 |
| 3 | v3 存档已存在 | 调用 `loadGame()` | 不触发迁移，直接返回 |
| 4 | v1 存档（跨版本） | 调用 `loadGame()` | 链式迁移 v1→v2→v3 |

**依赖**：无（首个 Story，数据基座）

**关键接口**：
```typescript
interface BreakthroughBuffState {
  pillsConsumed: AlchemyQuality[];
  totalBonus: number;
}
interface CultivateBoostBuff {
  qualityMultiplier: number;
  remainingSec: number;
}
```

---

## Story 2 `[S]` — 灵脉密度 + 灵气速率扩展

> 作为宗主，我希望境界提升后灵脉灵气密度自动增加，以便于全门派修炼速度永久提速。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 宗主炼气 1 层 | 查询灵气速率 | `calculateAuraRate` 返回 `基础×道基×1.0(密度)×修速丹` |
| 2 | 宗主炼气 5 层 | 查询灵气速率 | 密度乘区变为 1.2（炼气4~6） |
| 3 | 宗主筑基 1 | 查询灵气速率 | 密度乘区变为 2.0 |
| 4 | 修速丹 buff 生效中 | 查询灵气速率 | 额外 ×2.0 乘区 |
| 5 | 无修速丹 buff | 查询灵气速率 | 修速丹乘区为 1.0（无影响） |

**依赖**：Story #1

**数据表**：
```
SPIRIT_VEIN_DENSITY:
  炼气1~3=1.0, 炼气4~6=1.2, 炼气7~9=1.5
  筑基1=2.0, 筑基2=3.0, 筑基3=5.0
```

---

## Story 3 `[M]` — 丹药消费引擎

> 作为宗主，我希望系统自动服用修速丹和破镜丹，以便于门派运转无需频繁手动操作。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 无修速丹 buff，`pills[]` 含修速丹(中品)×2 | tick 检测 | 自动服用 1 颗最低品质修速丹，`cultivateBoostBuff = { qualityMultiplier: 1.0, remainingSec: 60 }`，pills-1，`lifetimeStats.pillsConsumed++`，MUD `[系统] 自动服用修速丹(中品)，修炼加速 60 秒` |
| 2 | 修速丹 buff 生效中（剩余30s），新吃修速丹(上品) | 自动服用 | buff 覆盖为 `{ qualityMultiplier: 1.5, remainingSec: 90 }`，MUD `[系统] 修速丹(上品)覆盖旧 buff，加速 90 秒` |
| 3 | 破镜丹 buff 已服用 1 颗，基础成功率 ≤85%，有破镜丹(下品) | tick 检测 | 自动服用，`pillsConsumed` 追加 'low'，`totalBonus` +9%，pills-1，MUD `[系统] 自动服用破镜丹(下品)，突破加成 →24%` |
| 4 | 破镜丹已服用 3 颗 | tick 检测 | 不再服用 |
| 5 | 无任何丹药库存 | tick 检测 | 跳过，无日志 |
| 6 | 回灵丹库存有 3 颗(中品)，非突破场景 | tick 检测 | 不服用回灵丹 |
| 7 | 有破镜丹库存，当前基础成功率 90%（>85%） | tick 检测 | 不自动服用破镜丹（高成功率不浪费） |

**依赖**：Story #1

---

## Story 4 `[M]` — 概率突破引擎

> 作为宗主，我希望突破改为概率判定，破镜丹可提高成功率，失败时扣除 50% 灵气并损毁丹药 buff。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 炼气 3→4，基础率 85%，无丹药 | 手动 `bt` | 掷骰：85% 成功→升级+MUD金色日志；15% 失败→`灵气 -= 突破灵气×0.5`，`breakthroughFailed++`，MUD `突破失败！灵气损失 XX` |
| 2 | 炼气 7→8，基础率 60%，3×中品破镜丹(+45%) | 自动触发（≥80%） | `result.canAttempt=true`，`result.successRate=0.99`，≥80%自动触发 |
| 3 | 筑基 1→2，基础率 25%，3×中品破镜丹(+45%) | tick 检测 | `result.successRate=0.70`＜80%，不自动触发。玩家可手动 `bt` |
| 4 | 突破失败 | 结算 | `breakthroughBuff` 清零，`灵气 -= result.failurePenalty`，`breakthroughFailed++` |
| 5 | 突破成功 | 结算 | `breakthroughBuff` 清零，境界提升，灵脉密度可能提升 |
| 6 | 灵气不足突破门槛，有回灵丹库存 | 自动突破前 | 先自动服用回灵丹补差额（优先最低品质），补够后再执行突破 |
| 7 | 炼气 9→筑基 1 | 手动 `bt` | `result.canAttempt=false`，`result.blockReason='tribulation-required'`，MUD `需天劫，暂不可突破` |
| 8 | 筑基 3→4 | 手动 `bt` | `result.canAttempt=false`，`result.blockReason='max-realm'`，MUD `已达筑基圆满` |

**依赖**：Story #1, Story #3（破镜丹 buff 由 pill-consumer 管理）

---

## Story 5 `[S]` — Tick 扩展 + MUD 日志集成

> 作为宗主，我希望修速丹倒计时、自动服丹、自动突破在引擎 Tick 中自动运行，并通过 MUD 日志感知门派变化。

| AC# | Given | When | Then |
|-----|-------|------|------|
| 1 | 修速丹 buff 剩余 5s | tick 1s | `remainingSec -= 1`，=0 时 buff 清除，MUD `[系统] 修速丹效果消散` |
| 2 | 满足自动突破条件 | tick 检测 | 调用 breakthrough-engine 执行突破，MUD 输出金色成功或红色失败日志 |
| 3 | `status` 命令 | 玩家输入 | 显示新增：修速丹剩余时间、破镜丹数量和加成、灵脉密度、已消费丹药总数、突破失败次数 |
| 4 | 灵气速率显示 | UI 面板每 tick | `ui-aura-rate` 反映灵脉密度和修速丹加速后的真实速率（不含悟性/灵石） |
| 5 | 4 弟子 + 3 系统 tick 运行 60s | 观察性能 | tick < 5ms |

**依赖**：Story #1~#4
