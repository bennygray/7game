# Phase F: 灵魂闭环 — User Stories

> **Phase**：F | **关联 PRD**：`phaseF-PRD.md`
> **日期**：2026-03-30 | **维护者**：/SPM
> **Story 总数**：5

---

**Story F-1** `[复杂度: S]`
> 作为引擎，我希望弟子的先天/后天特性能叠加影响行为权重，以便于「胆魄如虹」弟子真正更爱冒险。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 弟子持有 `innate_courageous`（explore +0.3, bounty +0.2） | planIntent 调用 getEnhancedPersonalityWeights | explore 权重 = 基础值 × (1 + 0.3)，bounty 权重 = 基础值 × (1 + 0.2) | PRD §3.1 R-F-E2 |
| 2 | 弟子持有 `innate_cowardly`（explore -0.3, bounty -0.2） | getEnhancedPersonalityWeights 被调用 | explore 权重 = 基础值 × (1 - 0.3) = 基础值 × 0.7 | PRD §3.1 R-F-E2 |
| 3 | 弟子同时持有 `innate_courageous`(explore +0.3) 和 `acquired_battle_hardened`(bounty +0.3) | getEnhancedPersonalityWeights 被调用 | explore 权重 = base × 1.3, bounty 权重 = base × (1 + 0.2 + 0.3) = base × 1.5 | PRD §3.2 F-F-01 公式 |
| 4 | 弟子持有负效果使 traitModifier = -1.5（极端堆叠假设） | 权重计算 | 权重 = Math.max(0, base × (1 + (-1.5))) = 0（非负保底） | PRD §3.2 F-F-01 |
| 5 | Monte Carlo N=1000，一组有 `innate_courageous`，一组无特性，rest identical personality | 统计 explore 选择率 | 「胆魄如虹」组 explore 率比对照组高 ≥15% | 脚本 Case #1 |

**依赖**：无

---

**Story F-2** `[复杂度: S]`
> 作为引擎，我希望 friend/rival 关系标签在弟子处于同地点时影响行为权重，以便于友人在侧更合作、对手在侧更竞争。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 弟子 A 对弟子 B 有 `friend` tag，A 和 B 同在 `BACK_MOUNTAIN` | A 的 planIntent 调用 getEnhancedPersonalityWeights | A 的 meditate/alchemy/farm 权重各 ×1.2 | PRD §3.1 R-F-E3 |
| 2 | 弟子 A 对弟子 C 有 `rival` tag，A 和 C 同在 `LING_SHOU_SHAN` | A 的 getEnhancedPersonalityWeights 被调用 | A 的 explore/bounty ×1.3，meditate ×0.7 | PRD §3.1 R-F-E3 |
| 3 | 弟子 A 同地点同时有 friend(B) 和 rival(C) | 权重计算 | friend 和 rival 乘数均生效：meditate = base × 1.2 × 0.7 = base × 0.84 | PRD §3.1 R-F-E3（可叠加规则） |
| 4 | 弟子 A 的所有 friend/rival 均不在同地点 | 权重计算 | 无关系标签乘数应用，权重 = 特性叠加后的值 ×1.0 | — |
| 5 | Monte Carlo N=1000，强制 friend 同地 vs 无关系同地 | 统计合作行为（meditate+alchemy+farm）占比 | friend 同地组合作行为占比比对照高 ≥10% | 脚本 Case #2 |

**依赖**：Story F-1（需 getEnhancedPersonalityWeights 框架）

---

