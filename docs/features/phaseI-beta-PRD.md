# Phase I-beta PRD — 社交事件系统（关系重构 + 社交引擎）

> **版本**：v1.0 | **日期**：2026-04-02
> **作者**：/SPM | **状态**：Draft → Gate 1 审查
> **Phase ID**：I-beta | **前置**：Phase GS ✅ + Phase I-alpha ✅
> **需求债务清偿**：FB-022（道侣）、FB-007（衰减分层）、FB-008（确认/非确认）、FB-024（部分：性取向）、FB-026（碰面文案性别化）

---

## §1 产品定位

### 1.1 一句话定义

> **将单一好感标量重构为三维关系向量（亲疏·吸引·信赖），并在此基础上构建 AI 驱动的社交事件系统，让弟子之间自然涌现可辨识的关系故事线。**

### 1.2 核心体验

玩家（掌门）自然观察到弟子之间涌现差异化的关系故事线——有人结拜、有人暗恋、有人反目，不是千篇一律的好感增减。掌门可通过裁决干预极端社交事件，但主要体验是旁观涌现。

### 1.3 价值锚定

| 维度 | 说明 |
|------|------|
| **根因价值** | 关系的可辨识演变是"活世界"体验的发动机 |
| **ROI** | 开发成本 L / 用户体验增量 5/5 |
| **循环挂载** | 三维关系 → 社交事件触发 → AI 叙事 → MUD 日志 → 掌门裁决 → 道风漂移 → 影响后续关系 |
| **最小组件** | 三维关系向量替代单一 affinity — 没有维度分化，所有社交事件都只是"好感 ± N" |

### 1.4 5-Why 根因链

```
为什么需要社交事件系统？
→ 弟子之间缺乏关系演变故事线，世界感觉"静态"
  → 为什么缺乏故事线？
  → 好感系统是单一标量，友情/敌意/爱慕共用一个数轴，无法分化
    → 为什么无法分化？
    → 性别引入前不需要区分"友情高"和"吸引高"，现在缺陷暴露
      → 为什么这很重要？
      → 关系演绎是核心内容——"每个弟子有灵魂"需要可感知的关系发展
        → 根因：关系的可辨识演变是"活世界"体验的发动机
```

---

## §2 系统边界

### 2.1 IN/OUT

| ✅ IN | 🚫 OUT |
|:------|:-------|
| 三维关系向量（closeness/attraction/trust） | 玩家主动撮合/指婚 |
| 性取向系统（概率权重，80/15/5 分布） | 子嗣/繁衍系统（FB-023） |
| 离散关系状态（lover/sworn-sibling/crush/nemesis） | 外貌/容貌值（FB-021） |
| AI 驱动邀约流程（发起→判定→接受/拒绝） | T2 幕后 NPC |
| 邀约失败负面后果 + 冷静期 | 完整地图拓扑 |
| 碰面模板性别化文案 | Lv.4 道风转折事件（留后续 Phase） |
| 社交事件 MUD 日志呈现 | 独立社交面板 UI |
| 存档 v7→v8 迁移 | AI LoRA 微调 |
| AI 三维 delta 输出 + 重试机制 | — |

### 2.2 成功标准

| # | 标准 | 验证方式 |
|---|------|---------|
| SC-1 | 运行 30 分钟内，自然涌现 ≥1 段可辨识的"关系故事线" | 人工观察 + AI 日志 |
| SC-2 | 男女弟子间的关系发展路径和同性弟子间有可感知差异 | 人工观察 attraction 维度差异 |
| SC-3 | 掌门（玩家）能在 MUD 日志中清晰看到社交事件发生和关系状态变化 | MUD 日志检查 |
| SC-4 | tsc 0 errors / regression 全通过 / 新专项验证通过 | 自动化脚本 |
| SC-5 | 存档 v7 → v8 迁移无数据丢失 | 迁移脚本验证 |

---

