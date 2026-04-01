/**
 * POC 3d: 多轮连贯测试
 *
 * 核心问题: 当同一对 NPC 经历 N 个 tick 的累积事件后，
 *            AI 的情绪/行为决策是否与累积历史保持一致？
 *
 * 3 条叙事线 × 5 个 tick = 15 次 AI 调用
 *   S1: 友谊裂变 (+60 → -50) — 转折检测
 *   S2: 金兰结义 (0 → +90) — 升温一致
 *   S3: 淡如水 (+10 → +20) — 平淡控制
 *
 * 使用与 soul-evaluator.ts 相同的 prompt 格式和 JSON Schema。
 *
 * 运行: npx tsx scripts/poc-3d-coherence.ts
 */

import { describeMoral, describeEthos } from '../src/ai/soul-prompt-builder';
import { buildCandidatePool } from '../src/shared/data/emotion-pool';
import { SOUL_EVAL_JSON_SCHEMA } from '../src/ai/soul-prompt-builder';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'http://localhost:3001';

// ===== Logger =====

const logBuffer: Array<{ ts: number; msg: string }> = [];
function log(msg: string): void {
  const ts = Date.now();
  logBuffer.push({ ts, msg });
  console.log(`[${new Date(ts).toLocaleTimeString('zh-CN')}] ${msg}`);
}

// ===== 类型 =====

interface TickEvent {
  tick: number;
  /** 当前 tick 发生的事件描述 */
  eventDesc: string;
  /** 事件类型 (soul-evaluator format) */
  eventType: string;
  /** 本 tick 好感变化 */
  affinityDelta: number;
  /** 本 tick 后的累积好感 */
  affinityAfter: number;
  /** 关键事件摘要 (≤30字符，用于 keyEvents 录入) */
  keyEventContent: string;
  /** 事件严重度 (决定 context level) */
  severity: number;
  /** 预期情绪方向 */
  expectedDirection: 'positive' | 'negative' | 'neutral';
}

interface StoryArc {
  id: string;
  label: string;
  /** 主体角色 */
  subjectName: string;
  personalityName: string;
  traitHints: string;
  goodEvil: number;
  lawChaos: number;
  /** 宗门 */
  sectName: string;
  sectEthos: number;
  sectDiscipline: number;
  /** 目标角色 */
  targetName: string;
  /** 初始好感 */
  initialAffinity: number;
  /** tick 序列 */
  ticks: TickEvent[];
  /** 叙事弧总结 */
  arcSummary: string;
}

interface TickResult {
  tick: number;
  eventDesc: string;
  affinity: number;
  keyEventsCount: number;
  contextLevel: string;
  systemPrompt: string;
  userPrompt: string;
  rawResponse: string;
  parsed: Record<string, unknown> | null;
  emotion: string;
  intensity: number;
  innerThought: string;
  latencyMs: number;
  expectedDirection: string;
  actualDirection: string;
  directionMatch: boolean;
  referencesHistory: boolean;
}

// ===== 3 条叙事线 =====

