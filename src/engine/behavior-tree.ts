/**
 * 弟子行为树 — 性格权重决策系统
 *
 * Phase D 重构 (TD-003 清偿):
 *   tickDisciple() → 保留（向后兼容，但标记 @deprecated）
 *   planIntent() → 新增纯函数，返回 BehaviorIntent[]
 *   executeIntents() → 移至 intent-executor.ts
 *
 * ADR-D01: 完全分离 — planIntent 不修改任何 state
 *
 * @see Story #2
 * @see phaseD-TDD.md ADR-D01
 */

import type { LiteDiscipleState, LiteGameState, PersonalityTraits, DiscipleBehavior } from '../shared/types/game-state';
import { DiscipleBehavior as DB } from '../shared/types/game-state';
import type { DiscipleEmotionState } from '../shared/types/soul';
import type { PersonalGoal } from '../shared/types/personal-goal';
import { GOAL_MULTIPLIER_CAP } from '../shared/types/personal-goal';
import { getTraitDef } from '../shared/data/trait-registry';
import { getDiscipleLocation } from '../shared/types/encounter';
import {
  EMOTION_BEHAVIOR_MODIFIERS,
  FRIEND_COOPERATIVE_MULTIPLIER,
  RIVAL_COMPETITIVE_MULTIPLIER,
  RIVAL_MEDITATION_MULTIPLIER,
  COOPERATIVE_BEHAVIORS,
  COMPETITIVE_BEHAVIORS,
} from '../shared/data/emotion-behavior-modifiers';

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

// ===== BehaviorIntent 类型 =====

/** 弟子行为意图 — 纯数据，不含副作用 */
export interface BehaviorIntent {
  /** 意图类型 */
  type: 'start-behavior' | 'end-behavior' | 'continue';
  /** 弟子 ID */
  discipleId: string;
  /** 新行为（仅 start-behavior） */
  newBehavior?: DiscipleBehavior;
  /** 新行为持续时间（仅 start-behavior） */
  duration?: number;
  /** 旧行为（仅 end-behavior） */
  oldBehavior?: DiscipleBehavior;
  /** 行为结束灵气奖励（仅 end-behavior） */
  auraReward?: number;
  /** 体力变化量（正=恢复, 负=消耗） */
  staminaDelta?: number;
  /** 行为倒计时变化量（负=递减） */
  timerDelta?: number;
}

// ===== 弟子行为变更事件（保持向后兼容） =====

/** 弟子行为变更事件 */
export interface DiscipleBehaviorEvent {
  disciple: LiteDiscipleState;
  oldBehavior: DiscipleBehavior;
  newBehavior: DiscipleBehavior;
  /** 行为结束时获得的灵气（仅 oldBehavior 结束时有值） */
  auraReward: number;
  /** FARM/ALCHEMY 引擎产生的 MUD 日志（可选） */
  farmAlchemyLogs?: string[];
}

// ===== 权重计算 =====

/**
 * 根据五维性格和体力生成 7 行为权重向量
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
 * 增强版行为权重 — 四层叠加
 *
 * Layer 1: 基础五维性格（getPersonalityWeights，不修改）
 * Layer 2: 特性 behavior-weight 叠加（F1）
 * Layer 3: 关系标签 friend/rival 同地点效果（F2 + F4）
 * Layer 4: 短期情绪状态效果（F3）
 * Layer 5: 个人目标乘数（Phase J-Goal，I5: 无目标=全 ×1.0）
 *
 * 保持纯函数（ADR-D01）：所有输入作为参数传入
 *
 * @see phaseF-PRD.md §3.2 F-F-01
 * @see phaseF-TDD.md Step 2.4
 */
