/**
 * Handler: 弟子间对话触发 (Phase D)
 *
 * Phase: DIALOGUE (650), Order: 0
 *
 * 在弟子行为树执行完毕后，检查 DialogueTrigger 并委托
 * DialogueCoordinator 异步处理对话。
 *
 * 注意：本 handler 仅作为 pipeline 占位符。
 * 实际对话处理在 idle-engine.ts tick() 末尾异步执行，
 * 因为 DialogueCoordinator 需要 async。
 *
 * @see phaseD-TDD.md Step 3.1
 * @see Story #4
 */

import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';

export const dialogueTickHandler: TickHandler = {
  name: 'dialogue-tick',
  phase: TickPhase.DIALOGUE,
  order: 0,

  execute(_ctx: TickContext): void {
    // 对话触发的实际处理在 idle-engine.ts tick() 末尾
    // 因为 DialogueCoordinator.processTriggers() 是异步的，
    // 不适合在同步 Pipeline 中执行。
    //
    // 本 handler 的作用：
    // 1. 在 Pipeline 中占位，确保执行顺序记录清晰
    // 2. 未来可在此添加同步的对话预处理逻辑（如概率过滤）
  },
};
