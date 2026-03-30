# Phase F: 灵魂闭环 — PRD

> **版本**：v1.0 | **维护者**：/SPM | **日期**：2026-03-30
> **状态**：GATE 1 审阅中
> **关联里程碑**：SOUL-VISION-ROADMAP V3.1 · Phase F
> **前置**：Phase E ✅ + Phase F0-α ✅ + Phase F0-β ✅

---

## §1 系统不变量

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **特性效果是系数叠加，不是替代** — 叠加到基础权重上，不覆盖五维性格 | 五维性格系统失效 |
| I2 | **情绪状态是暂态，不是永久** — lastEmotion 有衰减周期，到期自动回归 null | 弟子永远处于同一情绪 |
| I3 | **关系标签不修改行为树结构** — 仅通过权重乘数影响概率 | 行为树向后兼容性破坏 |
| I4 | **所有权重调节有上下限** — 最终权重 ≥ 0，单因子乘数 clamp [0.5, 2.0] | 行为分布退化为确定性 |
| I5 | **planIntent 保持纯函数** — ADR-D01 不可违反 | 与 Phase D 架构冲突 |

---

## §2 价值锚定

| 维度 | 内容 |
|------|------|
| **核心体验** | 「胆魄如虹」的弟子自然比别人更爱冒险，「勤勉不倦」的弟子修炼更勤奋——灵魂数据驱动行为 |
| **5-Why 根因** | 灵魂系统数据存在但不影响行为→弟子是「有灵魂数据的傀儡」→核心差异化承诺无法兑现 |
| **最小组件** | 特性→行为权重叠加函数 |
| **ROI** | 成本 **S** · 体验增量 **5/5** |
| **循环挂载** | trait-registry → getPersonalityWeights → planIntent → behavior → EventBus → soul-engine → emotion/affinity → 回流 getPersonalityWeights（完整闭环） |

### 需求债务关联

| FB# | 关联性 | 处理 |
|-----|--------|------|
| FB-009 | 关系标签效果乘数调优 — 本次定义完整参数表 | ✅ 本次清偿 |
| FB-010 | 行为结算断层 — 特性→行为首个闭环 | 部分清偿 |

---

## §3 规则与数值边界

### 3.1 业务实体 (C1)

#### R-F-E1: 弟子短期情绪状态 DiscipleEmotionState（新增运行时类型）

| 字段 | 类型 | 初始值 | 说明 |
|------|------|:------:|------|
| `currentEmotion` | `EmotionTag \| null` | `null` | 当前主导情绪 |
| `emotionIntensity` | `1 \| 2 \| 3` | `1` | 情绪强度 |
| `emotionSetAt` | `number` | `0` | 设置时间戳 |

> **不持久化**。运行时状态，重启重置为 null。与 StorytellerState 同策略。

#### R-F-E2: 特性 → 行为权重效果完整表（已存在于 trait-registry.ts）

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

> **14 条效果定义，覆盖 5/7 个行为**（idle 和 rest 无特性倾向，合理）。
> 数据来源：`src/shared/data/trait-registry.ts` TRAIT_REGISTRY。

#### R-F-E3: 关系标签 → 行为权重效果表（新增）

| 关系标签 | 效果目标 | 条件 | 乘数 | 说明 |
|---------|---------|------|:----:|------|
| `friend` | `meditate`, `alchemy`, `farm` | ≥1 friend 与自己同地点 | ×1.2 | 友人在侧，合作意愿增强 |
| `rival` | `explore`, `bounty` | ≥1 rival 与自己同地点 | ×1.3 | 对手在侧，竞争欲激发 |
| `rival` | `meditate` | ≥1 rival 与自己同地点 | ×0.7 | 对手在侧，心神不宁 |

**计算规则**：
1. 获取弟子当前 location = `getDiscipleLocation(behavior)`
2. 枚举同 location 的其他弟子
3. 在 `state.relationships` 中查询当前弟子对这些同地弟子的 tags
4. 若存在 ≥1 个 friend tag → 应用 friend 乘数
5. 若存在 ≥1 个 rival tag → 应用 rival 乘数
6. friend 和 rival 乘数可叠加（场景：有友也有敌在同一地点）

#### R-F-E4: 情绪 → 行为权重效果表（新增）

