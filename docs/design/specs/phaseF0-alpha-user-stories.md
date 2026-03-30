# User Stories: Phase F0-α（碰面世界）

> **版本**：v1.0 | **日期**：2026-03-30
> **关联 PRD**：[phaseF0-alpha-PRD.md](../../features/phaseF0-alpha-PRD.md)
> **Phase**：F0-α | **Story 数**：5

---

## Story 1: 弟子地点推导 `[S]`

> 作为引擎，我希望根据弟子当前行为推导出其所在地点，以便后续碰面检定可按地点分组。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子行为为 `MEDITATE` | 调用 `getDiscipleLocation('meditate')` | 返回 `BACK_MOUNTAIN` | PRD §3.3 F-F0α-01 完整映射表（L125~L133，7 行） |
| 2 | 弟子行为为 `REST` 或 `IDLE` | 调用 `getDiscipleLocation` | 均返回 `SECT_HALL` | 同上 |
| 3 | 传入不存在的行为值（类型安全检测） | 调用 `getDiscipleLocation` | TypeScript 编译时报错（exhaustive switch，无运行时 fallback） | — |

**依赖**：无

---

## Story 2: 碰面检定引擎 `[M]`

> 作为碰面系统，我希望定期扫描同地点弟子并以概率触发碰面事件，以便弟子不再是平行线。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | TickPipeline 已注册 encounter-tick handler | 每 tick 执行 | handler 仅在 `tickCount % 5 === 0` 时执行扫描逻辑，其他 tick 直接 return | PRD §3.3 F-F0α-02（L148：`ENCOUNTER_SCAN_INTERVAL_SEC = 5`） |
| 2 | 2 个弟子同在 `BACK_MOUNTAIN`，无碰面冷却 | 扫描 tick 触发 | 以 20% 概率触发碰面（`BASE_ENCOUNTER_CHANCE = 0.20`） | PRD §3.3 F-F0α-02（L150：`BASE_ENCOUNTER_CHANCE = 0.20`） |
| 3 | 同一对弟子 (A, B) 在 30 秒前刚碰过面 | 扫描 tick 触发 | 因冷却未过（60 秒）而跳过该对，不触发碰面 | PRD §3.3 F-F0α-02（L149：`ENCOUNTER_COOLDOWN_SEC = 60`） |
| 4 | 同一对弟子 (A, B) 上次碰面距今 > 60 秒 | 扫描 tick 触发 | 冷却已过，正常执行 20% 概率掷骰 | 同上 |
| 5 | 3 个弟子 A/B/C 同在一个地点 | 扫描 tick 触发 | 枚举 3 个无序对 (A,B) (A,C) (B,C) 分别独立判定 | PRD §3.3 F-F0α-02 步骤 3（L157） |
| 6 | 8 个弟子分布在 6 个不同地点，无任何同地 | 扫描 tick 触发 | 无任何碰面触发 | — |

**依赖**：Story 1（地点推导）

---

## Story 3: 碰面结果判定与事件发射 `[M]`

> 作为碰面系统，我希望根据双方好感度决定碰面调性并发射事件到 EventBus，以便后续系统可消费碰面事件。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | A→B affinity=70, B→A affinity=80（avgAff=75，挚友带） | 碰面触发 | 结果从 `{discuss: 50%, chat: 50%}` 中加权随机选取，无 conflict 可能 | PRD §3.3 F-F0α-03 概率表挚友带行（L189） |
| 2 | A→B affinity=-70, B→A affinity=-80（avgAff=-75，敌对带） | 碰面触发 | 结果从 `{chat: 10%, conflict: 60%, none: 30%}` 中加权随机选取 | PRD §3.3 F-F0α-03 概率表敌对带行（L190） |
| 3 | A→B affinity=10, B→A affinity=-5（avgAff=2.5，路人带） | 碰面触发 | 结果从 `{discuss: 5%, chat: 30%, conflict: 5%, none: 60%}` 中加权随机选取 | PRD §3.3 F-F0α-03 概率表路人带行（L191） |
| 4 | 碰面结果为 `chat`（非 none） | 结果判定完成 | 向 EventBus 发射 **2 条** SoulEvent：actorId=A 的 `encounter-chat` + actorId=B 的 `encounter-chat`，metadata 包含 `partnerId/partnerName/location/encounterResult/avgAffinity` | PRD §3.1 R-F0α-E6（L94~L102） |
| 5 | 碰面结果为 `none` | 结果判定完成 | **不发射** SoulEvent，不输出日志 | PRD §3.1 R-F0α-E2 第 4 行（L63） |
| 6 | 碰面结果为 `conflict` | 结果判定完成 | 发射类型为 `encounter-conflict` 且 `SOUL_EVENT_POLARITY['encounter-conflict'] === 'negative'` | PRD §3.1 R-F0α-E3（L73） |

