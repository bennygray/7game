/**
 * Phase I-beta: 社交引擎
 *
 * 职责：社交邀约扫描 + 冷静期管理 + attraction 限速 + crush 自动标记
 * 唯一写入 RelationshipEdge.status 的模块（ADR-Iβ-01）
 *
 * @see phaseI-beta-TDD.md §3.2
 * @see phaseI-beta-PRD.md §4.3~§4.7
 */

import type { LiteGameState, RelationshipEdge, Gender, Orientation } from '../shared/types/game-state';

// ===== 常量 =====

/** crush 自动标记阈值 */
const CRUSH_THRESHOLD = 50;
/** crush 自动解除阈值 */
const CRUSH_REMOVE_THRESHOLD = 30;

/** 邀约前置条件阈值 */
export const INVITATION_THRESHOLDS = {
  lover: { closeness: 60, attraction: 70 },
  'sworn-sibling': { closeness: 80, trust: 60 },
  nemesis: { closeness: -60, trust: -40 },
} as const;

/** 邀约失败后果 */
export const INVITATION_FAILURE_DELTAS = {
  lover: { initiator: { closeness: -10, attraction: -15, trust: -5 }, target: { closeness: -5, attraction: 0, trust: 0 } },
  'sworn-sibling': { initiator: { closeness: -10, attraction: 0, trust: -15 }, target: { closeness: -5, attraction: 0, trust: 0 } },
  nemesis: { initiator: { closeness: 5, attraction: 0, trust: 0 }, target: { closeness: 0, attraction: 0, trust: 0 } },
} as const;

/** 邀约成功后果 */
export const INVITATION_SUCCESS_DELTAS = {
  lover: { closeness: 10, attraction: 10, trust: 10 },
  'sworn-sibling': { closeness: 15, attraction: 0, trust: 20 },
  nemesis: { closeness: -15, attraction: 0, trust: -20 },
} as const;

/** 邀约冷静期（ticks） */
export const INVITATION_COOLDOWNS = {
  lover: 1800,
  'sworn-sibling': 1200,
  nemesis: 900,
} as const;

/** 解除条件 */
export const DISSOLUTION_CONDITIONS = {
  lover: { closenessBelow: 20, trustBelow: 0 },
  'sworn-sibling': { trustBelow: 20 },
  nemesis: { closenessAbove: 0, trustAbove: 20 },
} as const;

/** 解除后果 */
export const DISSOLUTION_DELTAS = {
  lover: { closeness: -20, attraction: -20, trust: -15 },
  'sworn-sibling': { closeness: -25, attraction: 0, trust: -30 },
  nemesis: { closeness: 10, attraction: 0, trust: 10 },
} as const;

/** Attraction 限速：每对每 300 ticks 上限 +5 */
const ATTRACTION_RATE_LIMIT = 5;
const ATTRACTION_RATE_WINDOW = 300;

// ===== 内部类型 =====

interface CooldownEntry {
  pairKey: string;
  relationType: 'lover' | 'sworn-sibling' | 'nemesis';
  expiresAtTick: number;
}

interface AttractionAccumulator {
  pairKey: string;
  windowStartTick: number;
  accumulated: number;
}

/** 社交扫描结果 */
export interface SocialScanResult {
  type: 'invitation' | 'dissolution' | 'crush-mark' | 'crush-remove';
  relationType: 'lover' | 'sworn-sibling' | 'nemesis' | 'crush';
  sourceId: string;
  targetId: string;
}

// ===== SocialEngine =====

export class SocialEngine {
  private cooldowns: CooldownEntry[] = [];
  private attractionAccumulators: Map<string, AttractionAccumulator> = new Map();

  /**
   * 性取向有效吸引力权重
   */
  static effectiveAttraction(sourceOrientation: Orientation, targetGender: Gender): number {
    if (targetGender === 'male') return sourceOrientation.maleAttraction;
    if (targetGender === 'female') return sourceOrientation.femaleAttraction;
    return 0; // unknown gender → no attraction
  }

