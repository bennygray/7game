/**
 * 因果规则评估器 — Phase I-alpha
 *
 * 运行时状态：
 * - cooldownMap: Map<string, number> 冷却记录
 * - recentBreakthroughs: Map<string, number> 最近突破记录（C4 用）
 * - consecutiveFailures: Map<string, number> 连续失败计数（C5 用）
 *
 * INV-2: 每次 evaluate() 最多触发 1 个事件
 * INV-3: 所有 Map 为运行时，不持久化
 * INV-6: 条件检查为纯函数，不修改 state
 *
 * @see phaseI-alpha-TDD.md S2.5
 * @see phaseI-alpha-PRD.md §5.1
 */

import type { LiteGameState } from '../shared/types/game-state';
import type { CausalRule } from '../shared/types/causal-event';
import type { EventBus } from './event-bus';
import type { RelationshipMemoryManager } from './relationship-memory-manager';
import type { GoalManager } from './goal-manager';
import type { GameLogger } from '../shared/types/logger';
import { LogCategory } from '../shared/types/logger';
import type { SoulEventType } from '../shared/types/soul';
import { getDiscipleLocation, LOCATION_LABEL } from '../shared/types/encounter';
import {
  CAUSAL_RULE_REGISTRY,
  getRandomCausalMudText,
} from '../shared/data/causal-rule-registry';

export class CausalRuleEvaluator {
  private cooldownMap = new Map<string, number>();
  private recentBreakthroughs = new Map<string, number>();
  private consecutiveFailures = new Map<string, number>();

