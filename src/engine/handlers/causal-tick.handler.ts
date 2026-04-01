/**
 * 因果规则扫描 TickHandler — Phase I-alpha
 *
 * TickPhase 612 (CAUSAL_EVAL)，order 0。
 * 位于 ENCOUNTER(610) 之后、SOUL_EVAL(625) 之前。
 *
 * 每 CAUSAL_SCAN_INTERVAL_TICKS 次 tick 执行一次扫描。
 *
 * @see phaseI-alpha-TDD.md S3.1, S3.2
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { CAUSAL_SCAN_INTERVAL_TICKS } from '../../shared/data/causal-rule-registry';

/** 扫描累计器 */
let scanAccumulatorTicks = 0;

export const causalTickHandler: TickHandler = {
  name: 'causal-tick',
  phase: TickPhase.CAUSAL_EVAL,
  order: 0,

  execute(ctx: TickContext): void {
    if (!ctx.causalEvaluator) return;

    scanAccumulatorTicks++;
    if (scanAccumulatorTicks < CAUSAL_SCAN_INTERVAL_TICKS) return;
    scanAccumulatorTicks = 0;

    const currentTick = Math.floor(ctx.state.inGameWorldTime);
    ctx.causalEvaluator.evaluate(
      ctx.state,
      currentTick,
      ctx.eventBus,
      ctx.logger,
      ctx.relationshipMemoryManager,
      ctx.goalManager,
    );
  },
};
