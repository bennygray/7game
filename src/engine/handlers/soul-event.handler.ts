/**
 * Handler: 灵魂事件评估（Phase E → Phase G 扩展）
 *
 * Phase: SOUL_EVAL (625), Order: 0
 * （在 DISCIPLE_AI(600) 之后，ai-result-apply(625:5) 之前，DIALOGUE(650) 之前）
 *
 * 职责：
 * - 从 EventBus drain 所有事件
 * - 每 tick 消费 ≤ MAX_EVENTS_PER_TICK 个事件
 * - 同步调用 processSoulEvent（fallback 立即生效）
 * - Phase G: 按 severity 异步提交 AI 评估到 AsyncAIBuffer
 *   - Lv.0 BREATH: 无 SoulEvent（已在 world-event-tick 过滤）
 *   - Lv.1 RIPPLE: fallback only
 *   - Lv.2 SPLASH: fallback + 异步 AI 独白 (Call2)
 *   - Lv.3 STORM: fallback + 异步 AI 完整评估
 *
 * ADR-E02: soul-event 与 soul-tick 分离
 * ADR-E03: EventBus 通过 TickContext 注入
 *
 * @see phaseE-TDD.md Step 3.1
 * @see SOUL-VISION-ROADMAP.md Phase G
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { processSoulEvent, fallbackEvaluate } from '../soul-engine';
import { EventSeverity } from '../../shared/types/world-event';
import type { SoulEvent } from '../event-bus';
import type { SoulEvaluator } from '../../ai/soul-evaluator';
import { applyActionEffect } from '../action-executor';

/**
 * 每 tick 最多处理 N 个灵魂事件
 * Story #4 AC8: 8 弟子 × P95(1.2s) ≈ 9.6s，控制并发
 */
const MAX_EVENTS_PER_TICK = 1;

/** 模块级 SoulEvaluator 引用（由 initSoulEventEvaluator 注入） */
let evaluator: SoulEvaluator | null = null;

/**
 * 注入 SoulEvaluator（由 main.ts 在 AI 连接时调用）
 */
export function initSoulEventEvaluator(ev: SoulEvaluator): void {
  evaluator = ev;
}

/**
 * 确定事件的有效 severity
 *
 * world-event: 从 metadata.severity 读取
 * breakthrough: Lv.2 SPLASH
 * encounter-conflict: Lv.2 SPLASH
 * 其他: Lv.1 RIPPLE
 */
function getEventSeverity(event: SoulEvent): number {
  if (event.type === 'world-event') {
    const severity = (event.metadata as Record<string, unknown> | undefined)?.severity;
    return typeof severity === 'number' ? severity : EventSeverity.RIPPLE;
  }
  if (event.type === 'breakthrough-success' || event.type === 'breakthrough-fail') {
    return EventSeverity.SPLASH;
  }
  if (event.type === 'encounter-conflict') {
    return EventSeverity.SPLASH;
  }
  return EventSeverity.RIPPLE;
}

export const soulEventHandler: TickHandler = {
  name: 'soul-event',
  phase: TickPhase.SOUL_EVAL,
  order: 0,

  execute(ctx: TickContext): void {
    const events = ctx.eventBus.drain();
    if (events.length === 0) return;

    // 每 tick 消费 ≤ MAX_EVENTS_PER_TICK 个事件
    const toProcess = events.slice(0, MAX_EVENTS_PER_TICK);

    for (const event of toProcess) {
      try {
        // 1. 同步 fallback 评估（始终执行，保证游戏流畅）
        processSoulEvent(event, ctx.state, ctx.logger, undefined, ctx.emotionMap, ctx.relationshipMemoryManager, ctx.narrativeSnippetBuilder);

        // 2. Phase G: 异步 AI 评估提交（按 severity 路由）
        if (evaluator && evaluator.canCall() && ctx.asyncAIBuffer) {
          const severity = getEventSeverity(event);
          submitAIEvaluation(event, severity, ctx);
        }
      } catch (err) {
        ctx.logger.warn(
          'DISCIPLE' as const,
          'soul-event.handler',
          `灵魂事件处理失败: ${err instanceof Error ? err.message : String(err)}`,
          { eventType: event.type, actorId: event.actorId },
        );
      }
    }
  },
};

/**
 * 按 severity 提交异步 AI 评估
 */
function submitAIEvaluation(
  event: SoulEvent,
  severity: number,
  ctx: TickContext,
): void {
  if (!evaluator || !ctx.asyncAIBuffer) return;

  // Lv.1 RIPPLE: fallback only, 不调 AI
  if (severity <= EventSeverity.RIPPLE) return;

  const actor = ctx.state.disciples.find(d => d.id === event.actorId);
  if (!actor) return;

  // 仅对 self 角色的弟子提交 AI 评估
  const key = `${event.timestamp ?? Date.now()}:${actor.id}`;
  const fallbackResult = fallbackEvaluate(event, actor, 'self', ctx.state, actor.name);

  if (severity >= EventSeverity.STORM) {
    // Lv.3 STORM: 双阶段 AI 决策+独白
    const aiPromise = evaluator.evaluateDecisionAndMonologue(event, actor, 'self', ctx.state)
      .then(result => {
        // 应用动作效果（关系 delta 加成）
        if (result.actionCode) {
          return applyActionEffect(result, result.actionCode, event.actorId);
        }
        return result;
      });
    ctx.asyncAIBuffer.submit(key, aiPromise, {
      result: fallbackResult,
      discipleId: actor.id,
      timestamp: Date.now(),
    });
  } else if (severity >= EventSeverity.SPLASH) {
    // Lv.2 SPLASH: AI 独白渲染 only
    const aiPromise = evaluator.evaluateMonologue(
      event, actor, 'self', fallbackResult.emotion, ctx.state,
    ).then(monologue => ({
      ...fallbackResult,
      innerThought: monologue.innerThought,
    }));
    ctx.asyncAIBuffer.submit(key, aiPromise, {
      result: fallbackResult,
      discipleId: actor.id,
      timestamp: Date.now(),
    });
  }
}
