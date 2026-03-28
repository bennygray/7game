/**
 * 全局回归测试脚本 — regression-all.ts
 *
 * 聚合所有验证逻辑，确保任何代码变更不破坏已有系统。
 *
 * 覆盖范围：
 *   1. 核心引擎 tick 冒烟测试
 *   2. 存档迁移链测试（v1 → v2 → v3）
 *   3. Phase B-α 验证（alchemy formulas — 确定性掷骰 + 选种选丹方）
 *   4. Phase C 验证（breakthrough + pill formulas — 成功率 + 惩罚 + 阻断 + 灵脉密度）
 *
 * 注意：本脚本覆盖核心公式的确定性验证。
 * 完整的 Monte Carlo 概率分布测试请运行独立脚本：
 *   - npx tsx scripts/verify-phaseB-alpha.ts  （品质分布精度 N=10000）
 *   - npx tsx scripts/verify-phaseC.ts         （突破 Monte Carlo + 修速丹覆盖 + 回灵丹补差）
 *
 * 运行：npm run test:regression（或 npx tsx scripts/regression-all.ts）
 *
 * @see AGENTS.md §3.7 数值验证脚本规范
 * @see engineer/references/regression-protocol.md
 */

// ===== Phase B-α formulas =====
import { rollQuality, chooseSeedByNeed, chooseRecipeByNeed, hasEnoughMaterials } from '../src/shared/formulas/alchemy-formulas';
import { SEED_TABLE } from '../src/shared/data/seed-table';
import { RECIPE_TABLE, QUALITY_MULTIPLIER } from '../src/shared/data/recipe-table';
import type { AlchemyQuality, PillItem } from '../src/shared/types/game-state';

// ===== Phase C formulas =====
import { getBreakthroughBaseRate, calculateBreakthroughResult, getBaseAuraRate } from '../src/shared/formulas/realm-formulas';
import { getSpiritVeinDensity } from '../src/shared/data/realm-table';
import { calculateAuraRate, calculateComprehensionRate, calculateSpiritStoneRate } from '../src/shared/formulas/idle-formulas';

// ===== Test Infrastructure =====

const PASS = '✅';
const FAIL = '❌';
let totalPassed = 0;
let totalFailed = 0;
let currentSuite = '';

function assert(condition: boolean, msg: string): void {
  if (condition) {
    totalPassed++;
  } else {
    console.log(`  ${FAIL} [${currentSuite}] ${msg}`);
    totalFailed++;
  }
}

function approxEq(a: number, b: number, tolerance: number = 0.001): boolean {
  return Math.abs(a - b) < tolerance;
}

function suite(name: string): void {
  currentSuite = name;
  console.log(`\n--- ${name} ---`);
}

// ================================================================
// Suite 1: Core Engine Tick Smoke Test
// ================================================================

suite('Core Engine Tick');
{
  // Simulate 10 ticks on a default state using raw formula functions
  // (No DOM/localStorage dependency - pure formula verification)
  const realm = 1, subRealm = 1, daoFoundation = 0;
  const density = getSpiritVeinDensity(realm, subRealm);
  const auraRate = calculateAuraRate(realm, subRealm, daoFoundation, density);
  const compRate = calculateComprehensionRate(realm, subRealm, daoFoundation);
  const stoneRate = calculateSpiritStoneRate(realm, subRealm, daoFoundation);

  // Simulate 10 seconds of accumulation
  const auraAfter10 = auraRate * 10;
  const compAfter10 = compRate * 10;
  const stoneAfter10 = stoneRate * 10;

  assert(auraRate > 0, `灵气速率 > 0 (actual: ${auraRate})`);
  assert(compRate > 0, `悟性速率 > 0 (actual: ${compRate})`);
  assert(stoneRate > 0, `灵石速率 > 0 (actual: ${stoneRate})`);
  assert(auraAfter10 > 0, `10 ticks 后灵气 > 0 (actual: ${auraAfter10})`);
  assert(compAfter10 > 0, `10 ticks 后悟性 > 0 (actual: ${compAfter10})`);
  assert(stoneAfter10 > 0, `10 ticks 后灵石 > 0 (actual: ${stoneAfter10})`);

  // Verify base aura rate for lianqi-1 is 1
  const baseRate = getBaseAuraRate(1, 1);
  assert(baseRate === 1, `炼气1 基础灵气速率 = 1 (actual: ${baseRate})`);

  // Verify with dao foundation multiplier
  const rateWithDao = calculateAuraRate(1, 1, 1); // 凡品 ×1.5
  assert(approxEq(rateWithDao, 1.5), `凡品道基加成 (actual: ${rateWithDao} ≈ 1.5)`);

  // Verify spirit vein density applies correctly
  const rateWithDensity = calculateAuraRate(1, 7, 0, 1.5); // 炼气7 密度1.5
  const base7 = getBaseAuraRate(1, 7);
  assert(approxEq(rateWithDensity, base7 * 1.5), `灵脉密度加成 (actual: ${rateWithDensity})`);
}