## §3 不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| INV-1 | 三维向量各维度独立演化，不存在自动联动 | closeness 高不能自动推高 attraction，否则所有好友都变恋人 |
| INV-2 | 离散关系状态需要显式社交事件触发，不能仅靠数值越线 | 否则"静默建立关系"没有故事感 |
| INV-3 | attraction 受性取向门控，orientation 为 0 的方向 attraction 永远不增长 | 否则异性恋弟子会对同性产生浪漫吸引 |
| INV-4 | 已建立的离散关系只能通过显式事件解除 | 否则关系"无声消失"，破坏叙事连贯 |
| INV-5 | AI 格式异常触发重试（≤2 次），重试仍失败才降级单维 closeness | 直接降级浪费三维设计 |
| INV-6 | 旧存档 affinity → closeness，attraction/trust 初始 0 | 存档迁移不可断裂 |
| INV-7 | 因果规则注册表只增不删（Object.freeze 延续） | I-alpha INV-4 |

---

## §4 业务实体

### 4.1 三维关系向量

替代原 `RelationshipEdge.affinity: number`：

| 维度 | 字段名 | 范围 | 含义 | 主要用途 |
|------|--------|:----:|------|---------|
| **亲疏** | `closeness` | [-100, +100] | 情感距离（友善/敌意） | friend/rival 标签、碰面分档、行为权重 |
| **吸引** | `attraction` | [0, 100] | 浪漫/性吸引力 | crush/lover 触发条件（受性取向门控） |
| **信赖** | `trust` | [-100, +100] | 忠诚/信任度 | sworn-sibling/nemesis/mentor 条件、叛逃判定 |

**设计依据**（跨游戏调研）：
- The Sims 4：双轴（friendship + romance）+ sentiment 叠加层 — 证明正交分离的必要性
- CK3：opinion + 独立 relationship type — 证明连续值与离散状态分离
- Dwarf Fortress：personality compatibility → rank — 证明性格兼容设天花板
- CiF/Prom Week（学术）：N 个命名网络 + 二元关系状态 — 最严谨的架构模型

### 4.2 性取向系统

每个弟子生成时附带性取向权重：

```
orientation: {
  maleAttraction: number;    // [0, 1] 对男性的吸引力权重
  femaleAttraction: number;  // [0, 1] 对女性的吸引力权重
}
```

**生成分布**（DF 概率权重模式）：

| 类型 | 概率 | maleAttraction | femaleAttraction | 说明 |
|------|:----:|:--------------:|:----------------:|------|
| 异性恋男 | 40% | 0 | 1.0 | 仅对女性产生 attraction |
| 异性恋女 | 40% | 1.0 | 0 | 仅对男性产生 attraction |
| 双性恋男 | 7.5% | 0.5 | 1.0 | 对双方均可，偏异性 |
| 双性恋女 | 7.5% | 1.0 | 0.5 | 对双方均可，偏异性 |
| 同性恋男 | 2.5% | 1.0 | 0 | 仅对男性产生 attraction |
| 同性恋女 | 2.5% | 0 | 1.0 | 仅对女性产生 attraction |

> 总计：80% 异性恋 / 15% 双性恋 / 5% 同性恋（按 USER 要求）
> 按弟子性别和目标性别查表：`effectiveAttraction = orientation[targetGender + 'Attraction']`
> 当 effectiveAttraction = 0 时，attraction delta **不增长**（INV-3）

### 4.3 离散关系状态（RelationshipStatus）

| 状态 | 性质 | 触发前置条件 | 需要 AI 邀约 | 对称性 |
|------|------|-------------|:----------:|:------:|
| **crush**（暗恋） | 单向标记 | attraction ≥ 50（单方向） | ❌ 自动标记 | 单向 |
| **lover**（道侣） | 双向关系 | closeness ≥ 60 + attraction ≥ 70 + 双方性取向兼容 | ✅ AI 判定 | 双向 |
| **sworn-sibling**（结拜） | 双向关系 | closeness ≥ 80 + trust ≥ 60 | ✅ AI 判定 | 双向 |
| **nemesis**（宿敌） | 双向关系 | closeness ≤ -60 + trust ≤ -40 | ✅ AI 判定 | 双向 |

> **crush 是唯一自动标记的状态**：单方向 attraction ≥ 50 时自动赋予，无需社交事件。crush 是 lover 邀约的前置但不充分条件。
> **原有标签保留**：friend / rival / mentor / admirer / grudge 继续由阈值自动分配，但阈值改为基于 closeness（原 affinity 逻辑平移）。

### 4.4 AI 邀约流程（Invitation Protocol）

核心机制：**先达标方由 AI 判定是否发起邀约 → AI 判定对方是否接受**

