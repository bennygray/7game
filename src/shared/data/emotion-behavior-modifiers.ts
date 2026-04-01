/**
 * 情绪→行为权重乘数 + 关系标签→行为权重乘数
 *
 * Phase F: 灵魂闭环 — 行为权重调节数据表
 *
 * @see phaseF-PRD.md §3.1 R-F-E3, R-F-E4
 * @see phaseF-TDD.md Step 2.2, 2.3
 */

import type { EmotionTag } from '../types/soul';
import type { DiscipleBehavior } from '../types/game-state';

// ===== 情绪 → 行为权重乘数 =====

/**
 * 情绪 → 行为权重乘数映射表
 *
 * 未声明的情绪×行为组合隐含 ×1.0
 * @see phaseF-PRD.md §3.1 R-F-E4
 */
export const EMOTION_BEHAVIOR_MODIFIERS: Partial<
  Record<EmotionTag, Partial<Record<DiscipleBehavior, number>>>
> = {
  joy:        { explore: 1.2, bounty: 1.2 },
  anger:      { bounty: 1.4, meditate: 0.7 },
  sadness:    { meditate: 1.3, explore: 0.7 },
  fear:       { explore: 0.6, bounty: 0.6, rest: 1.5 },
  pride:      { explore: 1.2, bounty: 1.2 },
  envy:       { alchemy: 1.2, meditate: 1.2 },
  contempt:   { farm: 0.7 },
  admiration: { meditate: 1.3 },
  // neutral, gratitude, guilt, worry, shame, jealousy, relief → 隐含 ×1.0
};

// ===== 关系标签 → 行为权重乘数 =====

/**
 * friend 在同地点时合作行为乘数
 * @see phaseF-PRD.md §3.1 R-F-E3
 */
export const FRIEND_COOPERATIVE_MULTIPLIER = 1.2;

/**
 * rival 在同地点时竞争行为乘数
 * @see phaseF-PRD.md §3.1 R-F-E3
 */
export const RIVAL_COMPETITIVE_MULTIPLIER = 1.3;

/**
 * rival 在同地点时修炼行为乘数（心神不宁）
 * @see phaseF-PRD.md §3.1 R-F-E3
 */
export const RIVAL_MEDITATION_MULTIPLIER = 0.7;

/**
 * mentor 在同地点时被辅导方修炼行为乘数
 * @see phaseI-alpha-PRD.md §5.5
 */
export const MENTOR_MEDITATE_MULTIPLIER = 1.2;

/** "合作行为"集合 — friend 在同地时增强 */
export const COOPERATIVE_BEHAVIORS: readonly DiscipleBehavior[] = ['meditate', 'alchemy', 'farm'];

/** "竞争行为"集合 — rival 在同地时增强 */
export const COMPETITIVE_BEHAVIORS: readonly DiscipleBehavior[] = ['explore', 'bounty'];

// ===== 情绪衰减常量 =====

/**
 * 情绪衰减 tick 计数
 * 每次 soul-tick 计数器 +1，到此值时 intensity -1
 * 3 次 soul-tick ≈ 15 分钟（soul-tick 每 5 分钟一次 DECAY_INTERVAL_SEC=300）
 *
 * @see phaseF-PRD.md §3.1 R-F-E6
 */
export const EMOTION_DECAY_TICKS = 3;
