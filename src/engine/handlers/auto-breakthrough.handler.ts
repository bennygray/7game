/**
 * Handler: 自动突破检测 + 执行
 *
 * Phase: PRE_PRODUCTION (200), Order: 10
 * 来源: idle-engine.ts L144-156
 *
 * CR-A1: 冷却防竞态。通过 TickContext.breakthroughCooldown 共享冷却状态。
 * TD-001: breakthroughCooldown 暴露到 TickContext 是已知技术债务。
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import {
  shouldAutoBreakthrough,
  executeBreakthrough,
  BREAKTHROUGH_COOLDOWN_TICKS,
} from '../breakthrough-engine';

export const autoBreakthroughHandler: TickHandler = {
  name: 'auto-breakthrough',
  phase: TickPhase.PRE_PRODUCTION,
  order: 10,

  execute(ctx: TickContext): void {
    if (ctx.breakthroughCooldown > 0) {
      ctx.breakthroughCooldown--;
    } else if (shouldAutoBreakthrough(ctx.state)) {
      const btLog = executeBreakthrough(ctx.state);
      ctx.breakthroughCooldown = BREAKTHROUGH_COOLDOWN_TICKS;
      // 回灵丹日志
      for (const hl of btLog.healLogs) {
        ctx.systemLogs.push(`[系统] ${hl.detail}`);
      }
      // 突破结果通知
      ctx.onBreakthrough?.(ctx.state, btLog);
    }
  },
};
