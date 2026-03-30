# Phase H-β — 世界缝合 PRD

> **版本**：v1.0 | **日期**：2026-03-30 | **作者**：/SPM
> **Phase**：H-β | **前置**：Phase G ✅ + Phase H-α ✅
> **一句话**：以最小成本让 Phase E~G 的所有投入对玩家可见，验证「灵魂+世界+AI 联动构成核心乐趣」

---

## §1 产品背景

### 1.1 问题陈述

项目存在**两条互不相通的日志管线**：

| 管线 | 建立时期 | 输入 | 输出 | 玩家可见 |
|------|---------|------|------|:--------:|
| **A — 专用回调** | Phase A~D | ctx.systemLogs / ctx.farmLogs / ctx.discipleEvents | main.ts → addMudLog() | ✅ |
| **B — 结构化日志** | Phase H-α/F0/G | ctx.logger.info/warn() | GameLogger → IndexedDB | ❌ |

Phase F0（碰面/世界事件）和 Phase G（AI 决策/独白）的 handler 使用管线 B，导致：
- **世界事件**（12种，五级漏斗）：玩家看不到
- **碰面事件**（弟子同地相遇）：玩家看不到
- **AI 独白**（innerThought）：玩家看不到
- **灵魂评估结果**：玩家看不到

### 1.2 核心假设

> 补上管线 B → MUD 显示的通道 + 2 个查看命令，玩家就能第一次体验到完整的世界联动。

### 1.3 价值锚定

| 维度 | 评估 |
|------|------|
| **核心体验** | 玩家第一次看到"弟子碰面 → 产生情绪 → AI独白 → 行为变化"的完整因果链 |
| **ROI** | 成本 **S**（统一管线 + 2 命令） / 体验增量 **5分**（从"看不到"到"看得到"是质变） |
| **循环挂载** | 不新增循环，仅将已有循环的输出接入 MUD 显示层 |
| **需求债务** | 部分清偿 FB-005（关系查看）、FB-012（对话实体可见） |

---

## §2 系统不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | 只做"已有数据→MUD 可见"的管线连接，不新增游戏机制 | 范围膨胀 |
| I2 | 所有输出遵循已有五级分级（BREATH~CALAMITY），不引入新等级 | 破坏日志一致性 |
| I3 | 不修改任何 Handler 的游戏逻辑，只在输出侧补管线 | 避免回归风险 |
| I4 | 新命令在 MUD 文字界面实现，不引入 HTML 面板 | 保持纯 MUD 风格 |
| I5 | 零存档迁移 — 不新增 GameState 持久化字段 | 避免迁移链负担 |

---

## §3 功能规格

### 3.1 S0 — 统一日志管线（核心基础设施）

#### 3.1.1 问题

当前 `idle-engine.tick()` 执行完 Pipeline 后，只分发三类专用回调：
- `ctx.farmLogs` → `onFarmTickLog`
- `ctx.systemLogs` → `onSystemLog`
- `ctx.discipleEvents` → `onDiscipleBehaviorChange`

`ctx.logger`（GameLogger）的 buffer 从未被消费到 MUD 显示。

#### 3.1.2 方案 — Tick 后 flush + 路由

每个 tick 结束后，在 `idle-engine.tick()` 的回调分发区新增一步：

1. 调用 `ctx.logger.flush()` 获取本 tick 的 `LogEntry[]`
2. 通过新增的回调 `onMudLogEntries` 将 `LogEntry[]` 传给 main.ts
3. main.ts 按映射规则转换为 MUD 显示

#### 3.1.3 LogEntry → MUD 映射规则

| LogEntry 字段 | 映射目标 | 规则 |
|---------------|---------|------|
| `level` | `EventSeverity` | 见 R-S0-01 映射表 |
| `source` | 日志前缀样式 | 见 R-S0-02 源标签表 |
| `message` | MUD 文本内容 | 直接使用（已含中文文案） |
| `category` | 过滤（可选） | 预留，v1 不过滤 |

**R-S0-01 — LogLevel → EventSeverity 映射表**

