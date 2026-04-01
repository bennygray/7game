# Phase J-Goal — 个人目标系统 PRD

> **版本**：v1.0 | **日期**：2026-04-01
> **Phase 类型**：实施型（Phase IJ 预研类型桩 → 运行时实现）
> **来源**：Roadmap J3（个人目标系统）+ J4（目标驱动行为）
> **维护者**：/SPM
> **GATE 1**：`[x] GATE 1 PASSED` — 2026-04-01（CONDITIONAL PASS, 0 BLOCK / 8 WARN, USER 确认接受）

---

## §1 背景与动机

### 1.1 5-Why 根因

```
为什么需要个人目标？→ 弟子每 tick 独立随机决策，无持续性意图
为什么持续性意图重要？→ "连续修炼冲击突破"比"随机乱逛"更像有追求的人
为什么要像有追求？→ 核心假设是"弟子有灵魂"
为什么灵魂需要目标？→ 灵魂 = 可被理解的动机；无目标 → 行为不可解释 → 灵魂不可信
根因 → 个人目标让"有性格"升级为"有追求"，是灵魂可信度的关键缺失层
```

### 1.2 当前痛点

| 问题 | 现状 | 影响 |
|------|------|------|
| 行为无连贯性 | 弟子每 tick 独立加权随机 | 玩家看到弟子频繁切换行为，像无头苍蝇 |
| 无内在驱动力 | Layer 1-4 全是外部因素（性格/特性/关系/情绪） | 弟子没有"自己想做的事" |
| AI 对话缺目标感 | prompt 无目标上下文 | AI 生成的对话/独白缺少"决心感" |

### 1.3 核心体验

> **"弟子有了自己的心事和追求"** — 玩家观察到弟子行为从随机变为有目的，MUD 日志中可以读出"这个弟子最近在拼命修炼，大概是想突破了"。

### 1.4 已有资产

Phase IJ v3.0 已交付类型桩：`src/shared/types/personal-goal.ts`
- `GoalType`: breakthrough / revenge / seclusion / friendship / ambition
- `PersonalGoal`: id, type, target, assignedAtTick, ttl, behaviorMultipliers
- `MAX_ACTIVE_GOALS = 2`, `GOAL_MULTIPLIER_CAP = 2.0`

---

## §2 不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | 同时活跃目标 ≤ `MAX_ACTIVE_GOALS`(2) | 行为被多目标拉扯，权重混乱 |
| I2 | 单个目标 behaviorMultiplier ≤ `GOAL_MULTIPLIER_CAP`(2.0) | 某行为概率压倒性，行为树退化为确定性 |
| I3 | 每个目标必须有 TTL（ticks），TTL 耗尽自动清除 | 目标永不过期 → 行为僵死 |
| I4 | 目标仅 bias 权重（乘法 Layer 5），不能 override 行为选择 | 否则退化为脚本 |
| I5 | 无目标时行为树与当前完全一致（Layer 5 = 全 ×1.0） | 向后兼容 |
| I6 | 目标持久化到 GameState（v6），跨会话保持 | 刷新后目标消失 → 行为断裂 |

---

## §3 规则与数值

### §3.1 GoalType 完整定义（C1: 实体全量枚举）

| GoalType | 中文 | 触发方式 | 完成条件 | TTL (ticks) |
|----------|------|---------|---------|:-----------:|
| `breakthrough` | 冲击突破 | 事件驱动：灵气 ≥ `getRealmAuraCost(realm,subRealm)` × 0.7 | 突破成功事件（`breakthrough-success`） | 300 |
| `revenge` | 复仇 | 事件驱动：被 rival 碰面且发生负面互动（affinity delta < -5） | 与目标碰面且发生正面互动（或目标好感回升至 ≥ 0） | 400 |
| `seclusion` | 闭关修炼 | 定期扫描：persistent ≥ 0.6 且无活跃 breakthrough 目标 | TTL 耗尽（自然完成） | 200 |
| `friendship` | 结交知己 | 事件驱动：与某弟子好感升至 ≥ 40 且无 friend 标签 | 该弟子获得 friend 标签 | 300 |
| `ambition` | 宗门抱负 | 定期扫描：smart ≥ 0.6 或 aggressive ≥ 0.6 | TTL 耗尽（自然完成） | 250 |

