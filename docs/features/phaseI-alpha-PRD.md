# Phase I-alpha PRD — 因果引擎 + 高级关系标签

> **版本**：v1.0 | **日期**：2026-04-01
> **角色**：/SPM（Gate 1）
> **前置**：Phase IJ ✅（类型桩）+ Phase J-Goal ✅（目标系统）+ Phase F0 ✅（世界骨架）
> **状态**：Draft

---

## §1 产品定位

### 1.1 一句话定义

> 让弟子之间因为恩怨、道德、宗门立场而**自然产生因果事件**，并通过高级标签（师徒/宿怨/仰慕）让关系更丰富可见。

### 1.2 核心假设

1. 因果事件能让世界从"随机事件发生器"变为"有因有果的活世界"
2. 高级标签为关系增加可见性和叙事层次
3. 6 条因果规则 + 3 个高级标签足以产生足够戏剧性（MVP 验证量）

### 1.3 成功指标

| 指标 | 目标 | 验证方式 |
|------|------|---------|
| 因果事件频率 | 运行 30 分钟自然触发 ≥3 个因果事件 | Monte Carlo N=1000 |
| 无事件洪水 | 同一规则+对同一对 5 分钟内不重复触发 | 验证脚本断言 |
| 高级标签赋予 | 满足条件时 100% 正确赋予/移除 | 验证脚本断言 |
| 零回归 | 64/64 回归测试通过 | npm run test:regression |

---

## §2 第一性原理

### 2.1 5-Why 根因

> 为什么需要因果引擎？→ 弟子行为缺乏因果关联
> → 为什么需要因果关联？→ 没有因果，世界事件是随机的
> → 为什么不能随机？→ 随机让弟子像NPC而非活人
> → 为什么弟子需要像活人？→ 核心假设：AI灵智弟子构成核心乐趣
> → **根因：让关系数据驱动可感知的行为后果，闭合"数据→事件→感知"的循环**

### 2.2 Invariant

| # | 不变量 | 违反后果 |
|---|--------|---------|
| INV-1 | 因果事件通过 EventBus 传递，不直接写 GameState | 绕过 soul-engine 仲裁 |
| INV-2 | 每次因果扫描最多触发 1 个事件 | 事件洪水 |
| INV-3 | 冷却状态为运行时 Map，不持久化 | 存档膨胀 |
| INV-4 | 因果规则静态注册，只增不删 | 平衡失控 |
| INV-5 | 高级标签由 soul-engine updateRelationshipTags() 统一管理 | 逻辑分散 |
| INV-6 | 因果规则条件为纯函数（只读 GameState） | 副作用 |

### 2.3 最小组件

CausalRuleEvaluator 条件匹配 + SoulEvent 发射。

### 2.4 核心体验

| 维度 | 值 |
|------|---|
| 核心体验 | 弟子因恩怨/道德/立场自然产生戏剧冲突，玩家能追溯因果 |
| ROI | M / 4.5 — 填补 P0 世界层断裂 |
| 循环挂载 | 因果事件→SoulEvent→情绪+关系变化→影响下次因果触发 |

---

## §3 需求债务关联

| FB# | 描述 | 本 Phase 处置 |
|-----|------|:------------:|
| FB-010 | 行为结算断层 | 🔶 部分清偿（因果事件=关系→后果的结算） |
| FB-007 | 关系衰减分层 | — 不直接清偿，高级标签提供数据基础 |
| FB-008 | 关系确认机制 | — mentor/grudge 是"确认关系"雏形 |

---

## §4 业务实体

### 4.1 实体枚举

| 实体 | 定义 | 来源 |
|------|------|------|
| CausalTriggerType | 6 种触发类型 | `causal-event.ts` L8-14（已存在） |
| CausalRule | 因果规则定义 | `causal-event.ts` L17-31（已存在） |
| CausalCooldownState | 冷却状态 | `causal-event.ts` L34-38（已存在） |
| RelationshipTag | 5 种标签（friend/rival + **mentor/admirer/grudge**） | `soul.ts` L173（已存在，mentor/admirer/grudge 未实现赋予逻辑） |
| SoulEventType | 现有 11 种 + 新增 6 种因果事件类型 | `soul.ts` L90-101（待扩展） |