  /**
   * 主入口：扫描所有弟子，检查 6 条因果规则
   *
   * @param state GameState（只读）
   * @param currentTick 当前 tick
   * @param eventBus 发射 SoulEvent
   * @param logger MUD 日志输出
   * @param relationshipMemoryManager 关系记忆（可选，C4 grudge 检测）
   * @param goalManager 目标管理器（可选，C5 闭关目标赋予）
   * @returns 是否触发了事件
   */
  evaluate(
    state: Readonly<LiteGameState>,
    currentTick: number,
    eventBus: EventBus,
    logger: GameLogger,
    relationshipMemoryManager?: RelationshipMemoryManager,
    goalManager?: GoalManager,
  ): boolean {
    // 按 priority 降序排序
    const sortedRules = [...CAUSAL_RULE_REGISTRY].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const result = this.tryRule(rule, state, currentTick, relationshipMemoryManager);
      if (result) {
        // INV-2: 最多触发 1 个事件 — 匹配后立即 emit + return
        this.fireEvent(
          rule, result, currentTick, state, eventBus, logger, goalManager,
        );
        return true;
      }
    }
    return false;
  }

  /**
   * 记录突破事件（由 auto-breakthrough handler 调用）
   * 用于 C4 嫉妒规则的"最近 50 tick 内突破"追踪
   */
  recordBreakthrough(discipleId: string, tick: number): void {
    this.recentBreakthroughs.set(discipleId, tick);
  }

  /**
   * 记录突破失败（由 auto-breakthrough handler 调用）
   * 用于 C5 连败规则的计数追踪
   */
  recordBreakthroughFailure(discipleId: string): void {
    const count = this.consecutiveFailures.get(discipleId) ?? 0;
    this.consecutiveFailures.set(discipleId, count + 1);
  }

  /**
   * 重置连败计数（突破成功时调用）
   */
  resetBreakthroughFailure(discipleId: string): void {
    this.consecutiveFailures.delete(discipleId);
  }

  // ===== 内部方法 =====

  /**
   * 尝试匹配单条规则
   * @returns 匹配结果（actorId + targetId + location），或 null
   */
  private tryRule(
    rule: CausalRule,
    state: Readonly<LiteGameState>,
    currentTick: number,
    rmManager?: RelationshipMemoryManager,
  ): { actorId: string; targetId: string; location: string } | null {
    switch (rule.triggerType) {
      case 'affinity-threshold':
        return this.checkAffinityThreshold(rule, state, currentTick);
      case 'moral-threshold':
        return this.checkMoralThreshold(rule, state, currentTick);
      case 'relationship-tag':
        return this.checkRelationshipTag(rule, state, currentTick, rmManager);
      case 'consecutive-failure':
        return this.checkConsecutiveFailure(rule, state, currentTick);
      case 'ethos-conflict':
        return this.checkEthosConflict(rule, state, currentTick);
      default:
        return null;
    }
  }

  /** C1/C2: affinity-threshold（pair 规则） */
  private checkAffinityThreshold(
    rule: CausalRule,
    state: Readonly<LiteGameState>,
    currentTick: number,
  ): { actorId: string; targetId: string; location: string } | null {
    const cond = rule.condition as { affinityMin?: number; affinityMax?: number; requireSameZone?: boolean };

    for (const edge of state.relationships) {
      // 检查 affinity 条件
      if (cond.affinityMin !== undefined && edge.affinity < cond.affinityMin) continue;
      if (cond.affinityMax !== undefined && edge.affinity > cond.affinityMax) continue;

      const source = state.disciples.find(d => d.id === edge.sourceId);
      const target = state.disciples.find(d => d.id === edge.targetId);
      if (!source || !target) continue;

      // 同地检查
      if (cond.requireSameZone) {
        const locA = getDiscipleLocation(source.behavior);
        const locB = getDiscipleLocation(target.behavior);
        if (locA !== locB) continue;
      }

      // 冷却检查
      const cooldownKey = `${rule.id}:${source.id}:${target.id}`;
      if (this.isOnCooldown(cooldownKey, currentTick, rule.cooldownTicks)) continue;

      const location = getDiscipleLocation(source.behavior);
      return { actorId: source.id, targetId: target.id, location };
    }
    return null;
  }

  /** C3: moral-threshold（solo 规则） */
  private checkMoralThreshold(
    rule: CausalRule,
    state: Readonly<LiteGameState>,
    currentTick: number,
  ): { actorId: string; targetId: string; location: string } | null {
    const cond = rule.condition as { goodEvilMax: number; minSpiritStones: number };

    for (const d of state.disciples) {
      if (!d.moral) continue;
      if (d.moral.goodEvil > cond.goodEvilMax) continue;
      if (state.spiritStones < cond.minSpiritStones) continue;

      const cooldownKey = `${rule.id}:${d.id}`;
      if (this.isOnCooldown(cooldownKey, currentTick, rule.cooldownTicks)) continue;

      const location = getDiscipleLocation(d.behavior);
      return { actorId: d.id, targetId: '', location };
    }
    return null;
  }

  /** C4: relationship-tag（pair 规则 — B 嫉妒 A 的突破） */
  private checkRelationshipTag(
    rule: CausalRule,
    state: Readonly<LiteGameState>,
    currentTick: number,
    _rmManager?: RelationshipMemoryManager,
  ): { actorId: string; targetId: string; location: string } | null {
    const cond = rule.condition as {
      requiredTag: string;
      recentBreakthroughTicks: number;
      requireSameZone?: boolean;
    };

    // 找到最近有突破的弟子 A
    for (const [aId, btTick] of this.recentBreakthroughs) {
      if (currentTick - btTick > cond.recentBreakthroughTicks) continue;

      const discipleA = state.disciples.find(d => d.id === aId);
      if (!discipleA) continue;

      // 找到 B→A 有 rival 标签的弟子 B
      for (const edge of state.relationships) {
        if (edge.targetId !== aId) continue;
        if (!edge.tags.includes(cond.requiredTag as 'rival')) continue;

        const discipleB = state.disciples.find(d => d.id === edge.sourceId);
        if (!discipleB) continue;

        // 同地检查
        if (cond.requireSameZone) {
          const locA = getDiscipleLocation(discipleA.behavior);
          const locB = getDiscipleLocation(discipleB.behavior);
          if (locA !== locB) continue;
        }

        // 冷却检查（actorId = B 嫉妒者，targetId = A 被嫉妒者）
        const cooldownKey = `${rule.id}:${discipleB.id}:${discipleA.id}`;
        if (this.isOnCooldown(cooldownKey, currentTick, rule.cooldownTicks)) continue;

        const location = getDiscipleLocation(discipleB.behavior);
        return { actorId: discipleB.id, targetId: discipleA.id, location };
      }
    }
    return null;
  }

  /** C5: consecutive-failure（solo 规则） */
  private checkConsecutiveFailure(
    rule: CausalRule,
    state: Readonly<LiteGameState>,
    currentTick: number,
  ): { actorId: string; targetId: string; location: string } | null {
    const cond = rule.condition as { minFailures: number; maxAggressive: number };

    for (const d of state.disciples) {
      const failures = this.consecutiveFailures.get(d.id) ?? 0;
      if (failures < cond.minFailures) continue;
      if (d.personality.aggressive > cond.maxAggressive) continue;

      const cooldownKey = `${rule.id}:${d.id}`;
      if (this.isOnCooldown(cooldownKey, currentTick, rule.cooldownTicks)) continue;

      const location = getDiscipleLocation(d.behavior);
      return { actorId: d.id, targetId: '', location };
    }
    return null;
  }

  /** C6: ethos-conflict（solo 规则） */
  private checkEthosConflict(
    rule: CausalRule,
    state: Readonly<LiteGameState>,
    currentTick: number,
  ): { actorId: string; targetId: string; location: string } | null {
    const cond = rule.condition as { minEthosGap: number };

    for (const d of state.disciples) {
      if (!d.moral) continue;
      const gap = Math.abs(state.sect.ethos - d.moral.goodEvil);
      if (gap < cond.minEthosGap) continue;

      const cooldownKey = `${rule.id}:${d.id}`;
      if (this.isOnCooldown(cooldownKey, currentTick, rule.cooldownTicks)) continue;

      const location = getDiscipleLocation(d.behavior);
      return { actorId: d.id, targetId: '', location };
    }
    return null;
  }

  /** 冷却检查 */
  private isOnCooldown(key: string, currentTick: number, cooldownTicks: number): boolean {
    const lastFire = this.cooldownMap.get(key);
    if (lastFire === undefined) return false;
    return currentTick - lastFire < cooldownTicks;
  }

  /** 触发事件：emit SoulEvent + 记录冷却 + 输出 MUD + C5 副效果 */
  private fireEvent(
    rule: CausalRule,
    result: { actorId: string; targetId: string; location: string },
    currentTick: number,
    state: Readonly<LiteGameState>,
    eventBus: EventBus,
    logger: GameLogger,
    goalManager?: GoalManager,
  ): void {
    // 记录冷却
    const cooldownKey = result.targetId
      ? `${rule.id}:${result.actorId}:${result.targetId}`
      : `${rule.id}:${result.actorId}`;
    this.cooldownMap.set(cooldownKey, currentTick);

    // Emit SoulEvent
    eventBus.emit({
      type: rule.resultEventType as SoulEventType,
      actorId: result.actorId,
      timestamp: currentTick,
      metadata: {
        ruleId: rule.id,
        severity: rule.resultSeverity,
        targetId: result.targetId || undefined,
        location: result.location,
      },
    });

    // MUD 日志
    const actor = state.disciples.find(d => d.id === result.actorId);
    const target = state.disciples.find(d => d.id === result.targetId);
    const locationLabel = LOCATION_LABEL[result.location as keyof typeof LOCATION_LABEL] ?? result.location;
    const mudText = getRandomCausalMudText(
      rule.id,
      actor?.name ?? '某弟子',
      target?.name ?? '',
      locationLabel,
    );
    logger.info(LogCategory.WORLD, 'causal-evaluator', mudText);

    // C5 副效果：赋予闭关目标
    if (rule.id === 'CR-05' && goalManager) {
      goalManager.assignGoal(
        state as LiteGameState,
        result.actorId,
        'seclusion',
        {},
        currentTick,
        true, // isEventDriven
      );
    }
  }
}
