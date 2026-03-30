# Phase E — NPC 灵魂系统：道德 × 特性 × 关系 PRD

> **Phase**: E (v0.5) | **性质**: 预研型 Phase（PoC 已验证）
> **Status**: SPM 完成，待 GATE 1 签章
> **SPM 分析**: [`pipeline/phaseE/spm-analysis.md`](../pipeline/phaseE/spm-analysis.md)
> **PoC 报告**: [`verification/phaseE-poc1-soul-system-report.md`](../verification/phaseE-poc1-soul-system-report.md)

---

## §1 核心价值

> **根因价值**：让每个弟子拥有**可解释的行为动机**，使玩家能理解「为什么张清风选择背叛而陈明月选择原谅」——可解释性才是「灵魂」的本质。

| 维度 | 内容 |
|------|------|
| **核心体验** | 观察弟子在事件中展现出**符合其道德/特性的差异化反应**，产生「这个人果然是这样的性格」的会心一笑 |
| **ROI** | L 成本（含 PoC 预研）/ 体验 5 分（成功是质变；已通过 PoC-1 验证可行性） |
| **循环挂载** | 事件发生 → AI 评估反应 → 关系变化 → 影响下一次行为决策 → 产生新事件 → ... |

### 不变量（Invariant）

| # | 不变量 | 违反后果 |
|---|--------|---------|
| I1 | **游戏引擎（规则层）永远是最终仲裁者** — AI 只能在规则允许的范围内影响行为 | AI 幻觉导致游戏崩溃 |
| I2 | **AI 不可用时游戏功能 100% 正常** — 所有 AI 增强必须有确定性 fallback | 游戏卡死 |
| I3 | **NPC 状态变更必须经过规则验证** — AI 不能直接修改 GameState | 数值被污染 |
| I4 | **小模型的输出必须是结构化的** — 自由文本仅用于台词展示 | 解析失败、行为不可控 |
| I5 | **道德/特性值的变化幅度有硬上限** — 防止模型输出极端值导致状态突变 | 人物性格一夜剧变 |
| I6 | **关系值是双向独立的** — A→B 和 B→A 可以不对称 | 关系不真实 |

---

## §2 PoC 验证结论（Step 1.5 已完成）

> [!IMPORTANT]
> PoC-1 已完成 9 轮 × 20 场景测试，核心结论决定了生产架构选择。

| 能力 | PoC 结论 | 生产方案 |
|------|---------|---------|
| **情绪分类** | 精确候选池 4 选 1 → 100% 准确率 | 规则引擎预筛 4 候选 + AI 分类 |
| **关系 Delta 方向** | 所有方案天花板 80-85%，存在系统性偏差 | 规则引擎后处理强制修正方向 |
| **内心独白** | ★★★★★ 全轮次优秀 | AI 直出，无需后处理 |
| **延迟** | avg 660ms, P95 1181ms | ✅ 远低于 3000ms MUD 实时要求 |
| **JSON Schema 遵从** | 100% | llama.cpp response_format 保证 |

**确定的三层流水线架构**：

```
① 规则引擎（预筛 4 候选情绪 + 事件角色标注）
    ↓
② AI 推理（Qwen3.5-0.8B：情绪 N选1 + delta 数值 + 内心独白）
    ↓
③ 后处理校验（强制修正 delta 方向 + 夹值 + 冷却检查）
    ↓
  GameState 更新
```

---

## §3 业务实体与规则

### 3.1 道德系统（双轴）

```typescript
/** 道德轴 — 善恶 × 正邪 */
interface MoralAlignment {
  goodEvil: number;    // -100(极恶) ~ +100(极善)
  lawChaos: number;    // -100(邪道) ~ +100(正道)
}
```

| 规则 | 数值 | 说明 |
|------|------|------|
| R-E1 初始范围 | goodEvil: [-30, +30], lawChaos: [-30, +30] | 随机生成（受特性影响） |
| R-E2 单次变化上限 | ±5 | I5: 防止剧变 |
| R-E3 自然漂移 | 趋向特性倾向，0.1/天 | 有天赋加速 |
| R-E4 道德区间标签 | 见**道德标签阈值表** | 展示用（MUD 日志 + AI prompt 上下文） |
| R-E14 道德趋同 | affinity≥50 且持续>5分钟 → 双方道德值每分钟向对方漂移 0.1 | 夹值到初始值±20 |

