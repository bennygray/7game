# Phase F — 灵魂闭环 · SPM 分析过程

> **日期**：2026-03-30 | **/SPM 执行** | **Phase 编号**：F
> **状态**：分析中 → Party Review
> **前置**：Phase E ✅ + Phase F0-α ✅ + Phase F0-β ✅

---

## Step 0: Bootstrap 检查

- [x] `.agents/project.yaml` 已读取 — 路径解析完毕
- [x] `${paths.master_prd}` — v2.0，了解全局定位
- [x] `${paths.prd_economy}` — 13 资源，F 不引入新资源
- [x] `${paths.feature_backlog}` — FB-009(关系标签乘数调优) 与本次高度相关
- [x] `${paths.handoff}` — Phase F0-β 完成，下一步 Phase F
- [x] `docs/pipeline/phaseF/` — 已创建

---

## Step 1：第一性原理解构 + 价值锚定

### 1a. 5-Why 根因链

```
为什么需要 Phase F 灵魂闭环？
→ 因为弟子有灵魂数据（traits/emotion/moral/affinity）但行为不受影响
  → 为什么这是问题？
  → 因为弟子行为完全由五维性格静态决定，灵魂数据是死代码
    → 为什么灵魂数据成了死代码？
    → 因为 getPersonalityWeights() 只读五维性格+体力，不读 traits/emotion/relationship
      → 为什么这不能接受？
      → 因为「有灵魂的活世界」是核心差异化承诺（MASTER-PRD §1.3 #3）
        → 根因价值：灵魂闭环是从「有灵魂数据的傀儡」到「行为可被解释的活人」的关键跳跃
```

### 1b. Invariant 声明

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **特性效果是系数叠加，不是替代** — traits 的 behavior-weight 效果叠加到基础权重上，不覆盖五维性格 | 若替代，五维性格系统失效 |
| I2 | **情绪状态是暂态，不是永久** — lastEmotion 有衰减周期，到期自动清除 | 若不衰减，弟子永远"愤怒"或"喜悦"，系统失去动态感 |
| I3 | **关系标签不直接修改行为树结构** — friend/rival 仅通过权重调节系数影响概率，不添加/删除行为选项 | 若改结构，行为树向后兼容性破坏 |
| I4 | **所有权重调节系数有上下限** — 单个效果叠加后 clamp 到 [0.5, 2.0] | 若无限叠加，行为分布退化为确定性（100%某行为） |
| I5 | **planIntent 保持纯函数** — ADR-D01 不可违反，特性/情绪/关系读取只生成不同权重，不直接写 state | 若破坏纯性，与 Phase D 架构冲突 |

### 1c. 最小组件检验

> **如果只保留一个核心功能**：F1 特性→行为权重叠加。
> 
> **为什么**：特性是每个弟子最显著的差异标签（"胆魄如虹"→更爱冒险），玩家在 MUD 日志中最容易归因的行为差异来源。F2/F3/F4 是精细化调优，F1 是根本闭环。

### 1d. 核心体验锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 「胆魄如虹」的弟子自然比别人更爱冒险，「勤勉不倦」的弟子修炼更勤奋——灵魂数据终于驱动行为 |
| **ROI** | 成本 **S** · 体验增量 **5/5** |
| **循环挂载** | trait-registry → getPersonalityWeights → planIntent → behavior → EventBus → soul-engine → 更新 emotion/affinity → 回流到 getPersonalityWeights（完整闭环） |

### 需求债务关联

| FB# | 关联性 | 处理 |
|-----|--------|------|
| FB-009 | 关系标签效果乘数调优 — F2+F4 直接使用这些参数 | 本次清偿（通过完整定义参数表） |
| FB-010 | 行为结算断层 — F1 建立特性→行为的首个闭环 | 部分清偿 |

---

## Step 2：规则与数值边界

### 前置搜索结果

- `getPersonalityWeights()`: `behavior-tree.ts` L97-L112 — 当前仅读 `PersonalityTraits` + `stamina`
- `TraitEffect.type = 'behavior-weight'`: `trait-registry.ts` — 12 个先天特性中 7 个有 behavior-weight 效果，值域 `[-0.3, +0.5]`
- `TraitEffect.type = 'relationship-modifier'`: 4 个特性有此效果，值域 `[-5, +5]`
- `fallbackEvaluate()`: `soul-engine.ts` L120 — 已有 `applyTraitWeights()` 处理情绪权重
- `SoulEvaluationResult.emotion`: 每次事件后产出，但无处记录为弟子 lastEmotion

### 2.1 业务实体 (C1)

#### R-F-E1: 弟子短期情绪状态 DiscipleEmotionState（新增）

| 字段 | 类型 | 初始值 | 说明 |
|------|------|:------:|------|
| `currentEmotion` | `EmotionTag \| null` | `null` | 当前主导情绪（最近一次事件产出） |
| `emotionIntensity` | `1 \| 2 \| 3` | `1` | 情绪强度 |
| `emotionSetAt` | `number` | `0` | 设置时间戳 |