```
Step 1: 阈值检测（每 causal-tick 扫描）
  → 某对 A→B 满足某离散关系的前置条件
  → 且 A 尚未处于该关系 + 不在冷静期

Step 2: AI 判定发起意愿（Call-1）
  → AI 根据 A 的性格、情绪、当前关系上下文判断：是否发起？
  → 输出：{ willInitiate: boolean, reason: string }
  → 如 willInitiate = false → 进入短冷静期（INITIATE_COOLDOWN），不生成事件

Step 3: AI 判定接受/拒绝（Call-2）
  → AI 根据 B 的性格、情绪、对 A 的关系数值判断：是否接受？
  → 输出：{ accepted: boolean, reason: string }

Step 4a: 接受 → 建立离散关系 + 正面社交事件 + MUD 日志
Step 4b: 拒绝 → 负面后果 + 冷静期 + MUD 日志
```

### 4.5 邀约失败后果

| 关系类型 | 发起方后果 | 被拒方后果 | 冷静期 |
|---------|-----------|-----------|:------:|
| **lover**（告白被拒） | attraction -15, closeness -10, trust -5 | closeness -5 | 1800 ticks（~15 分钟） |
| **sworn-sibling**（结拜被拒） | closeness -10, trust -15 | closeness -5 | 1200 ticks（~10 分钟） |
| **nemesis**（宣战被拒） | closeness +5（对方不接茬反而缓和） | 无 | 900 ticks（~7.5 分钟） |

> 冷静期是**同对+同类型**的，不阻止其他类型邀约。
> 冷静期存储在运行时 Map，不持久化（重启后清零，可接受）。

### 4.6 邀约成功后果

| 关系类型 | 双方后果 | 生成事件 |
|---------|---------|---------|
| **lover** | attraction +10, closeness +10, trust +10 | `social-lover-formed`（SPLASH 级） |
| **sworn-sibling** | closeness +15, trust +20 | `social-sworn-formed`（SPLASH 级） |
| **nemesis** | closeness -15, trust -20 | `social-nemesis-formed`（SPLASH 级） |

### 4.7 离散关系解除条件

| 状态 | 解除条件 | 后果 |
|------|---------|------|
| **crush** | attraction < 30（自动解除） | 无特殊事件 |
| **lover** | closeness < 20 OR trust < 0 → AI 判定分手事件 | attraction -20, closeness -20, trust -15；STORM 级事件 |
| **sworn-sibling** | trust < 20 → AI 判定决裂事件 | closeness -25, trust -30；SPLASH 级事件 |
| **nemesis** | closeness > 0 AND trust > 20 → AI 判定和解事件 | closeness +10, trust +10；SPLASH 级事件 |

---

## §5 规则与数值

### 5.1 三维 Delta 事件路由表

每种事件类型产生的 delta 分配到哪些维度：

| 事件类型 | closeness | attraction | trust | 说明 |
|---------|:---------:|:----------:|:-----:|------|
| encounter-chat | ±2 | +1（如性取向兼容） | +1 | 日常闲聊，小幅全面 |
| encounter-discuss | ±3 | 0 | +2 | 论道增信赖，不增吸引 |
| encounter-conflict | -3 | 0 | -2 | 冲突损信赖 |
| causal-gift | +3 | +1（如性取向兼容） | +2 | 赠礼增全面 |
| causal-provoke | -3 | 0 | -3 | 挑衅严重损信赖 |
| causal-jealousy | -2 | 0 | -2 | 嫉妒损关系 |
| causal-theft | -2 | 0 | -5 | 窃取主要损信赖 |
| causal-ethos-clash | -2 | 0 | -3 | 道风冲突损信赖 |
| social-lover-formed | +10 | +10 | +10 | 道侣建立 |
| social-sworn-formed | +15 | 0 | +20 | 结拜建立 |
| social-nemesis-formed | -15 | 0 | -20 | 宿敌建立 |
| social-lover-broken | -20 | -20 | -15 | 分手 |
| social-sworn-broken | -25 | 0 | -30 | 结拜决裂 |
| social-nemesis-resolved | +10 | 0 | +10 | 宿敌和解 |
| social-confession-rejected | 见 §4.5 | 见 §4.5 | 见 §4.5 | 告白被拒 |
| social-sworn-rejected | 见 §4.5 | 见 §4.5 | 见 §4.5 | 结拜被拒 |
| social-nemesis-rejected | 见 §4.5 | 见 §4.5 | 见 §4.5 | 宣战被拒 |

