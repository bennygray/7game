# Phase F0-β: 活世界 — PRD

> **版本**：v1.0 | **维护者**：/SPM | **日期**：2026-03-30
> **状态**：GATE 1 审阅中
> **关联里程碑**：SOUL-VISION-ROADMAP V3.1 · Phase F0-β
> **前置**：Phase F0-α ✅（碰面世界已交付，存档 v5，encounter-tick handler）

---

## §1 系统不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **世界事件不直接写 GameState** — 仅 emit 到 EventBus + MUD 日志 | 若事件直接修改状态，会与 Phase F（灵魂闭环）和 Phase H（裁决机制）产生耦合 |
| I2 | **事件等级只升不降** — Lv.N 可升为 Lv.N+1，不可降级 | 若允许降级，Storyteller 喘息期控制失效 |
| I3 | **Storyteller 不创造事件，只调节概率** — 影响事件池抽取频率/权重 | 若 Storyteller 直接生成事件，脱离事件池枚举约束，产生不可控事件 |
| I4 | **Lv.0~1 事件纯规则引擎，不调 AI** — ~1000/h 频率，AI 参与会拖垮性能 | 性能灾难 |
| I5 | **事件池是完全可枚举的静态定义** — 运行时不动态创建事件模板 | 若动态定义，失去可验证性和可预测性 |
| I6 | **张力指数 `[0, 100]` 闭区间，写入时必须 clamp** | 若未 clamp，概率计算异常 |

---

## §2 价值锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 挂机 15 分钟回来，看到「妖兽袭击后山，张清风与李墨染联手御敌」——世界不再只有流水账 |
| **5-Why 根因** | 此系统是灵魂系统"社会性场景"的唯一验证基础设施，没有外部事件源则灵魂系统无法验证高级场景 |
| **最小组件** | 预定义事件池 + 定期抽取 + EventBus 发射 |
| **ROI** | 成本 **M** · 体验增量 **5/5** |
| **循环挂载** | 输入：Storyteller 张力指数（宗门/弟子状态快照）→ 调节抽取频率；输出：SoulEvent 系列 → 被 soul-engine 消费 + MUD 日志输出 |

### 需求债务关联

| FB# | 关联性 | 处理 |
|-----|--------|------|
| FB-010 | 行为结算断层 — 世界事件池是"外部刺激源"的首次引入 | 部分清偿 |
| FB-011 | 玩家干预权缺失 — Lv.3 事件为裁决窗口打基础 | 间接推进（Phase H 实现 UI） |

---

## §3 规则与数值边界

### 3.1 业务实体 (C1)

#### R-F0β-E1: 事件严重度等级 EventSeverity（5 个成员）

| # | 值 | ID | 名称 | 频率目标/h | 玩家感知 | AI | F0-β 范围 |
|---|:--:|-----|------|:---------:|---------|----|:---------:|
| 0 | 0 | `BREATH` | 呼吸 | ~960 | 不显示 | ❌ | ✅ 对应现有 Lv.0 |
| 1 | 1 | `RIPPLE` | 涟漪 | ~60 | 普通日志行 | ❌ | ✅ 实现 |
| 2 | 2 | `SPLASH` | 浪花 | 6~12 | **高亮日志** | 🟡 | ✅ 实现 |
| 3 | 3 | `STORM` | 风暴 | 2~4 | **弹窗通知** | ✅ | 🟡 框架实现 |
| 4 | 4 | `CALAMITY` | 天劫 | 0~1 | **全屏事件** | ✅ | ❌ 仅定义，不抽取 |

> **F0-β 范围界定**：Lv.0~2 全量实现，Lv.3 框架实现（事件抽取 + EventBus + MUD 日志，但无干预窗 UI），Lv.4 仅在类型定义中保留占位。

#### R-F0β-E2: 世界事件定义 WorldEventDef（12 个预定义事件）

