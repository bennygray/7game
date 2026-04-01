/**
 * IJ-11 阶段 3v5: 基于引擎真实数据格式的决策验证
 *
 * 核心区别：
 *   - 使用引擎实际的 action-pool-builder 行动池（COMBAT_ACTIONS + G3 过滤）
 *   - 使用引擎实际的 prompt 格式（Call1: 事件+角色+宗门+关系）
 *   - 使用引擎实际的 relationship-memory-manager 摘要格式
 *   - 使用引擎实际的 describeEthos/describeMoral 描述器
 *   - 关系标签使用现有5种 + 中文映射
 *
 * 8 场景 × 5 次 = 40 决策 (80 API)
 */

import { buildActionPool, type ActionOption } from '../src/ai/action-pool-builder';
import { describeEthos, describeMoral } from '../src/ai/soul-prompt-builder';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====
const logBuffer: Array<{ ts: number; msg: string }> = [];
function log(msg: string): void {
  const ts = Date.now();
  logBuffer.push({ ts, msg });
  console.log(`[${new Date(ts).toLocaleTimeString('zh-CN')}] ${msg}`);
}

const BASE_URL = 'http://localhost:3001';
const RUNS = 5;

// ===== 关系标签中文映射（引擎可新增） =====
const TAG_LABEL: Record<string, string> = {
  friend: '好友', rival: '宿敌', mentor: '恩师',
  admirer: '仰慕者', grudge: '积怨',
};

// ===== 场景定义（全部使用引擎可提供的字段） =====