> **attraction delta 门控**：所有 attraction 正向 delta 都乘以 `effectiveAttraction`（§4.2）。如果 = 0 则不增长。
> **attraction 累积限速**：每对弟子每 300 ticks 内，attraction 正向累积上限 +5（防止同区持续碰面导致 attraction 爆炸式增长）。

### 5.2 标签阈值重映射（原有标签迁移到 closeness）

| 标签 | 原阈值（affinity） | 新阈值（closeness 为主） | 变化 |
|------|:------------------:|:----------------------:|------|
| **friend** | affinity ≥ 60 | closeness ≥ 60 | 直接映射 |
| **rival** | affinity ≤ -60 | closeness ≤ -60 | 直接映射 |
| **mentor** | affinity ≥ 80 + starGap ≥ 2 | closeness ≥ 80 + trust ≥ 40 + starGap ≥ 2 | 增加 trust 条件 |
| **admirer** | affinity ≥ 60 + 正面特性 + 3正向事件 | closeness ≥ 60 + 正面特性 + 3正向事件 | 直接映射 |
| **grudge** | affinity ≤ -40 + 3负面事件 | closeness ≤ -40 + trust ≤ -20 + 3负面事件 | 增加 trust 条件 |

### 5.3 衰减系统重设计（清偿 FB-007）

| 维度 | 衰减率 | 衰减阈值 | 衰减间隔 | 说明 |
|------|:------:|:--------:|:--------:|------|
| **closeness** | 0.98 | \|value\| ≤ 5 | 300s | 保持原设计 |
| **attraction** | 0.99 | value ≤ 3 | 300s | 吸引力衰减更慢（感情消退慢） |
| **trust** | 0.995 | \|value\| ≤ 3 | 300s | 信赖衰减最慢（信任建立难、消退也难） |

> **离散关系保护**：处于 lover/sworn-sibling 关系的对子，closeness/attraction/trust 衰减率各 ×0.5（关系稳定效应）。

### 5.4 碰面系统适配

碰面分档改为基于 closeness（直接替代 affinity）：

| 分档 | 条件 | 概率表 | 变化 |
|------|------|--------|------|
| **friend** | avg closeness ≥ 60 | 不变：discuss 50 / chat 50 | closeness 替代 affinity |
| **hostile** | avg closeness ≤ -60 | 不变：chat 10 / conflict 60 / none 30 | closeness 替代 affinity |
| **neutral** | 其余 | 不变：discuss 5 / chat 30 / conflict 5 / none 60 | closeness 替代 affinity |
| **crush/lover** | 任一方有 crush 或双方为 lover | **新增**：discuss 20 / chat 60 / flirt 15 / none 5 | 新增 flirt 碰面结果 |

> **新增碰面结果 `flirt`**：当任一方有 crush 或双方为 lover 时，碰面可能产生 flirt（调情）。
> flirt 事件效果：closeness +2, attraction +3（受门控），trust +1。
> flirt 的 MUD 文案性别化（清偿 FB-026）。

### 5.5 AI 三维 Delta Schema

替代原 `relationshipDeltas` 中的单一 `delta: number`：

```json
{
  "relationshipDeltas": [
    {
      "targetId": "string",
      "closeness": { "type": "number", "minimum": -5, "maximum": 5 },
      "attraction": { "type": "number", "minimum": -5, "maximum": 5 },
      "trust": { "type": "number", "minimum": -5, "maximum": 5 },
      "reason": "string"
    }
  ]
}
```

**Few-shot 示例**（注入 AI prompt）：

```json
// 示例 1: 正面碰面，异性，性取向兼容
{"targetId":"d2","closeness":3,"attraction":1,"trust":2,"reason":"论道切磋，互有启发"}

// 示例 2: 负面冲突，同性，attraction 不增长
{"targetId":"d5","closeness":-2,"attraction":0,"trust":-3,"reason":"争执不下，互不信任"}

// 示例 3: 正面互动，同性恋弟子对同性目标
{"targetId":"d3","closeness":2,"attraction":2,"trust":1,"reason":"心生好感，默默关注"}
```

**AI 重试机制**：
1. 首次调用返回的 delta 格式校验失败 → 重试（≤2 次，保持相同 prompt）
2. 第 3 次仍失败 → 降级：取 delta 值（如有）作为 closeness，attraction/trust = 0
3. 降级事件记录到日志（便于排查）

