/**
 * Phase IJ v3.0 专项测试 — 关系记忆 + 叙事片段
 *
 * 覆盖:
 *   1. RelationshipMemoryManager CRUD
 *   2. 矛盾覆盖（CONTRADICTION_TICK_WINDOW）
 *   3. 软上限淘汰（KEY_EVENTS_SOFT_LIMIT）
 *   4. NarrativeSnippetBuilder 规则拼接 + 模板 + 三层降级
 *   5. buildRelationshipSummary L0/L2/L6
 *   6. getContextLevel 动态切换
 *
 * 运行: npx tsx scripts/verify-phaseIJ-relationship-memory.ts
 */

import { RelationshipMemoryManager } from '../src/engine/relationship-memory-manager';
import { NarrativeSnippetBuilder } from '../src/ai/narrative-snippet-builder';
import {
  EVENT_THRESHOLD,
  KEY_EVENTS_SOFT_LIMIT,
  CONTRADICTION_TICK_WINDOW,
  NARRATIVE_SNIPPET_MAX_CHARS,
} from '../src/shared/types/relationship-memory';
import type { KeyRelationshipEvent } from '../src/shared/types/relationship-memory';
import { getContextLevel } from '../src/ai/soul-prompt-builder';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

// ===== 1. RelationshipMemoryManager 基本读写 =====

console.log('\n--- 1. RelationshipMemoryManager CRUD ---');
{
  const mgr = new RelationshipMemoryManager();

  // 1.1 初始为 null
  assert(mgr.getMemory('a', 'b') === null, '初始无记忆应返回 null');

  // 1.2 recordEncounter 创建记忆
  mgr.recordEncounter('a', 'b', 100);
  const mem1 = mgr.getMemory('a', 'b');
  assert(mem1 !== null, 'recordEncounter 后应存在记忆');
  assert(mem1!.encounterCount === 1, '碰面计数应为 1');
  assert(mem1!.lastEncounterTick === 100, '最后碰面 tick 应为 100');

  // 1.3 recordDialogue
  mgr.recordDialogue('a', 'b', 200);
  const mem2 = mgr.getMemory('a', 'b');
  assert(mem2!.dialogueCount === 1, '对话计数应为 1');
  assert(mem2!.lastEncounterTick === 200, '对话也更新碰面 tick');

  // 1.4 方向性：a→b 和 b→a 是不同记忆
  assert(mgr.getMemory('b', 'a') === null, 'b→a 应为 null（方向性）');

  // 1.5 updateNarrativeSnippet
  mgr.updateNarrativeSnippet('a', 'b', '与张三情同手足');
  assert(mgr.getMemory('a', 'b')!.narrativeSnippet === '与张三情同手足', 'snippet 应正确存储');

  // 1.6 syncFromEdge
  mgr.syncFromEdge({ sourceId: 'a', targetId: 'b', affinity: 42, tags: ['friend'] });
  const mem3 = mgr.getMemory('a', 'b');
  assert(mem3!.affinity === 42, 'syncFromEdge 应更新 affinity');
  assert(mem3!.tags[0] === 'friend', 'syncFromEdge 应更新 tags');
}

// ===== 2. recordEvent + 矛盾覆盖 =====

