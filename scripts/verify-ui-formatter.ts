/**
 * mud-formatter 纯函数单元测试 — Phase Y
 *
 * 覆盖 src/ui/mud-formatter.ts 中不依赖 DOM 的纯函数。
 *
 * 运行：npm run test:ui（或 npx tsx scripts/verify-ui-formatter.ts）
 *
 * @see docs/pipeline/phaseY/plan.md Step 5
 */

import {
  getBehaviorIcon,
  getMoralLabel,
  getChaosLabel,
  getEthosLabel,
  getDisciplineLabel,
  matchDisciple,
  wrapDiscipleName,
  formatSeverityLog,
  pickAmbientLine,
} from '../src/ui/mud-formatter';
import { EventSeverity } from '../src/shared/types/world-event';
import type { LiteDiscipleState } from '../src/shared/types/game-state';

// ===== Test Infrastructure =====

const PASS = '\u2705';
const FAIL = '\u274C';
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

function assertEq<T>(actual: T, expected: T, msg: string): void {
  assert(actual === expected, `${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function suite(name: string): void {
  currentSuite = name;
  console.log(`\n--- ${name} ---`);
}

// ===== Mock Data =====

function makeDisciple(id: string, name: string): LiteDiscipleState {
  return {
    id,
    name,
    personalityName: 'test',
    realm: 0,
    subRealm: 0,
    aura: 0,
    comprehension: 0,
    behavior: 'idle',
    behaviorTimer: 0,
    spiritRoot: { metal: 0.5, wood: 0.5, water: 0.5, fire: 0.5, earth: 0.5 },
    moral: { goodEvil: 0, lawChaos: 0 },
    traits: [],
    affinity: {},
    tags: [],
  };
}

// ===== Tests =====

suite('getBehaviorIcon');
{
  assertEq(getBehaviorIcon('idle'), '💤', 'idle icon');
  assertEq(getBehaviorIcon('cultivate'), '', 'cultivate not in icon map (meditate is)');
  assertEq(getBehaviorIcon('meditate'), '🧘', 'meditate icon');
  assertEq(getBehaviorIcon('explore'), '⚔️', 'explore icon');
  assertEq(getBehaviorIcon('rest'), '😴', 'rest icon');
  assertEq(getBehaviorIcon('alchemy'), '🔥', 'alchemy icon');
  assertEq(getBehaviorIcon('farm'), '🌿', 'farm icon');
  assertEq(getBehaviorIcon('unknown_behavior'), '', 'unknown returns empty');
  assertEq(getBehaviorIcon(''), '', 'empty string returns empty');
}

suite('getMoralLabel');
{
  assertEq(getMoralLabel(-100), '邪', '-100 → 邪');
  assertEq(getMoralLabel(-61), '邪', '-61 → 邪');
  assertEq(getMoralLabel(-60), '偏恶', '-60 → 偏恶 (boundary)');
  assertEq(getMoralLabel(-20), '中庸', '-20 → 中庸 (boundary)');
  assertEq(getMoralLabel(0), '中庸', '0 → 中庸');
  assertEq(getMoralLabel(19), '中庸', '19 → 中庸');
  assertEq(getMoralLabel(20), '偏善', '20 → 偏善 (boundary)');
  assertEq(getMoralLabel(60), '义', '60 → 义 (boundary)');
  assertEq(getMoralLabel(100), '义', '100 → 义');
}

suite('getChaosLabel');
{
  assertEq(getChaosLabel(-100), '狂', '-100 → 狂');
  assertEq(getChaosLabel(-60), '偏放', '-60 → 偏放 (boundary)');
  assertEq(getChaosLabel(0), '中庸', '0 → 中庸');
  assertEq(getChaosLabel(59), '偏律', '59 → 偏律');
  assertEq(getChaosLabel(60), '侠', '60 → 侠 (boundary: >= 60)');
  assertEq(getChaosLabel(100), '侠', '100 → 侠');
}

suite('getEthosLabel');
{
  assertEq(getEthosLabel(-100), '至仁', '-100 → 至仁');
  assertEq(getEthosLabel(0), '中庸', '0 → 中庸');
  assertEq(getEthosLabel(100), '至霸', '100 → 至霸');
}

suite('getDisciplineLabel');
{
  assertEq(getDisciplineLabel(-100), '至放', '-100 → 至放');
  assertEq(getDisciplineLabel(0), '中庸', '0 → 中庸');
  assertEq(getDisciplineLabel(100), '至律', '100 → 至律');
}

suite('matchDisciple');
{
  const disciples = [
    makeDisciple('d1', '李清风'),
    makeDisciple('d2', '李明月'),
    makeDisciple('d3', '张无忌'),
  ];

  // empty query
  const r0 = matchDisciple('', disciples);
  assertEq(r0.type, 'none', 'empty query → none');

  // exact match
  const r1 = matchDisciple('张无忌', disciples);
  assertEq(r1.type, 'exact', 'exact match → exact');
  assert(r1.type === 'exact' && r1.disciple.id === 'd3', 'exact match returns correct disciple');

  // unique prefix
  const r2 = matchDisciple('张', disciples);
  assertEq(r2.type, 'exact', 'unique prefix → exact');
  assert(r2.type === 'exact' && r2.disciple.id === 'd3', 'unique prefix returns correct disciple');

  // multiple prefix
  const r3 = matchDisciple('李', disciples);
  assertEq(r3.type, 'multiple', 'ambiguous prefix → multiple');
  assert(r3.type === 'multiple' && r3.candidates.length === 2, 'multiple returns 2 candidates');

  // no match
  const r4 = matchDisciple('王', disciples);
  assertEq(r4.type, 'none', 'no match → none');
}

suite('wrapDiscipleName');
{
  const html = wrapDiscipleName('李清风', 'd1');
  assert(html.includes('mud-disciple-link'), 'contains CSS class');
  assert(html.includes('data-disciple-id="d1"'), 'contains disciple ID');
  assert(html.includes('李清风'), 'contains name');

  // XSS: special characters should be escaped
  const xss = wrapDiscipleName('<script>alert(1)</script>', 'x"y');
  assert(!xss.includes('<script>'), 'escapes < in name');
  assert(!xss.includes('x"y'), 'escapes " in id');
}

suite('formatSeverityLog');
{
  const breath = formatSeverityLog(EventSeverity.BREATH, 'test');
  assert(breath.includes('mud-severity-breath'), 'BREATH has correct class');
  assert(breath.includes('test'), 'BREATH contains text');
  assert(!breath.includes('═══'), 'BREATH no framework');

  const ripple = formatSeverityLog(EventSeverity.RIPPLE, 'msg');
  assert(ripple.includes('mud-severity-ripple'), 'RIPPLE has correct class');

  const splash = formatSeverityLog(EventSeverity.SPLASH, 'splash-msg');
  assert(splash.includes('mud-severity-splash'), 'SPLASH has correct class');
  assert(splash.includes('「'), 'SPLASH has 「 decoration');
  assert(splash.includes('」'), 'SPLASH has 」 decoration');

  const storm = formatSeverityLog(EventSeverity.STORM, 'storm-msg');
  assert(storm.includes('mud-severity-storm'), 'STORM has correct class');
  assert(storm.includes('═══'), 'STORM has ═══ framework');

  // text should be HTML-escaped
  const escaped = formatSeverityLog(EventSeverity.BREATH, '<b>bold</b>');
  assert(!escaped.includes('<b>bold</b>'), 'HTML in text is escaped');
}

suite('pickAmbientLine');
{
  const line = pickAmbientLine();
  assert(typeof line === 'string', 'returns string');
  assert(line.length > 0, 'returns non-empty');

  // run 10 times, all should be non-empty strings
  for (let i = 0; i < 10; i++) {
    const l = pickAmbientLine();
    assert(typeof l === 'string' && l.length > 0, `iteration ${i} returns valid line`);
  }
}

// ===== Summary =====

console.log('\n============================');
console.log(`mud-formatter: ${totalPassed} passed, ${totalFailed} failed (total ${totalPassed + totalFailed})`);
console.log('============================\n');

if (totalFailed > 0) {
  process.exit(1);
}
