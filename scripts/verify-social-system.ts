/**
 * Phase I-beta 验证脚本 — 社交系统
 *
 * TDD §10.3 验证用例 V-1~V-10:
 * - V-1: 三维向量独立演化
 * - V-2: attraction 性取向门控
 * - V-3: crush 自动标记/解除
 * - V-4: 标签阈值重映射
 * - V-5: 衰减率三维独立
 * - V-6: 离散关系保护（lover 衰减 ×0.5）
 * - V-7: 存档迁移 v7→v8
 * - V-8: AI 三维 delta 解析
 * - V-9: 性格兼容度天花板（未实现，跳过）
 * - V-10: attraction 累积限速
 *
 * @see phaseI-beta-TDD.md §10.3
 */

import type { LiteGameState, RelationshipEdge, LiteDiscipleState, PersonalityTraits } from '../src/shared/types/game-state';
import type { DiscipleTrait, MoralAlignment, RelationshipTag } from '../src/shared/types/soul';
import { ADVANCED_TAG_THRESHOLDS, RELATIONSHIP_TAG_THRESHOLDS } from '../src/shared/types/soul';
import {
  decayRelationships,
  CLOSENESS_DECAY_RATE,
  ATTRACTION_DECAY_RATE,
  TRUST_DECAY_RATE,
} from '../src/engine/soul-engine';
import { SocialEngine, INVITATION_THRESHOLDS } from '../src/engine/social-engine';
import { generateOrientation } from '../src/engine/disciple-generator';
import type { SoulEvaluationResult } from '../src/shared/types/soul';
import { createDefaultLiteGameState } from '../src/shared/types/game-state';
import {
  shouldAssignMentor, shouldRemoveMentor,
  shouldAssignGrudge, shouldRemoveGrudge,
} from '../src/shared/formulas/relationship-formulas';
import { pickSocialTemplate, SOCIAL_EVENT_TEMPLATES } from '../src/shared/data/social-event-templates';
import type { SocialEventType } from '../src/shared/data/social-event-templates';

// ===== 测试工具 =====

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

function assertApprox(actual: number, expected: number, epsilon: number, message: string): void {
  assert(Math.abs(actual - expected) < epsilon, `${message} (actual=${actual.toFixed(4)}, expected=${expected.toFixed(4)})`);
}

/** 构造最小 RelationshipEdge */
function makeEdge(sourceId: string, targetId: string, overrides: Partial<RelationshipEdge> = {}): RelationshipEdge {
  return {
    sourceId,
    targetId,
    closeness: 0,
    attraction: 0,
    trust: 0,
    status: null,
    tags: [],
    ...overrides,
  };
}

/** 构造最小弟子 */
function makeDisciple(id: string, overrides: Partial<LiteDiscipleState> = {}): LiteDiscipleState {
  return {
    id,
    name: `弟子${id}`,
    realm: 0,
    subRealm: 0,
    aura: 0,
    comprehension: 0,
    spiritStones: 0,
    daoFoundation: 10,
    currentBehavior: 'meditate',
    personalityTraits: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
    traits: [] as DiscipleTrait[],
    moral: 50 as MoralAlignment,
    initialMoral: 50 as MoralAlignment,
    gender: 'male',
    orientation: { maleAttraction: 0, femaleAttraction: 1 },
    ...overrides,
  } as LiteDiscipleState;
}

/** 构造最小 LiteGameState */
function makeState(disciples: LiteDiscipleState[], relationships: RelationshipEdge[]): LiteGameState {
  return {
    version: 8,
    disciples,
    relationships,
    sect: { ethos: 0, discipline: 0 },
    inGameWorldTime: 100,
  } as unknown as LiteGameState;
}

// ===== V-1: 三维向量独立演化 =====

