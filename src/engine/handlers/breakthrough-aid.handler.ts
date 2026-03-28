/**
 * Handler: 自动服破镜丹
 *
 * Phase: PRE_PRODUCTION (200), Order: 0
 * 来源: idle-engine.ts L140-142
 *
 * 在灵气产出前自动服破镜丹，确保突破前 buff 生效。
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { tickBreakthroughAid } from '../pill-consumer';

export const breakthroughAidHandler: TickHandler = {
  name: 'breakthrough-aid',
  phase: TickPhase.PRE_PRODUCTION,
  order: 0,

  execute(ctx: TickContext): void {
    const aidLog = tickBreakthroughAid(ctx.state);
    if (aidLog) ctx.systemLogs.push(`[系统] ${aidLog.detail}`);
  },
};
