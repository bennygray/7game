/**
 * Phase IJ v3.0: 个人目标类型定义（仅设计，零实现代码）
 *
 * R-G01/R-G02: 目标类型和行为偏移
 */

/** R-G01: 目标类型 */
export type GoalType =
  | 'breakthrough'
  | 'revenge'
  | 'seclusion'
  | 'friendship'
  | 'ambition';

/** R-G01: 个人目标实例（v2 — Phase J-Goal 扩展） */
export interface PersonalGoal {
  id: string;
  /** 归属弟子 ID */
  discipleId: string;
  type: GoalType;
  /** 目标参数（目标弟子 ID / 境界等级等） */
  target: Record<string, unknown>;
  /** 分配时的 tick */
  assignedAtTick: number;
  /** TTL（ticks），不变量 I3 强制 TTL */
  ttl: number;
  /** 剩余 TTL（每 tick 递减），初始值 = ttl */
  remainingTtl: number;
  /** R-G02: 行为偏移乘数（Layer 5，cap ×2.0） */
  behaviorMultipliers: Record<string, number>;
}

/** R-G02: 最大同时活跃目标数 */
export const MAX_ACTIVE_GOALS = 2;

/** R-G02: 行为乘数上限 */
export const GOAL_MULTIPLIER_CAP = 2.0;