### 4.2 新增 SoulEventType（6 种）

| 事件类型 | 中文名 | 极性 | 说明 |
|----------|--------|:----:|------|
| `causal-provoke` | 因果·挑衅 | negative | 仇人同地主动挑衅 |
| `causal-gift` | 因果·赠礼 | positive | 至交同地赠送灵草/丹药 |
| `causal-theft` | 因果·窃取 | negative | 邪恶弟子窃取宗门灵石 |
| `causal-jealousy` | 因果·嫉妒 | negative | 对手突破后嫉妒发作 |
| `causal-seclusion` | 因果·闭关 | positive | 连败后退守闭关 |
| `causal-ethos-clash` | 因果·道风冲突 | negative | 弟子立场与宗门道风抵触 |

---

## §5 规则与数值边界

### 5.1 因果规则注册表（R-Iα-01）

**扫描间隔**：`CAUSAL_SCAN_INTERVAL_TICKS = 300`（≈5 分钟，每 tick ≈ 1 秒）
**每次扫描上限**：1 个事件（INV-2）
**优先级排序**：priority 降序，同 priority 取先匹配

#### 规则 C1：挑衅（affinity-threshold, pair）

| 参数 | 值 |
|------|---|
| id | `CR-01` |
| name | 仇人挑衅 |
| triggerType | `affinity-threshold` |
| 条件 | A→B `affinity <= -60` AND A 与 B 在同一 Zone（`getDiscipleLocation(A.behavior) === getDiscipleLocation(B.behavior)`） |
| resultEventType | `causal-provoke` |
| resultSeverity | `EventSeverity.SPLASH` (2) |
| cooldownTicks | 600（≈10 分钟） |
| priority | 50 |
| MUD 模板 | 见 §5.7 T-C1-01~03 |
| SoulEvent metadata | `{ ruleId: 'CR-01', targetId: B.id, location }` |

#### 规则 C2：赠礼（affinity-threshold, pair）

| 参数 | 值 |
|------|---|
| id | `CR-02` |
| name | 至交赠礼 |
| triggerType | `affinity-threshold` |
| 条件 | A→B `affinity >= 80` AND 同一 Zone |
| resultEventType | `causal-gift` |
| resultSeverity | `EventSeverity.RIPPLE` (1) |
| cooldownTicks | 900（≈15 分钟） |
| priority | 30 |
| MUD 模板 | 见 §5.7 T-C2-01~03 |
| SoulEvent metadata | `{ ruleId: 'CR-02', targetId: B.id, location }` |

#### 规则 C3：窃取（moral-threshold, solo）

| 参数 | 值 |
|------|---|
| id | `CR-03` |
| name | 邪心窃取 |
| triggerType | `moral-threshold` |
| 条件 | A.moral.goodEvil <= -60 AND state.spiritStones >= 100 |
| resultEventType | `causal-theft` |
| resultSeverity | `EventSeverity.STORM` (3) |
| cooldownTicks | 1800（≈30 分钟） |
| priority | 70 |
| MUD 模板 | 见 §5.7 T-C3-01~03 |
| SoulEvent metadata | `{ ruleId: 'CR-03' }` |
| **副效果** | 触发后扣除 `state.spiritStones -= 20`（经由 soul-event handler 执行） |

#### 规则 C4：嫉妒（relationship-tag, pair）

| 参数 | 值 |
|------|---|
| id | `CR-04` |
| name | 对手嫉妒 |
| triggerType | `relationship-tag` |
| 条件 | A 最近 50 tick 内触发过 `breakthrough-success` 事件 AND B→A 有 `rival` 标签 AND 同一 Zone |
| resultEventType | `causal-jealousy` |
| resultSeverity | `EventSeverity.SPLASH` (2) |
| cooldownTicks | 600（≈10 分钟） |
| priority | 60 |
| MUD 模板 | 见 §5.7 T-C4-01~03 |
| SoulEvent metadata | `{ ruleId: 'CR-04', targetId: A.id, location }` |
| **注意** | 此规则的 actorId 是 B（嫉妒者），targetId 是 A（被嫉妒者） |

