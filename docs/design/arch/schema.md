# 存档 Schema Registry

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA, /SGE
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §5

---

## §1 版本变更链

| 版本 | Phase | 新增字段 | 删除字段 | 迁移函数 |
|:----:|:-----:|---------|---------|---------| 
| **v1** | A | — (初始) | — | — |
| **v2** | B-α | `disciples[].farmPlots`, `disciples[].currentRecipeId`, `pills[]`, `sect.tributePills` | `fields`, `alchemy` | `migrateV1toV2()` |
| **v3** | C | `breakthroughBuff`, `cultivateBoostBuff`, `lifetimeStats.pillsConsumed`, `lifetimeStats.breakthroughFailed` | — | `migrateV2toV3()` |
| **v4** | E | `disciples[].moral`, `disciples[].initialMoral`, `disciples[].traits`, `RelationshipEdge.affinity`, `RelationshipEdge.tags`, `RelationshipEdge.lastInteraction` | `RelationshipEdge.value` | `migrateV3toV4()` |

---

## §2 迁移策略

```mermaid
graph LR
    V1["v1 存档"] -->|migrateV1toV2| V2["v2 存档"]
    V2 -->|migrateV2toV3| V3["v3 存档"]
    V3 -->|migrateV3toV4| V4["v4 存档"]
    V4 -->|defaults 兜底| FINAL["最终 LiteGameState"]
    style FINAL fill:#d4edda
    style V4 fill:#fff3e0
```

1. **链式迁移**：`if (version < 2) → migrateV1toV2()`，`if (version < 3) → migrateV2toV3()`，`if (version < 4) → migrateV3toV4()`
2. **defaults 兜底**：迁移后用 `createDefaultLiteGameState()` 的属性做浅合并，补全任何缺失字段
3. **版本号强制更新**：最终 `result.version = SAVE_VERSION (4)`

---

## §3 v1 完整字段列表

```
version, aura, spiritStones, realm, subRealm, daoFoundation,
comprehension, sect{name,level,reputation,auraDensity,stoneDripAccumulator},
disciples[]{id,name,starRating,realm,subRealm,aura,personality,personalityName,
  spiritualRoots,behavior,lastDecisionTime,behaviorTimer,stamina},
relationships[], bountyBoard, aiContexts, materialPouch,
inGameWorldTime, lastOnlineTime, lifetimeStats{alchemyTotal,alchemyPerfect,
  highestRealm,highestSubRealm,totalAuraEarned,breakthroughTotal},
fields[], alchemy{}
```

---

## §4 v2 变更

- ➕ `disciples[].farmPlots: FarmPlot[]`
- ➕ `disciples[].currentRecipeId: string | null`
- ➕ `pills: PillItem[]`
- ➕ `sect.tributePills: number`
- ➖ `fields: FieldSlot[]`
- ➖ `alchemy: AlchemyState`

---

## §5 v3 变更

- ➕ `breakthroughBuff: BreakthroughBuffState`
- ➕ `cultivateBoostBuff: CultivateBoostBuff | null`
- ➕ `lifetimeStats.pillsConsumed: number`
- ➕ `lifetimeStats.breakthroughFailed: number`

---

## §6 v4 变更 (Phase E)

- ➕ `disciples[].moral: MoralAlignment` — 道德双轴 {goodEvil, lawChaos} [-100, +100]
- ➕ `disciples[].initialMoral: MoralAlignment` — 初始道德（不可变，用于舸同漂移）
- ➕ `disciples[].traits: DiscipleTrait[]` — 先天/后天特性列表
- ➖ `RelationshipEdge.value: number` → `RelationshipEdge.affinity: number` — 重命名 + 语义扩展
- ➕ `RelationshipEdge.tags: RelationshipTag[]` — 关系标签（friend/rival/mentor等）
- ➕ `RelationshipEdge.lastInteraction: number` — 最后交互时间戳

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-ARCHITECTURE.md §5 拆出 |
| 2026-03-29 | Phase E: +v4 变更链（moral/traits/affinity/tags/lastInteraction）+ migrateV3toV4 |
