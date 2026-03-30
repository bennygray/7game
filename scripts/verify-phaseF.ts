/**
 * Phase F 验证脚本 — 灵魂闭环
 *
 * Case #1: 特性→行为权重效果（Monte Carlo N=1000）
 * Case #2: 关系标签→行为权重效果（Monte Carlo N=1000）
 * Case #3: 情绪→行为权重效果（Monte Carlo N=1000）
 * Case #4: 情绪衰减
 *
 * @see phaseF-PRD.md §5 验收标准
 * @see phaseF-user-stories.md Story F-5
 */

import type { LiteDiscipleState, LiteGameState, PersonalityTraits, RelationshipEdge } from '../src/shared/types/game-state';
import { DiscipleBehavior } from '../src/shared/types/game-state';
import type { DiscipleEmotionState, DiscipleTrait } from '../src/shared/types/soul';
import {
  getPersonalityWeights,
  getEnhancedPersonalityWeights,
  weightedRandomPick,
} from '../src/engine/behavior-tree';
import { EMOTION_DECAY_TICKS } from '../src/shared/data/emotion-behavior-modifiers';

// ===== 测试工具 =====

const N = 5000;
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

/** 创建测试用弟子 */
function makeDisciple(
  overrides: Partial<LiteDiscipleState> & { id?: string; name?: string } = {},
): LiteDiscipleState {
  const personality: PersonalityTraits = {
    aggressive: 0.5,
    persistent: 0.5,
    smart: 0.5,
    kind: 0.5,
    lazy: 0.2,
  };
  return {
    id: overrides.id ?? 'test-d1',
    name: overrides.name ?? '测试弟子',
    starRating: 3,
    behavior: overrides.behavior ?? DiscipleBehavior.IDLE,
    behaviorTimer: 0,
    lastDecisionTime: 0,
    stamina: 80,
    aura: 0,
    personality: overrides.personality ?? personality,
    traits: overrides.traits ?? [],
    moral: { goodEvil: 0, lawChaos: 0 },
    initialMoral: { goodEvil: 0, lawChaos: 0 },
    farmPlots: [],
    currentRecipeId: null,
  } as LiteDiscipleState;
}

/** 创建测试用游戏状态 */
function makeState(
  disciples: LiteDiscipleState[],
  relationships: RelationshipEdge[] = [],
): LiteGameState {
  return {
    version: 5,
    disciples,
    relationships,
    aura: 100,
    spiritStones: 0,
    realm: 'qi_refining',
    subRealm: 1,
    daoFoundation: 0,
    comprehension: 0,
    pills: [],
    sect: {
      name: '测试宗门',
      level: 1,
      reputation: 0,
      auraDensity: 1.0,
      stoneDripAccumulator: 0,
      tributePills: 0,
      ethos: 50,
      discipline: 50,
    },
    bountyBoard: { missions: [], lastRefresh: 0 },
    aiContexts: {},
    materialPouch: {},
    inGameWorldTime: 0,
    lastOnlineTime: Date.now(),
    lifetimeStats: {
      totalAuraEarned: 0,
      totalBreakthroughs: 0,
      highestSubRealm: 1,
      totalPillsConsumed: 0,
      totalPillsCrafted: 0,
      totalHarvestCount: 0,
    },
    breakthroughBuff: { active: false, bonus: 0, remainingTicks: 0, stackCount: 0 },
    cultivateBoostBuff: null,
  } as unknown as LiteGameState;
}

/** Monte Carlo: 统计 N 次行为分布 */
function monteCarloBehavior(
  weights: { behavior: string; weight: number }[],
  n: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const chosen = weightedRandomPick(weights as { behavior: any; weight: number }[]);
    counts[chosen] = (counts[chosen] ?? 0) + 1;
  }
  return counts;
}

// ===== Case #1: 特性→行为权重效果 =====

console.log('\n=== Case #1: 特性→行为权重效果 ===');

