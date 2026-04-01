# Phase J-Goal — User Stories

> **来源 PRD**：`docs/features/phaseJ-goal-PRD.md` v1.0
> **维护者**：/SPM

---

## US-JG-01：目标分配（事件驱动）

**标题**：弟子在关键事件后自动获得目标

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子灵气 ≥ 突破门槛×0.7 且无 breakthrough 目标 | tick 检测到灵气达标 | 分配 breakthrough 目标（TTL=300） | PRD §3.3 事件触发表 |
| 2 | 弟子与 rival 碰面且 affinity delta < -5 且无 revenge 目标 | encounter 负面结果事件 | 分配 revenge 目标（TTL=400, target=对方ID） | PRD §3.3 |
| 3 | 弟子与某人 affinity 升至 ≥ 40 且对方无 friend 标签 | soul-event affinity 变化 | 分配 friendship 目标（TTL=300, target=对方ID） | PRD §3.3 |
| 4 | 弟子已有 2 个活跃目标 | 任何触发条件满足 | 拒绝分配（目标槽已满） | PRD §3.3 G1 守卫 |
| 5 | 弟子已有同类型目标 | 相同类型触发 | 拒绝分配（不重复） | PRD §3.3 G2 守卫 |

**依赖**：EventBus（soul-event）、encounter-tick handler
**复杂度**：M

---

## US-JG-02：目标分配（定期扫描）

**标题**：空闲弟子定期获得性格驱动的目标

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子 persistent ≥ 0.6 且无 breakthrough/seclusion 目标 且有槽 | 60-tick 扫描周期到达 | 分配 seclusion 目标（TTL=200） | PRD §3.3 定期扫描表 |
| 2 | 弟子 smart ≥ 0.6 或 aggressive ≥ 0.6 且有槽 | 60-tick 扫描周期到达 | 分配 ambition 目标（TTL=250） | PRD §3.3 |
| 3 | 事件驱动目标触发时槽位被定期目标占满 | 事件驱动触发 | 淘汰 TTL 最少的定期目标，腾出槽位 | PRD §3.3 G3 守卫 |

**依赖**：US-JG-01
**复杂度**：S

---

## US-JG-03：行为权重偏移（Layer 5）

**标题**：活跃目标影响弟子的行为选择概率

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子有 breakthrough 目标 | 行为决策时 | meditate 权重 ×1.6, idle 权重 ×0.5 等 | PRD §3.2 乘数表 |
| 2 | 弟子有 2 个活跃目标 | 行为决策时 | 各行为乘数为两目标之积，clamp [0.5, 2.0] | PRD §3.2 多目标公式 |
| 3 | 弟子无任何目标 | 行为决策时 | Layer 5 全部 ×1.0，行为树与当前完全一致 | PRD I5 不变量 |

**依赖**：behavior-tree.ts `getEnhancedPersonalityWeights()`
**复杂度**：S

---

## US-JG-04：目标生命周期（完成/过期）

**标题**：目标到期或达成时自动移除并通知

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子有 breakthrough 目标 | 突破成功事件 | 移除目标 + emit goal-completed + MUD 完成文案 | PRD §3.4 + §3.5 |
| 2 | 弟子有 friendship 目标(target=B) | B 获得 friend 标签 | 移除目标 + emit goal-completed + MUD 完成文案 | PRD §3.4 |
| 3 | 任何目标 remainingTtl 递减至 0 | goal-tick handler 每 tick | 移除目标 + emit goal-expired + MUD 过期文案 | PRD §3.4 |

**依赖**：US-JG-01, EventBus
**复杂度**：M

---

## US-JG-05：MUD 可见性

**标题**：目标变化在 MUD 日志中可见

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 目标被分配 | goal-assigned 事件 | MUD 输出分配文案（Lv.2 涟漪级） | PRD §3.5 分配文案表 |
| 2 | 目标完成 | goal-completed 事件 | MUD 输出完成文案（Lv.2 涟漪级） | PRD §3.5 完成文案表 |
| 3 | 目标过期 | goal-expired 事件 | MUD 输出过期文案（Lv.1 呼吸级） | PRD §3.5 过期文案表 |

**依赖**：US-JG-04, MUD 日志管线
**复杂度**：S

---

## US-JG-06：持久化（GameState v6）

**标题**：目标跨会话保持

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 存档为 v5 格式 | 加载时 | 自动迁移：添加 `goals: []` 空数组 | PRD §3.6 |
| 2 | 弟子有活跃目标 | 保存存档 | goals 数组含完整 PersonalGoal 对象（含 remainingTtl） | PRD §3.6 |
| 3 | 加载含目标的 v6 存档 | 加载时 | 目标恢复，remainingTtl 继续递减 | PRD §3.6 |

**依赖**：存档迁移链 v1→...→v5→v6
**复杂度**：S

---

## US-JG-07：AI Prompt 注入

**标题**：AI 对话/决策时可感知弟子目标

| AC# | Given | When | Then | Data Anchor |
|-----|-------|------|------|-------------|
| 1 | 弟子有活跃目标 | soul-prompt-builder 构建 prompt | 注入 `当前心愿：{目标中文}` | PRD §3.7 |
| 2 | 弟子无目标 | soul-prompt-builder 构建 prompt | 不添加目标段 | PRD §3.7 |

**依赖**：soul-prompt-builder.ts
**复杂度**：S

---

## Story 总览

| Story | 标题 | 复杂度 | 依赖 |
|-------|------|:------:|------|
| US-JG-01 | 目标分配（事件驱动） | M | EventBus, encounter-tick |
| US-JG-02 | 目标分配（定期扫描） | S | US-JG-01 |
| US-JG-03 | 行为权重偏移 Layer 5 | S | behavior-tree.ts |
| US-JG-04 | 目标生命周期 | M | US-JG-01, EventBus |
| US-JG-05 | MUD 可见性 | S | US-JG-04 |
| US-JG-06 | 持久化 v6 | S | 迁移链 |
| US-JG-07 | AI Prompt 注入 | S | soul-prompt-builder |