### 5.6 性格兼容度（天花板机制）

参考 DF 模型：性格兼容设定关系发展**天花板**。

```
compatibilityScore(A, B) = 基于五维性格相似度 [0, 1]
  = 1 - (|A.personality - B.personality| 的归一化欧几里得距离)

closeness 天花板 = compatibilityScore × 100
  → 当 closeness > 天花板 时，正向 closeness delta × 0.1（极度衰减）
  → 性格不合的弟子很难成为挚友，但可以通过大量互动缓慢突破

attraction 天花板 = effectiveAttraction × 100
  → 性取向不兼容的方向完全封锁（×0）

trust 无天花板（信任不受性格限制，受行为驱动）
```

### 5.7 新增因果规则

在现有 CR-01~CR-06 基础上新增社交因果规则：

| ID | 名称 | triggerType | 条件 | 结果事件 | 严重级 | 冷却 |
|----|------|------------|------|---------|:------:|:----:|
| CR-07 | 暗恋告白 | social-invitation | crush + lover 前置条件满足 | social-confession | SPLASH | 1800 |
| CR-08 | 结拜提议 | social-invitation | sworn-sibling 前置条件满足 | social-sworn-proposal | SPLASH | 1200 |
| CR-09 | 宣战宿敌 | social-invitation | nemesis 前置条件满足 | social-nemesis-declare | SPLASH | 900 |
| CR-10 | 道侣分手 | social-dissolution | lover 解除条件满足 | social-lover-broken | STORM | 1800 |
| CR-11 | 结拜决裂 | social-dissolution | sworn-sibling 解除条件满足 | social-sworn-broken | SPLASH | 1200 |
| CR-12 | 宿敌和解 | social-dissolution | nemesis 解除条件满足 | social-nemesis-resolved | SPLASH | 900 |

### 5.8 新增 SoulEventType

```typescript
// Phase I-beta: 社交事件
| 'social-flirt'              // 碰面调情
| 'social-confession'         // 告白（邀约中）
| 'social-confession-accepted'  // 告白成功
| 'social-confession-rejected'  // 告白被拒
| 'social-sworn-proposal'     // 结拜提议（邀约中）
| 'social-sworn-accepted'     // 结拜成功
| 'social-sworn-rejected'     // 结拜被拒
| 'social-nemesis-declare'    // 宣战（邀约中）
| 'social-nemesis-accepted'   // 宣战接受
| 'social-nemesis-rejected'   // 宣战拒绝
| 'social-lover-broken'       // 道侣分手
| 'social-sworn-broken'       // 结拜决裂
| 'social-nemesis-resolved'   // 宿敌和解
```

### 5.9 MUD 文案模板（每类 ≥3 条）

#### social-confession（告白）

```
'{A}鼓起勇气走向{B}，红着脸低声说了什么。'
'{A}在{L}趁无人时，向{B}递出了一枝灵花。'
'{A}深吸一口气，对{B}说道："我……有些话想跟你说。"'
```

#### social-confession-accepted（告白成功）

```
'{B}怔了片刻，嘴角浮现出温暖的笑意。两人在{L}并肩而立。'
'{B}接过灵花，轻声道："我也是。"——{L}的月光格外柔和。'
'{A}与{B}在{L}互许道心，从此结为道侣。'
```

#### social-confession-rejected（告白被拒）

```
'{B}沉默良久，轻轻摇了摇头。{A}独自转身离去。'
'{B}叹了口气："你是好人，但……"。{A}勉强一笑。'
'{A}的心意被{B}婉拒，{L}的风似乎冷了几分。'
```

#### social-sworn-proposal（结拜提议）

```
'{A}在{L}郑重其事地对{B}说："我愿与你义结金兰。"'
'{A}取出两碗灵酒，推到{B}面前："愿同甘共苦，不弃不离？"'
'{A}望着{B}，眼中满是信任："我想和你结为异姓兄弟/姐妹。"'
```

#### social-sworn-accepted（结拜成功）

```
'{A}与{B}在{L}对天盟誓，义结金兰！从此祸福与共。'
'两碗灵酒一饮而尽——{A}与{B}在{L}结为异姓手足。'
'{A}与{B}并肩而立，{getPronoun(A.gender)}与{getPronoun(B.gender)}之间的羁绊又深了一层。'
```

