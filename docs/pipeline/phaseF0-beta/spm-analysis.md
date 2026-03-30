# Phase F0-β SPM 分析过程文档

> **日期**：2026-03-30 | **作者**：/SPM
> **状态**：分析中
> **前置**：Phase F0-α ✅（碰面世界已交付，存档 v5）

---

## Step 0：脚手架检查 ✅

- `docs/features/` ✅
- `docs/design/specs/` ✅
- `docs/verification/` ✅
- `scripts/` ✅
- `docs/pipeline/phaseF0-beta/` ✅ 已创建

---

## Step 1：第一性原理解构 + 价值锚定

### 1.0 需求债务检查

| FB# | 关联性 | 处理 |
|-----|--------|------|
| FB-010 | 行为结算断层 — 世界事件池是"外部刺激源"的首次引入 | **部分清偿** |
| FB-011 | 玩家干预权缺失 — 五级事件漏斗中 Lv.3/4 为裁决窗口打基础 | **间接推进** |

### 1a. 5-Why 根因链

```
为什么需要世界事件池？
→ 因为当前世界只有"弟子行为完成"这一种事件源
→ 为什么这不够？
→ 因为没有外部刺激，8 条弟子线仍然本质上是平行的
→ 碰面系统不是已经解决了平行线问题？
→ 碰面只是弟子间的双人互动，缺乏"世界级"的外部刺激（妖兽/散修/天材）
→ 为什么需要外部刺激？
→ 因为灵魂系统的高级场景（仇敌夺宝、群体防御）无法被现有事件源触发
→ 根因价值：世界事件池是灵魂系统所有"社会性场景"的验证基础设施
```

### 1b. Invariant 声明

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **事件池抽取结果不直接写 GameState** — 仅 emit 到 EventBus + MUD 日志 | 若事件直接修改状态，会与 Phase F（灵魂闭环）和 Phase H（裁决机制）耦合 |
| I2 | **事件等级只升不降** — Lv.N 事件可以升级为 Lv.N+1，但不可降级 | 若允许降级，Storyteller 的喘息期控制会失效 |
| I3 | **Storyteller 不创造事件，只调节概率** — Storyteller 影响事件池抽取的频率/权重，不凭空生成事件 | 若 Storyteller 直接创建事件，会脱离事件池枚举约束，产生不可控事件 |
| I4 | **Lv.0~1 事件纯规则引擎，不调 AI** — 频率约 1000/h，AI 参与会拖垮性能 | 性能灾难 |
| I5 | **事件池内容是完全可枚举的静态定义** — 运行时不动态创建事件模板 | 若允许动态定义，会失去可验证性和可预测性 |
| I6 | **Storyteller 张力指数 [0, 100] 闭区间** | 若未 clamp，可能出现负数张力或超大值导致概率计算异常 |

### 1c. 最小组件检验

**一个核心功能**：世界事件池的定期抽取 + emit 到 EventBus。

理由：五级漏斗和 Storyteller 是增强体验的上层逻辑，但没有事件池，这两者就无从谈起。事件池是"世界有新鲜事"的最小可行组件。

### 1d. 核心体验锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 挂机 15 分钟回来，看到"妖兽袭击后山，张清风与李墨染联手御敌"——世界不再只有流水账 |
| **5-Why 根因** | 此系统是灵魂系统"社会性场景"的唯一验证基础设施 |
| **最小组件** | 预定义事件池 + 定期抽取 + EventBus 发射 |
| **ROI** | 成本 **M** · 体验增量 **5/5** |
| **循环挂载** | 输入 → Storyteller 张力指数（宗门/弟子状态快照）；输出 → SoulEvent（world-event 系列）→ soul-engine 消费 |

---

## Step 2：规则与数值边界

### 2.1 业务实体 (C1)

#### R-F0β-E1: 事件严重度等级 EventSeverity（5 个成员）