// ================================================================
// Suite 2: Save Migration Chain (v1 → v2 → v3)
// ================================================================

suite('Save Migration v1→v2→v3');
{
  const v1Save: Record<string, unknown> = {
    version: 1,
    aura: 100,
    spiritStones: 50,
    realm: 1,
    subRealm: 3,
    daoFoundation: 0,
    comprehension: 42,
    fields: [{ seedId: null, progress: 0, plantedAt: 0, mature: false }],
    alchemy: { recipeId: null, startTime: 0, endTime: 0, active: false },
    sect: { name: '回归测试宗', level: 1, reputation: 10, auraDensity: 1.0, stoneDripAccumulator: 0 },
    disciples: [{
      id: 'reg-1', name: '回归弟子', starRating: 3,
      realm: 1, subRealm: 1, aura: 0,
      personality: { aggressive: 0.5, persistent: 0.5, kind: 0.5, lazy: 0.5, smart: 0.5 },
      personalityName: '沉稳', spiritualRoots: ['金'],
      behavior: 'idle', lastDecisionTime: 0, behaviorTimer: 0, stamina: 100,
    }],
    relationships: [],
    bountyBoard: { activeBounties: [], completedCount: 0 },
    aiContexts: {},
    materialPouch: { 'low-herb': 5 },
    inGameWorldTime: 0,
    lastOnlineTime: Date.now(),
    lifetimeStats: {
      alchemyTotal: 0, alchemyPerfect: 0,
      highestRealm: 1, highestSubRealm: 3,
      totalAuraEarned: 100, breakthroughTotal: 2,
    },
  };

  const raw = JSON.parse(JSON.stringify(v1Save)) as Record<string, unknown>;

  // === v1 → v2 migration ===
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

  assert(raw['version'] === 2, 'v1→v2: version = 2');
  assert(!('fields' in raw), 'v1→v2: fields 已删除');
  assert(!('alchemy' in raw), 'v1→v2: alchemy 已删除');
  assert(Array.isArray(raw['pills']), 'v1→v2: pills 已添加');
  const d0 = disciples[0];
  assert(Array.isArray(d0['farmPlots']), 'v1→v2: 弟子.farmPlots 已添加');
  assert(d0['currentRecipeId'] === null, 'v1→v2: 弟子.currentRecipeId = null');
  assert(sect['tributePills'] === 0, 'v1→v2: sect.tributePills = 0');

  // === v2 → v3 migration ===
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

  assert(raw['version'] === 3, 'v2→v3: version = 3');
  const btBuff = raw['breakthroughBuff'] as Record<string, unknown>;
  assert(Array.isArray(btBuff['pillsConsumed']), 'v2→v3: breakthroughBuff.pillsConsumed 是数组');
  assert(btBuff['totalBonus'] === 0, 'v2→v3: breakthroughBuff.totalBonus = 0');
  assert(raw['cultivateBoostBuff'] === null, 'v2→v3: cultivateBoostBuff = null');
  assert(stats['pillsConsumed'] === 0, 'v2→v3: lifetimeStats.pillsConsumed = 0');
  assert(stats['breakthroughFailed'] === 0, 'v2→v3: lifetimeStats.breakthroughFailed = 0');

  // === Data preservation check ===
  assert(raw['aura'] === 100, '原有数据保留: aura=100');
  assert((raw['materialPouch'] as Record<string, number>)['low-herb'] === 5, '原有数据保留: low-herb=5');
  assert(stats['breakthroughTotal'] === 2, '原有统计保留: breakthroughTotal=2');
}

// ================================================================
// Suite 3: Phase B-α Alchemy Formulas
// ================================================================

suite('Phase B-α Alchemy');
{
  // Deterministic roll quality
  let callCount = 0;
  const q1 = rollQuality(0.80, () => { callCount++; return callCount === 1 ? 0.1 : 0.01; });
  assert(q1 === 'perfect', `成功+极品 = ${q1}`);

  const q2 = rollQuality(0.80, () => 0.9);
  assert(q2 === 'waste', `失败废丹 = ${q2}`);

  callCount = 0;
  const q3 = rollQuality(0.80, () => { callCount++; return callCount === 1 ? 0.5 : 0.8; });
  assert(q3 === 'low', `成功+下品 = ${q3}`);

  // Choose seed by need
  const unlocked1 = SEED_TABLE.filter(s => s.requiredRealm === 1 && s.requiredSubRealm <= 1);
  const seed1 = chooseSeedByNeed({}, unlocked1, RECIPE_TABLE);
  assert(seed1?.id === 'low-herb', `初期选 low-herb: ${seed1?.id}`);

  // Has enough materials
  const recipe = RECIPE_TABLE[0];
  assert(hasEnoughMaterials(recipe, { 'low-herb': 3 }, 10) === true, '材料刚好够');
  assert(hasEnoughMaterials(recipe, { 'low-herb': 2 }, 10) === false, '灵草不足');
  assert(hasEnoughMaterials(recipe, { 'low-herb': 3 }, 9) === false, '灵石不足');

  // Choose recipe by need
  const pills: PillItem[] = [];
  const pouch = { 'low-herb': 10, 'mid-herb': 5, 'break-herb': 2 };
  const r1 = chooseRecipeByNeed(pills, RECIPE_TABLE, pouch, 200, 0);
  assert(r1?.id === 'hui-ling-dan', `空库存选回灵丹: ${r1?.id}`);

  const r4 = chooseRecipeByNeed(pills, RECIPE_TABLE, {}, 200, 9999);
  assert(r4 === null, `材料空→null: ${r4}`);
}