#### social-sworn-rejected（结拜被拒）

```
'{B}犹豫了很久，最终放下了酒碗："我还没准备好。"'
'{B}婉言谢绝了{A}的结拜邀约。{A}面色微变。'
'{A}的结拜提议被{B}婉拒。两人之间似乎多了一丝尴尬。'
```

#### social-nemesis-declare（宣战）

```
'{A}在{L}冷冷地盯着{B}："从今以后，你我势不两立。"'
'{A}指着{B}的鼻子："你给我记住——这笔账迟早要算。"'
'{A}再也无法忍受{B}，在{L}当众宣告决裂。'
```

#### social-nemesis-accepted（宣战接受）

```
'{B}冷笑一声："正合我意。"——两人从此势同水火。'
'{B}拍案而起："既然你撕破了脸，那就不必客气。"'
'{A}与{B}在{L}公开对立，宗门气氛骤然紧张。'
```

#### social-nemesis-rejected（宣战拒绝）

```
'{B}不屑地转过身："你不值得我当对手。"'
'{B}淡淡一笑，并未接茬。{A}攥紧了拳头。'
'{A}的宣战被{B}无视了——这让{getPronoun(A.gender)}更加愤怒。'
```

#### social-lover-broken（分手）

```
'{A}与{B}在{L}长谈之后，黯然分手。道侣缘尽。'
'{B}取下定情灵花放在桌上，转身离去。{A}一言不发。'
'曾经的道侣{A}与{B}分道扬镳，{L}的空气都沉重了几分。'
```

#### social-sworn-broken（决裂）

```
'{A}将盟约令牌摔在地上："你我情义到此为止！"'
'金兰之盟一朝崩裂——{A}与{B}在{L}决裂。'
'{A}冷冷地看着{B}："我不该信你。"义兄弟/姐妹反目成仇。'
```

#### social-nemesis-resolved（和解）

```
'{A}在{L}主动向{B}递出灵茶。多年恩怨，一笑泯之。'
'{A}与{B}在{L}不约而同地低下了头——宿敌之间的坚冰终于消融。'
'经历了诸多波折，{A}与{B}终于放下了往日仇怨。'
```

#### social-flirt（调情）

```
'{A}望向{B}的眼神中多了几分温柔。'
'{A}在{L}故意走近{B}身旁，两人目光交汇了一瞬。'
'{A}低声对{B}说了什么，{B}的脸微微泛红。'
```

### 5.10 初始关系生成适配

```
原：baseAffinity = randomInt(-10, 10) + Math.round((moralSimilarity - 0.5) * 20)

新：
  closeness = randomInt(-10, 10) + Math.round((moralSimilarity - 0.5) * 20)  // 保持原逻辑
  attraction = 0  // 初始无吸引（通过碰面/事件发展）
  trust = randomInt(0, 10) + Math.round((moralSimilarity - 0.5) * 10)  // 道德相似→初始信任
```

### 5.11 存档迁移 v7→v8

```
migration:
  对每个 RelationshipEdge:
    closeness = edge.affinity          // 直接映射
    attraction = 0                      // 新维度初始 0
    trust = Math.round(edge.affinity * 0.5)  // 从 affinity 推断初始信赖
    // 保留 tags, lastInteraction 不变

  对每个 LiteDiscipleState:
    新增 orientation 字段:
      根据 gender + 随机概率按 §4.2 分布表生成

  对每个 RelationshipMemory:
    affinity 字段→拆分为 closeness/attraction/trust 缓存
    keyEvents[].affinityDelta→保留为 closenessDelta（历史兼容）
```

---

## §6 代码对账清单