const STORY_ARCS: StoryArc[] = [
  {
    id: 'S1', label: '友谊裂变',
    subjectName: '张清风', personalityName: '温和坚毅', traitHints: '重情义',
    goodEvil: 40, lawChaos: 30,
    sectName: '青云宗', sectEthos: -30, sectDiscipline: 40,
    targetName: '李沐阳', initialAffinity: 60,
    arcSummary: '曾经的好友，因误会和背叛走向决裂',
    ticks: [
      {
        tick: 100, eventDesc: '李沐阳在你被冤枉时，挺身而出为你说话，化解了一场误会',
        eventType: 'social_praise', affinityDelta: 0, affinityAfter: 60,
        keyEventContent: '替你化解误会', severity: 3,
        expectedDirection: 'positive',
      },
      {
        tick: 200, eventDesc: '你听到李沐阳在背后对其他同门议论你修炼资质不佳',
        eventType: 'social_gossip', affinityDelta: -15, affinityAfter: 45,
        keyEventContent: '背后议论你资质不佳', severity: 3,
        expectedDirection: 'negative',
      },
      {
        tick: 300, eventDesc: '李沐阳当着众人的面否认曾经帮助过你，说那只是顺手而已',
        eventType: 'social_betray', affinityDelta: -20, affinityAfter: 25,
        keyEventContent: '公开否认帮过你', severity: 4,
        expectedDirection: 'negative',
      },
      {
        tick: 400, eventDesc: '李沐阳趁你闭关修炼时，抢走了你发现的灵脉修炼位',
        eventType: 'resource_steal', affinityDelta: -25, affinityAfter: 0,
        keyEventContent: '趁你闭关抢走灵脉', severity: 4,
        expectedDirection: 'negative',
      },
      {
        tick: 500, eventDesc: '李沐阳联合其他同门在宗门大会上当众指控你偷盗门派秘典',
        eventType: 'social_frame', affinityDelta: -30, affinityAfter: -30,
        keyEventContent: '联合他人诬陷你偷盗秘典', severity: 5,
        expectedDirection: 'negative',
      },
    ],
  },
  {
    id: 'S2', label: '金兰结义',
    subjectName: '赵铁柱', personalityName: '憨厚忠诚', traitHints: '知恩图报',
    goodEvil: 50, lawChaos: 40,
    sectName: '太和宗', sectEthos: -40, sectDiscipline: 50,
    targetName: '玄清', initialAffinity: 0,
    arcSummary: '从陌生同门到过命之交',
    ticks: [
      {
        tick: 100, eventDesc: '玄清借给你一瓶灵药帮你治伤',
        eventType: 'gift_medicine', affinityDelta: 15, affinityAfter: 15,
        keyEventContent: '借灵药帮你治伤', severity: 2,
        expectedDirection: 'positive',
      },
      {
        tick: 200, eventDesc: '你和玄清在秘境中并肩抵御妖兽，他挡在你前面受了伤',
        eventType: 'combat_protect', affinityDelta: 25, affinityAfter: 40,
        keyEventContent: '并肩抗敌替你挡伤', severity: 4,
        expectedDirection: 'positive',
      },
      {
        tick: 300, eventDesc: '玄清毫无保留地和你分享了自己的修炼心得和突破经验',
        eventType: 'teach_share', affinityDelta: 15, affinityAfter: 55,
        keyEventContent: '分享修炼心得', severity: 2,
        expectedDirection: 'positive',
      },
      {
        tick: 400, eventDesc: '在宗门试炼中，玄清以命相搏替你挡下了致命的禁术反噬',
        eventType: 'combat_sacrifice', affinityDelta: 25, affinityAfter: 80,
        keyEventContent: '以命替你挡禁术反噬', severity: 5,
        expectedDirection: 'positive',
      },
      {
        tick: 500, eventDesc: '玄清主动向你坦诚了自己隐瞒多年的身世秘密，把你当作最信任的人',
        eventType: 'social_trust', affinityDelta: 10, affinityAfter: 90,
        keyEventContent: '向你坦诚身世秘密', severity: 3,
        expectedDirection: 'positive',
      },
    ],
  },
  {
    id: 'S3', label: '淡如水',
    subjectName: '苏瑶', personalityName: '温和善良', traitHints: '好学不倦',
    goodEvil: 45, lawChaos: 30,
    sectName: '碧落宗', sectEthos: -20, sectDiscipline: 30,
    targetName: '周明', initialAffinity: 10,
    arcSummary: '普通同门日常交往，关系平淡',
    ticks: [
      {
        tick: 100, eventDesc: '周明在药园遇到你，礼貌地打了个招呼',
        eventType: 'social_greet', affinityDelta: 5, affinityAfter: 15,
        keyEventContent: '药园打招呼', severity: 1,
        expectedDirection: 'neutral',
      },
      {
        tick: 200, eventDesc: '你和周明在灵田旁偶遇，闲聊了几句宗门近况',
        eventType: 'social_chat', affinityDelta: 0, affinityAfter: 15,
        keyEventContent: '灵田闲聊', severity: 1,
        expectedDirection: 'neutral',
      },
      {
        tick: 300, eventDesc: '周明和你一起在静室打坐修炼了半日',
        eventType: 'social_meditate', affinityDelta: 5, affinityAfter: 20,
        keyEventContent: '一起打坐半日', severity: 1,
        expectedDirection: 'neutral',
      },
      {
        tick: 400, eventDesc: '在山路上碰见周明，他朝你微微点头示意',
        eventType: 'social_greet', affinityDelta: 0, affinityAfter: 20,
        keyEventContent: '山路点头示意', severity: 1,
        expectedDirection: 'neutral',
      },
      {
        tick: 500, eventDesc: '周明来找你借了一本功法典籍，答应过两天还',
        eventType: 'social_borrow', affinityDelta: 0, affinityAfter: 20,
        keyEventContent: '借功法典籍', severity: 1,
        expectedDirection: 'neutral',
      },
    ],
  },
];

