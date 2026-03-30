# Phase H-β — 世界缝合 User Stories

> **版本**：v1.0 | **日期**：2026-03-30 | **作者**：/SPM
> **PRD 来源**：[phaseH-beta-PRD.md](../../features/phaseH-beta-PRD.md)
> **总计**：5 Stories（S0 管线 + S1 碰面 + S2 AI独白 + S3 inspect + S4 sect）

---

## Story #0 — 统一日志管线（S0 核心基础设施）

**作为** 游戏引擎，
**我需要** 在每个 tick 结束后将 ctx.logger 的结构化日志路由到 MUD 显示层，
**以便** 所有通过 GameLogger 输出的 handler 日志对玩家可见。

### AC（验收条件）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC-0a | 引擎运行中，handler 通过 ctx.logger 写了日志 | tick 结束、Pipeline 执行完毕 | `onMudLog` 回调被触发，传入本 tick 的 LogEntry[] | PRD §3.1.4 |
| AC-0b | LogEntry.level = INFO | 路由到 MUD | 显示为 EventSeverity.RIPPLE 颜色 | PRD §3.1.3 R-S0-01 |
| AC-0c | LogEntry.level = WARN | 路由到 MUD | 显示为 EventSeverity.SPLASH 颜色 | PRD §3.1.3 R-S0-01 |
| AC-0d | LogEntry.level = DEBUG | 路由到 MUD | **不显示**（静默过滤） | PRD §3.1.3 R-S0-01 |
| AC-0e | LogEntry.source = 'world-event' 且 data.severity 存在 | 路由到 MUD | 使用 data.severity 的值作为 EventSeverity（覆写 level 映射） | PRD §3.1.3 R-S0-03 |
| AC-0f | LogEntry.source = 'ai-result-apply' | 路由到 MUD | 强制使用 SPLASH 级显示 | PRD §3.1.3 R-S0-03 |
| AC-0g | flush() 被调用 | 同 tick | IndexedDB 持久化不丢失日志 | PRD §3.1.5 |

**依赖**：无
**复杂度**：M

---

## Story #1 — 碰面事件 MUD 可见（S1）

**作为** 玩家，
**我希望** 当弟子在同一地点碰面时，MUD 日志中出现碰面描述文案，
**以便** 我能感受到弟子之间的命运交叉。

### AC（验收条件）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC-1a | 两名弟子在同一 Zone 且碰面检定结果为 chat | encounter-tick 触发 | MUD 显示 RIPPLE 级碰面文案，如"张清风在后山遇到了李墨雪…" | PRD §3.2 |
| AC-1b | 碰面检定结果为 discuss 或 conflict | encounter-tick 触发 | MUD 显示 SPLASH 级碰面文案 | PRD §3.2 + R-S0-03 |
| AC-1c | 运行 15 分钟 | 自然运行 | 至少出现 1 条碰面日志 | PRD §7 AC-01 |

**依赖**：Story #0（统一管线）
**复杂度**：S（S0 完成后零代码）

---

## Story #2 — AI 独白 MUD 可见（S2）

**作为** 玩家，
**我希望** 当 AI 完成弟子灵魂评估后，MUD 日志中出现弟子的内心独白，
**以便** 我能理解弟子为什么做出某个行为选择。

### AC（验收条件）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC-2a | AI 后端在线，Lv.2+ 事件触发灵魂评估 | ai-result-apply 处理完毕 | MUD 显示 SPLASH 级独白，格式：`[灵魂·AI] {name}感到 {emotion}({intensity})：「{thought}」` | PRD §3.3 |
| AC-2b | AI 后端离线 | 灵魂评估 fallback | 无 AI 独白日志，不报错，引擎正常运行 | PRD §7 AC-04 |
| AC-2c | 世界事件→MUD 也可见 | world-event-tick 触发 | MUD 显示对应 severity 级世界事件文案（【喘息】/【涟漪】/【浪花】/【风暴】） | PRD §7 AC-02 |