| # | ID | 名称 | 频率目标/小时 | 玩家感知 | AI 参与 |
|---|-----|------|:-----:|---------|----|
| 0 | `BREATH` | 呼吸 | ~960 | 不显示或极淡 | ❌ 无 |
| 1 | `RIPPLE` | 涟漪 | ~60 | 普通日志行 | ❌ 无 |
| 2 | `SPLASH` | 浪花 | 6~12 | **高亮日志** | 🟡 仅独白渲染 |
| 3 | `STORM` | 风暴 | 2~4 | **弹窗通知** + 干预窗 | ✅ 决策+独白 |
| 4 | `CALAMITY` | 天劫 | 0~1 | **全屏事件** + 执法堂卷宗 | ✅ 决策+独白+选项 |

> **F0-β 实施范围**：Lv.0~2 全量实现，Lv.3 框架实现（无干预窗 UI，Phase H），Lv.4 仅定义数据、不实际抽取（Phase I）。

#### R-F0β-E2: 世界事件定义 WorldEventDef（12 个预定义事件）

| # | ID | 名称 | 基础等级 | 频率权重 | 范围 | 条件 |
|---|-----|------|:------:|:------:|------|------|
| 1 | `beast-attack-minor` | 小妖兽袭扰 | Lv.1 | 30 | 单人 | 弟子在 LING_SHOU_SHAN 或 BOUNTY_FIELD |
| 2 | `beast-attack-major` | 妖兽来袭 | Lv.2 | 10 | 多人 | ≥2 弟子在外 |
| 3 | `wanderer-visit` | 散修来访 | Lv.1 | 25 | 宗门 | 无 |
| 4 | `wanderer-trade` | 散修交易 | Lv.2 | 8 | 宗门 | sect.spiritStones ≥ 50 |
| 5 | `treasure-discovery` | 天材地宝现世 | Lv.2 | 5 | 单人 | 弟子在 LING_SHOU_SHAN |
| 6 | `herb-bloom` | 灵草异变 | Lv.1 | 20 | 宗门 | farmPlots.length > 0 |
| 7 | `sect-challenge` | 外宗挑战 | Lv.3 | 3 | 宗门 | sect.reputation ≥ 10 |
| 8 | `spirit-rain` | 灵气潮汐 | Lv.1 | 15 | 宗门 | 无 |
| 9 | `mysterious-visitor` | 神秘来客 | Lv.2 | 6 | 宗门 | inGameWorldTime ≥ 0.5 |
| 10 | `inner-conflict` | 宗门内讧 | Lv.2 | 5 | 多人 | ∃ rival 标签的关系对 |
| 11 | `auspicious-sign` | 祥瑞降临 | Lv.1 | 12 | 宗门 | 无 |
| 12 | `dark-omen` | 凶兆预警 | Lv.2 | 4 | 宗门 | sect.ethos > 20 |

> **道风权重调节**：在 Storyteller 中根据 `sect.ethos` 和 `sect.discipline` 调节部分事件的频率权重（见 §2.3 公式 F-F0β-04）。

#### R-F0β-E3: 事件范围 EventScope（3 个成员）

| ID | 说明 | 受影响弟子 |
|-----|------|-----------|
| `single` | 单人事件 | 随机选取一个满足条件的弟子 |
| `multi` | 多人事件 | 同地点的 ≥2 个弟子 |
| `sect` | 宗门事件 | 全部弟子（或随机 1~3 个代表） |

#### R-F0β-E4: 世界事件 SoulEventType 扩展（1 个新成员）

在现有 10 个 `SoulEventType` 基础上新增：

| 新增值 | 事件极性 | 说明 |
|--------|:-------:|------|
| `world-event` | `varies`（由具体事件定义的 polarity 决定） | 世界事件池通用类型 |

#### R-F0β-E5: 世界事件负载结构 WorldEventPayload

| 字段 | 类型 | 说明 |
|------|------|------|
| `eventDefId` | `string` | 事件定义 ID（指向 WorldEventDef） |
| `eventName` | `string` | 事件中文名 |
| `severity` | `EventSeverity` | 最终严重度（可能因升级而高于基础等级） |
| `scope` | `EventScope` | 事件范围 |
| `involvedDiscipleIds` | `string[]` | 涉及的弟子 ID 列表 |
| `location?` | `LocationTag` | 事件发生地点（单人/多人事件有值） |

