/**
 * 弟子间对话系统 — 类型定义
 *
 * Phase D: AI 深化，弟子间旁观评论 + 双向对话。
 *
 * @see phaseD-TDD.md Step 2.1
 * @see Story #4
 */

import type { DiscipleBehavior, PersonalityTraits } from './game-state';

// ===== 对话触发 =====

/** 对话触发事件 — 由引擎从 Intent 执行结果中提取 */
export interface DialogueTrigger {
  /** 触发类型 */
  type: 'behavior-end';
  /** 事件发起弟子 ID */
  sourceId: string;
  /** 事件描述（用于 AI prompt 上下文） */
  eventDescription: string;
  /** 结束的行为 */
  behavior: DiscipleBehavior;
  /** 行为结果关键词 */
  outcomeTag: string;
}

/** 有效的 outcomeTag 值 */
export type DialogueOutcomeTag =
  | 'alchemy-success'
  | 'alchemy-fail'
  | 'harvest'
  | 'meditation'
  | 'explore-return';

// ===== 对话轮次 =====

/** 单轮对话 */
export interface DialogueRound {
  /** 说话弟子 ID */
  speakerId: string;
  /** 台词内容 */
  line: string;
  /** 轮次序号（1=旁观评论, 2=原弟子回应） */
  round: 1 | 2;
}

// ===== 完整对话 =====

/** 一次完整对话交换（含触发事件 + 最多 2 轮） */
export interface DialogueExchange {
  /** 触发事件的弟子 ID */
  triggerId: string;
  /** 旁观评论弟子 ID */
  responderId: string;
  /** 触发事件 */
  trigger: DialogueTrigger;
  /** 对话轮次（最多 2 轮） */
  rounds: DialogueRound[];
  /** 对话时间戳 */
  timestamp: number;
}

// ===== AI 请求 =====

/** 弟子上下文（简化，用于 AI 请求） */
export interface DiscipleContext {
  id: string;
  name: string;
  personality: PersonalityTraits;
  personalityName: string;
  starRating: number;
  realm: number;
  subRealm: number;
}

/** 对话请求（发送给 LLMAdapter） */
export interface DialogueRequest {
  /** 事件发起弟子 */
  source: DiscipleContext;
  /** 旁观评论弟子 */
  responder: DiscipleContext;
  /** 触发事件 */
  triggerEvent: DialogueTrigger;
  /** 发起弟子的短期记忆 */
  sourceMemory: string[];
  /** 旁观弟子的短期记忆 */
  responderMemory: string[];
}
