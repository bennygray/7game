/**
 * 高级关系标签判断函数 — Phase I-alpha
 *
 * 纯函数，无副作用。
 * 用于 soul-engine.updateRelationshipTags() 统一管理 mentor/grudge/admirer。
 *
 * @see phaseI-alpha-TDD.md S2.4
 * @see phaseI-alpha-PRD.md §5.3
 */

import type { RelationshipMemory } from '../types/relationship-memory';
import type { LiteDiscipleState } from '../types/game-state';
import { ADVANCED_TAG_THRESHOLDS } from '../types/soul';
import { getTraitDef } from '../data/trait-registry';

// ===== mentor 标签 =====

/**
 * mentor 标签是否应赋予
 * 条件：A→B closeness >= 80 AND trust >= 40 AND A.starRating >= B.starRating + 2
 */
export function shouldAssignMentor(
  closeness: number,
  trust: number,
  sourceStarRating: number,
  targetStarRating: number,
): boolean {
  const t = ADVANCED_TAG_THRESHOLDS.mentor;
  return closeness >= t.assignCloseness && trust >= t.assignTrust && sourceStarRating >= targetStarRating + t.starGap;
}

/**
 * mentor 标签是否应移除
 * 条件：A→B closeness < 60
 */
export function shouldRemoveMentor(closeness: number): boolean {
  return closeness < ADVANCED_TAG_THRESHOLDS.mentor.removeCloseness;
}

// ===== grudge 标签 =====

/**
 * grudge 标签是否应赋予
 * 条件：A→B closeness <= -40 AND trust <= -20 AND 负面事件(closenessDelta < 0) >= 3
 */
export function shouldAssignGrudge(
  closeness: number,
  trust: number,
  memory: RelationshipMemory | null | undefined,
): boolean {
  const t = ADVANCED_TAG_THRESHOLDS.grudge;
  if (closeness > t.assignCloseness) return false;
  if (trust > t.assignTrust) return false;
  if (!memory) return false;
  const negativeCount = memory.keyEvents.filter(e => e.closenessDelta < 0).length;
  return negativeCount >= t.negativeEventCount;
}

/**
 * grudge 标签是否应移除
 * 条件：A→B closeness > -20
 */
export function shouldRemoveGrudge(closeness: number): boolean {
  return closeness > ADVANCED_TAG_THRESHOLDS.grudge.removeCloseness;
}

// ===== admirer 标签 =====

/**
 * admirer 标签是否应赋予
 * 条件：A→B closeness >= 60 AND B 有正面特性 AND 正向事件 >= 3
 */
export function shouldAssignAdmirer(
  closeness: number,
  target: LiteDiscipleState,
  memory: RelationshipMemory | null | undefined,
): boolean {
  const t = ADVANCED_TAG_THRESHOLDS.admirer;
  if (closeness < t.assignCloseness) return false;

  // 检查 target 是否有至少 1 个 positive 特性
  const hasPositiveTrait = target.traits.some(tr => {
    const def = getTraitDef(tr.defId);
    return def?.polarity === 'positive';
  });
  if (!hasPositiveTrait) return false;

  // 检查正向事件计数
  if (!memory) return false;
  const positiveCount = memory.keyEvents.filter(e => e.closenessDelta > 0).length;
  return positiveCount >= t.positiveEventCount;
}

/**
 * admirer 标签是否应移除
 * 条件：A→B closeness < 40
 */
export function shouldRemoveAdmirer(closeness: number): boolean {
  return closeness < ADVANCED_TAG_THRESHOLDS.admirer.removeCloseness;
}
