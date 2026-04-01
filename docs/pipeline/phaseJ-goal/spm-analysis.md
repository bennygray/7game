# Phase J-Goal — SPM 分析过程

> **日期**：2026-04-01
> **分析范围**：个人目标系统运行时（Roadmap J3+J4）

---

## 需求来源

- Roadmap Phase J — J3（个人目标系统）+ J4（目标驱动行为）
- Phase IJ v3.0 已交付类型桩：`src/shared/types/personal-goal.ts`
- Gap 分析 V3.4：① 数据层 "个人目标/欲望 🔶"

## 决策记录

| 决策 | 选项 | 结果 | USER 确认 |
|------|------|------|:---------:|
| 持久化策略 | A) 运行时 Map / **B) GameState v6** | B — 跨会话保持 | ✅ |
| 触发方式 | A) 事件驱动 / B) 定期扫描 / **C) 混合** | C — 事件驱动 + 定期扫描 | ✅ |
| Phase 命名 | 独立 Phase / **Phase J 子集** | Phase J-Goal（J3+J4 提取） | ✅ |

## 代码对账

10 项全部通过。关键发现：
- `getBreakthroughCost` 不存在 → 实际为 `getRealmAuraCost`（已修正 PRD）
- `auto-breakthrough` 事件不存在 → 实际为 `breakthrough-fail`（已修正 PRD）

## Gate 1 Review 结果

**CONDITIONAL PASS**（0 BLOCK / 8 WARN）

关键 WARN：
- W1/W6: 函数名/事件名引用错误 → **已修正**
- W2/W7: revenge 触发 Pipeline 时序 → 留给 TDD
- W3: 零玩家干预 → 记入需求债务
- W4: 5 层极端值 → TDD Monte Carlo
- W5: 路线图文档更新 → 编码前处理

## 产出物

| 产出物 | 路径 |
|--------|------|
| PRD | `docs/features/phaseJ-goal-PRD.md` v1.0 |
| User Stories | `docs/design/specs/phaseJ-goal-user-stories.md` |
| Gate 1 Review | `docs/pipeline/phaseJ-goal/review-g1.md` |