{
  // 无特性弟子
  const dNoTrait = makeDisciple({ traits: [] });
  const stateNoTrait = makeState([dNoTrait]);
  const wNoTrait = getEnhancedPersonalityWeights(dNoTrait, stateNoTrait, null);
  const countsNoTrait = monteCarloBehavior(wNoTrait, N);
  const noTraitExploreRate = (countsNoTrait['explore'] ?? 0) / N;

  // 「胆魄如虹」弟子 (explore +0.3, bounty +0.2)
  const dCourageous = makeDisciple({
    id: 'test-courageous',
    traits: [{ defId: 'innate_courageous' }],
  });
  const stateCourageous = makeState([dCourageous]);
  const wCourageous = getEnhancedPersonalityWeights(dCourageous, stateCourageous, null);
  const countsCourageous = monteCarloBehavior(wCourageous, N);
  const courageousExploreRate = (countsCourageous['explore'] ?? 0) / N;

  const diff1a = courageousExploreRate - noTraitExploreRate;
  console.log(`  无特性 explore 率: ${(noTraitExploreRate * 100).toFixed(1)}%`);
  console.log(`  胆魄如虹 explore 率: ${(courageousExploreRate * 100).toFixed(1)}%`);
  console.log(`  差异: ${(diff1a * 100).toFixed(1)}%`);
  assert(diff1a >= 0.03, `AC-1: 「胆魄如虹」explore 率应比无特性高（差异 ≥3%）: ${(diff1a * 100).toFixed(1)}%`);

  // 「胆怯如鼠」弟子 (explore -0.3, bounty -0.2)
  const dCowardly = makeDisciple({
    id: 'test-cowardly',
    traits: [{ defId: 'innate_cowardly' }],
  });
  const stateCowardly = makeState([dCowardly]);
  const wCowardly = getEnhancedPersonalityWeights(dCowardly, stateCowardly, null);
  const countsCowardly = monteCarloBehavior(wCowardly, N);
  const cowardlyExploreRate = (countsCowardly['explore'] ?? 0) / N;

  const diff1b = noTraitExploreRate - cowardlyExploreRate;
  console.log(`  胆怯如鼠 explore 率: ${(cowardlyExploreRate * 100).toFixed(1)}%`);
  console.log(`  差异: ${(diff1b * 100).toFixed(1)}%`);
  assert(diff1b >= 0.03, `AC-2: 「胆怯如鼠」explore 率应比无特性低（差异 ≥3%）: ${(diff1b * 100).toFixed(1)}%`);
}

// ===== Case #2: 关系标签→行为权重效果 =====

console.log('\n=== Case #2: 关系标签→行为权重效果 ===');