export function getEnhancedPersonalityWeights(
  d: Readonly<LiteDiscipleState>,
  state: Readonly<LiteGameState>,
  emotionState: DiscipleEmotionState | null,
  goals?: readonly PersonalGoal[],
): { behavior: DiscipleBehavior; weight: number }[] {

  // === Layer 1: 基础权重 ===
  const weights = getPersonalityWeights(d.personality, d.stamina);

  // === Layer 2: 特性叠加（F1） ===
  for (const w of weights) {
    let traitModifier = 0;
    for (const trait of d.traits) {
      const def = getTraitDef(trait.defId);
      if (!def) continue;
      for (const effect of def.effects) {
        if (effect.type === 'behavior-weight' && effect.target === w.behavior) {
          traitModifier += effect.value;
        }
      }
    }
    // 乘法叠加：weight × (1 + Σ effects)
    w.weight = Math.max(0, w.weight * (1 + traitModifier));
  }

  // === Layer 3: 关系标签效果（F2 + F4） ===
  const myLocation = getDiscipleLocation(d.behavior);
  let hasFriendNearby = false;
  let hasRivalNearby = false;

  for (const other of state.disciples) {
    if (other.id === d.id) continue;
    if (getDiscipleLocation(other.behavior) !== myLocation) continue;
    const edge = state.relationships.find(
      r => r.sourceId === d.id && r.targetId === other.id,
    );
    if (!edge) continue;
    if (edge.tags.includes('friend')) hasFriendNearby = true;
    if (edge.tags.includes('rival')) hasRivalNearby = true;
  }

  if (hasFriendNearby) {
    for (const w of weights) {
      if ((COOPERATIVE_BEHAVIORS as readonly string[]).includes(w.behavior)) {
        w.weight *= FRIEND_COOPERATIVE_MULTIPLIER;
      }
    }
  }
  if (hasRivalNearby) {
    for (const w of weights) {
      if ((COMPETITIVE_BEHAVIORS as readonly string[]).includes(w.behavior)) {
        w.weight *= RIVAL_COMPETITIVE_MULTIPLIER;
      }
      if (w.behavior === DB.MEDITATE) {
        w.weight *= RIVAL_MEDITATION_MULTIPLIER;
      }
    }
  }

  // === Layer 4: 情绪状态效果（F3） ===
  if (emotionState?.currentEmotion && emotionState.currentEmotion !== 'neutral') {
    const modifiers = EMOTION_BEHAVIOR_MODIFIERS[emotionState.currentEmotion];
    if (modifiers) {
      for (const w of weights) {
        const mod = modifiers[w.behavior as DiscipleBehavior];
        if (mod !== undefined) {
          w.weight *= mod;
        }
      }
    }
  }

  // === Layer 5: 个人目标乘数（Phase J-Goal） ===
  if (goals && goals.length > 0) {
    // 合成多目标乘数：各目标之积，clamp [0.5, 2.0]
    const minClamp = 1 / GOAL_MULTIPLIER_CAP; // 0.5
    const multipliers: Record<string, number> = {};
    for (const goal of goals) {
      for (const [behavior, value] of Object.entries(goal.behaviorMultipliers)) {
        multipliers[behavior] = (multipliers[behavior] ?? 1.0) * value;
      }
    }
    for (const w of weights) {
      const m = multipliers[w.behavior];
      if (m !== undefined) {
        w.weight *= Math.max(minClamp, Math.min(GOAL_MULTIPLIER_CAP, m));
      }
    }
  }

  // 最终保证非负
  for (const w of weights) {
    w.weight = Math.max(0, w.weight);
  }

  return weights;
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
  return base * (1 + (starRating - 1) * 0.25);
}

/**
 * 获取行为中文标签
 */
export function getBehaviorLabel(behavior: DiscipleBehavior): string {
  return BEHAVIOR_LABELS[behavior] ?? '未知';
}

// ===== planIntent — 纯函数（Phase D 新增） =====

/**
 * 为单个弟子生成行为意图（纯函数，不修改 state）
 *
 * ADR-D01: 完全分离 — 包括体力消耗也不在此计算，
 * 而是作为 staminaDelta 返回给 executor。
 *
 * R-D3a: 禁止修改 state
 *
 * @param d 弟子状态（只读）
 * @param deltaS 距上次 tick 秒数
 * @param _state 游戏状态（只读，保留参数位以便未来扩展）
 * @returns 行为意图数组
 */
