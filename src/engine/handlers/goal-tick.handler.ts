/**
 * Handler: 目标生命周期管理（Phase J-Goal）
 *
 * Phase: SYSTEM_TICK (500), Order: 20
 * （在 soul-tick(500:10) 之后）
 *
 * 职责：
 * 1. 完成检查 — 达成目标自动移除 + MUD 完成文案
 * 2. TTL 递减 — 过期目标自动移除 + MUD 过期文案
 * 3. 定期扫描 — 基于性格分配 seclusion/ambition + MUD 分配文案
 *
 * MUD 输出级别：
 * - goal-assigned / goal-completed → info（涟漪级 Lv.2）
 * - goal-expired → debug（呼吸级 Lv.1）
 *
 * @see phaseJ-goal-TDD.md S3 goal-tick handler
 * @see phaseJ-goal-PRD.md §3.4, §3.5
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';
import { GOAL_LABEL, GOAL_MUD_TEXT } from '../../shared/data/goal-data';
import { LogCategory } from '../../shared/types/logger';
import type { PersonalGoal } from '../../shared/types/personal-goal';
import type { LiteGameState } from '../../shared/types/game-state';

/**
 * 渲染 MUD 文案模板
 *
 * 替换占位符：{name}, {target}, {pronoun}
 */
function renderGoalText(
  template: string,
  state: LiteGameState,
  goal: PersonalGoal,
): string {
  const disciple = state.disciples.find(d => d.id === goal.discipleId);
  const name = disciple?.name ?? '???';
  const pronoun = '其';

  let text = template
    .replace(/\{name\}/g, name)
    .replace(/\{pronoun\}/g, pronoun);

  // 替换 {target}（revenge/friendship 目标弟子名）
  const targetId = goal.target['targetDiscipleId'] as string | undefined;
  if (targetId) {
    const targetDisc = state.disciples.find(d => d.id === targetId);
    text = text.replace(/\{target\}/g, targetDisc?.name ?? '???');
  }

  return text;
}

/** goal-tick Handler */
export const goalTickHandler: TickHandler = {
  name: 'goal-tick',
  phase: TickPhase.SYSTEM_TICK,
  order: 20,

  execute(ctx: TickContext): void {
    if (!ctx.goalManager) return;

    const currentTick = Math.floor(ctx.state.inGameWorldTime);

    // 1. 完成检查（在 TTL 递减前，避免同时达成+过期时的竞态）
    const completed = ctx.goalManager.checkCompletions(ctx.state);
    for (const goal of completed) {
      const template = GOAL_MUD_TEXT.completed[goal.type];
      const text = renderGoalText(template, ctx.state, goal);
      ctx.logger.info(LogCategory.DISCIPLE, 'goal-tick', text, {
        discipleId: goal.discipleId,
        goalType: goal.type,
        event: 'goal-completed',
      });
    }

    // 2. TTL 递减 + 过期处理
    const expired = ctx.goalManager.tickGoals(ctx.state);
    for (const goal of expired) {
      const template = GOAL_MUD_TEXT.expired[goal.type];
      const text = renderGoalText(template, ctx.state, goal);
      ctx.logger.debug(LogCategory.DISCIPLE, 'goal-tick', text, {
        discipleId: goal.discipleId,
        goalType: goal.type,
        event: 'goal-expired',
      });
    }

    // 3. 定期扫描
    const assigned = ctx.goalManager.periodicScan(ctx.state, currentTick);
    for (const goal of assigned) {
      const label = GOAL_LABEL[goal.type];
      const template = GOAL_MUD_TEXT.assigned[goal.type];
      const text = renderGoalText(template, ctx.state, goal);
      ctx.logger.info(LogCategory.DISCIPLE, 'goal-tick', text, {
        discipleId: goal.discipleId,
        goalType: goal.type,
        goalLabel: label,
        event: 'goal-assigned',
      });
    }
  },
};