interface Scenario {
  id: string; label: string;
  // LiteDiscipleState 字段
  subjectName: string;
  personalityName: string;
  traitHints: string;  // TraitDef.aiHint 拼接
  goodEvil: number;    // moral.goodEvil
  lawChaos: number;    // moral.lawChaos
  // SectState 字段
  sectEthos: number;
  sectDiscipline: number;
  // RelationshipEdge 字段
  targetName: string;
  affinity: number;
  tags: string[];      // 现有5种: friend/rival/mentor/admirer/grudge
  // RelationshipMemory 字段
  keyEvents: Array<{ content: string; delta: number }>;
  narrativeSnippet: string;
  // 事件
  eventType: string;
  eventDefId: string;
  eventDesc: string;   // getEventDescription 输出
  // 预期
  expectedActions: string[];
  wrongActions: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'S1-好友',
    label: '好友（affinity=65, friend tag）',
    subjectName: '张清风', personalityName: '温和坚毅',
    traitHints: '心软易动摇', goodEvil: 40, lawChaos: 30,
    sectEthos: -40, sectDiscipline: 50,
    targetName: '李沐阳', affinity: 65, tags: ['friend'],
    keyEvents: [
      { content: '共同护送灵药', delta: 25 },
      { content: '日常切磋交流', delta: 15 },
      { content: '替你说话化解误会', delta: 20 },
    ],
    narrativeSnippet: '张清风与李沐阳意气相投，共同护送灵药时结下深厚友谊，彼此信任有加。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及李沐阳',
    expectedActions: ['FIGHT', 'PROTECT'], wrongActions: [],
  },
  {
    id: 'S2-恩师',
    label: '恩师（affinity=90, mentor tag）',
    subjectName: '赵铁柱', personalityName: '憨厚忠诚',
    traitHints: '知恩图报', goodEvil: 50, lawChaos: 40,
    sectEthos: -40, sectDiscipline: 50,
    targetName: '玄清道人', affinity: 90, tags: ['mentor'],
    keyEvents: [
      { content: '传授毕生绝学', delta: 35 },
      { content: '替你挡下天劫雷罚', delta: 30 },
      { content: '指导筑基突破', delta: 20 },
    ],
    narrativeSnippet: '赵铁柱受玄清道人大恩，师傅传授绝学，更在天劫中替他挡下雷罚，深恩如山。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及玄清道人',
    expectedActions: ['FIGHT', 'PROTECT'], wrongActions: [],
  },
  {
    id: 'S3-宿敌',
    label: '宿敌（affinity=-70, rival tag）',
    subjectName: '陈剑寒', personalityName: '沉默寡言',
    traitHints: '记仇', goodEvil: -10, lawChaos: 20,
    sectEthos: 0, sectDiscipline: 30,
    targetName: '血影', affinity: -70, tags: ['rival'],
    keyEvents: [
      { content: '血影杀害父亲陈长老', delta: -40 },
      { content: '毁你丹田', delta: -25 },
      { content: '摧毁家族产业', delta: -15 },
    ],
    narrativeSnippet: '陈剑寒与血影有不共戴天之仇，血影残杀其父、毁其丹田，此仇铭刻骨髓。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及血影',
    expectedActions: ['HIDE', 'FLEE', 'FIGHT'], wrongActions: ['PROTECT'],
  },
  {
    id: 'S4-同门',
    label: '普通同门（affinity=30, 无tag）',
    subjectName: '周磊', personalityName: '稳重务实',
    traitHints: '', goodEvil: 20, lawChaos: 10,
    sectEthos: -20, sectDiscipline: 20,
    targetName: '王灵均', affinity: 30, tags: [],
    keyEvents: [
      { content: '一同入门修炼', delta: 15 },
      { content: '共同执行任务', delta: 15 },
    ],
    narrativeSnippet: '周磊与王灵均同门多年，虽非至交却有同袍之谊。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及王灵均',
    expectedActions: ['FIGHT', 'PROTECT', 'HIDE'], wrongActions: [],
  },
  {
    id: 'S5-陌生人',
    label: '陌生散修（affinity=0, 无tag）',
    subjectName: '张清风', personalityName: '内向冷静',
    traitHints: '', goodEvil: 5, lawChaos: 0,
    sectEthos: 0, sectDiscipline: 0,
    targetName: '散修柳三', affinity: 0, tags: [],
    keyEvents: [],
    narrativeSnippet: '',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及一个素不相识的散修',
    expectedActions: ['HIDE', 'FLEE', 'FIGHT'], wrongActions: [],
  },
  {
    id: 'S6-积怨',
    label: '积怨（affinity=-35, grudge tag）',
    subjectName: '林逸风', personalityName: '温和坚毅',
    traitHints: '', goodEvil: 25, lawChaos: 20,
    sectEthos: -20, sectDiscipline: 30,
    targetName: '刘鹤', affinity: -35, tags: ['grudge'],
    keyEvents: [
      { content: '刘鹤当众冒犯你', delta: -20 },
      { content: '暗中造谣中伤', delta: -10 },
      { content: '比武故意使重手', delta: -5 },
    ],
    narrativeSnippet: '林逸风视刘鹤为心思叵测之人，此人屡次中伤，令人戒备。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及刘鹤',
    expectedActions: ['HIDE', 'FLEE'], wrongActions: ['PROTECT'],
  },
  {
    id: 'S7-仰慕',
    label: '仰慕对象（affinity=55, admirer tag）',
    subjectName: '周磊', personalityName: '内敛沉默',
    traitHints: '心软易动摇', goodEvil: 15, lawChaos: 5,
    sectEthos: 0, sectDiscipline: 0,
    targetName: '苏瑶', affinity: 55, tags: ['admirer'],
    keyEvents: [
      { content: '偷偷送灵药助她突破', delta: 20 },
      { content: '远远看她练剑心生好感', delta: 20 },
    ],
    narrativeSnippet: '周磊暗慕苏瑶已久，虽从未表白却一往情深。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及苏瑶',
    expectedActions: ['FIGHT', 'PROTECT'], wrongActions: [],
  },
  {
    id: 'S8-轻微积怨',
    label: '轻微积怨（affinity=-20, 无tag）',
    subjectName: '林逸风', personalityName: '温和坚毅',
    traitHints: '', goodEvil: 25, lawChaos: 20,
    sectEthos: -20, sectDiscipline: 30,
    targetName: '孙小峰', affinity: -20, tags: [],
    keyEvents: [
      { content: '多次在师傅面前诋毁你', delta: -10 },
      { content: '偷看你的修炼笔记', delta: -10 },
    ],
    narrativeSnippet: '林逸风对师弟孙小峰颇为头疼，此人屡次诋毁，令人戒备。',
    eventType: 'world-event', eventDefId: 'beast-attack-01',
    eventDesc: '宗门遭妖兽来袭，波及孙小峰',
    expectedActions: ['HIDE', 'FLEE', 'FIGHT'], wrongActions: [],
  },
];