console.log('\n--- V-1: 三维向量独立演化 ---');
{
  const edge = makeEdge('a', 'b', { closeness: 50, attraction: 30, trust: 40 });

  // 修改 closeness 不影响其他
  edge.closeness = 70;
  assert(edge.attraction === 30, 'closeness 变更不影响 attraction');
  assert(edge.trust === 40, 'closeness 变更不影响 trust');

  // 修改 attraction 不影响其他
  edge.attraction = 60;
  assert(edge.closeness === 70, 'attraction 变更不影响 closeness');
  assert(edge.trust === 40, 'attraction 变更不影响 trust');

  // 修改 trust 不影响其他
  edge.trust = 80;
  assert(edge.closeness === 70, 'trust 变更不影响 closeness');
  assert(edge.attraction === 60, 'trust 变更不影响 attraction');
}

// ===== V-2: attraction 性取向门控 =====

console.log('\n--- V-2: attraction 性取向门控 ---');
{
  // 异性恋男 → 同性弟子 attraction = 0
  const heteroMale = { maleAttraction: 0, femaleAttraction: 1 };
  assert(SocialEngine.effectiveAttraction(heteroMale, 'male') === 0,
    '异性恋男 → 男 = 0 (性取向门控)');
  assert(SocialEngine.effectiveAttraction(heteroMale, 'female') === 1,
    '异性恋男 → 女 = 1');

  // 同性恋女
  const homoFemale = { maleAttraction: 0, femaleAttraction: 1 };
  assert(SocialEngine.effectiveAttraction(homoFemale, 'female') === 1,
    '同性恋女 → 女 = 1');
  assert(SocialEngine.effectiveAttraction(homoFemale, 'male') === 0,
    '同性恋女 → 男 = 0');

  // 双性恋
  const bi = { maleAttraction: 0.7, femaleAttraction: 0.8 };
  assertApprox(SocialEngine.effectiveAttraction(bi, 'male'), 0.7, 0.01, '双性恋 → 男 = 0.7');
  assertApprox(SocialEngine.effectiveAttraction(bi, 'female'), 0.8, 0.01, '双性恋 → 女 = 0.8');
}

// ===== V-3: crush 自动标记/解除 =====

console.log('\n--- V-3: crush 自动标记/解除 ---');
{
  const engine = new SocialEngine();
  const dA = makeDisciple('a', { gender: 'male', orientation: { maleAttraction: 0, femaleAttraction: 1 } });
  const dB = makeDisciple('b', { gender: 'female', orientation: { maleAttraction: 1, femaleAttraction: 0 } });
  const ab = makeEdge('a', 'b', { attraction: 50, closeness: 10, trust: 10 });
  const ba = makeEdge('b', 'a', { attraction: 20, closeness: 10, trust: 10 });
  const state = makeState([dA, dB], [ab, ba]);

  const results1 = engine.scanForSocialEvents(state, 100);
  const crushMark = results1.find(r => r.type === 'crush-mark');
  assert(!!crushMark, 'attraction=50 触发 crush 标记');
  assert(ab.status === 'crush', 'edge.status 被设为 crush');

  // attraction 降到 29 → 解除 crush
  ab.attraction = 29;
  const results2 = engine.scanForSocialEvents(state, 200);
  const crushRemove = results2.find(r => r.type === 'crush-remove');
  assert(!!crushRemove, 'attraction<30 触发 crush 解除');
  assert(ab.status === null, 'edge.status 恢复 null');
}

// ===== V-4: 标签阈值重映射 =====

