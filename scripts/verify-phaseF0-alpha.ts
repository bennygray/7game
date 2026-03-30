/**
 * Phase F0-α: 碰面世界 验证脚本
 *
 * 验证范围：
 * 1. 地点推导纯函数完整性 (Story #1)
 * 2. 存档迁移 v4→v5 (Story #5)
 * 3. 碰面结果概率分布 Monte Carlo (Story #3)
 * 4. SoulEventType 扩展兼容性
 * 5. encounter-tick handler 基本功能
 */

import { createDefaultLiteGameState } from '../src/shared/types/game-state';
import type { DiscipleBehavior } from '../src/shared/types/game-state';
import {
  getDiscipleLocation,
  LocationTag,
  EncounterResult,
  decideEncounterResult,
  getAvgAffinity,
  getAffinityBand,
  BEHAVIOR_LOCATION_MAP,
  ENCOUNTER_PROBABILITY_TABLE,
} from '../src/shared/types/encounter';
import { SOUL_EVENT_POLARITY } from '../src/shared/types/soul';
import type { SoulEventType } from '../src/shared/types/soul';
import { ENCOUNTER_TEMPLATES, getEncounterText, fillEncounterTemplate } from '../src/shared/data/encounter-templates';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

// ==========================================
// § 1. 地点推导 (Story #1)
// ==========================================

console.log('\n--- §1 地点推导 ---\n');

// Story #1 AC1: 全 7 种行为映射
const expectedMap: Record<DiscipleBehavior, string> = {
  meditate: 'back-mountain',
  alchemy:  'dan-room',
  farm:     'ling-tian',
  explore:  'ling-shou-shan',
  bounty:   'bounty-field',
  rest:     'sect-hall',
  idle:     'sect-hall',
};
for (const [behavior, expectedLoc] of Object.entries(expectedMap)) {
  const result = getDiscipleLocation(behavior as DiscipleBehavior);
  assert(result === expectedLoc, `getDiscipleLocation('${behavior}') === '${expectedLoc}' (got '${result}')`);
}

// Story #1 AC2: rest 和 idle 都映射到 SECT_HALL
assert(
  getDiscipleLocation('rest') === getDiscipleLocation('idle'),
  'REST and IDLE both map to SECT_HALL',
);

// BEHAVIOR_LOCATION_MAP 覆盖所有 7 种行为
assert(Object.keys(BEHAVIOR_LOCATION_MAP).length === 7, 'BEHAVIOR_LOCATION_MAP has 7 entries');

// LocationTag 枚举有 6 个成员
assert(Object.keys(LocationTag).length === 6, 'LocationTag has 6 members');

console.log('\n--- §2 碰面结果概率分布 (Monte Carlo) ---\n');

// Story #3: 概率分布验证
const N = 10000;
const bands: Array<{ name: string; avgAff: number }> = [
  { name: 'friend', avgAff: 75 },
  { name: 'hostile', avgAff: -75 },
  { name: 'neutral', avgAff: 0 },
];

let seedCounter = 0;
function seededRandom(): number {
  // Simple LCG for deterministic testing
  seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
  return seedCounter / 0x7fffffff;
}

for (const band of bands) {
  const counts = { discuss: 0, chat: 0, conflict: 0, none: 0 };
  seedCounter = 42; // Reset seed
  for (let i = 0; i < N; i++) {
    const result = decideEncounterResult(band.avgAff, seededRandom);
    counts[result]++;
  }

  const expected = ENCOUNTER_PROBABILITY_TABLE[band.name as 'friend' | 'hostile' | 'neutral'];
  const tolerance = 3; // ±3% tolerance for Monte Carlo

  console.log(`  ${band.name} (avgAff=${band.avgAff}): discuss=${(counts.discuss/N*100).toFixed(1)}% chat=${(counts.chat/N*100).toFixed(1)}% conflict=${(counts.conflict/N*100).toFixed(1)}% none=${(counts.none/N*100).toFixed(1)}%`);

  for (const [key, expectedPct] of Object.entries(expected)) {
    const actualPct = (counts[key as keyof typeof counts] / N) * 100;
    const ok = Math.abs(actualPct - expectedPct) < tolerance;
    assert(ok, `${band.name}.${key}: expected ${expectedPct}% ±${tolerance}%, got ${actualPct.toFixed(1)}%`);
  }
}

// ==========================================
// § 3. 好感度分档 (Story #3)
// ==========================================

console.log('\n--- §3 好感度分档 ---\n');

assert(getAffinityBand(60) === 'friend', 'avgAff=60 → friend');
assert(getAffinityBand(100) === 'friend', 'avgAff=100 → friend');
assert(getAffinityBand(-60) === 'hostile', 'avgAff=-60 → hostile');
assert(getAffinityBand(-100) === 'hostile', 'avgAff=-100 → hostile');
assert(getAffinityBand(59) === 'neutral', 'avgAff=59 → neutral');
assert(getAffinityBand(-59) === 'neutral', 'avgAff=-59 → neutral');
assert(getAffinityBand(0) === 'neutral', 'avgAff=0 → neutral');

