/**
 * POC 3a Round 2: 因果事件生成 — 双阶段 Pipeline
 *
 * Round 1 问题修正:
 *   1. 双阶段拆分: Call1(决策eventType) + Call2(渲染trigger+description)
 *   2. eventType 16→6
 *   3. 移除 T5 零信号场景(L0/L1不走AI)
 *   4. 报告含完整 prompt + 完整 AI 响应，支持人工审查
 *
 * 5 场景 × 5 次 = 25 决策 (50 API) + 10 延迟
 *
 * 运行: npx tsx scripts/poc-3a-causal-event.ts
 */

import { describeMoral, describeEthos } from '../src/ai/soul-prompt-builder';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'http://localhost:3001';
const RUNS = 5;
const LATENCY_RUNS = 10;

// ===== 6 种事件类型 =====

const EVENT_TYPES = [
  'scheme', 'confrontation', 'gift', 'alliance', 'challenge', 'avoidance',
] as const;

const EVENT_LABEL: Record<string, string> = {
  scheme: '密谋暗算', confrontation: '正面冲突',
  gift: '赠礼帮助', alliance: '结盟合作',
  challenge: '挑战试探', avoidance: '回避冷处理',
};

const EVENT_POLARITY: Record<string, 'positive' | 'negative' | 'neutral'> = {
  scheme: 'negative', confrontation: 'negative',
  gift: 'positive', alliance: 'positive',
  challenge: 'neutral', avoidance: 'neutral',
};

const TAG_LABEL: Record<string, string> = {
  friend: '好友', rival: '宿敌', mentor: '恩师',
  admirer: '仰慕者', grudge: '积怨',
};

// ===== JSON Schemas =====

const CALL1_SCHEMA = {
  type: 'object',
  properties: {
    eventType: { type: 'string', enum: [...EVENT_TYPES] },
    target: { type: 'string' },
    urgency: { type: 'integer', enum: [1, 2, 3] },
    confidence: { type: 'integer', enum: [1, 2, 3] },
  },
  required: ['eventType', 'target', 'urgency', 'confidence'],
};