#### 道德标签阈值表（R-E4 详解，两轴通用）

| 区间 | 善恶轴标签 | 正邪轴标签 | 数值范围 |
|:----:|----------|----------|:--------:|
| 极端正 | 至善 | 大正 | [+60, +100] |
| 偏正 | 善良 | 守正 | [+20, +59] |
| 中立 | 中庸 | 无拘 | [-19, +19] |
| 偏负 | 冷酷 | 放浪 | [-59, -20] |
| 极端负 | 极恶 | 邪魔 | [-100, -60] |

> 初始道德 [-30, +30]（R-E1），因此新弟子只会落在中立或偏正/偏负区间。

### 3.2 特性系统

```typescript
interface TraitDef {
  id: string;                    // 'greedy', 'loyal', 'envious'
  name: string;                  // '贪婪', '忠义', '善妒'
  category: 'innate' | 'acquired';
  polarity: 'positive' | 'negative' | 'neutral';
  effects: TraitEffect[];        // 具体效果列表
  aiHint: string;                // 给 AI 的性格提示词
  trigger?: AcquiredTrigger;     // 后天特性获取条件（仅 acquired）
}

interface TraitEffect {
  type: 'behavior-weight' | 'relationship-modifier' | 'moral-drift' | 'emotion-weight';
  target: string;                // 影响目标（行为名/情绪名/轴名/条件）
  value: number;                 // 加权值或乘数
}

interface AcquiredTrigger {
  condition: string;             // 触发条件描述
  probability: number;           // 0~1 触发概率
}
```

| 规则 | 数值 | 说明 |
|------|------|------|
| R-E5 先天特性 | 生成时随机 1~2 个（从 innate 池抽取） | 不可移除 |
| R-E6 后天特性 | 满足 trigger 条件时按概率获取，上限 3 个 | 满 3 个时替换最早获取的 |
| R-E7 特性池大小 | Phase E 阶段 12 个（6 先天 + 6 后天） | 人性核心 × 修仙外壳 |
| R-E8 先天互斥 | 同一弟子不可同时拥有相同 polarity 的 2 个特性 | 保证多样性 |

#### TRAIT_REGISTRY 完整定义（12 个）

**先天特性（Innate）— 6 个，生成时随机抽取 1~2 个**

| # | id | name | polarity | effects | aiHint |
|---|-----|------|:--------:|---------|--------|
| T1 | `loyal` | 忠义 | positive | `relationship-modifier(positive-delta, ×1.3)` | 重义气，对同门有强烈的归属感，愿意为同伴付出 |
| T2 | `greedy` | 贪婪 | negative | `behavior-weight(alchemy, +0.2)`, `emotion-weight(envy, +0.3)` | 贪图利益，炼丹和收获时特别积极，别人得到好东西会嫉妒 |
| T3 | `proud` | 心高气傲 | neutral | `emotion-weight(contempt, +0.2)`, `relationship-modifier(negative-delta, ×1.3)` | 自视极高，不能忍受被看轻或被超越，受到负面评价时反应剧烈 |
| T4 | `empathetic` | 心思细腻 | positive | `relationship-modifier(all-delta, ×1.2)`, `emotion-weight(sadness, +0.15)` | 善于体察他人情绪，同门受苦时真心难过，同门高兴时由衷开心 |
| T5 | `stubborn` | 固执 | neutral | `moral-drift(all, ×0.5)`, `relationship-modifier(all-delta, ×0.7)` | 认定的事情不轻易改变，不容易受他人影响，关系变化也偏慢 |
| T6 | `envious` | 善妒 | negative | `emotion-weight(envy, +0.4)`, `emotion-weight(jealousy, +0.3)` | 看不得别人比自己好，嫉妒心极强，别人成功时内心翻涌 |

**后天特性（Acquired）— 6 个，满足条件时按概率获取**

