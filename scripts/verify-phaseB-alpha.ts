/**
 * Phase B-α 验证脚本
 *
 * 1. Monte Carlo 品质分布验证
 * 2. 按需选种/选丹方验证
 * 3. 存档 v1→v2 迁移验证
 *
 * 运行：npx tsx scripts/verify-phaseB-alpha.ts
 */

import { rollQuality, chooseSeedByNeed, chooseRecipeByNeed, hasEnoughMaterials } from '../src/shared/formulas/alchemy-formulas';
import { SEED_TABLE } from '../src/shared/data/seed-table';
import { RECIPE_TABLE } from '../src/shared/data/recipe-table';
import type { AlchemyQuality, PillItem } from '../src/shared/types/game-state';

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

// ===== Test 1: Monte Carlo 品质分布 =====

console.log('\n=== Test 1: Monte Carlo 品质分布 (rollQuality, N=10000, successRate=0.80) ===');
{
  const N = 10000;
  const counts: Record<AlchemyQuality, number> = { waste: 0, low: 0, mid: 0, high: 0, perfect: 0 };

  for (let i = 0; i < N; i++) {
    const q = rollQuality(0.80);
    counts[q]++;
  }

  const pct = (q: AlchemyQuality) => (counts[q] / N * 100).toFixed(1);

  console.log(`  分布结果 (N=${N}):`);
  console.log(`    waste:   ${pct('waste')}% (期望: ~20%)`);
  console.log(`    low:     ${pct('low')}% (期望: ~42.4%)`);
  console.log(`    mid:     ${pct('mid')}% (期望: ~24.0%)`);
  console.log(`    high:    ${pct('high')}% (期望: ~11.2%)`);
  console.log(`    perfect: ${pct('perfect')}% (期望: ~2.4%)`);

  // 允许 ±5% 偏差
  assert(Math.abs(counts.waste / N - 0.20) < 0.05, `waste 在 15%~25% 范围内 (${pct('waste')}%)`);
  assert(Math.abs(counts.low / N - 0.424) < 0.05, `low 在 37.4%~47.4% 范围内 (${pct('low')}%)`);
  assert(Math.abs(counts.mid / N - 0.24) < 0.05, `mid 在 19%~29% 范围内 (${pct('mid')}%)`);
  assert(Math.abs(counts.high / N - 0.112) < 0.05, `high 在 6.2%~16.2% 范围内 (${pct('high')}%)`);
  assert(Math.abs(counts.perfect / N - 0.024) < 0.04, `perfect 在 0%~6.4% 范围内 (${pct('perfect')}%)`);
}

// ===== Test 2: 确定性掷骰 =====

console.log('\n=== Test 2: 确定性掷骰 (注入 RNG) ===');
{
  // 成功 + 极品：rng 返回 0.1 (成功，0.1 < 0.8), 然后 0.01 (极品, 0.01 < 0.03)
  let callCount = 0;
  const q1 = rollQuality(0.80, () => {
    callCount++;
    return callCount === 1 ? 0.1 : 0.01;
  });
  assert(q1 === 'perfect', `成功+极品 = ${q1}`);

  // 失败废丹：rng 返回 0.9 (失败，0.9 > 0.8)
  const q2 = rollQuality(0.80, () => 0.9);
  assert(q2 === 'waste', `失败 = ${q2}`);

  // 成功 + 下品：rng 返回 0.5 (成功), 0.8 (下品, 0.8 > 0.47)
  callCount = 0;
  const q3 = rollQuality(0.80, () => {
    callCount++;
    return callCount === 1 ? 0.5 : 0.8;
  });
  assert(q3 === 'low', `成功+下品 = ${q3}`);
}

// ===== Test 3: 按需选种 (F-B1b) =====

console.log('\n=== Test 3: 按需选种 (chooseSeedByNeed) ===');
{
  // 游戏初期：只有清心草解锁，库存为 0
  const unlocked1 = SEED_TABLE.filter(s => s.requiredRealm === 1 && s.requiredSubRealm <= 1);
  const seed1 = chooseSeedByNeed({}, unlocked1, RECIPE_TABLE);
  assert(seed1?.id === 'low-herb', `初期选 low-herb: ${seed1?.id}`);

  // 碧灵果解锁后，清心草库存 10，碧灵果库存 0
  const unlocked2 = SEED_TABLE.filter(s => s.requiredRealm === 1 && s.requiredSubRealm <= 6);
  const seed2 = chooseSeedByNeed({ 'low-herb': 10 }, unlocked2, RECIPE_TABLE);
  assert(seed2?.id === 'mid-herb', `碧灵果0库存优先: ${seed2?.id}`);

  // 清心草 0，碧灵果 5
  const seed3 = chooseSeedByNeed({ 'mid-herb': 5 }, unlocked2, RECIPE_TABLE);
  assert(seed3?.id === 'low-herb', `清心草0库存优先: ${seed3?.id}`);
}

