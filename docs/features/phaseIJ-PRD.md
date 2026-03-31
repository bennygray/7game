# Phase IJ — NPC 深度智能预研 PRD

> **版本**：v2.0 | **日期**：2026-03-31
> **Phase 类型**：预研型（设计定案 + 核心 PoC）
> **合并范围**：Phase I（深度世界）+ Phase J（涌现与深度）+ Supermemory 记忆理念
> **维护者**：/SPM
> **GATE 1**：`[x] GATE 1 PASSED` — 2026-03-31

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
3. **PoC 测试的是"上下文量 vs AI 质量"曲线** — 不是硬定容量，而是实验出 0.8B 模型的甜蜜点
4. **本地模型 token 代价低** — 瓶颈不是 token 成本，而是小模型的理解力上限

---

## §2 交付目标

| 子系统 | 交付深度 | 说明 |
|--------|:-------:|------|
| **关系记忆系统** | 设计 + PoC 代码 | RelationshipMemory 结构 + 关键事件记录 + Prompt 关系摘要注入 |
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

  /** 新增：关键事件摘要（只保留改变关系的事件） */
  keyEvents: KeyRelationshipEvent[];

  /** 新增：统计量（不注入 prompt，仅用于规则引擎） */
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

同一对关系、同类型事件（如连续碰面冲突）、≤50 tick 间隔内：新事件替换旧事件。

### R-M04 Prompt 注入规则

Prompt 注入的是 **当前交互对方的关系摘要**，而非全量个人记忆：

```
【与李沐阳的关系】
好感：-45（死对头）
关键经历：上月因争夺破境草翻脸(-20)；裁决中被掌门判有过(-15)
```

注入时机：仅当 A 与 B 发生交互（对话/碰面/事件涉及 B）时注入 A→B 的摘要。

**注入量不硬限制**（本地模型 token 代价低），由 Phase IJ-PoC 实验确定：
- 0.8B 模型能利用多少上下文？
- 加到什么程度信号 > 噪声？

### R-M05 Prompt 注入格式（多层级）

PoC 实验使用递增层级，找到 0.8B 模型的甜蜜点：

| 层级 | 注入内容 | 说明 |
|:----:|---------|------|
| L0 | 无 | 基线（当前行为） |
| L1 | 好感值 + 标签 | 最小关系信号 |
| L2 | L1 + 1 条关键事件 | 关系 + 最小记忆 |
| L3 | L1 + 3 条关键事件 | 关系 + 适度记忆 |
| L4 | L3 + A 个人重大经历 | 关系 + 个人维度 |
| L5 | L4 + A↔C 间接关系 | 关系网 |
| L6 | 尽可能多的上下文 | 理解力天花板测试 |

### R-M06 个人记忆（降级为可选辅助，不在本 Phase 实施）

> 原 v1.0 设计的个人记忆 MemoryEntry 系统**降级为可选辅助**。
> 核心 Prompt 注入走关系摘要路径（R-M04/R-M05）。
> 个人重大经历（突破/天劫等）是否也注入 Prompt，由 PoC L4 层级实验决定。
> 如 L4 有效，后续 Phase 再设计完整的个人记忆子系统（分层/TTL/淘汰等参数届时确定）。

---

## §5 因果事件规则（设计定案）

### R-C01 因果触发规则表

| # | 触发条件 | 产生事件 | 事件等级 | 前置 |
|---|---------|---------|:--------:|------|
| C1 | A 对 B 的 affinity ≤ -60 + 同地点 | A 挑衅 B | Lv.2 浪花 | 关系系统 |
| C2 | A 对 B 的 affinity ≥ 80 + 同地点 | A 赠药/指点 B | Lv.1 涟漪 | 关系系统 |
| C3 | A.moral.goodEvil ≤ -60 + 灵石 > 100 | A 窃取宗门资源 | Lv.3 风暴 | 道德系统 |
| C4 | A 突破成功 + B 是 rival + 同地点 | B 嫉妒事件 | Lv.2 浪花 | 标签系统 |
| C5 | A 连续失败 ≥ 3 次 + introvert ≥ 0.7 | A 闭关独修 | Lv.1 涟漪 | 性格系统 |
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
| `seclusion` | 连续失败 ≥ 3 + introvert ≥ 0.6 | meditate ×2, social ×0.3 | 50 tick | TTL 过期 |
| `friendship` | affinity ≥ 60 + extravert ≥ 0.6 | 寻找 target 同地 ×1.5 | 80 tick | affinity ≥ 80 |
| `ambition` | sect 内排名末 2 + conscientiousness ≥ 0.7 | meditate ×1.3, explore ×1.3 | 200 tick | 排名提升 |

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
| I1 | 关系摘要注入不得使单次 prompt 总量超过 512 token 上限 | AI 推理超时/截断 |
| I2 | T2 NPC 不得消耗 T1 弟子的 AI 推理槽（串行队列 ≤1） | T1 弟子台词延迟 |
| I3 | PoC 阶段不持久化关系记忆（运行时 Map，页面刷新清空） | — |
| I4 | 因果事件必须经 EventBus → soul-event handler 标准管线 | 绕过灵魂评估 |
| I5 | 个人目标不得直接覆盖行为树权重（只做偏移，cap ×2.0） | 行为树失效 |
| I6 | 预研阶段不实施完整 T2 NPC | 范围爆炸 |
| I7 | 关系摘要注入量的具体上限由 PoC 实验确定，不硬编码 | 过早优化 |