| # | id | name | polarity | effects | trigger | aiHint |
|---|-----|------|:--------:|---------|---------|--------|
| T7 | `grateful` | 知恩图报 | positive | `relationship-modifier(positive-delta-to-benefactor, ×1.5)` | 作为 beneficiary 经历正面事件 ≥3 次，每次 20% | 受过恩惠懂得感恩，对帮助过自己的人格外亲近 |
| T8 | `vengeful` | 睚眦必报 | negative | `relationship-modifier(negative-delta-to-aggressor, ×1.5)` | 作为 victim 经历负面事件 ≥3 次，每次 15% | 受过伤害记仇不忘，对伤害过自己的人始终保持敌意 |
| T9 | `adventurous` | 好冒险 | positive | `behavior-weight(explore, +0.25)`, `emotion-weight(joy, +0.15)` | explore-return 成功 ≥3 次，每次 20% | 喜欢探索冒险闲不住，对未知充满好奇与兴奋 |
| T10 | `ambitious` | 野心勃勃 | neutral | `behavior-weight(meditate, +0.2)`, `emotion-weight(envy, +0.15)` | 观察到比自己高 1 阶以上的同门 ≥5 次，每次 15% | 渴望变强，修炼热情极高，但看到比自己强的人会心生不甘 |
| T11 | `timid` | 胆小怕事 | negative | `behavior-weight(rest, +0.2)`, `emotion-weight(fear, +0.3)` | breakthrough-fail ≥2 次，每次 20% | 曾受挫折，做事畏首畏尾，遇到不确定的事倾向于退缩 |
| T12 | `compassionate` | 悲天悯人 | positive | `relationship-modifier(positive-delta-to-suffering, ×1.3)`, `moral-drift(goodEvil, +0.2)` | 观察到同门 breakthrough-fail 或 alchemy-fail ≥3 次，每次 10% | 心怀慈悲，对受苦的同门特别关心，道德上趋向善良 |

**effects 运算规则**：
- `behavior-weight(X, +N)`：弟子选择行为 X 的基础权重 +N（叠加到行为树权重表）
- `relationship-modifier(condition, ×M)`：满足 condition 时，关系 delta 乘以 M
- `moral-drift(axis, ×M)`：道德自然漂移速率乘以 M（如 T5 `×0.5` = 漂移减半）
- `moral-drift(axis, +N)`：道德自然漂移每天额外 +N（如 T12 `+0.2` = 每天偏善 0.2）
- `emotion-weight(E, +N)`：当情绪 E 出现在候选池时，AI 选择权重 +N（提示词加权）

### 3.3 关系系统（升级现有 RelationshipEdge）

```typescript
interface RelationshipEdge {
  sourceId: string;
  targetId: string;
  affinity: number;              // -100 ~ +100
  tags: RelationshipTag[];       // 可叠加
  lastInteraction: number;       // 衰减时间戳
}

type RelationshipTag = 'friend' | 'rival' | 'mentor' | 'admirer' | 'grudge';
```

| 规则 | 数值 | 说明 |
|------|------|------|
| R-E9 初始好感 | `affinity = random(-10, 10) + moralBonus(A,B)` | 见公式 |
| R-E10 衰减 | 每 5 分钟 `affinity *= 0.98`（向 0 衰减） | 参考鬼谷月结衰减 |
| R-E11 AI 建议裁剪 | delta 强制夹值到 [-5, +5] | I3+I5 |
| R-E12 标签触发 | affinity ≥60 → +friend, ≤-60 → +rival | 自动分配，可叠加其他标签 |
| R-E13 关系影响行为 | 见**标签效果表** | 关系→行为反馈 |
| R-E15 衰减下限 | `abs(affinity) <= 5` 时停止衰减 | 保留有意义的关系记忆 |

#### 初始好感度公式（R-E9 详解）

```
moralDistance(A, B) = abs(A.goodEvil - B.goodEvil) + abs(A.lawChaos - B.lawChaos)
  // 范围 [0, 400]（双轴各 [-100,+100]，极端情况距离=400）
  // 实际初始道德 [-30,+30]，所以初始距离范围 [0, 120]

moralBonus(A, B) = clamp(10 - moralDistance(A, B) / 6, -10, 10)
  // 距离 0  → bonus = +10（道德完全一致，好感加成最大）
  // 距离 60 → bonus =   0（中等差异，无加成）
  // 距离 120 → bonus = -10（道德完全相反，好感惩罚最大）

affinity = randomInt(-10, 10) + moralBonus(A, B)
  // 最终范围 [-20, +20]
```