| # | ID | 名称 | 基础等级 | 频率权重 | 范围 | 前提条件 | 极性 | 可升级 |
|---|-----|------|:------:|:------:|:----:|----------|:----:|:------:|
| 1 | `beast-attack-minor` | 小妖兽袭扰 | 1 | 30 | `single` | ∃弟子 in LING_SHOU_SHAN ∨ BOUNTY_FIELD | negative | ❌ |
| 2 | `beast-attack-major` | 妖兽来袭 | 2 | 10 | `multi` | ≥2弟子 in (LING_SHOU_SHAN ∨ BOUNTY_FIELD ∨ BACK_MOUNTAIN) | negative | ✅→3 |
| 3 | `wanderer-visit` | 散修来访 | 1 | 25 | `sect` | 无 | positive | ❌ |
| 4 | `wanderer-trade` | 散修交易 | 2 | 8 | `sect` | spiritStones ≥ 50 | positive | ❌ |
| 5 | `treasure-discovery` | 天材地宝现世 | 2 | 5 | `single` | ∃弟子 in LING_SHOU_SHAN | positive | ✅→3 |
| 6 | `herb-bloom` | 灵草异变 | 1 | 20 | `sect` | ∃弟子.farmPlots.length > 0 | positive | ❌ |
| 7 | `sect-challenge` | 外宗挑战 | 3 | 3 | `sect` | sect.reputation ≥ 10 | negative | ❌ |
| 8 | `spirit-rain` | 灵气潮汐 | 1 | 15 | `sect` | 无 | positive | ❌ |
| 9 | `mysterious-visitor` | 神秘来客 | 2 | 6 | `sect` | inGameWorldTime ≥ 0.5 | neutral | ✅→3 |
| 10 | `inner-conflict` | 宗门内讧 | 2 | 5 | `multi` | ∃rival 标签关系对 | negative | ✅→3 |
| 11 | `auspicious-sign` | 祥瑞降临 | 1 | 12 | `sect` | 无 | positive | ❌ |
| 12 | `dark-omen` | 凶兆预警 | 2 | 4 | `sect` | sect.ethos > 20 | negative | ❌ |

#### R-F0β-E3: 事件范围 EventScope（3 个成员）

| ID | 说明 | 受影响弟子选取 |
|-----|------|---------------|
| `single` | 单人事件 | 随机选取 1 个满足地点条件的弟子 |
| `multi` | 多人事件 | 同地点的 ≥2 个弟子 |
| `sect` | 宗门事件 | 全部弟子 |

#### R-F0β-E4: SoulEventType 扩展（1 个新成员）

| 新增值 | 事件极性 | 说明 |
|--------|:-------:|------|
| `world-event` | 由 `WorldEventDef.polarity` 决定 | 世界事件池通用事件类型 |

> 极性映射：`positive` → soul-engine 正面评估路径，`negative` → 负面路径，`neutral` → 参照 `meditation` 路径

#### R-F0β-E5: WorldEventPayload（事件元数据）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `eventDefId` | `string` | ✅ | 事件定义 ID |
| `eventName` | `string` | ✅ | 事件中文名 |
| `severity` | `EventSeverity` | ✅ | 最终严重度 |
| `scope` | `EventScope` | ✅ | 事件范围 |
| `involvedDiscipleIds` | `string[]` | ✅ | 涉及弟子 ID |
| `location` | `LocationTag \| null` | ✅ | 事件地点（sect 范围时为 null） |
| `polarity` | `SoulEventPolarity` | ✅ | 正/负极性 |

#### R-F0β-E6: StorytellerState（运行时状态，不持久化）

| 字段 | 类型 | 初始值 | 说明 |
|------|------|:------:|------|
| `tensionIndex` | `number` | `30` | 当前张力 [0, 100] |
| `lastStormTimestamp` | `number` | `0` | 上次 Lv.3+ 时间 |
| `lastCalamityTimestamp` | `number` | `0` | 上次 Lv.4 时间 |
| `eventHistory` | `{severity, timestamp}[]` | `[]` | 最近 20 条事件记录 |

---

### 3.2 产源与消耗

| 资源 | 产出来源 | 消耗去向 | 漏斗平衡 |
|------|---------|---------|:--------:|
| 世界事件 | world-event-tick handler | soul-event handler + MUD 日志 | ✅ 纯信息流 |
| 张力指数 | 事件驱动 +N | 自然衰减 + 喘息期 | ✅ 自平衡 |