### §3.2 行为偏移乘数表（C2: 规则映射表 + C6: 效果数值表）

Layer 5 乘法叠加，应用于 Layer 4 之后、非负 clamp 之前。

| GoalType | meditate | farm | alchemy | explore | rest | bounty | idle |
|----------|:--------:|:----:|:-------:|:-------:|:----:|:------:|:----:|
| `breakthrough` | **1.6** | 0.8 | 0.8 | 0.7 | 1.3 | 0.7 | 0.5 |
| `revenge` | 0.8 | 0.8 | 0.8 | **1.6** | 0.8 | 1.2 | 0.6 |
| `seclusion` | **1.8** | 0.6 | 0.6 | 0.5 | 1.2 | 0.5 | **0.3** |
| `friendship` | 0.9 | 1.0 | 1.0 | **1.5** | 0.9 | 0.9 | 0.8 |
| `ambition` | 1.1 | **1.3** | **1.3** | 1.0 | 0.8 | 1.1 | 0.5 |

**多目标叠加规则**：当弟子有 2 个活跃目标时，对每个行为取两个乘数之积，再 clamp 到 `[1/GOAL_MULTIPLIER_CAP, GOAL_MULTIPLIER_CAP]` = `[0.5, 2.0]`。

**公式（C3）**：
```
Layer5Multiplier(behavior) = clamp(∏ goal.behaviorMultipliers[behavior], 0.5, 2.0)
finalWeight(behavior) = max(0, Layer4Weight(behavior) × Layer5Multiplier(behavior))
```

### §3.3 目标分配规则（C2: 规则映射表）

#### 事件驱动触发

| 触发事件 | 条件 | 分配目标 | target 参数 |
|---------|------|---------|------------|
| `breakthrough-fail` 事件 或 灵气达标（定期扫描） | aura ≥ `getRealmAuraCost(realm,subRealm)` × 0.7 | breakthrough | `{ realmTarget: realm, subRealmTarget: subRealm+1 }` |
| `encounter` 负面结果 | 对方有 rival 标签 且 delta < -5 | revenge | `{ targetDiscipleId: string }` |
| `soul-event` affinity 变化 | affinity 升至 ≥ 40 且无 friend 标签 | friendship | `{ targetDiscipleId: string }` |

#### 定期扫描触发（每 60 ticks 一次）

| 条件 | 分配目标 | 优先级 |
|------|---------|:------:|
| persistent ≥ 0.6 且无 breakthrough 目标 且目标槽有空 | seclusion | 1 |
| (smart ≥ 0.6 或 aggressive ≥ 0.6) 且目标槽有空 | ambition | 2 |

**分配守卫**：
- G1: 目标槽已满（`activeGoals.length >= MAX_ACTIVE_GOALS`）→ 拒绝
- G2: 已有同类型目标 → 拒绝（不重复分配）
- G3: 事件驱动优先于定期扫描（事件触发时可抢占定期目标的槽位：淘汰 TTL 最少的定期目标）

### §3.4 目标完成/过期处理

| 情况 | 处理 | MUD 输出 |
|------|------|---------|
| 完成条件达成 | 移除目标 + emit `goal-completed` 事件 | `[弟子名]完成了心愿「[目标中文]」，神情欣慰。` |
| TTL 耗尽 | 移除目标 + emit `goal-expired` 事件 | `[弟子名]渐渐放下了「[目标中文]」的执念。` |
| 手动取消（预留） | 移除目标 | 暂不实现 |

### §3.5 MUD 可见性（C5: Fallback 文案）

#### 目标分配文案

| GoalType | 文案模板 |
|----------|---------|
| breakthrough | `[名]目光坚定，似在酝酿一次冲击——{他/她}要突破了。` |
| revenge | `[名]眼中闪过寒光，似乎对[目标名]的所作所为耿耿于怀。` |
| seclusion | `[名]盘膝而坐，气息渐沉——{他/她}打算闭关一段时日。` |
| friendship | `[名]望向[目标名]的背影，似乎想与{其}更亲近些。` |
| ambition | `[名]翻阅功法典籍，眼中满是进取之心。` |