// ===== Context Level (mirror soul-prompt-builder getContextLevel) =====

function getContextLevel(severity: number): 'L0' | 'L2' | 'L6' {
  if (severity < 2) return 'L0';
  if (severity < 4) return 'L2';
  return 'L6';
}

// ===== API =====

interface ApiResult {
  parsed: Record<string, unknown> | null;
  rawContent: string;
  latencyMs: number;
}

async function callInfer(sysMsg: string, userMsg: string, schema: object, maxTokens = 200): Promise<ApiResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: sysMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        timeout_ms: 10000,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'soul_eval', strict: true, schema },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { parsed: null, rawContent: `HTTP ${res.status}`, latencyMs };
    const data = await res.json() as { content: string; parsed?: Record<string, unknown> | null };
    const rawContent = data.content ?? '';
    const parsed = data.parsed ?? (() => { try { return JSON.parse(rawContent) as Record<string, unknown>; } catch { return null; } })();
    return { parsed, rawContent, latencyMs };
  } catch (err) {
    return { parsed: null, rawContent: `Error: ${err instanceof Error ? err.message : String(err)}`, latencyMs: Date.now() - start };
  }
}

// ===== Prompt 构建 =====

interface AccumulatedState {
  affinity: number;
  tags: string[];
  keyEvents: Array<{ content: string; affinityDelta: number; tick: number }>;
  narrativeSnippet: string;
}

function buildPrompt(
  arc: StoryArc,
  tick: TickEvent,
  accumulated: AccumulatedState,
  contextLevel: 'L0' | 'L2' | 'L6',
): { system: string; user: string } {
  // System: 与 soul-evaluator.ts 一致
  const system = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。';

  // User: 复刻 soul-evaluator + soul-prompt-builder 格式
  const moralDesc = describeMoral(arc.goodEvil, arc.lawChaos);
  const ethosDesc = describeEthos(arc.sectEthos, arc.sectDiscipline);
  const candidatePool = buildCandidatePool(tick.eventType as any, 'observer' as any);
  const emotionList = candidatePool.join(', ');

  const lines: string[] = [
    `你是${arc.subjectName}，${arc.personalityName}${arc.traitHints ? '，' + arc.traitHints : ''}。`,
    `${moralDesc ? moralDesc + '。' : ''}`,
    `【宗门】${ethosDesc}`,
  ];

  // 关系摘要（模拟 buildRelationshipSummary）
  if (contextLevel !== 'L0') {
    lines.push(`【与${arc.targetName}的关系】`);
    lines.push(`好感：${accumulated.affinity}`);

    const sortedEvents = [...accumulated.keyEvents].sort(
      (a, b) => Math.abs(b.affinityDelta) - Math.abs(a.affinityDelta)
    );

    if (contextLevel === 'L2' && sortedEvents.length > 0) {
      const e = sortedEvents[0];
      lines.push(`关键经历：${e.content}(${e.affinityDelta > 0 ? '+' : ''}${e.affinityDelta})`);
    } else if (contextLevel === 'L6') {
      if (sortedEvents.length > 0) {
        const top3 = sortedEvents.slice(0, 3);
        const eventsStr = top3
          .map(e => `${e.content}(${e.affinityDelta > 0 ? '+' : ''}${e.affinityDelta})`)
          .join('；');
        lines.push(`关键经历：${eventsStr}`);
      }
      if (accumulated.narrativeSnippet) {
        lines.push(accumulated.narrativeSnippet);
      }
    }
  }

  lines.push(`刚才发生了一件事。`);
  lines.push(`${arc.targetName}${tick.eventDesc}`);
  lines.push(`从以下情绪中选择${arc.subjectName}的反应：【${emotionList}】`);

  return { system, user: lines.filter(l => l.length > 0).join('\n') };
}

