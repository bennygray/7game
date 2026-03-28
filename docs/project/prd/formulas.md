# 数值基线索引

> **来源**：MASTER-PRD 拆分 | **维护者**：/SPM (公式需求), /SGE (公式实现)
> **索引入口**：[MASTER-PRD.md](../MASTER-PRD.md) §6

---

## §1 公式文件清单

| # | 代码函数 | 路径 | 说明 | Analysis 公式编号 |
|---|---------|------|------|:-----------------:|
| F1 | `calculateAuraRate(realm, sub, dao, density, boost)` | `src/shared/formulas/idle-formulas.ts` | 最终灵气速率 | Phase A F1, Phase C F-C4 |
| F2 | `calculateComprehensionRate(realm, sub, dao)` | 同上 | 悟性速率 = aura×0.05 | — (F1 派生) |
| F3 | `calculateSpiritStoneRate(realm, sub, dao)` | 同上 | 灵石速率 = aura×0.005 | — (F1 派生) |
| F4 | `getBaseAuraRate(realm, sub)` | `src/shared/formulas/realm-formulas.ts` | 基础灵气速率（查表） | Phase A 基线 |
| F5 | `getRealmAuraCost(realm, sub)` | 同上 | 突破灵气门槛 | Phase A 基线 |
| F6 | `calculateBreakthroughResult(realm, sub, aura, bonus, rng)` | 同上 | 概率突破判定 | Phase B F-B4, Phase C F-C1a |
| F7 | `getBreakthroughBaseRate(realm, sub)` | 同上 | 突破基础成功率 | Phase C F-C1 |
| F8 | `rollQuality(successRate, rng)` | `src/shared/formulas/alchemy-formulas.ts` | 二段掷骰（成败+品质） | Phase B F-B2 |
| F9 | `hasEnoughMaterials(recipe, pouch, stones)` | 同上 | 材料充足检查 | — (工具函数) |
| F10 | `chooseSeedByNeed(pouch, seeds, recipes)` | 同上 | 按需选种（缺口比） | Phase B F-B1b |
| F11 | `chooseRecipeByNeed(pills, recipes, pouch, stones, comp)` | 同上 | 按需选丹方 | Phase B Fix 5 |
| F12 | `getRealmDisplayName(realm, sub)` | `src/shared/formulas/realm-display.ts` | 境界中文名 | — (显示函数) |
| F13 | `getSpiritVeinDensity(realm, sub)` | `src/shared/data/realm-table.ts` | 灵脉密度倍率 | Phase B F-B5, Phase C F-C3 |

---

## §2 数据表文件清单

| # | 文件 | 路径 | 内容 | 关联 Analysis 公式 |
|---|------|------|------|:-----------------:|
| D1 | realm-table.ts | `src/shared/data/realm-table.ts` | 炼气9层+筑基4阶+道基倍率+突破成功率+灵脉密度 | F-B5/F-C3(灵脉), F-C1(突破率) |
| D2 | recipe-table.ts | `src/shared/data/recipe-table.ts` | 3丹方定义+品质倍率+18个策略常量 | F-B3(品质倍率) |
| D3 | seed-table.ts | `src/shared/data/seed-table.ts` | 3种种子定义（清心草/碧灵果/破境草） | F-B1(产出率) |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-PRD.md §6 拆出，独立文件 |
