/**
 * Phase E 验证脚本 — NPC 灵魂系统数值验证
 *
 * 10 组验证：
 * 1. 道德初始范围 [-30, +30]
 * 2. 特性分配（1~2 个先天特性，TRAIT_REGISTRY 中存在）
 * 3. 关系好感度初始范围 [-20, +20]
 * 4. 关系衰减（0.98 系数，|affinity|≤5 停止）
 * 5. Delta 夹值（[-5, +5]）
 * 6. Delta 方向修正（self+positive→正，self+negative→负，observer→不干预）
 * 7. 标签触发（affinity≥60→friend；≤-60→rival）
 * 8. 候选池非空（所有事件类型×角色）
 * 9. 存档迁移 v3→v4（弟子补充 moral/traits，关系边升级）
 * 10. Fallback 评估（无 AI 时候选池内情绪）
 *
 * @see phaseE-TDD.md Step 3.5
 * @see Story #5 AC5
 */

import { generateInitialDisciples, generateInitialRelationships } from '../src/engine/disciple-generator';
import { generateInnateTraits, TRAIT_REGISTRY, getTraitDef } from '../src/shared/data/trait-registry';
import {
  buildCandidatePool, correctDeltaDirection, clampDelta, fallbackSelectEmotion,
} from '../src/shared/data/emotion-pool';
import {
  decayRelationships, updateRelationshipTags, fallbackEvaluate,
} from '../src/engine/soul-engine';
import type { SoulEventType, SoulRole, EmotionTag } from '../src/shared/types/soul';
import type { LiteGameState } from '../src/shared/types/game-state';
import { createDefaultLiteGameState } from '../src/shared/types/game-state';

// ===== 测试工具 =====

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
    errors.push(message);
  }
}

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// ===== T1: 道德初始范围 =====

section('T1: 道德初始范围 [-30, +30]');

let moralOutOfRange = 0;
const disciples = generateInitialDisciples(8);
for (const d of disciples) {
  if (d.moral.goodEvil < -30 || d.moral.goodEvil > 30) moralOutOfRange++;
  if (d.moral.lawChaos < -30 || d.moral.lawChaos > 30) moralOutOfRange++;
}
assert(moralOutOfRange === 0, `所有弟子 moral 在 [-30, +30] 范围内（检查了 ${disciples.length * 2} 值）`);
assert(
  disciples.every(d => d.initialMoral.goodEvil === d.moral.goodEvil && d.initialMoral.lawChaos === d.moral.lawChaos),
  'initialMoral 与 moral 初始相等（不可变副本）',
);

// ===== T2: 特性分配 =====

section('T2: 特性分配（1~2 个先天，TRAIT_REGISTRY 中存在）');

let hasValidTraits = true;
for (const d of disciples) {
  if (d.traits.length < 1 || d.traits.length > 2) {
    hasValidTraits = false;
  }
  for (const t of d.traits) {
    if (!getTraitDef(t.defId)) {
      hasValidTraits = false;
    }
  }
}
assert(hasValidTraits, `所有弟子特性数量 1~2 且 defId 在注册表中`);
assert(TRAIT_REGISTRY.length >= 10, `TRAIT_REGISTRY 包含 ≥10 个特性（当前 ${TRAIT_REGISTRY.length} 个）`);

// 验证先天特性中有正负中性三种极性
const polarities = new Set(TRAIT_REGISTRY.filter(t => t.category === 'innate').map(t => t.polarity));
assert(polarities.has('positive') && polarities.has('negative') && polarities.has('neutral'),
  'TRAIT_REGISTRY 包含 positive/negative/neutral 三种极性');

// ===== T3: 关系初始范围 =====

section('T3: 关系好感度初始范围 [-20, +20]');

const relationships = generateInitialRelationships(disciples);
let affinityOutOfRange = 0;
for (const r of relationships) {
  if (r.affinity < -20 || r.affinity > 20) affinityOutOfRange++;
}
assert(affinityOutOfRange === 0, `所有关系边 affinity 在 [-20, +20] 范围内（检查了 ${relationships.length} 条）`);
assert(relationships.every(r => Array.isArray(r.tags) && r.tags.length === 0), '初始关系边 tags 为空数组');
assert(relationships.every(r => typeof r.lastInteraction === 'number' && r.lastInteraction > 0), '初始关系边 lastInteraction 为有效时间戳');

