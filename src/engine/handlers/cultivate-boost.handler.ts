/**
 * Handler: 自动服修速丹
 *
 * Phase: POST_PRODUCTION (700), Order: 0
 * 来源: idle-engine.ts L212-214
 *
 * CR-B3: 修速丹自动服用移到灵气产出之后（buff 到期后有 1 tick 空窗）。
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { tickCultivateBoost } from '../pill-consumer';

export const cultivateBoostHandler: TickHandler = {
  name: 'cultivate-boost',
  phase: TickPhase.POST_PRODUCTION,
  order: 0,

  execute(ctx: TickContext): void {
    const boostLog = tickCultivateBoost(ctx.state);
    if (boostLog) ctx.systemLogs.push(`[系统] ${boostLog.detail}`);
  },
};