// ===== 构建引擎格式的 Prompt =====

function buildCall1Prompt(s: Scenario, actionPool: ActionOption[]): { system: string; user: string } {
  // 完全复用 soul-evaluator.ts L287-295 的格式
  const actionListDesc = actionPool.map(a => `${a.code}(${a.label})`).join(' / ');

  const system =
    `你是修仙世界NPC行为决策器。根据角色性格和当前处境，从候选行动中选出最合理的一个。\n` +
    `只需选择行动，不需要解释。角色的道德立场决定了他的选择——邪恶角色会做邪恶的事。\n` +
    `候选行动：【${actionListDesc}】`;

  // 复用 soul-evaluator.ts L292-295 格式
  const moralDesc = describeMoral(s.goodEvil, s.lawChaos);
  const ethosDesc = describeEthos(s.sectEthos, s.sectDiscipline);

  let userLines = [
    `【事件】${s.eventDesc}`,
    `【角色】${s.subjectName} | 性格：${s.personalityName}${s.traitHints ? ' | 特点：' + s.traitHints : ''}${moralDesc ? ' | ' + moralDesc : ''}`,
    `【宗门】${ethosDesc}`,
  ];

  // **关系注入** — 复用 relationship-memory-manager.buildRelationshipSummary 格式
  const tagsStr = s.tags.length > 0
    ? `（${s.tags.map(t => TAG_LABEL[t] ?? t).join('/')}）`
    : '';
  const relLines: string[] = [`【与${s.targetName}的关系】`, `好感：${s.affinity}${tagsStr}`];

  if (s.keyEvents.length > 0) {
    const top3 = [...s.keyEvents]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
    relLines.push(`关键经历：${top3.map(e => `${e.content}(${e.delta > 0 ? '+' : ''}${e.delta})`).join('；')}`);
  }

  if (s.narrativeSnippet) {
    relLines.push(s.narrativeSnippet);
  }

  userLines.push(relLines.join('\n'));

  return { system, user: userLines.join('\n') };
}

function buildCall2Prompt(s: Scenario, action: ActionOption, emotionCandidates: string[]): { system: string; user: string } {
  // 复用 soul-evaluator.ts L331-336 格式
  const system = '你是修仙世界的文学渲染器。根据角色性格和所选行动，生成内心独白并选择情绪。中国古典仙侠风。';
  const user = [
    `【角色】${s.subjectName}（${s.personalityName}）${s.traitHints ? '。' + s.traitHints : ''}`,
    `【事件】${s.eventDesc}`,
    `【选择的行动】${action.code}（${action.label}）`,
    `【候选情绪】${emotionCandidates.join('、')}`,
    `请为${s.subjectName}生成此刻的内心独白（20-80字），并选择一种情绪。`,
  ].join('\n');

  return { system, user };
}

// ===== API =====

const EMOTION_ENUM = ['joy','anger','envy','admiration','sadness','fear',
  'contempt','neutral','jealousy','gratitude','guilt','worry','shame','pride','relief'];

async function callInfer(sysMsg: string, userMsg: string, schema: object, name: string) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/infer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: userMsg }],
        max_tokens: 200, temperature: 0.6, top_p: 0.9, timeout_ms: 10000,
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { parsed: null, latencyMs };
    const data = await res.json() as { content: string; parsed?: Record<string, unknown> | null };
    const parsed = data.parsed ?? (() => { try { return JSON.parse(data.content) as Record<string, unknown>; } catch { return null; } })();
    return { parsed, latencyMs };
  } catch { return { parsed: null, latencyMs: Date.now() - start }; }
}

// ===== Run =====

interface Result {
  scenarioId: string; runIndex: number;
  actionCode: string | null; emotion: string | null; innerThought: string | null;
  latencyMs: number; parseSuccess: boolean;
  isExpected: boolean; isWrong: boolean;
  actionPoolUsed: string; // 记录实际使用的 action pool
}