**Story F-3** `[复杂度: M]`
> 作为引擎，我希望弟子维护短期情绪状态（由 soul-engine 事件评估产出），并在行为决策时影响权重，以便于「愤怒」时更爱打架、「恐惧」时更爱休息。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | soul-engine 评估某事件后返回 emotion='anger', intensity=2 | processSoulEvent 完成 | 弟子 emotionMap 记录 currentEmotion='anger', emotionIntensity=2 | PRD §3.2 F-F-03 |
| 2 | 弟子当前 currentEmotion='anger' | planIntent 调用 getEnhancedPersonalityWeights | bounty 权重 ×1.4，meditate 权重 ×0.7 | PRD §3.1 R-F-E4 |
| 3 | 弟子当前 currentEmotion='fear' | getEnhancedPersonalityWeights 被调用 | explore/bounty ×0.6，rest ×1.5 | PRD §3.1 R-F-E4 |
| 4 | 弟子 emotionIntensity=3 | soul-tick 执行 3 次（~15 分钟） | intensity 3→2→1→null，currentEmotion 最终为 null | PRD §3.2 F-F-02（EMOTION_DECAY_TICKS=3） |
| 5 | 弟子已有 emotion='joy'，新事件产出 emotion='anger' | recordEmotion 执行 | currentEmotion 被覆盖为 'anger'（last-write-wins） | PRD §3.2 F-F-03 |
| 6 | 弟子 currentEmotion='neutral' | getEnhancedPersonalityWeights 被调用 | 情绪乘数全部为 ×1.0，无行为影响 | PRD §3.1 R-F-E4 |

**依赖**：Story F-1

---

**Story F-4** `[复杂度: S]`
> 作为引擎，我希望 IdleEngine 以 emotionMap 形式管理运行时情绪状态，并在首次启动和存档加载时正确初始化为空。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 游戏首次启动 | IdleEngine 构造 | emotionMap 为空 Map（所有弟子 emotion = null） | — |
| 2 | 游戏从 v5 存档加载 | 加载完成 | emotionMap 重新为空 Map（不持久化） | PRD §3.4 |
| 3 | emotionMap 被 soul-engine processSoulEvent 写入 | disciple-tick 下一次 planIntent | planIntent 接收到该弟子的 emotionState 并传入 getEnhancedPersonalityWeights | — |
| 4 | emotionMap 中某弟子 emotion 已衰减为 null | planIntent 执行 | getEnhancedPersonalityWeights 的 emotionState 参数为 null，跳过情绪层 | — |

**依赖**：Story F-1, F-3

---

**Story F-5** `[复杂度: M]`
> 作为开发者，我希望验证灵魂闭环的数值正确性和回归稳定性，确保新系统不破坏现有功能。

| AC# | Given (前置条件) | When (触发动作) | Then (预期结果) | Data Anchor |
|-----|-----------------|----------------|----------------|-------------|
| 1 | 所有 F1~F4 代码已就位 | `npx tsx scripts/regression-all.ts` | 现有 64 条回归 + 108 条 F0-β 专项全部通过（0 失败） | — |
| 2 | 验证脚本 `scripts/verify-phaseF.ts` Case #1 | Monte Carlo N=1000 特性效果验证 | `innate_courageous` explore 率高于无特性 ≥15%; `innate_cowardly` explore 率低于无特性 ≥15% | 脚本 Case #1 |
| 3 | 验证脚本 Case #2 | Monte Carlo N=1000 关系效果验证 | friend 同地时合作行为占比高于对照 ≥10% | 脚本 Case #2 |
| 4 | 验证脚本 Case #3 | Monte Carlo N=1000 情绪效果验证 | anger 下 bounty 率高于 neutral ≥20%; fear 下 explore 率低于 neutral ≥20% | 脚本 Case #3 |
| 5 | 验证脚本 Case #4 | 情绪衰减 | intensity=3 经 3 次 decayEmotion 后变 null | 脚本 Case #4 |
| 6 | TypeScript 编译 | `npx tsc --noEmit` | 0 errors | — |

**依赖**：Story F-1, F-2, F-3, F-4

---

## 质量检查 (INVEST)

| 原则 | F-1 | F-2 | F-3 | F-4 | F-5 |
|------|:---:|:---:|:---:|:---:|:---:|
| Independent | ✅ | ✅¹ | ✅¹ | ✅¹ | ✅¹ |
| Negotiable | ✅ | ✅ | ✅ | ✅ | ✅ |
| Valuable | ✅ | ✅ | ✅ | ✅ | ✅ |
| Estimable | S | S | M | S | M |
| Small | ✅ | ✅ | ✅ | ✅ | ✅ |
| Testable | ✅ | ✅ | ✅ | ✅ | ✅ |

> ¹ F-2/F-3/F-4 依赖 F-1 的 getEnhancedPersonalityWeights 框架，但各自的逻辑独立可测。
