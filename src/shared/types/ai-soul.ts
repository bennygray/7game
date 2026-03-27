/**
 * AI 灵智上下文（每弟子独立）
 *
 * 轻量级方案：短期记忆 + 目标 + 摘要。
 * V2 可扩展为三层架构（本能/潜意识/意识）。
 *
 * @see 7game-lite-analysis.md Step 2 Q1
 */

/** 弟子 AI 灵智上下文 */
export interface AISoulContext {
  /** 短期记忆（最近 N 条行为/对话），FIFO 上限 10 条 */
  shortTermMemory: string[];
  /** AI 生成的当前目标（如"想突破炼气三层"） */
  currentGoal: string;
  /** 对话历史摘要（压缩后） */
  dialogueSummary: string;
  /** 上次 AI 推理时间戳 */
  lastInferenceTime: number;
}

/** 短期记忆上限 */
export const SHORT_TERM_MEMORY_LIMIT = 10;

/** 创建空的 AI 上下文 */
export function createDefaultAISoulContext(): AISoulContext {
  return {
    shortTermMemory: [],
    currentGoal: '',
    dialogueSummary: '',
    lastInferenceTime: 0,
  };
}

/**
 * 添加记忆到短期记忆（FIFO）
 * 超过上限时移除最早的记录
 */
export function addShortTermMemory(ctx: AISoulContext, memory: string): void {
  ctx.shortTermMemory.push(memory);
  if (ctx.shortTermMemory.length > SHORT_TERM_MEMORY_LIMIT) {
    ctx.shortTermMemory.shift();
  }
}