| LogLevel | EventSeverity | 说明 |
|----------|--------------|------|
| `DEBUG (0)` | **不显示** | 调试信息不输出到 MUD |
| `INFO (1)` | `RIPPLE (1)` | 普通信息 → 涟漪级 |
| `WARN (2)` | `SPLASH (2)` | 重要信息 → 浪花级 |
| `ERROR (3)` | `STORM (3)` | 错误/危急 → 风暴级 |

**R-S0-02 — source → 显示前缀映射表**

| source 值 | MUD 显示前缀 | 颜色风格 |
|-----------|-------------|---------|
| `'encounter'` | （无前缀，文案自带上下文） | 沿用 severity 颜色 |
| `'world-event'` | （无前缀，文案已含【喘息】等标签） | 沿用 severity 颜色 |
| `'ai-result-apply'` | （无前缀，文案已含 `[灵魂·AI]`） | 沿用 severity 颜色 |
| `'soul-event'` | （无前缀） | 沿用 severity 颜色 |
| 其他 | `[{source}]` 前缀 | 沿用 severity 颜色 |

**R-S0-03 — severity 覆写规则（精细化）**

部分 handler 的日志需要更精确的 severity 映射，而非简单的 level→severity：

| source | 条件 | 覆写 EventSeverity |
|--------|------|-------------------|
| `'world-event'` | `data.severity` 存在 | 使用 `data.severity` 的值（已是 EventSeverity） |
| `'encounter'` | `data.result === 'chat'` | `RIPPLE` |
| `'encounter'` | `data.result === 'discuss'` | `SPLASH` |
| `'encounter'` | `data.result === 'conflict'` | `SPLASH` |
| `'ai-result-apply'` | 始终 | `SPLASH`（AI 独白始终高亮） |

> 原理：world-event-tick 已在 logMeta 中存储了 `severity` 字段（即 EventSeverity 枚举值），
> encounter-tick 已在 logMeta 中存储了 `result` 字段。利用已有元数据做精准映射。

#### 3.1.4 接口变更

**IdleEngine 新增回调**：

```
type MudLogCallback = (entries: LogEntry[]) => void;
setOnMudLog(cb: MudLogCallback): void;
```

**idle-engine.tick() 新增分发**（在现有回调分发之后）：

```
// 统一日志管线：flush logger → MUD
const logEntries = ctx.logger.flush();
if (logEntries.length > 0) {
  this.onMudLog?.(logEntries);
}
```

> ⚠️ flush() 清空 buffer，所以 IndexedDB 持久化由 GameLogger 内部定时器在 flush 前已完成，
> 或需要在 flush 前先调用持久化。需在 TDD 中确认持久化时序。

#### 3.1.5 持久化兼容性

GameLogger 当前有两条持久化路径：
1. **定时持久化**：`setInterval(() => this.persistBuffer(), FLUSH_INTERVAL_MS)` — 每 N ms 将 buffer 写入 IndexedDB
2. **页面关闭**：`beforeunload` → `persistBufferSync()`

新方案在每 tick 后 flush() 清空 buffer，可能导致定时持久化时 buffer 为空。

**解决策略**：flush() 前先触发持久化（`persistBuffer()`），然后返回并清空 buffer。
或改为：flush() 返回副本但不清空 buffer，由定时器负责清理。TDD 阶段确认。

---

### 3.2 S1 — 碰面事件可见

#### 现状
- encounter-tick.handler 已生成文案（`getEncounterText()`）
- 已通过 `ctx.logger.info/warn()` 写入 GameLogger
- 已携带 `{ pairKey, location, result, avgAffinity }` 元数据

#### 缝合方式
S0 统一管线上线后，**零额外代码**。encounter-tick 的日志自动通过 flush → onMudLog → addMudLog 路径显示。

#### 玩家看到的效果

