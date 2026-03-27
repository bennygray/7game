/**
 * 炼丹 + 灵田公式 — 纯函数，绝不修改 state
 *
 * 移植自 7waygame alchemy-formulas.ts，适配 lite 版：
 *   - 去除 proficiency / luckBonus
 *   - 新增 chooseSeedByNeed (F-B1b) / chooseRecipeByNeed
 *
 * @see 7game-lite-phaseB-analysis.md F-B2, F-B1b, Fix 2, Fix 5
 */

import type { AlchemyQuality, PillItem } from '../types/game-state';
import type { SeedDef } from '../data/seed-table';
import type { RecipeDef } from '../data/recipe-table';

// ===== 品质掷骰 =====

/**
 * 二段掷骰 — 先判成败，再判品质
 *
 * 品质分布（成功时）：
 *   极品: 3%, 上品: 14%, 中品: 30%, 下品: 53%
 *
 * @param successRate 成功率 (0~1)
 * @param rng 随机数生成器，默认 Math.random。测试时可注入。
 */
export function rollQuality(
  successRate: number,
  rng: () => number = Math.random,
): AlchemyQuality {
  // 第一轮：成败判定
  if (rng() > successRate) {
    return 'waste';
  }

  // 第二轮：品质判定
  const roll = rng();
  if (roll < 0.03) return 'perfect';   // 3%
  if (roll < 0.17) return 'high';      // 14%
  if (roll < 0.47) return 'mid';       // 30%
  return 'low';                         // 53%
}

// ===== 材料检查 =====

/**
 * 检查是否有足够材料 + 灵石炼丹
 */
export function hasEnoughMaterials(
  recipe: Readonly<RecipeDef>,
  materialPouch: Readonly<Record<string, number>>,
  spiritStones: number,
): boolean {
  if (spiritStones < recipe.costStones) return false;
  for (const [itemId, needed] of Object.entries(recipe.materials)) {
    if ((materialPouch[itemId] ?? 0) < needed) return false;
  }
  return true;
}

// ===== 按需选种 (F-B1b) =====

/**
 * 从已解锁种子中选择「缺口比最大」的种子
 *
 * 缺口比 = 需求量 / max(库存量, 1)
 * 需求量 = Σ(所有丹方中该灵草的消耗量)
 *
 * @returns 选中的种子，或 null（无可种种子）
 */
export function chooseSeedByNeed(
  materialPouch: Readonly<Record<string, number>>,
  unlockedSeeds: readonly SeedDef[],
  recipes: readonly RecipeDef[],
): SeedDef | null {
  if (unlockedSeeds.length === 0) return null;

  // 计算每种灵草的总需求量
  const demand: Record<string, number> = {};
  for (const r of recipes) {
    for (const [matId, qty] of Object.entries(r.materials)) {
      demand[matId] = (demand[matId] ?? 0) + qty;
    }
  }

  let bestSeed: SeedDef | null = null;
  let bestGapRatio = -1;

  for (const seed of unlockedSeeds) {
    const d = demand[seed.id] ?? 1; // 无需求时至少 1，保证可选
    const stock = materialPouch[seed.id] ?? 0;
    const gapRatio = d / Math.max(stock, 1);

    if (gapRatio > bestGapRatio) {
      bestGapRatio = gapRatio;
      bestSeed = seed;
    }
  }

  return bestSeed;
}

// ===== 按需选丹方 =====

/**
 * 从可炼丹方中选择「库存最少」的丹药类型
 *
 * 特殊：所有丹药库存相同时，选最低级的（省材料）
 *
 * @returns 选中的丹方，或 null（无可炼丹方）
 */
export function chooseRecipeByNeed(
  pills: readonly PillItem[],
  recipes: readonly RecipeDef[],
  materialPouch: Readonly<Record<string, number>>,
  spiritStones: number,
  comprehension: number,
): RecipeDef | null {
  // 过滤可炼的丹方（材料充足 + 悟性达标）
  const available = recipes.filter(r =>
    r.requiredComprehension <= comprehension &&
    hasEnoughMaterials(r, materialPouch, spiritStones)
  );

  if (available.length === 0) return null;

  // 计算每种丹方的库存总量
  const stockByRecipe: Record<string, number> = {};
  for (const r of available) {
    stockByRecipe[r.id] = 0;
  }
  for (const p of pills) {
    if (p.defId in stockByRecipe) {
      stockByRecipe[p.defId] += p.count;
    }
  }

  // 选库存最少的；相同时选序号靠前的（最低级）
  let bestRecipe = available[0];
  let minStock = stockByRecipe[available[0].id];

  for (let i = 1; i < available.length; i++) {
    const stock = stockByRecipe[available[i].id];
    if (stock < minStock) {
      minStock = stock;
      bestRecipe = available[i];
    }
  }

  return bestRecipe;
}