#### 关系标签效果表（R-E13 详解）

| 标签 | 触发条件 | 移除条件 | 行为权重修正 | Delta 修正 | 特殊效果 |
|------|---------|---------|:------------|:----------|:--------|
| `friend` (好友) | affinity ≥ 60 | affinity < 50 | 合作行为权重 ×1.3（bounty/farm） | 正向 delta ×1.2, 负向 delta ×0.8 | — |
| `rival` (宿敌) | affinity ≤ -60 | affinity > -50 | — | 正向 delta ×0.5, 负向 delta ×1.3 | envy/contempt 情绪候选权重 +0.2 |
| `mentor` (恩师) | A 帮助 B breakthrough-success ≥1 次 | 不可移除 | B 的 meditate 权重 ×1.15 | B→A 正向 delta ×1.5 | — |
| `admirer` (崇拜) | A 对 B 的 admiration 情绪 ≥3 次 | affinity < 20 | A 的 meditate 权重 ×1.1 | A→B 正向 delta ×1.3 | — |
| `grudge` (心结) | A 对 B 的 anger/contempt 情绪 ≥3 次 | affinity > 0 | — | A→B 负向 delta ×1.5, A→B 正向 delta ×0.5 | — |

**标签规则**：
- friend 和 rival 互斥（不可同时存在）
- mentor 不可移除（一旦建立永久保留）
- admirer/grudge 可与 friend/rival 叠加
- 移除条件有迟滞区间（如 friend 60 触发、50 以下才移除），防止标签频繁切换

### 3.4 事件类型与候选池映射表

#### 3.4.1 Soul 事件类型（SoulEventType）

> 基于当前游戏引擎已有的行为结束事件（`intent-executor.ts` outcomeTag），Phase E 不新增游戏事件，仅为现有事件注册灵魂评估。

| SoulEventType | 来源 | 涉及角色 | 事件正负性 | 说明 |
|---------------|------|---------|:---------:|------|
| `alchemy-success` | alchemy 行为结束+成功 | self + observers | 正面 | 炼丹成功出丹 |
| `alchemy-fail` | alchemy 行为结束+失败 | self + observers | 负面 | 炼丹失败丹炉碎裂 |
| `harvest` | farm 行为结束 | self + observers | 正面 | 灵田收获 |
| `meditation` | meditate 行为结束 | self + observers | 正面 | 修炼有所感悟 |
| `explore-return` | explore 行为结束 | self + observers | 正面 | 探索归来 |
| `breakthrough-success` | 突破成功 | self + observers | 强正面 | 突破境界 |
| `breakthrough-fail` | 突破失败 | self + observers | 强负面 | 突破失败受伤 |

**角色定义**：
- `self`：执行行为的弟子本人（对自己的结果产生情绪反应）
- `observer`：同宗门其他弟子（旁观他人的结果产生情绪反应）

> Phase E 暂不区分 observer-friend/observer-rival（由 AI 自行根据 affinity 上下文判断）。候选池对所有 observer 相同，差异化由 AI + 特性 emotion-weight 实现。

#### 3.4.2 事件→候选池映射表（buildCandidatePool 查找表）

| SoulEventType | self 候选池 (4个) | observer 候选池 (4个) |
|---------------|:-----------------:|:--------------------:|
| `alchemy-success` | joy, pride, relief, neutral | admiration, envy, joy, neutral |
| `alchemy-fail` | sadness, anger, shame, neutral | sadness, contempt, worry, neutral |
| `harvest` | joy, relief, pride, neutral | joy, envy, neutral, admiration |
| `meditation` | joy, pride, relief, neutral | admiration, neutral, joy, envy |
| `explore-return` | joy, pride, relief, neutral | admiration, envy, worry, neutral |
| `breakthrough-success` | joy, pride, relief, gratitude | admiration, envy, joy, jealousy |
| `breakthrough-fail` | sadness, anger, fear, shame | sadness, contempt, worry, neutral |