| 碰面结果 | 严重度 | MUD 显示示例 |
|---------|--------|-------------|
| `chat` | RIPPLE（涟漪色） | 张清风在后山遇到了李墨雪，两人有一搭没一搭地聊了几句。 |
| `discuss` | SPLASH（浪花色） | 张清风在禅房向王灵韵请教修炼之法，讨论良久颇有收获。 |
| `conflict` | SPLASH（浪花色） | 张清风和赵天狼在外门狭路相逢，气氛瞬间变得紧张起来。 |

---

### 3.3 S2 — AI 独白可见

#### 现状
- ai-result-apply.handler 已生成独白文案：`[灵魂·AI] {name}感到 {emotion}({intensity})：「{innerThought}」`
- 已通过 `ctx.logger.info()` 写入 GameLogger
- 已携带 `{ discipleId, emotion, intensity, source: 'ai' }` 元数据

#### 缝合方式
S0 统一管线上线后，**零额外代码**。但按 R-S0-03 规则，AI 独白覆写为 SPLASH 级（始终高亮）。

#### 玩家看到的效果

| 场景 | 严重度 | MUD 显示示例 |
|------|--------|-------------|
| AI 情绪评估完成 | SPLASH（浪花色） | [灵魂·AI] 张清风感到 愤怒(0.7)：「这赵天狼又在挑衅，修为不如我还这般嚣张。」 |
| AI 独白（平静） | SPLASH（浪花色） | [灵魂·AI] 李墨雪感到 宁静(0.3)：「今日修炼颇有进境，心境澄明。」 |

---

### 3.4 S3 — `inspect` 命令（弟子灵魂档案）

#### 命令格式

```
inspect <弟子名>    （支持前缀匹配，复用 matchDisciple()）
简写：i <弟子名>
```

#### 输出内容

```
────────── 灵魂档案：张清风 ──────────
◆ 基础
  3★ 勇毅刚烈 | 炼气三层 | 后山·打坐修炼

◆ 五维性格
  攻击: 72  坚韧: 45  善良: 30  懒惰: 15  聪慧: 58

◆ 道德双轴
  善恶: +35 (偏善)    律放: -12 (中庸)

◆ 先天特性
  [胆魄如虹] [灵根敏锐]

◆ 当前情绪
  愤怒 (强度 0.7) — 3 tick 前触发

◆ 人际关系
  → 李墨雪: 好感 +42 [friend]
  → 赵天狼: 好感 -28 [rival]
  → 王灵韵: 好感 +15
```

#### 数据来源映射

| 显示项 | 数据源 | 可用性 |
|--------|-------|:------:|
| 基础信息 | `LiteDiscipleState`（starRating, personalityName, realm, behavior） | ✅ 已有 |
| 五维性格 | `d.personality`（aggressive, persistent, kind, lazy, smart） | ✅ 已有 |
| 道德双轴 | `d.moral.goodEvil`, `d.moral.lawChaos` + `getMoralLabel/getChaosLabel` | ✅ 已有 |
| 先天特性 | `d.traits[]` + `TRAIT_REGISTRY` lookup | ✅ 已有 |
| 当前情绪 | `emotionMap.get(d.id)` — 运行时状态（IdleEngine 实例属性） | ⚠️ 需暴露 |
| 人际关系 | `state.relationships.filter(r => r.sourceId === d.id)` | ✅ 已有 |

#### 情绪数据暴露方案

`emotionMap` 是 IdleEngine 的实例属性（ADR-F-01：不持久化），需要新增 getter：

```
IdleEngine.getEmotionState(discipleId: string): EmotionState | undefined
```

#### 无情绪时的 Fallback 显示

```
◆ 当前情绪
  平静（无特殊情绪波动）
```

#### 错误处理

| 场景 | 输出 |
|------|------|
| 未输入弟子名 | `用法：inspect <弟子名>` |
| 弟子不存在 | `未找到名为「{query}」的弟子。` |
| 前缀匹配多人 | `找到多位弟子：{name1}、{name2}... 请输入更完整的名字。` |

> 复用 `matchDisciple()` 函数（`mud-formatter.ts:116-129`），与 `look <名>` 行为一致。

---

### 3.5 S4 — `sect` 命令（宗门道风总览）

#### 命令格式