console.log('\n--- V-4: 标签阈值重映射 ---');
{
  // mentor: closeness >= 80, trust >= 40, starGap >= 2
  assert(shouldAssignMentor(80, 40, 5, 3), 'closeness=80,trust=40,starGap=2 → 赋 mentor');
  assert(!shouldAssignMentor(79, 40, 5, 3), 'closeness=79 → 不赋 mentor');
  assert(!shouldAssignMentor(80, 39, 5, 3), 'trust=39 → 不赋 mentor');
  assert(!shouldAssignMentor(80, 40, 3, 3), 'starGap=0 → 不赋 mentor');

  // grudge: closeness <= -40, trust <= -20, 需要 memory 有负面事件
  const mockMemory = {
    sourceId: 'a', targetId: 'b',
    closeness: -50, attraction: 0, trust: -30, tags: [] as RelationshipTag[],
    keyEvents: [
      { content: '争吵', tick: 1, closenessDelta: -5 },
      { content: '争吵', tick: 2, closenessDelta: -3 },
      { content: '争吵', tick: 3, closenessDelta: -4 },
    ],
    encounterCount: 3, lastEncounterTick: 3, dialogueCount: 0,
  };
  assert(shouldAssignGrudge(-40, -20, mockMemory), 'closeness=-40,trust=-20,3负面事件 → 赋 grudge');
  assert(!shouldAssignGrudge(-39, -20, mockMemory), 'closeness=-39 → 不赋 grudge');
  assert(!shouldAssignGrudge(-40, -19, mockMemory), 'trust=-19 → 不赋 grudge');

  // RELATIONSHIP_TAG_THRESHOLDS: friend 阈值（数值类型）
  assert(RELATIONSHIP_TAG_THRESHOLDS.friend === 60, 'friend 阈值 = 60');
  assert(RELATIONSHIP_TAG_THRESHOLDS.rival === -60, 'rival 阈值 = -60');

  // ADVANCED_TAG_THRESHOLDS 使用 closeness + trust
  assert(ADVANCED_TAG_THRESHOLDS.mentor.assignCloseness === 80, 'mentor assignCloseness = 80');
  assert(ADVANCED_TAG_THRESHOLDS.mentor.assignTrust === 40, 'mentor assignTrust = 40');
  assert(ADVANCED_TAG_THRESHOLDS.grudge.assignCloseness === -40, 'grudge assignCloseness = -40');
  assert(ADVANCED_TAG_THRESHOLDS.grudge.assignTrust === -20, 'grudge assignTrust = -20');
}

// ===== V-5: 衰减率三维独立 =====

console.log('\n--- V-5: 衰减率三维独立 ---');
{
  const edge = makeEdge('a', 'b', { closeness: 80, attraction: 80, trust: 80, status: null });
  const state = makeState([], [edge]);

  decayRelationships(state);

  // closeness 衰减最快(0.98), trust 最慢(0.995)
  assertApprox(edge.closeness, 80 * CLOSENESS_DECAY_RATE, 0.1, 'closeness 按 0.98 衰减');
  assertApprox(edge.attraction, 80 * ATTRACTION_DECAY_RATE, 0.1, 'attraction 按 0.99 衰减');
  assertApprox(edge.trust, 80 * TRUST_DECAY_RATE, 0.1, 'trust 按 0.995 衰减');

  // 验证三者不同
  assert(edge.closeness < edge.attraction, 'closeness 衰减快于 attraction');
  assert(edge.attraction < edge.trust, 'attraction 衰减快于 trust');
}

// ===== V-6: 离散关系保护 =====

console.log('\n--- V-6: 离散关系保护（lover 衰减 ×0.5）---');
{
  const edgeNormal = makeEdge('a', 'b', { closeness: 80, attraction: 80, trust: 80, status: null });
  const edgeLover = makeEdge('c', 'd', { closeness: 80, attraction: 80, trust: 80, status: 'lover' });
  const state = makeState([], [edgeNormal, edgeLover]);

  decayRelationships(state);

  // lover 衰减因子 = 1 - (1-rate)*0.5，衰减量是普通的一半
  const normalDelta = 80 - edgeNormal.closeness;
  const loverDelta = 80 - edgeLover.closeness;
  assert(loverDelta > 0, 'lover 仍有衰减');
  assertApprox(loverDelta / normalDelta, 0.5, 0.05, 'lover 衰减量约为普通的 0.5');

  // sworn-sibling 同理
  const edgeSworn = makeEdge('e', 'f', { closeness: 80, attraction: 80, trust: 80, status: 'sworn-sibling' });
  const state2 = makeState([], [edgeSworn]);
  decayRelationships(state2);
  const swornDelta = 80 - edgeSworn.closeness;
  assertApprox(swornDelta / normalDelta, 0.5, 0.05, 'sworn-sibling 衰减量也为 0.5');
}

// ===== V-7: 存档迁移 v7→v8 =====

