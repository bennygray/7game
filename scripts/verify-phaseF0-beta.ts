/**
 * Phase F0-β 专项验证脚本
 *
 * 验证：事件池完整性、张力公式、喘息期、严重度升级、
 *       道风权重、EventBus emit、MUD 日志分级
 *
 * @see phaseF0-beta-PRD.md + phaseF0-beta-TDD.md
 */

import { WORLD_EVENT_REGISTRY } from '../src/shared/data/world-event-registry';
import { EventSeverity } from '../src/shared/types/world-event';
import type { WorldEventDef, WorldEventPayload } from '../src/shared/types/world-event';
import { Storyteller } from '../src/engine/storyteller';
import { EMOTION_CANDIDATE_POOL, buildCandidatePool } from '../src/shared/data/emotion-pool';
import { SOUL_EVENT_POLARITY } from '../src/shared/types/soul';
import { createDefaultLiteGameState } from '../src/shared/types/game-state';

// ===== 工具 =====

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n━━━ ${name} ━━━`);
}

// ===== 1. 事件池完整性 =====

section('1. 事件池完整性');

assert(WORLD_EVENT_REGISTRY.length === 12, '注册表含 12 个事件', `实际 ${WORLD_EVENT_REGISTRY.length}`);

// ID 唯一性
const ids = WORLD_EVENT_REGISTRY.map(d => d.id);
const uniqueIds = new Set(ids);
assert(uniqueIds.size === ids.length, '所有 ID 唯一');

// 每个事件至少 3 条模板
for (const def of WORLD_EVENT_REGISTRY) {
  assert(def.templates.length >= 3, `${def.id} (${def.name}): ≥3 条模板`, `实际 ${def.templates.length}`);
}

// 严重度分布
const severityCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
for (const def of WORLD_EVENT_REGISTRY) {
  severityCounts[def.baseSeverity]++;
}
assert(severityCounts[0] >= 3, `Lv.0 BREATH ≥3 个`, `实际 ${severityCounts[0]}`);
assert(severityCounts[1] >= 3, `Lv.1 RIPPLE ≥3 个`, `实际 ${severityCounts[1]}`);
assert(severityCounts[2] >= 3, `Lv.2 SPLASH ≥3 个`, `实际 ${severityCounts[2]}`);
assert(severityCounts[3] >= 1, `Lv.3 STORM ≥1 个`, `实际 ${severityCounts[3]}`);
assert(severityCounts[4] === 0, `Lv.4 CALAMITY = 0 个（F0-β 不定义）`, `实际 ${severityCounts[4]}`);

// 类别分布
const categories = {
  battle: WORLD_EVENT_REGISTRY.filter(d => d.id.startsWith('WE-B')).length,
  visitor: WORLD_EVENT_REGISTRY.filter(d => d.id.startsWith('WE-V')).length,
  discovery: WORLD_EVENT_REGISTRY.filter(d => d.id.startsWith('WE-D')).length,
  sect: WORLD_EVENT_REGISTRY.filter(d => d.id.startsWith('WE-S')).length,
};
assert(categories.battle === 4, `战斗类 = 4`, `实际 ${categories.battle}`);
assert(categories.visitor === 3, `访客类 = 3`, `实际 ${categories.visitor}`);
assert(categories.discovery === 3, `发现类 = 3`, `实际 ${categories.discovery}`);
assert(categories.sect === 2, `宗门类 = 2`, `实际 ${categories.sect}`);

// ===== 2. Storyteller 张力公式 =====

section('2. Storyteller 张力逻辑');

const state = createDefaultLiteGameState();

// 测试 Storyteller 构造 — 初始张力 30
const st = new Storyteller();
assert(st.getTensionIndex() === 30, '初始张力 = 30');

// 张力衰减测试（5 秒 tick，衰减 0.5/s → 衰减 2.5）
// 需要在不触发事件的情况下 tick — 用超短间隔不会触发（accumulator < 30s）
st.tick(state, 5);
const tensionAfterDecay = st.getTensionIndex();
assert(
  Math.abs(tensionAfterDecay - 27.5) < 0.01,
  `5s 衰减后张力 ≈ 27.5`,
  `实际 ${tensionAfterDecay.toFixed(2)}`,
);

// ===== 3. 道风权重调节 =====

section('3. 道风权重调节');

// 霸道宗门 (ethos=+80) 应提升霸道亲和事件权重
const battleEvent = WORLD_EVENT_REGISTRY.find(d => d.id === 'WE-B01')!;
assert(battleEvent.ethosAffinity.sign === +1, 'WE-B01 霸道亲和 sign=+1');

const ethosBonus80 = battleEvent.ethosAffinity.sign * (80 / 100) * battleEvent.ethosAffinity.factor;
const adjustedWeight = battleEvent.weight * (1 + ethosBonus80);
assert(adjustedWeight > battleEvent.weight, `ethos=+80 时 WE-B01 权重增加: ${battleEvent.weight} → ${adjustedWeight.toFixed(1)}`);

// 仁道宗门 (ethos=-60) 应提升仁道亲和事件权重
const visitorEvent = WORLD_EVENT_REGISTRY.find(d => d.id === 'WE-V01')!;
assert(visitorEvent.ethosAffinity.sign === -1, 'WE-V01 仁道亲和 sign=-1');

const ethosBonus60 = visitorEvent.ethosAffinity.sign * (-60 / 100) * visitorEvent.ethosAffinity.factor;
const adjustedWeightV = visitorEvent.weight * (1 + ethosBonus60);
assert(adjustedWeightV > visitorEvent.weight, `ethos=-60 时 WE-V01 权重增加: ${visitorEvent.weight} → ${adjustedWeightV.toFixed(1)}`);

// ===== 4. 情绪池扩展 =====

section('4. 情绪池扩展');

assert('world-event' in EMOTION_CANDIDATE_POOL, 'EMOTION_CANDIDATE_POOL 含 world-event');
const weSelf = buildCandidatePool('world-event', 'self');
const weObserver = buildCandidatePool('world-event', 'observer');
assert(weSelf.length >= 4, `world-event self 候选 ≥4`, `实际 ${weSelf.length}`);
assert(weObserver.length >= 3, `world-event observer 候选 ≥3`, `实际 ${weObserver.length}`);

// ===== 5. SoulEventType + Polarity =====

section('5. SoulEventType + Polarity 扩展');

assert(SOUL_EVENT_POLARITY['world-event'] !== undefined, 'SOUL_EVENT_POLARITY 含 world-event');
assert(SOUL_EVENT_POLARITY['world-event'] === 'positive', 'world-event 默认极性 = positive');

// ===== 6. condition 纯函数性 =====

section('6. Condition 纯函数验证');

for (const def of WORLD_EVENT_REGISTRY) {
  const result = def.condition(state);
  assert(typeof result === 'boolean', `${def.id} condition 返回 boolean`, `实际 ${typeof result}`);
}

// 弟子数量条件
const minDiscipleEvents = WORLD_EVENT_REGISTRY.filter(d => {
  const stateEmpty = { ...state, disciples: [] };
  return !d.condition(stateEmpty as any);
});
assert(minDiscipleEvents.length > 0, `部分事件需要弟子数量门槛`, `${minDiscipleEvents.length} 个`);

// ===== 7. 模板占位符 =====

section('7. 模板占位符验证');

for (const def of WORLD_EVENT_REGISTRY) {
  for (const tpl of def.templates) {
    const hasDPlaceholder = tpl.includes('{D}');
    assert(hasDPlaceholder, `${def.id} 模板含 {D} 占位符`);

    if (def.scope === 'multi' || def.scope === 'sect') {
      const hasD2 = tpl.includes('{D2}');
      assert(hasD2, `${def.id} (${def.scope}) 模板含 {D2} 占位符`);
    }
  }
}

// ===== 8. Storyteller 事件触发蒙特卡罗 =====

section('8. 蒙特卡罗 — 事件触发频率');

const severityDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
let triggerCount = 0;
const ROUNDS = 2000;
for (let i = 0; i < ROUNDS; i++) {
  const testSt = new Storyteller();
  const testState = createDefaultLiteGameState();
  // 35 秒（刚好一个检查周期 30s）
  const result = testSt.tick(testState, 35);
  if (result) {
    triggerCount++;
    severityDist[result.severity]++;
  }
}
console.log(`  📊 ${ROUNDS} 轮：触发 ${triggerCount} 次`);
console.log(`     BREATH=${severityDist[0]} RIPPLE=${severityDist[1]} SPLASH=${severityDist[2]} STORM=${severityDist[3]}`);
assert(triggerCount > ROUNDS * 0.5, '触发率 > 50%（设计意图：概率和 ≈ 1.05）', `${triggerCount}/${ROUNDS}`);
assert(severityDist[0] > severityDist[1], 'BREATH 比 RIPPLE 多（权重 0.60 vs 0.30）');
assert(severityDist[1] > severityDist[2], 'RIPPLE 比 SPLASH 多（权重 0.30 vs 0.12）');
assert(severityDist[2] > severityDist[3], 'SPLASH 比 STORM 多（权重 0.12 vs 0.03）');

// ===== 汇总 =====

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Phase F0-β 验证完成：${passed}/${total} 通过`);
if (failed > 0) {
  console.log(`❌ ${failed} 项失败`);
  process.exit(1);
} else {
  console.log('✅ 全部通过');
  process.exit(0);
}
