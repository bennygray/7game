# Phase I-alpha SPM 分析过程

> **日期**：2026-04-01 | **角色**：/SPM

---

## 分析摘要

- **Phase**：I-alpha（因果引擎 + 高级关系标签）
- **定位**：Phase I 深度世界的基础设施子阶段
- **核心价值**：让弟子行为有因果——关系/道德/立场驱动事件产生
- **scope**：6 条因果规则 + 3 个高级标签（mentor/grudge/admirer）+ 新 tick handler

## 代码对账清单

| 引用 | 文件 | 状态 |
|------|------|:----:|
| CausalTriggerType (6 种) | `src/shared/types/causal-event.ts` L8-14 | ✅ 存在 |
| CausalRule interface | `src/shared/types/causal-event.ts` L17-31 | ✅ 存在 |
| CausalCooldownState | `src/shared/types/causal-event.ts` L34-38 | ✅ 存在 |
| RelationshipTag (含 mentor/admirer/grudge) | `src/shared/types/soul.ts` L173 | ✅ 5 种均已定义 |
| RELATIONSHIP_TAG_THRESHOLDS (friend/rival) | `src/shared/types/soul.ts` L176-179 | ✅ 存在 |
| SoulEventType (11 种) | `src/shared/types/soul.ts` L90-101 | ✅ 待扩展 +6 |
| SOUL_EVENT_POLARITY | `src/shared/types/soul.ts` L112-126 | ✅ 待扩展 |
| EventSeverity (5 级) | `src/shared/types/world-event.ts` L22-32 | ✅ 存在 |
| getDiscipleLocation() | `src/shared/types/encounter.ts` L73 | ✅ 存在 |
| RelationshipEdge.tags[] | `src/shared/types/game-state.ts` L170 | ✅ 持久化 |
| RelationshipEdge.affinity | `src/shared/types/game-state.ts` L168 | ✅ 存在 |
| LiteDiscipleState.moral.goodEvil | `src/shared/types/game-state.ts` L156 | ✅ 存在 |
| LiteDiscipleState.starRating | `src/shared/types/game-state.ts` L124 | ✅ 存在 |
| LiteDiscipleState.personality.aggressive | `src/shared/types/game-state.ts` L107 | ✅ 存在 |
| state.sect.ethos | `src/shared/types/game-state.ts` L190 | ✅ 存在 |
| state.spiritStones | `src/shared/types/game-state.ts` L239 | ✅ 存在 |
| updateRelationshipTags() | `src/engine/soul-engine.ts` L199 | ✅ 现有仅管理 friend/rival |
| RelationshipMemory.keyEvents | `src/shared/types/relationship-memory.ts` | ✅ 存在 |
| RelationshipMemory.encounterCount | `src/shared/types/relationship-memory.ts` L31 | ✅ 存在 |
| GoalManager | `src/engine/goal-manager.ts` | ✅ 存在 |
| TraitDef.polarity | `src/shared/types/soul.ts` L60 | ✅ 'positive'/'negative'/'neutral' |

**未解决项**：无。全部字段已确认存在。

## 规格深度自检

| C# | 状态 | 证据 |
|----|:----:|------|
| C1 | ✅ | PRD §4.1 (5 实体) + §4.2 (6 新 SoulEventType) |
| C2 | ✅ | PRD §5.1 C1-C6 (6 规则完整参数表) |
| C3 | ✅ | PRD §5.2 冷却公式 + §5.1 各规则 cooldownTicks |
| C4 | ✅ | PRD §5.4 标签阈值汇总表 (5 标签) |
| C5 | ✅ | PRD §5.7 T-C1~C6 (18 条 MUD 模板) |
| C6 | ✅ | PRD §5.5 标签效果表 + §5.6 情绪候选池映射 |

## 需求债务处置

- FB-010（行为结算断层）：🔶 部分清偿
- FB-007/FB-008：不直接清偿，提供数据基础

## 产出物

| 文件 | 状态 |
|------|:----:|
| `docs/features/phaseI-alpha-PRD.md` | ✅ v1.0 |
| `docs/design/specs/phaseI-alpha-user-stories.md` | ✅ v1.0 (6 Stories) |
| `docs/pipeline/phaseI-alpha/spm-analysis.md` | ✅ 本文件 |
