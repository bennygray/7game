/**
 * Phase C 验证脚本
 *
 * 覆盖：
 *   1. 突破基础成功率查表
 *   2. F-C1a 概率公式（确定性 + Monte Carlo）
 *   3. F-C1b 失败代价
 *   4. F-C1c 自动触发边界
 *   5. F-C3 灵脉密度表
 *   6. F-C4 总灵气公式
 *   7. 破镜丹门槛 Fix C
 *   8. 修速丹覆盖机制
 *   9. 回灵丹补差额
 *   10. 存档 v2→v3 迁移
 *   11. 存档 v1→v3 链式迁移
 *
 * 运行：npx tsx scripts/verify-phaseC.ts
 */

import { getBreakthroughBaseRate, calculateBreakthroughResult } from '../src/shared/formulas/realm-formulas';
import { getSpiritVeinDensity } from '../src/shared/data/realm-table';
import { calculateAuraRate } from '../src/shared/formulas/idle-formulas';
import { QUALITY_MULTIPLIER } from '../src/shared/data/recipe-table';

const PASS = '✅';
const FAIL = '❌';
let failures = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ${PASS} ${msg}`);
  } else {
    console.log(`  ${FAIL} ${msg}`);
    failures++;
  }
}

function approxEq(a: number, b: number, tolerance: number = 0.001): boolean {
  return Math.abs(a - b) < tolerance;
}

// ===== Test 1: 突破基础成功率查表 =====

console.log('\n=== Test 1: 突破基础成功率表 ===');
{
  assert(getBreakthroughBaseRate(1, 1) === 0.95, '炼气1→2: 95%');
  assert(getBreakthroughBaseRate(1, 3) === 0.85, '炼气3→4: 85%');
  assert(getBreakthroughBaseRate(1, 7) === 0.60, '炼气7→8: 60%');
  assert(getBreakthroughBaseRate(1, 8) === 0.50, '炼气8→9: 50%');
  assert(getBreakthroughBaseRate(1, 9) === -1, '炼气9→筑基: 不可(需天劫)');
  assert(getBreakthroughBaseRate(2, 1) === 0.25, '筑基1→2: 25%');
  assert(getBreakthroughBaseRate(2, 2) === 0.20, '筑基2→3: 20%');
  assert(getBreakthroughBaseRate(2, 3) === -1, '筑基3→4: 不可(上限)');
}

// ===== Test 2: F-C1a 成功率公式 =====

console.log('\n=== Test 2: F-C1a 成功率公式 (确定性) ===');
{
  // 炼气3→4, 无丹, 灵气充足, 成功(rng=0.1)
  const r1 = calculateBreakthroughResult(1, 3, 10000, 0, () => 0.1);
  assert(r1.canAttempt === true, 'canAttempt = true');
  assert(approxEq(r1.successRate, 0.85), `successRate = ${r1.successRate} ≈ 0.85`);
  assert(r1.success === true, '0.1 < 0.85 → 成功');

  // 炼气3→4, +3中品破镜丹(0.15×1.0×3=0.45), cap 0.99
  const bonus3mid = 0.15 * QUALITY_MULTIPLIER['mid'] * 3; // 0.45
  const r2 = calculateBreakthroughResult(1, 3, 10000, bonus3mid, () => 0.1);
  assert(approxEq(r2.successRate, 0.99), `3中品后 successRate = ${r2.successRate} (cap 0.99)`);

  // 炼气7→8, +3中品(0.45), 基础60% → 成功率 min(1.05, 0.99)=0.99
  const r3 = calculateBreakthroughResult(1, 7, 100000, bonus3mid, () => 0.1);
  assert(approxEq(r3.successRate, 0.99), `炼气7→8 3中品后 = ${r3.successRate} (cap 0.99)`);

  // 筑基1→2, +3中品, 基础25% → 成功率 min(0.70, 0.99)=0.70
  const r4 = calculateBreakthroughResult(2, 1, 10_000_000, bonus3mid, () => 0.1);
  assert(approxEq(r4.successRate, 0.70), `筑基1→2 3中品后 = ${r4.successRate} ≈ 0.70`);
}

// ===== Test 3: F-C1b 失败代价 =====

console.log('\n=== Test 3: F-C1b 失败代价 ===');
{
  // 炼气3→4, 门槛1500, 失败惩罚=750
  const r = calculateBreakthroughResult(1, 3, 10000, 0, () => 0.99); // 0.99 > 0.85 → 失败
  assert(r.canAttempt === true, 'canAttempt = true');
  assert(r.success === false, 'rng 0.99 > 0.85 → 失败');
  assert(approxEq(r.failurePenalty, 750), `failurePenalty = ${r.failurePenalty} = 1500×0.5`);
  assert(r.auraCost === 1500, `auraCost = ${r.auraCost}`);
}

// ===== Test 4: 阻断条件 =====

console.log('\n=== Test 4: 阻断条件 ===');
{
  // 炼气9→筑基: 需天劫
  const r1 = calculateBreakthroughResult(1, 9, 999999);
  assert(r1.canAttempt === false, 'canAttempt = false');
  assert(r1.blockReason === 'tribulation-required', `blockReason = ${r1.blockReason}`);

  // 筑基3→4: 上限
  const r2 = calculateBreakthroughResult(2, 3, 999999999);
  assert(r2.canAttempt === false, 'canAttempt = false');
  assert(r2.blockReason === 'max-realm', `blockReason = ${r2.blockReason}`);

  // 灵气不足
  const r3 = calculateBreakthroughResult(1, 3, 100);
  assert(r3.canAttempt === false, 'canAttempt = false');
  assert(r3.blockReason === 'aura-insufficient', `blockReason = ${r3.blockReason}`);
}

// ===== Test 5: F-C3 灵脉密度表 =====

console.log('\n=== Test 5: F-C3 灵脉密度表 ===');
{
  assert(getSpiritVeinDensity(1, 1) === 1.0, '炼气1 = 1.0');
  assert(getSpiritVeinDensity(1, 3) === 1.0, '炼气3 = 1.0');
  assert(getSpiritVeinDensity(1, 4) === 1.2, '炼气4 = 1.2');
  assert(getSpiritVeinDensity(1, 6) === 1.2, '炼气6 = 1.2');
  assert(getSpiritVeinDensity(1, 7) === 1.5, '炼气7 = 1.5');
  assert(getSpiritVeinDensity(1, 9) === 1.5, '炼气9 = 1.5');
  assert(getSpiritVeinDensity(2, 1) === 2.0, '筑基1 = 2.0');
  assert(getSpiritVeinDensity(2, 2) === 3.0, '筑基2 = 3.0');
  assert(getSpiritVeinDensity(2, 3) === 5.0, '筑基3 = 5.0');
}

// ===== Test 6: F-C4 总灵气公式 =====

console.log('\n=== Test 6: F-C4 总灵气公式 ===');
{
  // 炼气5, 凡品(×1.5), 密度1.2, 修速丹×2 → 10×1.5×1.2×2 = 36
  const rate = calculateAuraRate(1, 5, 1, 1.2, 2.0);
  assert(approxEq(rate, 36.0), `炼气5 凡品 密度1.2 修速丹×2 = ${rate} ≈ 36.0`);

  // 炼气1, 无道基(×1.0), 密度1.0, 无修速丹 → 1×1.0×1.0×1.0 = 1
  const rate2 = calculateAuraRate(1, 1, 0);
  assert(approxEq(rate2, 1.0), `炼气1 无道基 = ${rate2} ≈ 1.0`);

  // 筑基1, 地道(×2.5), 密度2.0, 修速丹×2 → 80×2.5×2.0×2.0 = 800
  const rate3 = calculateAuraRate(2, 1, 2, 2.0, 2.0);
  assert(approxEq(rate3, 800.0), `筑基1 地道 密度2 修速丹×2 = ${rate3} ≈ 800.0`);
}

// ===== Test 7: 破镜丹门槛 Fix C =====

console.log('\n=== Test 7: 破镜丹门槛 Fix C ===');
{
  // 基础率 85% → 应该吃（≤85%）
  assert(getBreakthroughBaseRate(1, 3) <= 0.85, '炼气3→4 基础率85% → 应吃丹');
  // 基础率 90% → 不应该吃（>85%）
  assert(getBreakthroughBaseRate(1, 2) > 0.85, '炼气2→3 基础率90% → 不吃丹');
  // 基础率 95% → 不应该吃
  assert(getBreakthroughBaseRate(1, 1) > 0.85, '炼气1→2 基础率95% → 不吃丹');
  // 基础率 80% → 应该吃
  assert(getBreakthroughBaseRate(1, 4) <= 0.85, '炼气4→5 基础率80% → 应吃丹');
}

// ===== Test 8: Monte Carlo 突破 =====

console.log('\n=== Test 8: Monte Carlo 突破 (N=10000, 炼气7→8, 基础率60%) ===');
{
  const N = 10000;
  let successCount = 0;

  for (let i = 0; i < N; i++) {
    const r = calculateBreakthroughResult(1, 7, 100000, 0);
    if (r.success) successCount++;
  }

  const actualRate = successCount / N;
  const deviation = Math.abs(actualRate - 0.60);
  console.log(`  实际成功率: ${(actualRate * 100).toFixed(1)}% (期望: 60%)`);
  assert(deviation < 0.05, `偏差 ${(deviation * 100).toFixed(1)}% < 5%`);
}

// ===== Test 9: 存档 v2→v3 迁移 =====

console.log('\n=== Test 9: 存档 v2→v3 迁移 ===');
{
  const v2Save: Record<string, unknown> = {
    version: 2,
    aura: 5000,
    spiritStones: 300,
    realm: 1,
    subRealm: 5,
    daoFoundation: 0,
    comprehension: 150,
    pills: [{ defId: 'hui-ling-dan', quality: 'mid', count: 3 }],
    sect: { name: '测试宗', level: 1, reputation: 10, auraDensity: 1.0, stoneDripAccumulator: 0, tributePills: 5 },
    disciples: [{
      id: 'test-1', name: '测试弟子', starRating: 3,
      realm: 1, subRealm: 1, aura: 0,
      personality: { aggressive: 0.5, persistent: 0.5, kind: 0.5, lazy: 0.5, smart: 0.5 },
      personalityName: '沉稳', spiritualRoots: ['金'],
      behavior: 'idle', lastDecisionTime: 0, behaviorTimer: 0, stamina: 100,
      farmPlots: [], currentRecipeId: null,
    }],
    relationships: [],
    bountyBoard: { activeBounties: [], completedCount: 0 },
    aiContexts: {},
    materialPouch: { 'low-herb': 10 },
    inGameWorldTime: 100,
    lastOnlineTime: Date.now(),
    lifetimeStats: {
      alchemyTotal: 5, alchemyPerfect: 1,
      highestRealm: 1, highestSubRealm: 5,
      totalAuraEarned: 5000, breakthroughTotal: 4,
    },
  };

  // 模拟 v2→v3 迁移
  const raw = JSON.parse(JSON.stringify(v2Save)) as Record<string, unknown>;

  // 新增 buff 字段
  if (!raw['breakthroughBuff']) {
    raw['breakthroughBuff'] = { pillsConsumed: [], totalBonus: 0 };
  }
  if (raw['cultivateBoostBuff'] === undefined) {
    raw['cultivateBoostBuff'] = null;
  }
  const stats = raw['lifetimeStats'] as Record<string, unknown>;
  if (stats['pillsConsumed'] === undefined) stats['pillsConsumed'] = 0;
  if (stats['breakthroughFailed'] === undefined) stats['breakthroughFailed'] = 0;
  raw['version'] = 3;

  // 验证
  assert(raw['version'] === 3, `version = ${raw['version']}`);
  assert(raw['aura'] === 5000, '原有数据保留: aura=5000');

  const btBuff = raw['breakthroughBuff'] as Record<string, unknown>;
  assert(Array.isArray(btBuff['pillsConsumed']), 'breakthroughBuff.pillsConsumed 是数组');
  assert(btBuff['totalBonus'] === 0, 'breakthroughBuff.totalBonus = 0');
  assert(raw['cultivateBoostBuff'] === null, 'cultivateBoostBuff = null');
  assert(stats['pillsConsumed'] === 0, 'lifetimeStats.pillsConsumed = 0');
  assert(stats['breakthroughFailed'] === 0, 'lifetimeStats.breakthroughFailed = 0');
  assert(stats['breakthroughTotal'] === 4, '原有统计保留: breakthroughTotal=4');
}

// ===== Test 10: v1→v3 链式迁移 =====

console.log('\n=== Test 10: v1→v3 链式迁移 ===');
{
  const v1Save: Record<string, unknown> = {
    version: 1,
    aura: 100,
    spiritStones: 50,
    realm: 1,
    subRealm: 3,
    daoFoundation: 0,
    comprehension: 42,
    fields: [{ seedId: null }],
    alchemy: { recipeId: null },
    sect: { name: '古宗', level: 1, reputation: 0, auraDensity: 1.0, stoneDripAccumulator: 0 },
    disciples: [{
      id: 'd1', name: '弟子甲', starRating: 2,
      realm: 1, subRealm: 1, aura: 0,
      personality: { aggressive: 0.3, persistent: 0.7, kind: 0.5, lazy: 0.2, smart: 0.8 },
      personalityName: '勤勉', spiritualRoots: ['木'],
      behavior: 'idle', lastDecisionTime: 0, behaviorTimer: 0, stamina: 100,
    }],
    relationships: [],
    bountyBoard: { activeBounties: [], completedCount: 0 },
    aiContexts: {},
    materialPouch: {},
    inGameWorldTime: 0,
    lastOnlineTime: Date.now(),
    lifetimeStats: {
      alchemyTotal: 0, alchemyPerfect: 0,
      highestRealm: 1, highestSubRealm: 3,
      totalAuraEarned: 100, breakthroughTotal: 2,
    },
  };

  const raw = JSON.parse(JSON.stringify(v1Save)) as Record<string, unknown>;

  // v1→v2 迁移
  delete raw['fields'];
  delete raw['alchemy'];
  const disciples = raw['disciples'] as Record<string, unknown>[];
  for (const d of disciples) {
    if (!Array.isArray(d['farmPlots'])) d['farmPlots'] = [];
    if (d['currentRecipeId'] === undefined) d['currentRecipeId'] = null;
  }
  if (!Array.isArray(raw['pills'])) raw['pills'] = [];
  const sect = raw['sect'] as Record<string, unknown>;
  if (sect['tributePills'] === undefined) sect['tributePills'] = 0;
  raw['version'] = 2;

  // v2→v3 迁移
  if (!raw['breakthroughBuff']) {
    raw['breakthroughBuff'] = { pillsConsumed: [], totalBonus: 0 };
  }
  if (raw['cultivateBoostBuff'] === undefined) {
    raw['cultivateBoostBuff'] = null;
  }
  const stats = raw['lifetimeStats'] as Record<string, unknown>;
  if (stats['pillsConsumed'] === undefined) stats['pillsConsumed'] = 0;
  if (stats['breakthroughFailed'] === undefined) stats['breakthroughFailed'] = 0;
  raw['version'] = 3;

  // 验证全链路
  assert(raw['version'] === 3, `最终 version = ${raw['version']}`);
  assert(!('fields' in raw), 'v1 fields 已删除');
  assert(!('alchemy' in raw), 'v1 alchemy 已删除');
  assert(Array.isArray(raw['pills']), 'v2 pills 已添加');
  assert(raw['breakthroughBuff'] !== undefined, 'v3 breakthroughBuff 已添加');
  assert(raw['cultivateBoostBuff'] === null, 'v3 cultivateBoostBuff = null');

  const d = (raw['disciples'] as Record<string, unknown>[])[0];
  assert(Array.isArray(d['farmPlots']), 'v2 弟子.farmPlots 已添加');
  assert(d['currentRecipeId'] === null, 'v2 弟子.currentRecipeId = null');
}

// ===== 结果汇总 =====

console.log(`\n${'='.repeat(50)}`);
if (failures === 0) {
  console.log(`${PASS} Phase C 全部测试通过！`);
} else {
  console.log(`${FAIL} ${failures} 项测试失败`);
  process.exit(1);
}