```
sect
```

#### 输出内容

```
────────── 宗门：凌霄仙宗 ──────────
◆ 等级: 1级 | 声望: 120 | 灵气浓度: ×1.00

◆ 道风双轴
  仁 ←──────●────────── 霸    道风: -25 (偏仁)
  放 ────────────●───── 律    门规: +40 (偏律)

◆ 弟子: 8人 | 上缴丹药: 15颗
```

#### 道风可视化规则

用 20 字符宽的 ASCII 刻度尺表示 [-100, +100] 范围：

| 值范围 | 标记位置 | 示例 |
|--------|---------|------|
| -100 | 最左（位置 0） | `●───────────────────` |
| 0 | 正中（位置 10） | `──────────●─────────` |
| +100 | 最右（位置 20） | `───────────────────●` |

计算公式：`position = Math.round((value + 100) / 200 * 20)`

#### 数据来源映射

| 显示项 | 数据源 | 可用性 |
|--------|-------|:------:|
| 宗门名 | `state.sect.name` | ✅ |
| 等级 | `state.sect.level` | ✅ |
| 声望 | `state.sect.reputation` | ✅ |
| 灵气浓度 | `state.sect.auraDensity` | ✅ |
| 道风值+标签 | `state.sect.ethos` + `getEthosLabel()` | ✅ |
| 门规值+标签 | `state.sect.discipline` + `getDisciplineLabel()` | ✅ |
| 弟子数 | `state.disciples.length` | ✅ |
| 上缴丹药 | `state.sect.tributePills` | ✅ |

---

## §4 业务实体清单

本 Phase 不引入新的业务实体。

| 实体 | 状态 | 说明 |
|------|:----:|------|
| LogEntry | 复用 | `src/shared/types/logger.ts` 已有 |
| EventSeverity | 复用 | `src/shared/types/event.ts` 已有 |
| EmotionState | 复用 | IdleEngine 运行时已有，仅新增 getter |
| SectState | 复用 | `game-state.ts` 已有 |

---

## §5 产源与消耗

本 Phase 不新增任何资源产出或消耗。纯表现层变更。

---

## §6 持久化考量

- **零存档迁移**：不新增 GameState 字段
- **emotionMap 不持久化**：遵循 ADR-F-01
- **LogEntry 持久化不受影响**：flush() 前需确保 IndexedDB 写入完成（TDD 确认）

---

## §7 验收标准总览

| # | 验收标准 | 验证方式 |
|---|---------|---------|
| AC-01 | 运行 15 分钟内，MUD 日志中出现碰面事件文案（chat/discuss/conflict） | 浏览器手动验证 |
| AC-02 | 运行 15 分钟内，MUD 日志中出现世界事件文案（【喘息】/【涟漪】/【浪花】/【风暴】） | 浏览器手动验证 |
| AC-03 | AI 在线时，MUD 日志中出现 `[灵魂·AI]` 独白文案，SPLASH 级高亮 | 浏览器手动验证 |
| AC-04 | AI 离线时，无 AI 独白日志，不报错 | 浏览器手动验证 |
| AC-05 | `inspect 张清风` 显示完整灵魂档案（五维/道德/特性/情绪/关系） | 浏览器手动验证 |
| AC-06 | `inspect` 无参数时显示用法提示 | 浏览器手动验证 |
| AC-07 | `inspect 张` 前缀匹配到唯一弟子时正常显示 | 浏览器手动验证 |
| AC-08 | `sect` 显示宗门道风双轴 + ASCII 刻度尺 | 浏览器手动验证 |
| AC-09 | 回归测试 64/64 通过（零引擎逻辑变更） | `npm run test:regression` |
| AC-10 | LogEntry 仍正常写入 IndexedDB（持久化不受 flush 影响） | DevTools → IndexedDB 检查 |

---

## §8 PoC 结论（Step 1.5）

