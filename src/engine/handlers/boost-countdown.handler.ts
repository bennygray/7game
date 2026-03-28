/**
 * Handler: 修速丹 Buff 倒计时
 *
 * Phase: BUFF_COUNTDOWN (100)
 * 来源: idle-engine.ts L136-138
 *
 * 每 tick 扣减修速丹剩余时间，过期时清空 buff。
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { tickBoostCountdown } from '../pill-consumer';

export const boostCountdownHandler: TickHandler = {
  name: 'boost-countdown',
  phase: TickPhase.BUFF_COUNTDOWN,
  order: 0,

  execute(ctx: TickContext): void {
    const log = tickBoostCountdown(ctx.state, ctx.deltaS);
    if (log) ctx.systemLogs.push(log);
  },
};
