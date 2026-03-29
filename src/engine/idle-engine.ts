/**
 * 修炼引擎 — 核心 Tick 循环
 *
 * Phase 4 重构: 硬编码 tick() → TickPipeline + TickHandler 模式。
 * Phase D: +对话系统集成 +Logger 集成 +Intent 模式
 * Phase E: +灵魂系统（EventBus + soul-tick + soul-event）
 *
 * Pipeline 执行顺序（10 个 Handler）：
 *   100 BUFF_COUNTDOWN  — boost-countdown: 修速丹 buff 倒计时
 *   200 PRE_PRODUCTION   — breakthrough-aid: 自动服破镜丹
 *   200 PRE_PRODUCTION   — auto-breakthrough: 自动突破检测+执行
 *   300 RESOURCE_PROD    — core-production: 灵气/悟性/灵石/时间/统计（内联）
 *   500 SYSTEM_TICK      — farm-tick: 灵田生长推进
 *   500 SYSTEM_TICK(10)  — soul-tick: 关系衰减 + 道德漂移 + 后天特性（Phase E）
 *   600 DISCIPLE_AI      — disciple-tick: 弟子行为树 tick（Phase D Intent 模式）
 *   625 SOUL_EVAL        — soul-event: 灵魂事件评估（Phase E）
 *   650 DIALOGUE         — dialogue-tick: 弟子间对话触发（Phase D）
 *   700 POST_PRODUCTION  — cultivate-boost: 自动服修速丹
 *
 * CR-A1: 突破冷却防竞态
 * CR-B3: 修速丹自动服用移到灵气产出之后（1 tick 空窗）
 *
 * TD-002: core-production 内联，未来专项重构时拆出
 *
 * @see arch/pipeline.md
 * @see ADR-004: Tick Pipeline Handler 模式
 */

import type { LiteGameState } from '../shared/types/game-state';
import {
  calculateAuraRate,
  calculateComprehensionRate,
  calculateSpiritStoneRate,
} from '../shared/formulas/idle-formulas';
import { getSpiritVeinDensity } from '../shared/data/realm-table';
import type { DiscipleBehaviorEvent } from './behavior-tree';
import { getBoostMultiplier } from './pill-consumer';
import {
  BREAKTHROUGH_COOLDOWN_TICKS,
  type BreakthroughLog,
} from './breakthrough-engine';
import { executeBreakthrough } from './breakthrough-engine';
import { TickPipeline, TickPhase, type TickHandler, type TickContext, type BreakthroughCallback } from './tick-pipeline';
import type { GameLogger } from '../shared/types/logger';
import type { DialogueExchange } from '../shared/types/dialogue';
import { DialogueCoordinator } from './dialogue-coordinator';
import { EventBus } from './event-bus';

// Handler 导入
import { boostCountdownHandler } from './handlers/boost-countdown.handler';
import { breakthroughAidHandler } from './handlers/breakthrough-aid.handler';
import { autoBreakthroughHandler } from './handlers/auto-breakthrough.handler';
import { farmTickHandler } from './handlers/farm-tick.handler';
import { discipleTickHandler } from './handlers/disciple-tick.handler';
import { cultivateBoostHandler } from './handlers/cultivate-boost.handler';
import { dialogueTickHandler } from './handlers/dialogue-tick.handler';
import { soulTickHandler } from './handlers/soul-tick.handler';
import { soulEventHandler } from './handlers/soul-event.handler';

/** Tick 回调：引擎每次 tick 后通知上层 */
export type TickCallback = (state: LiteGameState, deltaS: number) => void;

// BreakthroughCallback 已移至 tick-pipeline.ts（避免循环依赖）
// 重新导出以保持向后兼容
export type { BreakthroughCallback } from './tick-pipeline';

/** 弟子行为变更回调 */
export type DiscipleBehaviorChangeCallback = (events: DiscipleBehaviorEvent[]) => void;

/** 灵田/炼丹 tick 日志回调 */
export type FarmTickLogCallback = (logs: string[]) => void;

/** 丹药/系统日志回调 (Phase C) */
export type SystemLogCallback = (logs: string[]) => void;

/** Phase D: 弟子间对话回调 */
export type DialogueCallback = (exchange: DialogueExchange) => void;

