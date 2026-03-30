# Phase F — SPM Party Review (GATE 1)

> **日期**：2026-03-30 | **审查对象**：phaseF-PRD.md + phaseF-user-stories.md
> **协议**：`_shared/review-protocol.md` 四层防线
> **角色配置**：R1 必选 + R3 必选 + R5 必选 + R2 按需(✅ 涉及核心体验变更) + R4 按需(✅ 涉及路线图推进)

---

## L0: Content Traceability Pre-Check

| Story# | AC# | Data Anchor | 追溯结果 | 状态 |
|--------|-----|-------------|---------|------|
| F-1 | 1 | PRD §3.1 R-F-E2 | 14 条 behavior-weight 完整表（含 explore +0.3） | ✅ |
| F-1 | 2 | PRD §3.1 R-F-E2 | 同上，innate_cowardly explore -0.3 已列出 | ✅ |
| F-1 | 3 | PRD §3.2 F-F-01 公式 | 完整 4 层叠加公式含代码（Layer 2 乘法叠加） | ✅ |
| F-1 | 4 | PRD §3.2 F-F-01 | 公式含 `Math.max(0, ...)` 非负保底 | ✅ |
| F-1 | 5 | 脚本 Case #1 | SGE 阶段创建（Story F-5 AC2 规划） | ✅ (TBD) |
| F-2 | 1 | PRD §3.1 R-F-E3 | 关系标签→乘数表 3 行（friend→合作 ×1.2） | ✅ |
| F-2 | 2 | PRD §3.1 R-F-E3 | rival→竞争 ×1.3, meditate ×0.7 | ✅ |
| F-2 | 5 | 脚本 Case #2 | SGE 阶段创建（Story F-5 AC3 规划） | ✅ (TBD) |
| F-3 | 2 | PRD §3.1 R-F-E4 | 情绪×行为乘数表 11 行（anger→bounty ×1.4, meditate ×0.7） | ✅ |
| F-3 | 3 | PRD §3.1 R-F-E4 | fear→explore/bounty ×0.6, rest ×1.5 | ✅ |
| F-3 | 4 | PRD §3.2 F-F-02 | EMOTION_DECAY_TICKS=3，衰减公式含代码 | ✅ |
| F-3 | 5 | PRD §3.2 F-F-03 | recordEmotion 公式含 last-write-wins 规则 | ✅ |
| F-4 | 2 | PRD §3.4 | 持久化表：DiscipleEmotionState ❌ 不持久化 | ✅ |

**L0 结论**：13 个 Data Anchor 追溯成功，0 个 🔴。通过。

---

## L1：维度穷举审查

### R1 魔鬼PM 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 ROI | ✅ | 成本 S（~2 天），体验增量 5/5。ROI = 5/S ≈ **5.0**。这是核心差异化的最后一环 |
| D2 认知负担 | ✅ | 玩家无需学习新操作。效果体现在 MUD 日志中弟子行为差异（被动感知），零新概念 |
| D3 范围控制 | ✅ | IN: 4 个子功能（F1~F4）均在 Roadmap V3.1 Phase F 范围内。OUT: 无"顺便"附加。每个功能有对应 Story |
| D4 实施可读性 | ✅ | PRD 含完整公式代码（F-F-01~F-F-03），14 条特性效果完全枚举，3 条关系规则，11 条情绪规则。开发者可直接编码 |

### R2 资深玩家 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 30秒乐趣 | ✅ | 效果在第一次弟子行为决策时即生效。「胆魄如虹」弟子开局就会更频繁选 explore。30 秒内可感知 |
| D2 数字感知 | ✅ | Monte Carlo 要求 ≥15% 差异，足以让玩家长期观察中感知到「这弟子果然爱冒险」 |
| D3 操作动机 | ✅ | 系统完全被动，不需要玩家操作。但效果影响玩家的宗门管理策略（如安排「胆大」弟子去历练） |
| D4 挫败感管控 | ✅ | 无负面惩罚机制。特性/情绪/关系影响的是概率偏好，不是硬限制。弟子永远有选择自由 |

### R3 数值策划 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 漏斗平衡 | ✅ | F 不引入新资源。纯信息/状态流，不影响经济漏斗 |
| D2 极端模拟 | ✅ | 极端：弟子持有 2 个正向探索特性 + anger 情绪 + rival 同地。explore 权重最高可达 base × 1.3 × 1.3 × 1.2 = base × **2.03**。行为分布会强偏探索但不退化（其他行为仍有权重） |
| D3 公式验证 | ✅ | F-F-01 公式含完整 TypeScript 伪代码，所有参数有明确数值。衰减公式 F-F-02 参数完整 |
| D4 Sink完备 | ✅ | 不引入新资源，无需 Sink |
| D5 二阶效应 | ⚠️ | trait(×1.5) × emotion(×1.4) × rival(×1.3) 最大叠加 = **2.73** 倍。虽不至于退化，但 bounty 行为在极端情况下会显著偏高。建议监控但不阻塞 |
| D6 规格完整 | ✅ | 14 条 trait 效果 + 3 条关系规则 + 11 条情绪规则，全量枚举含具体数值 |
| D7 内容追溯 | ✅ | 13 个 Data Anchor 全部追溯通过（见 L0），PRD 内容展开为完整查找表 |