**候选池规则**：
- 每个事件×角色组合固定 4 个候选情绪，AI 从中 4 选 1
- 候选池由规则引擎在 AI 调用前确定，不受 AI 影响（I1）
- 特性 `emotion-weight` 效果：当候选池中包含该情绪时，在 prompt 中标注为「倾向于」
- 正面事件的 self 池必含 `joy`；负面事件的 self 池必含 `sadness`
- observer 池必含 `neutral`（允许 AI 判断旁观者无感）

#### 3.4.3 Delta 方向修正规则（correctDeltaDirection 查找表）

| 事件正负性 | 角色 | 允许的 delta 方向 | 修正规则 |
|:---------:|:----:|:-----------------:|:--------|
| 正面事件 | self | ≥ 0 | delta 为负时取绝对值（自己成功不应降低关系） |
| 正面事件 | observer | 任意 | 不修正（旁观者可能嫉妒导致负面） |
| 负面事件 | self | ≤ 0 | delta 为正时取反（自己失败不应提升关系） |
| 负面事件 | observer | 任意 | 不修正（旁观者可能同情导致正面） |

---

### 3.5 AI 事件评估（核心新增）

```typescript
/** AI 评估结果（结构化 JSON） */
interface SoulEvaluationResult {
  emotion: EmotionTag;           // 从候选池 4 选 1
  intensity: 1 | 2 | 3;         // 1=微弱 2=明显 3=强烈
  relationshipDeltas: Array<{
    targetId: string;
    delta: number;               // AI 原始输出 [-10, +10]，后处理夹值到 [-5,+5]
    reason: string;              // AI 生成的原因（展示用）
  }>;
  innerThought: string;          // 内心独白（展示用，AI 直出）
}

type EmotionTag = 'joy' | 'anger' | 'envy' | 'admiration'
  | 'sadness' | 'fear' | 'contempt' | 'neutral'
  | 'jealousy' | 'gratitude' | 'guilt' | 'worry'
  | 'shame' | 'pride' | 'relief';
```

**EmotionTag 中文对照**：

| EmotionTag | 中文 | 常见触发场景 |
|------------|------|:-----------:|
| joy | 喜悦 | 自己/好友成功 |
| anger | 愤怒 | 自己失败、被伤害 |
| envy | 羡慕 | 旁观他人成功（中性偏负） |
| admiration | 敬佩 | 旁观他人突出成就 |
| sadness | 悲伤 | 自己/好友失败 |
| fear | 恐惧 | 自己突破失败受伤 |
| contempt | 鄙视 | 旁观他人失败（负面） |
| neutral | 平淡 | 无强烈情绪 |
| jealousy | 嫉妒 | 旁观他人大成功（比 envy 更强） |
| gratitude | 感恩 | 自己突破成功后感谢 |
| guilt | 愧疚 | 自己失误影响他人 |
| worry | 担忧 | 旁观他人失败/受伤 |
| shame | 羞耻 | 自己公开失败 |
| pride | 自豪 | 自己达成成就 |
| relief | 释然 | 度过困难、危险解除 |

#### 3.5.1 Fallback 模板（AI 不可用时使用）

> AI 超时（5s）或连接失败时，规则引擎使用以下模板独立运行：
> 1. 从候选池随机选 1 个情绪（均匀分布，特性 emotion-weight 不生效）
> 2. intensity 固定为 2
> 3. delta 按事件正负性固定为 +1/-1（self）或 0（observer）
> 4. innerThought 从下表按 emotion × role 随机选 1 条

**Self 角色 Fallback 独白模板**：

