# Phase F0-β User Stories

> **版本**：v1.0 | **维护者**：/SPM | **日期**：2026-03-30
> **关联 PRD**：`phaseF0-beta-PRD.md`
> **前置**：Phase F0-α ✅

---

## Story #1: 世界事件池定义与注册

**作为**引擎开发者，**我需要**一个类型安全的世界事件定义注册表，**以便**事件抽取系统能从中加权随机选取事件。

### AC (Given-When-Then)

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 引擎启动 | 访问 WORLD_EVENT_REGISTRY | 返回 12 个 WorldEventDef | PRD §3.1 R-F0β-E2 完整 12 项定义表 |
| AC2 | 读取单个 WorldEventDef | 检查 `beast-attack-minor` | 包含 id, name, baseSeverity=1, weight=30, scope='single', condition, polarity='negative', canEscalate=false | PRD §3.1 R-F0β-E2 行#1 |
| AC3 | 读取 WorldEventDef | 检查所有 12 个 def | 每个 def 包含 8 个必填字段：id, name, baseSeverity, weight, scope, condition, polarity, canEscalate | PRD §3.1 R-F0β-E2 |
| AC4 | EventSeverity 枚举 | 访问 5 个等级 | 返回 BREATH=0, RIPPLE=1, SPLASH=2, STORM=3, CALAMITY=4 | PRD §3.1 R-F0β-E1 |
| AC5 | EventScope 枚举 | 访问 3 个范围 | 返回 'single', 'multi', 'sect' | PRD §3.1 R-F0β-E3 |

**依赖**：无  
**复杂度**：S

---

## Story #2: 世界事件抽取引擎

**作为**引擎，**我需要**一个 world-event-tick handler（TickPhase=605），每 30 秒从事件池中条件过滤 + 加权随机抽取 0~1 个世界事件，**以便**世界有"新鲜事"自然发生。

### AC (Given-When-Then)

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | tickCount % 30 !== 0 | handler 执行 | 立即 return，不抽取 | PRD §3.3 F-F0β-01 |
| AC2 | 有效事件池为空（所有事件前提条件不满足） | 抽取时 | 不发射事件 | I5: 静态池 |
| AC3 | 有效事件池 ≥1 | 抽取概率 = (tension/100) * 0.40；随机掷骰通过 | 加权随机选取一个 WorldEventDef | PRD §3.3 F-F0β-03 |
| AC4 | 抽取到 scope='single' 事件 | 满足条件的弟子 ≥1 | 随机选取 1 个弟子作为涉事者，其 location 为事件地点 | PRD §3.1 R-F0β-E3 |
| AC5 | 抽取到 scope='multi' 事件 | 满足条件的同地弟子 ≥2 | 选取同地 ≥2 个弟子为涉事者 | PRD §3.1 R-F0β-E3 |
| AC6 | 抽取到 scope='sect' 事件 | 任何状态 | involvedDiscipleIds = 全部弟子 ID，location = null | PRD §3.1 R-F0β-E3 |
| AC7 | 道风 ethos=-40（仁道） | 抽取 wanderer-visit（sign=-1, factor=0.3） | 实际权重 = 25 × (1 + 40/100 × 0.3) = 25 × 1.12 = 28 | PRD §3.3 F-F0β-04 |
| AC8 | 道风 ethos=+40（霸道） | 抽取 sect-challenge（sign=+1, factor=0.5） | 实际权重 = 3 × (1 + 40/100 × 0.5) = 3 × 1.20 = 4（取整） | PRD §3.3 F-F0β-04 |
| AC9 | 事件抽取成功 | emit SoulEvent | type='world-event', metadata 含 WorldEventPayload 的 7 个字段 | PRD §3.1 R-F0β-E5 |
| AC10 | 事件抽取成功 | 输出 MUD 日志 | 根据 severity: Lv.1→info, Lv.2→warn, Lv.3+→error 级别日志 | PRD §4 模板 |

**依赖**：Story #1  
**复杂度**：M

---

## Story #3: 五级事件漏斗（严重度升级判定）

**作为**引擎，**我需要**在事件抽取后执行严重度升级判定，**以便**满足条件的事件能从基础等级自然升级为更高等级。

### AC (Given-When-Then)

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 事件 canEscalate=false | 升级判定 | 跳过判定，severity 保持 baseSeverity | PRD §3.1 R-F0β-E2 |
| AC2 | 事件 canEscalate=true, baseSeverity=1, 涉及 ≥2 弟子且含 friend 对 | 升级判定，随机 < 0.20 | severity 升级为 2 | PRD §3.3 F-F0β-05 |
| AC3 | 事件 canEscalate=true, baseSeverity=2, 涉及 rival/grudge 标签对 | 升级判定，随机 < 0.20 | severity 升级为 3 | PRD §3.3 F-F0β-05 |
| AC4 | 事件 canEscalate=true, baseSeverity=2, moral.goodEvil 差值 ≥ 60 | 升级判定，随机 < 0.20 | severity 升级为 3 | PRD §3.3 F-F0β-05 |
| AC5 | 升级判定满足条件但随机 ≥ 0.20 | 升级判定 | 不升级，保持 baseSeverity | 升级概率 20% |
| AC6 | 已升级一次 (baseSeverity=1→2) | 继续判定 | 不再升级 — 每次最多升 1 级 | I2: 只升不降，最多+1 |

**依赖**：Story #1, #2  
**复杂度**：S

---

## Story #4: Storyteller 节奏器

**作为**引擎，**我需要**一个 Storyteller 模块管理戏剧张力指数，**以便**事件密度呈现波峰波谷的自然节奏。