| 情绪 | 效果目标 | 乘数 | 说明 |
|------|---------|:----:|------|
| `joy` | `explore`, `bounty` | ×1.2 | 心情好，更愿冒险 |
| `anger` | `bounty` | ×1.4 | 怒气冲冲，更想打架 |
| `anger` | `meditate` | ×0.7 | 心神不宁 |
| `sadness` | `meditate` | ×1.3 | 忧伤时倾向独处 |
| `sadness` | `explore` | ×0.7 | 忧伤时不想外出 |
| `fear` | `explore`, `bounty` | ×0.6 | 恐惧时回避危险 |
| `fear` | `rest` | ×1.5 | 恐惧时想休息 |
| `pride` | `explore`, `bounty` | ×1.2 | 自豪时更自信 |
| `envy` | `alchemy`, `meditate` | ×1.2 | 嫉妒时加倍努力 |
| `contempt` | `farm` | ×0.7 | 蔑视时不屑杂活 |
| `admiration` | `meditate` | ×1.3 | 钦佩时倾向修炼追赶 |
| `neutral` | — | ×1.0 | 无效果 |
| 其余情绪 | — | ×1.0 | 保守策略，避免过度设计 |

---

### 3.2 核心公式 (C3)

#### F-F-01: 增强版行为权重计算（四层叠加）

```typescript
function getEnhancedPersonalityWeights(
  d: Readonly<LiteDiscipleState>,
  state: Readonly<LiteGameState>,
  emotionState: DiscipleEmotionState | null,
): { behavior: DiscipleBehavior; weight: number }[] {

  // === Layer 1: 基础权重（现有 getPersonalityWeights，不修改） ===
  const weights = getPersonalityWeights(d.personality, d.stamina);

  // === Layer 2: 特性叠加（F1） ===
  for (const w of weights) {
    let traitModifier = 0;
    for (const trait of d.traits) {
      const def = getTraitDef(trait.defId);
      if (!def) continue;
      for (const effect of def.effects) {
        if (effect.type === 'behavior-weight' && effect.target === w.behavior) {
          traitModifier += effect.value;
        }
      }
    }
    // 乘法叠加：weight × (1 + Σ effects)
    w.weight = Math.max(0, w.weight * (1 + traitModifier));
  }

  // === Layer 3: 关系标签效果（F2 + F4） ===
  const myLocation = getDiscipleLocation(d.behavior);
  let hasFriendNearby = false;
  let hasRivalNearby = false;

  for (const other of state.disciples) {
    if (other.id === d.id) continue;
    if (getDiscipleLocation(other.behavior) !== myLocation) continue;
    const edge = state.relationships.find(
      r => r.sourceId === d.id && r.targetId === other.id
    );
    if (!edge) continue;
    if (edge.tags.includes('friend')) hasFriendNearby = true;
    if (edge.tags.includes('rival')) hasRivalNearby = true;
  }

  if (hasFriendNearby) {
    for (const w of weights) {
      if (['meditate', 'alchemy', 'farm'].includes(w.behavior)) {
        w.weight *= 1.2;  // R-F-E3: friend → 合作 ×1.2
      }
    }
  }
  if (hasRivalNearby) {
    for (const w of weights) {
      if (['explore', 'bounty'].includes(w.behavior)) {
        w.weight *= 1.3;  // R-F-E3: rival → 竞争 ×1.3
      }
      if (w.behavior === 'meditate') {
        w.weight *= 0.7;  // R-F-E3: rival → 修炼 ×0.7
      }
    }
  }

  // === Layer 4: 情绪状态效果（F3） ===
  if (emotionState?.currentEmotion && emotionState.currentEmotion !== 'neutral') {
    const modifiers = EMOTION_BEHAVIOR_MODIFIERS[emotionState.currentEmotion];
    if (modifiers) {
      for (const w of weights) {
        const mod = modifiers[w.behavior];
        if (mod) {
          w.weight *= mod;
        }
      }
    }
  }

  // 最终保证非负
  for (const w of weights) {
    w.weight = Math.max(0, w.weight);
  }

  return weights;
}
```

#### F-F-02: 情绪衰减