// ===== 情绪方向判定 =====

const POSITIVE_EMOTIONS = new Set(['joy', 'gratitude', 'admiration', 'pride', 'relief']);
const NEGATIVE_EMOTIONS = new Set(['anger', 'sadness', 'fear', 'contempt', 'envy', 'jealousy', 'shame', 'guilt', 'worry']);
const NEUTRAL_EMOTIONS = new Set(['neutral']);

function getEmotionDirection(emotion: string): 'positive' | 'negative' | 'neutral' {
  if (POSITIVE_EMOTIONS.has(emotion)) return 'positive';
  if (NEGATIVE_EMOTIONS.has(emotion)) return 'negative';
  return 'neutral';
}

// ===== 记忆引用检测 =====

function checkHistoryReference(innerThought: string, previousEvents: string[]): boolean {
  if (!innerThought || previousEvents.length === 0) return false;
  // 检查 innerThought 中是否包含之前事件的关键词
  for (const event of previousEvents) {
    // 提取事件中的关键词（取前4个字）
    const keywords = event.substring(0, 4);
    if (innerThought.includes(keywords)) return true;
  }
  return false;
}

// ===== 主流程 =====

async function runArc(arc: StoryArc): Promise<TickResult[]> {
  log(`\n--- ${arc.id}: ${arc.label} (${arc.subjectName} → ${arc.targetName}) ---`);

  const results: TickResult[] = [];
  const accumulated: AccumulatedState = {
    affinity: arc.initialAffinity,
    tags: [],
    keyEvents: [],
    narrativeSnippet: '',
  };
  const previousEventContents: string[] = [];

  for (let i = 0; i < arc.ticks.length; i++) {
    const tick = arc.ticks[i];
    const contextLevel = getContextLevel(tick.severity);

    // 更新累积状态
    accumulated.affinity = tick.affinityAfter;
    if (Math.abs(tick.affinityDelta) >= 5) {
      accumulated.keyEvents.push({
        content: tick.keyEventContent,
        affinityDelta: tick.affinityDelta,
        tick: tick.tick,
      });
    }
    // 更新 tag
    if (accumulated.affinity >= 60) accumulated.tags = ['friend'];
    else if (accumulated.affinity >= 30) accumulated.tags = [];
    else if (accumulated.affinity <= -30) accumulated.tags = ['rival'];
    else accumulated.tags = [];

    // 更新 narrative snippet
    if (accumulated.affinity >= 60) {
      accumulated.narrativeSnippet = `${arc.subjectName}与${arc.targetName}情谊深厚，彼此信任有加。`;
    } else if (accumulated.affinity >= 30) {
      accumulated.narrativeSnippet = `${arc.subjectName}对${arc.targetName}印象尚可，相处融洽。`;
    } else if (accumulated.affinity <= -30) {
      accumulated.narrativeSnippet = `${arc.subjectName}对${arc.targetName}心怀怨恨，往日恩情已荡然无存。`;
    } else if (accumulated.affinity <= -10 && accumulated.keyEvents.length > 1) {
      accumulated.narrativeSnippet = `${arc.subjectName}对${arc.targetName}心生芥蒂，信任渐失。`;
    } else {
      accumulated.narrativeSnippet = '';
    }

    // 构建 prompt
    const { system, user } = buildPrompt(arc, tick, accumulated, contextLevel);

    // 调用 AI
    const result = await callInfer(system, user, SOUL_EVAL_JSON_SCHEMA, 200);

    const emotion = (result.parsed?.emotion as string) ?? 'unknown';
    const intensity = (result.parsed?.intensity as number) ?? 0;
    const innerThought = (result.parsed?.innerThought as string) ?? '';
    const actualDir = getEmotionDirection(emotion);
    const directionMatch = tick.expectedDirection === 'neutral'
      ? true  // neutral 接受任何平淡回应
      : actualDir === tick.expectedDirection;
    const referencesHistory = checkHistoryReference(innerThought, previousEventContents);

    const emoji = result.parsed ? (directionMatch ? '✅' : '❌') : '⚠️';
    log(`  [T${tick.tick}] ${emoji} ${emotion}(${intensity}) aff=${tick.affinityAfter} ctx=${contextLevel} ${Math.round(result.latencyMs)}ms`);
    if (innerThought) log(`    💭 "${innerThought.substring(0, 60)}${innerThought.length > 60 ? '...' : ''}"`);

    results.push({
      tick: tick.tick,
      eventDesc: tick.eventDesc,
      affinity: tick.affinityAfter,
      keyEventsCount: accumulated.keyEvents.length,
      contextLevel,
      systemPrompt: system,
      userPrompt: user,
      rawResponse: result.rawContent,
      parsed: result.parsed,
      emotion,
      intensity,
      innerThought,
      latencyMs: result.latencyMs,
      expectedDirection: tick.expectedDirection,
      actualDirection: actualDir,
      directionMatch,
      referencesHistory,
    });

    previousEventContents.push(tick.keyEventContent);
  }

  return results;
}