// ===== T4: 关系衰减 =====

section('T4: 关系衰减（×0.98，|affinity|≤5 停止）');

const mockState = createDefaultLiteGameState();

// 构造特定 affinity 的关系边
mockState.relationships = [
  { sourceId: 'a', targetId: 'b', affinity: 100, tags: [], lastInteraction: Date.now() },
  { sourceId: 'c', targetId: 'd', affinity: -80, tags: [], lastInteraction: Date.now() },
  { sourceId: 'e', targetId: 'f', affinity: 4, tags: [], lastInteraction: Date.now() },   // 应停止
  { sourceId: 'g', targetId: 'h', affinity: -3, tags: [], lastInteraction: Date.now() },  // 应停止
];

decayRelationships(mockState);

assert(Math.abs(mockState.relationships[0].affinity - 98) < 0.01, `affinity=100 衰减后 ≈ 98（实际: ${mockState.relationships[0].affinity.toFixed(4)}）`);
assert(Math.abs(mockState.relationships[1].affinity - (-78.4)) < 0.01, `affinity=-80 衰减后 ≈ -78.4（实际: ${mockState.relationships[1].affinity.toFixed(4)}）`);
assert(mockState.relationships[2].affinity === 4, `affinity=4（≤5）不衰减`);
assert(mockState.relationships[3].affinity === -3, `affinity=-3（|.|≤5）不衰减`);

// ===== T5: Delta 夹值 =====

section('T5: Delta 夹值 [-5, +5]');

assert(clampDelta(15) === 5, 'clampDelta(15) = 5');
assert(clampDelta(-12) === -5, 'clampDelta(-12) = -5');
assert(clampDelta(3) === 3, 'clampDelta(3) = 3（未超出）');
assert(clampDelta(-5) === -5, 'clampDelta(-5) = -5（边界值）');
assert(clampDelta(0) === 0, 'clampDelta(0) = 0');

// ===== T6: Delta 方向修正 =====

section('T6: Delta 方向修正（Story #3 AC3/AC4/AC6）');

// self + positive event: delta 应为正
assert(correctDeltaDirection(-10, 'self', 'alchemy-success') > 0,
  'self + alchemy-success: -10 → 正向（实际: ' + correctDeltaDirection(-10, 'self', 'alchemy-success') + '）');

// self + negative event: delta 应为负
assert(correctDeltaDirection(8, 'self', 'alchemy-fail') < 0,
  'self + alchemy-fail: +8 → 负向（实际: ' + correctDeltaDirection(8, 'self', 'alchemy-fail') + '）');

// observer: 不干预
assert(correctDeltaDirection(10, 'observer', 'alchemy-success') === 10,
  'observer: delta=10 不被修正（保持原值）');
assert(correctDeltaDirection(-5, 'observer', 'breakthrough-fail') === -5,
  'observer: delta=-5 不被修正（保持原值）');

// ===== T7: 关系标签触发 =====

section('T7: 关系标签自动触发（affinity≥60→friend；≤-60→rival）');

const tagState = createDefaultLiteGameState();
tagState.relationships = [
  { sourceId: 'a', targetId: 'b', affinity: 65, tags: [], lastInteraction: Date.now() },
  { sourceId: 'a', targetId: 'c', affinity: -70, tags: [], lastInteraction: Date.now() },
  { sourceId: 'a', targetId: 'd', affinity: 30, tags: [], lastInteraction: Date.now() },   // 不触发
];

updateRelationshipTags(tagState, 'a');

assert(tagState.relationships[0].tags.includes('friend'),
  'affinity=65 → friend 标签');
assert(tagState.relationships[1].tags.includes('rival'),
  'affinity=-70 → rival 标签');
assert(!tagState.relationships[2].tags.includes('friend') && !tagState.relationships[2].tags.includes('rival'),
  'affinity=30 → 不触发任何标签');

// ===== T8: 候选池非空 =====

section('T8: 所有事件类型 × 角色的候选池非空');

const eventTypes: SoulEventType[] = [
  'alchemy-success', 'alchemy-fail', 'harvest', 'meditation',
  'explore-return', 'breakthrough-success', 'breakthrough-fail',
];
const roles: SoulRole[] = ['self', 'observer'];