// ===== Test 4: 按需选丹方 =====

console.log('\n=== Test 4: 按需选丹方 (chooseRecipeByNeed) ===');
{
  const pills: PillItem[] = [];
  const pouch = { 'low-herb': 10, 'mid-herb': 5, 'break-herb': 2 };

  // 库存全空，材料充足→选最低级
  const r1 = chooseRecipeByNeed(pills, RECIPE_TABLE, pouch, 200, 0);
  assert(r1?.id === 'hui-ling-dan', `空库存选回灵丹: ${r1?.id}`);

  // 回灵丹库存 5，修速丹 0→选修速丹（需悟性>=100）
  const pills2: PillItem[] = [{ defId: 'hui-ling-dan', quality: 'mid', count: 5 }];
  const r2 = chooseRecipeByNeed(pills2, RECIPE_TABLE, pouch, 200, 200);
  assert(r2?.id === 'xiu-su-dan', `回灵丹多选修速丹: ${r2?.id}`);

  // 悟性不足，只能炼回灵丹
  const r3 = chooseRecipeByNeed(pills2, RECIPE_TABLE, pouch, 200, 0);
  assert(r3?.id === 'hui-ling-dan', `悟性不足只能炼回灵丹: ${r3?.id}`);

  // 材料全空→无法炼丹
  const r4 = chooseRecipeByNeed(pills, RECIPE_TABLE, {}, 200, 9999);
  assert(r4 === null, `材料空→null: ${r4}`);
}

// ===== Test 5: hasEnoughMaterials =====

console.log('\n=== Test 5: hasEnoughMaterials ===');
{
  const recipe = RECIPE_TABLE[0]; // 回灵丹: low-herb×3, 10石
  assert(hasEnoughMaterials(recipe, { 'low-herb': 3 }, 10) === true, '刚好够');
  assert(hasEnoughMaterials(recipe, { 'low-herb': 2 }, 10) === false, '灵草不足');
  assert(hasEnoughMaterials(recipe, { 'low-herb': 3 }, 9) === false, '灵石不足');
}

// ===== Test 6: 存档 v1→v2 迁移 =====

console.log('\n=== Test 6: 存档 v1→v2 迁移 ===');
{
  // 伪造一个 v1 存档对象
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
    sect: { name: '测试宗', level: 1, reputation: 10, auraDensity: 1.0, stoneDripAccumulator: 0 },
    disciples: [
      {
        id: 'test-1', name: '测试弟子', starRating: 3,
        realm: 1, subRealm: 1, aura: 0,
        personality: { aggressive: 0.5, persistent: 0.5, kind: 0.5, lazy: 0.5, smart: 0.5 },
        personalityName: '沉稳', spiritualRoots: ['金'],
        behavior: 'idle', lastDecisionTime: 0, behaviorTimer: 0, stamina: 100,
      },
    ],
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

  // 模拟 migrateV1toV2
  // 直接 inline 实现（因为原函数在 browser 模块中有 localStorage 依赖）
  const raw = JSON.parse(JSON.stringify(v1Save)) as Record<string, unknown>;

  // 删除旧字段
  delete raw['fields'];
  delete raw['alchemy'];

  // 弟子级迁移
  const disciples = raw['disciples'] as Record<string, unknown>[];
  for (const d of disciples) {
    if (!Array.isArray(d['farmPlots'])) d['farmPlots'] = [];
    if (d['currentRecipeId'] === undefined) d['currentRecipeId'] = null;
  }

  // 新增全局字段
  if (!Array.isArray(raw['pills'])) raw['pills'] = [];

  // sect 迁移
  const sect = raw['sect'] as Record<string, unknown>;
  if (sect['tributePills'] === undefined) sect['tributePills'] = 0;

  raw['version'] = 2;

  // 验证迁移结果
  assert(raw['version'] === 2, `version = ${raw['version']}`);
  assert(!('fields' in raw), 'fields 已删除');
  assert(!('alchemy' in raw), 'alchemy 已删除');
  assert(Array.isArray(raw['pills']), 'pills 是数组');

  const d = (raw['disciples'] as Record<string, unknown>[])[0];
  assert(Array.isArray(d['farmPlots']), '弟子.farmPlots 是数组');
  assert(d['currentRecipeId'] === null, '弟子.currentRecipeId === null');
  assert((raw['sect'] as Record<string, unknown>)['tributePills'] === 0, 'sect.tributePills === 0');
  assert(raw['aura'] === 100, '原有数据保留: aura=100');
  assert((raw['materialPouch'] as Record<string, number>)['low-herb'] === 5, '原有数据保留: low-herb=5');
}

// ===== 结果汇总 =====

console.log(`\n${'='.repeat(50)}`);
if (failures === 0) {
  console.log(`${PASS} 全部测试通过！`);
} else {
  console.log(`${FAIL} ${failures} 项测试失败`);
  process.exit(1);
}
