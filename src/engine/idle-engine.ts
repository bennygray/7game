/**
 * 修炼引擎 — 核心 Tick 循环
 *
 * 每秒执行一次 tick，更新灵气/悟性/灵石。
 * 管理仙历时间推进和弟子行为树。
 *
 * Phase B-α: 新增 step 6.5 灵田每 tick 生长推进
 * Phase C: 新增修速丹倒计时 + 自动服丹 + 自动突破
 *
 * CR-A1: 突破冷却防竞态
 * CR-B3: 修速丹自动服用移到灵气产出之后（1 tick 空窗）
 *
 * @see Story #2, Story #4, Story #5 ACs
 */

import type { LiteGameState } from '../shared/types/game-state';
import {
  calculateAuraRate,
  calculateComprehensionRate,
  calculateSpiritStoneRate,
} from '../shared/formulas/idle-formulas';
import { getSpiritVeinDensity } from '../shared/data/realm-table';
import { tickDisciple, type DiscipleBehaviorEvent } from './behavior-tree';
import { tickFarm } from './farm-engine';
import {
  tickBoostCountdown,
  tickCultivateBoost,
  tickBreakthroughAid,
  getBoostMultiplier,
} from './pill-consumer';
import {
  shouldAutoBreakthrough,
  executeBreakthrough,
  BREAKTHROUGH_COOLDOWN_TICKS,
  type BreakthroughLog,
} from './breakthrough-engine';

/** Tick 回调：引擎每次 tick 后通知上层 */
export type TickCallback = (state: LiteGameState, deltaS: number) => void;

/** 突破事件回调（Phase C: 概率模型） */
export type BreakthroughCallback = (
  state: LiteGameState,
  log: BreakthroughLog,
) => void;

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

  /** Tick 间隔（毫秒） */
  static readonly TICK_INTERVAL_MS = 1000;

  /** 仙历推进速率：降低 10× 以增加沉浸感（CR-08） */
  static readonly WORLD_TIME_PER_SECOND = 0.5 / 30 / 10;

  constructor(state: LiteGameState) {
    this.state = state;
    this.lastTickTime = Date.now();
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

  /** 核心 tick — 每秒执行 */
  private tick(): void {
    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    const deltaS = deltaMs / 1000;
    this.lastTickTime = now;

    const systemLogs: string[] = [];

    // === Phase C Step 1: 修速丹 buff 倒计时 ===
    const boostExpireLog = tickBoostCountdown(this.state, deltaS);
    if (boostExpireLog) systemLogs.push(boostExpireLog);

    // === Phase C Step 2: 自动服破镜丹（在灵气产出前，确保突破前 buff 生效） ===
    const aidLog = tickBreakthroughAid(this.state);
    if (aidLog) systemLogs.push(`[系统] ${aidLog.detail}`);

    // === Phase C Step 3: 自动突破检测（CR-A1: 含冷却） ===
    if (this.breakthroughCooldown > 0) {
      this.breakthroughCooldown--;
    } else if (shouldAutoBreakthrough(this.state)) {
      const btLog = executeBreakthrough(this.state);
      this.breakthroughCooldown = BREAKTHROUGH_COOLDOWN_TICKS;
      // 回灵丹日志
      for (const hl of btLog.healLogs) {
        systemLogs.push(`[系统] ${hl.detail}`);
      }
      // 突破结果通知
      this.onBreakthrough?.(this.state, btLog);
    }

    // === 1. 灵气产出（含灵脉密度 + 修速丹加速） ===
    const density = getSpiritVeinDensity(this.state.realm, this.state.subRealm);
    const boostMul = getBoostMultiplier(this.state);
    const auraRate = calculateAuraRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation,
      density, boostMul,
    );
    const auraGain = auraRate * deltaS;
    this.state.aura += auraGain;

    // 2. 悟性产出（不含灵脉/修速丹 — Fix B）
    const compRate = calculateComprehensionRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation
    );
    this.state.comprehension += compRate * deltaS;

    // 3. 灵石副产（不含灵脉/修速丹 — Fix B）
    const stoneRate = calculateSpiritStoneRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation
    );
    this.state.spiritStones += stoneRate * deltaS;

    // 4. 仙历推进
    this.state.inGameWorldTime += deltaS * IdleEngine.WORLD_TIME_PER_SECOND;

    // 5. 更新统计
    this.state.lifetimeStats.totalAuraEarned += auraGain;
    if (this.state.subRealm > this.state.lifetimeStats.highestSubRealm) {
      this.state.lifetimeStats.highestSubRealm = this.state.subRealm;
    }

    // 6. 更新在线时间
    this.state.lastOnlineTime = now;

    // 6.5 灵田生长推进 (Phase B-α)
    const farmLogs: string[] = [];
    for (const disciple of this.state.disciples) {
      const logs = tickFarm(disciple, this.state);
      farmLogs.push(...logs);
    }
    if (farmLogs.length > 0) {
      this.onFarmTickLog?.(farmLogs);
    }

    // 7. 弟子行为树 tick
    const allEvents: DiscipleBehaviorEvent[] = [];
    for (const disciple of this.state.disciples) {
      const events = tickDisciple(disciple, deltaS, this.state);
      allEvents.push(...events);
    }
    if (allEvents.length > 0) {
      this.onDiscipleBehaviorChange?.(allEvents);
    }

    // === CR-B3: 自动服修速丹移到灵气产出之后（buff 到期后有 1 tick 空窗） ===
    const boostLog = tickCultivateBoost(this.state);
    if (boostLog) systemLogs.push(`[系统] ${boostLog.detail}`);

    // Phase C: 系统日志通知
    if (systemLogs.length > 0) {
      this.onSystemLog?.(systemLogs);
    }

    // 8. 通知上层
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
}
