# Phase IJ — NPC 深度智能预研 PRD

> **版本**：v3.0 | **日期**：2026-04-01
> **Phase 类型**：预研型（设计定案 + 核心 PoC）
> **合并范围**：Phase I（深度世界）+ Phase J（涌现与深度）+ Supermemory 记忆理念
> **维护者**：/SPM
> **GATE 1**：`[x] GATE 1 PASSED` — 2026-04-01（v3.0，修复 B1/B2 后重审通过）

---

## §1 背景与动机

### 1.1 为什么合并预研

Phase I（T2 NPC + 因果事件）和 Phase J（记忆 + 目标 + 自驱）互相依赖：

- T2 NPC 需要轻量记忆才能产生有意义的因果事件
- 因果事件是记忆系统的输入源（无事件→记忆空转）
- 个人目标需要记忆作为决策依据

三个系统的设计必须统一预研，否则各自实施后接口不匹配。

### 1.2 灵感来源

借鉴 [Supermemory](https://github.com/supermemoryai/supermemory) 的核心理念（不引入依赖）：

- **事实提取** vs 原始文本 → 结构化记忆条目
- **矛盾覆盖** → 同类型同对象新条目替换旧条目
- **过期遗忘** → TTL 衰减机制
- **分层记忆** → permanent / decaying / instant 三层

### 1.3 当前痛点

| 问题 | 现状 | 影响 |
|------|------|------|
| **Prompt 无关系上下文** | soul-prompt-builder 不注入任何 relationship 信息 | AI 不知道"这是你的死对头" |
| 记忆无结构 | `shortTermMemory: string[]` FIFO 10 条 | 无优先级、无分类、浪费 token |
| 弟子无记忆连续性 | 不记得与特定弟子的历史 | 对话/决策缺乏因果逻辑 |
| 无因果事件 | 规则设计完成但未实施 | 灵魂系统缺少外部验证输入 |
| 无个人目标 | 弟子每 tick 独立决策 | 无"想突破/想复仇"的持续驱动力 |
| 无 T2 NPC | 世界事件仅靠事件池随机抽取 | 缺少外部 NPC 驱动的叙事 |

### 1.4 V2.0 核心修正（来自 USER 反馈）

> **旧模型（v1.0 错误）**：每个弟子 → 个人记忆列表 → 全量注入 prompt
> **新模型（v2.0 修正）**：每对弟子 A↔B → 关系摘要 → 交互时按对方注入 prompt

关键认知转变：
1. **Prompt 注入的是关系摘要，不是个人日记** — A 与 B 碰面时，注入 A↔B 的好感、标签、关键事件；不注入 A 与 C/D/E 的无关信息
2. **"经常碰面"是统计量，不是记忆** — encounterCount 用于规则引擎，不占 prompt token
3. **PoC 测试的是"上下文量 vs AI 质量"曲线** — 不是硬定容量，而是实验出模型的甜蜜点
4. **本地模型 token 代价低** — 瓶颈不是 token 成本，而是小模型的理解力上限

### 1.5 V3.0 核心升级（来自 V4 基准测试）

> **V4 基准测试报告**：`docs/pipeline/phaseIJ-poc/review-v4-final-benchmark.md`
> **测试规模**：3 次完整测试 × 175 逻辑调用 = ~735 次 AI 请求
> **测试模型**：Qwen3.5-0.8B vs Qwen3.5-2B（RTX 5070 12GB）

关键发现与决策：

1. **模型升级 0.8B → 2B** — 2B 在情绪正确率(+10pp)、行为正确率(+13pp)、行为稳定度(+15pp) 全面领先，延迟相当（828ms vs 811ms），VRAM 仅多 722MB
2. **甜蜜点从 L3 单级 → L6/L2 双级策略** — L2 综合分最高(93)适合日常；L6 是唯一能打破 2B PROTECT bias 的级别，决策场景必须用 L6
3. **PROTECT Bias 发现** — 2B 因 RLHF 对齐习得"救人优先"默认值，仅事件列表(L3)无法打破；需叙事性上下文(narrative snippet)将冲突从"事件层面"升级为"人格层面"的恶意
4. **Narrative Snippet 成为必要组件** — 不是锦上添花，而是 2B 正确决策的必要条件
5. **Token 上限放宽 512→1024** — 2B 模型 32K 上下文窗口，1024 完全在能力内；L6 含 narrative snippet 需 ~400-450 tokens

### 1.6 宪法变更声明

> [!IMPORTANT]
> 本 Phase 的模型升级和 Token 上限变更需要同步更新以下宪法级文档。
> 这些更新作为 **GATE 1 通过后、TDD 启动前的前置条件**执行。

| 文档 | 变更项 | 旧值 | 新值 |
|------|--------|------|------|
| `CLAUDE.md` L108 | 后端内存占用红线 | ≤ 1GB（含 0.8B ~800MB） | ≤ 2GB（含 2B ~1.2GB GGUF + ~1.9GB VRAM） |
| `CLAUDE.md` L183 | AI 模型规格 | Qwen3.5-0.8B（GGUF Q4_K_M） | **Qwen3.5-2B**（GGUF Q4_K_M），降级方案 0.8B |
| `CLAUDE.md` L184 | 推理预算 prompt 上限 | ≤ 512 tokens | ≤ **1024** tokens |
| `MASTER-PRD` L88 | OUT 列 "大模型切换" | LoRA 微调 / 大模型切换 | LoRA 微调 / **跨系列**大模型切换（同系列规格升级不受限） |
| `MASTER-PRD` L119-120 | Phase I/J 路线图 | 独立 Phase I + Phase J | Phase IJ 合并预研（v2.0→v3.0） |

**变更理由**：V4 基准测试（735 次 AI 请求，3 次完整对照实验）提供了充分数据支撑。2B 在情绪正确率(+10pp)、行为正确率(+13pp)、行为稳定度(+15pp) 全面领先，延迟相当（828ms vs 811ms），VRAM 仅多 722MB（RTX 5070 12GB 仍余 8.7GB）。这不是"切换到不同的大模型"，而是同一 Qwen3.5 系列内的参数量升级。

### 1.7 Narrative Snippet 在 0.8B 降级场景的处置

当降级到 0.8B + L3 时：
- Narrative snippet **完全跳过**，不注入 prompt
- 0.8B 的甜蜜点是 L3（好感+标签+3事件），V4 数据显示 0.8B 在 L3 的��合分为 90，无需叙事辅助
- 规则拼接器代码保留但不在 0.8B 降级路径上调用
- **降级触发条件**：ai-server 检测到加载的模型为 0.8B 时，自动切换到 L3 单级策略

---

## §2 交付目标

| 子系统 | 交付深度 | 说明 |
|--------|:-------:|------|
| **关系记忆系统** | 设计 + PoC 代码 | RelationshipMemory 结构 + 关键事件记录 + Prompt 关系摘要注入 |
| **Narrative Snippet 系统** | 设计 + 代码 | 三层降级（AI预生成/规则拼接/模板）+ L2/L6 动态切换 |
| **因果事件** | 仅设计定案 | 规则表 + 接口定义，不写实现代码 |
| **个人目标** | 仅设计定案 | GoalType + 行为偏移规则，不写实现代码 |
| **T2 NPC** | 仅架构设计 | 数据结构 + 行为循环 + 与 T1 交互接口 |

**存档策略**：预研阶段不做 v5→v6 迁移，PoC 用内存临时结构验证。

---

## §3 业务实体

| 实体 | 说明 | 归属子系统 |
|------|------|-----------|
| **RelationshipMemory** | A↔B 配对的关系记忆（扩展 RelationshipEdge） | 关系记忆 |
| **KeyRelationshipEvent** | 改变关系的重大事件记录 | 关系记忆 |
| **NarrativeSnippet** | A↔B 关系的叙事性归纳（≤80 字符），用于 L6 Prompt 注入 | Narrative 系统 |
| **ContextLevelStrategy** | L2/L6 动态切换逻辑（按事件等级路由） | Prompt 注入 |
| **CausalRule** | 因果事件触发规则（条件→事件映射） | 因果事件 |
| **CausalTriggerType** | 因果事件的触发条件类型 | 因果事件 |
| **PersonalGoal** | 弟子个人目标（来源 + 动机 + 行为偏移） | 目标系统 |
| **GoalType** | 目标类型枚举 | 目标系统 |
| **T2NpcProfile** | T2 幕后 NPC 的轻量档案 | T2 架构 |

---

## §4 关系记忆系统规则

### R-M01 RelationshipMemory 结构

```typescript
/** 扩展现有 RelationshipEdge，增加关系记忆 */
interface RelationshipMemory {
  /** A→B 方向（与 RelationshipEdge 一致） */
  sourceId: string;
  targetId: string;

  /** 已有数据（直接从 RelationshipEdge 读取） */
  affinity: number;           // 好感 [-100, +100]
  tags: RelationshipTag[];    // friend / rival / ...

  /** 关键事件摘要（只保留改变关系的事件） */
  keyEvents: KeyRelationshipEvent[];

  /** 叙事片段缓存（由 NarrativeSnippetBuilder 生成） */
  narrativeSnippet?: string;  // ≤80 字符，L6 Prompt 注入用

  /** 统计量（不注入 prompt，仅用于规则引擎） */
  encounterCount: number;     // 碰面次数
  lastEncounterTick: number;  // 上次碰面 tick
  dialogueCount: number;      // 对话次数
}

interface KeyRelationshipEvent {
  content: string;            // 摘要文本（≤30 字符）
  tick: number;               // 发生时的游戏 tick
  affinityDelta: number;      // 这次事件带来的好感变化
}
```

### R-M02 关键事件记录规则

一次交互产生的好感变化 `|affinityDelta| >= 5` 时，记录为 KeyRelationshipEvent。

- 事件容量**不硬限制**，由 PoC 实验确定最优注入量
- 存储上限暂定 10 条/每对关系（防止无限增长），溢出时淘汰 |affinityDelta| 最小的
- "经常碰面"等统计量只更新 encounterCount，**不记录为事件**

### R-M03 矛盾覆盖规则

同一对关系、同类型事件、≤50 tick 间隔内：新事件替换旧事件。

**"同类型"判定标准**：两条 KeyRelationshipEvent 的 `content` 前缀相同（如"碰面冲突""争夺资源"），或由同一 CausalRule ID 触发。不同 CausalRule 产生的事件即使等级相同也视为不同类型。

### R-M04 Prompt 注入规则

Prompt 注入的是 **当前交互对方的关系摘要**，而非全量个人记忆。

注入时机：仅当 A 与 B 发生交互（对话/碰面/事件涉及 B）时注入 A→B 的摘要。

**注入深度由事件等级决定**（R-M08 动态切换规则）。

### R-M05 Prompt 注入格式（L2/L6 双级）

**L2 格式（Lv.0-1 日常事件）：**
```
【与李沐阳的关系】
好感：-45（死对头）
关键经历：上月因争夺破境草翻脸(-20)
```

**L6 格式（Lv.2+ 决策事件）：**
```
【与李沐阳的关系】
好感：-45（死对头）
关键经历：因争夺破境草翻脸(-20)；裁决中被掌门判有过(-15)；在灵兽山被其暗算(-10)
张清风与李沐阳积怨已深。此人曾因争夺破境草与你翻脸，裁决中又被掌门判有过，更在灵兽山暗中算计——屡次三番，此人不可信。
个人近况：筑基突破成功，实力大增
```

### R-M06 个人记忆（降级为可选辅助，不在本 Phase 实施）

> 原 v1.0 设计的个人记忆 MemoryEntry 系统**降级为可选辅助**。
> 核心 Prompt 注入走关系摘要路径（R-M04/R-M05）。

---

## §4.5 Narrative Snippet 系统规则

### R-M07 Narrative Snippet 三层降级策略

| 优先级 | 方案 | 触发条件 | 产出 | 延迟预算 |
|:------:|------|---------|------|:--------:|
| 1 | **AI 预生成** | keyEvent 记录时异步调用 AI 生成 1 句叙事 | 缓存到 `narrativeSnippet` | ≤ 2000ms |
| 2 | **规则拼接** | AI 不可用/超时/PoC 未通过 | 运行时实时拼接 | ≤ 5ms |
| 3 | **模板插值** | 规则拼接异常（理论上不会） | 预定义模板 × 变量填充 | ≤ 1ms |

> **AI 预生成需 PoC 验证**（IJ-11）。本 Phase 优先实现规则拼接（层 2）和模板（层 3）作为 baseline 和 fallback。AI 预生成（层 1）在 PoC 验证通过后上线。

### R-M08 L2/L6 动态切换规则

| 事件等级 | Context Level | 注入内容 | 说明 |
|:--------:|:------------:|---------|------|
| 无交互对象 | L0 | 无关系摘要 | 日常修炼/种田等独立行为 |
| Lv.0 呼吸 | L2 | 好感+标签+1条关键事件 | 环境氛围事件 |
| Lv.1 涟漪 | L2 | 好感+标签+1条关键事件 | 碰面/日常交互 |
| **Lv.2 浪花** | **L6** | L2 + narrative snippet + 个人近况 | 口角/小机缘 |
| **Lv.3 风暴** | **L6** | L2 + narrative snippet + 个人近况 | 冲突/妖兽 |
| **Lv.4 天劫** | **L6** | L2 + narrative snippet + 个人近况 | 突破天劫 |

**切换依据**：V4 基准测试证明 2B 在 L3（仅事件列表）的 T4 行为正确率仅 20%，而 L6（含 narrative snippet）达 80%。Lv.2+ 事件涉及 NPC 道德决策（救/不救/战/逃），必须提供叙事性上下文打破 PROTECT bias。

### R-M09 规则拼接逻辑（Narrative Snippet 第 2 层）

**输入**：affinity, tags[], keyEvents[]（按 |delta| 降序取 top 3）
**输出**：≤80 字符的叙事段落

**步骤 1 — 选择框架短语（按 affinity 区间，7 档）：**

| affinity 区间 | 框架短语 |
|:-------------:|---------|
| [-100, -60] | "{A}与{B}势同水火" |
| [-59, -30] | "{A}与{B}积怨已深" |
| [-29, -10] | "{A}与{B}关系不睦" |
| [-9, 9] | "{A}与{B}并无深交" |
| [10, 29] | "{A}与{B}颇有好感" |
| [30, 59] | "{A}与{B}交情匪浅" |
| [60, 100] | "{A}与{B}情同手足" |

**步骤 2 — 用因果连接词串联 top-3 事件：**

```
1 条事件: "此人曾{event1}"
2 条事件: "此人曾{event1}，又{event2}"
3 条事件: "此人曾{event1}，又{event2}，更{event3}"
0 条事件: （跳过事件串联）
```

**步骤 3 — 加归纳定性（按关系标签 tags）：**

| 标签 | 归纳短语 |
|------|---------|
| rival | "——屡次三番，此人不可信。" |
| grudge | "——其心可诛，不可不防。" |
| friend | "——患难与共，值得以命相托。" |
| mentor | "——恩重如山，当铭记于心。" |
| admirer | "——仰慕之情溢于言表。" |
| 无 tag | "——时日将证一切。" |

**完整示例**：
```
输入: affinity=-45, tags=[rival], keyEvents=[争夺破境草翻脸(-20), 裁决中被判有过(-15), 灵兽山暗算(-10)]
输出: "张清风与李沐阳积怨已深。此人曾因争夺破境草翻脸，又在裁决中被掌门判有过，更在灵兽山暗中算计——屡次三番，此人不可信。"
长度: 56 字符 ✅
```

### R-M10 Narrative Snippet 模板（第 3 层降级）

预定义 8 个模板，按 affinity 极性 × tags 选择：

| # | 条件 | 模板 |
|---|------|------|
| T1 | affinity < -30, rival | "{A}与{B}宿怨极深，彼此视若仇敌，不可同日而语。" |
| T2 | affinity < -30, 无tag | "{A}与{B}关系紧张，多有摩擦，积怨渐深。" |
| T3 | affinity < 0, any | "{A}与{B}颇有嫌隙，相处不甚融洽。" |
| T4 | affinity ∈ [-9,9] | "{A}与{B}交集不多，谈不上亲疏。" |
| T5 | affinity > 0, < 30 | "{A}与{B}尚有几分交情，偶有往来。" |
| T6 | affinity > 30, friend | "{A}与{B}交情深厚，时常互相扶持。" |
| T7 | affinity > 60, friend | "{A}与{B}情谊非凡，堪称知己，生死相托。" |
| T8 | affinity > 30, 无tag | "{A}与{B}相处甚为融洽，渐生亲近之意。" |

---

## §5 因果事件规则（设计定案）

### R-C01 因果触发规则表

| # | 触发条件 | 产生事件 | 事件等级 | 前置 |
|---|---------|---------|:--------:|------|
| C1 | A 对 B 的 affinity ≤ -60 + 同地点 | A 挑衅 B | Lv.2 浪花 | 关系系统 |
| C2 | A 对 B 的 affinity ≥ 80 + 同地点 | A 赠药/指点 B | Lv.1 涟漪 | 关系系统 |
| C3 | A.moral.goodEvil ≤ -60 + 灵石 > 100 | A 窃取宗门资源 | Lv.3 风暴 | 道德系统 |
| C4 | A 突破成功 + B 是 rival + 同地点 | B 嫉妒事件 | Lv.2 浪花 | 标签系统 |
| C5 | A 连续失败 ≥ 3 次 + aggressive ≤ 0.3 | A 闭关独修 | Lv.1 涟漪 | 性格系统 |
| C6 | sect.ethos ≤ -60 + A.moral.goodEvil ≥ 60 | A 道风冲突（离心倾向） | Lv.2 浪花 | 道风系统 |
| C7 | A 有 goal(revenge, target=B) + 同地点 | A 执行复仇行为 | Lv.3 风暴 | 目标系统 |
| C8 | A 有 goal(breakthrough) + 灵气足够 | A 主动申请突破 | Lv.2 浪花 | 目标系统 |

### R-C02 因果检查频率

- 每 soul-tick（~5min）扫描一次
- 每次最多触发 **1 个因果事件**（防止事件爆炸）
- 同一规则对同一对弟子 **30 tick 冷却**

---

## §6 个人目标系统（设计定案）

### R-G01 GoalType 全量枚举

| GoalType | 触发条件 | 行为偏移 | 持续时间 | 完成条件 |
|----------|---------|---------|:--------:|---------|
| `breakthrough` | 灵气 ≥ 突破门槛 80% | meditate ×1.5 | 至突破 | 突破成功/失败 |
| `revenge` | 被 rival 伤害 + anger ≥ 2 | 寻找 target 同地行为 ×2 | 100 tick | 执行报复/情绪衰减 |
| `seclusion` | 连续失败 ≥ 3 + aggressive ≤ 0.4 | meditate ×2, social ×0.3 | 50 tick | TTL 过期 |
| `friendship` | affinity ≥ 60 + aggressive ≥ 0.6 | 寻找 target 同地 ×1.5 | 80 tick | affinity ≥ 80 |
| `ambition` | sect 内排名末 2 + persistent ≥ 0.7 | meditate ×1.3, explore ×1.3 | 200 tick | 排名提升 |

### R-G02 目标槽位

- 每个弟子同时 **≤ 2 个活跃目标**
- 高优先级目标（revenge, breakthrough）可驱逐低优先级（friendship, ambition）
- 目标→行为偏移以**乘法叠加**到现有行为权重（Layer 5），capped at ×2.0

---

## §7 T2 NPC 架构（仅设计）

### R-T01 T2 数据结构（轻量版）

```typescript
interface T2NpcProfile {
  id: string
  name: string
  archetype: 'scattered-monk' | 'merchant' | 'beast' | 'rival-sect' | 'hermit'
  threat: 1 | 2 | 3           // 威胁等级
  disposition: number          // 对宗门态度 [-100, +100]
  cooldown: number             // 距下次行动的 tick
  zone: ZoneId | null          // 当前位置（null=不在宗门范围）
}
```

### R-T02 T2 行为循环

```
每 60 tick:
  → T2 NPC 掷骰决定是否进入宗门范围
  → 在范围内: 随机移动 zone + 按 archetype 产生世界事件
  → 离开: cooldown 重置
```

### R-T03 T2 规模

- 预研阶段：**仅设计，不实施**
- 正式实施建议：初始 10 个 T2，每完成一个 Phase 扩充 10 个
- MVP 上限：30-50 个活跃 T2
- 约束：T2 不消耗 T1 弟子的 AI 推理槽，仅使用规则引擎

---

## §8 不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | 关系摘要注入不得使单次 prompt 总量超过 **1024 token** 上限 | AI 推理超时/截断 |
| I2 | T2 NPC 不得消耗 T1 弟子的 AI 推理槽（串行队列 ≤1） | T1 弟子台词延迟 |
| I3 | PoC 阶段不持久化关系记忆（运行时 Map，页面刷新清空） | — |
| I4 | 因果事件必须经 EventBus → soul-event handler 标准管线 | 绕过灵魂评估 |
| I5 | 个人目标不得直接覆盖行为树权重（只做偏移，cap ×2.0） | 行为树失效 |
| I6 | 预研阶段不实施完整 T2 NPC | 范围爆炸 |
| I7 | Prompt 注入按事件等级切换：Lv.0-1→L2, Lv.2+→L6 | 日常浪费 token / 决策缺乏叙事 |
| I8 | Lv.2+ 决策场景**必须**注入 narrative snippet | 2B PROTECT bias 导致决策错误（T4 正确率 20%→80%） |
| I9 | Narrative snippet 采用三层降级（AI预生成→规则拼接→模板），规则拼接为最低保障 | 决策场景无叙事上下文 |

---

## §9 User Stories

### 关系记忆核心（继承 v2.0，微调）

| # | User Story | AC (Given-When-Then) | 复杂度 |
|---|-----------|----------------------|:------:|
| **IJ-01** | RelationshipMemory 类型定义 | Given shared/types / When 定义 RelationshipMemory + KeyRelationshipEvent / Then 扩展 RelationshipEdge，含 keyEvents[] + narrativeSnippet? + 统计量 | S |
| **IJ-02** | 关键事件记录逻辑 | Given A↔B 交互产生 \|affinityDelta\| ≥ 5 / When 记录事件 / Then 生成 KeyRelationshipEvent 写入 keyEvents[]，矛盾覆盖同类事件 | S |
| **IJ-03** | RelationshipMemoryManager 类 | Given engine 层 / When 管理 A↔B 关系记忆 / Then 提供 record/get/buildSummary/getNarrativeSnippet 方法，运行时 Map 存储 | M |
| **IJ-05** | SoulEvaluator 关系上下文集成 | Given soul-evaluator / When evaluateEmotion/evaluateDecision / Then 按事件等级选择 L2/L6，传入对应深度的关系摘要 | M |
| **IJ-06** | 统一设计文档（因果/目标/T2 接口） | Given SPM 完成 / When 进入 SGA / Then 产出 TDD 含四子系统接口+数据流+Pipeline 挂载 | M |

### Narrative Snippet 系统（v3.0 新增）

| # | User Story | AC (Given-When-Then) | 复杂度 |
|---|-----------|----------------------|:------:|
| **IJ-04** | Prompt 关系摘要注入（L2/L6 双级） | Given soul-prompt-builder / When A 与 B 交互 / Then Lv.0-1 注入 L2（好感+标签+1事件），Lv.2+ 注入 L6（+narrative snippet+近况）；Data Anchor: §4.5 R-M08 切换表 | M |
| **IJ-08** | Narrative Snippet 规则拼接器 | Given A↔B keyEvents + affinity + tags / When buildNarrativeSnippet() / Then 输出 ≤80字 叙事段落（框架句+事件串联+归纳定性）；Data Anchor: §4.5 R-M09 完整规则表 | M |
| **IJ-09** | L2/L6 动态切换策略 | Given 事件等级 severity / When 构建 prompt / Then 按 R-M08 路由到 L2 或 L6 context level | S |
| **IJ-10** | ai-server 模型检测对齐 | Given ai-server 已支持 2B/0.8B 自动检测 / When 启动 / Then 优先加载 2B，降级到 0.8B（Data Anchor: V4 报告 §6.3 已部分实现） | S |
| **IJ-11** | Narrative Snippet AI 预生成 PoC | Given 关键事件记录时 / When \|affinityDelta\| >= EVENT_THRESHOLD / Then 异步调用 AI 生成 1 句叙事并缓存 / PoC 验证质量和延迟（目标 P95 ≤ 2000ms） | M |

### 移除的 Story

| # | 原 Story | 处理 |
|---|---------|------|
| IJ-07 | PoC 验证关系摘要对 AI 输出质量的影响 | **已完成**（V4 基准测试，735 次 AI 请求，3 次完整测试） |

---

## §10 Pre-Mortem

| # | 风险 | 概率 | 影响 | 缓解 |
|---|------|:----:|:----:|------|
| PM-1 | ~~0.8B 模型无法有效利用关系摘要上下文~~ | — | — | **已验证**：V4 证明 2B 全面优于 0.8B |
| PM-2 | 规则拼接的叙事质量不如 V4 手写样例 | 中 | 中 | 规则拼接作为保底，后续 PoC 验证 AI 预生成 |
| PM-3 | 因果事件规则 8 条不够产生有趣涌现 | 低 | 中 | 预研只验证 2-3 条核心规则 |
| PM-4 | 个人目标与行为树权重叠加导致行为单一化 | 中 | 中 | 乘数 capped ×2.0（扰动机制待正式实施 Phase 设计） |
| PM-5 | L6 narrative snippet 使 prompt 过长导致 2B 噪声增加 | 低 | 中 | snippet ≤80 字符限制 + 1024 token 总量足够 |
| PM-6 | AI 预生成 narrative snippet 延迟过高阻塞体验 | 中 | 低 | 异步预生成 + 规则拼接即时 fallback |
| PM-7 | PROTECT bias 在规则拼接叙事下仍未完全打破 | 低 | 高 | 归纳定性短语针对性设计（"此人不可信""其心可诛"） |

## §11 Assumption Audit

| # | 假设 | 验证方式 | 验证时机 | 状态 |
|---|------|---------|---------|:----:|
| A-1 | 关系摘要能让 AI 产出更符合关系逻辑的对话 | V4 基准测试 | IJ-PoC | **✅ 已验证** |
| A-2 | 关系摘要能让 AI 在多选决策中倾向关系一致的选项 | V4 基准测试 T4/T5 场景 | IJ-PoC | **✅ 已验证** |
| A-3 | ~~0.8B 模型的理解力天花板在 L3-L5 之间~~ | V4 证明 2B 甜蜜点为 L6(决策)/L2(日常) | IJ-PoC | **✅ 已验证（结论修正）** |
| A-4 | \|affinityDelta\| ≥ 5 的阈值能筛出"有意义"的关系事件 | 运行 100 tick 观察事件密度 | IJ-SGE | 待验证 |
| A-5 | 规则拼接的叙事质量足以打破 2B PROTECT bias | Narrative PoC 对比测试 | IJ-11 | 待验证 |
| A-6 | AI 预生成 narrative snippet 延迟 P95 ≤ 2000ms | Narrative PoC | IJ-11 | 待验证 |

**A-5 失败 Fallback**：如果规则拼接叙事无法有效打破 PROTECT bias，且 AI 预生成 PoC 也未达标：
1. 首选：调整归纳定性短语的措辞强度（更直接、更负面），重新测试
2. 备选：仅在 T4 类决策场景（"是否救仇敌"）强制注入 hardcoded 负面框架句
3. 兜底：接受 PROTECT bias，将"面对仇敌仍选择救人"解读为"修仙者的道义底线"，调整设计预期而非强行技术修复

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-31 | v1.0 | 初始创建，合并 Phase I+J+Supermemory 理念预研 |
| 2026-03-31 | v2.0 | 重大修正：核心模型从"个人记忆 MemoryEntry"改为"关系记忆 RelationshipMemory" |
| 2026-04-01 | **v3.0** | **V4 基准测试驱动升级**：推荐模型 0.8B→2B；甜蜜点 L3→L6(决策)/L2(日常)双级；新增 §4.5 Narrative Snippet 系统（R-M07~R-M10）含三层降级策略和规则拼接完整规则表；Token 上限 512→1024；更新不变量 I1/I7，新增 I8/I9；新增 User Stories IJ-08~IJ-11；移除已完成的 IJ-07；更新 Pre-Mortem 和 Assumption Audit |