| Emotion | 模板 1 | 模板 2 | 模板 3 |
|---------|--------|--------|--------|
| joy | 心头涌上一阵暖意，今日的努力没有白费。 | 嘴角不自觉地扬起，这感觉真好。 | 总算是做了一件像样的事情。 |
| anger | 胸中一股怒气翻涌，恨不得将丹炉砸了。 | 又失败了……凭什么？ | 双拳攥紧，指节发白。 |
| sadness | 心中一阵酸楚，低下了头。 | 又一次辜负了自己的期望…… | 默默叹了口气，不想让别人看到。 |
| fear | 后背发凉，一阵寒意涌上心头。 | 浑身颤栗，突破的反噬让人心有余悸。 | 不敢再想下去了…… |
| pride | 挺直了腰板，今日的自己值得骄傲。 | 修行路上，又进了一步。 | 终于证明了自己的实力。 |
| relief | 长舒了一口气，悬着的心终于放下了。 | 还好还好，总算是没出什么差错。 | 危险过去了……以后还得小心。 |
| shame | 恨不得找个地缝钻进去。 | 当着大家的面失败，太丢人了…… | 低下头，不敢看任何人。 |
| neutral | 心如止水，不以物喜，不以己悲。 | 平常事罢了，不值得大惊小怪。 | 波澜不惊地收起了法器。 |
| gratitude | 若非众人扶持，今日不会如此顺利。 | 心中默默记下了这份恩情。 | 感激之情溢于言表。 |
| guilt | 是自己拖累了大家…… | 心头沉甸甸的，像压了块石头。 | 要是自己再努力一点就好了…… |

**Observer 角色 Fallback 独白模板**：

| Emotion | 模板 1 | 模板 2 | 模板 3 |
|---------|--------|--------|--------|
| admiration | 真了不起，要向{name}学习才是。 | 不愧是{name}，果然厉害。 | 仰望着{name}的背影，心生敬意。 |
| envy | 为什么成功的总是{name}…… | 看着{name}的成就，心里不是滋味。 | 同样修炼，差距为何这么大？ |
| jealousy | 凭什么是{name}？明明自己也…… | 嫉妒的火焰灼烧着内心。 | 不甘心，绝不甘心。 |
| joy | 看到{name}做到了，由衷地高兴。 | {name}成功了，真好。 | 嘴角不自觉地笑了，替{name}开心。 |
| sadness | 看着{name}的样子，心里也不好受。 | {name}失败了……真让人难过。 | 轻轻叹了口气，替{name}惋惜。 |
| contempt | 就这点本事，还好意思修炼？ | 又失败了，不出意料。 | 果然不行啊。 |
| worry | 希望{name}没事才好…… | 有些担心{name}的状况。 | 看着{name}的表情，心里有点不安。 |
| neutral | 旁观着这一切，并无特别感触。 | 与自己无关，低头继续自己的事。 | 瞥了一眼，没什么特别的。 |

> **模板变量**：`{name}` → 事件主角弟子名。Observer 模板中必须包含 `{name}` 占位符。

### 3.6 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| AI 角色 | **建议者**，不是决策者 | I1 不可违反；规则引擎有最终否决权 |
| 评估频率 | **事件驱动**，非每 tick | 0.8B 推理速度限制 + 8 弟子并发 |
| JSON vs 自由文本 | **JSON 用于状态变化，自由文本仅用于展示** | I4 结构化输出是小模型可靠性的关键 |
| 关系变化来源 | **规则层 70% + AI 建议层 30%** | 确定性基线 + AI 锦上添花 |
| Fallback 策略 | **规则引擎独立运行，AI 增强为可选层** | I2 完整 fallback |
| 道德×性格独立 | 道德可变（受关系影响），性格几乎不可变 | USER 决策 Q1 |
| 特性池方向 | 人性混合（修仙是壳） | USER 决策 Q3 |

### 3.7 MECE 校验

| 维度 | 穷尽？ | 独立？ | 说明 |
|------|:------:|:------:|------|
| 道德产源 | ✅ | ✅ | 事件反应 + 特性漂移 + AI 建议 + 关系趋同 |
| 特性来源 | ✅ | ✅ | 先天(生成) + 后天(事件/AI) |
| 特性 Sink | ✅ | ✅ | 上限 5 个(2+3)，新 trait 替换旧 |
| 关系产源 | ✅ | ✅ | 初始值 + 事件驱动 + AI 建议 + 特性修正 |
| 关系 Sink | ✅ | ✅ | 时间衰减 + 负面事件 |
| AI 评估产出 | ✅ | ✅ | emotion(规则候选) + delta(后处理修正) + thought(直出) |

---

## §4 IN/OUT 边界（Phase E 范围）