**结论**：F0-β 不引入经济资源，不影响产出→消耗漏斗。

---

### 3.3 核心公式 (C3)

#### F-F0β-01: 世界事件扫描间隔

| 参数 | 值 | 说明 |
|------|------|------|
| `WORLD_EVENT_INTERVAL_SEC` | `30` | 每 30 秒尝试抽取一次世界事件 |

#### F-F0β-02: Storyteller 张力指数计算

```typescript
function calculateTension(
  storyteller: StorytellerState,
  gameState: LiteGameState,
  now: number,
): number {
  const timeSinceLastStorm = (now - storyteller.lastStormTimestamp) / 1000;
  
  // 因子1: 时间（越久没出事→张力越高）
  // 每分钟 +5，上限 50
  const timeFactor = Math.min(50, timeSinceLastStorm / 60 * 5);
  
  // 因子2: 宗门繁荣度（spiritStones + 弟子平均境界）
  const avgRealm = gameState.disciples.reduce((s, d) => s + d.realm, 0) / gameState.disciples.length;
  const wealthFactor = Math.min(20, (gameState.spiritStones / 500) * 10 + avgRealm * 5);
  
  // 因子3: 关系冲突（rival 对数）
  const rivalPairs = gameState.relationships.filter(r => r.tags.includes('rival')).length;
  const conflictFactor = Math.min(20, rivalPairs * 10);
  
  // 减分: 近期高级事件惩罚
  const recentHigh = storyteller.eventHistory
    .filter(e => (now - e.timestamp) < 600_000 && e.severity >= 2).length;
  const cooldownPenalty = recentHigh * 15;
  
  return Math.max(0, Math.min(100, timeFactor + wealthFactor + conflictFactor - cooldownPenalty));
}
```

**参数总表**：

| 参数 | 值 | 作用 |
|------|------|------|
| 时间因子速率 | +5/分钟 | 控制无事件时张力上升速度 |
| 时间因子上限 | 50 | 防止长期无事件时张力永远满格 |
| 繁荣因子上限 | 20 | 宗门等级不过度影响事件密度 |
| 冲突因子上限 | 20 | 关系不过度影响事件密度 |
| 近期事件惩罚 | -15/个 | 控制事件密集期的降温力度 |
| 近期事件窗口 | 10 分钟 | 惩罚时效 |

#### F-F0β-03: 事件抽取概率

```typescript
const BASE_EVENT_CHANCE = 0.40;
const effectiveChance = (tension / 100) * BASE_EVENT_CHANCE;

// tension=0   → 0%   (喘息期不出事)
// tension=30  → 12%  (初始状态，约4分钟一个事件)
// tension=50  → 20%  (日常，约2.5分钟一个事件)
// tension=100 → 40%  (高潮期，约1.25分钟一个事件)
```

#### F-F0β-04: 道风权重调节

```typescript
const ETHOS_WEIGHT_MODIFIERS: Record<string, { field: 'ethos' | 'discipline'; sign: number; factor: number }> = {
  'sect-challenge':   { field: 'ethos',      sign: +1, factor: 0.5 },  // 霸道→被挑战多
  'dark-omen':        { field: 'ethos',      sign: +1, factor: 0.3 },  // 霸道→凶兆多
  'wanderer-visit':   { field: 'ethos',      sign: -1, factor: 0.3 },  // 仁道→散修来访多
  'auspicious-sign':  { field: 'ethos',      sign: -1, factor: 0.3 },  // 仁道→祥瑞多
  'inner-conflict':   { field: 'discipline', sign: -1, factor: 0.4 },  // 放任→内讧多
};

function adjustWeight(baseWeight: number, eventId: string, sect: SectState): number {
  const mod = ETHOS_WEIGHT_MODIFIERS[eventId];
  if (!mod) return baseWeight;
  const axisValue = sect[mod.field]; // [-100, +100]
  const effect = mod.sign > 0 ? axisValue : -axisValue; // 使正值=增加权重
  const multiplier = 1 + (effect / 100) * mod.factor;
  return Math.max(1, Math.round(baseWeight * multiplier));
}
```