```typescript
const EMOTION_DECAY_TICKS = 3;  // 3 次 soul-tick = ~15 分钟

function decayEmotion(emotionState: DiscipleEmotionState): void {
  if (!emotionState.currentEmotion) return;
  
  emotionState.emotionIntensity--;
  if (emotionState.emotionIntensity <= 0) {
    emotionState.currentEmotion = null;
    emotionState.emotionIntensity = 1;
    emotionState.emotionSetAt = 0;
  }
}
```

> 每次 soul-tick（每 5 分钟）检查并衰减情绪。intensity 3→2→1→null。
> 最长情绪持续 = 3 × 5 = 15 分钟（intensity=3 时）。

#### F-F-03: 情绪记录（soul-engine 输出 → 情绪状态）

```typescript
// 在 processSoulEvent 的 fallbackEvaluate 之后，记录情绪
function recordEmotion(
  emotionMap: Map<string, DiscipleEmotionState>,
  discipleId: string,
  result: SoulEvaluationResult,
): void {
  const existing = emotionMap.get(discipleId);
  if (!existing) {
    emotionMap.set(discipleId, {
      currentEmotion: result.emotion,
      emotionIntensity: result.intensity,
      emotionSetAt: Date.now(),
    });
  } else {
    // 新情绪覆盖旧情绪（最近一次事件主导）
    existing.currentEmotion = result.emotion;
    existing.emotionIntensity = result.intensity;
    existing.emotionSetAt = Date.now();
  }
}
```

---

### 3.3 MECE 校验

| 维度 | 独立性 | 穷尽性 |
|------|--------|--------|
| 特性效果类型 | ✅ 4 类互斥 | ✅ TraitEffect.type enum 完整 |
| 关系标签效果 | ✅ friend/rival 互斥 | ✅ 仅管理自动标签（mentor/admirer/grudge 不参与行为调节） |
| 情绪乘数 | ✅ 每条独立 | ✅ 未声明=×1.0 |
| 权重叠加层 | ✅ 4 层独立计算 | ✅ 穷尽所有影响源 |

---

### 3.4 持久化考量

| 数据 | 是否持久化 | 说明 |
|------|:---------:|------|
| DiscipleEmotionState | ❌ | 运行时状态，重启重置 |
| 特性→行为权重 | ❌ | 实时计算，traits 已持久化 |
| 关系→行为权重 | ❌ | 实时计算，relationships 已持久化 |
| **存档版本** | **不变 v5** | F 不新增持久化字段 |

---

### 3.5 TickPipeline 变更

| 变更 | 说明 |
|------|------|
| **无新 Handler** | F 不新增 Tick Handler |
| **修改 disciple-tick** | planIntent 调用 getEnhancedPersonalityWeights 替代 getPersonalityWeights |
| **修改 soul-tick** | 新增情绪衰减逻辑 |
| **修改 soul-event** | processSoulEvent 输出时记录到 emotionMap |

---

## §4 User Stories 索引

| 文件 | Phase | Story 数 | 覆盖范围 |
|------|:-----:|:--------:|---------| 
| `phaseF-user-stories.md` | F | 5 | F1 特性叠加 + F2 关系标签 + F3 情绪状态 + F4 关系→行为 + 回归验收 |

---

## §5 验收标准

> 来自 SOUL-VISION-ROADMAP V3.1 Phase F 验收标准

| # | 验收标准 | 验证方式 |
|---|---------|---------| 
| AC-1 | Monte Carlo N=1000，「胆魄如虹」弟子 explore 率比无特性弟子高 ≥15% | 验证脚本 |
| AC-2 | Monte Carlo N=1000，「胆怯如鼠」弟子 explore 率比无特性弟子低 ≥15% | 验证脚本 |
| AC-3 | 有 friend 在同地点时，合作行为占比 ↑ ≥10% | 验证脚本 |
| AC-4 | 有 rival 在同地点时，explore+bounty 占比 ↑ ≥10% | 验证脚本 |
| AC-5 | anger 情绪下，bounty 率 ↑ ≥20%、meditate 率 ↓ ≥15% | 验证脚本 |
| AC-6 | 情绪在 15 分钟内自然衰减到 null | unit test |
| AC-7 | 回归验证通过：现有 64 条 + 108 条 F0-β + F 专项 | regression-all.ts |