#### 目标完成文案

| GoalType | 文案模板 |
|----------|---------|
| breakthrough | `[名]长吁一口气，突破之愿已了，神情释然。` |
| revenge | `[名]与[目标名]的恩怨似乎有了了结，眉宇间少了几分戾气。` |
| seclusion | `[名]缓缓睁眼，闭关修炼圆满，气息沉稳了许多。` |
| friendship | `[名]与[目标名]相视一笑——知己之缘，已然结下。` |
| ambition | `[名]放下手中典籍，嘴角微扬，似有所得。` |

#### 目标过期文案

| GoalType | 文案模板 |
|----------|---------|
| breakthrough | `[名]叹了口气，突破之事看来还需从长计议。` |
| revenge | `[名]摇了摇头，似乎决定暂时放下对[目标名]的怨念。` |
| seclusion | `[名]起身活动筋骨，闭关之心渐淡。` |
| friendship | `[名]收回目光，与[目标名]的缘分或许还需时日。` |
| ambition | `[名]合上典籍，抱负之心暂且收敛。` |

### §3.6 持久化方案（GameState v6）

**新增字段**：

```typescript
// LiteGameState 新增
goals: PersonalGoal[];  // 全局目标池，每个目标含 discipleId

// PersonalGoal 接口扩展（修改现有类型桩）
interface PersonalGoal {
  id: string;
  discipleId: string;        // 新增：归属弟子
  type: GoalType;
  target: Record<string, unknown>;
  assignedAtTick: number;
  ttl: number;               // 改为 number（移除 null，强制 TTL）
  remainingTtl: number;      // 新增：剩余 TTL（每 tick 递减）
  behaviorMultipliers: Record<string, number>;
}
```

**v5→v6 迁移**：新增 `goals: []` 空数组，零风险。

### §3.7 Prompt 注入（AI 可见性）

目标信息注入 soul-prompt-builder，格式：

```
当前心愿：{目标中文}（剩余约 {remainingTtl} 个时辰）
```

仅在弟子有活跃目标时注入，无目标时不添加。

---

## §4 代码对账清单

| # | 对账项 | 代码位置 | 状态 |
|---|--------|---------|:----:|
| 1 | `GoalType` 5 个枚举值 | `src/shared/types/personal-goal.ts:8-13` | ✅ 存在 |
| 2 | `PersonalGoal` 接口 | `src/shared/types/personal-goal.ts:16-27` | ✅ 存在（需扩展 discipleId/remainingTtl） |
| 3 | `MAX_ACTIVE_GOALS = 2` | `src/shared/types/personal-goal.ts:30` | ✅ 存在 |
| 4 | `GOAL_MULTIPLIER_CAP = 2.0` | `src/shared/types/personal-goal.ts:33` | ✅ 存在 |
| 5 | `DiscipleBehavior` 7 个值 | `src/shared/types/game-state.ts:91-99` | ✅ 存在 |
| 6 | `getEnhancedPersonalityWeights()` Layer 1-4 | `src/engine/behavior-tree.ts:138-216` | ✅ Layer 5 挂载点在 L208 后 |
| 7 | `RelationshipTag` 含 'rival'/'friend' | `src/shared/types/soul.ts:173` | ✅ 存在 |
| 8 | `LiteGameState` 无 goals 字段 | `src/shared/types/game-state.ts:231+` | ✅ 需新增 |
| 9 | `LiteDiscipleState` 无目标字段 | `src/shared/types/game-state.ts:115-158` | ✅ 不需要（目标存全局池） |
| 10 | `TickPhase.SYSTEM_TICK = 500` | `src/engine/tick-pipeline.ts:37+` | ✅ 存在 |

**未解决项**：0（全部对账通过）

---

## §5 完成度自检（Step 2.5）