**依赖**：Story #0（统一管线）
**复杂度**：S（S0 完成后零代码）

---

## Story #3 — inspect 命令（弟子灵魂档案）（S3）

**作为** 玩家，
**我希望** 输入 `inspect <弟子名>` 或 `i <弟子名>` 查看弟子的灵魂详细档案，
**以便** 我能了解弟子的性格、道德、情绪、特性和人际关系。

### AC（验收条件）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC-3a | 弟子存在 | 输入 `inspect 张清风` | MUD 显示灵魂档案：基础信息、五维性格、道德双轴（含标签）、先天特性、当前情绪、人际关系（含 tags） | PRD §3.4 输出内容 |
| AC-3b | 弟子有情绪状态 | 输入 inspect | 情绪区显示情绪名称 + 强度 + 触发时间 | PRD §3.4 |
| AC-3c | 弟子无情绪状态 | 输入 inspect | 情绪区显示 `平静（无特殊情绪波动）` | PRD §3.4 Fallback |
| AC-3d | 弟子有关系边 | 输入 inspect | 关系区显示每条关系：`→ {name}: 好感 {±affinity} [{tags}]` | PRD §3.4 |
| AC-3e | 弟子无关系边 | 输入 inspect | 关系区显示 `（暂无特殊关系）` | — |
| AC-3f | 输入前缀匹配唯一弟子 | 输入 `inspect 张` | 正常显示该弟子档案 | PRD §3.4，复用 matchDisciple() |
| AC-3g | 输入前缀匹配多人 | 输入 `inspect 王` | 显示 `找到多位弟子：王灵韵、王xxx... 请输入更完整的名字。` | PRD §3.4 错误处理 |
| AC-3h | 未输入弟子名 | 输入 `inspect` | 显示 `用法：inspect <弟子名>` | PRD §3.4 错误处理 |
| AC-3i | 简写命令 | 输入 `i 张清风` | 等同于 `inspect 张清风` | PRD §3.4 命令格式 |

**依赖**：无（独立于 S0）
**复杂度**：M

---

## Story #4 — sect 命令（宗门道风总览）（S4）

**作为** 玩家，
**我希望** 输入 `sect` 查看宗门的道风双轴和基础信息，
**以便** 我能了解宗门当前的立场取向。

### AC（验收条件）

| # | Given | When | Then | Data Anchor |
|---|-------|------|------|-------------|
| AC-4a | 宗门已初始化 | 输入 `sect` | MUD 显示宗门名、等级、声望、灵气浓度 | PRD §3.5 |
| AC-4b | 宗门道风 ethos=-25, discipline=+40 | 输入 `sect` | 道风行显示 `道风: -25 (偏仁)`，刻度尺 ● 在偏左位置；门规行显示 `门规: +40 (偏律)`，● 在偏右位置 | PRD §3.5 可视化规则 |
| AC-4c | 道风极端值 ethos=-100 | 输入 `sect` | 刻度尺 ● 在最左端，标签 `至仁` | PRD §3.5 |
| AC-4d | 道风极端值 ethos=+100 | 输入 `sect` | 刻度尺 ● 在最右端，标签 `至霸` | PRD §3.5 |
| AC-4e | 显示弟子统计 | 输入 `sect` | 显示弟子总数和上缴丹药数 | PRD §3.5 |

**依赖**：无（独立于 S0）
**复杂度**：S

---

## 依赖关系图

```
Story #0 (统一管线) ──→ Story #1 (碰面可见) [零代码]
                    ──→ Story #2 (AI独白+世界事件可见) [零代码]

Story #3 (inspect 命令)  ← 独立
Story #4 (sect 命令)     ← 独立
```

**并行策略**：Story #3 和 #4 可与 Story #0 并行开发。

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-30 | v1.0 | 初始创建，5 Stories |