export class IdleEngine {
  private state: LiteGameState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number;
  private onTick: TickCallback | null = null;
  private onBreakthrough: BreakthroughCallback | null = null;
  private onDiscipleBehaviorChange: DiscipleBehaviorChangeCallback | null = null;
  private onFarmTickLog: FarmTickLogCallback | null = null;
  private onSystemLog: SystemLogCallback | null = null;
  private onDialogue: DialogueCallback | null = null;

  /** CR-A1: 突破冷却计数器，>0 时不允许突破 */
  private breakthroughCooldown: number = 0;

  /** Phase D: Logger 引用 */
  private logger: GameLogger;

  /** Phase D: 对话协调器 */
  private dialogueCoordinator: DialogueCoordinator;

  /** Tick Pipeline（Phase 4 重构） */
  private pipeline: TickPipeline;

  /** Tick 间隔（毫秒） */
  static readonly TICK_INTERVAL_MS = 1000;

  /** 仙历推进速率：降低 10× 以增加沉浸感（CR-08） */
  static readonly WORLD_TIME_PER_SECOND = 0.5 / 30 / 10;

  constructor(state: LiteGameState, logger: GameLogger, llmAdapter?: import('../ai/llm-adapter').LLMAdapter) {
    this.state = state;
    this.lastTickTime = Date.now();
    this.logger = logger;

    // Phase D: 初始化对话协调器
    this.dialogueCoordinator = new DialogueCoordinator(llmAdapter ?? null, logger);

    // 初始化 Pipeline 并注册所有 Handler（10 个）
    this.pipeline = new TickPipeline();
    this.pipeline.register(boostCountdownHandler);
    this.pipeline.register(breakthroughAidHandler);
    this.pipeline.register(autoBreakthroughHandler);
    this.pipeline.register(this.createCoreProductionHandler());
    this.pipeline.register(farmTickHandler);
    this.pipeline.register(soulTickHandler);     // Phase E: 500:10 内心周期更新
    this.pipeline.register(discipleTickHandler);
    this.pipeline.register(soulEventHandler);    // Phase E: 625 灵魂事件评估
    this.pipeline.register(dialogueTickHandler);
    this.pipeline.register(cultivateBoostHandler);
  }

  /** 注册 tick 回调 */
  setOnTick(cb: TickCallback): void {
    this.onTick = cb;
  }

  /** 注册突破回调（Phase C: 概率模型） */
  setOnBreakthrough(cb: BreakthroughCallback): void {
    this.onBreakthrough = cb;
  }

  /** 注册弟子行为变更回调 */
  setOnDiscipleBehaviorChange(cb: DiscipleBehaviorChangeCallback): void {
    this.onDiscipleBehaviorChange = cb;
  }

  /** 注册灵田 tick 日志回调 */
  setOnFarmTickLog(cb: FarmTickLogCallback): void {
    this.onFarmTickLog = cb;
  }

  /** 注册系统日志回调（Phase C: 丹药/突破自动日志） */
  setOnSystemLog(cb: SystemLogCallback): void {
    this.onSystemLog = cb;
  }

  /** Phase D: 注册弟子间对话回调 */
  setOnDialogue(cb: DialogueCallback): void {
    this.onDialogue = cb;
  }