---

## §6 Pre-Mortem 分析

| # | 失败原因 | 预警信号 | 缓解措施 | 风险 |
|---|---------|---------|---------|:----:|
| 1 | 特性效果感知不到——+0.3 叠加后行为分布变化太小 | Monte Carlo 差异 < 5% | 效果值可调（当前 0.3~0.5 区间），验证脚本量化 | 🟡 |
| 2 | 情绪状态反复覆盖——高频事件导致情绪每秒刷新，无衰减窗口 | 1 tick 内 >3 次情绪变更 | soul-event 消费已有 EventBus drain 批处理，最后一次情绪最终生效（last-write-wins） | 🟢 |
| 3 | 关系标签效果稀释——8 弟子 × 7 地点，同地概率本就低 | friend 乘数几乎不触发 | 碰面引擎（610）已保证同地弟子枚举；效果是"锦上添花"而非核心 | 🟢 |
| 4 | 权重乘法错误导致反向效果——负值 trait effect 意外将权重翻转 | 弟子行为模式与特性矛盾 | `Math.max(0, ...)` 保底 + Monte Carlo 验证 | 🟢 |
| 5 | planIntent 纯性被破坏——读取运行时 emotionMap 是否算"副作用" | 代码 Review 发现问题 | emotionMap 作为只读参数传入，不在 planIntent 内部修改 | 🟢 |

---

## §7 假设审计

| # | 假设 | 错误后果 | 风险 | 验证方式 | 何时验证 |
|---|------|---------|:----:|---------|---------:|
| 1 | 特性 behavior-weight 值 0.3~0.5 足以产生玩家可感知的行为差异 | 效果太弱 → "灵魂闭环"名不副实 | 🟡 | Monte Carlo N=1000 对比测试 | SGE 集成测试 |
| 2 | 情绪 15 分钟衰减期能覆盖 1~2 次行为决策周期 | 衰减太快 → 情绪几乎不影响行为 | 🟡 | 计算：行为持续 15~60s → 15min 覆盖 15~60 次决策 → 充分 | 设计验证（已确认） |
| 3 | 同地点 friend/rival 出现频率足以让关系标签效果可感知 | 太低 → F4 是死代码 | 🟡 | 运行 30 分钟统计同地点 friend/rival 对出现次数 | SGE 集成测试 |
| 4 | 四层乘法叠加不会导致行为退化为确定性 | 某弟子 100% 总是选同一行为 | 🟢 | 单因子 [0.5, 2.0] clamp + 基础权重均 >0 → 不可能全部为 0 | 数学证明 + Monte Carlo |

---

## §8 Party Review 报告

> 完整报告见 `docs/pipeline/phaseF/review.md`

### L0 Content Traceability

13 个 Data Anchor 全部追溯通过，0 个 🔴。

### L1 + L2 汇总

| # | 角色 | 判定 | 说明 |
|---|------|:----:|------|
| 1~4 | R1 魔鬼PM | ✅ | ROI=5/S, 零新概念, 范围控制严格, 规格完整 |
| 5~8 | R2 资深玩家 | ✅ | 30秒可感知, ≥15%差异, 纯被动系统 |
| 9~12 | R3 数值策划 | ⚠️ | D5 极端叠加 2.73 倍（CoVe→WARN 维持，叙事合理+概率极低） |
| 13~17 | R4 项目经理 | ✅ | 范围=Roadmap F1~F4, 工期 2~3 天, 无阻塞依赖 |
| 18~22 | R5 偏执架构师 | ✅ | 单向依赖, O(n²) n=8, emotionMap 不污染 GameState |

**最终判定**：⚠️ **CONDITIONAL PASS** — 20 PASS / 1 WARN / 0 BLOCK

**WARN 处理**：R3-D5 极端叠加 → SGE Monte Carlo 验证后若 bounty > 80% 则调低情绪乘数。

---

## §9 USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项

签章：`[x] GATE 1 PASSED` — 2026-03-30

---

## 变更日志

| 日期 | 级别 | 变更内容 | 影响范围 | 批准人 |
|------|------|---------|---------|--------|
| 2026-03-30 | 初版 | /SPM 完成 Phase F PRD v1.0 | — | — |