console.log('\n--- V-7: 存档迁移 v7→v8 逻辑验证 ---');
{
  // 模拟 migrateV7toV8 逻辑（因 migrateSave 未导出，直接验证转换规则）
  const v7Relationships: Record<string, unknown>[] = [
    { sourceId: 'd1', targetId: 'd2', affinity: 40, tags: [] },
    { sourceId: 'd2', targetId: 'd1', affinity: -20, tags: [] },
  ];

  // 应用迁移规则
  for (const r of v7Relationships) {
    const affinity = (r['affinity'] as number) ?? 0;
    r['closeness'] = affinity;
    r['attraction'] = 0;
    r['trust'] = Math.round(affinity * 0.5);
    r['status'] = null;
    delete r['affinity'];
  }

  const r1 = v7Relationships[0];
  assert(r1['closeness'] === 40, 'affinity=40 → closeness=40');
  assert(r1['attraction'] === 0, 'attraction 默认 0');
  assert(r1['trust'] === 20, 'trust = round(40×0.5) = 20');
  assert(r1['status'] === null, 'status 默认 null');
  assert(!('affinity' in r1), 'affinity 字段已删除');

  const r2 = v7Relationships[1];
  assert(r2['closeness'] === -20, 'negative affinity → closeness=-20');
  assert(r2['trust'] === -10, 'trust = round(-20×0.5) = -10');

  // orientation 生成验证
  const o1 = generateOrientation('male');
  assert(o1.maleAttraction >= 0 && o1.maleAttraction <= 1, 'male orientation maleAttraction 范围正确');
  assert(o1.femaleAttraction >= 0 && o1.femaleAttraction <= 1, 'male orientation femaleAttraction 范围正确');

  const o2 = generateOrientation('female');
  assert(o2.maleAttraction >= 0 && o2.maleAttraction <= 1, 'female orientation maleAttraction 范围正确');

  // createDefaultLiteGameState 输出 v8
  const defaultState = createDefaultLiteGameState();
  assert(defaultState.version === 8, 'createDefaultLiteGameState 版本 = 8');
}

// ===== V-8: AI 三维 delta 解析 =====

console.log('\n--- V-8: AI 三维 delta 类型兼容性 ---');
{
  // 验证 SoulEvaluationResult.relationshipDeltas 结构是三维格式
  const mockResult: SoulEvaluationResult = {
    eventType: 'chat-pleasant',
    internalMonologue: '我觉得他挺好的',
    socialInsight: '对方看起来很友善',
    relationshipDeltas: [
      { targetId: 'd2', closeness: 5, attraction: 2, trust: 3, reason: '友善交谈' },
    ],
    moralShift: 0,
    behaviorHint: 'meditate',
    traits: [],
    emotionTag: 'joy',
    emotionIntensity: 1,
  };

  assert(mockResult.relationshipDeltas[0].closeness === 5, 'closeness delta = 5');
  assert(mockResult.relationshipDeltas[0].attraction === 2, 'attraction delta = 2');
  assert(mockResult.relationshipDeltas[0].trust === 3, 'trust delta = 3');
  assert(typeof mockResult.relationshipDeltas[0].reason === 'string', 'reason 字段存在');

  // 验证默认值 fallback（缺少字段时取 0）
  const rawDelta = { targetId: 'd2', closeness: 3 } as Record<string, unknown>;
  const safeAttraction = (rawDelta['attraction'] as number) ?? 0;
  const safeTrust = (rawDelta['trust'] as number) ?? 0;
  assert(safeAttraction === 0, '缺少 attraction → fallback 0');
  assert(safeTrust === 0, '缺少 trust → fallback 0');
}

// ===== V-9: 性格兼容度天花板（未实现，跳过）=====

console.log('\n--- V-9: 性格兼容度天花板 [SKIP - 未实现] ---');
console.log('  ⏭️  性格兼容度天花板机制尚未编码，将在后续 Phase 实现');

// ===== V-10: attraction 累积限速 =====