---

## §9 User Stories

| # | User Story | AC (Given-When-Then) | 复杂度 |
|---|-----------|----------------------|:------:|
| **IJ-01** | RelationshipMemory 类型定义 | Given shared/types / When 定义 RelationshipMemory + KeyRelationshipEvent / Then 扩展 RelationshipEdge，含 keyEvents[] + 统计量 | S |
| **IJ-02** | 关键事件记录逻辑 | Given A↔B 交互产生 \|affinityDelta\| ≥ 5 / When 记录事件 / Then 生成 KeyRelationshipEvent 写入 keyEvents[]，矛盾覆盖同类事件 | S |
| **IJ-03** | RelationshipMemoryManager 类 | Given engine 层 / When 管理 A↔B 关系记忆 / Then 提供 record/get/buildSummary 方法，运行时 Map 存储 | M |
| **IJ-04** | Prompt 关系摘要注入 | Given soul-prompt-builder / When A 与 B 交互 / Then 注入 A→B 好感+标签+关键事件摘要 | M |
| **IJ-05** | SoulEvaluator 关系上下文集成 | Given soul-evaluator / When evaluateEmotion/evaluateDecision / Then 传入 A→B 关系摘要，无则不变 | S |
| **IJ-06** | 统一设计文档（因果/目标/T2 接口） | Given SPM 完成 / When 进入 SGA / Then 产出 TDD 含四子系统接口+数据流+Pipeline 挂载 | M |
| **IJ-07** | PoC 验证关系摘要对 AI 输出质量的影响 | → **独立为 Phase IJ-PoC**（见 phaseIJ-poc-PRD.md） | M |

---

## §10 Pre-Mortem

| # | 风险 | 概率 | 影响 | 缓解 |
|---|------|:----:|:----:|------|
| PM-1 | 0.8B 模型无法有效利用关系摘要上下文 | 中 | 高 | **Phase IJ-PoC 多层级实验**，找到甜蜜点或确认无效 |
| PM-2 | 关系摘要过长导致 0.8B 噪声 > 信号 | 中 | 中 | PoC L0-L6 递增实验，画出质量曲线定位拐点 |
| PM-3 | 因果事件规则 8 条不够产生有趣涌现 | 低 | 中 | 预研只验证 2-3 条核心规则 |
| PM-4 | 个人目标与行为树权重叠加导致行为单一化 | 中 | 中 | 乘数 capped ×2.0 + 随机扰动 |
| PM-5 | keyEvents 积累过快导致 prompt 膨胀 | 低 | 低 | 溢出淘汰 \|affinityDelta\| 最小的；PoC 确定实际规模 |

## §11 Assumption Audit

| # | 假设 | 验证方式 | 验证时机 |
|---|------|---------|---------|
| A-1 | 关系摘要（好感+标签+事件）能让 AI 产出更符合关系逻辑的对话 | Phase IJ-PoC 场景 1（对话质量） | IJ-PoC |
| A-2 | 关系摘要能让 AI 在多选决策中倾向关系一致的选项 | Phase IJ-PoC 场景 2（决策质量） | IJ-PoC |
| A-3 | 0.8B 模型的理解力天花板在 L3-L5 之间（上下文 ~280-330 tokens） | Phase IJ-PoC L0-L6 质量曲线 | IJ-PoC |
| A-4 | \|affinityDelta\| ≥ 5 的阈值能筛出"有意义"的关系事件 | 运行 100 tick 观察事件密度 | IJ-SGE |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-31 | v1.0 | 初始创建，合并 Phase I+J+Supermemory 理念预研 |
| 2026-03-31 | **v2.0** | 重大修正：核心模型从"个人记忆 MemoryEntry"改为"关系记忆 RelationshipMemory"；Prompt 注入从个人日记改为 A↔B 关系摘要；移除 150 token 硬限、20 条硬限等拍脑袋参数，改由 PoC 实验确定；个人记忆降级为可选辅助；更新 §8 不变量、§9 User Stories、§10/§11 |