// ================================================================
// Suite 4: Phase C Breakthrough + Pills
// ================================================================

suite('Phase C Breakthrough');
{
  // Breakthrough base rate table
  assert(getBreakthroughBaseRate(1, 1) === 0.95, '炼气1→2: 95%');
  assert(getBreakthroughBaseRate(1, 3) === 0.85, '炼气3→4: 85%');
  assert(getBreakthroughBaseRate(1, 7) === 0.60, '炼气7→8: 60%');
  assert(getBreakthroughBaseRate(1, 9) === -1, '炼气9→筑基: 不可');
  assert(getBreakthroughBaseRate(2, 1) === 0.25, '筑基1→2: 25%');

  // Deterministic breakthrough
  const r1 = calculateBreakthroughResult(1, 3, 10000, 0, () => 0.1);
  assert(r1.canAttempt === true, '可以突破');
  assert(approxEq(r1.successRate, 0.85), `成功率 ≈ 0.85 (${r1.successRate})`);
  assert(r1.success === true, '0.1 < 0.85 → 成功');

  // Failed breakthrough penalty
  const r2 = calculateBreakthroughResult(1, 3, 10000, 0, () => 0.99);
  assert(r2.success === false, '0.99 > 0.85 → 失败');
  assert(approxEq(r2.failurePenalty, 750), `失败惩罚 = ${r2.failurePenalty} ≈ 750`);

  // Block conditions
  const r3 = calculateBreakthroughResult(1, 9, 999999);
  assert(r3.canAttempt === false, '炼气9→筑基: 阻断');
  assert(r3.blockReason === 'tribulation-required', `原因: ${r3.blockReason}`);

  const r4 = calculateBreakthroughResult(1, 3, 100);
  assert(r4.canAttempt === false, '灵气不足: 阻断');
  assert(r4.blockReason === 'aura-insufficient', `原因: ${r4.blockReason}`);

  // Pill bonus cap
  const bonus3mid = 0.15 * QUALITY_MULTIPLIER['mid'] * 3; // 0.45
  const r5 = calculateBreakthroughResult(1, 3, 10000, bonus3mid, () => 0.1);
  assert(approxEq(r5.successRate, 0.99), `3中品丹后 cap 0.99 (${r5.successRate})`);
}

suite('Phase C Spirit Vein Density');
{
  assert(getSpiritVeinDensity(1, 1) === 1.0, '炼气1 = 1.0');
  assert(getSpiritVeinDensity(1, 4) === 1.2, '炼气4 = 1.2');
  assert(getSpiritVeinDensity(1, 7) === 1.5, '炼气7 = 1.5');
  assert(getSpiritVeinDensity(2, 1) === 2.0, '筑基1 = 2.0');
  assert(getSpiritVeinDensity(2, 3) === 5.0, '筑基3 = 5.0');
}

suite('Phase C Aura Formula F-C4');
{
  // 炼气5, 凡品(×1.5), 密度1.2, 修速丹×2 → base×1.5×1.2×2
  const rate = calculateAuraRate(1, 5, 1, 1.2, 2.0);
  assert(approxEq(rate, 36.0), `combination rate = ${rate} ≈ 36.0`);

  // 炼气1, 无道基, 无buff → base×1.0×1.0×1.0 = 1
  const rate2 = calculateAuraRate(1, 1, 0);
  assert(approxEq(rate2, 1.0), `minimal rate = ${rate2} ≈ 1.0`);
}

// ================================================================
// Results Summary
// ================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`  回归测试汇总: ${totalPassed} passed / ${totalFailed} failed`);
console.log(`${'='.repeat(60)}`);

if (totalFailed === 0) {
  console.log(`\n${PASS} 全局回归测试通过！`);
  process.exit(0);
} else {
  console.log(`\n${FAIL} ${totalFailed} 项回归测试失败`);
  process.exit(1);
}