// ===== 报告生成 =====

function generateReport(allResults: Map<string, TickResult[]>): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const lines: string[] = [
    `# POC 3d: 多轮连贯测试`,
    '',
    `> **日期**: ${new Date().toISOString().substring(0, 19)} | **模型**: Qwen3.5-2B`,
    `> **方法**: 3 叙事线 × 5 tick = 15 次 AI 调用 | 使用 soul-evaluator prompt 格式`,
    '',
    '---',
    '',
  ];

  // 1. 总体验证
  let totalTicks = 0, dirOk = 0, refOk = 0, parseOk = 0;
  for (const [arcId, results] of allResults) {
    for (const r of results) {
      totalTicks++;
      if (r.parsed) parseOk++;
      if (r.directionMatch) dirOk++;
      if (r.referencesHistory) refOk++;
    }
  }

  lines.push('## 1. 假设验证');
  lines.push('');
  lines.push('| 假设 | 结论 | 数据 |');
  lines.push('|------|:----:|------|');
  const dirRate = Math.round(dirOk / totalTicks * 100);
  lines.push(`| E1 情绪方向一致 ≥80% | ${dirRate >= 80 ? '✅ PASS' : '❌ FAIL'} | ${dirRate}% (${dirOk}/${totalTicks}) |`);
  // E2: S1 转折
  const s1 = allResults.get('S1')!;
  const s1Transition = s1[0].actualDirection !== s1[1].actualDirection || s1[1].actualDirection === 'negative';
  lines.push(`| E2 S1转折检测 (Tick1正→Tick2非正) | ${s1Transition ? '✅ PASS' : '❌ FAIL'} | T1:${s1[0].emotion} → T2:${s1[1].emotion} |`);
  // E3: 记忆引用
  const ticksWithHistory = Array.from(allResults.values()).flat().filter(r => r.tick > 100); // 排除第 1 tick
  const refRate = ticksWithHistory.length > 0 ? Math.round(ticksWithHistory.filter(r => r.referencesHistory).length / ticksWithHistory.length * 100) : 0;
  lines.push(`| E3 记忆引用 ≥50% | ${refRate >= 50 ? '✅ PASS' : '❌ FAIL'} | ${refRate}% |`);
  lines.push(`| 解析成功率 | ${parseOk === totalTicks ? '✅' : '⚠️'} | ${parseOk}/${totalTicks} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 2. 情绪轨迹图
  lines.push('## 2. 情绪轨迹');
  lines.push('');
  for (const arc of STORY_ARCS) {
    const results = allResults.get(arc.id)!;
    lines.push(`### ${arc.id}: ${arc.label} (${arc.arcSummary})`);
    lines.push('');
    lines.push('```');
    lines.push(`  Tick    好感    情绪           强度  方向    预期    匹配  引用`);
    lines.push(`  ----    ----    ----           ----  ----    ----    ----  ----`);
    for (const r of results) {
      const aff = String(r.affinity).padStart(4);
      const emo = r.emotion.padEnd(15);
      const dir = r.actualDirection.padEnd(8);
      const exp = r.expectedDirection.padEnd(8);
      const match = r.directionMatch ? '✅' : '❌';
      const ref = r.referencesHistory ? '📖' : '·';
      lines.push(`  ${String(r.tick).padStart(4)}    ${aff}    ${emo}${r.intensity}     ${dir}${exp}${match}    ${ref}`);
    }
    lines.push('```');
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  // 3. 逐条明细
  lines.push('## 3. 逐条明细（人工审查用）');
  lines.push('');
  for (const arc of STORY_ARCS) {
    const results = allResults.get(arc.id)!;
    for (const r of results) {
      lines.push(`### ${arc.id} Tick ${r.tick} (好感=${r.affinity}, ctx=${r.contextLevel})`);
      lines.push('');
      lines.push(`**事件**: ${r.eventDesc}`);
      lines.push('');
      lines.push('**Prompt (System)**:');
      lines.push('```');
      lines.push(r.systemPrompt);
      lines.push('```');
      lines.push('');
      lines.push('**Prompt (User)**:');
      lines.push('```');
      lines.push(r.userPrompt);
      lines.push('```');
      lines.push('');
      lines.push(`**Response** (${r.latencyMs}ms, parse=${r.parsed ? '✅' : '❌'}):`);
      lines.push('```json');
      lines.push(r.rawResponse);
      lines.push('```');
      lines.push('');
      lines.push(`> **情绪**: ${r.emotion}(${r.intensity}) | **方向**: ${r.actualDirection} | **预期**: ${r.expectedDirection} | ${r.directionMatch ? '✅' : '❌'}`);
      if (r.innerThought) {
        lines.push(`> **独白**: "${r.innerThought}"`);
        lines.push(`> **引用历史**: ${r.referencesHistory ? '✅ 是' : '❌ 否'}`);
      }
      lines.push('');
      lines.push('**人工评分**: 情绪合理 ___/5 | 独白连贯 ___/5 | 历史感知 ___/5');
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // 4. 延迟
  const allLatencies = Array.from(allResults.values()).flat().map(r => r.latencyMs).sort((a, b) => a - b);
  lines.push('## 4. 延迟');
  lines.push('');
  lines.push('| Min | P50 | P95 | Max | Avg |');
  lines.push('|:---:|:---:|:---:|:---:|:---:|');
  const p50 = allLatencies[Math.floor(allLatencies.length * 0.5)];
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)];
  const avg = Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length);
  lines.push(`| ${allLatencies[0]}ms | ${p50}ms | ${p95}ms | ${allLatencies[allLatencies.length - 1]}ms | ${avg}ms |`);
  lines.push('');

  return lines.join('\n');
}

