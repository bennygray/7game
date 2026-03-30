/**
 * Storyteller — 世界事件节奏控制器 (Phase F0-β)
 *
 * 职责：
 * 1. 基于张力指数计算事件触发概率
 * 2. 从事件池中按权重抽取事件（含道风亲和度调节）
 * 3. 执行五级漏斗（严重度升级判定）
 * 4. 控制喘息期（Lv.3+ 后静默 N 秒）
 *
 * 不持久化 — ADR-F0β-01：运行时状态，重启重置
 *
 * @see phaseF0-beta-PRD.md §3.3 张力公式
 * @see phaseF0-beta-TDD.md Step 2.1 StorytellerState
 */

import type { LiteGameState } from '../shared/types/game-state';
import type {
  WorldEventDef,
  WorldEventPayload,
  StorytellerState,
  EventSeverity,
} from '../shared/types/world-event';
import { EventSeverity as Sev } from '../shared/types/world-event';
import { WORLD_EVENT_REGISTRY } from '../shared/data/world-event-registry';

// ===== 常量 =====

/** 事件检查间隔（秒） — 30 秒最多触发一次 */
const CHECK_INTERVAL_S = 30;

/** 张力初始值 */
const INITIAL_TENSION = 30;

/** 张力衰减速率（每秒） */
const TENSION_DECAY_PER_S = 0.5;

/** 各严重度的张力贡献 */
const TENSION_GAIN: Record<EventSeverity, number> = {
  [Sev.BREATH]:   2,
  [Sev.RIPPLE]:   5,
  [Sev.SPLASH]:  12,
  [Sev.STORM]:   25,
  [Sev.CALAMITY]: 0,  // F0-β 不触发
};

/** 各严重度事件的基础触发概率 */
const BASE_PROBABILITY: Record<EventSeverity, number> = {
  [Sev.BREATH]:   0.60,
  [Sev.RIPPLE]:   0.30,
  [Sev.SPLASH]:   0.12,
  [Sev.STORM]:    0.03,
  [Sev.CALAMITY]: 0.00,  // F0-β 禁止触发
};

/** Lv.3 风暴后的喘息期（秒） */
const STORM_COOLDOWN_S = 300;

/** 事件历史上限 */
const MAX_HISTORY = 20;

/** 严重度升级概率（10%） */
const ESCALATION_CHANCE = 0.10;

// ===== Storyteller 类 =====

export class Storyteller {
  private state: StorytellerState;
  private accumulator: number = 0;  // tick 累加器

  constructor() {
    this.state = {
      tensionIndex: INITIAL_TENSION,
      lastStormTimestamp: -STORM_COOLDOWN_S,  // 初始不处于喘息期
      eventHistory: [],
    };
  }

  /**
   * 每 tick 调用，累积时间并在间隔到达时尝试触发事件
   *
   * @returns WorldEventPayload 如果成功触发事件，否则 null
   */
  tick(gameState: LiteGameState, deltaS: number): WorldEventPayload | null {
    // 1. 张力自然衰减
    this.state.tensionIndex = clamp(
      this.state.tensionIndex - TENSION_DECAY_PER_S * deltaS,
      0,
      100,
    );

    // 2. 累加器
    this.accumulator += deltaS;
    if (this.accumulator < CHECK_INTERVAL_S) return null;
    this.accumulator -= CHECK_INTERVAL_S;

    // 3. 喘息期检查（Lv.3+ 后静默 N 秒）
    const now = gameState.inGameWorldTime;
    if (now - this.state.lastStormTimestamp < STORM_COOLDOWN_S) return null;

    // 4. 概率骰子
    const roll = Math.random();
    const targetSeverity = this.pickSeverityByRoll(roll);
    if (targetSeverity === null) return null;

    // 5. 过滤有效事件池
    const candidates = WORLD_EVENT_REGISTRY.filter(
      (def) => def.baseSeverity <= targetSeverity && def.condition(gameState),
    );
    if (candidates.length === 0) return null;

    // 6. 加权随机 + 道风调节
    const picked = this.weightedPick(candidates, gameState.sect.ethos);
    if (!picked) return null;

    // 7. 五级漏斗（严重度升级）
    let finalSeverity = picked.baseSeverity;
    if (picked.canEscalate && finalSeverity < Sev.STORM) {
      if (Math.random() < ESCALATION_CHANCE) {
        finalSeverity = (finalSeverity + 1) as EventSeverity;
      }
    }

    // 8. 选择涉事弟子
    const involvedIds = this.pickInvolvedDisciples(
      gameState,
      picked.scope,
    );

    // 9. 构造载荷
    const payload: WorldEventPayload = {
      eventDefId: picked.id,
      severity: finalSeverity,
      scope: picked.scope,
      polarity: picked.polarity,
      involvedDiscipleIds: involvedIds,
      location: picked.scope === 'sect' ? null : '宗门',
      timestamp: now,
    };

    // 10. 更新内部状态
    this.state.tensionIndex = clamp(
      this.state.tensionIndex + TENSION_GAIN[finalSeverity],
      0,
      100,
    );
    if (finalSeverity >= Sev.STORM) {
      this.state.lastStormTimestamp = now;
    }
    this.state.eventHistory.push(payload);
    if (this.state.eventHistory.length > MAX_HISTORY) {
      this.state.eventHistory.shift();
    }

    return payload;
  }

  /**
   * 根据骰子值和张力倍率确定目标严重度
   * 张力越高，高级事件概率"感性"提升
   */
  private pickSeverityByRoll(roll: number): EventSeverity | null {
    const tensionMultiplier = 1 + (this.state.tensionIndex / 100) * 0.5;
    let cumulative = 0;

    // 从高到低检查 STORM → SPLASH → RIPPLE → BREATH
    for (const sev of [Sev.STORM, Sev.SPLASH, Sev.RIPPLE, Sev.BREATH] as EventSeverity[]) {
      const p = BASE_PROBABILITY[sev] * tensionMultiplier;
      cumulative += p;
      if (roll < cumulative) return sev;
    }

    // 骰子超出所有概率区间（概率极低时啥也不发生）
    return null;
  }

  /**
   * 加权随机选择事件，含道风亲和度调节
   *
   * adjustedWeight = def.weight * (1 + def.ethosAffinity.sign * ethos/100 * def.ethosAffinity.factor)
   */
  private weightedPick(
    candidates: readonly WorldEventDef[],
    ethos: number,
  ): WorldEventDef | null {
    const weights = candidates.map((def) => {
      const ethosBonus =
        def.ethosAffinity.sign * (ethos / 100) * def.ethosAffinity.factor;
      return Math.max(0.1, def.weight * (1 + ethosBonus));
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return null;

    let r = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  /**
   * 根据事件范围选择涉事弟子
   */
  private pickInvolvedDisciples(
    gameState: LiteGameState,
    scope: WorldEventPayload['scope'],
  ): string[] {
    const ids = gameState.disciples.map((d) => d.id);
    if (ids.length === 0) return [];

    switch (scope) {
      case 'single':
        return [ids[Math.floor(Math.random() * ids.length)]];
      case 'multi': {
        // 随机选 2 人（不重复）
        if (ids.length < 2) return [ids[0]];
        const shuffled = [...ids].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 2);
      }
      case 'sect':
        return [...ids];
    }
  }

  /** 获取当前张力指数（调试/日志用） */
  getTensionIndex(): number {
    return this.state.tensionIndex;
  }

  /** 获取事件历史（调试/日志用） */
  getEventHistory(): readonly WorldEventPayload[] {
    return this.state.eventHistory;
  }
}

// ===== 工具函数 =====

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