#### 规则 C5：闭关（consecutive-failure, solo）

| 参数 | 值 |
|------|---|
| id | `CR-05` |
| name | 连败闭关 |
| triggerType | `consecutive-failure` |
| 条件 | A 连续 `breakthrough-fail` >= 3 次 AND A.personality.aggressive <= 0.3 |
| resultEventType | `causal-seclusion` |
| resultSeverity | `EventSeverity.RIPPLE` (1) |
| cooldownTicks | 1800（≈30 分钟） |
| priority | 20 |
| MUD 模板 | 见 §5.7 T-C5-01~03 |
| SoulEvent metadata | `{ ruleId: 'CR-05' }` |
| **副效果** | 触发后通过 GoalManager 赋予 `seclusion` 目标（如未满 MAX_ACTIVE_GOALS） |

#### 规则 C6：道风冲突（ethos-conflict, solo）

| 参数 | 值 |
|------|---|
| id | `CR-06` |
| name | 道风冲突 |
| triggerType | `ethos-conflict` |
| 条件 | `Math.abs(state.sect.ethos - A.moral.goodEvil) >= 120`（双轴差距极端） |
| resultEventType | `causal-ethos-clash` |
| resultSeverity | `EventSeverity.SPLASH` (2) |
| cooldownTicks | 1200（≈20 分钟） |
| priority | 40 |
| MUD 模板 | 见 §5.7 T-C6-01~03 |
| SoulEvent metadata | `{ ruleId: 'CR-06' }` |

### 5.2 冷却机制（R-Iα-02）

| 参数 | 值 |
|------|---|
| 冷却键 | `${ruleId}:${actorId}:${targetId}` (pair) 或 `${ruleId}:${actorId}` (solo) |
| 存储 | 运行时 `Map<string, number>` (lastFireTick) |
| 检查 | `currentTick - lastFireTick >= rule.cooldownTicks` |
| 持久化 | **不持久化**（页面刷新重置，同 encounter-tick 模式） |

### 5.3 高级关系标签（R-Iα-03）

#### mentor（师徒）

| 参数 | 值 |
|------|---|
| 赋予条件 | A→B `affinity >= 80` AND `A.starRating >= B.starRating + 2` |
| 移除条件 | A→B `affinity < 60` |
| 行为效果 | B 在与 A 同地时，`meditate` 行为权重 ×1.2（Layer 3 扩展） |

#### grudge（宿怨）

| 参数 | 值 |
|------|---|
| 赋予条件 | A→B `affinity <= -40` AND A→B 负面事件次数 >= 3（从 `RelationshipMemory.keyEvents` 中 `affinityDelta < 0` 的条目计数） |
| 移除条件 | A→B `affinity > -20` |
| 行为效果 | A 与 B 碰面时冲突概率提升：`ENCOUNTER_PROBABILITY_TABLE.hostile.conflict` 从 60→75（仅当任一方有 grudge 标签时） |

#### admirer（仰慕）

| 参数 | 值 |
|------|---|
| 赋予条件 | A→B `affinity >= 60` AND B 有至少 1 个 `polarity: 'positive'` 的特性 AND A→B 关系中正向 affinity 变化事件 >= 3 次（从 `RelationshipMemory.keyEvents` 中 `affinityDelta > 0` 的条目计数） |
| 移除条件 | A→B `affinity < 40` |
| 行为效果 | A 对 B 的正面情绪候选权重 +0.2（在 emotion-pool 消费时叠加） |

### 5.4 标签阈值汇总表

| 标签 | 赋予 affinity | 额外条件 | 移除 affinity | 数据源 |
|------|:------------:|---------|:------------:|--------|
| friend | >= 60 | — | < 60 | 现有 RELATIONSHIP_TAG_THRESHOLDS |
| rival | <= -60 | — | > -60 | 现有 RELATIONSHIP_TAG_THRESHOLDS |
| mentor | >= 80 | starRating 差 >= 2 | < 60 | 新增 |
| grudge | <= -40 | 负面事件(affinityDelta<0) >= 3 | > -20 | 新增（需 RelationshipMemory） |
| admirer | >= 60 | 正面特性 + 正向事件 >= 3 | < 40 | 新增（需 RelationshipMemory） |