> **存档影响**：纯运行时状态，不持久化，不影响存档版本。与 StorytellerState 相同策略（ADR-F0β-01 先例）。

#### R-F-E2: 行为权重叠加因子表（特性 → 行为权重效果）

当前 `trait-registry.ts` 中已定义的 behavior-weight 效果（**完全枚举**）：

| 特性 ID | 特性名 | 目标行为 | 效果值 |
|---------|--------|---------|:------:|
| `innate_courageous` | 胆魄如虹 | `explore` | +0.3 |
| `innate_courageous` | 胆魄如虹 | `bounty` | +0.2 |
| `innate_diligent` | 勤勉不倦 | `meditate` | +0.4 |
| `innate_diligent` | 勤勉不倦 | `farm` | +0.2 |
| `innate_perceptive` | 慧眼天生 | `alchemy` | +0.3 |
| `innate_greedy` | 贪婪成性 | `alchemy` | +0.3 |
| `innate_cowardly` | 胆怯如鼠 | `explore` | -0.3 |
| `innate_cowardly` | 胆怯如鼠 | `bounty` | -0.2 |
| `innate_solitary` | 喜独其身 | `meditate` | +0.2 |
| `innate_curious` | 好奇心旺 | `explore` | +0.2 |
| `innate_curious` | 好奇心旺 | `alchemy` | +0.1 |
| `acquired_battle_hardened` | 百战磨砺 | `bounty` | +0.3 |
| `acquired_alchemy_obsessed` | 丹道痴迷 | `alchemy` | +0.5 |
| `acquired_alchemy_obsessed` | 丹道痴迷 | `explore` | -0.2 |

> **14 条效果定义，覆盖 5/7 个行为**（idle 和 rest 无特性倾向，合理）

#### R-F-E3: 关系标签→行为权重效果表（新增规则）

| 关系标签 | 效果目标 | 条件 | 乘数 | 说明 |
|---------|---------|------|:----:|------|
| `friend` | 所有合作行为基础权重 | ≥1 friend 在同地点 | ×1.2 | 有友人在侧，合作意愿更强 |
| `rival` | `explore` / `bounty` 权重 | ≥1 rival 在同地点 | ×1.3 | 有对手在侧，竞争欲激发 |
| `rival` | `meditate` 权重 | ≥1 rival 在同地点 | ×0.7 | 有对手在侧，静不下心修炼 |

> **定义**："合作行为" = `meditate` | `alchemy` | `farm`（宗门内日常活动）

#### R-F-E4: 情绪状态→行为权重效果表（新增规则）

| 情绪 | 效果目标 | 乘数 | 说明 |
|------|---------|:----:|------|
| `joy` | `explore` , `bounty` | ×1.2 | 心情好，更愿意外出冒险 |
| `anger` | `bounty` | ×1.4 | 怒气冲冲，更想打架 |
| `anger` | `meditate` | ×0.7 | 心神不宁，静坐困难 |
| `sadness` | `meditate` | ×1.3 | 忧伤时倾向独处修炼 |
| `sadness` | `explore` | ×0.7 | 忧伤时不想外出 |
| `fear` | `explore` , `bounty` | ×0.6 | 恐惧时回避危险 |
| `fear` | `rest` | ×1.5 | 恐惧时想休息 |
| `pride` | `explore` , `bounty` | ×1.2 | 自豪时更自信 |
| `envy` | `alchemy` , `meditate` | ×1.2 | 嫉妒时加倍努力 |
| `contempt` | `farm` | ×0.7 | 蔑视时不屑做杂活 |
| `admiration` | `meditate` | ×1.3 | 钦佩时倾向修炼追赶 |
| `neutral` | — | ×1.0 | 无效果 |
| 其余情绪 | — | ×1.0 | 无效果（保守策略，避免过度设计） |

#### R-F-E5: 权重叠加公式 (C3)

```typescript
function getEnhancedPersonalityWeights(
  d: Readonly<LiteDiscipleState>,
  state: Readonly<LiteGameState>,
  emotionState: DiscipleEmotionState | null,
): { behavior: DiscipleBehavior; weight: number }[] {

  // Step 1: 基础权重（现有公式不变）
  const baseWeights = getPersonalityWeights(d.personality, d.stamina);

  // Step 2: 特性叠加（F1）
  for (const baseW of baseWeights) {
    let traitModifier = 0;
    for (const trait of d.traits) {
      const def = getTraitDef(trait.defId);
      if (!def) continue;
      for (const effect of def.effects) {
        if (effect.type === 'behavior-weight' && effect.target === baseW.behavior) {
          traitModifier += effect.value;
        }
      }
    }
    // 叠加：基础权重 × (1 + traitModifier)，clamp 到 [0, ∞)
    baseW.weight = Math.max(0, baseW.weight * (1 + traitModifier));
  }

  // Step 3: 关系标签效果（F2 + F4）
  applyRelationshipWeightModifiers(baseWeights, d, state);

  // Step 4: 情绪状态效果（F3）
  if (emotionState?.currentEmotion) {
    applyEmotionWeightModifiers(baseWeights, emotionState);
  }

  return baseWeights;
}
```

