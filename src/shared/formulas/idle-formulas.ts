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
 * Phase C 公式 F-C4：基础速率 × 道基倍率 × 灵脉密度 × 修速丹倍率
 *
 * auraDensity 和 boostMultiplier 仅影响灵气（Fix B），
 * calculateComprehensionRate / calculateSpiritStoneRate 不传这两个参数。
 */
export function calculateAuraRate(
  realm: number,
  subRealm: number,
  daoFoundation: number,
  auraDensity: number = 1.0,
  boostMultiplier: number = 1.0,
): number {
  const base = getBaseAuraRate(realm, subRealm);
  const daoMultiplier = DAO_FOUNDATION_MULTIPLIER[daoFoundation] ?? 1.0;
  return base * daoMultiplier * auraDensity * boostMultiplier;
}

/**
 * 计算悟性产出率（悟/秒）
 *
 * 公式：基础灵气速率(不含灵脉/修速丹) × 0.05
 * Fix B: 灵脉密度和修速丹不影响悟性
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
 * 公式：基础灵气速率(不含灵脉/修速丹) × 0.005
 * Fix B: 灵脉密度和修速丹不影响灵石
 */
export function calculateSpiritStoneRate(
  realm: number,
  subRealm: number,
  daoFoundation: number,
): number {
  return calculateAuraRate(realm, subRealm, daoFoundation) * 0.005;
}
