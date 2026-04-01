# GameState 拓扑树

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §2

---

## §1 完整属性清单

```
LiteGameState (v6)
├── version: number                          ← SaveManager 写入
├── aura: number                             ← IdleEngine.tick() 产出
├── spiritStones: number                     ← IdleEngine.tick() 产出
├── realm: Realm                             ← BreakthroughEngine 突破成功时写入
├── subRealm: number                         ← BreakthroughEngine 突破成功时写入
├── daoFoundation: DaoFoundation             ← 当前版本固定 NONE (0)
├── comprehension: number                    ← IdleEngine.tick() 产出
├── pills: PillItem[]                        ← AlchemyEngine 炼丹成功时写入 + PillConsumer 服丹时消耗
├── sect: SectState
│   ├── name: string                         ← 固定
│   ├── level: SectLevel                     ← 固定 1
│   ├── reputation: number                   ← 悬赏完成时增加（Phase D）
│   ├── auraDensity: number                  ← 固定 1.0（灵脉密度由函数计算）
│   ├── stoneDripAccumulator: number         ← 灵石累加器
│   ├── tributePills: number                 ← AlchemyEngine 上缴时写入
│   ├── ethos: number                        ← Phase F0-α: 道风 [-100,+100]，初始化后只读
│   └── discipline: number                   ← Phase F0-α: 门规 [-100,+100]，初始化后只读
├── disciples: LiteDiscipleState[]
│   ├── [].id / name / starRating / ...      ← DiscipleGenerator 初始化
│   ├── [].aura: number                      ← 弟子级灵气（未使用，预留）
│   ├── [].behavior: DiscipleBehavior        ← BehaviorTree.tickDisciple() 写入
│   ├── [].behaviorTimer: number             ← BehaviorTree.tickDisciple() 写入
│   ├── [].stamina: number                   ← BehaviorTree.tickDisciple() 写入
│   ├── [].farmPlots: FarmPlot[]             ← FarmEngine 种植/收获时写入
│   └── [].currentRecipeId: string | null    ← AlchemyEngine 开始/结束炼丹时写入
├── relationships: RelationshipEdge[]        ← DiscipleGenerator 初始化
├── bountyBoard: BountyBoard                 ← Phase D 悬赏系统（未实现）
├── aiContexts: Record<string, AISoulContext> ← AI 层写入
├── materialPouch: Record<string, number>    ← FarmEngine 收获时写入 + AlchemyEngine 消耗时扣减
├── inGameWorldTime: number                  ← IdleEngine.tick() 推进
├── lastOnlineTime: number                   ← IdleEngine.tick() 更新
├── lifetimeStats: LifetimeStats             ← IdleEngine/BreakthroughEngine/PillConsumer 写入
├── breakthroughBuff: BreakthroughBuffState  ← PillConsumer 服破镜丹时写入 + BreakthroughEngine 清零
├── cultivateBoostBuff: CultivateBoostBuff|null ← PillConsumer 服修速丹时写入 + PillConsumer.tickBoostCountdown() 倒计时
└── goals: PersonalGoal[]                       ← Phase J-Goal: GoalManager 分配/移除/TTL递减
```

---

## §2 多写者字段审计

> ⚠️ 以下字段有 2+ 个系统写入，需特别关注竞态和一致性。

| 字段 | 写者 | 分析 |
|------|------|------|
| `aura` | ① IdleEngine.tick() 产出 ② BreakthroughEngine 突破扣除 ③ PillConsumer 回灵丹恢复 | **安全**：突破和回灵丹在 tick 的 Step 3 同步执行完毕后，Step 1 才产出灵气。无并发。 |
| `pills[]` | ① AlchemyEngine 成丹入库 ② PillConsumer 服丹消耗 | **安全**：tick 内 PillConsumer 先执行（Step 2/3），AlchemyEngine 在行为树 tick（Step 7）中执行，时序固定。 |
| `breakthroughBuff` | ① PillConsumer.tickBreakthroughAid() 服丹写入 ② BreakthroughEngine.executeBreakthrough() 清零 | **安全**：同一 tick 内 Step 2 先服丹、Step 3 再突破，清零在突破后立即执行。CR-A1 冷却防竞态。 |
| `lifetimeStats` | ① IdleEngine ② BreakthroughEngine ③ PillConsumer | **安全**：各系统写入不同子字段，无冲突。 |
| `materialPouch` | ① FarmEngine 收获时增加 ② AlchemyEngine 消耗时扣减 | **安全**：FarmEngine 在 Step 6.5 执行，AlchemyEngine 在 Step 7 的行为树中执行，时序固定。 |

---

## §3 属性读写矩阵

> W = 写入，R = 读取。

| 属性 | 写入者 (W) | 读取者 (R) |
|------|-----------|------------|
| `aura` | IdleEngine(+), BreakthroughEngine(-), PillConsumer(+回灵丹), AlchemyEngine(+废丹) | BreakthroughEngine(门槛), PillConsumer(差额), main.ts(HUD) |
| `spiritStones` | IdleEngine(+副产) | FarmEngine(购买检查), AlchemyEngine(检查+扣减), main.ts |
| `realm`/`subRealm` | BreakthroughEngine(突破) | IdleEngine(计算), PillConsumer, FarmEngine(解锁), main.ts |
| `daoFoundation` | —(固定) | IdleEngine(道基倍率) |
| `comprehension` | IdleEngine(+) | AlchemyEngine(门槛), main.ts |
| `pills[]` | AlchemyEngine(+), PillConsumer(-) | PillConsumer(库存), AlchemyEngine(需求), BreakthroughEngine(估算) |
| `sect.tributePills` | AlchemyEngine(+) | main.ts |
| `disciples[].behavior` | BehaviorTree | FarmEngine(×2判定), main.ts |
| `disciples[].farmPlots` | FarmEngine | FarmEngine(遍历), main.ts |
| `disciples[].currentRecipeId` | AlchemyEngine | AlchemyEngine(settle), BehaviorTree(重入检查) |
| `materialPouch` | FarmEngine(+), AlchemyEngine(-) | FarmEngine(选种), AlchemyEngine(检查), main.ts |
| `breakthroughBuff` | PillConsumer(+), BreakthroughEngine(清零) | BreakthroughEngine(bonus), PillConsumer(上限), main.ts |
| `cultivateBoostBuff` | PillConsumer(+/倒计时/null) | PillConsumer(multiplier), IdleEngine(via multiplier) |
| `lifetimeStats` | IdleEngine, BreakthroughEngine, PillConsumer, AlchemyEngine | main.ts |
| `inGameWorldTime` | IdleEngine(+) | main.ts |
| `lastOnlineTime` | IdleEngine | SaveManager |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-ARCHITECTURE.md §2 拆出 |
| 2026-03-30 | Phase F0-α: +sect.ethos +sect.discipline; LiteGameState v3→v5 |
| 2026-04-01 | Phase J-Goal: +goals: PersonalGoal[]; LiteGameState v5→v6 |