console.log('\n--- 2. recordEvent + 矛盾覆盖 ---');
{
  const mgr = new RelationshipMemoryManager();

  // 2.1 低于阈值不记录
  mgr.recordEvent('a', 'b', {
    tick: 10,
    eventType: 'alchemy-success',
    content: '炼丹成功',
    affinityDelta: EVENT_THRESHOLD - 1,
  });
  assert(mgr.getMemory('a', 'b') === null, `|delta| < ${EVENT_THRESHOLD} 不应记录`);

  // 2.2 达到阈值记录
  const ev1: KeyRelationshipEvent = {
    tick: 10,
    eventType: 'alchemy-success',
    content: '炼丹成功令人羡慕',
    affinityDelta: EVENT_THRESHOLD,
  };
  mgr.recordEvent('a', 'b', ev1);
  assert(mgr.getMemory('a', 'b')!.keyEvents.length === 1, '达到阈值应记录');

  // 2.3 矛盾覆盖：同类事件（前4字符相同）在 CONTRADICTION_TICK_WINDOW 内替换
  const ev2: KeyRelationshipEvent = {
    tick: 10 + CONTRADICTION_TICK_WINDOW, // 刚好在窗口内
    eventType: 'alchemy-fail',
    content: '炼丹成功却品质低劣', // 前4字符 "炼丹成功" 与 ev1 相同
    affinityDelta: -EVENT_THRESHOLD,
  };
  mgr.recordEvent('a', 'b', ev2);
  const mem = mgr.getMemory('a', 'b')!;
  assert(mem.keyEvents.length === 1, '矛盾覆盖：同类事件（前4字符相同）应替换而非新增');
  assert(mem.keyEvents[0].affinityDelta === -EVENT_THRESHOLD, '应替换为新事件');

  // 2.4 不同类事件（前4字符不同）不覆盖
  const ev3: KeyRelationshipEvent = {
    tick: 15,
    eventType: 'breakthrough-success',
    content: '突破成功很振奋呀',
    affinityDelta: EVENT_THRESHOLD + 2,
  };
  mgr.recordEvent('a', 'b', ev3);
  assert(mgr.getMemory('a', 'b')!.keyEvents.length === 2, '不同类事件（前4字符不同）应新增');
}

// ===== 3. 软上限淘汰 =====

console.log('\n--- 3. 软上限淘汰 ---');
{
  const mgr = new RelationshipMemoryManager();
  // 填满 KEY_EVENTS_SOFT_LIMIT + 1 个事件
  for (let i = 0; i <= KEY_EVENTS_SOFT_LIMIT; i++) {
    mgr.recordEvent('a', 'b', {
      tick: i * 100, // 间隔足够大，不触发矛盾覆盖
      eventType: `event-${i}` as KeyRelationshipEvent['eventType'],
      content: `事件${String(i).padStart(4, '0')}独特描述`, // 保证前4字符不同
      affinityDelta: EVENT_THRESHOLD + i, // 递增，最后一个 delta 最大
    });
  }
  const mem = mgr.getMemory('a', 'b')!;
  assert(
    mem.keyEvents.length === KEY_EVENTS_SOFT_LIMIT,
    `超上限后应淘汰到 ${KEY_EVENTS_SOFT_LIMIT} 条`
  );
  // 淘汰的应是 |delta| 最小的（第 0 条，delta = EVENT_THRESHOLD）
  const minDelta = Math.min(...mem.keyEvents.map(e => Math.abs(e.affinityDelta)));
  assert(
    minDelta > EVENT_THRESHOLD,
    '|delta| 最小的事件应被淘汰'
  );
}

// ===== 4. NarrativeSnippetBuilder =====

console.log('\n--- 4. NarrativeSnippetBuilder ---');
{
  const builder = new NarrativeSnippetBuilder();
  const mgr = new RelationshipMemoryManager();

  // 4.1 规则拼接 — 高好感 + friend tag
  mgr.syncFromEdge({ sourceId: 'a', targetId: 'b', affinity: 70, tags: ['friend'] });
  mgr.recordEvent('a', 'b', {
    tick: 100, eventType: 'breakthrough-success',
    content: '突破成功时互相鼓励', affinityDelta: 8,
  });
  const mem4_1 = mgr.getMemory('a', 'b')!;
  const snippet1 = builder.getSnippet('张三', '李青', mem4_1);
  assert(snippet1.length > 0, '规则拼接应产出非空文本');
  assert(snippet1.length <= NARRATIVE_SNIPPET_MAX_CHARS, `snippet 应 ≤ ${NARRATIVE_SNIPPET_MAX_CHARS} 字符`);
  console.log(`  规则拼接结果: "${snippet1}"`);

  // 4.2 规则拼接 — 低好感 + rival tag
  const mgr2 = new RelationshipMemoryManager();
  mgr2.syncFromEdge({ sourceId: 'x', targetId: 'y', affinity: -50, tags: ['rival'] });
  mgr2.recordEvent('x', 'y', {
    tick: 50, eventType: 'encounter-conflict',
    content: '碰面冲突争吵不休', affinityDelta: -7,
  });
  const mem4_2 = mgr2.getMemory('x', 'y')!;
  const snippet2 = builder.getSnippet('王五', '王猛', mem4_2);
  assert(snippet2.length > 0, '负面关系也应产出 snippet');
  console.log(`  负面关系结果: "${snippet2}"`);

  // 4.3 无事件时 — 框架短语 + 归纳定性（无事件串联）
  const mgr3 = new RelationshipMemoryManager();
  mgr3.syncFromEdge({ sourceId: 'p', targetId: 'q', affinity: 20, tags: [] });
  const mem4_3 = mgr3.getMemory('p', 'q')!;
  const snippet3 = builder.getSnippet('赵大', '赵四', mem4_3);
  assert(snippet3.length > 0, '无事件时应有框架短语+归纳定性');
  assert(snippet3.length <= NARRATIVE_SNIPPET_MAX_CHARS, '无事件 snippet 也应 ≤ 80 字符');
  console.log(`  无事件结果: "${snippet3}"`);

  // 4.4 cached snippet 优先
  mem4_1.narrativeSnippet = '缓存的叙事片段';
  const snippet4 = builder.getSnippet('张三', '李青', mem4_1);
  assert(snippet4 === '缓存的叙事片段', '有缓存时应返回缓存');
}