#### F-F0β-05: 严重度升级判定

仅 `canEscalate === true` 的事件参与升级判定（最多升 1 级）。

```typescript
const ESCALATION_CHANCE = 0.20;  // 满足条件后 20% 概率升级

// Lv.1 → Lv.2 条件:
//   involvedDisciples.length >= 2 AND 其中有 friend 或 rival 标签对
// Lv.2 → Lv.3 条件:
//   ∃ rival/grudge 标签对 OR moral.goodEvil 差值 ≥ 60
```

#### F-F0β-06: 喘息期规则

| 触发 | 喘息时长 | 效果 |
|------|:--------:|------|
| Lv.3 事件后 | `STORM_COOLDOWN_SEC = 600` (10分钟) | 不抽取 Lv.2+ 事件 |
| Lv.4 事件后 | `CALAMITY_COOLDOWN_SEC = 1800` (30分钟) | 不抽取任何事件 |

#### F-F0β-07: 张力自然衰减

| 参数 | 值 | 说明 |
|------|------|------|
| `TENSION_DECAY_PER_SEC` | `0.2` | 每秒自然衰减 0.2 |
| 等效 | -12/分钟 | 100 张力约 8 分钟归零（无事件输入时） |

#### F-F0β-08: 事件→张力贡献

| 事件等级 | 张力贡献 |
|:--------:|:--------:|
| Lv.0 BREATH | +0 |
| Lv.1 RIPPLE | +5 |
| Lv.2 SPLASH | +15 |
| Lv.3 STORM | +35 |
| Lv.4 CALAMITY | +50 |

---

### 3.4 MECE 校验

| 维度 | 独立性 | 穷尽性 |
|------|--------|--------|
| 事件严重度 | ✅ 5 级互斥 | ✅ 所有事件恰好一个等级 |
| 事件范围 | ✅ 3 类互斥 | ✅ 所有事件恰好一个范围 |
| 张力区间 | ✅ 4 区间无重叠 | ✅ [0, 100] 完全覆盖 |
| 世界事件池 | ✅ 12 个 ID 唯一 | ✅ 覆盖 宗内/宗外/自然/人为 |
| 道风调节 | ✅ 5 个事件受影响 | ✅ 其余 7 个不受影响 |

---

### 3.5 持久化考量

| 数据 | 是否持久化 | 说明 |
|------|:---------:|------|
| `WorldEventDef` 注册表 | ❌ | 静态代码定义 |
| `StorytellerState` | ❌ | 运行时状态，重启重置 |
| `EventSeverity` | ❌ | 类型定义 |
| 存档版本 | **不变 v5** | F0-β 不新增持久化字段 |

> **设计决策**：F0-β 不增加存档版本。Storyteller 是纯运行时状态。

---

### 3.6 TickPipeline 挂载

| Phase 值 | Handler | 说明 |
|:--------:|---------|------|
| **605** | `world-event-tick` | 世界事件抽取（DISCIPLE_AI:600 → **605** → ENCOUNTER:610） |

**理由**：弟子行为已确定（600），可基于弟子当前地点判断事件前提条件；在碰面检定（610）之前运行，两个系统的事件可在同 tick 被 soul-event（625）统一消费。

---

## §4 Fallback 文案库 (C5)

### 4.1 世界事件 MUD 文案模板（12 类 × ≥3 条）

占位符：`{D}` = 弟子姓名，`{D2}` = 第二弟子，`{LOC}` = 地点中文名

#### `beast-attack-minor` 小妖兽袭扰 (Lv.1)

| # | 模板 |
|---|------|
| 1 | `{D}在{LOC}遇到了一只小妖兽的骚扰，轻松将其赶走。` |
| 2 | `一只低阶妖兽在{LOC}附近徘徊，{D}提高了警觉。` |
| 3 | `{D}在{LOC}发现了妖兽的踪迹，所幸并无危险。` |

#### `beast-attack-major` 妖兽来袭 (Lv.2)

