/**
 * 丹药消费引擎 — 自动服丹逻辑
 *
 * 3种丹药自动消费：
 *   1. 修速丹：无buff时自动服用，新覆盖旧
 *   2. 破镜丹：基础成功率≤85%时自动服用，最多3颗（Fix C）
 *   3. 回灵丹：仅突破前补差额时自动使用
 *
 * CR-B1: consumeOnePill 品质排序含 waste 兜底
 * CR-P2: 使用 PILL_ID 常量替代 magic string
 * CR-P3: 使用集中管理的数值常量
 *
 * @see 7game-lite-phaseC-analysis.md §3.2 + Fix C/D
 * @see Story #3
 */

import type { LiteGameState, PillItem, AlchemyQuality } from '../shared/types/game-state';
import {
  QUALITY_MULTIPLIER,
  RECIPE_BY_ID,
  PILL_ID,
  HEAL_PILL_BASE_AMOUNT,
  BOOST_PILL_BASE_DURATION_SEC,
  BOOST_PILL_AURA_MULTIPLIER,
  BREAKTHROUGH_PILL_BONUS_PER,
  BREAKTHROUGH_PILL_MAX_COUNT,
  BREAKTHROUGH_PILL_AUTO_THRESHOLD,
} from '../shared/data/recipe-table';
import { getBreakthroughBaseRate } from '../shared/formulas/realm-formulas';

/** 服丹日志 */
export interface PillConsumeLog {
  type: 'cultivate-boost' | 'breakthrough-aid' | 'heal';
  pillName: string;
  quality: AlchemyQuality;
  detail: string;
}

// ===== 品质排序 (CR-B1: 含 waste 兜底) =====

/** 品质从低到高排序顺序，waste 排最前（防御性：正常不应出现，但排序不会崩） */
const QUALITY_SORT_ORDER: readonly AlchemyQuality[] = ['waste', 'low', 'mid', 'high', 'perfect'];

/**
 * 从 pills 背包中消费指定丹药 1 颗（优先最低品质）
 *
 * CR-B1: 排序表包含 waste，防止 indexOf 返回 -1 导致排序不可预测
 *
 * @returns 消费的品质，或 null（无库存）
 */
function consumeOnePill(
  pills: PillItem[],
  defId: string,
  preferLowest: boolean = true,
): AlchemyQuality | null {
  // 找到所有匹配的 PillItem（过滤 waste: 正常不应有 waste 入库，但防御性跳过）
  const candidates = pills.filter(p => p.defId === defId && p.count > 0 && p.quality !== 'waste');
  if (candidates.length === 0) return null;

  // 品质排序（CR-B1: 使用完整排序表）
  if (preferLowest) {
    candidates.sort((a, b) => QUALITY_SORT_ORDER.indexOf(a.quality) - QUALITY_SORT_ORDER.indexOf(b.quality));
  } else {
    candidates.sort((a, b) => QUALITY_SORT_ORDER.indexOf(b.quality) - QUALITY_SORT_ORDER.indexOf(a.quality));
  }

  const target = candidates[0];
  target.count -= 1;

  // 清理空堆叠
  if (target.count <= 0) {
    const idx = pills.indexOf(target);
    if (idx >= 0) pills.splice(idx, 1);
  }

  return target.quality;
}

/**
 * 自动服修速丹 tick
 *
 * 条件：无 buff 且有库存 → 自动服用
 * 覆盖：有 buff 时不主动覆盖（USER 确认 Fix D）
 */
export function tickCultivateBoost(state: LiteGameState): PillConsumeLog | null {
  // 有 buff 时跳过
  if (state.cultivateBoostBuff !== null) return null;

  const quality = consumeOnePill(state.pills, PILL_ID.BOOST, true);
  if (!quality) return null;

  const qMul = QUALITY_MULTIPLIER[quality];
  const duration = BOOST_PILL_BASE_DURATION_SEC * qMul;
  const recipeName = RECIPE_BY_ID.get(PILL_ID.BOOST)?.name ?? '修速丹';

  state.cultivateBoostBuff = {
    qualityMultiplier: qMul,
    remainingSec: duration,
  };
  state.lifetimeStats.pillsConsumed++;

  return {
    type: 'cultivate-boost',
    pillName: recipeName,
    quality,
    detail: `自动服用${recipeName}(${qualityLabel(quality)})，修炼加速 ${duration.toFixed(0)} 秒`,
  };
}

