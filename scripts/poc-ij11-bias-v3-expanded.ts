/**
 * IJ-11 阶段 3v3: V4 prompt 多关系多场景扩大验证
 *
 * 8 种关系 × 5 次决策 = 40 次决策 (80 次 API)
 *
 * 关系类型:
 *   S1 恋人 (affinity=85)    → 预期 PROTECT/FIGHT
 *   S2 师傅 (affinity=90)    → 预期 PROTECT/FIGHT
 *   S3 死仇 (affinity=-80)   → 预期 OBSERVE/IGNORE/FLEE
 *   S4 师兄弟 (affinity=40)  → 预期 PROTECT/FIGHT
 *   S5 路人 (affinity=0)     → 预期 OBSERVE/FLEE（不冒险）
 *   S6 情敌 (affinity=-35)   → 预期 OBSERVE/IGNORE/FLEE
 *   S7 暗恋者 (affinity=60, 对方不知) → 预期 PROTECT/FIGHT
 *   S8 妒忌的师弟 (affinity=-25) → 预期 OBSERVE/FLEE
 *
 * 运行: npx tsx scripts/poc-ij11-bias-v3-expanded.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====

interface LogEntry { ts: number; level: string; msg: string; data?: Record<string, unknown> }
const logBuffer: LogEntry[] = [];

function log(level: string, msg: string, data?: Record<string, unknown>): void {
  const ts = Date.now();
  logBuffer.push({ ts, level, msg, data });
  const t = new Date(ts).toLocaleTimeString('zh-CN');
  const d = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${t}][${level}] ${msg}${d}`);
}

// ===== Config =====

const BASE_URL = 'http://localhost:3001';
const RUNS = 5;

const EMOTION_ENUM = ['joy','anger','envy','admiration','sadness','fear',
  'contempt','neutral','jealousy','gratitude','guilt','worry','shame','pride','relief'];

const ACTIONS = [
  { code: 'FIGHT', label: '挺身迎战，击退妖兽' },
  { code: 'PROTECT', label: '舍身保护对方' },
  { code: 'FLEE', label: '趁乱逃离，保存实力' },
  { code: 'OBSERVE', label: '冷静观察局势，等待最佳时机再行动' },
  { code: 'IGNORE', label: '此人与我无关，从长计议不予理会' },
];

// V4 系统提示
const SYSTEM_MSG = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。\n' +
  '重要原则：角色的行动必须符合其与对方的实际关系和好感度。\n' +
  '- 对于亲密之人（恋人、师傅、好友），在危急时刻舍身保护是合理的\n' +
  '- 对于仇人或死对头，选择旁观、离开或趁机报复都是合理的角色扮演\n' +
  '- 对于陌生人，不冒生命危险是理性选择\n' +
  '好感度为正意味着愿意帮助，好感度越高越愿意冒险。好感度为负意味着不愿帮助。';

const SYS_CALL2 = '你是修仙世界弟子的内心独白生成器。根据角色的性格、情绪和行为，写一段简短内心独白。严格按JSON格式输出。';

// ===== 场景定义 =====

interface Scenario {
  id: string;
  label: string;
  /** 主角名 */
  subject: string;
  /** 对方名 */
  target: string;
  targetId: string;
  /** 角色设定 */
  identity: string;
  /** 关系描述 */
  relationship: string;
  /** AI 叙事片段 */
  narrative: string;
  /** 事件描述 */
  event: string;
  /** 候选情绪 */
  emotions: string[];
  /** 好感度 */
  affinity: number;
  /** 预期正确行动 */
  expectedActions: string[];
  /** 预期错误行动 */
  wrongActions: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'S1-恋人',
    label: '恋人（affinity=85, 深爱）',
    subject: '林逸风', target: '苏瑶', targetId: 'su_yao',
    identity: '你是修仙宗门弟子「林逸风」，性格温和坚毅。道德偏善。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与苏瑶的关系】好感：85（恋人）\n关键经历：月下论道互诉衷情(+30)；共渡天劫生死相依(+25)；赠送稀世灵药(+20)\n近况：二人已私定终身',
    narrative: '林逸风与苏瑶情深似海，曾于月下论道互诉衷情，共渡天劫时生死相依，二人已私定终身，此生不渝。',
    event: '宗门遭妖兽来袭，苏瑶正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'sadness', 'pride'],
    affinity: 85,
    expectedActions: ['PROTECT', 'FIGHT'],
    wrongActions: ['IGNORE', 'OBSERVE'],
  },
  {
    id: 'S2-师傅',
    label: '师傅（affinity=90, 深恩）',
    subject: '赵铁柱', target: '玄清道人', targetId: 'xuanqing',
    identity: '你是修仙宗门弟子「赵铁柱」，性格憨厚忠诚。道德偏善。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与玄清道人的关系】好感：90（授业恩师）\n关键经历：收为关门弟子传授绝学(+35)；替你挡下天劫雷罚(+30)；指导筑基突破(+20)\n近况：师傅年事已高，修为倒退',
    narrative: '赵铁柱受玄清道人大恩，师傅不仅传授绝学，更在天劫中替他挡下雷罚，此等深恩重如泰山。',
    event: '宗门遭妖兽来袭，玄清道人正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'guilt', 'sadness'],
    affinity: 90,
    expectedActions: ['PROTECT', 'FIGHT'],
    wrongActions: ['IGNORE', 'OBSERVE', 'FLEE'],
  },
  {
    id: 'S3-死仇',
    label: '死仇（affinity=-80, 杀父仇人）',
    subject: '陈剑寒', target: '魔修·血影', targetId: 'xue_ying',
    identity: '你是修仙宗门弟子「陈剑寒」，性格沉默寡言。道德偏中立务实。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与血影的关系】好感：-80（杀父仇人）\n关键经历：血影杀害你的父亲陈长老(-40)；在你幼时毁你丹田(-25)；摧毁你家族产业(-15)\n近况：你修炼多年终于恢复修为',
    narrative: '陈剑寒与血影有不共戴天之仇，昔日血影残杀其父、毁其丹田，此仇铭刻骨髓，誓要亲手报仇。',
    event: '宗门遭妖兽来袭，血影正被三头妖兽围困，命悬一线',
    emotions: ['contempt', 'anger', 'neutral', 'fear', 'joy'],
    affinity: -80,
    expectedActions: ['OBSERVE', 'IGNORE', 'FLEE'],
    wrongActions: ['PROTECT'],
  },
  {
    id: 'S4-师兄弟',
    label: '师兄弟（affinity=40, 同门）',
    subject: '周磊', target: '王灵均', targetId: 'wang_lingjun',
    identity: '你是修仙宗门弟子「周磊」，性格稳重务实。道德偏善。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与王灵均的关系】好感：40（同门师兄弟）\n关键经历：一同入门修炼(+15)；日常切磋互有胜负(+10)；共同执行门派任务(+15)\n近况：二人关系平淡但稳定',
    narrative: '周磊与王灵均同门修炼多年，虽非至交却有几分同袍之谊，日常切磋互相扶持。',
    event: '宗门遭妖兽来袭，王灵均正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'neutral', 'guilt'],
    affinity: 40,
    expectedActions: ['PROTECT', 'FIGHT'],
    wrongActions: ['IGNORE'],
  },
  {
    id: 'S5-路人',
    label: '路人（affinity=0, 素不相识）',
    subject: '张清风', target: '散修·柳三', targetId: 'liu_san',
    identity: '你是修仙宗门弟子「张清风」，性格内向冷静。道德偏中立务实。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与柳三的关系】好感：0（素不相识）\n关键经历：无\n近况：从未打过交道的散修',
    narrative: '',
    event: '宗门遭妖兽来袭，一个从未见过的散修正被三头妖兽围困，命悬一线',
    emotions: ['fear', 'neutral', 'worry', 'contempt', 'sadness'],
    affinity: 0,
    expectedActions: ['OBSERVE', 'FLEE', 'FIGHT'],
    wrongActions: ['PROTECT'],
  },
  {
    id: 'S6-情敌',
    label: '情敌（affinity=-35, 争夺心上人）',
    subject: '林逸风', target: '刘鹤', targetId: 'liu_he',
    identity: '你是修仙宗门弟子「林逸风」，性格温和坚毅。道德偏中立务实。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与刘鹤的关系】好感：-35（情敌）\n关键经历：刘鹤公然示好苏瑶，当众令你难堪(-20)；暗中造谣你与魔修勾结(-10)；在宗门比武中故意使出重手(-5)\n近况：苏瑶已选择你，但刘鹤仍不死心',
    narrative: '林逸风视刘鹤为可恶情敌，此人不仅公然示好苏瑶令他难堪，更暗中造谣中伤，心思叵测。',
    event: '宗门遭妖兽来袭，刘鹤正被三头妖兽围困，命悬一线',
    emotions: ['contempt', 'neutral', 'worry', 'anger', 'fear'],
    affinity: -35,
    expectedActions: ['OBSERVE', 'IGNORE', 'FLEE'],
    wrongActions: ['PROTECT'],
  },
  {
    id: 'S7-暗恋者',
    label: '暗恋对象（affinity=60, 单相思）',
    subject: '周磊', target: '苏瑶', targetId: 'su_yao_2',
    identity: '你是修仙宗门弟子「周磊」，性格内敛沉默。道德偏善。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与苏瑶的关系】好感：60（暗恋，对方不知）\n关键经历：第一次见面便心生好感(+20)；偷偷送灵药助她突破(+20)；远远看她练剑心中欢喜(+20)\n近况：你始终不敢表白，默默守护',
    narrative: '周磊暗慕苏瑶已久，每逢修炼皆偷偷守护左右，虽从未表白却一往情深，甘愿为其赴汤蹈火。',
    event: '宗门遭妖兽来袭，苏瑶正被三头妖兽围困，命悬一线',
    emotions: ['worry', 'fear', 'anger', 'sadness', 'guilt'],
    affinity: 60,
    expectedActions: ['PROTECT', 'FIGHT'],
    wrongActions: ['IGNORE'],
  },
  {
    id: 'S8-妒忌师弟',
    label: '妒忌的师弟（affinity=-25, 嫉妒你的天赋）',
    subject: '林逸风', target: '孙小峰', targetId: 'sun_xiaofeng',
    identity: '你是修仙宗门弟子「林逸风」，性格温和坚毅。道德偏中立务实。你所在的宗门：门规严明，弟子以自保为先。',
    relationship: '【与孙小峰的关系】好感：-25（嫉妒你的师弟）\n关键经历：孙小峰多次在师傅面前诋毁你(-10)；偷看你的修炼笔记被你发现(-10)；在宗门演武时暗中使绊(-5)\n近况：你对他心存戒备但不至于仇恨',
    narrative: '林逸风对师弟孙小峰颇为头疼，此人屡次诋毁暗算，虽未造成大害却令人心存戒备。',
    event: '宗门遭妖兽来袭，孙小峰正被三头妖兽围困，命悬一线',
    emotions: ['contempt', 'neutral', 'worry', 'fear', 'anger'],
    affinity: -25,
    expectedActions: ['OBSERVE', 'FLEE', 'FIGHT'],
    wrongActions: ['PROTECT'],
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const candidateList = s.emotions.map(e => `${e}(${EMOTION_ENUM.includes(e) ? e : ''})`).join('、');
  const actionList = ACTIONS.map(a => `${a.code}(${a.label})`).join(' / ');

  let relBlock = s.relationship;
  if (s.narrative) relBlock += `\n${s.narrative}`;
  relBlock += `\n（注意：relationshipDeltas.targetId 请填「${s.targetId}」）`;

  const userMsg = [s.identity, relBlock, `刚才发生了：${s.event}`, '',
    '你此刻内心的情绪是什么？你会怎么做？', '',
    `【候选情绪】：${candidateList}`,
    `【候选行动】：${actionList}`, '', '用JSON输出。',
  ].join('\n');

  const r1 = await callInfer(SYSTEM_MSG, userMsg, buildSchema(), 'soul_v3_expanded');
  const emotion = r1.parsed ? (r1.parsed.emotion as string) ?? null : null;
  const actionCode = r1.parsed ? (r1.parsed.actionCode as string) ?? null : null;

  if (!emotion || !actionCode) {
    return { scenarioId: s.id, runIndex: runIdx, emotion: null, actionCode: null, innerThought: null,
      latencyMs: r1.latencyMs, parseSuccess: false, isExpected: false, isWrong: false };
  }

  // Call 2
  const actionLabel = ACTIONS.find(a => a.code === actionCode)?.label ?? actionCode;
  const p2 = `你是修仙宗门弟子「${s.subject}」。\n${s.relationship}\n${s.narrative}\n` +
    `刚才发生了：${s.event}\n你的情绪是${emotion}，你选择了${actionCode}（${actionLabel}）。\n请用JSON输出内心独白和关系变化。`;
  const r2 = await callInfer(SYS_CALL2, p2, CALL2_SCHEMA, 'soul_thought_v3');
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
  log('INFO', `=== IJ-11 阶段 3v3: V4 prompt 多关系扩大验证 ===`);
  log('INFO', `${SCENARIOS.length} 场景 × ${RUNS} 次 = ${SCENARIOS.length * RUNS} 次决策`);

  // Health
  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json() as { model?: string; modelReady?: boolean };
    if (!d.modelReady) { log('ERROR', '模型未就绪'); process.exit(1); }
    log('INFO', `模型: ${d.model}`);
  } catch { log('ERROR', 'ai-server 不可用'); process.exit(1); }

  const allResults: Result[] = [];

  for (const s of SCENARIOS) {
    log('INFO', `\n=== ${s.id}: ${s.label} ===`);
    log('INFO', `预期正确: [${s.expectedActions}] | 预期错误: [${s.wrongActions}]`);

    for (let i = 0; i < RUNS; i++) {
      const r = await runDecision(s, i);
      allResults.push(r);
      const icon = r.parseSuccess ? (r.isExpected ? '✅' : (r.isWrong ? '❌' : '🔸')) : '💀';
      log('INFO', `  [${i + 1}/${RUNS}] ${icon} ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | "${(r.innerThought ?? '').slice(0, 25)}..." ${r.latencyMs}ms`);
    }
  }

  const endTime = Date.now();

  // ===== Stats =====

  interface SStats {
    id: string; label: string; affinity: number;
    expectedRate: number; wrongRate: number;
    dist: Record<string, number>;
  }

  const sStats: SStats[] = SCENARIOS.map(s => {
    const sr = allResults.filter(r => r.scenarioId === s.id && r.parseSuccess);
    const n = sr.length;
    const dist: Record<string, number> = {};
    for (const r of sr) if (r.actionCode) dist[r.actionCode] = (dist[r.actionCode] ?? 0) + 1;
    return {
      id: s.id, label: s.label, affinity: s.affinity,
      expectedRate: n > 0 ? sr.filter(r => r.isExpected).length / n : 0,
      wrongRate: n > 0 ? sr.filter(r => r.isWrong).length / n : 0,
      dist,
    };
  });

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const totalExpected = allResults.filter(r => r.parseSuccess && r.isExpected).length;
  const totalParsed = allResults.filter(r => r.parseSuccess).length;
  const overallRate = totalParsed > 0 ? totalExpected / totalParsed : 0;

  log('INFO', '\n============================================================');
  log('INFO', `完成 | ${((endTime - startTime) / 1000).toFixed(1)}s | 总正确率: ${pct(overallRate)} (${totalExpected}/${totalParsed})`);
  for (const s of sStats) {
    const distStr = Object.entries(s.dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ');
    log('INFO', `${s.id}: 正确=${pct(s.expectedRate)} 错误=${pct(s.wrongRate)} | ${distStr}`);
  }
  log('INFO', '============================================================');

  // ===== Save =====

  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  writeFileSync(join(logsDir, `poc-ij11-bias-v3-${ts}.json`), JSON.stringify({
    timestamp: new Date().toISOString(), durationMs: endTime - startTime,
    scenarios: SCENARIOS.map(s => ({ id: s.id, label: s.label, affinity: s.affinity,
      expected: s.expectedActions, wrong: s.wrongActions, narrative: s.narrative })),
    results: allResults, scenarioStats: sStats, overallExpectedRate: overallRate,
  }, null, 2), 'utf8');

  writeFileSync(join(logsDir, `poc-ij11-bias-v3-${ts}.txt`), logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  }).join('\n\n'), 'utf8');

  // Report
  const lines = [
    '# IJ-11 阶段 3v3: V4 prompt 多关系扩大验证报告', '',
    `> **日期**: ${new Date().toISOString().slice(0, 19)} | **模型**: Qwen3.5-2B`,
    `> **总调用**: ${SCENARIOS.length * RUNS} 次决策 | **耗时**: ${((endTime - startTime) / 1000).toFixed(1)}s`,
    `> **总正确率**: **${pct(overallRate)}** (${totalExpected}/${totalParsed})`, '', '---', '',
    '## 核心结果', '',
    '| 场景 | 好感 | 关系类型 | 预期行动 | 正确率 | 错误率 | 行动分布 |',
    '|------|:----:|---------|---------|:------:|:------:|---------|',
    ...sStats.map(s => {
      const scenario = SCENARIOS.find(sc => sc.id === s.id)!;
      const distStr = Object.entries(s.dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(', ');
      return `| ${s.id} | ${s.affinity} | ${scenario.label.split('（')[0]} | ${scenario.expectedActions.join('/')} | ${pct(s.expectedRate)} | ${pct(s.wrongRate)} | ${distStr} |`;
    }),
    '', '---', '',
    '## 逐次明细', '',
    '| 场景 | Run | 行动 | 情绪 | 内心独白 | 耗时 | 评价 |',
    '|------|:---:|------|------|---------|:----:|:----:|',
    ...allResults.map(r => {
      const icon = r.parseSuccess ? (r.isExpected ? '✅' : (r.isWrong ? '❌' : '🔸')) : '💀';
      return `| ${r.scenarioId} | ${r.runIndex + 1} | ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | ${(r.innerThought ?? '').slice(0, 25)}... | ${r.latencyMs}ms | ${icon} |`;
    }),
    '', '---', '',
    '## 关系-行动一致性矩阵', '',
    '| 好感区间 | 场景 | PROTECT | FIGHT | OBSERVE | FLEE | IGNORE |',
    '|---------|------|:-------:|:-----:|:-------:|:----:|:------:|',
    ...sStats.map(s => {
      const r = (code: string) => s.dist[code] ?? 0;
      const zone = s.affinity >= 50 ? '💚 高正面' : s.affinity >= 20 ? '💛 低正面' : s.affinity >= -20 ? '⚪ 中性' : s.affinity >= -50 ? '🟠 低负面' : '🔴 高负面';
      return `| ${zone} (${s.affinity}) | ${s.id} | ${r('PROTECT')} | ${r('FIGHT')} | ${r('OBSERVE')} | ${r('FLEE')} | ${r('IGNORE')} |`;
    }),
    '',
    `## 数据文件`, '',
    `- JSON: \`logs/poc-ij11-bias-v3-${ts}.json\``,
    `- 日志: \`logs/poc-ij11-bias-v3-${ts}.txt\``,
  ];

  const mdPath = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'review-ij11-bias-v3-expanded.md');
  writeFileSync(mdPath, lines.join('\n'), 'utf8');
  log('INFO', `\n报告: ${mdPath}`);
}

main().catch(err => { log('ERROR', `${err}`); process.exit(1); });
