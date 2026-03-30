/**
 * Handler: 弟子行为树 Tick (Phase D Intent 模式)
 *
 * Phase: DISCIPLE_AI (600), Order: 0
 *
 * Phase D 重构（TD-003 清偿）:
 *   旧: tickDisciple() with side effects
 *   新: planIntent() → executeIntents() with centralized side effects
 *
 * Phase F: planIntent 传入 emotionState → 使用 getEnhancedPersonalityWeights
 *
 * @see phaseD-TDD.md Step 2, ADR-D01
 * @see phaseF-TDD.md Step 3.1
 * @see Story #2
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { planIntent } from '../behavior-tree';
import { executeIntents } from '../intent-executor';

export const discipleTickHandler: TickHandler = {
  name: 'disciple-tick',
  phase: TickPhase.DISCIPLE_AI,
  order: 0,

  execute(ctx: TickContext): void {
    // 1. 收集全部弟子 Intent（纯函数，不修改 state）
    // Phase F: 传入 emotionState → getEnhancedPersonalityWeights 四层叠加
    const allIntents = [];
    for (const disciple of ctx.state.disciples) {
      const emotionState = ctx.emotionMap.get(disciple.id) ?? null;
      allIntents.push(...planIntent(disciple, ctx.deltaS, ctx.state, emotionState));
    }

    // 2. 统一执行（R-D3b: 按弟子顺序, R-D3c: 副作用集中）
    // Phase E: 传递 eventBus，end-behavior 时自动发射 SoulEvent
    const result = executeIntents(allIntents, ctx.state, ctx.eventBus);

    // 3. 输出到 TickContext
    ctx.discipleEvents.push(...result.events);
    ctx.dialogueTriggers.push(...result.triggers);
  },
};