| # | 模板 |
|---|------|
| 1 | `一头妖兽突袭{LOC}！{D}与{D2}紧急迎战！` |
| 2 | `{LOC}传来妖兽咆哮，{D}等人立刻进入战斗状态。` |
| 3 | `妖兽突然出现在{LOC}，{D}与{D2}奋力抵抗。` |

#### `wanderer-visit` 散修来访 (Lv.1)

| # | 模板 |
|---|------|
| 1 | `一位云游散修路过宗门，在大殿略作停留。` |
| 2 | `有散修登门拜访，自称路过此地，想讨杯茶喝。` |
| 3 | `门外来了一位散修，面带风尘，似乎走了很远的路。` |

#### `wanderer-trade` 散修交易 (Lv.2)

| # | 模板 |
|---|------|
| 1 | `一位散修带来了一些稀有材料，提出与宗门交易。` |
| 2 | `散修展示了一批罕见草药，询问宗门是否有意购买。` |
| 3 | `一位行商散修到访，摆出了一些平日难见的宝贝。` |

#### `treasure-discovery` 天材地宝现世 (Lv.2)

| # | 模板 |
|---|------|
| 1 | `{D}在{LOC}发现了一株罕见灵草，散发着异香！` |
| 2 | `{D}在历练途中偶然发现了一处隐秘的宝物！` |
| 3 | `灵兽山深处传来异光，{D}循光而去，竟发现了天材地宝！` |

#### `herb-bloom` 灵草异变 (Lv.1)

| # | 模板 |
|---|------|
| 1 | `灵田中有一株灵草突然散发出璀璨灵光，似乎品质提升了。` |
| 2 | `灵田传来阵阵清香，有灵草发生了异变。` |
| 3 | `灵田角落的一株灵草似乎吸收了多余灵气，长势格外喜人。` |

#### `sect-challenge` 外宗挑战 (Lv.3)

| # | 模板 |
|---|------|
| 1 | `⚡ 一个陌生宗门派来弟子，公然在门口叫阵挑战！` |
| 2 | `⚡ 宗门外传来挑衅之声，有外宗弟子前来踢馆！` |
| 3 | `⚡ 一群不速之客到访宗门，声称要试试我宗弟子的本事。` |

#### `spirit-rain` 灵气潮汐 (Lv.1)

| # | 模板 |
|---|------|
| 1 | `天地灵气微微波动，弟子们感到修炼效率略有提升。` |
| 2 | `一阵灵气涌动掠过宗门上空，片刻即逝。` |
| 3 | `灵脉深处传来轻微震动，灵气浓度似乎有所变化。` |

#### `mysterious-visitor` 神秘来客 (Lv.2)

| # | 模板 |
|---|------|
| 1 | `一个神秘人出现在宗门附近，来历不明，目的未知。` |
| 2 | `一位蒙面修士在宗门外徘徊，弟子们纷纷议论其身份。` |
| 3 | `深夜宗门禁制感应到一道异样气息，似有高人经过。` |

#### `inner-conflict` 宗门内讧 (Lv.2)

| # | 模板 |
|---|------|
| 1 | `宗门内近日气氛紧张，弟子们似乎就某事产生了分歧。` |
| 2 | `{D}与{D2}之间的矛盾似乎在加深，隐隐有内讧的苗头。` |
| 3 | `宗门内部暗流涌动，有弟子开始私下拉帮结派。` |

#### `auspicious-sign` 祥瑞降临 (Lv.1)

| # | 模板 |
|---|------|
| 1 | `宗门上空出现一道祥瑞之光，弟子们精神一振。` |
| 2 | `后山灵泉微微涌动，似有祥兆显现。` |
| 3 | `一只灵鹤在宗门上空盘旋三圈后离去，被视为吉兆。` |

#### `dark-omen` 凶兆预警 (Lv.2)

| # | 模板 |
|---|------|
| 1 | `灵脉突然震动了一下，有弟子感到一丝不安。` |
| 2 | `今晚的月色格外诡异，老弟子说这可能是不祥之兆。` |
| 3 | `宗门护山阵法微微闪烁，似乎感应到了远方的异动。` |

---

## §5 User Stories 索引