  /**
   * 扫描所有弟子对，检查 crush 自动标记/解除 + 邀约/解除条件
   */
  scanForSocialEvents(state: LiteGameState, currentTick: number): SocialScanResult[] {
    const results: SocialScanResult[] = [];

    for (const edge of state.relationships) {
      // --- crush 自动标记/解除（不需要 AI） ---
      if (edge.attraction >= CRUSH_THRESHOLD && edge.status !== 'crush' && edge.status !== 'lover') {
        edge.status = 'crush';
        results.push({ type: 'crush-mark', relationType: 'crush', sourceId: edge.sourceId, targetId: edge.targetId });
      } else if (edge.status === 'crush' && edge.attraction < CRUSH_REMOVE_THRESHOLD) {
        edge.status = null;
        results.push({ type: 'crush-remove', relationType: 'crush', sourceId: edge.sourceId, targetId: edge.targetId });
      }
    }

    // --- 邀约条件扫描 ---
    const disciples = state.disciples;
    for (let i = 0; i < disciples.length; i++) {
      for (let j = i + 1; j < disciples.length; j++) {
        const a = disciples[i];
        const b = disciples[j];
        const ab = state.relationships.find(r => r.sourceId === a.id && r.targetId === b.id);
        const ba = state.relationships.find(r => r.sourceId === b.id && r.targetId === a.id);
        if (!ab || !ba) continue;

        // lover 邀约检查
        this.checkInvitation(ab, ba, a, b, 'lover', currentTick, results, state);
        // sworn-sibling 邀约检查
        this.checkInvitation(ab, ba, a, b, 'sworn-sibling', currentTick, results, state);
        // nemesis 邀约检查
        this.checkInvitation(ab, ba, a, b, 'nemesis', currentTick, results, state);

        // --- 解除条件扫描 ---
        this.checkDissolution(ab, ba, 'lover', currentTick, results);
        this.checkDissolution(ab, ba, 'sworn-sibling', currentTick, results);
        this.checkDissolution(ab, ba, 'nemesis', currentTick, results);
      }
    }

    return results;
  }

  /**
   * 应用 attraction 限速（PRD §5.1, TDD §3.2）
   */
  applyAttractionRateLimit(pairKey: string, delta: number, currentTick: number): number {
    if (delta <= 0) return delta; // 负向 delta 不受限速
    let acc = this.attractionAccumulators.get(pairKey);
    if (!acc || currentTick - acc.windowStartTick >= ATTRACTION_RATE_WINDOW) {
      acc = { pairKey, windowStartTick: currentTick, accumulated: 0 };
    }
    const remaining = Math.max(0, ATTRACTION_RATE_LIMIT - acc.accumulated);
    const clamped = Math.min(delta, remaining);
    acc.accumulated += clamped;
    this.attractionAccumulators.set(pairKey, acc);
    return clamped;
  }

  /** 检查冷静期 */
  isOnCooldown(pairKey: string, type: string, currentTick: number): boolean {
    return this.cooldowns.some(c =>
      c.pairKey === pairKey && c.relationType === type && c.expiresAtTick > currentTick,
    );
  }

  /** 设置冷静期 */
  setCooldown(pairKey: string, type: 'lover' | 'sworn-sibling' | 'nemesis', durationTicks: number, currentTick: number): void {
    // 移除已过期的同类冷却
    this.cooldowns = this.cooldowns.filter(c =>
      !(c.pairKey === pairKey && c.relationType === type),
    );
    this.cooldowns.push({ pairKey, relationType: type, expiresAtTick: currentTick + durationTicks });
  }

  /** 清理过期条目 */
  cleanup(currentTick: number): void {
    this.cooldowns = this.cooldowns.filter(c => c.expiresAtTick > currentTick);
    for (const [key, acc] of this.attractionAccumulators) {
      if (currentTick - acc.windowStartTick >= ATTRACTION_RATE_WINDOW * 2) {
        this.attractionAccumulators.delete(key);
      }
    }
  }

