/**
 * Handler: 灵魂周期性更新（Phase E）
 *
 * Phase: SYSTEM_TICK (500), Order: 10
 * （在 farm-tick:0 之后执行，保证不干扰灵田逻辑）
 *
 * 职责（每 tick）：
 * 1. 道德自然漂移（向 initialMoral 方向微弱回归）
 * 2. 关系衰减（每 DECAY_INTERVAL_SEC=300s 一次，向 0 衰减）
 * 3. 后天特性检测触发
 * 4. Phase F: 情绪衰减（intensity 递减直至清除）
 *
 * ADR-E02: 周期性更新 (soul-tick) 与事件评估 (soul-event) 分离
 *
 * @see phaseE-TDD.md Step 3.1
 * @see phaseF-TDD.md Step 3.1
 * @see Story #3, #4 AC6
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { soulTickUpdate } from '../soul-engine';

export const soulTickHandler: TickHandler = {
  name: 'soul-tick',
  phase: TickPhase.SYSTEM_TICK,
  order: 10,  // farm-tick(0) 之后

  execute(ctx: TickContext): void {
    soulTickUpdate(ctx.state, ctx.deltaS, ctx.emotionMap);
  },
};