| 文件 | Phase | Story 数 | 覆盖范围 |
|------|:-----:|:--------:|---------|
| `phaseF0-beta-user-stories.md` | F0-β | 6 | 事件池+漏斗+Storyteller+日志+集成+验收 |

---

## §6 验收标准

> 来自 SOUL-VISION-ROADMAP V3.1 Phase F0-β 验收清单

| # | 验收标准 | 验证方式 |
|---|---------|---------|
| AC-1 | 运行 15 分钟内自然产生 ≥3 个 Lv.2 事件 | 验证脚本 + MUD 日志统计 |
| AC-2 | 运行 30 分钟内自然产生 ≥1 个 Lv.3 事件 | 验证脚本 + MUD 日志统计 |
| AC-3 | Storyteller 能观测到清晰的波峰波谷节奏 | 张力指数日志 + 事件分布图 |
| AC-4 | 道风偏仁的宗门散修来访频率显著高于霸道宗门 | 对比测试（ethos=-40 vs ethos=+40） |
| AC-5 | 回归验证通过：64 条现有测试 + F0-β 专项测试 | regression-all.ts + verify-phaseF0-beta.ts |
| AC-6 | 性能：无明显 CPU 开销增加（< 1ms/tick） | 性能日志 |

---

## §7 Pre-Mortem 分析

| # | 失败原因 | 预警信号 | 缓解措施 | 风险 |
|---|---------|---------|---------|:----:|
| 1 | 事件刷屏——世界事件 + 碰面事件同时输出导致日志爆炸 | 1 分钟内 > 10 条高亮日志 | 30 秒抽取间隔 + Storyteller 喘息期 + 日志分级过滤 | 🟡 |
| 2 | 事件太少——玩家感知不到世界在发生事 | 15 分钟内 0 条 Lv.2 事件 | 初始张力=30 保证开局就有事件；可调低 BASE_EVENT_CHANCE | 🟡 |
| 3 | Storyteller 张力震荡——快速上升后立刻被喘息期压下再上升 | 张力指数高频锯齿波 | 衰减率 0.2/s 足够平缓；近期事件惩罚 -15/个 提供缓冲 | 🟢 |
| 4 | 道风调节感知不到——权重调节幅度太小 | 仁道和霸道宗门事件分布无区别 | factor 参数可调（0.3~0.5），必要时提高至 0.8 | 🟡 |
| 5 | soul-engine 受压——每次世界事件对 8 弟子全评估导致日志过多 | 一次事件产出 8 条灵魂日志 | sect 范围事件只对 1~3 个"代表弟子" 评估 | 🟢 |

---

## §8 假设审计

| # | 假设 | 错误后果 | 风险 | 验证方式 | 何时验证 |
|---|------|---------|:----:|---------|---------:|
| 1 | 30 秒抽取间隔 + 张力驱动概率能产出合理事件密度 | 过多或过少 | 🟡 | 运行 15 分钟统计事件数/分钟 | SGE 集成测试 |
| 2 | 张力公式的三因子权重分配合理 | 张力永远太高或太低 | 🟡 | 运行 1 小时观察张力曲线 | SGE 集成测试 |
| 3 | 12 个预定义事件足以覆盖"活世界"感 | 事件重复感太强 | 🟡 | 每类 ≥3 条文案；未来 Phase I 扩展事件池 | SGE + 人工体验 |
| 4 | SoulEventType 扩展不会破坏现有 emotionPool 映射 | soul-engine 对 world-event 类型无候选情绪 | 🟢 | 需为 world-event 添加 emotion-pool 映射条目 | SGA TDD |

---

## §9 Party Review 报告

*（待 Step 3 User Stories 完成后执行）*

---

## §10 USER Approval

- [ ] USER 已审阅 PRD 内容
- [ ] USER 已确认 User Stories
- [ ] Party Review 无 BLOCK 项

签章：`[ ] GATE 1 PENDING`

---

## 变更日志

| 日期 | 级别 | 变更内容 | 影响范围 | 批准人 |
|------|------|---------|---------|--------|
| 2026-03-30 | 初版 | /SPM 完成 Phase F0-β PRD v1.0 | — | — |
