/**
 * 境界公式 — 升级/突破计算
 *
 * Phase C: BreakthroughResult 重设计（Fix A）
 *   - canAttempt + blockReason 替代旧 requiresTribulation
 *   - 新增概率模型 successRate / failurePenalty
 *
 * @see 7game-lite-phaseC-analysis.md Fix A
 */

import {
  LIANQI_BY_SUB,
  ZHUJI_BY_SUB,
  BREAKTHROUGH_BY_KEY,
} from '../data/realm-table';
import {
  BREAKTHROUGH_FAILURE_PENALTY_RATIO,
  BREAKTHROUGH_SUCCESS_CAP,
} from '../data/recipe-table';

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

// ===== Phase C: 概率突破模型 =====

/** 突破阻断原因 */
export type BreakthroughBlockReason =
  | 'tribulation-required'   // 需天劫（炼气9→筑基）
  | 'max-realm'             // 已达当前版本上限
  | 'aura-insufficient';    // 灵气不足

/** 突破结果（Fix A 重设计） */
export interface BreakthroughResult {
  /** 是否可以尝试突破 */
  canAttempt: boolean;
  /** 不可突破时的原因 */
  blockReason: BreakthroughBlockReason | null;
  /** 成功概率 0~1（含丹药加成后） */
  successRate: number;
  /** 掷骰结果：成功/失败（仅 canAttempt=true 时有意义） */
  success: boolean;
  /** 突破灵气门槛 */
  auraCost: number;
  /** 失败惩罚 = auraCost × 0.5 */
  failurePenalty: number;
  /** 目标大境界 */
  newRealm: number;
  /** 目标小层 */
  newSubRealm: number;
  /** 新境界基础灵气速率 */
  newBaseAuraRate: number;
}

/**
 * 获取当前突破的基础成功率
 *
 * @returns 基础率 0~1，或 -1（不可突破）
 */
export function getBreakthroughBaseRate(realm: number, subRealm: number): number {
  const entry = BREAKTHROUGH_BY_KEY.get(`${realm}-${subRealm}`);
  if (!entry) return -1;
  return entry.baseRate;
}

/**
 * 计算突破结果（纯函数，不修改 state）
 *
 * Phase C 概率模型：
 *   成功率 = min(基础率 + breakthroughBonus, 0.99)
 *   失败惩罚 = auraCost × 0.5
 *
 * @param breakthroughBonus 破镜丹 buff 总加成
 * @param rng 随机数生成器（可注入测试）
 */
export function calculateBreakthroughResult(
  realm: number,
  subRealm: number,
  aura: number,
  breakthroughBonus: number = 0,
  rng: () => number = Math.random,
): BreakthroughResult {
  const maxSub = getMaxSubRealm(realm);
  const baseRate = getBreakthroughBaseRate(realm, subRealm);

  // 不可突破：已达上限或需天劫
  if (baseRate < 0) {
    // 区分原因
    let blockReason: BreakthroughBlockReason;
    if (realm === 1 && subRealm >= maxSub) {
      blockReason = 'tribulation-required';
    } else {
      blockReason = 'max-realm';
    }

    return {
      canAttempt: false,
      blockReason,
      successRate: 0,
      success: false,
      auraCost: 0,
      failurePenalty: 0,
      newRealm: realm,
      newSubRealm: subRealm,
      newBaseAuraRate: getBaseAuraRate(realm, subRealm),
    };
  }

  // 计算灵气门槛
  const nextSub = subRealm + 1;
  const cost = getRealmAuraCost(realm, nextSub);

  // 灵气不足
  if (aura < cost) {
    return {
      canAttempt: false,
      blockReason: 'aura-insufficient',
      successRate: 0,
      success: false,
      auraCost: cost,
      failurePenalty: 0,
      newRealm: realm,
      newSubRealm: subRealm,
      newBaseAuraRate: getBaseAuraRate(realm, subRealm),
    };
  }

  // 可以尝试 — 概率判定
  const successRate = Math.min(baseRate + breakthroughBonus, BREAKTHROUGH_SUCCESS_CAP);
  const roll = rng();
  const success = roll < successRate;
  const failurePenalty = cost * BREAKTHROUGH_FAILURE_PENALTY_RATIO;

  return {
    canAttempt: true,
    blockReason: null,
    successRate,
    success,
    auraCost: cost,
    failurePenalty,
    newRealm: realm,
    newSubRealm: success ? nextSub : subRealm,
    newBaseAuraRate: success
      ? getBaseAuraRate(realm, nextSub)
      : getBaseAuraRate(realm, subRealm),
  };
}

/**
 * 检查是否可以进行突破（简易版，用于 UI 显示）
 */
export function canBreakthrough(
  realm: number,
  subRealm: number,
  aura: number,
  breakthroughBonus: number = 0,
): boolean {
  const result = calculateBreakthroughResult(realm, subRealm, aura, breakthroughBonus, () => 0);
  return result.canAttempt;
}
