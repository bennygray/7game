/**
 * Handler: 弟子行为树 Tick
 *
 * Phase: DISCIPLE_AI (600), Order: 0
 * 来源: idle-engine.ts L202-210
 *
 * 驱动每个弟子的行为树决策和行为执行。
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { tickDisciple } from '../behavior-tree';

export const discipleTickHandler: TickHandler = {
  name: 'disciple-tick',
  phase: TickPhase.DISCIPLE_AI,
  order: 0,

  execute(ctx: TickContext): void {
    for (const disciple of ctx.state.disciples) {
      const events = tickDisciple(disciple, ctx.deltaS, ctx.state);
      ctx.discipleEvents.push(...events);
    }
  },
};
