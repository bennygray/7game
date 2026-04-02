# Phase I-beta User Stories — 社交事件系统

> **版本**：v1.0 | **日期**：2026-04-02
> **PRD**：[phaseI-beta-PRD.md](../../features/phaseI-beta-PRD.md)
> **共 10 条** | 按交付顺序排列

---

## Story #1 — 三维关系向量

**作为** soul-engine，
**我要** 将 RelationshipEdge 从单一 affinity 拆分为 closeness/attraction/trust 三维独立数值，
**以便** 友情/浪漫/信赖可以独立演化，为社交事件提供数据基础。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | 新游戏初始化 | 生成初始关系 | 每条 edge 包含 closeness/attraction/trust 三个字段 | PRD §5.10 |
| AC2 | 存量存档 v7 | 加载存档 | affinity→closeness，attraction=0，trust=affinity×0.5 | PRD §5.11 |
| AC3 | 灵魂事件发生 | 应用 delta | 三维 delta 分别应用到对应维度，各维度独立 clamp | PRD §5.1 |
| AC4 | 衰减周期到达 | 执行衰减 | closeness×0.98, attraction×0.99, trust×0.995 独立衰减 | PRD §5.3 |
| AC5 | 弟子处于 lover/sworn-sibling | 衰减执行 | 衰减率 ×0.5（关系保护） | PRD §5.3 |

**复杂度**：L | **依赖**：无

---

## Story #2 — 性取向系统

**作为** disciple-generator，
**我要** 为每个弟子生成 orientation 权重（maleAttraction/femaleAttraction），
**以便** attraction 维度受性取向门控，异性恋弟子不会对同性产生浪漫吸引。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | 生成弟子 | 随机分配性取向 | 80% 异性恋 / 15% 双性恋 / 5% 同性恋 | PRD §4.2 分布表 |
| AC2 | 碰面产生 attraction delta | 目标性别对应 orientation 权重 = 0 | attraction delta 不增长（INV-3） | PRD §4.2 |
| AC3 | 碰面产生 attraction delta | 目标性别对应 orientation 权重 > 0 | delta × effectiveAttraction 后应用 | PRD §5.1 |
| AC4 | 存量存档 v7 | 加载存档 | 根据 gender + 随机概率生成 orientation | PRD §5.11 |

**复杂度**：M | **依赖**：Story #1

---

## Story #3 — 标签阈值重映射

**作为** soul-engine，
**我要** 将原有 5 个标签（friend/rival/mentor/admirer/grudge）的阈值从 affinity 迁移到 closeness + trust，
**以便** 标签系统在三维体系下正确运作。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | 弟子 closeness ≥ 60 | 标签更新 | 赋予 friend 标签 | PRD §5.2 |
| AC2 | 弟子 closeness ≤ -60 | 标签更新 | 赋予 rival 标签 | PRD §5.2 |
| AC3 | closeness ≥ 80 + trust ≥ 40 + starGap ≥ 2 | 标签更新 | 赋予 mentor 标签 | PRD §5.2 |
| AC4 | closeness ≤ -40 + trust ≤ -20 + 3 负面事件 | 标签更新 | 赋予 grudge 标签 | PRD §5.2 |
| AC5 | 所有现有 regression 用例 | 回归测试 | closeness 基准下行为与原 affinity 基准一致 | regression-all.ts |

**复杂度**：M | **依赖**：Story #1

---

## Story #4 — 性格兼容度天花板

**作为** soul-engine，
**我要** 根据两个弟子的五维性格相似度计算兼容度得分，当 closeness 超过天花板时极度衰减正向 delta，
**以便** 性格不合的弟子很难成为挚友，让关系发展有"天命"感。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | 兼容度 0.3 | closeness 达到 30 后收到 +3 delta | 实际增量 = 3 × 0.1 = 0.3 | PRD §5.6 |
| AC2 | 兼容度 0.9 | closeness 达到 90 后收到 +3 delta | 实际增量 = 3 × 0.1 = 0.3（超过天花板） | PRD §5.6 |
| AC3 | 兼容度 0.9 | closeness = 50 收到 +3 delta | 实际增量 = 3（未超天花板） | PRD §5.6 |
| AC4 | trust 维度 | 任意数值 | trust 不受兼容度天花板限制 | PRD §5.6 |

**复杂度**：S | **依赖**：Story #1

---

## Story #5 — 离散关系状态 + crush 自动标记

**作为** 关系系统，
**我要** 定义 4 种离散关系状态（crush/lover/sworn-sibling/nemesis），其中 crush 在 attraction ≥ 50 时自动标记，
**以便** 为 AI 邀约系统提供状态基础。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | A→B attraction ≥ 50 | 关系更新 | A→B 自动标记 crush | PRD §4.3 |
| AC2 | A→B attraction < 30 且已有 crush | 关系更新 | crush 自动解除 | PRD §4.7 |
| AC3 | A→B 有 crush，B→A 无 crush | 查看关系 | crush 是单向的 | PRD §4.3 |
| AC4 | 新 RelationshipStatus 类型 | tsc 编译 | 类型系统正确，零错误 | — |

**复杂度**：S | **依赖**：Story #1, #2

---

## Story #6 — AI 邀约流程