  /** 启动引擎 */
  start(): void {
    if (this.intervalId !== null) return;
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => this.tick(), IdleEngine.TICK_INTERVAL_MS);
    console.log('[IdleEngine] 引擎已启动');
  }

  /** 停止引擎 */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[IdleEngine] 引擎已停止');
    }
  }

  /** 是否正在运行 */
  get running(): boolean {
    return this.intervalId !== null;
  }

  /**
   * 核心 tick — 每秒执行
   *
   * Phase 4 重构：委托 TickPipeline 顺序执行所有 Handler，
   * 然后分发回调通知上层。
   */
  private tick(): void {
    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    const deltaS = deltaMs / 1000;
    this.lastTickTime = now;

    // 构建 TickContext
    const ctx: TickContext = {
      state: this.state,
      deltaS,
      systemLogs: [],
      farmLogs: [],
      discipleEvents: [],
      dialogueTriggers: [],
      logger: this.logger,
      onBreakthrough: this.onBreakthrough,
      breakthroughCooldown: this.breakthroughCooldown,
      eventBus: new EventBus(),   // Phase E: 每 tick 创建新实例，生命周期与 tick 绑定
    };

    // 执行 Pipeline（7 个 Handler 按 phase+order 顺序执行）
    this.pipeline.execute(ctx);

    // 回写引擎级状态（TD-001: 通过 ctx 共享的 breakthroughCooldown）
    this.breakthroughCooldown = ctx.breakthroughCooldown;

    // 分发回调通知上层
    if (ctx.farmLogs.length > 0) {
      this.onFarmTickLog?.(ctx.farmLogs);
    }
    if (ctx.discipleEvents.length > 0) {
      this.onDiscipleBehaviorChange?.(ctx.discipleEvents);
    }
    if (ctx.systemLogs.length > 0) {
      this.onSystemLog?.(ctx.systemLogs);
    }

    // Phase D: 处理对话触发（异步，不阻塞 tick）
    if (ctx.dialogueTriggers.length > 0) {
      this.dialogueCoordinator.processTriggers(
        ctx.dialogueTriggers,
        this.state,
        (exchange) => this.onDialogue?.(exchange),
      );
    }

    // 最终通知上层 tick 完成
    this.onTick?.(this.state, deltaS);
  }

  /**
   * 尝试突破（玩家手动触发 bt 命令）
   * Phase C: 改为概率模型，委托 breakthrough-engine
   * CR-A1: 手动突破也设置冷却，防竞态
   */
  tryBreakthrough(): BreakthroughLog {
    const log = executeBreakthrough(this.state);
    this.breakthroughCooldown = BREAKTHROUGH_COOLDOWN_TICKS;
    return log;
  }

  /** 获取当前状态引用 */
  getState(): LiteGameState {
    return this.state;
  }

  /** 获取当前灵气速率（含灵脉密度 + 修速丹） */
  getCurrentAuraRate(): number {
    const density = getSpiritVeinDensity(this.state.realm, this.state.subRealm);
    const boostMul = getBoostMultiplier(this.state);
    return calculateAuraRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation,
      density, boostMul,
    );
  }

  /**
   * 创建核心资源产出 Handler（内联）
   *
   * TD-002: 灵气/悟性/灵石/时间/统计 6 步紧密耦合，
   * 暂保留在 idle-engine.ts 内部，未来专项重构时拆出。
   *
   * 等价于原 idle-engine.ts L158-190 的逻辑。
   */
  private createCoreProductionHandler(): TickHandler {
    return {
      name: 'core-production',
      phase: TickPhase.RESOURCE_PROD,
      order: 0,

      execute: (ctx: TickContext): void => {
        const { state, deltaS } = ctx;

        // 1. 灵气产出（含灵脉密度 + 修速丹加速）
        const density = getSpiritVeinDensity(state.realm, state.subRealm);
        const boostMul = getBoostMultiplier(state);
        const auraRate = calculateAuraRate(
          state.realm, state.subRealm, state.daoFoundation,
          density, boostMul,
        );
        const auraGain = auraRate * deltaS;
        state.aura += auraGain;

        // 2. 悟性产出（不含灵脉/修速丹 — Fix B）
        const compRate = calculateComprehensionRate(
          state.realm, state.subRealm, state.daoFoundation
        );
        state.comprehension += compRate * deltaS;

        // 3. 灵石副产（不含灵脉/修速丹 — Fix B）
        const stoneRate = calculateSpiritStoneRate(
          state.realm, state.subRealm, state.daoFoundation
        );
        state.spiritStones += stoneRate * deltaS;

        // 4. 仙历推进
        state.inGameWorldTime += deltaS * IdleEngine.WORLD_TIME_PER_SECOND;

        // 5. 更新统计
        state.lifetimeStats.totalAuraEarned += auraGain;
        if (state.subRealm > state.lifetimeStats.highestSubRealm) {
          state.lifetimeStats.highestSubRealm = state.subRealm;
        }

        // 6. 更新在线时间
        state.lastOnlineTime = Date.now();
      },
    };
  }
}
