/**
 * Handler: 自动突破检测 + 执行
 *
 * Phase: PRE_PRODUCTION (200), Order: 10
 * 来源: idle-engine.ts L144-156
 *
 * CR-A1: 冷却防竞态。通过 TickContext.breakthroughCooldown 共享冷却状态。
 * TD-001: breakthroughCooldown 暴露到 TickContext 是已知技术债务。
 * Phase E: 突破结果发送到 EventBus，触发灵魂评估。
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

      // Phase E: 向 EventBus 发射突破灵魂事件
      if (ctx.eventBus) {
        // 突破由宗门弟子共同见证，actorId 取第一个弟子（宗主代表）
        const actorId = ctx.state.disciples[0]?.id;
        if (actorId) {
          ctx.eventBus.emit({
            type: btLog.success ? 'breakthrough-success' : 'breakthrough-fail',
            actorId,
            timestamp: Date.now(),
            metadata: {
              newRealm: btLog.result.newRealm,
              newSubRealm: btLog.result.newSubRealm,
              successRate: btLog.result.successRate,
            },
          });

          // Phase I-alpha: 因果系统联动（C4/C5 数据源）
          if (ctx.causalEvaluator) {
            if (btLog.success) {
              ctx.causalEvaluator.recordBreakthrough(actorId, Math.floor(ctx.state.inGameWorldTime));
              ctx.causalEvaluator.resetBreakthroughFailure(actorId);
            } else {
              ctx.causalEvaluator.recordBreakthroughFailure(actorId);
            }
          }
        }
      }
    }
  },
};