**作为** 社交引擎，
**我要** 在弟子满足离散关系前置条件时，通过两轮 AI 调用判定邀约发起和接受/拒绝，
**以便** 关系建立有戏剧张力（告白/结拜/宣战 → 接受/拒绝 → 后果）。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | A→B 满足 lover 前置 + 无冷静期 | causal-tick 扫描 | AI Call-1 判定 A 是否发起告白 | PRD §4.4 |
| AC2 | AI Call-1 返回 willInitiate=true | 发起告白 | AI Call-2 判定 B 是否接受 | PRD §4.4 |
| AC3 | AI Call-2 返回 accepted=true | 告白成功 | 建立 lover 关系 + 正面 delta + SPLASH 事件 + MUD 日志 | PRD §4.6 |
| AC4 | AI Call-2 返回 accepted=false | 告白被拒 | 负面 delta + 冷静期 1800 ticks + MUD 日志 | PRD §4.5 |
| AC5 | A→B 处于冷静期 | causal-tick 扫描 | 跳过，不发起同类型邀约 | PRD §4.5 |
| AC6 | sworn-sibling/nemesis 邀约 | 同上流程 | 使用对应阈值/后果/冷却参数 | PRD §4.5, §4.6 |

**复杂度**：L | **依赖**：Story #5

---

## Story #7 — 离散关系解除

**作为** 社交引擎，
**我要** 当关系维持条件不再满足时，通过 AI 判定触发解除事件（分手/决裂/和解），
**以便** 关系有生命周期，不是"一旦建立就永远存在"。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | lover + closeness < 20 OR trust < 0 | causal-tick | AI 判定分手 → social-lover-broken STORM 事件 | PRD §4.7 |
| AC2 | sworn-sibling + trust < 20 | causal-tick | AI 判定决裂 → social-sworn-broken SPLASH 事件 | PRD §4.7 |
| AC3 | nemesis + closeness > 0 AND trust > 20 | causal-tick | AI 判定和解 → social-nemesis-resolved SPLASH 事件 | PRD §4.7 |
| AC4 | 解除后 | 关系状态更新 | 离散状态移除 + 负面/正面 delta 应用 | PRD §4.7 |

**复杂度**：M | **依赖**：Story #6

---

## Story #8 — AI 三维 Delta Schema + 重试

**作为** AI 层，
**我要** 修改 SoulEvaluationResult 的 relationshipDeltas 为三维输出（closeness/attraction/trust），并在格式异常时重试，
**以便** AI 能驱动三维关系演化，同时保持鲁棒性。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | AI 正常返回三维 delta | 解析结果 | 三维 delta 正确应用 | PRD §5.5 |
| AC2 | AI 返回格式异常（缺字段/类型错误） | 首次解析失败 | 重试（相同 prompt），≤2 次 | PRD §5.5, INV-5 |
| AC3 | 重试 2 次仍失败 | 第 3 次失败 | 降级：取 delta 作为 closeness，attraction/trust = 0 | PRD §5.5 |
| AC4 | 降级触发 | 记录日志 | 降级事件写入日志（便于排查） | PRD §5.5 |
| AC5 | Few-shot 示例 | AI prompt | 包含 2~3 个三维 delta 示例 | PRD §5.5 |

**复杂度**：M | **依赖**：Story #1

---

## Story #9 — 碰面系统适配 + flirt

**作为** encounter-tick handler，
**我要** 将碰面分档从 affinity 改为 closeness，并新增 crush/lover 碰面分档（含 flirt 结果），
**以便** 有好感的弟子碰面时能产生调情互动。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | avg closeness ≥ 60 | 碰面检定 | friend 分档概率表生效 | PRD §5.4 |
| AC2 | 任一方有 crush 或双方 lover | 碰面检定 | 新 crush/lover 分档：discuss 20/chat 60/flirt 15/none 5 | PRD §5.4 |
| AC3 | flirt 碰面发生 | 事件生成 | closeness +2, attraction +3（受门控）, trust +1 | PRD §5.4 |
| AC4 | flirt MUD 文案 | 日志输出 | 使用性别化文案模板（清偿 FB-026） | PRD §5.9 |

**复杂度**：M | **依赖**：Story #1, #5

---

## Story #10 — MUD 社交事件呈现

**作为** 玩家（掌门），
**我要** 在 MUD 日志中清晰看到社交事件的发生（告白/结拜/分手等）和关系状态变化，
**以便** 感知弟子之间的关系演变故事线。

| AC | Given | When | Then | Data Anchor |
|----|-------|------|------|-------------|
| AC1 | 社交事件发生 | MUD 日志 | 使用对应文案模板（13 类 × 3 条） | PRD §5.9 |
| AC2 | 告白成功 | inspect 命令 | 显示"道侣：XXX" | PRD §4.3 |
| AC3 | 结拜成功 | inspect 命令 | 显示"金兰：XXX" | PRD §4.3 |
| AC4 | 宿敌建立 | inspect 命令 | 显示"宿敌：XXX" | PRD §4.3 |
| AC5 | 暗恋标记 | inspect 命令 | 显示"暗恋：XXX"（仅暗恋方可见） | PRD §4.3 |
| AC6 | 关系三维数值 | inspect 命令 | 显示 closeness/attraction/trust（替代原 affinity） | PRD §4.1 |

**复杂度**：M | **依赖**：Story #1, #5, #6
