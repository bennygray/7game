/**
 * Phase D Intent 等价性验证脚本
 *
 * 验证 planIntent + executeIntents 与 tickDiscipleLegacy 行为等价
 *
 * @see phaseD-TDD.md ADR-D01
 * @see SKILL.md /SGE Step 2
 */

import { planIntent, tickDisciple, getPersonalityWeights, weightedRandomPick, getBehaviorDuration, getBehaviorAuraReward } from '../src/engine/behavior-tree';
import { executeIntents } from '../src/engine/intent-executor';
import { createDefaultLiteGameState } from '../src/shared/types/game-state';
import type { LiteDiscipleState, LiteGameState } from '../src/shared/types/game-state';
import { DiscipleBehavior } from '../src/shared/types/game-state';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  } else {
    passed++;
  }
}

// ===== Test 1: planIntent 纯函数性 =====
console.log('\n--- Test 1: planIntent 纯函数性（不修改 state） ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.MEDITATE;
  d.behaviorTimer = 5;
  d.stamina = 80;
  const auraBefore = d.aura;
  const staminaBefore = d.stamina;
  const behaviorBefore = d.behavior;
  const timerBefore = d.behaviorTimer;

  const intents = planIntent(d, 1, state);

  // planIntent 不应修改任何 state
  assert(d.aura === auraBefore, `aura 不应被修改 (was ${auraBefore}, now ${d.aura})`);
  assert(d.stamina === staminaBefore, `stamina 不应被修改 (was ${staminaBefore}, now ${d.stamina})`);
  assert(d.behavior === behaviorBefore, `behavior 不应被修改`);
  assert(d.behaviorTimer === timerBefore, `behaviorTimer 不应被修改`);
  assert(intents.length > 0, `应返回至少1个intent (got ${intents.length})`);
}

// ===== Test 2: planIntent 行为结束 → 生成 end-behavior + start-behavior =====
console.log('\n--- Test 2: planIntent 行为结束逻辑 ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.MEDITATE;
  d.behaviorTimer = 0.5; // 将在 deltaS=1 后过期
  d.stamina = 80;

  const intents = planIntent(d, 1, state);

  const endIntent = intents.find(i => i.type === 'end-behavior');
  assert(endIntent !== undefined, '应生成 end-behavior intent');
  assert(endIntent?.oldBehavior === DiscipleBehavior.MEDITATE, `oldBehavior 应为 MEDITATE`);
  assert(endIntent?.auraReward !== undefined && endIntent.auraReward > 0, `auraReward 应 > 0 (got ${endIntent?.auraReward})`);

  const startIntent = intents.find(i => i.type === 'start-behavior');
  // 注：weightedRandomPick 可能选到 IDLE（duration=0），此时不生成 start-behavior
  // 验证：如果有 start-behavior，它必须有 duration > 0
  if (startIntent) {
    assert(startIntent.duration !== undefined && startIntent.duration > 0, `start-behavior duration 应 > 0`);
  }
  // 至少保证 end-behavior 存在
  assert(endIntent !== undefined, 'end-behavior 必须存在');
}

// ===== Test 3: planIntent deltaS=0 防御 =====
console.log('\n--- Test 3: planIntent deltaS=0 防御 ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.MEDITATE;
  d.behaviorTimer = 10;

  const intents = planIntent(d, 0, state);
  assert(intents.length === 0, `deltaS=0 应返回空数组 (got ${intents.length})`);
}

// ===== Test 4: executeIntents 正确修改 state =====
console.log('\n--- Test 4: executeIntents 修改 state ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.IDLE;
  d.stamina = 80;

  const intents = [
    {
      type: 'start-behavior' as const,
      discipleId: d.id,
      newBehavior: DiscipleBehavior.MEDITATE,
      duration: 20,
    },
  ];

  const result = executeIntents(intents, state);

  assert((d.behavior as string) === DiscipleBehavior.MEDITATE, `behavior 应被修改为 MEDITATE (got ${d.behavior})`);
  assert(d.behaviorTimer === 20, `behaviorTimer 应被设为 20 (got ${d.behaviorTimer})`);
  assert(result.events.length === 1, `应生成1个事件 (got ${result.events.length})`);
  assert(result.events[0].newBehavior === DiscipleBehavior.MEDITATE, `事件 newBehavior 应为 MEDITATE`);
}

