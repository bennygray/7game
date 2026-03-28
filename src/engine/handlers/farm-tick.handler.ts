/**
 * Handler: 灵田生长推进
 *
 * Phase: SYSTEM_TICK (500), Order: 0
 * 来源: idle-engine.ts L192-200
 *
 * Phase B-α: 每 tick 推进所有弟子灵田生长。
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { tickFarm } from '../farm-engine';

export const farmTickHandler: TickHandler = {
  name: 'farm-tick',
  phase: TickPhase.SYSTEM_TICK,
  order: 0,

  execute(ctx: TickContext): void {
    for (const disciple of ctx.state.disciples) {
      const logs = tickFarm(disciple, ctx.state);
      ctx.farmLogs.push(...logs);
    }
  },
};