### 5.5 标签效果数值表

| 标签 | 效果类型 | 效果目标 | 数值 | 实现位置 |
|------|---------|---------|------|---------|
| mentor | behavior-weight 乘数 | meditate（被 mentor 方） | ×1.2 | behavior-tree.ts Layer 3 |
| grudge | encounter 概率修正 | conflict 权重 | 60→75（+15） | encounter.ts decideEncounterResult |
| admirer | emotion-pool 权重 | positive emotions（对 target） | +0.2 | emotion-pool.ts 消费逻辑 |
| friend | behavior-weight 乘数 | 同地合作行为 | ×1.3（现有） | behavior-tree.ts Layer 3 |
| rival | behavior-weight 乘数 | 同地冲突概率 | ×1.5（现有） | behavior-tree.ts Layer 3 |

### 5.6 因果事件→情绪候选池映射（R-Iα-04）

| 事件类型 | self 角色候选 | observer 角色候选 |
|----------|-------------|------------------|
| `causal-provoke` | anger, contempt, pride, neutral | fear, worry, anger, neutral |
| `causal-gift` | joy, gratitude, pride, neutral | admiration, joy, envy, neutral |
| `causal-theft` | guilt, pride, contempt, neutral | anger, contempt, fear, neutral |
| `causal-jealousy` | envy, anger, shame, neutral | contempt, sadness, neutral, worry |
| `causal-seclusion` | sadness, worry, relief, neutral | admiration, worry, neutral, sadness |
| `causal-ethos-clash` | anger, contempt, sadness, neutral | worry, fear, neutral, anger |

格式：`EmotionTag[]`（等概率随机选取），与现有 `EMOTION_CANDIDATE_POOL` 格式一致。

### 5.7 MUD 文案模板（R-Iα-05）

> `{A}` = 触发者名, `{B}` = 目标名, `{L}` = 地点中文名

#### T-C1: 挑衅

| # | 模板 |
|---|------|
| T-C1-01 | {A}在{L}遇见{B}，冷冷一笑："又是你。" |
| T-C1-02 | {A}与{B}在{L}四目相对，空气中弥漫着火药味。 |
| T-C1-03 | {A}在{L}故意撞了{B}一下，冷哼一声扬长而去。 |

#### T-C2: 赠礼

| # | 模板 |
|---|------|
| T-C2-01 | {A}在{L}递给{B}一株灵草，笑道："上次多谢了。" |
| T-C2-02 | {A}在{L}将一颗丹药塞给{B}："别客气。" |
| T-C2-03 | {A}与{B}在{L}并肩而坐，分享了一壶灵茶。 |

#### T-C3: 窃取

| # | 模板 |
|---|------|
| T-C3-01 | 宗门灵石库传来异动——{A}鬼鬼祟祟地离开了库房。 |
| T-C3-02 | {A}趁夜色潜入藏宝阁，窃走了一批灵石。 |
| T-C3-03 | 有人发现灵石少了二十枚——{A}最近出手颇为阔绰。 |

#### T-C4: 嫉妒

| # | 模板 |
|---|------|
| T-C4-01 | {B}听闻{A}突破成功，攥紧了拳头。 |
| T-C4-02 | {A}的突破喜讯传来，{B}的眼中闪过一丝阴翳。 |
| T-C4-03 | {B}在{L}看着{A}意气风发的模样，心中五味杂陈。 |

#### T-C5: 闭关

| # | 模板 |
|---|------|
| T-C5-01 | {A}接连失败后，默默走向后山闭关洞。 |
| T-C5-02 | {A}叹了口气："是我急躁了。"转身闭关去了。 |
| T-C5-03 | {A}在连续受挫后选择闭关静修，等待下一次机缘。 |

#### T-C6: 道风冲突