/**
 * 自动服破镜丹 tick
 *
 * 条件：基础成功率 ≤ BREAKTHROUGH_PILL_AUTO_THRESHOLD 且 已服用 < MAX 颗 且 有库存（Fix C）
 */
export function tickBreakthroughAid(state: LiteGameState): PillConsumeLog | null {
  // 已满
  if (state.breakthroughBuff.pillsConsumed.length >= BREAKTHROUGH_PILL_MAX_COUNT) return null;

  // 检查基础成功率
  const baseRate = getBreakthroughBaseRate(state.realm, state.subRealm);
  if (baseRate < 0 || baseRate > BREAKTHROUGH_PILL_AUTO_THRESHOLD) return null;

  const quality = consumeOnePill(state.pills, PILL_ID.BREAKTHROUGH, true);
  if (!quality) return null;

  const qMul = QUALITY_MULTIPLIER[quality];
  const bonus = BREAKTHROUGH_PILL_BONUS_PER * qMul;
  const recipeName = RECIPE_BY_ID.get(PILL_ID.BREAKTHROUGH)?.name ?? '破镜丹';

  state.breakthroughBuff.pillsConsumed.push(quality);
  state.breakthroughBuff.totalBonus += bonus;
  state.lifetimeStats.pillsConsumed++;

  return {
    type: 'breakthrough-aid',
    pillName: recipeName,
    quality,
    detail: `自动服用${recipeName}(${qualityLabel(quality)})，突破加成 →${(state.breakthroughBuff.totalBonus * 100).toFixed(0)}%`,
  };
}

/**
 * 突破前自动服回灵丹补差额
 *
 * @param auraCost 突破灵气门槛
 * @returns 日志列表（可能消费多颗）
 */
export function consumeHealPillsForBreakthrough(
  state: LiteGameState,
  auraCost: number,
): PillConsumeLog[] {
  const logs: PillConsumeLog[] = [];
  const recipeName = RECIPE_BY_ID.get(PILL_ID.HEAL)?.name ?? '回灵丹';

  while (state.aura < auraCost) {
    const quality = consumeOnePill(state.pills, PILL_ID.HEAL, true);
    if (!quality) break;  // 没药了

    const qMul = QUALITY_MULTIPLIER[quality];
    const heal = HEAL_PILL_BASE_AMOUNT * qMul;
    state.aura += heal;
    state.lifetimeStats.pillsConsumed++;

    logs.push({
      type: 'heal',
      pillName: recipeName,
      quality,
      detail: `自动服用${recipeName}(${qualityLabel(quality)})，灵气 +${heal.toFixed(0)}`,
    });
  }

  return logs;
}

/** 修速丹 buff 倒计时 tick */
export function tickBoostCountdown(state: LiteGameState, deltaS: number): string | null {
  if (!state.cultivateBoostBuff) return null;

  state.cultivateBoostBuff.remainingSec -= deltaS;

  if (state.cultivateBoostBuff.remainingSec <= 0) {
    state.cultivateBoostBuff = null;
    return '[系统] 修速丹效果消散';
  }

  return null;
}

/** 获取修速丹倍率（无buff返回1.0） */
export function getBoostMultiplier(state: LiteGameState): number {
  if (!state.cultivateBoostBuff) return 1.0;
  return BOOST_PILL_AURA_MULTIPLIER;
}

// ===== 工具函数 =====

function qualityLabel(q: AlchemyQuality): string {
  const labels: Record<AlchemyQuality, string> = {
    waste: '废品', low: '下品', mid: '中品', high: '上品', perfect: '极品',
  };
  return labels[q];
}