| ✅ IN（Phase E 范围内） | 🚫 OUT（Phase E 范围外） |
|:---|:---|
| 道德双轴系统（善恶 × 正邪） | 道德影响修炼/炼丹效率 |
| 特性系统（先天 + 后天，10~15 个特性池） | 特性专属剧情事件 |
| 关系系统升级（affinity + tags + 衰减） | 弟子叛逃/弟子死亡 |
| AI 事件评估器（三层流水线） | 多人社交推理（A/B 吵架，C 站队） |
| 规则引擎候选池预筛 | AI 生成长期计划/目标 |
| 后处理 Delta 方向修正 | 4B+ 模型升级（本 Phase 仅 0.8B） |
| 事件总线基础设施 | 跨宗门 NPC 交互 |
| MUD 日志中展示内心独白/情绪 | 社交事件 UI（图形化关系图） |
| 存档迁移 v3 → v4 | 云存档 |

---

## §5 User Stories

> **权威来源**：[`7game-lite-user-stories-phaseE.md`](../design/specs/7game-lite-user-stories-phaseE.md)
> PRD 中不再内嵌 User Stories 副本，以避免双来源不一致。以下仅保留依赖拓扑和摘要。

### 依赖拓扑

```
#1 道德+特性+关系 数据层 ─────────────────────┐
#2 事件总线 ──────────────────────────────────┼─→ #4 AI 三层流水线 ──→ #5 集成闭环+迁移
#3 规则引擎（候选池+后处理） ─────────────────┘
```

### 复杂度与预估

| Story | 复杂度 | 预估 | 关键风险 |
|-------|--------|------|---------|
| #1 数据层（道德+特性+关系） | M | 1d | 存档迁移 v3→v4 复杂度 |
| #2 事件总线 | S | 0.5d | 与 TickPipeline 的集成时机 |
| #3 规则引擎（候选池+后处理） | M | 1d | 候选池规则覆盖度 |
| #4 AI 三层流水线 | L | 2d | AI 并发推理 × 8 弟子延迟 |
| #5 集成闭环+迁移 | S | 0.5d | 回归测试 |
| **总计** | — | **5d** | — |

---

## §6 Party Review

> 完整审查报告：[`pipeline/phaseE/review.md`](../pipeline/phaseE/review.md)（独立存储）

### 审查概要

- **评审者**：R1 魔鬼PM + R2 资深玩家 + R3 数值策划 + R4 项目经理 + R5 偏执架构师
- **维度总数**：22 个
- **最终判定**：⚠️ **CONDITIONAL PASS** — 5 WARN / 0 BLOCK

| WARN | 处置 |
|------|------|
| W1 操作动机（R2-D3） | → FB-005 关系面板 UI，后续 Phase |
| W2 衰减趋零（R3-D2） | → **已修复**：新增 R-E15 衰减下限（\|affinity\|≤5 停止衰减） |
| W3 工期偏紧（R4-D2） | → 注意控制，必要时拆 Story #4 |
| W4 路线图冲突（R4-D4） | → GATE 1 后更新 MASTER-PRD §5 |
| W5 Owner 唯一性（R5-D3） | → TDD 阶段声明 Owner 矩阵 |

---

## §7 Pre-Mortem 分析

> 假设 NPC 灵魂系统已上线 3 个月，结果是**彻底失败**。

| # | 最可能的失败原因 | 预警信号 | 缓解措施 | 当前风险等级 |
|---|----------------|---------|---------|:----------:|
| 1 | **玩家不看 MUD 日志** — 灵魂系统输出全部在日志中，但玩家挂机时不看，导致核心价值不被感知 | 日志滚动速度 > 阅读速度；无「关键事件」高亮 | 增加关键情绪事件的高亮/置顶/弹出；后续增加关系面板作为非时间流内容 | 🟡 中 |
| 2 | **AI 推理延迟叠加导致 MUD 日志卡顿** — 8 弟子 × 多事件 × 693ms/次，高频段 AI 排队过长 | P95 延迟 > 3s；日志出现明显的「无反应空窗期」 | 事件队列限流（如 60s 内最多 3 次 AI 评估）；非关键事件降级为 fallback | 🟢 低 |
| 3 | **特性/道德系统在 8 弟子规模下差异不明显** — 10 个特性 / 8 弟子 → 重叠率高，玩家感觉不到差异 | 反馈「弟子都差不多」 | 确保 TRAIT_REGISTRY 多样性；先天特性保证至少 1 个 polarity 差异 | 🟡 中 |
| 4 | **关系衰减+事件驱动频率不匹配** — 事件太少导致关系值始终在 0 附近 | affinity 标准差 < 10（弟子间关系无差异） | 初始值拉大区间 + 降低衰减率；增加规则引擎的确定性关系事件 | 🟡 中 |