#### R-F0β-E6: Storyteller 状态 StorytellerState

| 字段 | 类型 | 范围 | 说明 |
|------|------|------|------|
| `tensionIndex` | `number` | `[0, 100]` | 当前戏剧张力指数 |
| `lastStormTimestamp` | `number` | ms | 上次 Lv.3+ 事件时间戳 |
| `lastCalamityTimestamp` | `number` | ms | 上次 Lv.4 事件时间戳 |
| `eventHistory` | `SeverityHistoryEntry[]` | 最近 20 条 | 最近事件严重度历史（用于波峰波谷分析） |

> **StorytellerState 不持久化** — 重启后从默认值开始（与 encounter cooldownMap 同理），因为 Storyteller 的节奏控制应该基于实时运行状态。

---

### 2.2 产源与消耗

| 资源 | 产出来源 | 消耗去向 | 漏斗平衡 |
|------|---------|---------|:--------:|
| 世界事件 | world-event-tick handler + Storyteller 调频 | soul-event handler 消费 + MUD 日志 | ✅ 纯信息流，无通胀 |
| 张力指数 | 事件驱动（每次事件 +N） | 自然衰减 + 喘息期压制 | ✅ 自平衡 |

**结论**：F0-β 不引入任何新的经济资源，不影响现有产出→消耗漏斗。事件是纯信息流。

---

### 2.3 核心公式 (C3)

#### F-F0β-01: 世界事件抽取间隔

```
EVENT_TICK_INTERVAL_SEC = 30    // 每 30 秒抽取一次
```

每次抽取流程：
1. 计算当前有效事件池（过滤条件不满足的事件）
2. Storyteller 调节权重
3. 加权随机选取 0~1 个事件
4. 严重度升级判定
5. emit 到 EventBus + MUD 日志

#### F-F0β-02: Storyteller 张力指数计算

```typescript
function calculateTension(state: StorytellerState, gameState: LiteGameState, now: number): number {
  const timeSinceLastStorm = (now - state.lastStormTimestamp) / 1000; // 秒
  const timeSinceLastCalamity = (now - state.lastCalamityTimestamp) / 1000;
  
  // 时间因子：越久没出事，张力越高
  const timeFactor = Math.min(50, timeSinceLastStorm / 60 * 5); // 每分钟+5，上限50
  
  // 宗门繁荣度因子：越繁荣越容易引来事端
  const avgRealm = gameState.disciples.reduce((sum, d) => sum + d.realm, 0) / gameState.disciples.length;
  const wealthFactor = Math.min(20, (gameState.spiritStones / 500) * 10 + avgRealm * 5);
  
  // 关系冲突因子：最大 rival 对数
  const rivalPairs = gameState.relationships.filter(r => r.tags.includes('rival')).length;
  const conflictFactor = Math.min(20, rivalPairs * 10);
  
  // 近期事件历史衰减
  const recentHighEvents = state.eventHistory
    .filter(e => (now - e.timestamp) < 600_000) // 最近 10 分钟
    .filter(e => e.severity >= 2)
    .length;
  const cooldownPenalty = recentHighEvents * 15; // 每个近期高级事件减 15 张力
  
  return Math.max(0, Math.min(100, timeFactor + wealthFactor + conflictFactor - cooldownPenalty));
}
```

#### F-F0β-03: 事件抽取概率（基于张力指数）

```typescript
/**
 * 基础抽取概率 = 张力指数 / 100 * BASE_EVENT_CHANCE
 * BASE_EVENT_CHANCE = 0.40 (每 30 秒 40% 基础概率)
 * 有效概率 = tension/100 * 0.40
 * 
 * 张力=0 → 0% 概率（喘息期不出事）
 * 张力=50 → 20% 概率
 * 张力=100 → 40% 概率
 */
const BASE_EVENT_CHANCE = 0.40;
const effectiveChance = (tension / 100) * BASE_EVENT_CHANCE;
```