export function planIntent(
  d: Readonly<LiteDiscipleState>,
  deltaS: number,
  _state: Readonly<LiteGameState>,
  emotionState?: DiscipleEmotionState | null,
  goals?: readonly PersonalGoal[],
): BehaviorIntent[] {
  // deltaS=0 防御 (R6-D1 WARN)
  if (deltaS <= 0) return [];

  const intents: BehaviorIntent[] = [];

  // 1. 体力变化
  if (d.behavior !== DB.IDLE && d.behavior !== DB.REST) {
    intents.push({
      type: 'continue',
      discipleId: d.id,
      staminaDelta: -ACTIVE_STAMINA_DRAIN * deltaS,
      timerDelta: -deltaS,
    });
  }
  if (d.behavior === DB.REST) {
    intents.push({
      type: 'continue',
      discipleId: d.id,
      staminaDelta: REST_STAMINA_PER_SEC * deltaS,
      timerDelta: -deltaS,
    });
  }

  // 2. 行为倒计时判断
  if (d.behavior !== DB.IDLE) {
    const remainingTimer = d.behaviorTimer - deltaS;

    if (remainingTimer <= 0) {
      // 行为结束
      const reward = getBehaviorAuraReward(d.behavior, d.starRating);
      intents.push({
        type: 'end-behavior',
        discipleId: d.id,
        oldBehavior: d.behavior,
        auraReward: reward,
      });

      // 行为结束后立刻进入 IDLE → 发起新决策
      const weights = emotionState !== undefined
        ? getEnhancedPersonalityWeights(d, _state, emotionState, goals)
        : getPersonalityWeights(d.personality, d.stamina);
      const chosen = weightedRandomPick(weights);
      const duration = getBehaviorDuration(chosen);

      if (duration > 0) {
        intents.push({
          type: 'start-behavior',
          discipleId: d.id,
          newBehavior: chosen,
          duration,
        });
      }
    }
    // 行为未结束 → continue（体力变化已在上面处理）
  } else {
    // IDLE 状态 → 发起新决策
    const weights = emotionState !== undefined
      ? getEnhancedPersonalityWeights(d, _state, emotionState, goals)
      : getPersonalityWeights(d.personality, d.stamina);
    const chosen = weightedRandomPick(weights);
    const duration = getBehaviorDuration(chosen);

    if (duration > 0) {
      intents.push({
        type: 'start-behavior',
        discipleId: d.id,
        newBehavior: chosen,
        duration,
      });
    }
  }

  return intents;
}

// ===== tickDisciple — 向后兼容（@deprecated） =====

/**
 * 单弟子 tick 处理
 *
 * @deprecated Phase D: 请使用 planIntent + executeIntents 替代。
 * 保留此函数仅用于 Phase A-C 的回归测试兼容。
 */
export function tickDisciple(
  d: LiteDiscipleState,
  deltaS: number,
  state: LiteGameState,
): DiscipleBehaviorEvent[] {
  return tickDiscipleLegacyImpl(d, deltaS, state);
}

// Phase B-alpha imports (used by legacy tickDisciple and intent-executor)
import { tryPlant, harvestAll, plantResultToLog } from './farm-engine';
import { startAlchemy, settleAlchemy } from './alchemy-engine';

// Re-export for intent-executor
export { tryPlant, harvestAll, plantResultToLog, startAlchemy, settleAlchemy };

function tickDiscipleLegacyImpl(
  d: LiteDiscipleState,
  deltaS: number,
  state: LiteGameState,
): DiscipleBehaviorEvent[] {
  const events: DiscipleBehaviorEvent[] = [];

  if (d.behavior !== DB.IDLE && d.behavior !== DB.REST) {
    d.stamina = Math.max(0, d.stamina - ACTIVE_STAMINA_DRAIN * deltaS);
  }

  if (d.behavior === DB.REST) {
    d.stamina = Math.min(100, d.stamina + REST_STAMINA_PER_SEC * deltaS);
  }

  if (d.behavior !== DB.IDLE) {
    d.behaviorTimer -= deltaS;

    if (d.behaviorTimer <= 0) {
      const reward = getBehaviorAuraReward(d.behavior, d.starRating);
      d.aura += reward;

      const farmAlchemyLogs: string[] = [];
      if (d.behavior === DB.FARM) {
        farmAlchemyLogs.push(...harvestAll(d, state));
      } else if (d.behavior === DB.ALCHEMY) {
        farmAlchemyLogs.push(...settleAlchemy(d, state));
      }

      events.push({
        disciple: d,
        oldBehavior: d.behavior,
        newBehavior: DB.IDLE,
        auraReward: reward,
        farmAlchemyLogs: farmAlchemyLogs.length > 0 ? farmAlchemyLogs : undefined,
      });

      d.behavior = DB.IDLE;
      d.behaviorTimer = 0;
    }
  }

  if (d.behavior === DB.IDLE) {
    const weights = getPersonalityWeights(d.personality, d.stamina);
    const chosen = weightedRandomPick(weights);
    const duration = getBehaviorDuration(chosen);

    if (duration > 0) {
      const oldBehavior = d.behavior;
      d.behavior = chosen;
      d.behaviorTimer = duration;
      d.lastDecisionTime = Date.now();

      const farmAlchemyLogs: string[] = [];
      if (chosen === DB.FARM) {
        const result = tryPlant(d, state);
        const log = plantResultToLog(d, result);
        if (log) farmAlchemyLogs.push(log);
      } else if (chosen === DB.ALCHEMY) {
        const log = startAlchemy(d, state);
        farmAlchemyLogs.push(log);
      }

      events.push({
        disciple: d,
        oldBehavior,
        newBehavior: chosen,
        auraReward: 0,
        farmAlchemyLogs: farmAlchemyLogs.length > 0 ? farmAlchemyLogs : undefined,
      });
    }
  }

  return events;
}