### 行动项

- 🟡 PM1/PM3/PM4 → 记入 feature-backlog（关系面板 + 特性多样性 + 事件频率调优）
- 所有 🟢 低风险 → 已有缓解措施，无需额外行动

---

## §8 假设审计

| # | 假设 | 如果错误的后果 | 风险等级 | 验证方式 | 何时验证 |
|---|------|--------------|:--------:|---------|---------| 
| A1 | 0.8B 模型在精确候选池下情绪分类 ≥90% | 情绪分类退化，灵魂反应荒谬 | 🟢 | PoC-1 **已验证**（100%） | ✅ 已验证 |
| A2 | 事件驱动频率足以累积有意义的关系变化 | 关系值始终在 0 附近，灵魂系统无感 | 🟡 | 5 分钟运行观察：是否有 ≥3 次评估触发 | Phase E Story #5 |
| A3 | 玩家会阅读 MUD 日志中的灵魂内容 | 核心价值无法传递，ROI=0 | 🟡 | 人工体验评估（自己试玩 15 分钟） | Phase E 交付后 |
| A4 | 后处理 Delta 方向修正覆盖了 95%+ 的错误案例 | 残留 5% 异常方向导致玩家困惑 | 🟢 | PoC-1b 已验证：规则层可修正大部分方向错误 | ✅ 已部分验证 |
| A5 | 10~15 个特性足以产生 8 弟子间的差异感 | 弟子感觉雷同 | 🟡 | 生成 8 弟子 × 100 次，统计特性分布多样性 | Phase E Story #1 |
| A6 | 关系衰减 ×0.98/5min + 下限 5 是合理参数 | 关系过快消失或永不消失 | 🟢 | 验证脚本：24h 模拟关系值变化曲线 | Phase E Story #5 |

### 行动项

- 🟡 A2/A3/A5 → Phase E 验证脚本 + 人工体验评估中覆盖
- 🟢 A1/A4/A6 → 已验证或计划验证

---

## §9 需求债务变更

| 操作 | # | 说明 |
|------|---|------|
| **清偿** | FB-004 | 关系系统 → Phase E 实现（升级为完整 NPC 灵魂系统） |
| **新增** | FB-005 | 关系面板 UI（非 MUD 日志的主动查看入口）→ 后续 Phase |
| **新增** | FB-006 | 特性专属剧情事件（特性触发独家故事线）→ 后续 Phase |
| **新增** | FB-007 | 关系衰减分层（不同阈值不同衰减速度）→ 后续 Phase 专项优化 |
| **新增** | FB-008 | 关系确认/非确认机制（双向确认 vs 单向好感）→ 后续 Phase 关系深化 |
| **新增** | FB-009 | 关系标签效果乘数调优（需模拟验证）→ Phase E 集成验证时 |
| **新增** | TD-012 | 关系数值参数未经 Monte Carlo 验证 → Phase E Story #5 |

---

## USER Approval

- [x] USER 已审阅 PRD 内容
- [x] USER 已确认 User Stories
- [x] Party Review 无 BLOCK 项

签章：`[x] GATE 1 PASSED` — 2026-03-29

> **USER 备注**：特性池和候选池映射基本合理，关系标签效果乘数暂按现有参数执行，但衰减分层、关系确认机制、参数模拟验证均记入债务（FB-007/008/009 + TD-012）。

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-29 | PRD 初始创建：含 PoC-1 结论、5 条 User Stories、Party Review（CONDITIONAL PASS）、Pre-Mortem、Assumption Audit |
| 2026-03-29 | Step 2 落地细化：TRAIT_REGISTRY 12 个完整 TraitDef + 事件→候选池 7×2 映射表 + 关系标签效果表 5 标签 + 初始好感度公式 |
| 2026-03-29 | GATE 1 签章通过。新增债务 FB-007/008/009 + TD-012（关系衰减分层/确认机制/参数调优） |