#### F-F0β-04: 道风权重调节

```typescript
function adjustWeightByAlignment(basWeight: number, eventDef: WorldEventDef, sect: SectState): number {
  // 部分事件受道风影响
  const ethosModifiers: Record<string, { ethosSign: number; factor: number }> = {
    'sect-challenge': { ethosSign: 1, factor: 0.5 },    // 霸道宗门更容易被挑战
    'dark-omen':      { ethosSign: 1, factor: 0.3 },    // 霸道宗门更容易出凶兆
    'wanderer-visit': { ethosSign: -1, factor: 0.3 },   // 仁道宗门更容易有散修来访
    'inner-conflict': { ethosSign: -1, factor: 0.4 },   // 放任门规→更容易内讧
    // discipline 也影响部分事件
  };
  
  const mod = ethosModifiers[eventDef.id];
  if (!mod) return baseWeight;
  
  // ethosSign=1 表示 ethos>0（霸道）时增加权重
  const ethosEffect = mod.ethosSign > 0 ? sect.ethos : -sect.ethos;
  const multiplier = 1 + (ethosEffect / 100) * mod.factor;
  return Math.max(1, Math.round(baseWeight * multiplier));
}
```

#### F-F0β-05: 严重度升级判定

从基础等级开始，逐级判定是否升级（最多升 1 级）：

```
升级条件（Lv.1 → Lv.2）：
  - 事件涉及 ≥2 弟子 && 其中有 friend 或 rival 对
  - 或 弟子 moral.goodEvil 差值 ≥ 40

升级条件（Lv.2 → Lv.3）：
  - 事件涉及 rival/grudge 标签对
  - 或 弟子 moral.goodEvil 差值 ≥ 60
  - 或 世界事件本身标记为 canEscalate

升级概率：20%（满足条件后还需过概率掷骰）
```

#### F-F0β-06: Storyteller 喘息期规则

```
Lv.3+ 事件后 → 强制喘息 STORM_COOLDOWN_SEC = 600（10 分钟）
  喘息期内：tension 每 tick 额外 -2，且不抽取 Lv.2+ 事件

Lv.4 事件后 → 强制喘息 CALAMITY_COOLDOWN_SEC = 1800（30 分钟）
  喘息期内：tension 强制压为 0，不抽取任何事件
```

#### F-F0β-07: 张力自然衰减

```
每秒衰减：tension -= TENSION_DECAY_PER_SEC = 0.2
（= 每分钟 -12，100 张力约 8 分钟自然归零）
```

#### F-F0β-08: 事件→张力贡献

```
| 事件等级 | 张力贡献 |
|:--------:|:--------:|
| Lv.0    | +0       |
| Lv.1    | +5       |
| Lv.2    | +15      |
| Lv.3    | +35      |
| Lv.4    | +50      |
```

---

### 2.4 阈值/标签表 (C4)

#### 张力区间与行为

| 张力区间 | 标签 | Storyteller 行为 |
|:--------:|------|-----------------|
| [0, 20) | 🌙 平静期 | 只抽 Lv.0~1 事件，概率极低 |
| [20, 50) | 🌤️ 日常期 | 正常抽取，Lv.0~2 |
| [50, 75) | ⚡ 紧张期 | 提升高级事件权重，可出 Lv.3 |
| [75, 100] | 🔥 高潮期 | 高级事件高概率，可出 Lv.4（Phase I） |

---

### 2.5 Fallback 文案库 (C5)

#### 世界事件 MUD 文案模板（每类 ≥3 条）

占位符：`{D}` = 弟子姓名，`{LOC}` = 地点中文名

**beast-attack-minor（小妖兽袭扰，Lv.1）**
| # | 模板 |
|---|------|
| 1 | `{D}在{LOC}遇到了一只小妖兽的骚扰，轻松将其赶走。` |
| 2 | `一只低阶妖兽在{LOC}附近徘徊，{D}提高了警觉。` |
| 3 | `{D}在{LOC}发现了妖兽的踪迹，所幸并无危险。` |