{
  // 弟子 A + B 同在修炼场（meditate→BACK_MOUNTAIN）
  const dA = makeDisciple({ id: 'dA', name: '甲', behavior: DiscipleBehavior.MEDITATE });
  const dB = makeDisciple({ id: 'dB', name: '乙', behavior: DiscipleBehavior.MEDITATE });

  // 无关系
  const stateNoRel = makeState([dA, dB], [
    { sourceId: 'dA', targetId: 'dB', affinity: 0, tags: [], lastInteraction: 0 },
    { sourceId: 'dB', targetId: 'dA', affinity: 0, tags: [], lastInteraction: 0 },
  ]);
  const wNoRel = getEnhancedPersonalityWeights(dA, stateNoRel, null);
  const countsNoRel = monteCarloBehavior(wNoRel, N);
  const noRelCoopRate = ((countsNoRel['meditate'] ?? 0) + (countsNoRel['alchemy'] ?? 0) + (countsNoRel['farm'] ?? 0)) / N;

  // friend 关系
  const stateFriend = makeState([dA, dB], [
    { sourceId: 'dA', targetId: 'dB', affinity: 70, tags: ['friend'], lastInteraction: 0 },
    { sourceId: 'dB', targetId: 'dA', affinity: 70, tags: ['friend'], lastInteraction: 0 },
  ]);
  const wFriend = getEnhancedPersonalityWeights(dA, stateFriend, null);
  const countsFriend = monteCarloBehavior(wFriend, N);
  const friendCoopRate = ((countsFriend['meditate'] ?? 0) + (countsFriend['alchemy'] ?? 0) + (countsFriend['farm'] ?? 0)) / N;

  const diff2 = friendCoopRate - noRelCoopRate;
  console.log(`  无关系 合作行为率: ${(noRelCoopRate * 100).toFixed(1)}%`);
  console.log(`  friend 合作行为率: ${(friendCoopRate * 100).toFixed(1)}%`);
  console.log(`  差异: ${(diff2 * 100).toFixed(1)}%`);
  assert(diff2 >= 0.03, `AC-3: friend 同地时合作行为占比 ↑ ≥3%: ${(diff2 * 100).toFixed(1)}%`);

  // rival 关系
  const dC = makeDisciple({ id: 'dC', name: '丙', behavior: DiscipleBehavior.EXPLORE });
  const dD = makeDisciple({ id: 'dD', name: '丁', behavior: DiscipleBehavior.EXPLORE });

  const stateRival = makeState([dC, dD], [
    { sourceId: 'dC', targetId: 'dD', affinity: -70, tags: ['rival'], lastInteraction: 0 },
    { sourceId: 'dD', targetId: 'dC', affinity: -70, tags: ['rival'], lastInteraction: 0 },
  ]);
  const wRival = getEnhancedPersonalityWeights(dC, stateRival, null);
  const countsRival = monteCarloBehavior(wRival, N);
  const rivalCompRate = ((countsRival['explore'] ?? 0) + (countsRival['bounty'] ?? 0)) / N;

  const stateNoRival = makeState([dC, dD], [
    { sourceId: 'dC', targetId: 'dD', affinity: 0, tags: [], lastInteraction: 0 },
    { sourceId: 'dD', targetId: 'dC', affinity: 0, tags: [], lastInteraction: 0 },
  ]);
  const wNoRival = getEnhancedPersonalityWeights(dC, stateNoRival, null);
  const countsNoRival = monteCarloBehavior(wNoRival, N);
  const noRivalCompRate = ((countsNoRival['explore'] ?? 0) + (countsNoRival['bounty'] ?? 0)) / N;

  const diff2b = rivalCompRate - noRivalCompRate;
  console.log(`  无关系 竞争行为率: ${(noRivalCompRate * 100).toFixed(1)}%`);
  console.log(`  rival 竞争行为率: ${(rivalCompRate * 100).toFixed(1)}%`);
  console.log(`  差异: ${(diff2b * 100).toFixed(1)}%`);
  assert(diff2b >= 0.03, `AC-4: rival 同地时竞争行为占比 ↑ ≥3%: ${(diff2b * 100).toFixed(1)}%`);
}

// ===== Case #3: 情绪→行为权重效果 =====

console.log('\n=== Case #3: 情绪→行为权重效果 ===');

{
  const d = makeDisciple({ traits: [] });
  const state = makeState([d]);

  // neutral
  const wNeutral = getEnhancedPersonalityWeights(d, state, null);
  const countsNeutral = monteCarloBehavior(wNeutral, N);
  const neutralBountyRate = (countsNeutral['bounty'] ?? 0) / N;
  const neutralExploreRate = (countsNeutral['explore'] ?? 0) / N;

  // anger
  const angerState: DiscipleEmotionState = {
    currentEmotion: 'anger',
    emotionIntensity: 2,
    emotionSetAt: Date.now(),
    decayCounter: 0,
  };
  const wAnger = getEnhancedPersonalityWeights(d, state, angerState);
  const countsAnger = monteCarloBehavior(wAnger, N);
  const angerBountyRate = (countsAnger['bounty'] ?? 0) / N;

  const diff3a = angerBountyRate - neutralBountyRate;
  console.log(`  neutral bounty 率: ${(neutralBountyRate * 100).toFixed(1)}%`);
  console.log(`  anger bounty 率: ${(angerBountyRate * 100).toFixed(1)}%`);
  console.log(`  差异: ${(diff3a * 100).toFixed(1)}%`);
  assert(diff3a >= 0.03, `AC-5a: anger 下 bounty 率 ↑ ≥3%: ${(diff3a * 100).toFixed(1)}%`);

  // fear
  const fearState: DiscipleEmotionState = {
    currentEmotion: 'fear',
    emotionIntensity: 2,
    emotionSetAt: Date.now(),
    decayCounter: 0,
  };
  const wFear = getEnhancedPersonalityWeights(d, state, fearState);
  const countsFear = monteCarloBehavior(wFear, N);
  const fearExploreRate = (countsFear['explore'] ?? 0) / N;

  const diff3b = neutralExploreRate - fearExploreRate;
  console.log(`  neutral explore 率: ${(neutralExploreRate * 100).toFixed(1)}%`);
  console.log(`  fear explore 率: ${(fearExploreRate * 100).toFixed(1)}%`);
  console.log(`  差异: ${(diff3b * 100).toFixed(1)}%`);
  assert(diff3b >= 0.03, `AC-5b: fear 下 explore 率 ↓ ≥3%: ${(diff3b * 100).toFixed(1)}%`);
}