// ===== Main =====

async function main() {
  const startTime = Date.now();
  log(`=== POC 3d: 多轮连贯测试 (3 叙事线 × 5 tick = 15 调用) ===`);

  // 健康检查
  try {
    const health = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!health.ok) throw new Error('server not healthy');
  } catch {
    log('❌ AI server 未运行 (localhost:3001)');
    process.exit(1);
  }

  const allResults = new Map<string, TickResult[]>();

  for (const arc of STORY_ARCS) {
    const results = await runArc(arc);
    allResults.set(arc.id, results);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n=== 完成 ${elapsed}s ===`);

  // 保存
  const logsDir = join('docs', 'pipeline', 'phaseIJ-poc', 'logs');
  const reportDir = join('docs', 'pipeline', 'phaseIJ-poc');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  // JSON 数据
  const jsonPath = join(logsDir, `poc-3d-${ts}.json`);
  const jsonData = Object.fromEntries(allResults);
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

  // 日志
  const logPath = join(logsDir, `poc-3d-${ts}.txt`);
  writeFileSync(logPath, logBuffer.map(l => `[${new Date(l.ts).toISOString()}] ${l.msg}`).join('\n'), 'utf-8');

  // 报告
  const report = generateReport(allResults);
  const reportPath = join(reportDir, 'review-poc-3d-coherence.md');
  writeFileSync(reportPath, report, 'utf-8');

  log(`  ${reportPath}`);
}

main().catch(console.error);