**beast-attack-major（妖兽来袭，Lv.2）**
| # | 模板 |
|---|------|
| 1 | `一头妖兽突袭{LOC}！{D}等弟子紧急迎战！` |
| 2 | `{LOC}传来妖兽咆哮，{D}等人立刻进入战斗状态。` |
| 3 | `妖兽突然出现在{LOC}，{D}等弟子奋力抵抗。` |

**wanderer-visit（散修来访，Lv.1）**
| # | 模板 |
|---|------|
| 1 | `一位云游散修路过宗门，在大殿略作停留。` |
| 2 | `有散修登门拜访，自称路过此地，想讨杯茶喝。` |
| 3 | `门外来了一位散修，面带风尘，似乎走了很远的路。` |

**wanderer-trade（散修交易，Lv.2）**
| # | 模板 |
|---|------|
| 1 | `一位散修带来了一些稀有材料，提出与宗门交易。` |
| 2 | `散修展示了一批罕见草药，询问宗门是否有意购买。` |
| 3 | `一位行商散修到访，摆出了一些平日难见的宝贝。` |

**treasure-discovery（天材地宝现世，Lv.2）**
| # | 模板 |
|---|------|
| 1 | `{D}在{LOC}发现了一株罕见灵草，散发着异香！` |
| 2 | `{D}在历练途中偶然发现了一处隐秘的宝物！` |
| 3 | `灵兽山深处传来异光，{D}循光而去，竟发现了天材地宝！` |

**herb-bloom（灵草异变，Lv.1）**
| # | 模板 |
|---|------|
| 1 | `灵田中有一株灵草突然散发出璀璨灵光，似乎品质提升了。` |
| 2 | `灵田传来阵阵清香，有灵草发生了异变。` |
| 3 | `灵田角落的一株灵草似乎吸收了多余灵气，长势格外喜人。` |

**sect-challenge（外宗挑战，Lv.3）**
| # | 模板 |
|---|------|
| 1 | `一个陌生宗门派来弟子，公然在门口叫阵挑战！` |
| 2 | `宗门外传来挑衅之声，有外宗弟子前来踢馆！` |
| 3 | `一群不速之客到访宗门，声称要试试我宗弟子的本事。` |

**spirit-rain（灵气潮汐，Lv.1）**
| # | 模板 |
|---|------|
| 1 | `天地灵气微微波动，弟子们感到修炼效率略有提升。` |
| 2 | `一阵灵气涌动掠过宗门上空，片刻即逝。` |
| 3 | `灵脉深处传来轻微震动，灵气浓度似乎有所变化。` |

**mysterious-visitor（神秘来客，Lv.2）**
| # | 模板 |
|---|------|
| 1 | `一个神秘人出现在宗门附近，来历不明，目的未知。` |
| 2 | `一位蒙面修士在宗门外徘徊，弟子们纷纷议论其身份。` |
| 3 | `深夜宗门禁制感应到一道异样气息，似有高人经过。` |

**inner-conflict（宗门内讧，Lv.2）**
| # | 模板 |
|---|------|
| 1 | `宗门内近日气氛紧张，弟子们似乎就某事产生了分歧。` |
| 2 | `{D}等弟子之间的矛盾似乎在加深，隐隐有内讧的苗头。` |
| 3 | `宗门内部暗流涌动，有弟子开始私下拉帮结派。` |

**auspicious-sign（祥瑞降临，Lv.1）**
| # | 模板 |
|---|------|
| 1 | `宗门上空出现一道祥瑞之光，弟子们精神一振。` |
| 2 | `后山灵泉微微涌动，似有祥兆显现。` |
| 3 | `一只灵鹤在宗门上空盘旋三圈后离去，被视为吉兆。` |