**依赖**：Story 2（碰面检定引擎）

---

## Story 4: 碰面 MUD 日志输出 `[S]`

> 作为玩家，我希望在 MUD 日志中看到弟子碰面的文字描述，以便感知弟子之间的互动。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 碰面结果为 `chat`，A="张清风"，B="李墨染"，地点=`BACK_MOUNTAIN` | 事件发射时 | MUD 日志输出一条从 chat 模板库中随机选取的文案，占位符 `{A}→张清风`, `{B}→李墨染`, `{LOC}→后山` 已替换 | PRD §4.2 chat 模板 3 条（L247~L249） |
| 2 | 碰面结果为 `discuss` | 事件发射时 | MUD 日志输出 discuss 模板库中的文案，且日志级别为**高亮**（Lv.2 浪花） | PRD §4.2 discuss 模板 3 条（L255~L257） |
| 3 | 碰面结果为 `conflict` | 事件发射时 | MUD 日志输出 conflict 模板库中的文案，且日志级别为**高亮**（Lv.2 浪花） | PRD §4.2 conflict 模板 3 条（L263~L265） |
| 4 | 碰面结果为 `none` | 无事件 | MUD 日志**不输出**任何碰面文案 | — |

**依赖**：Story 3（碰面结果判定）

---

## Story 5: 宗门道风状态与存档迁移 `[S]`

> 作为引擎，我希望 SectState 支持道风/门规双轴且存档版本正确迁移，以便后续 Phase 可基于道风做事件/AI 调性分化。

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 创建新游戏，选择"仁道"初始化 | 调用初始化函数 | `sect.ethos === -40` 且 `sect.discipline === 20` | PRD §3.1 R-F0α-E4 仁道行（L79） |
| 2 | 创建新游戏，选择"中庸"初始化 | 调用初始化函数 | `sect.ethos === 0` 且 `sect.discipline === 0` | PRD §3.1 R-F0α-E4 中庸行（L80） |
| 3 | 创建新游戏，选择"霸道"初始化 | 调用初始化函数 | `sect.ethos === 40` 且 `sect.discipline === -20` | PRD §3.1 R-F0α-E4 霸道行（L81） |
| 4 | 加载一个 v4 版本的存档 | 执行 v4→v5 迁移 | `sect.ethos === 0`，`sect.discipline === 0`，`version === 5` | PRD §3.1 R-F0α-E5 默认值列（L87~L88） |
| 5 | 加载一个 v1 版本的存档 | 执行 v1→v2→v3→v4→v5 迁移链 | 迁移成功，所有字段有效，`version === 5` | — |
| 6 | 设置 `sect.ethos = 150`（越界） | 写入时 | 自动 clamp 为 100（硬约束 `[-100, +100]`） | PRD §1 I4（L17） |

**依赖**：无

---

## 反模式自检

| 检查项 | 结果 |
|--------|------|
| AC 使用模糊动词 | ✅ 无 — 所有 Then 含精确数值/条件 |
| AC 缺少 Given | ✅ 无 — 每条 AC 均有具体前置 |
| Story 过大 | ✅ 无 — 最大 Story 6 条 AC |
| 缺少边界 AC | ✅ 有 — Story 1 AC3 类型安全、Story 2 AC6 空地点、Story 5 AC6 clamp |
| 依赖不明确 | ✅ 无 — 每条明确标注 |
| Data Anchor 缺失 | ✅ 无 — 涉及数据的 AC 均有 PRD §引用 + 行号 |