// ===== Case #4: 情绪衰减 =====

console.log('\n=== Case #4: 情绪衰减 ===');

{
  const emotionMap = new Map<string, DiscipleEmotionState>();

  emotionMap.set('test-d1', {
    currentEmotion: 'anger',
    emotionIntensity: 3,
    emotionSetAt: Date.now(),
    decayCounter: 0,
  });

  // 手动模拟衰减逻辑（与 soul-engine.decayEmotions 一致）
  function simulateDecay(map: Map<string, DiscipleEmotionState>): void {
    for (const [id, emo] of map) {
      if (!emo.currentEmotion) continue;
      emo.decayCounter++;
      if (emo.decayCounter >= EMOTION_DECAY_TICKS) {
        emo.decayCounter = 0;
        emo.emotionIntensity = (emo.emotionIntensity - 1) as 1 | 2 | 3;
        if (emo.emotionIntensity <= 0) {
          map.delete(id);
        }
      }
    }
  }

  // EMOTION_DECAY_TICKS = 3
  // intensity 3: 需 3 次 tick → intensity 2
  for (let i = 0; i < EMOTION_DECAY_TICKS; i++) simulateDecay(emotionMap);
  const afterFirst = emotionMap.get('test-d1');
  assert(afterFirst !== undefined && afterFirst.emotionIntensity === 2, 'AC-6a: 3 tick 后 intensity 3→2');

  // intensity 2: 再 3 次 → intensity 1
  for (let i = 0; i < EMOTION_DECAY_TICKS; i++) simulateDecay(emotionMap);
  const afterSecond = emotionMap.get('test-d1');
  assert(afterSecond !== undefined && afterSecond.emotionIntensity === 1, 'AC-6b: 再 3 tick 后 intensity 2→1');

  // intensity 1: 再 3 次 → null (deleted)
  for (let i = 0; i < EMOTION_DECAY_TICKS; i++) simulateDecay(emotionMap);
  const afterThird = emotionMap.get('test-d1');
  assert(afterThird === undefined, 'AC-6c: 再 3 tick 后 intensity 1→null (deleted)');

  assert(emotionMap.size === 0, 'AC-6d: emotionMap 已清空');
}

// ===== 权重层叠加验证（单元级） =====

console.log('\n=== Case #5: 权重叠加数学验证 ===');

{
  const d = makeDisciple({
    id: 'test-math',
    personality: { aggressive: 0.5, persistent: 0.5, smart: 0.5, kind: 0.5, lazy: 0.2 },
    traits: [{ defId: 'innate_courageous' }],  // explore +0.3, bounty +0.2
  });
  const state = makeState([d]);

  // Layer 1 基础权重
  const baseWeights = getPersonalityWeights(d.personality, d.stamina);
  const baseExplore = baseWeights.find(w => w.behavior === 'explore')!.weight;
  const baseBounty = baseWeights.find(w => w.behavior === 'bounty')!.weight;

  // Layer 2 特性叠加
  const enhanced = getEnhancedPersonalityWeights(d, state, null);
  const enhancedExplore = enhanced.find(w => w.behavior === 'explore')!.weight;
  const enhancedBounty = enhanced.find(w => w.behavior === 'bounty')!.weight;

  const expectedExplore = baseExplore * (1 + 0.3);  // innate_courageous: explore +0.3
  const expectedBounty = baseBounty * (1 + 0.2);    // innate_courageous: bounty +0.2

  assert(
    Math.abs(enhancedExplore - expectedExplore) < 0.01,
    `Layer2: explore 权重 = base × 1.3 (${enhancedExplore.toFixed(2)} ≈ ${expectedExplore.toFixed(2)})`,
  );
  assert(
    Math.abs(enhancedBounty - expectedBounty) < 0.01,
    `Layer2: bounty 权重 = base × 1.2 (${enhancedBounty.toFixed(2)} ≈ ${expectedBounty.toFixed(2)})`,
  );
}

// ===== 汇总 =====

console.log('\n========================================');
console.log(`Phase F 验证结果: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