**dark-omen（凶兆预警，Lv.2）**
| # | 模板 |
|---|------|
| 1 | `灵脉突然震动了一下，有弟子感到一丝不安。` |
| 2 | `今晚的月色格外诡异，老弟子说这可能是不祥之兆。` |
| 3 | `宗门护山阵法微微闪烁，似乎感应到了远方的异动。` |

---

### 2.6 效果数值表 (C6)

#### 世界事件对灵魂系统的影响

> **F0-β 阶段**：世界事件仅产出 SoulEvent 到 EventBus，具体的 affinity/moral 变化由现有 soul-engine 的 fallback 规则引擎处理。F0-β 不新增灵魂变化规则。

| 事件等级 | soul-engine 消费方式 | 影响 |
|:--------:|--------------------|------|
| Lv.0 呼吸 | 不发射 SoulEvent | 无 |
| Lv.1 涟漪 | 发射 `world-event`，soul-engine 评估全弟子 | 微弱情绪波动 (intensity=1) |
| Lv.2 浪花 | 发射 `world-event`，soul-engine 评估涉及弟子 | 中等情绪波动 (intensity=1~2) |
| Lv.3 风暴 | 发射 `world-event`，soul-engine 评估涉及弟子 | 较强情绪波动 (intensity=2~3) |

---

### 2.7 TickPipeline 挂载设计

| Phase 值 | Handler 名 | 说明 |
|:--------:|-----------|------|
| **605** | `world-event-tick` | 世界事件抽取（在 DISCIPLE_AI:600 之后、ENCOUNTER:610 之前） |

选择 605 的理由：
- 弟子行为已确定（600），事件可基于弟子当前地点判断条件
- 在碰面检定（610）之前，两个系统产出的事件可在同一个 tick 被 soul-event（625）消费

---

### 2.8 持久化考量

| 数据 | 是否持久化 | 说明 |
|------|:---------:|------|
| `WorldEventDef` 注册表 | ❌ 否 | 静态代码定义 |
| `StorytellerState` | ❌ 否 | 运行时状态，重启后重置 |
| `EventSeverity` 枚举 | ❌ 否 | 类型定义 |
| 存档版本 | **不变 v5** | F0-β 不新增持久化字段 |

**重大设计决策**：F0-β **不增加存档版本**。Storyteller 是纯运行时状态，不需要迁移。

---

### 2.9 MECE 校验

| 维度 | 独立性 | 穷尽性 |
|------|--------|--------|
| 事件严重度 | ✅ 5 级互斥 | ✅ 每个事件都有且仅有一个等级 |
| 事件范围 | ✅ 3 类互斥 | ✅ 每个事件都有且仅有一个范围 |
| 张力区间 | ✅ 4 个区间无重叠 | ✅ [0, 100] 完全覆盖 |
| 世界事件池 | ✅ 12 个事件 ID 唯一 | ✅ 覆盖宗内/宗外/自然/人为 四类 |

---

## Step 2.5：规格深度自检门禁

| C# | 检查项 | 状态 | 证据锚点 |
|----|--------|:----:|---------|
| C1 | 实体全量枚举 | ✅ | §2.1 R-F0β-E1（5级），R-F0β-E2（12事件），R-F0β-E3（3范围），R-F0β-E5（6字段），R-F0β-E6（4字段） |
| C2 | 规则映射表 | ✅ | §2.3 F-F0β-03（张力→概率），F-F0β-05（升级条件表），F-F0β-08（等级→张力贡献表） |
| C3 | 公式全参数 | ✅ | §2.3 F-F0β-01~08 共 8 个公式，含全部常量和边界值 |
| C4 | 阈值/标签表 | ✅ | §2.4 张力区间表（4区间），§2.3 F-F0β-06 喘息期阈值表 |
| C5 | Fallback 文案 | ✅ | §2.5 全部 12 个事件 × 每类 ≥3 条模板 |
| C6 | 效果数值表 | ✅ | §2.6 事件等级→soul-engine 影响表 |

**自检结论**：C1~C6 全部 ✅，可进入 Step 3。

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-30 | 初始创建：SPM 分析过程文档 |