// ===== 5. buildRelationshipSummary L0/L2/L6 =====

console.log('\n--- 5. buildRelationshipSummary L0/L2/L6 ---');
{
  const mgr = new RelationshipMemoryManager();
  mgr.syncFromEdge({ sourceId: 'a', targetId: 'b', affinity: 35, tags: ['friend'] });
  mgr.recordEvent('a', 'b', {
    tick: 100, eventType: 'breakthrough-success',
    content: '突破成功振奋人心', affinityDelta: 8,
  });
  mgr.recordEvent('a', 'b', {
    tick: 300, eventType: 'encounter-discuss',
    content: '交流心得颇有共鸣', affinityDelta: 5,
  });
  mgr.updateNarrativeSnippet('a', 'b', '与李青交情匪浅');

  // 5.1 L0 返回 null
  assert(
    mgr.buildRelationshipSummary('a', 'b', '李青', 'L0') === null,
    'L0 应返回 null'
  );

  // 5.2 L2 包含好感 + 1 条事件
  const l2 = mgr.buildRelationshipSummary('a', 'b', '李青', 'L2');
  assert(l2 !== null, 'L2 应返回非空');
  assert(l2!.includes('好感：35'), 'L2 应包含好感值');
  assert(l2!.includes('friend'), 'L2 应包含标签');
  assert(l2!.includes('关键经历'), 'L2 应包含关键经历');
  // L2 只取 top-1（|delta| 最大的）
  assert(l2!.includes('突破成功振奋人心'), 'L2 应包含 |delta| 最大的事件');

  // 5.3 L6 包含 top-3 事件 + narrative snippet
  const l6 = mgr.buildRelationshipSummary('a', 'b', '李青', 'L6');
  assert(l6 !== null, 'L6 应返回非空');
  assert(l6!.includes('与李青交情匪浅'), 'L6 应包含 narrative snippet');
  assert(l6!.includes('交流心得颇有共鸣'), 'L6 应包含第二条事件');

  // 5.4 无记忆时返回 null
  assert(
    mgr.buildRelationshipSummary('x', 'y', '未知', 'L2') === null,
    '无记忆时应返回 null'
  );

  console.log(`  L2 摘要:\n${l2}`);
  console.log(`  L6 摘要:\n${l6}`);
}

// ===== 6. getContextLevel =====

console.log('\n--- 6. getContextLevel 动态切换 ---');
{
  assert(getContextLevel(0) === 'L2', 'Lv.0 → L2');
  assert(getContextLevel(1) === 'L2', 'Lv.1 → L2');
  assert(getContextLevel(2) === 'L6', 'Lv.2 → L6');
  assert(getContextLevel(3) === 'L6', 'Lv.3 → L6');
  assert(getContextLevel(4) === 'L6', 'Lv.4 → L6');
}

// ===== 汇总 =====

console.log('\n============================================================');
console.log(`  Phase IJ 专项测试: ${passed} passed / ${failed} failed`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