async function runDecision(s: Scenario, runIdx: number): Promise<Result> {
  // 使用引擎的 buildActionPool
  const actionPool = buildActionPool(s.eventType, s.eventDefId, s.goodEvil);
  const actionPoolDesc = actionPool.map(a => `${a.code}`).join('/');

  const { system: sys1, user: usr1 } = buildCall1Prompt(s, actionPool);
  const schema1 = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: actionPool.map(a => a.code) },
      confidence: { type: 'integer', enum: [1, 2, 3] },
    },
    required: ['action', 'confidence'],
  };

  const r1 = await callInfer(sys1, usr1, schema1, 'decision_v5');
  const actionCode = r1.parsed ? (r1.parsed.action as string) ?? null : null;

  if (!actionCode) {
    return { scenarioId: s.id, runIndex: runIdx, actionCode: null, emotion: null, innerThought: null,
      latencyMs: r1.latencyMs, parseSuccess: false, isExpected: false, isWrong: false, actionPoolUsed: actionPoolDesc };
  }

  const chosenAction = actionPool.find(a => a.code === actionCode) ?? actionPool[0];
  const emotionCandidates = ['anger', 'fear', 'worry', 'contempt', 'neutral', 'joy', 'sadness'];

  const { system: sys2, user: usr2 } = buildCall2Prompt(s, chosenAction, emotionCandidates);
  const schema2 = {
    type: 'object',
    properties: {
      emotion: { type: 'string', enum: EMOTION_ENUM },
      intensity: { type: 'integer', enum: [1, 2, 3] },
      innerThought: { type: 'string', maxLength: 150 },
    },
    required: ['emotion', 'intensity', 'innerThought'],
  };

  const r2 = await callInfer(sys2, usr2, schema2, 'monologue_v5');
  const emotion = r2.parsed ? (r2.parsed.emotion as string) ?? null : null;
  const innerThought = r2.parsed ? (r2.parsed.innerThought as string) ?? null : null;

  return {
    scenarioId: s.id, runIndex: runIdx, actionCode, emotion, innerThought,
    latencyMs: r1.latencyMs + (r2.parsed ? r2.latencyMs : 0), parseSuccess: true,
    isExpected: s.expectedActions.includes(actionCode),
    isWrong: s.wrongActions.includes(actionCode),
    actionPoolUsed: actionPoolDesc,
  };
}

// ===== Main =====