### AC (Given-When-Then)

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | 初始状态 | Storyteller 创建 | tensionIndex=30, lastStormTimestamp=0, eventHistory=[] | PRD §3.1 R-F0β-E6 |
| AC2 | tensionIndex=50 | 每秒自然衰减 | tensionIndex = max(0, 50 - 0.2) = 49.8 | PRD §3.3 F-F0β-07 |
| AC3 | Lv.2 事件发生 | 张力更新 | tensionIndex += 15 | PRD §3.3 F-F0β-08 |
| AC4 | Lv.3 事件发生 | 张力更新 + 喘息期 | tensionIndex += 35; lastStormTimestamp = now | PRD §3.3 F-F0β-08 + F-F0β-06 |
| AC5 | 喘息期内（now - lastStormTimestamp < STORM_COOLDOWN_SEC * 1000） | 事件抽取 | 过滤掉 Lv.2+ 事件，仅允许 Lv.0~1 | PRD §3.3 F-F0β-06 |
| AC6 | 10 分钟无 Lv.3+ 事件 | calculateTension | timeFactor = min(50, 10 × 5) = 50 | PRD §3.3 F-F0β-02（时间因子） |
| AC7 | rivalPairs=2 | calculateTension | conflictFactor = min(20, 2 × 10) = 20 | PRD §3.3 F-F0β-02（冲突因子） |
| AC8 | 近期 10 分钟内有 3 个 Lv.2+ 事件 | calculateTension | cooldownPenalty = 3 × 15 = 45 | PRD §3.3 F-F0β-02（近期惩罚） |
| AC9 | eventHistory 有 21 条 | 新事件加入 | 最旧的 1 条被移除，保持最多 20 条 | PRD §3.1 R-F0β-E6 |
| AC10 | 张力计算结果=120 | clamp | 实际 tensionIndex = 100 | I6: [0, 100] 闭区间 |

**依赖**：Story #2  
**复杂度**：M

---

## Story #5: 世界事件日志与 EventBus 集成

**作为**玩家，**我需要**在 MUD 日志中看到按严重度分级显示的世界事件，**以便**感知到"世界有新鲜事发生"。

### AC (Given-When-Then)

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | Lv.1 事件 beast-attack-minor | 日志输出 | LogCategory.WORLD, 'world-event', info 级别, 随机选取 3 条模板之一 | PRD §4 beast-attack-minor |
| AC2 | Lv.2 事件 beast-attack-major | 日志输出 | LogCategory.WORLD, 'world-event', warn 级别, 模板含 {D} 和 {D2} | PRD §4 beast-attack-major |
| AC3 | Lv.3 事件 sect-challenge | 日志输出 | LogCategory.WORLD, 'world-event', error 级别, 模板含 ⚡ 前缀 | PRD §4 sect-challenge |
| AC4 | scope='sect' 事件（无 {D} 占位符） | 文案填充 | 不含弟子名，直接输出 | PRD §4.1 wanderer-visit 等 |
| AC5 | scope='single' 事件（含 {D} 占位符） | 文案填充 | {D} 替换为目标弟子的 name | PRD §4.1 |
| AC6 | scope='multi' 事件（含 {D} 和 {D2}） | 文案填充 | {D}={involvedDiscipleIds[0].name}, {D2}={involvedDiscipleIds[1].name} | PRD §4.1 |
| AC7 | Lv.1+ 事件发生 | SoulEvent 发射 | 对每个 involvedDiscipleId emit 一条 type='world-event' 的 SoulEvent | PRD §3.1 R-F0β-E4 |
| AC8 | soul-engine 收到 type='world-event' | 灵魂评估 | 基于 metadata.polarity 执行 positive/negative/neutral 路径评估 | PRD §3.1 R-F0β-E4 |

**依赖**：Story #2, #4  
**复杂度**：M

---

## Story #6: SoulEventType 扩展与 emotion-pool 映射

**作为**灵魂引擎，**我需要** emotion-pool 为 `world-event` 类型提供候选情绪映射，**以便** soul-engine 能正确评估世界事件触发的弟子情绪。

### AC (Given-When-Then)

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC1 | event.type = 'world-event', role='self', polarity='positive' | buildCandidatePool | 返回 `['joy', 'gratitude', 'relief', 'pride', 'neutral']` | 新增映射条目 |
| AC2 | event.type = 'world-event', role='self', polarity='negative' | buildCandidatePool | 返回 `['fear', 'anger', 'worry', 'sadness', 'neutral']` | 新增映射条目 |
| AC3 | event.type = 'world-event', role='self', polarity='neutral' | buildCandidatePool | 返回 `['neutral', 'worry', 'admiration', 'joy']` | 新增映射条目 |
| AC4 | event.type = 'world-event', role='observer' | buildCandidatePool | 返回 `['neutral', 'worry', 'fear', 'admiration']` | 新增映射条目 |
| AC5 | SOUL_EVENT_POLARITY['world-event'] | 查找 | 返回 'positive'（默认值；实际极性由 metadata.polarity 覆盖） | PRD §3.1 R-F0β-E4 |
| AC6 | fallbackGenerateThought for 'world-event' | 调用 | 返回 ≥3 条世界事件通用独白模板之一 | 新增 fallback 模板 |

**依赖**：Story #1  
**复杂度**：S

---

## 复杂度汇总

| Story | 标题 | 复杂度 |
|:-----:|------|:------:|
| #1 | 世界事件池定义与注册 | S |
| #2 | 世界事件抽取引擎 | M |
| #3 | 五级事件漏斗 | S |
| #4 | Storyteller 节奏器 | M |
| #5 | 世界事件日志与 EventBus 集成 | M |
| #6 | SoulEventType 扩展与 emotion-pool 映射 | S |

**总计 6 Stories**：2S + 1S + 2M + 1M = 2S + 4M

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-30 | 初始创建：6 个 User Stories |
