/**
 * 弟子行为树 — 性格权重决策系统
 *
 * 纯函数设计，无副作用。由 IdleEngine.tick() 驱动。
 *
 * @see Story #4 ACs
 */

import type { LiteDiscipleState, PersonalityTraits, DiscipleBehavior } from '../shared/types/game-state';
import { DiscipleBehavior as DB } from '../shared/types/game-state';

// ===== 行为配置 =====

/** 行为持续时间范围（秒） */
const BEHAVIOR_DURATION: Record<string, [min: number, max: number]> = {
  [DB.MEDITATE]: [15, 30],
  [DB.EXPLORE]:  [20, 40],
  [DB.REST]:     [10, 20],
  [DB.ALCHEMY]:  [25, 45],
  [DB.FARM]:     [20, 35],
  [DB.BOUNTY]:   [30, 60],
};

/** 行为基础灵气奖励（结束时获得） */
const BEHAVIOR_BASE_AURA: Record<string, number> = {
  [DB.MEDITATE]: 5,
  [DB.EXPLORE]:  3,
  [DB.REST]:     0,
  [DB.ALCHEMY]:  4,
  [DB.FARM]:     2,
  [DB.BOUNTY]:   8,
};

/** 行为中文标签 */
const BEHAVIOR_LABELS: Record<string, string> = {
  [DB.IDLE]:     '发呆',
  [DB.MEDITATE]: '打坐修炼',
  [DB.EXPLORE]:  '外出历练',
  [DB.REST]:     '休息',
  [DB.ALCHEMY]:  '炼丹',
  [DB.FARM]:     '照料灵田',
  [DB.BOUNTY]:   '执行悬赏',
};

/** REST 每秒恢复体力 */
const REST_STAMINA_PER_SEC = 2;

/** 非 REST 行为每秒消耗体力 */
const ACTIVE_STAMINA_DRAIN = 0.3;

// ===== 权重计算 =====

/**
 * 根据五维性格和体力生成 7 行为权重向量
 *
 * 权重映射：
 *  MEDITATE: persistent×3 + smart×1
 *  EXPLORE:  aggressive×2 + smart×1
 *  REST:     lazy×3 + (1 - stamina/100)×2
 *  ALCHEMY:  smart×2 + persistent×1
 *  FARM:     kind×2 + persistent×1
 *  BOUNTY:   aggressive×3 + persistent×1
 *  IDLE:     lazy×1 (兜底)
 */
export function getPersonalityWeights(
  p: PersonalityTraits,
  stamina: number,
): { behavior: DiscipleBehavior; weight: number }[] {
  const fatigue = 1 - Math.max(0, Math.min(100, stamina)) / 100;

  return [
    { behavior: DB.MEDITATE, weight: p.persistent * 3 + p.smart * 1 },
    { behavior: DB.EXPLORE,  weight: p.aggressive * 2 + p.smart * 1 },
    { behavior: DB.REST,     weight: p.lazy * 3 + fatigue * 2 },
    { behavior: DB.ALCHEMY,  weight: p.smart * 2 + p.persistent * 1 },
    { behavior: DB.FARM,     weight: p.kind * 2 + p.persistent * 1 },
    { behavior: DB.BOUNTY,   weight: p.aggressive * 3 + p.persistent * 1 },
    { behavior: DB.IDLE,     weight: p.lazy * 1 },
  ];
}

/**
 * 加权随机选择行为
 */
export function weightedRandomPick(
  weights: { behavior: DiscipleBehavior; weight: number }[],
): DiscipleBehavior {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight <= 0) return DB.IDLE;

  let roll = Math.random() * totalWeight;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) return w.behavior;
  }
  return DB.IDLE;
}

/**
 * 获取行为持续时间（随机区间内）
 */
export function getBehaviorDuration(behavior: DiscipleBehavior): number {
  const range = BEHAVIOR_DURATION[behavior];
  if (!range) return 0;
  return range[0] + Math.random() * (range[1] - range[0]);
}

/**
 * 获取行为结束灵气奖励
 */
export function getBehaviorAuraReward(behavior: DiscipleBehavior, starRating: number): number {
  const base = BEHAVIOR_BASE_AURA[behavior] ?? 0;
  // 星级越高，奖励越多：1★ ×1, 3★ ×1.5, 5★ ×2
  return base * (1 + (starRating - 1) * 0.25);
}

/**
 * 获取行为中文标签
 */
export function getBehaviorLabel(behavior: DiscipleBehavior): string {
  return BEHAVIOR_LABELS[behavior] ?? '未知';
}

// ===== 弟子 Tick =====

/** 弟子行为变更事件 */
export interface DiscipleBehaviorEvent {
  disciple: LiteDiscipleState;
  oldBehavior: DiscipleBehavior;
  newBehavior: DiscipleBehavior;
  /** 行为结束时获得的灵气（仅 oldBehavior 结束时有值） */
  auraReward: number;
}

/**
 * 单弟子 tick 处理
 *
 * @returns 行为变更事件数组（可能为空、1 条结束事件 + 1 条开始事件）
 */
export function tickDisciple(d: LiteDiscipleState, deltaS: number): DiscipleBehaviorEvent[] {
  const events: DiscipleBehaviorEvent[] = [];

  if (d.behavior !== DB.IDLE && d.behavior !== DB.REST) {
    // 非休息/发呆行为消耗体力
    d.stamina = Math.max(0, d.stamina - ACTIVE_STAMINA_DRAIN * deltaS);
  }

  if (d.behavior === DB.REST) {
    // 休息恢复体力
    d.stamina = Math.min(100, d.stamina + REST_STAMINA_PER_SEC * deltaS);
  }

  if (d.behavior !== DB.IDLE) {
    // 正在执行行为，倒计时
    d.behaviorTimer -= deltaS;

    if (d.behaviorTimer <= 0) {
      // 行为结束 → 结算奖励
      const reward = getBehaviorAuraReward(d.behavior, d.starRating);
      d.aura += reward;

      events.push({
        disciple: d,
        oldBehavior: d.behavior,
        newBehavior: DB.IDLE,
        auraReward: reward,
      });

      d.behavior = DB.IDLE;
      d.behaviorTimer = 0;
    }
  }

  if (d.behavior === DB.IDLE) {
    // IDLE 状态 → 发起新决策
    const weights = getPersonalityWeights(d.personality, d.stamina);
    const chosen = weightedRandomPick(weights);
    const duration = getBehaviorDuration(chosen);

    if (duration > 0) {
      const oldBehavior = d.behavior;
      d.behavior = chosen;
      d.behaviorTimer = duration;
      d.lastDecisionTime = Date.now();

      events.push({
        disciple: d,
        oldBehavior,
        newBehavior: chosen,
        auraReward: 0,
      });
    }
  }

  return events;
}