| 缝合项 | 技术路径 | 阻塞项 | 结论 |
|--------|---------|--------|------|
| S0 统一管线 | tick 后 flush → 新回调 → main.ts 映射 | flush 与持久化时序需 TDD 确认 | ✅ 可行 |
| S1 碰面→MUD | S0 完成后零额外代码 | 无 | ✅ 可行 |
| S2 AI独白→MUD | S0 完成后零额外代码 | 无 | ✅ 可行 |
| S3 inspect 命令 | 新命令 + 新格式化函数 + emotionMap getter | emotionMap 暴露需 1 个新方法 | ✅ 可行 |
| S4 sect 命令 | 新命令 + 新格式化函数 | 无 | ✅ 可行 |

**无技术阻塞。所有数据结构和模板已就绪。**

---

## §9 Pre-Mortem

| # | 风险 | 概率 | 影响 | 缓解 |
|---|------|:----:|:----:|------|
| PM-1 | flush() 清空 buffer 导致 IndexedDB 丢日志 | 中 | 中 | TDD 阶段确认持久化时序，必要时改 flush 语义 |
| PM-2 | 高频 world-event 日志刷屏 | 低 | 低 | BREATH 级已有灰色淡显，视觉层面不抢注意力 |
| PM-3 | emotionMap getter 暴露引擎内部状态 | 低 | 低 | 返回只读副本，不暴露引用 |

---

## §10 Assumption Audit

| # | 假设 | 验证状态 | 依据 |
|---|------|:--------:|------|
| A1 | encounter-tick 的 ctx.logger 输出文案已足够好 | ✅ 已验证 | 3×3 模板，PoC 阶段已读源码确认 |
| A2 | ai-result-apply 的 logLine 格式适合直接显示 | ✅ 已验证 | 格式：`[灵魂·AI] {name}感到 {emotion}：「{thought}」` |
| A3 | world-event-tick 的 logMeta 中 severity 字段即 EventSeverity | ✅ 已验证 | `payload.severity` 来自 Storyteller，类型为 EventSeverity |
| A4 | flush() 返回当前 buffer 并清空 | ✅ 已验证 | `game-logger.ts:170-174` |
| A5 | emotionMap 在引擎运行时始终可用 | ✅ 已验证 | `idle-engine.ts:224`，构造时初始化 |

---

## §11 Pre-Mortem

| # | 失败原因 | 预警信号 | 缓解措施 | 风险等级 |
|---|---------|---------|---------|:--------:|
| PM-1 | 日志刷屏：世界事件+碰面+AI独白+原有日志叠加，MUD 滚动过快 | 玩家反馈信息过多 | 200 行裁剪 + BREATH 灰色淡显；Phase H 正式 UI 加事件过滤器 | 🟡 中 |
| PM-2 | flush 与 IndexedDB 持久化冲突 | DevTools IndexedDB 日志缺失 | TDD 确认时序，必要时改 flush 语义 | 🟢 低 |
| PM-3 | emotionMap 1-tick 延迟 | inspect 与日志不同步 | 可接受（1秒延迟），文档标注 | 🟢 低 |

---

## §12 Assumption Audit

| # | 假设 | 如果错误的后果 | 风险 | 验证方式 | 何时验证 |
|---|------|--------------|:----:|---------|---------|
| A-AA1 | flush() 不影响 IndexedDB 持久化 | 日志不完整 | 🟡 | 读源码确认 persistBuffer 与 flush 时序 | SGA/SGE |
| A-AA2 | 玩家会主动使用 inspect/sect | 命令白做 | 🟢 | S0 管线有独立价值 | 上线后 |
| A-AA3 | 日志混入后五级颜色足以区分 | 信息混杂 | 🟡 | 浏览器运行 15 分钟观察 | SGE 验证 |
| A-AA4 | logMeta.severity = EventSeverity 枚举值 | 颜色映射错误 | 🟢 | PoC 已验证 | 已验证 ✅ |

---

## USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项

签章：`[x] GATE 1 PASSED` — 2026-03-30

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-30 | v1.0 | 初始创建 |
| 2026-03-30 | v1.1 | 追加 Pre-Mortem / Assumption Audit / GATE 1 签章（四层防线完整 Review） |
