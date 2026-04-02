/**
 * AI 行为执行器 — Phase G4
 *
 * 将 AI 决策的 actionCode 映射为具体的 GameState 效果。
 * 维护 I3 不变量：AI 不直接写 GameState，此执行器作为中介验证。
 *
 * @see SOUL-VISION-ROADMAP.md Phase G, G4
 */

import type { SoulEvaluationResult } from '../shared/types/soul';

/** 动作效果 */
export interface ActionEffect {
  /** 额外的关系 delta（叠加到评估结果上） */
  relationshipDeltaBonus: number;
  /** MUD 日志描述 */
  logSuffix: string;
}

/** 动作→效果映射 */
const ACTION_EFFECTS: Record<string, ActionEffect> = {
  // 战斗类
  FIGHT:    { relationshipDeltaBonus: 1,  logSuffix: '挺身迎战' },
  PROTECT:  { relationshipDeltaBonus: 3,  logSuffix: '保护同门' },
  FLEE:     { relationshipDeltaBonus: -1, logSuffix: '趁乱逃跑' },
  LOOT:     { relationshipDeltaBonus: -2, logSuffix: '趁乱捡拾' },
  HIDE:     { relationshipDeltaBonus: 0,  logSuffix: '躲起来观望' },

  // 社交类
  WELCOME:    { relationshipDeltaBonus: 2,  logSuffix: '热情迎接' },
  OBSERVE:    { relationshipDeltaBonus: 0,  logSuffix: '冷眼旁观' },
  CHALLENGE:  { relationshipDeltaBonus: -2, logSuffix: '出言挑衅' },
  TRADE:      { relationshipDeltaBonus: 1,  logSuffix: '尝试交易' },
  REPORT:     { relationshipDeltaBonus: 0,  logSuffix: '向长老禀报' },

  // 机缘类
  SHARE:    { relationshipDeltaBonus: 3,  logSuffix: '与同门分享' },
  SEIZE:    { relationshipDeltaBonus: -3, logSuffix: '独吞机缘' },
  EXPLORE:  { relationshipDeltaBonus: 0,  logSuffix: '谨慎探索' },
  GUARD:    { relationshipDeltaBonus: 1,  logSuffix: '守护现场' },

  // 冲突类
  CONFRONT: { relationshipDeltaBonus: -1, logSuffix: '正面对峙' },
  MEDIATE:  { relationshipDeltaBonus: 2,  logSuffix: '出面调解' },
  PROVOKE:  { relationshipDeltaBonus: -3, logSuffix: '火上浇油' },
  RETREAT:  { relationshipDeltaBonus: 0,  logSuffix: '退让避让' },
  SABOTAGE: { relationshipDeltaBonus: -3, logSuffix: '暗中使绊' },

  // 突破失败
  PERSEVERE:  { relationshipDeltaBonus: 0,  logSuffix: '咬牙再试' },
  REST:       { relationshipDeltaBonus: 0,  logSuffix: '安心疗伤' },
  SEEK_HELP:  { relationshipDeltaBonus: 2,  logSuffix: '求助同门' },
  BLAME:      { relationshipDeltaBonus: -2, logSuffix: '迁怒他人' },

  // 默认
  ACT:      { relationshipDeltaBonus: 0,  logSuffix: '积极应对' },
  HELP:     { relationshipDeltaBonus: 2,  logSuffix: '出手帮忙' },
  IGNORE:   { relationshipDeltaBonus: 0,  logSuffix: '置身事外' },
  EXPLOIT:  { relationshipDeltaBonus: -2, logSuffix: '趁火打劫' },
};

/**
 * 将 AI 决策的 actionCode 应用到评估结果上
 *
 * @param result 基础评估结果（来自 evaluateDecisionAndMonologue）
 * @param actionCode AI 选择的动作码
 * @param actorId 事件主角 ID（关系 delta 目标）
 * @returns 增强后的评估结果
 */
export function applyActionEffect(
  result: SoulEvaluationResult,
  actionCode: string,
  actorId: string,
): SoulEvaluationResult {
  const effect = ACTION_EFFECTS[actionCode];
  if (!effect || effect.relationshipDeltaBonus === 0) return result;

  // 叠加动作引起的关系变化
  return {
    ...result,
    relationshipDeltas: [
      ...result.relationshipDeltas,
      {
        targetId: actorId,
        closeness: effect.relationshipDeltaBonus,
        attraction: 0,
        trust: 0,
        reason: `AI决策：${effect.logSuffix}`,
      },
    ],
  };
}

/**
 * 获取动作的 MUD 日志后缀
 */
export function getActionLogSuffix(actionCode: string): string {
  return ACTION_EFFECTS[actionCode]?.logSuffix ?? actionCode;
}