async function main() {
  const startTime = Date.now();
  log(`=== IJ-11 v5: 引擎真实数据格式验证 ===`);
  log(`说明: 使用引擎 buildActionPool + describeMoral/Ethos + buildRelationshipSummary 格式`);
  log(`${SCENARIOS.length} 场景 × ${RUNS} 次 = ${SCENARIOS.length * RUNS} 决策`);

  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json() as { model?: string; modelReady?: boolean };
    if (!d.modelReady) { log('模型未就绪'); process.exit(1); }
    log(`模型: ${d.model}`);
  } catch { log('ai-server 不可用'); process.exit(1); }

  const allResults: Result[] = [];

  for (const s of SCENARIOS) {
    // 显示实际 actionPool
    const pool = buildActionPool(s.eventType, s.eventDefId, s.goodEvil);
    log(`\n=== ${s.id}: ${s.label} ===`);
    log(`ActionPool(G3过滤后): [${pool.map(a => `${a.code}(${a.moralAlign})`).join(', ')}]`);
    log(`预期正确: [${s.expectedActions}] | 预期错误: [${s.wrongActions}]`);

    for (let i = 0; i < RUNS; i++) {
      const r = await runDecision(s, i);
      allResults.push(r);
      const icon = r.parseSuccess ? (r.isExpected ? '✅' : (r.isWrong ? '❌' : '🔸')) : '💀';
      log(`  [${i + 1}/${RUNS}] ${icon} ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | "${(r.innerThought ?? '').slice(0, 25)}..." ${r.latencyMs}ms`);
    }
  }

  const endTime = Date.now();

  // Stats
  interface SStats { id: string; label: string; affinity: number; expectedRate: number; wrongRate: number; dist: Record<string, number>; poolUsed: string }
  const sStats: SStats[] = SCENARIOS.map(s => {
    const sr = allResults.filter(r => r.scenarioId === s.id && r.parseSuccess);
    const n = sr.length;
    const dist: Record<string, number> = {};
    for (const r of sr) if (r.actionCode) dist[r.actionCode] = (dist[r.actionCode] ?? 0) + 1;
    return { id: s.id, label: s.label, affinity: s.affinity,
      expectedRate: n > 0 ? sr.filter(r => r.isExpected).length / n : 0,
      wrongRate: n > 0 ? sr.filter(r => r.isWrong).length / n : 0,
      dist, poolUsed: sr[0]?.actionPoolUsed ?? '' };
  });

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const totalExp = allResults.filter(r => r.parseSuccess && r.isExpected).length;
  const totalParsed = allResults.filter(r => r.parseSuccess).length;
  const overallRate = totalParsed > 0 ? totalExp / totalParsed : 0;

  log(`\n总正确率: ${pct(overallRate)} (${totalExp}/${totalParsed}) | ${((endTime-startTime)/1000).toFixed(1)}s`);

  // Save
  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  writeFileSync(join(logsDir, `poc-ij11-v5-engine-${ts}.json`), JSON.stringify({
    timestamp: new Date().toISOString(), durationMs: endTime - startTime,
    scenarios: SCENARIOS.map(s => ({ id: s.id, label: s.label, affinity: s.affinity,
      tags: s.tags, expected: s.expectedActions, wrong: s.wrongActions })),
    results: allResults, scenarioStats: sStats, overallExpectedRate: overallRate,
  }, null, 2), 'utf8');

  writeFileSync(join(logsDir, `poc-ij11-v5-engine-${ts}.txt`),
    logBuffer.map(e => `[${new Date(e.ts).toLocaleTimeString('zh-CN')}] ${e.msg}`).join('\n\n'), 'utf8');

  const lines = [
    '# IJ-11 v5: 引擎真实数据格式验证', '',
    `> **日期**: ${new Date().toISOString().slice(0,19)} | **模型**: Qwen3.5-2B`,
    '> **格式**: 复用引擎 `buildActionPool` + `describeMoral/Ethos` + `buildRelationshipSummary`',
    `> **总正确率**: **${pct(overallRate)}** (${totalExp}/${totalParsed}) | **耗时**: ${((endTime-startTime)/1000).toFixed(1)}s`, '',
    '---', '',
    '## 核心结果', '',
    '| 场景 | 好感 | Tags | ActionPool | 正确率 | 错误率 | 行动分布 |',
    '|------|:----:|------|-----------|:------:|:------:|---------|',
    ...sStats.map(s => {
      const sc = SCENARIOS.find(x => x.id === s.id)!;
      const d = Object.entries(s.dist).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}=${v}`).join(', ');
      return `| ${s.id} | ${s.affinity} | ${sc.tags.join(',') || '无'} | ${s.poolUsed} | ${pct(s.expectedRate)} | ${pct(s.wrongRate)} | ${d} |`;
    }),
    '', '---', '',
    '## 逐次明细', '',
    '| 场景 | Run | 行动 | 情绪 | 内心独白 | 耗时 | 评价 |',
    '|------|:---:|------|------|---------|:----:|:----:|',
    ...allResults.map(r => {
      const icon = r.parseSuccess ? (r.isExpected ? '✅' : (r.isWrong ? '❌' : '🔸')) : '💀';
      return `| ${r.scenarioId} | ${r.runIndex+1} | ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | ${(r.innerThought ?? '').slice(0,25)}... | ${r.latencyMs}ms | ${icon} |`;
    }),
    '', '---', '',
    '## 关系-行动矩阵', '',
    '| 好感 | Tags | 场景 | P | F | FL | H | L |',
    '|:----:|------|------|:-:|:-:|:--:|:-:|:-:|',
    ...sStats.map(s => {
      const sc = SCENARIOS.find(x => x.id === s.id)!;
      const r = (c: string) => s.dist[c] ?? 0;
      return `| ${s.affinity} | ${sc.tags.join(',') || '-'} | ${s.id} | ${r('PROTECT')} | ${r('FIGHT')} | ${r('FLEE')} | ${r('HIDE')} | ${r('LOOT')} |`;
    }),
    '',
    `## 数据文件`, '',
    `- JSON: \`logs/poc-ij11-v5-engine-${ts}.json\``,
    `- 日志: \`logs/poc-ij11-v5-engine-${ts}.txt\``,
  ];

  writeFileSync(join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'review-ij11-v5-engine.md'), lines.join('\n'), 'utf8');
  log(`报告已保存`);
}

main().catch(err => { log(`错误: ${err}`); process.exit(1); });