const CALL2_SCHEMA = {
  type: 'object',
  properties: {
    trigger: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['trigger', 'description'],
};

// ===== Logger =====

const logBuffer: Array<{ ts: number; msg: string }> = [];
function log(msg: string): void {
  const ts = Date.now();
  logBuffer.push({ ts, msg });
  console.log(`[${new Date(ts).toLocaleTimeString('zh-CN')}] ${msg}`);
}

// ===== 场景 =====

interface Scenario {
  id: string; label: string;
  subjectName: string; personalityName: string; traitHints: string;
  goodEvil: number; lawChaos: number;
  sectEthos: number; sectDiscipline: number;
  targetName: string; affinity: number; tags: string[];
  keyEvents: Array<{ content: string; delta: number }>;
  narrativeSnippet: string;
  expectedPolarity: 'positive' | 'negative' | 'neutral';
  forbiddenTypes: string[];
  testFocus: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'T1', label: '宿敌报复（-70, 沉默记仇）',
    subjectName: '陈剑寒', personalityName: '沉默寡言', traitHints: '记仇',
    goodEvil: -10, lawChaos: 20, sectEthos: 0, sectDiscipline: 30,
    targetName: '血影', affinity: -70, tags: ['rival'],
    keyEvents: [
      { content: '血影杀害父亲陈长老', delta: -40 },
      { content: '毁你丹田', delta: -25 },
      { content: '摧毁家族产业', delta: -15 },
    ],
    narrativeSnippet: '陈剑寒与血影有不共戴天之仇，血影残杀其父、毁其丹田，此仇铭刻骨髓。',
    expectedPolarity: 'negative',
    forbiddenTypes: ['gift', 'alliance'],
    testFocus: '极端仇恨→scheme(暗中,记仇性格)而非confrontation(公开)',
  },
  {
    id: 'T2', label: '至交回报（+90, 憨厚忠诚）',
    subjectName: '赵铁柱', personalityName: '憨厚忠诚', traitHints: '知恩图报',
    goodEvil: 50, lawChaos: 40, sectEthos: -40, sectDiscipline: 50,
    targetName: '玄清道人', affinity: 90, tags: ['mentor'],
    keyEvents: [
      { content: '传授毕生绝学', delta: 35 },
      { content: '替你挡下天劫雷罚', delta: 30 },
      { content: '指导筑基突破', delta: 20 },
    ],
    narrativeSnippet: '赵铁柱受玄清道人大恩，师傅传授绝学，更在天劫中替他挡下雷罚，深恩如山。',
    expectedPolarity: 'positive',
    forbiddenTypes: ['scheme', 'confrontation'],
    testFocus: '极端恩情→gift(直接回报,憨厚性格)',
  },
  {
    id: 'T3', label: '阴险小人（-35, 阴险狡诈）',
    subjectName: '孙小峰', personalityName: '阴险狡诈', traitHints: '小心眼',
    goodEvil: -40, lawChaos: -20, sectEthos: 0, sectDiscipline: 20,
    targetName: '林逸风', affinity: -35, tags: ['grudge'],
    keyEvents: [
      { content: '比武被碾压', delta: -15 },
      { content: '暗恋之人与林逸风亲近', delta: -15 },
    ],
    narrativeSnippet: '孙小峰视林逸风为眼中钉，此人屡次在师傅面前压他一头。',
    expectedPolarity: 'negative',
    forbiddenTypes: ['gift', 'alliance'],
    testFocus: '阴险性格→scheme(暗中)而非confrontation(公开)',
  },
  {
    id: 'T4', label: '好友切磋（+65, 温和坚毅）',
    subjectName: '张清风', personalityName: '温和坚毅', traitHints: '心软易动摇',
    goodEvil: 40, lawChaos: 30, sectEthos: -40, sectDiscipline: 50,
    targetName: '李沐阳', affinity: 65, tags: ['friend'],
    keyEvents: [
      { content: '共同护送灵药', delta: 25 },
      { content: '替你化解误会', delta: 20 },
      { content: '日常切磋交流', delta: 15 },
    ],
    narrativeSnippet: '张清风与李沐阳意气相投，共同护送灵药时结下深厚友谊，彼此信任有加。',
    expectedPolarity: 'positive',
    forbiddenTypes: ['scheme', 'confrontation'],
    testFocus: '好友→gift/alliance/challenge(友善互动)',
  },
  {
    id: 'T6', label: '善人轻微积怨（-15, 温和善良）',
    subjectName: '苏瑶', personalityName: '温和善良', traitHints: '好学不倦',
    goodEvil: 45, lawChaos: 30, sectEthos: -20, sectDiscipline: 30,
    targetName: '孙小峰', affinity: -15, tags: [],
    keyEvents: [
      { content: '被抢夺修炼资源', delta: -10 },
      { content: '被背后说闲话', delta: -5 },
    ],
    narrativeSnippet: '',
    expectedPolarity: 'neutral',
    forbiddenTypes: ['scheme'],
    testFocus: '善恶轴(+45)压制积怨(-15)→avoidance/challenge',
  },
];

// ===== API =====

interface ApiResult {
  parsed: Record<string, unknown> | null;
  rawContent: string;
  latencyMs: number;
}

async function callInfer(sysMsg: string, userMsg: string, schema: object, schemaName: string): Promise<ApiResult> {
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
        max_tokens: 400,
        temperature: 0.7,
        top_p: 0.9,
        timeout_ms: 10000,
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema },
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

