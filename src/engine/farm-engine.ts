/**
 * 灵田引擎 — 种植/生长/收获
 *
 * 由 idle-engine tick 和 behavior-tree 驱动。
 *
 * CR-B1: 提取 harvestPlot 消除重复 (ARCH-2)
 * CR-B2: tryPlant 返回结构体消除 magic string (ARCH-3)
 * CR-B3: demand 参数化消除 RECIPE_TABLE 知识泄漏 (ARCH-4)
 *
 * @see Story #2 ACs, Fix 1/2/7
 */

import type { LiteDiscipleState, LiteGameState } from '../shared/types/game-state';
import { SEED_TABLE, SEED_BY_ID, type SeedDef } from '../shared/data/seed-table';
import { RECIPE_TABLE } from '../shared/data/recipe-table';
import { chooseSeedByNeed } from '../shared/formulas/alchemy-formulas';

/** 每弟子最大种植数 */
const MAX_PLOTS = 3;

/** tryPlant 结果 */
export type PlantResult =
  | { status: 'planted'; seedName: string }
  | { status: 'full' }
  | { status: 'no-stones' }
  | { status: 'no-seeds' };

/**
 * 获取弟子已解锁的种子列表
 */
function getUnlockedSeeds(d: Readonly<LiteDiscipleState>): SeedDef[] {
  return SEED_TABLE.filter(s =>
    d.realm > s.requiredRealm ||
    (d.realm === s.requiredRealm && d.subRealm >= s.requiredSubRealm)
  );
}

/**
 * 收获单块灵田（ARCH-2: 提取公共函数）
 *
 * @returns MUD 日志行，或 null（种子数据缺失）
 */
function harvestPlot(
  d: Readonly<LiteDiscipleState>,
  state: LiteGameState,
  seedId: string,
): string | null {
  const seed = SEED_BY_ID.get(seedId);
  if (!seed) return null;
  state.materialPouch[seedId] = (state.materialPouch[seedId] ?? 0) + seed.harvestYield;
  return `[${d.name}] 收获了${seed.name} ×${seed.harvestYield}`;
}

/**
 * FARM 行为开始 → 尝试种植 1 块
 *
 * CR-B2: 返回结构体而非字符串，避免 magic string 控制流
 */
export function tryPlant(
  d: LiteDiscipleState,
  state: LiteGameState,
): PlantResult {
  if (d.farmPlots.length >= MAX_PLOTS) {
    return { status: 'full' };
  }

  const unlocked = getUnlockedSeeds(d);
  const seed = chooseSeedByNeed(state.materialPouch, unlocked, RECIPE_TABLE);
  if (!seed) return { status: 'no-seeds' };

  if (state.spiritStones < seed.costStones) {
    return { status: 'no-stones' };
  }

  // 扣灵石，创建种植记录
  state.spiritStones -= seed.costStones;
  d.farmPlots.push({
    seedId: seed.id,
    growthTimeSec: seed.growthTimeSec,
    elapsedTicks: 0,
    mature: false,
  });

  return { status: 'planted', seedName: seed.name };
}

/**
 * 将 PlantResult 转为 MUD 日志
 */
export function plantResultToLog(d: Readonly<LiteDiscipleState>, result: PlantResult): string | null {
  switch (result.status) {
    case 'planted':   return `[${d.name}] 种下了${result.seedName}`;
    case 'full':      return `[${d.name}] 灵田已满，照看作物中`;
    case 'no-stones': return `[${d.name}] 灵石不足，无法购买种子`;
    case 'no-seeds':  return null;
  }
}

/**
 * 每 tick 推进灵田生长 + 中途收获 + 补种
 *
 * FARM 行为 ×2 加速（Fix 7: F-B1c）
 *
 * @returns MUD 日志行数组
 */
export function tickFarm(
  d: LiteDiscipleState,
  state: LiteGameState,
): string[] {
  const logs: string[] = [];
  const growthRate = d.behavior === 'farm' ? 2 : 1;

  // 推进生长
  for (const plot of d.farmPlots) {
    if (!plot.mature) {
      plot.elapsedTicks += growthRate;
      if (plot.elapsedTicks >= plot.growthTimeSec) {
        plot.mature = true;
      }
    }
  }

  // 如果处于 FARM 行为，中途收获成熟 + 补种
  if (d.behavior === 'farm') {
    const matured = d.farmPlots.filter(p => p.mature);
    for (const plot of matured) {
      const log = harvestPlot(d, state, plot.seedId);
      if (log) logs.push(log);
    }

    // 移除已收获的
    if (matured.length > 0) {
      d.farmPlots = d.farmPlots.filter(p => !p.mature);
    }

    // 补种空位（使用结构体控制流，无 magic string）
    while (d.farmPlots.length < MAX_PLOTS) {
      const result = tryPlant(d, state);
      if (result.status === 'planted') {
        const log = plantResultToLog(d, result);
        if (log) logs.push(log);
      } else {
        break; // full / no-stones / no-seeds → 停止补种
      }
    }
  }

  return logs;
}

/**
 * FARM 行为结束 → 收获所有已成熟作物（兜底）
 *
 * 注：tickFarm 可能已在本 tick 的 step 6.5 中收获过，
 * 此处仅收获 step 6.5 之后残留的成熟作物（防御性设计）。
 *
 * @returns MUD 日志行数组
 */
export function harvestAll(
  d: LiteDiscipleState,
  state: LiteGameState,
): string[] {
  const logs: string[] = [];
  const matured = d.farmPlots.filter(p => p.mature);

  for (const plot of matured) {
    const log = harvestPlot(d, state, plot.seedId);
    if (log) logs.push(log);
  }

  if (matured.length > 0) {
    d.farmPlots = d.farmPlots.filter(p => !p.mature);
  }

  return logs;
}
