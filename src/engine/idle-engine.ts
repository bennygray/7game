/**
 * 修炼引擎 — 核心 Tick 循环
 *
 * 每秒执行一次 tick，更新灵气/悟性/灵石。
 * 管理仙历时间推进。
 *
 * @see Story #2 ACs
 */

import type { LiteGameState } from '../shared/types/game-state';
import {
  calculateAuraRate,
  calculateComprehensionRate,
  calculateSpiritStoneRate,
} from '../shared/formulas/idle-formulas';
import {
  canBreakthrough,
  calculateBreakthroughResult,
} from '../shared/formulas/realm-formulas';

/** Tick 回调：引擎每次 tick 后通知上层 */
export type TickCallback = (state: LiteGameState, deltaS: number) => void;

/** 突破事件回调 */
export type BreakthroughCallback = (
  state: LiteGameState,
  result: { newRealm: number; newSubRealm: number; auraCost: number; requiresTribulation: boolean }
) => void;

export class IdleEngine {
  private state: LiteGameState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number;
  private onTick: TickCallback | null = null;
  private onBreakthrough: BreakthroughCallback | null = null;

  /** Tick 间隔（毫秒） */
  static readonly TICK_INTERVAL_MS = 1000;

  /** 仙历推进速率：1 现实秒 = 0.5 仙历天 → 1 仙历月约 60 秒 */
  static readonly WORLD_TIME_PER_SECOND = 0.5 / 30; // 0.5天/秒 → 按30天1月算

  constructor(state: LiteGameState) {
    this.state = state;
    this.lastTickTime = Date.now();
  }

  /** 注册 tick 回调 */
  setOnTick(cb: TickCallback): void {
    this.onTick = cb;
  }

  /** 注册突破回调 */
  setOnBreakthrough(cb: BreakthroughCallback): void {
    this.onBreakthrough = cb;
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

    // 1. 灵气产出
    const auraRate = calculateAuraRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation
    );
    const auraGain = auraRate * deltaS;
    this.state.aura += auraGain;

    // 2. 悟性产出
    const compRate = calculateComprehensionRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation
    );
    this.state.comprehension += compRate * deltaS;

    // 3. 灵石副产
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

    // 7. 通知上层
    this.onTick?.(this.state, deltaS);
  }

  /**
   * 尝试突破（玩家主动触发）
   *
   * @returns 突破是否成功（或需要天劫）
   */
  tryBreakthrough(): { success: boolean; message: string } {
    if (!canBreakthrough(this.state.realm, this.state.subRealm, this.state.aura)) {
      return { success: false, message: '灵气不足，无法突破' };
    }

    const result = calculateBreakthroughResult(
      this.state.realm, this.state.subRealm, this.state.aura
    );

    if (result.requiresTribulation) {
      // AC4: 炼气圆满需天劫，阻断
      return { success: false, message: '突破需进入天劫（天劫系统待实现）' };
    }

    if (!result.success) {
      return { success: false, message: '突破失败' };
    }

    // 执行突破
    this.state.aura -= result.auraCost;
    this.state.realm = result.newRealm;
    this.state.subRealm = result.newSubRealm;
    this.state.lifetimeStats.breakthroughTotal++;

    this.onBreakthrough?.(this.state, result);

    return {
      success: true,
      message: `突破成功！境界提升至炼气${result.newSubRealm}层，灵气速率 ${result.newBaseAuraRate} 灵/秒`,
    };
  }

  /** 获取当前状态引用 */
  getState(): LiteGameState {
    return this.state;
  }

  /** 获取当前灵气速率 */
  getCurrentAuraRate(): number {
    return calculateAuraRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation
    );
  }
}