function buildCall1(s: Scenario): { system: string; user: string } {
  const actionList = EVENT_TYPES.map(et => `${et}(${EVENT_LABEL[et]})`).join(' / ');
  const system =
    `你是修仙世界NPC行为推演器。根据角色性格、道德立场和关系，从候选行为中选出这个角色最可能主动发起的一种。\n` +
    `只需选择行为类型，不需要描述。邪恶角色会做邪恶的事，善良角色会做善良的事。\n` +
    `候选行为：【${actionList}】`;

  const moralDesc = describeMoral(s.goodEvil, s.lawChaos);
  const ethosDesc = describeEthos(s.sectEthos, s.sectDiscipline);
  const tagsStr = s.tags.length > 0 ? `（${s.tags.map(t => TAG_LABEL[t] ?? t).join('/')}）` : '';

  const lines: string[] = [
    `【角色】${s.subjectName} | 性格：${s.personalityName}${s.traitHints ? ' | 特点：' + s.traitHints : ''}${moralDesc ? ' | ' + moralDesc : ''}`,
    `【宗门】${ethosDesc}`,
    `【与${s.targetName}的关系】`,
    `好感：${s.affinity}${tagsStr}`,
  ];
  if (s.keyEvents.length > 0) {
    const evDesc = [...s.keyEvents]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .map(e => `${e.content}(${e.delta > 0 ? '+' : ''}${e.delta})`)
      .join('；');
    lines.push(`关键经历：${evDesc}`);
  }
  if (s.narrativeSnippet) lines.push(s.narrativeSnippet);
  lines.push('', `请选择${s.subjectName}最可能对${s.targetName}主动发起的行为类型。`);

  return { system, user: lines.join('\n') };
}

function buildCall2(s: Scenario, eventType: string): { system: string; user: string } {
  const system =
    `你是修仙世界叙事器。根据角色决定发起的行为，生成事件的动因和具体描述。\n` +
    `trigger 应引用关键经历中的具体事由。中国古典仙侠文风。`;

  const keyEvDesc = s.keyEvents.length > 0
    ? s.keyEvents.map(e => `${e.content}(${e.delta > 0 ? '+' : ''}${e.delta})`).join('；')
    : '无特殊经历';

  const user = [
    `【角色】${s.subjectName}（${s.personalityName}）${s.traitHints ? '，' + s.traitHints : ''}`,
    `【决定的行为】${eventType}（${EVENT_LABEL[eventType]}），目标：${s.targetName}`,
    `【关键经历】${keyEvDesc}`,
    s.narrativeSnippet ? s.narrativeSnippet : '',
    `请生成事件的触发动因(trigger)和具体描述(description)。`,
  ].filter(Boolean).join('\n');

  return { system, user };
}

// ===== 评估 =====

interface EvalResult {
  d1_polarityOk: boolean;
  d2_targetOk: boolean;
  d3_triggerRef: boolean;
  forbiddenHit: boolean;
}

function evaluate(s: Scenario, eventType: string, target: string, trigger: string): EvalResult {
  const pol = EVENT_POLARITY[eventType] ?? 'neutral';
  let d1: boolean;
  if (s.affinity >= 30) d1 = pol === 'positive' || pol === 'neutral';
  else if (s.affinity <= -30) d1 = pol === 'negative' || pol === 'neutral';
  else d1 = true;

  const d2 = target.includes(s.targetName) || s.targetName.includes(target);

  let d3 = true;
  if (s.keyEvents.length > 0 && trigger) {
    const keywords = s.keyEvents.flatMap(e => (e.content.match(/[\u4e00-\u9fa5]{2,4}/g) ?? []));
    d3 = keywords.some(kw => trigger.includes(kw));
  }

  const forbiddenHit = s.forbiddenTypes.includes(eventType);
  return { d1_polarityOk: d1, d2_targetOk: d2, d3_triggerRef: d3, forbiddenHit };
}

// ===== 主流程 =====

interface RunResult {
  scenarioId: string; runIndex: number;
  // Call1
  call1_system: string; call1_user: string;
  call1_raw: string; call1_latencyMs: number; call1_parseOk: boolean;
  eventType: string | null; target: string | null;
  urgency: number | null; confidence: number | null;
  // Call2
  call2_system: string; call2_user: string;
  call2_raw: string; call2_latencyMs: number; call2_parseOk: boolean;
  trigger: string | null; description: string | null;
  // Eval
  totalLatencyMs: number;
  eval: EvalResult | null;
}

