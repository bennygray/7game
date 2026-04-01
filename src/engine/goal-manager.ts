/**
 * Phase J-Goal: 目标管理器
 *
 * 无状态服务类 — 状态存储在 GameState.goals 中，GoalManager 只提供操作方法。
 * 模式同 RelationshipMemoryManager（ADR-IJ-01）。
 *
 * @see phaseJ-goal-TDD.md S2.3
 * @see phaseJ-goal-PRD.md §3.3
 */

import type { PersonalGoal, GoalType } from '../shared/types/personal-goal';
import { MAX_ACTIVE_GOALS, GOAL_MULTIPLIER_CAP } from '../shared/types/personal-goal';
import type { LiteGameState } from '../shared/types/game-state';
import {
  GOAL_BEHAVIOR_MULTIPLIERS, GOAL_TTL, PERIODIC_GOALS, GOAL_SCAN_INTERVAL,
} from '../shared/data/goal-data';

/** 上一次定期扫描的 tick（模块级状态，随引擎生命周期） */
let lastScanTick = 0;

/**
 * 生成唯一目标 ID
 */
function generateGoalId(): string {
  return `goal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * GoalManager — 个人目标管理服务
 *
 * 职责：目标分配（含守卫）、移除、TTL 递减、完成检查、定期扫描、Layer 5 乘数合成。
 */
export class GoalManager {

  /**
   * 分配目标给弟子（含 G1/G2/G3 守卫）
   *
   * @returns 分配的目标，或 null（被守卫拒绝）
   */
  assignGoal(
    state: LiteGameState,
    discipleId: string,
    type: GoalType,
    target: Record<string, unknown>,
    currentTick: number,
    isEventDriven = false,
  ): PersonalGoal | null {
    const existing = this.getGoalsForDisciple(state, discipleId);

    // G2: 已有同类型目标 → reject
    if (existing.some(g => g.type === type)) {
      return null;
    }

    // G1: 槽位已满
    if (existing.length >= MAX_ACTIVE_GOALS) {
      // G3: 事件驱动可抢占定期目标
      if (isEventDriven) {
        const periodicGoals = existing.filter(g =>
          (PERIODIC_GOALS as readonly string[]).includes(g.type),
        );
        if (periodicGoals.length > 0) {
          // 淘汰 remainingTtl 最小的定期目标
          const victim = periodicGoals.reduce((min, g) =>
            g.remainingTtl < min.remainingTtl ? g : min,
          );
          this.removeGoal(state, victim.id);
        } else {
          return null; // 无可淘汰的定期目标
        }
      } else {
        return null;
      }
    }

    const ttl = GOAL_TTL[type];
    const goal: PersonalGoal = {
      id: generateGoalId(),
      discipleId,
      type,
      target,
      assignedAtTick: currentTick,
      ttl,
      remainingTtl: ttl,
      behaviorMultipliers: { ...GOAL_BEHAVIOR_MULTIPLIERS[type] },
    };

    state.goals.push(goal);
    return goal;
  }

  /**
   * 移除指定目标
   */
  removeGoal(state: LiteGameState, goalId: string): void {
    const idx = state.goals.findIndex(g => g.id === goalId);
    if (idx !== -1) {
      state.goals.splice(idx, 1);
    }
  }

  /**
   * 每 tick 递减所有目标的 remainingTtl
   *
   * @returns 已过期的目标列表（已从 state 中移除）
   */
  tickGoals(state: LiteGameState): PersonalGoal[] {
    const expired: PersonalGoal[] = [];

    for (let i = state.goals.length - 1; i >= 0; i--) {
      state.goals[i].remainingTtl--;
      if (state.goals[i].remainingTtl <= 0) {
        expired.push(state.goals[i]);
        state.goals.splice(i, 1);
      }
    }

    return expired;
  }

  /**
   * 检查完成条件，返回已完成的目标列表（已从 state 中移除）
   *
   * 完成条件（按目标类型）：
   * - breakthrough: 弟子 realm/subRealm 已超过 target 记录值
   * - revenge: 与 targetDiscipleId 的 affinity ≥ 0（怨念消解）
   * - friendship: targetDiscipleId 已有 'friend' 标签
   * - seclusion/ambition: 仅靠 TTL 过期完成（无主动完成条件）
   */
  checkCompletions(state: LiteGameState): PersonalGoal[] {
    const completed: PersonalGoal[] = [];

    for (let i = state.goals.length - 1; i >= 0; i--) {
      const goal = state.goals[i];
      let isComplete = false;

      switch (goal.type) {
        case 'breakthrough': {
          const disciple = state.disciples.find(d => d.id === goal.discipleId);
          if (!disciple) break;
          const targetRealm = goal.target['realmTarget'] as number;
          const targetSubRealm = goal.target['subRealmTarget'] as number;
          // 突破成功 = 已超过目标境界
          if (disciple.realm > targetRealm ||
              (disciple.realm === targetRealm && disciple.subRealm >= targetSubRealm)) {
            isComplete = true;
          }
          break;
        }
        case 'revenge': {
          const targetId = goal.target['targetDiscipleId'] as string | undefined;
          if (!targetId) break;
          const edge = state.relationships.find(
            r => r.sourceId === goal.discipleId && r.targetId === targetId,
          );
          // 怨念消解：affinity ≥ 0
          if (edge && edge.affinity >= 0) {
            isComplete = true;
          }
          break;
        }
        case 'friendship': {
          const targetId = goal.target['targetDiscipleId'] as string | undefined;
          if (!targetId) break;
          const edge = state.relationships.find(
            r => r.sourceId === goal.discipleId && r.targetId === targetId,
          );
          // 知己已结：有 friend 标签
          if (edge && edge.tags.includes('friend')) {
            isComplete = true;
          }
          break;
        }
        // seclusion/ambition: 无主动完成条件，靠 TTL 过期
        default:
          break;
      }

      if (isComplete) {
        completed.push(goal);
        state.goals.splice(i, 1);
      }
    }

    return completed;
  }

  /**
   * 定期扫描：基于性格分配 seclusion/ambition
   *
   * 每 GOAL_SCAN_INTERVAL ticks 执行一次。
   * 返回本次分配的目标列表。
   */
  periodicScan(state: LiteGameState, currentTick: number): PersonalGoal[] {
    if (currentTick - lastScanTick < GOAL_SCAN_INTERVAL) {
      return [];
    }
    lastScanTick = currentTick;

    const assigned: PersonalGoal[] = [];

    for (const disciple of state.disciples) {
      // seclusion: persistent ≥ 0.6 且无 breakthrough 目标
      if (disciple.personality.persistent >= 0.6) {
        const goals = this.getGoalsForDisciple(state, disciple.id);
        const hasBreakthrough = goals.some(g => g.type === 'breakthrough');
        if (!hasBreakthrough) {
          const goal = this.assignGoal(state, disciple.id, 'seclusion', {}, currentTick);
          if (goal) assigned.push(goal);
        }
      }

      // ambition: smart ≥ 0.6 或 aggressive ≥ 0.6
      if (disciple.personality.smart >= 0.6 || disciple.personality.aggressive >= 0.6) {
        const goal = this.assignGoal(state, disciple.id, 'ambition', {}, currentTick);
        if (goal) assigned.push(goal);
      }
    }

    return assigned;
  }

  /**
   * 获取指定弟子的活跃目标
   */
  getGoalsForDisciple(state: LiteGameState, discipleId: string): PersonalGoal[] {
    return state.goals.filter(g => g.discipleId === discipleId);
  }

  /**
   * 获取指定弟子的 Layer 5 合成乘数
   *
   * 无目标时返回空 Record（调用方视为全 ×1.0 语义）。
   * 多目标时取各乘数之积，clamp 到 [1/CAP, CAP] = [0.5, 2.0]。
   */
  getLayer5Multipliers(state: LiteGameState, discipleId: string): Record<string, number> {
    const goals = this.getGoalsForDisciple(state, discipleId);
    if (goals.length === 0) return {};

    const multipliers: Record<string, number> = {};
    const minClamp = 1 / GOAL_MULTIPLIER_CAP; // 0.5

    for (const goal of goals) {
      for (const [behavior, value] of Object.entries(goal.behaviorMultipliers)) {
        multipliers[behavior] = (multipliers[behavior] ?? 1.0) * value;
      }
    }

    // clamp 每个行为的合成乘数
    for (const behavior of Object.keys(multipliers)) {
      multipliers[behavior] = Math.max(minClamp, Math.min(GOAL_MULTIPLIER_CAP, multipliers[behavior]));
    }

    return multipliers;
  }

  /**
   * 重置扫描计时器（用于测试）
   */
  resetScanTimer(): void {
    lastScanTick = 0;
  }
}