  // ===== 私有方法 =====

  private makeSortedPairKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  private checkInvitation(
    ab: RelationshipEdge, ba: RelationshipEdge,
    a: { id: string }, b: { id: string },
    type: 'lover' | 'sworn-sibling' | 'nemesis',
    currentTick: number,
    results: SocialScanResult[],
    state: LiteGameState,
  ): void {
    // 已有该关系 → 跳过
    if (ab.status === type || ba.status === type) return;

    const pairKey = this.makeSortedPairKey(a.id, b.id);
    if (this.isOnCooldown(pairKey, type, currentTick)) return;

    const thresholds = INVITATION_THRESHOLDS[type];

    // 检查 A→B 方向是否满足条件
    let initiatorEdge: RelationshipEdge | null = null;
    let initiatorId: string | null = null;
    let targetId: string | null = null;

    if (this.meetsThreshold(ab, thresholds, type, state)) {
      initiatorEdge = ab;
      initiatorId = a.id;
      targetId = b.id;
    } else if (this.meetsThreshold(ba, thresholds, type, state)) {
      initiatorEdge = ba;
      initiatorId = b.id;
      targetId = a.id;
    }

    if (initiatorEdge && initiatorId && targetId) {
      results.push({ type: 'invitation', relationType: type, sourceId: initiatorId, targetId });
    }
  }

  private meetsThreshold(
    edge: RelationshipEdge,
    thresholds: Record<string, number>,
    type: 'lover' | 'sworn-sibling' | 'nemesis',
    state: LiteGameState,
  ): boolean {
    if (type === 'lover') {
      // 需要性取向兼容
      const source = state.disciples.find(d => d.id === edge.sourceId);
      const target = state.disciples.find(d => d.id === edge.targetId);
      if (!source || !target) return false;
      const effectiveAttr = SocialEngine.effectiveAttraction(source.orientation, target.gender);
      if (effectiveAttr === 0) return false;
      return edge.closeness >= thresholds.closeness && edge.attraction >= thresholds.attraction;
    } else if (type === 'sworn-sibling') {
      return edge.closeness >= thresholds.closeness && edge.trust >= thresholds.trust;
    } else {
      // nemesis: closeness ≤ threshold (negative), trust ≤ threshold (negative)
      return edge.closeness <= thresholds.closeness && edge.trust <= thresholds.trust;
    }
  }

  private checkDissolution(
    ab: RelationshipEdge, ba: RelationshipEdge,
    type: 'lover' | 'sworn-sibling' | 'nemesis',
    currentTick: number,
    results: SocialScanResult[],
  ): void {
    // 只检查已有该关系的对子
    if (ab.status !== type && ba.status !== type) return;

    const pairKey = this.makeSortedPairKey(ab.sourceId, ab.targetId);
    if (this.isOnCooldown(pairKey, type, currentTick)) return;

    const conds = DISSOLUTION_CONDITIONS[type];
    let shouldDissolve = false;

    if (type === 'lover') {
      const c = conds as typeof DISSOLUTION_CONDITIONS.lover;
      shouldDissolve = ab.closeness < c.closenessBelow || ab.trust < c.trustBelow
                    || ba.closeness < c.closenessBelow || ba.trust < c.trustBelow;
    } else if (type === 'sworn-sibling') {
      const c = conds as typeof DISSOLUTION_CONDITIONS['sworn-sibling'];
      shouldDissolve = ab.trust < c.trustBelow || ba.trust < c.trustBelow;
    } else {
      const c = conds as typeof DISSOLUTION_CONDITIONS.nemesis;
      shouldDissolve = (ab.closeness > c.closenessAbove && ab.trust > c.trustAbove)
                    || (ba.closeness > c.closenessAbove && ba.trust > c.trustAbove);
    }

    if (shouldDissolve) {
      results.push({ type: 'dissolution', relationType: type, sourceId: ab.sourceId, targetId: ab.targetId });
    }
  }
}