async function main() {
  const startTime = Date.now();
  log('=== POC 3a R2: 因果事件生成（双阶段 Pipeline, 6种 eventType） ===');
  log(`${SCENARIOS.length} 场景 × ${RUNS} 次 = ${SCENARIOS.length * RUNS} 决策 (${SCENARIOS.length * RUNS * 2} API)`);

  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json() as { model?: string; modelReady?: boolean };
    if (!d.modelReady) { log('模型未就绪'); process.exit(1); }
    log(`模型: ${d.model}`);
  } catch { log('ai-server 不可用'); process.exit(1); }

  const allResults: RunResult[] = [];

  log('\n--- 阶段 A: 质量 + 多样性测试（双阶段） ---');

  for (const s of SCENARIOS) {
    log(`\n=== ${s.id}: ${s.label} ===`);
    log(`焦点: ${s.testFocus}`);
    log(`预期: ${s.expectedPolarity} | 禁止: [${s.forbiddenTypes}]`);

    for (let i = 0; i < RUNS; i++) {
      const result: RunResult = {
        scenarioId: s.id, runIndex: i,
        call1_system: '', call1_user: '', call1_raw: '', call1_latencyMs: 0, call1_parseOk: false,
        eventType: null, target: null, urgency: null, confidence: null,
        call2_system: '', call2_user: '', call2_raw: '', call2_latencyMs: 0, call2_parseOk: false,
        trigger: null, description: null,
        totalLatencyMs: 0, eval: null,
      };

      try {
        // Call1: 决策
        const { system: s1, user: u1 } = buildCall1(s);
        result.call1_system = s1;
        result.call1_user = u1;
        const r1 = await callInfer(s1, u1, CALL1_SCHEMA, 'causal_decision');
        result.call1_raw = r1.rawContent;
        result.call1_latencyMs = r1.latencyMs;

        if (!r1.parsed) {
          result.call1_parseOk = false;
          allResults.push(result);
          log(`  [${i + 1}/${RUNS}] 💀 Call1 失败 ${r1.latencyMs}ms`);
          continue;
        }
        result.call1_parseOk = true;
        result.eventType = (r1.parsed.eventType as string) ?? '';
        result.target = (r1.parsed.target as string) ?? '';
        result.urgency = (r1.parsed.urgency as number) ?? 2;
        result.confidence = (r1.parsed.confidence as number) ?? 2;

        // Call2: 渲染
        const { system: s2, user: u2 } = buildCall2(s, result.eventType);
        result.call2_system = s2;
        result.call2_user = u2;
        const r2 = await callInfer(s2, u2, CALL2_SCHEMA, 'causal_render');
        result.call2_raw = r2.rawContent;
        result.call2_latencyMs = r2.latencyMs;
        result.totalLatencyMs = r1.latencyMs + r2.latencyMs;

        if (!r2.parsed) {
          result.call2_parseOk = false;
          allResults.push(result);
          log(`  [${i + 1}/${RUNS}] ⚠️ Call1✓ Call2✗ ${result.eventType} ${result.totalLatencyMs}ms`);
          continue;
        }
        result.call2_parseOk = true;
        result.trigger = (r2.parsed.trigger as string) ?? '';
        result.description = (r2.parsed.description as string) ?? '';

        // 评估
        result.eval = evaluate(s, result.eventType, result.target, result.trigger);

        const icon = result.eval.d1_polarityOk ? '✅' : '❌';
        const forb = result.eval.forbiddenHit ? '🚫' : '';
        log(`  [${i + 1}/${RUNS}] ${icon}${forb} ${result.eventType}(${EVENT_LABEL[result.eventType]}) conf=${result.confidence} | "${(result.trigger ?? '').slice(0, 25)}" ${result.totalLatencyMs}ms`);

      } catch (err) {
        log(`  [${i + 1}/${RUNS}] 💥 ${err instanceof Error ? err.message : String(err)}`);
      }
      allResults.push(result);
    }
  }

  // ===== 阶段 B: 延迟 =====
  log('\n--- 阶段 B: 延迟基准 (Call1 only) ---');
  const { system: ls, user: lu } = buildCall1(SCENARIOS[0]);
  const latencies: number[] = [];
  for (let i = 0; i < LATENCY_RUNS; i++) {
    const { latencyMs } = await callInfer(ls, lu, CALL1_SCHEMA, 'causal_decision');
    latencies.push(latencyMs);
    log(`  ${i + 1}/${LATENCY_RUNS}: ${latencyMs}ms`);
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const latStats = {
    min: sorted[0], p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)], max: sorted[sorted.length - 1],
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
  };

  // ===== 汇总 =====
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  const bothOk = allResults.filter(r => r.call1_parseOk && r.call2_parseOk);
  const n = bothOk.length || 1;
  const call1Ok = allResults.filter(r => r.call1_parseOk).length;

  const d1Rate = bothOk.filter(r => r.eval!.d1_polarityOk).length / n;
  const d2Rate = bothOk.filter(r => r.eval!.d2_targetOk).length / n;
  const d3Rate = bothOk.filter(r => r.eval!.d3_triggerRef).length / n;
  const forbRate = bothOk.filter(r => r.eval!.forbiddenHit).length / n;

  // 热力图
  const heatmap: Record<string, Record<string, number>> = {};
  for (const s of SCENARIOS) {
    heatmap[s.id] = {};
    for (const et of EVENT_TYPES) heatmap[s.id][et] = 0;
    for (const r of bothOk.filter(r => r.scenarioId === s.id)) {
      if (r.eventType) heatmap[s.id][r.eventType] = (heatmap[s.id][r.eventType] ?? 0) + 1;
    }
  }
  const globalDist: Record<string, number> = {};
  for (const et of EVENT_TYPES) globalDist[et] = 0;
  for (const r of bothOk) if (r.eventType) globalDist[r.eventType] = (globalDist[r.eventType] ?? 0) + 1;
  const hotTypes = Object.entries(globalDist).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);
  const deadTypes = Object.entries(globalDist).filter(([, v]) => v === 0).map(([k]) => k);

  log('\n============================================================');
  log(`POC 3a R2 完成 | ${duration}s`);
  log(`Call1 解析: ${call1Ok}/${allResults.length} | 双阶段完整: ${bothOk.length}/${allResults.length}`);
  log(`D1极性: ${pct(d1Rate)} | D2目标: ${pct(d2Rate)} | D3触发引用: ${pct(d3Rate)}`);
  log(`禁止类型命中: ${pct(forbRate)} | 延迟 P95=${latStats.p95}ms`);
  log(`H3a-1: ${d1Rate >= 0.8 ? '✅' : '❌'} (${pct(d1Rate)}) | H3a-3: ${latStats.p95 <= 2000 ? '✅' : '❌'} (${latStats.p95}ms)`);

  log('\n--- eventType 分布 ---');
  for (const [et, cnt] of hotTypes) log(`  ${et}(${EVENT_LABEL[et]}): ${cnt} (${pct(cnt / n)})`);
  if (deadTypes.length > 0) log(`  死区: [${deadTypes.map(t => `${t}(${EVENT_LABEL[t]})`).join(', ')}]`);

  // ===== 保存 =====
  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  writeFileSync(join(logsDir, `poc-3a-r2-${ts}.json`), JSON.stringify({
    timestamp: new Date().toISOString(), durationMs: endTime - startTime,
    config: { eventTypes: [...EVENT_TYPES], runs: RUNS, pipeline: 'dual-stage' },
    scenarios: SCENARIOS.map(s => ({
      id: s.id, label: s.label, affinity: s.affinity, tags: s.tags,
      expectedPolarity: s.expectedPolarity, forbiddenTypes: s.forbiddenTypes, testFocus: s.testFocus,
    })),
    results: allResults, heatmap, globalDist, deadTypes,
    latencyBenchmark: { ...latStats, all: latencies },
    summary: { call1ParseRate: call1Ok / allResults.length, bothParseRate: bothOk.length / allResults.length, d1Rate, d2Rate, d3Rate, forbRate },
  }, null, 2), 'utf8');

  writeFileSync(join(logsDir, `poc-3a-r2-${ts}.txt`),
    logBuffer.map(e => `[${new Date(e.ts).toLocaleTimeString('zh-CN')}] ${e.msg}`).join('\n\n'), 'utf8');

  // ===== MD 报告 =====
  const md = buildReport(allResults, bothOk, n, heatmap, globalDist, hotTypes, deadTypes, latStats, duration, ts, d1Rate, d2Rate, d3Rate, forbRate, call1Ok);
  writeFileSync(join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'review-poc-3a-r2.md'), md, 'utf8');

  log(`\n文件已保存:`);
  log(`  D:\\7game\\docs\\pipeline\\phaseIJ-poc\\logs\\poc-3a-r2-${ts}.json`);
  log(`  D:\\7game\\docs\\pipeline\\phaseIJ-poc\\logs\\poc-3a-r2-${ts}.txt`);
  log(`  D:\\7game\\docs\\pipeline\\phaseIJ-poc\\review-poc-3a-r2.md`);
}

