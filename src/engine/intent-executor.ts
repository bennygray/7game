/**
 * Intent 执行器 — 统一执行弟子行为意图
 *
 * Phase D: TD-003 清偿。将 behavior-tree 副作用集中到此处。
 *
 * 职责:
 * 1. 修改弟子 state (behavior, behaviorTimer, stamina, aura)
 * 2. 调用 FARM/ALCHEMY 副作用 (tryPlant, harvestAll, startAlchemy, settleAlchemy)
 * 3. 生成 DiscipleBehaviorEvent[] (保持下游兼容)
 * 4. 提取 DialogueTrigger[] (行为结束事件)
 *
 * ADR-D01: 完全分离 — planIntent 100% 纯函数，所有副作用在此执行
 *
 * @see phaseD-TDD.md Step 2.2
 * @see Story #2
 */

import type { LiteGameState, LiteDiscipleState, DiscipleBehavior } from '../shared/types/game-state';
import type { DialogueTrigger } from '../shared/types/dialogue';
import type { BehaviorIntent, DiscipleBehaviorEvent } from './behavior-tree';
import { getBehaviorLabel } from './behavior-tree';
import { tryPlant, harvestAll, plantResultToLog } from './farm-engine';
import { startAlchemy, settleAlchemy } from './alchemy-engine';
import type { EventBus } from './event-bus';
import type { SoulEventType } from '../shared/types/soul';

// ===== 结果类型 =====

export interface IntentExecutionResult {
  /** 弟子行为事件（保持下游兼容） */
  events: DiscipleBehaviorEvent[];
  /** 对话触发候选（行为结束事件） */
  triggers: DialogueTrigger[];
}

// ===== outcomeTag 映射 =====

/** 行为结束时的 outcomeTag，null = 不触发对话 */
const BEHAVIOR_OUTCOME_TAG: Record<string, string | null> = {
  meditate: 'meditation',
  explore: 'explore-return',
  farm: 'harvest',
  alchemy: null,  // alchemy 由引擎日志细分 success/fail
  rest: null,
  idle: null,
  bounty: null,
};

/** outcomeTag → SoulEventType 映射 */
const OUTCOME_TO_SOUL_EVENT: Record<string, SoulEventType> = {
  'alchemy-success': 'alchemy-success',
  'alchemy-fail':    'alchemy-fail',
  'harvest':         'harvest',
  'meditation':      'meditation',
  'explore-return':  'explore-return',
};

// ===== 执行器 =====

/**
 * 统一执行所有弟子的 BehaviorIntent
 *
 * R-D3b: Intent 按弟子顺序生成，统一在此执行
 * R-D3c: FARM/ALCHEMY 副作用仅在此调用
 * R-D3d: 返回 DiscipleBehaviorEvent[]（保持下游兼容）
 * Phase E: eventBus 可选注入，存在时在 end-behavior 发射 SoulEvent
 */