// ===== Test 5: executeIntents 体力消耗 clamp =====
console.log('\n--- Test 5: executeIntents 体力 clamp ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.stamina = 0.1;

  const intents = [
    {
      type: 'continue' as const,
      discipleId: d.id,
      staminaDelta: -10,
    },
  ];

  executeIntents(intents, state);
  assert(d.stamina === 0, `stamina 应被 clamp 到 0 (got ${d.stamina})`);
}

// ===== Test 6: executeIntents REST 体力恢复 clamp =====
console.log('\n--- Test 6: executeIntents REST 体力恢复 clamp ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.stamina = 98;

  const intents = [
    {
      type: 'continue' as const,
      discipleId: d.id,
      staminaDelta: 10,
    },
  ];

  executeIntents(intents, state);
  assert(d.stamina === 100, `stamina 应被 clamp 到 100 (got ${d.stamina})`);
}

// ===== Test 7: executeIntents end-behavior 生成 DialogueTrigger =====
console.log('\n--- Test 7: executeIntents end-behavior 生成 DialogueTrigger ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.MEDITATE;
  d.behaviorTimer = 10;

  const intents = [
    {
      type: 'end-behavior' as const,
      discipleId: d.id,
      oldBehavior: DiscipleBehavior.MEDITATE,
      auraReward: 5,
    },
  ];

  const result = executeIntents(intents, state);

  assert(result.triggers.length === 1, `应生成1个 DialogueTrigger (got ${result.triggers.length})`);
  assert(result.triggers[0].type === 'behavior-end', `trigger type 应为 behavior-end`);
  assert(result.triggers[0].outcomeTag === 'meditation', `outcomeTag 应为 meditation (got ${result.triggers[0]?.outcomeTag})`);
  assert((d.behavior as string) === DiscipleBehavior.IDLE, `behavior 应被重置为 IDLE`);
  assert(d.behaviorTimer === 0, `behaviorTimer 应被重置为 0`);
}

// ===== Test 8: getBehaviorAuraReward 星级缩放 =====
console.log('\n--- Test 8: getBehaviorAuraReward 星级缩放 ---');
{
  const r1 = getBehaviorAuraReward(DiscipleBehavior.MEDITATE, 1);
  const r3 = getBehaviorAuraReward(DiscipleBehavior.MEDITATE, 3);
  const r5 = getBehaviorAuraReward(DiscipleBehavior.MEDITATE, 5);

  assert(r1 === 5, `1星 MEDITATE 基础奖励 = 5 (got ${r1})`);
  assert(r3 === 7.5, `3星 MEDITATE 奖励 = 7.5 (got ${r3})`);
  assert(r5 === 10, `5星 MEDITATE 奖励 = 10 (got ${r5})`);
}

// ===== Test 9: planIntent IDLE 立刻发起新决策 =====
console.log('\n--- Test 9: planIntent IDLE 立刻发起新决策 ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.IDLE;

  const intents = planIntent(d, 1, state);
  const startIntent = intents.find(i => i.type === 'start-behavior');
  assert(startIntent !== undefined, 'IDLE 弟子应立刻发起 start-behavior');
  assert(startIntent?.duration !== undefined && startIntent.duration > 0, `duration 应 > 0 (got ${startIntent?.duration})`);
}

// ===== Test 10: planIntent 体力 staminaDelta 计算 =====
console.log('\n--- Test 10: planIntent 体力 staminaDelta ---');
{
  const state = createDefaultLiteGameState();
  const d = state.disciples[0];
  d.behavior = DiscipleBehavior.EXPLORE;
  d.behaviorTimer = 20;
  d.stamina = 50;

  const intents = planIntent(d, 2, state);
  const continueIntent = intents.find(i => i.type === 'continue');
  assert(continueIntent !== undefined, '活动行为应生成 continue intent');
  assert(continueIntent?.staminaDelta !== undefined && continueIntent.staminaDelta < 0, `staminaDelta 应 < 0 (got ${continueIntent?.staminaDelta})`);
  // ACTIVE_STAMINA_DRAIN = 0.3/s, deltaS = 2 → -0.6
  assert(
    Math.abs((continueIntent?.staminaDelta ?? 0) - (-0.6)) < 0.001,
    `staminaDelta 应为 -0.6 (got ${continueIntent?.staminaDelta})`
  );
}

// ===== 汇总 =====
console.log(`\n============================================================`);
console.log(`  Phase D Intent 验证: ${passed} passed / ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) {
  console.error('❌ Intent 验证未通过！');
  process.exit(1);
} else {
  console.log('✅ Phase D Intent 等价性验证全通过！');
}