| C# | 状态 | 证据锚点 |
|----|:----:|---------|
| C1 实体全量枚举 | ✅ | §3.1 GoalType 完整定义（5 个类型，L51~L57） |
| C2 规则映射表 | ✅ | §3.2 行为偏移乘数 7×5 表（L61~L69）+ §3.3 触发规则表（L75~L95） |
| C3 公式全参数 | ✅ | §3.2 Layer5Multiplier 公式（L73，含 clamp 边界 0.5~2.0） |
| C4 阈值/标签表 | ✅ | §3.3 触发阈值（aura×0.7, affinity≥40, persistent≥0.6, smart≥0.6, aggressive≥0.6, delta<-5） |
| C5 Fallback 文案 | ✅ | §3.5 分配/完成/过期各 5 条文案（L105~L140） |
| C6 效果数值表 | ✅ | §3.2 乘数表（5 类型 × 7 行为 = 35 个数值） |

---

## §6 TDD 关键设计项（Gate 1 Review 遗留）

> 以下问题属于 How（架构层），SPM 不决定实现方案，但标记为 TDD 必须解决。

| # | 问题 | 来源 | 建议方向 |
|---|------|------|---------|
| TDD-1 | revenge 触发的 Pipeline 时序：goal-tick (500) 在 encounter (610) / soul-eval (625) 之前运行，如何获取当前 tick 的 affinity delta？ | W2/W7 | 方案 A: 独立 goal-assign listener 放在 SOUL_EVAL 后 (626)；方案 B: 下一 tick 回溯检测 |
| TDD-2 | 5 层乘法权重极端值验证：需 Monte Carlo 模拟 5 层叠加后的行为概率分布 | W4 | 验证脚本 `scripts/lite-goal-sim.ts`，N≥1000 |
| TDD-3 | revenge/friendship 目标的 targetId 有效性检查（虽然弟子不可移除，但防御性编码） | Devil's Advocate | getMemory null check |

---

## §7 ROI 评估

| 维度 | 评估 |
|------|------|
| 开发成本 | **M**（中等）— 1 个 Manager + 1 个 Handler + Layer 5 挂载 + v6 迁移 + MUD 文案 + Prompt 注入 |
| 体验增量 | **4/5** — 行为连贯性是灵魂可信度的关键拼图 |
| 循环挂载 | Layer 5 叠加到 behavior-tree.ts 既有 4 层之上；goal-tick handler 挂载 Pipeline SYSTEM_TICK:20 |
| 风险 | 低 — 类型桩已就绪，模式与 RelationshipMemoryManager 一致 |

---

---

## §8 Pre-Mortem

> 假设 Phase J-Goal 失败了，最可能的原因是什么？

| # | 失败模式 | 概率 | 预防措施 |
|---|---------|:----:|---------|
| PM1 | 行为权重被 Layer 5 拉得太极端，弟子行为变成"确定性脚本" | 中 | clamp [0.5, 2.0] + Monte Carlo 验证（TDD-2） |
| PM2 | revenge 触发时序设计不当，弟子永远分配不到 revenge 目标 | 低 | TDD-1 必须解决 Pipeline 时序 |
| PM3 | 群体闭关（4+ 弟子同时 seclusion）导致资源产出停滞 | 低 | 自限性（TTL=200）；可后续加全局同类型上限 |
| PM4 | MUD 文案重复感强（每次只输出固定模板） | 低 | 5×3=15 条文案覆盖常见场景；未来可接 AI 生成 |

## §9 Assumption Audit

| # | 假设 | 验证方式 | 风险等级 |
|---|------|---------|:--------:|
| A1 | 弟子有目标后行为连贯性会被玩家感知到 | 实游测试：对比有/无目标弟子的 MUD 日志 | 低（乘数差异明显） |
| A2 | TTL 足够长让目标有意义（300 ticks ≈ 5 分钟） | 实游测试：观察目标是否在完成前就过期 | 中（需调参） |
| A3 | 定期扫描 60 ticks 频率合适 | 实游测试：观察目标分配频率是否合理 | 低（可调） |
| A4 | 5 个 GoalType 覆盖了核心叙事需求 | 实游测试：是否有明显缺失的目标类型 | 低（可扩展） |
| A5 | GameState v6 迁移零风险 | 新增空 `goals: []` 字段，不改现有结构 | 极低 |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-01 | v1.0 | 初始创建：来自 Roadmap J3+J4，基于 Phase IJ 类型桩实现 |