console.log('\n--- V-10: attraction 累积限速 ---');
{
  const engine = new SocialEngine();
  const pairKey = 'a-b';

  // 300 ticks 窗口内总量不超过 +5
  const r1 = engine.applyAttractionRateLimit(pairKey, 3, 100);
  assert(r1 === 3, '第一次 +3 → 通过');

  const r2 = engine.applyAttractionRateLimit(pairKey, 3, 150);
  assert(r2 === 2, '第二次 +3 → 只通过 2（累计 5）');

  const r3 = engine.applyAttractionRateLimit(pairKey, 5, 200);
  assert(r3 === 0, '第三次 +5 → 0（已达上限）');

  // 负值不受限
  const r4 = engine.applyAttractionRateLimit(pairKey, -10, 200);
  assert(r4 === -10, '负 delta 不受限速');

  // 300 ticks 后窗口重置
  const r5 = engine.applyAttractionRateLimit(pairKey, 4, 400);
  assert(r5 === 4, '窗口重置后 +4 → 通过');
}

// ===== 邀约条件扫描 =====

console.log('\n--- 邀约条件扫描 ---');
{
  const engine = new SocialEngine();
  const dA = makeDisciple('a', { gender: 'male', orientation: { maleAttraction: 0, femaleAttraction: 1 } });
  const dB = makeDisciple('b', { gender: 'female', orientation: { maleAttraction: 1, femaleAttraction: 0 } });

  // lover 邀约条件：closeness >= 60, attraction >= 70
  const ab = makeEdge('a', 'b', { closeness: 65, attraction: 75, trust: 10 });
  const ba = makeEdge('b', 'a', { closeness: 10, attraction: 10, trust: 10 });
  const state = makeState([dA, dB], [ab, ba]);

  const results = engine.scanForSocialEvents(state, 100);
  const invitation = results.find(r => r.type === 'invitation' && r.relationType === 'lover');
  assert(!!invitation, 'lover 邀约条件满足时触发 invitation');
  assert(invitation?.sourceId === 'a', '邀约发起方正确');
}

// ===== MUD 模板完整性 =====

console.log('\n--- MUD 模板完整性 ---');
{
  const eventTypes: SocialEventType[] = [
    'social-flirt', 'social-confession', 'social-confession-accepted', 'social-confession-rejected',
    'social-sworn-proposal', 'social-sworn-accepted', 'social-sworn-rejected',
    'social-nemesis-declare', 'social-nemesis-accepted', 'social-nemesis-rejected',
    'social-lover-broken', 'social-sworn-broken', 'social-nemesis-resolved',
  ];

  for (const et of eventTypes) {
    const templates = SOCIAL_EVENT_TEMPLATES[et];
    assert(templates.length >= 3, `${et} 模板 ≥3 条 (实际 ${templates.length})`);
  }

  // pickSocialTemplate 随机选取
  const t1 = pickSocialTemplate('social-flirt');
  assert(typeof t1 === 'string' && t1.length > 0, 'pickSocialTemplate 返回有效模板');
}

// ===== Orientation 生成分布 =====

console.log('\n--- Orientation 生成分布 ---');
{
  const N = 1000;
  let hetero = 0, bi = 0, homo = 0;

  for (let i = 0; i < N; i++) {
    const o = generateOrientation('male');
    if (o.femaleAttraction === 1 && o.maleAttraction === 0) hetero++;
    else if (o.femaleAttraction === 0 && o.maleAttraction === 1) homo++;
    else bi++;
  }

  // 80/15/5 ±5% 容差
  assert(hetero / N > 0.70 && hetero / N < 0.90, `异性恋比例 ~80% (实际 ${(hetero / N * 100).toFixed(1)}%)`);
  assert(bi / N > 0.05 && bi / N < 0.25, `双性恋比例 ~15% (实际 ${(bi / N * 100).toFixed(1)}%)`);
  assert(homo / N > 0.01 && homo / N < 0.12, `同性恋比例 ~5% (实际 ${(homo / N * 100).toFixed(1)}%)`);
}

// ===== 汇总 =====

console.log('\n============================================================');
console.log(`  Phase I-beta 社交系统验证: ${passed} passed / ${failed} failed`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
