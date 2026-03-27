/**
 * 境界公式 — 升级/突破计算
 *
 * 复用自 7waygame shared/formulas/realm-formulas.ts
 * lite 版：移除 GameState 类型依赖，使用独立参数
 */

import {
  LIANQI_BY_SUB,
  ZHUJI_BY_SUB,
  LIANQI_TO_ZHUJI_COST,
} from '../data/realm-table';

/**
 * 获取基础灵气速率（灵/秒）
 * 从预构建 Map O(1) 查找
 */
export function getBaseAuraRate(realm: number, subRealm: number): number {
  if (realm === 1) {
    return LIANQI_BY_SUB.get(subRealm)?.baseAuraRate ?? 1;
  }
  if (realm === 2) {
    return ZHUJI_BY_SUB.get(subRealm)?.baseAuraRate ?? 80;
  }
  return 80;
}

/**
 * 获取到达指定小层所需灵气消耗
 */
export function getRealmAuraCost(realm: number, subRealm: number): number {
  if (realm === 1) {
    return LIANQI_BY_SUB.get(subRealm)?.auraCost ?? Infinity;
  }
  if (realm === 2) {
    return ZHUJI_BY_SUB.get(subRealm)?.auraCost ?? Infinity;
  }
  return Infinity;
}

/** 获取当前大境界的最大小层数 */
export function getMaxSubRealm(realm: number): number {
  if (realm === 1) return 9;
  if (realm === 2) return 4;
  return 4;
}

/** 检查是否可以进行小境界突破 */
export function canBreakthrough(realm: number, subRealm: number, aura: number): boolean {
  const maxSub = getMaxSubRealm(realm);

  if (subRealm >= maxSub) {
    // 大境界突破条件
    if (realm === 1) {
      return aura >= LIANQI_TO_ZHUJI_COST;
    }
    return false; // 筑基圆满 = lite 终点
  }

  const nextCost = getRealmAuraCost(realm, subRealm + 1);
  return aura >= nextCost;
}

/** 突破结果 */
export interface BreakthroughResult {
  success: boolean;
  newRealm: number;
  newSubRealm: number;
  auraCost: number;
  newBaseAuraRate: number;
  /** true = 需要天劫（Phase B 实现） */
  requiresTribulation: boolean;
}

/**
 * 计算突破结果（纯函数，不修改 state）
 *
 * lite 版：炼气9层突破需天劫（AC4 阻断条件）
 */
export function calculateBreakthroughResult(
  realm: number, subRealm: number, aura: number
): BreakthroughResult {
  const maxSub = getMaxSubRealm(realm);

  if (subRealm >= maxSub) {
    if (realm === 1 && aura >= LIANQI_TO_ZHUJI_COST) {
      // 炼气→筑基：需要天劫
      return {
        success: false,
        newRealm: realm,
        newSubRealm: subRealm,
        auraCost: 0,
        newBaseAuraRate: getBaseAuraRate(realm, subRealm),
        requiresTribulation: true,
      };
    }
    return {
      success: false,
      newRealm: realm,
      newSubRealm: subRealm,
      auraCost: 0,
      newBaseAuraRate: getBaseAuraRate(realm, subRealm),
      requiresTribulation: false,
    };
  }

  // 小境界升级
  const nextSub = subRealm + 1;
  const cost = getRealmAuraCost(realm, nextSub);

  if (aura < cost) {
    return {
      success: false,
      newRealm: realm,
      newSubRealm: subRealm,
      auraCost: 0,
      newBaseAuraRate: getBaseAuraRate(realm, subRealm),
      requiresTribulation: false,
    };
  }

  return {
    success: true,
    newRealm: realm,
    newSubRealm: nextSub,
    auraCost: cost,
    newBaseAuraRate: getBaseAuraRate(realm, nextSub),
    requiresTribulation: false,
  };
}