export function executeIntents(
  intents: BehaviorIntent[],
  state: LiteGameState,
  eventBus?: EventBus,
): IntentExecutionResult {
  const events: DiscipleBehaviorEvent[] = [];
  const triggers: DialogueTrigger[] = [];

  for (const intent of intents) {
    const disciple = state.disciples.find(d => d.id === intent.discipleId);
    if (!disciple) continue;

    switch (intent.type) {
      case 'continue':
        // 体力变化
        if (intent.staminaDelta !== undefined) {
          disciple.stamina = Math.max(0, Math.min(100, disciple.stamina + intent.staminaDelta));
        }
        // 行为倒计时递减
        if (intent.timerDelta !== undefined) {
          disciple.behaviorTimer = Math.max(0, disciple.behaviorTimer + intent.timerDelta);
        }
        break;

      case 'end-behavior': {
        // 1. 结算灵气奖励
        const reward = intent.auraReward ?? 0;
        disciple.aura += reward;

        // 2. FARM/ALCHEMY 副作用
        const farmAlchemyLogs: string[] = [];
        let outcomeTag: string | null;

        if (intent.oldBehavior === 'farm') {
          farmAlchemyLogs.push(...harvestAll(disciple, state));
          outcomeTag = 'harvest';
        } else if (intent.oldBehavior === 'alchemy') {
          farmAlchemyLogs.push(...settleAlchemy(disciple, state));
          // 从日志中判断炼丹成功/失败
          const hasSuccess = farmAlchemyLogs.some(l => l.includes('成功') || l.includes('出丹'));
          outcomeTag = hasSuccess ? 'alchemy-success' : 'alchemy-fail';
        } else {
          outcomeTag = BEHAVIOR_OUTCOME_TAG[intent.oldBehavior ?? ''] ?? null;
        }

        // 3. 生成事件
        events.push({
          disciple,
          oldBehavior: intent.oldBehavior as DiscipleBehavior,
          newBehavior: 'idle' as DiscipleBehavior,
          auraReward: reward,
          farmAlchemyLogs: farmAlchemyLogs.length > 0 ? farmAlchemyLogs : undefined,
        });

        // 4. 更新弟子状态
        disciple.behavior = 'idle' as DiscipleBehavior;
        disciple.behaviorTimer = 0;

        // 5. 生成对话触发（如果是可触发场景）
        if (outcomeTag) {
          triggers.push({
            type: 'behavior-end',
            sourceId: disciple.id,
            eventDescription: buildEventDescription(disciple, intent.oldBehavior as DiscipleBehavior, outcomeTag),
            behavior: intent.oldBehavior as DiscipleBehavior,
            outcomeTag,
          });

          // Phase E: 向 EventBus 发射灵魂事件
          if (eventBus) {
            const soulEventType = OUTCOME_TO_SOUL_EVENT[outcomeTag];
            if (soulEventType) {
              eventBus.emit({
                type: soulEventType,
                actorId: disciple.id,
                timestamp: Date.now(),
              });
            }
          }
        }
        break;
      }

      case 'start-behavior': {
        const oldBehavior = disciple.behavior;

        // 1. 更新弟子状态
        disciple.behavior = intent.newBehavior as DiscipleBehavior;
        disciple.behaviorTimer = intent.duration ?? 0;
        disciple.lastDecisionTime = Date.now();

        // 2. FARM/ALCHEMY 副作用（行为开始时）
        const farmAlchemyLogs: string[] = [];
        if (intent.newBehavior === 'farm') {
          const result = tryPlant(disciple, state);
          const log = plantResultToLog(disciple, result);
          if (log) farmAlchemyLogs.push(log);
        } else if (intent.newBehavior === 'alchemy') {
          const log = startAlchemy(disciple, state);
          farmAlchemyLogs.push(log);
        }

        // 3. 生成事件
        events.push({
          disciple,
          oldBehavior,
          newBehavior: intent.newBehavior as DiscipleBehavior,
          auraReward: 0,
          farmAlchemyLogs: farmAlchemyLogs.length > 0 ? farmAlchemyLogs : undefined,
        });
        break;
      }
    }
  }

  return { events, triggers };
}

// ===== 辅助函数 =====

function buildEventDescription(
  disciple: LiteDiscipleState,
  behavior: DiscipleBehavior,
  outcomeTag: string,
): string {
  const _label = getBehaviorLabel(behavior);
  switch (outcomeTag) {
    case 'alchemy-success': return `${disciple.name}炼丹成功，丹药出炉`;
    case 'alchemy-fail':    return `${disciple.name}炼丹失败，丹炉碎裂`;
    case 'harvest':         return `${disciple.name}收获了灵田中的灵草`;
    case 'meditation':      return `${disciple.name}结束了一段修炼，似有所悟`;
    case 'explore-return':  return `${disciple.name}探索归来，满身风尘`;
    default:                return `${disciple.name}结束了${_label}`;
  }
}
