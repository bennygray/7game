/**
 * Tick Pipeline — Handler 注册 + 排序执行框架
 *
 * Phase 4 重构：将 idle-engine.ts 硬编码 tick() 转为可扩展的 Pipeline 模式。
 *
 * 设计：
 *   - TickPhase 枚举定义执行阶段（间距 100，允许未来插入）
 *   - TickHandler 接口定义单步处理器
 *   - TickContext 传递 tick 上下文给每个 Handler
 *   - TickPipeline 按 phase + order 排序执行所有 Handler
 *
 * @see arch/pipeline.md §2 目标架构
 * @see ADR-004: Tick Pipeline Handler 模式
 */

import type { LiteGameState } from '../shared/types/game-state';
import type { DiscipleBehaviorEvent } from './behavior-tree';
import type { BreakthroughLog } from './breakthrough-engine';
import type { DialogueTrigger } from '../shared/types/dialogue';
import type { GameLogger } from '../shared/types/logger';
import type { EventBus } from './event-bus';
import type { DiscipleEmotionState } from '../shared/types/soul';
import type { AsyncAIBuffer } from './async-ai-buffer';
import type { WorldEventPayload } from '../shared/types/world-event';
import type { RelationshipMemoryManager } from './relationship-memory-manager';
import type { NarrativeSnippetBuilder } from '../ai/narrative-snippet-builder';

/** 突破事件回调（定义在 tick-pipeline 以避免循环依赖） */
export type BreakthroughCallback = (
  state: LiteGameState,
  log: BreakthroughLog,
) => void;

// ===== TickPhase 枚举 =====

/** Tick 阶段常量 — 数值间距 100 允许未来插入 */
export const TickPhase = {
  /** 100: Buff 倒计时（修速丹过期等） */
  BUFF_COUNTDOWN:   100,
  /** 200: 产出前处理（自动服丹、自动突破） */
  PRE_PRODUCTION:   200,
  /** 300: 核心资源产出（灵气/悟性/灵石/时间/统计） */
  RESOURCE_PROD:    300,
  /** 400: 世界状态更新（仙历/在线时间） — 当前合并在 RESOURCE_PROD handler 中 */
  WORLD_UPDATE:     400,
  /** 500: 子系统 tick（灵田等） */
  SYSTEM_TICK:      500,
  /** 600: 弟子 AI 行为树 */
  DISCIPLE_AI:      600,
  /** 605: 世界事件抽取（Phase F0-β）— 弟子行为确定后、碰面前 */
  WORLD_EVENT:      605,
  /** 610: 碰面检定（Phase F0-α）— 弟子行为确定后、灵魂事件评估前 (ADR-F0α-01) */
  ENCOUNTER:        610,
  /** 625: 灵魂事件评估（Phase E）— 弟子 AI 行为决策之后，对话之前 */
  SOUL_EVAL:        625,
  /** 650: 弟子间对话触发（Phase D） */
  DIALOGUE:         650,
  /** 700: 产出后处理（自动服修速丹等） */
  POST_PRODUCTION:  700,
} as const;
export type TickPhase = (typeof TickPhase)[keyof typeof TickPhase];

// ===== TickHandler 接口 =====

/** 单个 Tick Handler */
export interface TickHandler {
  /** Handler 名称（日志/调试用） */
  readonly name: string;
  /** 所属阶段 */
  readonly phase: TickPhase;
  /** 同阶段内排序权重（默认 0，数值小的先执行） */
  readonly order?: number;
  /** 执行逻辑 */
  execute(ctx: TickContext): void;
}

// ===== TickContext 接口 =====

/** Tick 上下文 — 传递给每个 Handler */
export interface TickContext {
  /** 游戏状态引用（可直接修改） */
  state: LiteGameState;
  /** 本次 tick 时间增量（秒） */
  deltaS: number;
  /** 系统日志收集器（丹药/突破等自动事件） */
  systemLogs: string[];
  /** 灵田日志收集器 */
  farmLogs: string[];
  /** 弟子行为事件收集器 */
  discipleEvents: DiscipleBehaviorEvent[];
  /** Phase D: 对话触发收集器 */
  dialogueTriggers: DialogueTrigger[];
  /** Phase D: Logger 引用 */
  logger: GameLogger;
  /** 突破回调引用（由 IdleEngine 注入） */
  onBreakthrough: BreakthroughCallback | null;
  /** 突破冷却计数器（引擎级共享状态，TD-001） */
  breakthroughCooldown: number;
  /** Phase E: 灵魂事件总线 */
  eventBus: EventBus;
  /** Phase F: 弟子情绪运行时状态 (ADR-F-01) */
  emotionMap: Map<string, DiscipleEmotionState>;
  /** Phase G: 异步 AI 缓冲区（fire-and-forget + deferred correction） */
  asyncAIBuffer?: AsyncAIBuffer;
  /** Phase H-γ: 本 tick 触发的 STORM 事件载荷（world-event-tick 设置） */
  pendingStormEvent?: WorldEventPayload;
  /** Phase IJ PoC: 关系记忆管理器（运行时，不持久化） */
  relationshipMemoryManager?: RelationshipMemoryManager;
  /** Phase IJ v3.0: 叙事片段构建器 */
  narrativeSnippetBuilder?: NarrativeSnippetBuilder;
}

// ===== TickPipeline 类 =====

/** Tick Pipeline — 按 phase + order 排序执行所有 Handler */
export class TickPipeline {
  private handlers: TickHandler[] = [];

  /**
   * 注册 Handler
   *
   * 注册后自动排序，确保执行顺序由 phase + order 决定。
   */
  register(handler: TickHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) =>
      a.phase - b.phase || (a.order ?? 0) - (b.order ?? 0)
    );
  }

  /**
   * 按顺序执行所有已注册的 Handler
   */
  execute(ctx: TickContext): void {
    for (const handler of this.handlers) {
      handler.execute(ctx);
    }
  }

  /** 获取已注册的 Handler 列表（调试/测试用） */
  getHandlers(): readonly TickHandler[] {
    return this.handlers;
  }
}
