/**
 * Handler: 灵魂事件评估（Phase E）
 *
 * Phase: SOUL_EVAL (625), Order: 0
 * （在 DISCIPLE_AI(600) 之后，DIALOGUE(650) 之前）
 *
 * 职责：
 * - 从 EventBus drain 所有事件
 * - 每 tick 消费 ≤ MAX_EVENTS_PER_TICK 个事件（防止 AI 延迟堆积）
 * - 异步调用 soul-engine.processSoulEvent（不阻塞 tick 热路径）
 *
 * ADR-E02: soul-event 与 soul-tick 分离
 * ADR-E03: EventBus 通过 TickContext 注入
 *
 * soul-event.handler 触发 AI 评估（异步）：
 * - 结果将在下一 tick+ 写入 GameState（非阻塞）
 *
 * @see phaseE-TDD.md Step 3.1
 * @see Story #2, #4 AC7, AC8
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { processSoulEvent } from '../soul-engine';

/**
 * 每 tick 最多处理 N 个灵魂事件
 * Story #4 AC8: 8 弟子 × P95(1.2s) ≈ 9.6s，控制并发
 */
const MAX_EVENTS_PER_TICK = 1;

export const soulEventHandler: TickHandler = {
  name: 'soul-event',
  phase: TickPhase.SOUL_EVAL,
  order: 0,

  execute(ctx: TickContext): void {
    const events = ctx.eventBus.drain();
    if (events.length === 0) return;

    // 每 tick 消费 ≤ MAX_EVENTS_PER_TICK 个事件
    const toProcess = events.slice(0, MAX_EVENTS_PER_TICK);

    // 当前设计：每 tick 最多触发 1 个事件，多余丢弃（Phase E 弟子少，可接受）
    // 未来可用持久化队列处理积压（eventBus 每 tick 重建，剩余事件不持久）

    for (const event of toProcess) {
      try {
        processSoulEvent(event, ctx.state, ctx.logger, undefined, ctx.emotionMap);
      } catch (err) {
        ctx.logger.warn(
          'DISCIPLE' as 'DISCIPLE',
          'soul-event.handler',
          `灵魂事件处理失败: ${err instanceof Error ? err.message : String(err)}`,
          { eventType: event.type, actorId: event.actorId },
        );
      }
    }
  },
};