function pct(v: number): string { return `${(v * 100).toFixed(0)}%`; }

function buildReport(
  allResults: RunResult[], bothOk: RunResult[], n: number,
  heatmap: Record<string, Record<string, number>>,
  _globalDist: Record<string, number>,
  hotTypes: [string, number][], deadTypes: string[],
  latStats: { min: number; p50: number; p95: number; max: number; avg: number },
  duration: string, ts: string,
  d1Rate: number, d2Rate: number, d3Rate: number, forbRate: number,
  call1Ok: number,
): string {
  const lines: string[] = [
    '# POC 3a R2: 因果事件生成（双阶段 Pipeline）', '',
    `> **日期**: ${new Date().toISOString().slice(0, 19)} | **模型**: Qwen3.5-2B`,
    `> **方法**: 双阶段(Call1决策+Call2渲染) × 6种eventType × 5场景 × 5次`,
    `> **耗时**: ${duration}s | **Pipeline**: Call1→eventType/target/urgency, Call2→trigger/description`, '',
    '---', '',

    '## 1. 假设验证', '',
    '| 假设 | 结论 | 数据 |',
    '|------|:----:|------|',
    `| H3a-1 极性一致≥80% | ${d1Rate >= 0.8 ? '✅ PASS' : '❌ FAIL'} | ${pct(d1Rate)} |`,
    `| H3a-2 性格自洽 | 📋 待人工 | 见下方逐条明细 |`,
    `| H3a-3 P95≤2000ms | ${latStats.p95 <= 2000 ? '✅ PASS' : '❌ FAIL'} | P95=${latStats.p95}ms (Call1 only) |`,
    '', `Call1 解析成功率: ${call1Ok}/${allResults.length} | 双阶段完整率: ${bothOk.length}/${allResults.length}`,
    '', '---', '',

    '## 2. eventType 热力图', '',
    '| 场景 | ' + EVENT_TYPES.map(et => EVENT_LABEL[et]).join(' | ') + ' |',
    '|------|' + EVENT_TYPES.map(() => ':---:').join('|') + '|',
    ...SCENARIOS.map(s => {
      const cells = EVENT_TYPES.map(et => {
        const v = heatmap[s.id]?.[et] ?? 0;
        return v > 0 ? `**${v}**` : '·';
      });
      return `| ${s.id} ${s.label.slice(0, 8)} | ${cells.join(' | ')} |`;
    }),
    '', '---', '',

    '## 3. eventType 全局分布', '',
    '| eventType | 中文 | 次数 | 占比 |',
    '|-----------|------|:----:|:----:|',
    ...hotTypes.map(([et, cnt]) => `| ${et} | ${EVENT_LABEL[et]} | ${cnt} | ${pct(cnt / n)} |`),
    '',
    deadTypes.length > 0
      ? `**死区**: ${deadTypes.map(t => `${t}(${EVENT_LABEL[t]})`).join(', ')}`
      : '**无死区**',
    '',

    '## 4. 自动评估汇总', '',
    `| 维度 | 通过率 |`,
    `|------|:------:|`,
    `| D1 因果极性 | ${pct(d1Rate)} |`,
    `| D2 目标准确 | ${pct(d2Rate)} |`,
    `| D3 触发引用 | ${pct(d3Rate)} |`,
    `| 禁止类型命中 | ${pct(forbRate)} (越低越好) |`,
    '', '---', '',

    '## 5. 逐条明细（人工审查用）', '',
  ];

  // 逐条输出完整 prompt + response
  for (const r of allResults) {
    const s = SCENARIOS.find(x => x.id === r.scenarioId)!;
    lines.push(`### ${r.scenarioId} Run ${r.runIndex + 1}`, '');

    lines.push('**Call1 Prompt (System)**:');
    lines.push('```', r.call1_system, '```', '');
    lines.push('**Call1 Prompt (User)**:');
    lines.push('```', r.call1_user, '```', '');
    lines.push(`**Call1 Response** (${r.call1_latencyMs}ms, parse=${r.call1_parseOk ? '✅' : '❌'}):`);
    lines.push('```json', r.call1_raw, '```', '');

    if (r.call1_parseOk) {
      lines.push(`> 决策: **${r.eventType}**(${EVENT_LABEL[r.eventType ?? ''] ?? '?'}) → ${r.target} | urg=${r.urgency} conf=${r.confidence}`, '');

      lines.push('**Call2 Prompt (System)**:');
      lines.push('```', r.call2_system, '```', '');
      lines.push('**Call2 Prompt (User)**:');
      lines.push('```', r.call2_user, '```', '');
      lines.push(`**Call2 Response** (${r.call2_latencyMs}ms, parse=${r.call2_parseOk ? '✅' : '❌'}):`);
      lines.push('```json', r.call2_raw, '```', '');

      if (r.eval) {
        const ev = r.eval;
        lines.push(`> **评估**: D1=${ev.d1_polarityOk ? '✅' : '❌'} D2=${ev.d2_targetOk ? '✅' : '❌'} D3=${ev.d3_triggerRef ? '✅' : '❌'} 禁止=${ev.forbiddenHit ? '🚫' : '·'}`);
      }
    }

    lines.push('', `**人工评分**: 综合合理性 ___/5 | 引擎可行性 ___/5`, '');
    lines.push('---', '');
  }

  lines.push(
    '## 6. 延迟', '',
    '| Min | P50 | P95 | Max | Avg |',
    '|:---:|:---:|:---:|:---:|:---:|',
    `| ${latStats.min}ms | ${latStats.p50}ms | ${latStats.p95}ms | ${latStats.max}ms | ${latStats.avg}ms |`,
    '', '---', '',
    '## 7. 数据文件', '',
    `- JSON: \`D:\\7game\\docs\\pipeline\\phaseIJ-poc\\logs\\poc-3a-r2-${ts}.json\``,
    `- 日志: \`D:\\7game\\docs\\pipeline\\phaseIJ-poc\\logs\\poc-3a-r2-${ts}.txt\``,
    `- 本报告: \`D:\\7game\\docs\\pipeline\\phaseIJ-poc\\review-poc-3a-r2.md\``,
  );

  return lines.join('\n');
}

main().catch(err => { log(`错误: ${err instanceof Error ? err.stack ?? err.message : String(err)}`); process.exit(1); });
