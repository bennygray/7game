/**
 * 修炼公式 — 灵气/悟性/灵石产出
 *
 * 复用自 7waygame shared/formulas/idle-formulas.ts
 * lite 版：移除离线推演（关闭即暂停），使用独立参数
 *
 * @see AGENTS.md §八 数值一致性
 */

import { DAO_FOUNDATION_MULTIPLIER } from '../data/realm-table';
import { getBaseAuraRate } from './realm-formulas';

/**
 * 计算最终灵气产出率（灵/秒）
 *
 * 公式：基础速率 × 道基品质倍率
 */
export function calculateAuraRate(
  realm: number,
  subRealm: number,
  daoFoundation: number,
): number {
  const base = getBaseAuraRate(realm, subRealm);
  const daoMultiplier = DAO_FOUNDATION_MULTIPLIER[daoFoundation] ?? 1.0;
  return base * daoMultiplier;
}

/**
 * 计算悟性产出率（悟/秒）
 *
 * 公式：灵气速率 × 0.05
 */
export function calculateComprehensionRate(
  realm: number,
  subRealm: number,
  daoFoundation: number,
): number {
  return calculateAuraRate(realm, subRealm, daoFoundation) * 0.05;
}

/**
 * 计算灵石副产率（灵石碎片/秒）
 *
 * 公式：灵气速率 × 0.005
 */
export function calculateSpiritStoneRate(
  realm: number,
  subRealm: number,
  daoFoundation: number,
): number {
  return calculateAuraRate(realm, subRealm, daoFoundation) * 0.005;
}