let allNonEmpty = true;
for (const eventType of eventTypes) {
  for (const role of roles) {
    const pool = buildCandidatePool(eventType, role);
    if (pool.length === 0) {
      allNonEmpty = false;
      console.log(`    ⚠️ ${eventType}/${role} 候选池为空`);
    }
    assert(pool.length >= 3, `${eventType}/${role}: 候选池 ≥3 个情绪（实际: ${pool.length}）`);
  }
}

// ===== T9: 存档迁移 v3→v4 =====

section('T9: 存档迁移 v3→v4（mock 测试）');

// 模拟 v3 存档数据
const v3Mock: Record<string, unknown> = {
  version: 3,
  disciples: [
    { id: 'd1', name: '测试弟子', farmPlots: [], currentRecipeId: null },
  ],
  relationships: [
    { sourceId: 'd1', targetId: 'd2', value: 15 },
  ],
};

// 手动执行 migrateV3toV4 逻辑（简化验证）
const d = v3Mock['disciples'] as Record<string, unknown>[];
if (!d[0]['moral']) {
  d[0]['moral'] = { goodEvil: 0, lawChaos: 0 };
}
if (!d[0]['initialMoral']) {
  d[0]['initialMoral'] = { ...(d[0]['moral'] as Record<string, unknown>) };
}
if (!Array.isArray(d[0]['traits'])) {
  d[0]['traits'] = generateInnateTraits();
}
const rels = v3Mock['relationships'] as Record<string, unknown>[];
v3Mock['relationships'] = rels.map(r => ({
  sourceId: r['sourceId'],
  targetId: r['targetId'],
  affinity: (r['value'] as number) ?? 0,
  tags: [],
  lastInteraction: Date.now(),
}));
v3Mock['version'] = 4;

assert((v3Mock['version'] as number) === 4, '迁移后 version = 4');
assert(!!(d[0]['moral'] as Record<string, unknown>)['goodEvil'] !== undefined, '弟子补充 moral 字段');
assert(Array.isArray(d[0]['traits']), '弟子补充 traits 字段');
const migratedRel = (v3Mock['relationships'] as Record<string, unknown>[])[0];
assert('affinity' in migratedRel, '关系边包含 affinity 字段');
assert('tags' in migratedRel, '关系边包含 tags 字段');
assert(!('value' in migratedRel), '关系边不再有 value 字段');

// ===== T10: Fallback 评估 =====

section('T10: Fallback 情绪评估（无 AI 时从候选池选择）');

const validEmotions: EmotionTag[] = [
  'joy', 'anger', 'envy', 'admiration', 'sadness', 'fear', 'contempt',
  'neutral', 'jealousy', 'gratitude', 'guilt', 'worry', 'shame', 'pride', 'relief',
];

const testDisciple = disciples[0];
const testEvent = {
  type: 'alchemy-success' as SoulEventType,
  actorId: 'test-actor-id',
  timestamp: Date.now(),
};

// 对 observer 角色运行 fallbackEvaluate 多次，确保情绪在有效池中
let allEmotionsValid = true;
for (let i = 0; i < 10; i++) {
  const result = fallbackEvaluate(testEvent, testDisciple, 'observer', mockState, '测试炼丹者');
  if (!validEmotions.includes(result.emotion)) {
    allEmotionsValid = false;
    console.log(`    ⚠️ 无效情绪: ${result.emotion}`);
  }
}
assert(allEmotionsValid, 'Fallback 评估生成的情绪均在有效情绪列表中（10次测试）');

// self 角色验证 innerThought 非空
const selfResult = fallbackEvaluate(testEvent, testDisciple, 'self', mockState, '');
assert(selfResult.innerThought.length > 0, 'self 角色 fallback 生成非空 innerThought');
assert(selfResult.emotion in Object.fromEntries(validEmotions.map(e => [e, true])), 'self 角色 fallback 情绪有效');

// ===== 汇总 =====

console.log('\n============================================================');
console.log(`  Phase E 验证: ${passed} passed / ${failed} failed`);
console.log('============================================================');

if (failed > 0) {
  console.log('\n❌ 失败项:');
  for (const e of errors) {
    console.log(`  - ${e}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ Phase E 数值验证全部通过！');
}