| # | 模板 |
|---|------|
| T-C6-01 | {A}对宗门近来的做法颇有微词，眉头紧锁。 |
| T-C6-02 | {A}低声嘟囔："这门规……与我道心不合。" |
| T-C6-03 | {A}独自站在山崖边，似乎在思考自己在宗门的位置。 |

### 5.8 因果事件严重度→AI 路由

| 严重度 | AI 处理 | 说明 |
|:------:|---------|------|
| RIPPLE (1) | Fallback only | C2 赠礼、C5 闭关 |
| SPLASH (2) | Fallback + AI 独白 (Call2) | C1 挑衅、C4 嫉妒、C6 道风冲突 |
| STORM (3) | Fallback + AI 全决策 (Call1+2) + 裁决窗口 | C3 窃取 |

> AI 路由复用现有 soul-event.handler 的 severity 分级逻辑，不新增代码。

---

## §6 持久化考量

| 数据 | 持久化 | 说明 |
|------|:------:|------|
| 因果规则注册表 | 静态代码 | 冻结数组 |
| 冷却状态 | 运行时 Map | 刷新重置（同 encounter-tick） |
| 连败计数 | 运行时 Map | 刷新重置 |
| 高级标签 | **已持久化** | `RelationshipEdge.tags[]` 在 GameState 中 |
| 新 SoulEventType | 静态代码 | 类型扩展 |

**GameState 版本不变（v6）**。零迁移。

---

## §7 MECE 校验

| 维度 | 完备性 | 互斥性 |
|------|:------:|:------:|
| 触发类型 | 6 种覆盖：好感阈值、道德阈值、标签、连败、道风冲突、目标驱动 | ✅ 每种有明确的条件域 |
| 规则 | C1-C6 无重叠条件（不同 triggerType 或不同阈值方向） | ✅ |
| 高级标签 | mentor/grudge/admirer 条件域不重叠 | ✅ mentor 需高好感+星级差，grudge 需低好感+负面事件次数，admirer 需中高好感+正面特性 |
| 事件极性 | 每个因果事件有唯一极性 | ✅ |

---

## §8 风险与假设

### Pre-Mortem

| 失败场景 | 概率 | 缓解 |
|----------|:----:|------|
| 因果事件几乎不触发（条件太严格） | 中 | Monte Carlo 验证；可调阈值（-60→-50 等） |
| 因果事件太频繁导致日志刷屏 | 低 | INV-2（1/scan）+ 冷却保证 |
| grudge 标签需要 RelationshipMemory 但 RM 是运行时的 | 中 | RM 会在每次碰面/事件时累积；刷新后从零开始是可接受的 |
| C3 窃取导致灵石经济失衡 | 低 | 固定扣 20 灵石 + 30 分钟冷却 |
| C4 嫉妒需要追踪"最近 50 tick 内突破"但 EventBus 是 drain 模式 | 中 | CausalEvaluator 维护 recentBreakthroughs Map |

### Assumption Audit

| 假设 | 验证方式 | 风险 |
|------|---------|:----:|
| 5 分钟扫描间隔能产出足够因果事件 | Monte Carlo 30 分钟≥3 事件 | 低 |
| 8 弟子 × 6 规则的扫描不影响性能 | 28 pairs × 6 rules = 168 checks / 5min | 极低 |
| RelationshipMemory 刷新后重置不影响 grudge/admirer | grudge/admirer 标签已持久化在 GameState；RM 仅作赋予判断的数据源 | 中 |
| C6 道风冲突阈值 120 合理 | sect.ethos 范围 [-100,+100]，disciple.goodEvil 范围 [-100,+100]；最大差距 200，120 约 60% | 低 |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-01 | v1.0 | 初始创建 |
| 2026-04-01 | v1.1 | BLOCK-1 修复（grudge 改用 affinityDelta<0 计数）+ WARN-1 修复（情绪池格式对齐） |

---

## USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项（1 BLOCK 已修复，4 WARN 中 2 已修复 / 2 推迟到 SGA）

签章：`[x] GATE 1 PASSED` — 2026-04-01