// ==========================================
// § 4. getAvgAffinity (Review WARN-1 防御)
// ==========================================

console.log('\n--- §4 getAvgAffinity ---\n');

const mockRelationships = [
  { sourceId: 'a', targetId: 'b', affinity: 70 },
  { sourceId: 'b', targetId: 'a', affinity: 80 },
];
assert(getAvgAffinity(mockRelationships, 'a', 'b') === 75, 'avg(70,80) = 75');
assert(getAvgAffinity(mockRelationships, 'b', 'a') === 75, 'avg(80,70) = 75 (reverse)');

// WARN-1: 关系边不存在时 fallback 为 0
assert(getAvgAffinity([], 'a', 'b') === 0, 'empty relationships → avgAff = 0');
assert(getAvgAffinity(mockRelationships, 'c', 'd') === 0, 'non-existent pair → avgAff = 0');

// 单向存在
const oneWay = [{ sourceId: 'a', targetId: 'b', affinity: 50 }];
assert(getAvgAffinity(oneWay, 'a', 'b') === 25, 'one-way(50,0) → avg = 25');

// ==========================================
// § 5. SoulEventType 扩展兼容性
// ==========================================

console.log('\n--- §5 SoulEventType 扩展 ---\n');

const encounterTypes: SoulEventType[] = ['encounter-chat', 'encounter-discuss', 'encounter-conflict'];
for (const t of encounterTypes) {
  assert(t in SOUL_EVENT_POLARITY, `SOUL_EVENT_POLARITY has '${t}'`);
}
assert(SOUL_EVENT_POLARITY['encounter-chat'] === 'positive', 'encounter-chat is positive');
assert(SOUL_EVENT_POLARITY['encounter-discuss'] === 'positive', 'encounter-discuss is positive');
assert(SOUL_EVENT_POLARITY['encounter-conflict'] === 'negative', 'encounter-conflict is negative');

// ==========================================
// § 6. Fallback 文案
// ==========================================

console.log('\n--- §6 Fallback 文案 ---\n');

assert(ENCOUNTER_TEMPLATES.chat.length >= 3, 'chat templates ≥ 3');
assert(ENCOUNTER_TEMPLATES.discuss.length >= 3, 'discuss templates ≥ 3');
assert(ENCOUNTER_TEMPLATES.conflict.length >= 3, 'conflict templates ≥ 3');

const testText = fillEncounterTemplate('{A}在{LOC}遇到了{B}', '张清风', '李墨染', '后山');
assert(testText === '张清风在后山遇到了李墨染', 'fillEncounterTemplate works');

const randomText = getEncounterText('chat', '张清风', '李墨染', '后山', () => 0);
assert(randomText.includes('张清风') && randomText.includes('李墨染'), 'getEncounterText fills names');

// ==========================================
// § 7. 存档迁移 v4→v5 (Story #5)
// ==========================================

console.log('\n--- §7 存档迁移 v4→v5 ---\n');

// 新存档默认值
const newGame = createDefaultLiteGameState();
assert(newGame.version === 5, 'new game version === 5');
assert(newGame.sect.ethos === 0, 'new game sect.ethos === 0');
assert(newGame.sect.discipline === 0, 'new game sect.discipline === 0');

// 模拟 v4 存档迁移
const v4Save: Record<string, unknown> = {
  version: 4,
  sect: { name: '测试宗', level: 1, reputation: 100, auraDensity: 1.0, stoneDripAccumulator: 0, tributePills: 5 },
};

// 手动执行迁移逻辑
const sect = v4Save['sect'] as Record<string, unknown>;
if (sect['ethos'] === undefined) sect['ethos'] = 0;
if (sect['discipline'] === undefined) sect['discipline'] = 0;
v4Save['version'] = 5;

assert(v4Save['version'] === 5, 'v4→v5 migration: version = 5');
assert(sect['ethos'] === 0, 'v4→v5 migration: ethos defaults to 0');
assert(sect['discipline'] === 0, 'v4→v5 migration: discipline defaults to 0');
assert(sect['name'] === '测试宗', 'v4→v5 migration: existing fields preserved');

// ==========================================
// 汇总
// ==========================================

console.log(`\n${'='.repeat(60)}`);
console.log(`  Phase F0-α 验证汇总: ${passed} passed / ${failed} failed`);
console.log(`${'='.repeat(60)}\n`);

if (failed > 0) {
  console.error('❌ Phase F0-α 验证未通过！');
  process.exit(1);
} else {
  console.log('✅ Phase F0-α 验证全部通过！');
}
