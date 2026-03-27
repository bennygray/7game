/**
 * 炼丹引擎 — 弟子独立丹炉
 *
 * 每弟子独立炼丹。每炉出 3 颗同品质丹药：
 *   成功 → 2 入 pills[]，1 上缴 (tributePills++)
 *   失败 → 3 废丹碎裂，回收灵气 (F-B7)
 *
 * CR-B4: startAlchemy 二次检查材料/灵石防竞态 (BUG-2/3)
 * CR-B5: qualityNames 提取为模块常量 (STYLE-3)
 *
 * @see Story #3 ACs, Fix 4/5/6
 */

import type { LiteDiscipleState, LiteGameState, AlchemyQuality } from '../shared/types/game-state';
import { RECIPE_TABLE, RECIPE_BY_ID } from '../shared/data/recipe-table';
import { rollQuality, chooseRecipeByNeed, hasEnoughMaterials } from '../shared/formulas/alchemy-formulas';

/** 品质中文名 (STYLE-3: 模块级常量) */
const QUALITY_NAMES: Readonly<Record<AlchemyQuality, string>> = {
  waste: '废品', low: '下品', mid: '中品', high: '上品', perfect: '极品',
};

/**
 * ALCHEMY 行为开始 → 选丹方、扣材料、设 currentRecipeId、覆盖 behaviorTimer
 *
 * @returns MUD 日志行
 */
export function startAlchemy(
  d: LiteDiscipleState,
  state: LiteGameState,
): string {
  // 如果已经在炼丹（上次未结算），不开新炉
  if (d.currentRecipeId !== null) {
    return `[${d.name}] 正在炼丹中，等待出炉`;
  }

  const recipe = chooseRecipeByNeed(
    state.pills, RECIPE_TABLE, state.materialPouch,
    state.spiritStones, state.comprehension,
  );

  if (!recipe) {
    return `[${d.name}] 炼丹材料不足，只好整理丹炉`;
  }

  // CR-B4: 二次检查材料+灵石（防多弟子同 tick 竞争）
  if (!hasEnoughMaterials(recipe, state.materialPouch, state.spiritStones)) {
    return `[${d.name}] 炼丹材料不足，只好整理丹炉`;
  }

  // 扣材料（此时已确认充足）
  for (const [matId, qty] of Object.entries(recipe.materials)) {
    state.materialPouch[matId] = (state.materialPouch[matId] ?? 0) - qty;
  }
  state.spiritStones -= recipe.costStones;

  // 设置弟子炼丹状态
  d.currentRecipeId = recipe.id;
  // 覆盖 behaviorTimer 为 craftTimeSec（单一时钟原则）
  d.behaviorTimer = recipe.craftTimeSec;

  return `[${d.name}] 开炉炼制${recipe.name}`;
}

/**
 * ALCHEMY 行为结束 → 掷骰结算
 *
 * @returns MUD 日志行数组
 */
export function settleAlchemy(
  d: LiteDiscipleState,
  state: LiteGameState,
): string[] {
  const logs: string[] = [];
  const recipeId = d.currentRecipeId;
  d.currentRecipeId = null;

  if (!recipeId) {
    // 没有实际炼丹（材料不足空转的情况）
    return logs;
  }

  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe) return logs;

  // 二段掷骰
  const quality: AlchemyQuality = rollQuality(recipe.baseSuccessRate);

  // 更新统计
  state.lifetimeStats.alchemyTotal++;

  if (quality === 'waste') {
    // 失败 → 3 废丹碎裂，回收灵气 (F-B7)
    const recoveredAura = recipe.costStones * 0.3 * 3;
    state.aura += recoveredAura;
    logs.push(`[${d.name}] 炼丹失败！废丹碎裂，回收灵气 +${recoveredAura}`);
  } else {
    // 成功 → 3 颗同品质丹药
    const qName = QUALITY_NAMES[quality];

    // 2 颗入 pills[]
    addPills(state, recipeId, quality, 2);
    // 1 颗上缴
    state.sect.tributePills++;

    logs.push(`[${d.name}] 炼成${recipe.name}(${qName}) ×3！上缴 1 颗，入库 2 颗`);

    if (quality === 'perfect') {
      state.lifetimeStats.alchemyPerfect++;
    }
  }

  return logs;
}

/**
 * 向丹药背包添加丹药（合并同类）
 */
function addPills(
  state: LiteGameState,
  defId: string,
  quality: AlchemyQuality,
  count: number,
): void {
  const existing = state.pills.find(p => p.defId === defId && p.quality === quality);
  if (existing) {
    existing.count += count;
  } else {
    state.pills.push({ defId, quality, count });
  }
}