| 引用字段/类型 | 代码位置 | 状态 | 处理方案 |
|-------------|---------|:----:|---------|
| `RelationshipEdge.affinity` | game-state.ts:203 | ✅ 存在 | → 拆为 closeness/attraction/trust |
| `RelationshipTag` 5 种 | soul.ts:187 | ✅ 存在 | 保留 + 新增离散状态类型 |
| `RELATIONSHIP_TAG_THRESHOLDS` | soul.ts:190-193 | ✅ 存在 | 阈值改为 closeness 基准 |
| `ADVANCED_TAG_THRESHOLDS` | soul.ts:196-212 | ✅ 存在 | mentor/grudge 增加 trust 条件 |
| `RelationshipMemory.affinity` | relationship-memory.ts:21 | ✅ 存在 | → 拆为三维缓存 |
| `KeyRelationshipEvent.affinityDelta` | relationship-memory.ts:46 | ✅ 存在 | → 改为三维 delta 或保留 closeness 主轴 |
| `getAvgAffinity()` | encounter.ts:180-190 | ✅ 存在 | → `getAvgCloseness()` 重命名 |
| `AFFINITY_BAND` | encounter.ts:91-96 | ✅ 存在 | → `CLOSENESS_BAND` 重命名 |
| `Gender` 类型 | game-state.ts:26 | ✅ 存在 | 读取用于性取向门控 |
| `SoulEvaluationResult.relationshipDeltas[].delta` | soul.ts:177 | ✅ 存在 | → 拆为三维 |
| `SOUL_EVENT_POLARITY` | soul.ts:119-140 | ✅ 存在 | 新增 13 个社交事件极性 |
| `CausalRule.condition.affinityMin/Max` | causal-rule-registry.ts | ✅ 存在 | → closenessMin/Max |
| `DiscipleEmotionState` | soul.ts:155-164 | ✅ 存在 | 无需变更 |
| `MoralAlignment` | soul.ts:18-23 | ✅ 存在 | 无需变更 |
| `LiteDiscipleState.gender` | game-state.ts:195 | ✅ 存在 | 读取用于性取向生成/查询 |
| `orientation` 字段 | 不存在 | ❌ 新增 | LiteDiscipleState 新增字段 |
| `RelationshipStatus` 类型 | 不存在 | ❌ 新增 | 新类型定义 |
| `social-*` SoulEventType | 不存在 | ❌ 新增 | 13 个新增事件类型 |
| `CausalTriggerType` 新值 | causal-event.ts | ✅ 存在 | 新增 `social-invitation` + `social-dissolution` 两个 union 成员 |
| `EncounterResult.FLIRT` | encounter.ts | ✅ 存在 | 新增 `flirt` 碰面结果 |
| `AffinityBand` crush/lover 分档 | encounter.ts | ✅ 存在 | 新增第 4 个分档 |
| `ENCOUNTER_PROBABILITY_TABLE` 第 4 行 | encounter.ts | ✅ 存在 | 新增 crush/lover 概率行 |

> 所有 ❌ 新增项均为本 Phase 交付物，不存在引用不存在字段的风险。

---

## §7 Pre-Mortem

| # | 可能的失败模式 | 概率 | 影响 | 缓解措施 |
|---|-------------|:----:|:----:|---------|
| PM-1 | 2B 模型无法稳定输出三维 delta JSON | 中 | 高 | 重试机制 + 单维降级 + SGE PoC 验证 |
| PM-2 | 20 文件重构引入回归 bug | 高 | 中 | 分层重构：类型→公式→引擎→AI→UI + 每层回归 |
| PM-3 | 性格兼容度天花板导致关系发展过慢 | 中 | 中 | 天花板不完全封锁（×0.1 衰减非 ×0），可调参 |
| PM-4 | 社交事件频率太高/太低 | 中 | 中 | 冷却参数可调；Storyteller 已有节奏控制 |
| PM-5 | 邀约 AI 调用增加 API 压力 | 低 | 中 | 邀约仅在阈值触发时发生（非每 tick）；复用现有 ai-server |
| PM-6 | 存档迁移 trust 推断不准 | 低 | 低 | trust = affinity × 0.5 是合理近似；不完美但可接受 |

## §8 Assumption Audit

| # | 假设 | 验证方式 | 风险 |
|---|------|---------|:----:|
| AA-1 | 2B 模型能区分 closeness/attraction/trust 语义 | SGE PoC 测试 | 中 |
| AA-2 | 三维足够覆盖社交事件（不需要第四维） | 调研支撑（5 个游戏参考） | 低 |
| AA-3 | 80/15/5 性取向分布产出足够的浪漫故事线（8 弟子中约 1.2 人非异性恋） | Monte Carlo 模拟 | 中 |
| AA-4 | 冷静期参数合理（不过长/过短） | 运行观察 + 参数可调 | 低 |
| AA-5 | 性格兼容度天花板不会过度限制 | Monte Carlo + 参数调优 | 中 |
