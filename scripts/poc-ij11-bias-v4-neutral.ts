/**
 * IJ-11 阶段 3v4: 中立 prompt — 真实驱动力测试
 *
 * 核心理念：系统提示完全中立，不暗示任何行动倾向。
 * 让关系数据（好感度、事件、叙事片段）自身驱动决策。
 *
 * 对比:
 *   - v2 基线: RLHF 原始 prompt → PROTECT bias 80%
 *   - v2 V4: 反 bias 指令 → OBSERVE/FLEE 100%（但是假象）
 *   - v4 本轮: 中立 prompt → 测真实驱动力
 *
 * 8 场景 × 5 次 = 40 次决策
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====
interface LogEntry { ts: number; level: string; msg: string; data?: Record<string, unknown> }
const logBuffer: LogEntry[] = [];
function log(level: string, msg: string, data?: Record<string, unknown>): void {
  const ts = Date.now();
  logBuffer.push({ ts, level, msg, data });
  console.log(`[${new Date(ts).toLocaleTimeString('zh-CN')}][${level}] ${msg}${data ? ` ${JSON.stringify(data)}` : ''}`);
}

const BASE_URL = 'http://localhost:3001';
const RUNS = 5;

const EMOTION_ENUM = ['joy','anger','envy','admiration','sadness','fear',
  'contempt','neutral','jealousy','gratitude','guilt','worry','shame','pride','relief'];

// ===== 中立行动描述（无暗示） =====
const ACTIONS = [
  { code: 'FIGHT', label: '迎战妖兽' },
  { code: 'PROTECT', label: '保护对方' },
  { code: 'FLEE', label: '撤离现场' },
  { code: 'OBSERVE', label: '远处观察' },
  { code: 'IGNORE', label: '不予理会' },
];

// ===== 中立系统提示（零暗示） =====
const SYSTEM_MSG = '你是修仙宗门弟子的灵魂引擎。根据角色的性格、与对方的关系、好感度和当前事件，产出该角色此刻真实的情绪反应和行为决策。严格按JSON格式输出。';

const SYS_CALL2 = '你是修仙世界弟子的内心独白生成器。根据角色的性格、情绪和行为，写一段简短内心独白。严格按JSON格式输出。';

// ===== 中立身份模板（无道德暗示） =====
function makeIdentity(name: string, personality: string): string {
  return `你是修仙宗门弟子「${name}」，${personality}。`;
}

// ===== 场景 =====
interface Scenario {
  id: string; label: string;
  subject: string; target: string; targetId: string;
  personality: string;
  relationship: string;
  narrative: string;
  event: string;
  emotions: string[];
  affinity: number;
  expectedActions: string[];
  wrongActions: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'S1-恋人', label: '恋人（+85）',
    subject: '林逸风', target: '苏瑶', targetId: 'su_yao',
    personality: '性格温和坚毅',
    relationship: '【与苏瑶的关系】好感度：85（恋人）\n关键经历：月下论道互诉衷情(+30)；共渡天劫生死相依(+25)；赠送稀世灵药(+20)\n你们已私定终身。',
    narrative: '林逸风与苏瑶情深似海，曾于月下论道互诉衷情，共渡天劫时生死相依，此生不渝。',
    event: '宗门遭妖兽来袭，苏瑶正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'sadness', 'pride'],
    affinity: 85, expectedActions: ['PROTECT', 'FIGHT'], wrongActions: ['IGNORE'],
  },
  {
    id: 'S2-师傅', label: '师傅（+90）',
    subject: '赵铁柱', target: '玄清道人', targetId: 'xuanqing',
    personality: '性格憨厚忠诚',
    relationship: '【与玄清道人的关系】好感度：90（授业恩师）\n关键经历：收你为关门弟子传授毕生绝学(+35)；替你挡下天劫雷罚(+30)；指导你筑基突破(+20)\n师傅年事已高，修为倒退。',
    narrative: '赵铁柱受玄清道人大恩，师傅不仅传授绝学，更在天劫中替他挡下雷罚，此等深恩重如泰山。',
    event: '宗门遭妖兽来袭，玄清道人正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'guilt', 'sadness'],
    affinity: 90, expectedActions: ['PROTECT', 'FIGHT'], wrongActions: ['IGNORE'],
  },
  {
    id: 'S3-死仇', label: '杀父仇人（-80）',
    subject: '陈剑寒', target: '魔修·血影', targetId: 'xue_ying',
    personality: '性格沉默寡言',
    relationship: '【与血影的关系】好感度：-80（杀父仇人）\n关键经历：血影杀害你的父亲陈长老(-40)；毁你丹田(-25)；摧毁你家族产业(-15)\n你修炼多年终于恢复修为，此仇不共戴天。',
    narrative: '陈剑寒与血影有不共戴天之仇，昔日血影残杀其父、毁其丹田，此仇铭刻骨髓。',
    event: '宗门遭妖兽来袭，血影正被三头妖兽围困，命悬一线',
    emotions: ['contempt', 'anger', 'neutral', 'fear', 'joy'],
    affinity: -80, expectedActions: ['OBSERVE', 'IGNORE', 'FLEE', 'FIGHT'], wrongActions: ['PROTECT'],
  },
  {
    id: 'S4-师兄弟', label: '同门师兄（+40）',
    subject: '周磊', target: '王灵均', targetId: 'wang_lingjun',
    personality: '性格稳重',
    relationship: '【与王灵均的关系】好感度：40（同门师兄弟）\n关键经历：一同入门修炼(+15)；日常切磋互有胜负(+10)；共同执行门派任务(+15)\n关系平淡但稳定。',
    narrative: '周磊与王灵均同门多年，虽非至交却有同袍之谊，日常切磋互相扶持。',
    event: '宗门遭妖兽来袭，王灵均正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'neutral', 'guilt'],
    affinity: 40, expectedActions: ['PROTECT', 'FIGHT', 'OBSERVE'], wrongActions: ['IGNORE'],
  },
  {
    id: 'S5-路人', label: '陌生散修（0）',
    subject: '张清风', target: '散修·柳三', targetId: 'liu_san',
    personality: '性格内向冷静',
    relationship: '【与柳三的关系】好感度：0（素不相识）\n从未打过交道的散修。',
    narrative: '',
    event: '宗门遭妖兽来袭，一个从未见过的散修正被三头妖兽围困，命悬一线',
    emotions: ['fear', 'neutral', 'worry', 'contempt', 'sadness'],
    affinity: 0, expectedActions: ['OBSERVE', 'FLEE', 'FIGHT', 'PROTECT'], wrongActions: [],
  },
  {
    id: 'S6-情敌', label: '情敌（-35）',
    subject: '林逸风', target: '刘鹤', targetId: 'liu_he',
    personality: '性格温和坚毅',
    relationship: '【与刘鹤的关系】好感度：-35（情敌）\n关键经历：刘鹤公然示好你的恋人苏瑶(-20)；暗中造谣你与魔修勾结(-10)；比武时故意使重手(-5)\n苏瑶已选择你，但刘鹤仍不死心。',
    narrative: '林逸风视刘鹤为心思叵测的情敌，此人不仅公然纠缠苏瑶，更暗中造谣中伤。',
    event: '宗门遭妖兽来袭，刘鹤正被三头妖兽围困，命悬一线',
    emotions: ['contempt', 'neutral', 'worry', 'anger', 'fear'],
    affinity: -35, expectedActions: ['OBSERVE', 'IGNORE', 'FLEE'], wrongActions: ['PROTECT'],
  },
  {
    id: 'S7-暗恋', label: '暗恋对象（+60）',
    subject: '周磊', target: '苏瑶', targetId: 'su_yao_2',
    personality: '性格内敛沉默',
    relationship: '【与苏瑶的关系】好感度：60（暗恋，对方不知）\n关键经历：第一次见面心生好感(+20)；偷偷送灵药助她突破(+20)；远远看她练剑心中欢喜(+20)\n你始终不敢表白，默默守护。',
    narrative: '周磊暗慕苏瑶已久，虽从未表白却一往情深，甘愿默默守护。',
    event: '宗门遭妖兽来袭，苏瑶正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'sadness', 'guilt'],
    affinity: 60, expectedActions: ['PROTECT', 'FIGHT'], wrongActions: ['IGNORE'],
  },
  {
    id: 'S8-妒忌师弟', label: '妒忌你的师弟（-25）',
    subject: '林逸风', target: '孙小峰', targetId: 'sun_xiaofeng',
    personality: '性格温和坚毅',
    relationship: '【与孙小峰的关系】好感度：-25（嫉妒你的师弟）\n关键经历：多次在师傅面前诋毁你(-10)；偷看你的修炼笔记(-10)；演武时暗中使绊(-5)\n你对他心存戒备。',
    narrative: '林逸风对师弟孙小峰颇为头疼，此人屡次诋毁暗算，令人心存戒备。',
    event: '宗门遭妖兽来袭，孙小峰正被三头妖兽围困，命悬一线',
    emotions: ['contempt', 'neutral', 'worry', 'fear', 'anger'],
    affinity: -25, expectedActions: ['OBSERVE', 'FLEE', 'FIGHT'], wrongActions: [],
  },
];

// ===== API =====

function buildSchema(): object {
  return {
    type: 'object',
    properties: {
      emotion: { type: 'string', enum: EMOTION_ENUM },
      intensity: { type: 'integer', enum: [1, 2, 3] },
      actionCode: { type: 'string', enum: ACTIONS.map(a => a.code) },
    },
    required: ['emotion', 'intensity', 'actionCode'],
  };
}

const CALL2_SCHEMA = {
  type: 'object',
  properties: {
    innerThought: { type: 'string', maxLength: 80 },
    relationshipDeltas: {
      type: 'array', items: {
        type: 'object',
        properties: { targetId: { type: 'string' }, delta: { type: 'number', minimum: -10, maximum: 10 }, reason: { type: 'string', maxLength: 30 } },
        required: ['targetId', 'delta', 'reason'],
      }, maxItems: 1,
    },
  },
  required: ['innerThought', 'relationshipDeltas'],
};

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
  emotion: string | null; actionCode: string | null; innerThought: string | null;
  latencyMs: number; parseSuccess: boolean;
  isExpected: boolean; isWrong: boolean;
}

async function runDecision(s: Scenario, runIdx: number): Promise<Result> {
  const identity = makeIdentity(s.subject, s.personality);
  const candidateList = s.emotions.join('、');
  const actionList = ACTIONS.map(a => `${a.code}(${a.label})`).join(' / ');

  let relBlock = s.relationship;
  if (s.narrative) relBlock += `\n${s.narrative}`;

  const userMsg = [identity, relBlock,
    `刚才发生了：${s.event}`, '',
    `你此刻的情绪和行动是？`,
    `情绪选项：${candidateList}`,
    `行动选项：${actionList}`, '',
    'JSON输出。',
  ].join('\n');

  const r1 = await callInfer(SYSTEM_MSG, userMsg, buildSchema(), 'soul_neutral');
  const emotion = r1.parsed ? (r1.parsed.emotion as string) ?? null : null;
  const actionCode = r1.parsed ? (r1.parsed.actionCode as string) ?? null : null;

  if (!emotion || !actionCode) {
    return { scenarioId: s.id, runIndex: runIdx, emotion: null, actionCode: null, innerThought: null,
      latencyMs: r1.latencyMs, parseSuccess: false, isExpected: false, isWrong: false };
  }

  const actionLabel = ACTIONS.find(a => a.code === actionCode)?.label ?? actionCode;
  const p2 = `${identity}\n${relBlock}\n刚才发生了：${s.event}\n你的情绪是${emotion}，你选择了${actionCode}（${actionLabel}）。\n请用JSON输出内心独白和关系变化。`;
  const r2 = await callInfer(SYS_CALL2, p2, CALL2_SCHEMA, 'soul_thought_neutral');
  const innerThought = r2.parsed ? (r2.parsed.innerThought as string) ?? null : null;

  return {
    scenarioId: s.id, runIndex: runIdx, emotion, actionCode, innerThought,
    latencyMs: r1.latencyMs + r2.latencyMs, parseSuccess: true,
    isExpected: s.expectedActions.includes(actionCode),
    isWrong: s.wrongActions.includes(actionCode),
  };
}

// ===== Main =====

async function main() {
  const startTime = Date.now();
  log('INFO', `=== IJ-11 阶段 3v4: 中立 prompt 真实驱动力测试 ===`);
  log('INFO', `${SCENARIOS.length} 场景 × ${RUNS} 次 = ${SCENARIOS.length * RUNS} 次决策`);
  log('INFO', `系统提示: "${SYSTEM_MSG}"`);

  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json() as { model?: string; modelReady?: boolean };
    if (!d.modelReady) { log('ERROR', '模型未就绪'); process.exit(1); }
    log('INFO', `模型: ${d.model}`);
  } catch { log('ERROR', 'ai-server 不可用'); process.exit(1); }

  const allResults: Result[] = [];

  for (const s of SCENARIOS) {
    log('INFO', `\n=== ${s.id}: ${s.label} | 好感=${s.affinity} ===`);
    for (let i = 0; i < RUNS; i++) {
      const r = await runDecision(s, i);
      allResults.push(r);
      const icon = r.parseSuccess ? (r.isExpected ? '✅' : (r.isWrong ? '❌' : '🔸')) : '💀';
      log('INFO', `  [${i+1}/${RUNS}] ${icon} ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | "${(r.innerThought ?? '').slice(0,25)}..." ${r.latencyMs}ms`);
    }
  }

  const endTime = Date.now();

  // Stats
  interface SStats { id: string; label: string; affinity: number; expectedRate: number; wrongRate: number; dist: Record<string, number>; }
  const sStats: SStats[] = SCENARIOS.map(s => {
    const sr = allResults.filter(r => r.scenarioId === s.id && r.parseSuccess);
    const n = sr.length;
    const dist: Record<string, number> = {};
    for (const r of sr) if (r.actionCode) dist[r.actionCode] = (dist[r.actionCode] ?? 0) + 1;
    return { id: s.id, label: s.label, affinity: s.affinity,
      expectedRate: n > 0 ? sr.filter(r => r.isExpected).length / n : 0,
      wrongRate: n > 0 ? sr.filter(r => r.isWrong).length / n : 0, dist };
  });

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const totalExp = allResults.filter(r => r.parseSuccess && r.isExpected).length;
  const totalParsed = allResults.filter(r => r.parseSuccess).length;
  const overallRate = totalParsed > 0 ? totalExp / totalParsed : 0;

  log('INFO', `\n总正确率: ${pct(overallRate)} (${totalExp}/${totalParsed})`);
  for (const s of sStats) {
    const d = Object.entries(s.dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ');
    log('INFO', `${s.id}: 正确=${pct(s.expectedRate)} 错误=${pct(s.wrongRate)} | ${d}`);
  }

  // Save
  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  writeFileSync(join(logsDir, `poc-ij11-bias-v4-neutral-${ts}.json`), JSON.stringify({
    timestamp: new Date().toISOString(), durationMs: endTime - startTime,
    systemPrompt: SYSTEM_MSG, actionDescriptions: ACTIONS,
    scenarios: SCENARIOS.map(s => ({ id: s.id, label: s.label, affinity: s.affinity, expected: s.expectedActions, wrong: s.wrongActions })),
    results: allResults, scenarioStats: sStats, overallExpectedRate: overallRate,
  }, null, 2), 'utf8');

  writeFileSync(join(logsDir, `poc-ij11-bias-v4-neutral-${ts}.txt`), logBuffer.map(e =>
    `[${new Date(e.ts).toLocaleTimeString('zh-CN')}][${e.level}] ${e.msg}${e.data ? `\n    ${JSON.stringify(e.data)}` : ''}`
  ).join('\n\n'), 'utf8');

  // Report
  const lines = [
    '# IJ-11 阶段 3v4: 中立 prompt 真实驱动力测试', '',
    `> **日期**: ${new Date().toISOString().slice(0,19)} | **模型**: Qwen3.5-2B`,
    `> **系统提示**: "${SYSTEM_MSG}"`,
    `> **行动描述**: ${ACTIONS.map(a => `${a.code}(${a.label})`).join(' / ')}`,
    `> **总正确率**: **${pct(overallRate)}** (${totalExp}/${totalParsed})`, '',
    '> **核心问题**: 在完全中立的提示下，关系数据本身能否驱动合理决策？', '',
    '---', '',
    '## 核心结果', '',
    '| 场景 | 好感 | 预期行动 | 正确率 | 错误率 | 行动分布 |',
    '|------|:----:|---------|:------:|:------:|---------|',
    ...sStats.map(s => {
      const sc = SCENARIOS.find(sc => sc.id === s.id)!;
      const d = Object.entries(s.dist).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}=${v}`).join(', ');
      return `| ${s.id} | ${s.affinity} | ${sc.expectedActions.join('/')} | ${pct(s.expectedRate)} | ${pct(s.wrongRate)} | ${d} |`;
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
    '| 好感 | 场景 | P | F | O | FL | I |',
    '|:----:|------|:-:|:-:|:-:|:--:|:-:|',
    ...sStats.map(s => {
      const r = (c: string) => s.dist[c] ?? 0;
      return `| ${s.affinity} | ${s.id} | ${r('PROTECT')} | ${r('FIGHT')} | ${r('OBSERVE')} | ${r('FLEE')} | ${r('IGNORE')} |`;
    }),
    '', '---', '',
    '## 跨版本对比', '',
    '| 场景 | v2基线(RLHF) | v2-V4(反bias) | v3(反bias扩大) | **v4(中立)** |',
    '|------|:----------:|:------------:|:-------------:|:----------:|',
    '| S3-死仇 | — | 0% bias | FIGHT=100% | ? |',
    '| S6-情敌 | — | — | 正确100% | ? |',
    '| S1-恋人 | — | — | 正确100% | ? |',
    '| S2-师傅 | — | — | 正确40% | ? |',
    '', '> 上表"?"将由本次测试数据自动填充', '',
    `## 数据文件`, '',
    `- JSON: \`logs/poc-ij11-bias-v4-neutral-${ts}.json\``,
    `- 日志: \`logs/poc-ij11-bias-v4-neutral-${ts}.txt\``,
  ];

  writeFileSync(join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'review-ij11-bias-v4-neutral.md'), lines.join('\n'), 'utf8');
  log('INFO', `报告已保存`);
}

main().catch(err => { log('ERROR', `${err}`); process.exit(1); });
