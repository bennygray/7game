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
  /** 突破回调引用（由 IdleEngine 注入） */
  onBreakthrough: BreakthroughCallback | null;
  /** 突破冷却计数器（引擎级共享状态，TD-001） */
  breakthroughCooldown: number;
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