### R4 项目经理 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 范围蔓延 | ✅ | 4 个子任务严格对应 Roadmap V3.1 Phase F 定义的 F1~F4 |
| D2 工期评估 | ✅ | S×2 + M×1 + S×1 + M×1 ≈ 2~3 天。合理 |
| D3 依赖阻塞 | ✅ | 前置 Phase E + F0-α + F0-β 全部已完成。无外部依赖 |
| D4 路线图冲突 | ✅ | Phase F 完成后解锁 Phase G（AI 觉醒）。路线图对齐 |
| D5 交付验证 | ✅ | 全部 AC 可通过 Monte Carlo 脚本 + unit test 自动验证 |

### R5 偏执架构师 审查

| 维度 | 判定 | 说明 |
|------|:----:|------|
| D1 耦合度 | ✅ | 单向依赖链：behavior-tree → trait-registry（已有）+ encounter（已有）+ emotionMap（新增模块级 Map）。无循环 |
| D2 扩展性 | ✅ | 新增情绪效果只需在 EMOTION_BEHAVIOR_MODIFIERS 表添加一行。新增关系效果只需在关系乘数表添加一行。改 1 个文件 |
| D3 状态污染 | ✅ | emotionMap 是 Engine 层运行时 Map（类似 StorytellerState），不写入 GameState。不增加存档字段 |
| D4 性能预警 | ✅ | getEnhancedPersonalityWeights：遍历 traits(1~2) × effects(1~3) + relationships(56) × filter(by location) ≈ O(n²) 但 n=8 → 极小。远 < 1ms |
| D5 命名一致 | ⚠️ | `getEnhancedPersonalityWeights` 名称较长，但清晰表达了功能。建议考虑缩短为 `getWeights` 或 `getBehaviorWeights`，但不阻塞 |

---

## L2: CoVe 证据验证

### WARN（R3 D5 二阶效应）：极端叠加倍率 2.73

**验证问题**：
1. 极端叠加 2.73 是否会导致弟子 100% 选择 bounty？
2. 其他行为在极端情况下权重是否能保持有意义？

**独立回答**：
1. 假设弟子 personality.aggressive=0.8（高攻击性），基础 bounty 权重 = 0.8×3 + persistent×1 ≈ 3.4。极端叠加后 = 3.4 × 2.73 ≈ **9.3**。
2. 同时 meditate = persistent×3 + smart×1 ≈ 2.0（未被减弱时）。总权重 = 9.3 + 2.0 + ... ≈ 15+。bounty 占比 ≈ 9.3/15 = **62%**。这确实高，但：
   - 需要同时满足：特性(2个正向) + anger情绪 + rival同地——此概率本身极低
   - 62% ≠ 100%，其他行为仍有选择空间
   - 这种"愤怒的勇者遇到死对头"在叙事上反而合理

**判定**：维持 ⚠️ WARN。记入监控项，但不阻塞。

### WARN（R5 D5 命名）：函数名较长

**验证问题**：`getEnhancedPersonalityWeights` 是否与项目现有命名风格冲突？

**独立回答**：
- 现有函数：`getPersonalityWeights`（18 字符）、`decideEncounterResult`（22 字符）、`fallbackEvaluate`（17 字符）
- 新函数：`getEnhancedPersonalityWeights`（31 字符）确实偏长
- 但函数在 behavior-tree.ts 内部使用，不是公共 API

**判定**：降为 ✅。命名清晰，不影响可维护性。SGA 阶段可自行决定最终命名。

---

## 汇总

| # | 角色 | 维度 | 判定 | 说明 | CoVe 结果 |
|---|------|------|:----:|------|-----------| 
| 1~4 | R1 魔鬼PM | 全部 4 项 | ✅ | — | — |
| 5~8 | R2 资深玩家 | 全部 4 项 | ✅ | — | — |
| 9 | R3 数值策划 | D1~D4 | ✅ | — | — |
| 10 | R3 数值策划 | D5 二阶效应 | ⚠️ | 极端叠加 2.73 倍 | 维持 WARN — 叙事合理 + 概率极低 |
| 11~12 | R3 数值策划 | D6~D7 | ✅ | — | — |
| 13~17 | R4 项目经理 | 全部 5 项 | ✅ | — | — |
| 18~21 | R5 偏执架构师 | D1~D4 | ✅ | — | — |
| 22 | R5 偏执架构师 | D5 命名 | ✅ | CoVe 降级 — 清晰优先 | — |

### 最终判定

⚠️ **CONDITIONAL PASS** — 20 PASS / 1 WARN / 0 BLOCK

**WARN 处理**：
- R3-D5 极端叠加 2.73 → 记入监控项，SGE 阶段 Monte Carlo 验证后若 bounty 率 > 80% 则调低情绪乘数

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-30 | SPM Party Review: GATE 1 CONDITIONAL PASS（1 WARN，无 BLOCK） |