**参数总表**：

| 参数 | 值 | 作用 |
|------|------|------|
| 特性叠加方式 | `weight × (1 + Σ trait_effects)` | 乘法叠加，允许正负互消 |
| 单特性效果值域 | `[-0.5, +0.5]` | 单特性不超过 ±50% |
| friend 合作乘数 | ×1.2 | 温和正向 |
| rival 竞争乘数 | ×1.3 / ×0.7 | 适度极化 |
| 情绪乘数值域 | `[0.6, 1.5]` | 不超过 ±50% |
| 最终权重下限 | `0` | 不出现负权重 |

#### R-F-E6: 情绪衰减规则

| 参数 | 值 | 说明 |
|------|------|------|
| `EMOTION_DECAY_TICKS` | `3` | 3 次 soul-tick 后衰减（约 15 分钟） |
| 衰减行为 | intensity 3→2→1→null | 分级衰减，不直接清空 |

> **设计理由**：15 分钟的情绪影响期足以覆盖 1~2 次行为决策（行为持续 15~60 秒），之后自然消散。

### 2.2 产源与消耗

| 资源 | 产出来源 | 消耗去向 | 漏斗平衡 |
|------|---------|---------|:--------:|
| 特性效果 | trait-registry（静态） | behavior-tree 权重叠加 | ✅ 纯配置 |
| 情绪状态 | soul-engine.processSoulEvent 输出 | behavior-tree 权重调节，soul-tick 衰减 | ✅ 产消配对 |
| 关系标签 | soul-engine.updateRelationshipTags | behavior-tree 碰面概率调节 | ✅ 已有 |

**结论**：Phase F 不引入新的经济资源，不影响产出→消耗漏斗。纯信息/状态流。

### 2.3 MECE 校验

| 维度 | 独立性 | 穷尽性 |
|------|--------|--------|
| 特性效果类型 | ✅ 4 类互斥（behavior-weight/relationship-modifier/moral-drift/emotion-weight） | ✅ TraitEffect.type 枚举完整 |
| 关系标签 | ✅ friend/rival 互斥（affinity 不可同时 ≥60 且 ≤-60） | ✅ 仅自动管理 friend/rival |
| 情绪乘数表 | ✅ 每种情绪独立定义 | ✅ 未列出的情绪隐含 ×1.0 |
| 行为权重叠加顺序 | ✅ base→trait→relationship→emotion 四层独立 | ✅ 覆盖所有影响源 |

### 2.4 持久化考量

| 数据 | 是否持久化 | 说明 |
|------|:---------:|------|
| `DiscipleEmotionState` | ❌ | 运行时状态，重启重置为 null |
| friendship/rivalry 碰面影响 | ❌ | 实时计算，基于已持久化的 relationships |
| 存档版本 | **不变 v5** | 不新增持久化字段 |

---

## Step 2.5：规格深度自检门禁

| C# | 检查项 | 状态 | 证据锚点 |
|----|--------|:----:|---------|
| C1 | 实体全量枚举 | ✅ | §2.1 R-F-E1（3 字段）、R-F-E2（14 条 behavior-weight，完整枚举自 trait-registry.ts）、R-F-E3（3 条关系规则）、R-F-E4（11 条情绪×行为映射） |
| C2 | 规则映射表 | ✅ | §2.1 R-F-E3 关系→乘数表（3 行）、R-F-E4 情绪→乘数表（11 行）|
| C3 | 公式全参数 | ✅ | §2.1 R-F-E5 权重叠加公式（含 4 步 + 6 参数）、R-F-E6 衰减规则（2 参数）|
| C4 | 阈值/标签表 | ✅ | R-F-E6 衰减阈值表（intensity 3→2→1→null，3 tick）|
| C5 | Fallback 文案 | ⬜ | 不适用 — F 不引入新文案，复用现有 MUD 日志 |
| C6 | 效果数值表 | ✅ | R-F-E2 全量特性效果值域（14 条）、R-F-E3（3 条）、R-F-E4（11 条），均含具体数值 |

**结论**：C1~C4 全部 ✅，C5 不适用，C6 ✅。可进入 Step 3。

---

## Step 3 产出物索引

| 产出物 | 路径 |
|--------|------|
| PRD | `docs/features/phaseF-PRD.md` |
| User Stories | `docs/design/specs/phaseF-user-stories.md` |
| SPM 分析过程 | 本文件 |
| Party Review 报告 | `docs/pipeline/phaseF/review.md` |
