/**
 * 修炼引擎 — 核心 Tick 循环
 *
 * Phase 4 重构: 硬编码 tick() → TickPipeline + TickHandler 模式。
 *
 * Pipeline 执行顺序（7 个 Handler）：
 *   100 BUFF_COUNTDOWN  — boost-countdown: 修速丹 buff 倒计时
 *   200 PRE_PRODUCTION   — breakthrough-aid: 自动服破镜丹
 *   200 PRE_PRODUCTION   — auto-breakthrough: 自动突破检测+执行
 *   300 RESOURCE_PROD    — core-production: 灵气/悟性/灵石/时间/统计（内联）
 *   500 SYSTEM_TICK      — farm-tick: 灵田生长推进
 *   600 DISCIPLE_AI      — disciple-tick: 弟子行为树 tick
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

// Handler 导入
import { boostCountdownHandler } from './handlers/boost-countdown.handler';
import { breakthroughAidHandler } from './handlers/breakthrough-aid.handler';
import { autoBreakthroughHandler } from './handlers/auto-breakthrough.handler';
import { farmTickHandler } from './handlers/farm-tick.handler';
import { discipleTickHandler } from './handlers/disciple-tick.handler';
import { cultivateBoostHandler } from './handlers/cultivate-boost.handler';

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

export class IdleEngine {
  private state: LiteGameState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number;
  private onTick: TickCallback | null = null;
  private onBreakthrough: BreakthroughCallback | null = null;
  private onDiscipleBehaviorChange: DiscipleBehaviorChangeCallback | null = null;
  private onFarmTickLog: FarmTickLogCallback | null = null;
  private onSystemLog: SystemLogCallback | null = null;

  /** CR-A1: 突破冷却计数器，>0 时不允许突破 */
  private breakthroughCooldown: number = 0;

  /** Tick Pipeline（Phase 4 重构） */
  private pipeline: TickPipeline;

  /** Tick 间隔（毫秒） */
  static readonly TICK_INTERVAL_MS = 1000;

  /** 仙历推进速率：降低 10× 以增加沉浸感（CR-08） */
  static readonly WORLD_TIME_PER_SECOND = 0.5 / 30 / 10;

  constructor(state: LiteGameState) {
    this.state = state;
    this.lastTickTime = Date.now();

    // 初始化 Pipeline 并注册所有 Handler
    this.pipeline = new TickPipeline();
    this.pipeline.register(boostCountdownHandler);
    this.pipeline.register(breakthroughAidHandler);
    this.pipeline.register(autoBreakthroughHandler);
    this.pipeline.register(this.createCoreProductionHandler());
    this.pipeline.register(farmTickHandler);
    this.pipeline.register(discipleTickHandler);
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
      onBreakthrough: this.onBreakthrough,
      breakthroughCooldown: this.breakthroughCooldown,
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
