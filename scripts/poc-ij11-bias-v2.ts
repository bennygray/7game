/**
 * IJ-11 阶段 3v2: PROTECT bias prompt 工程对比验证
 *
 * 4 个变体 + 基线对照:
 *   Baseline: 原始 prompt（阶段3 A-AI组 重跑）
 *   V1: 重新框定行动描述（OBSERVE→策略观察，IGNORE→保存实力）
 *   V2: 系统提示加反 bias 约束（"不救也是合理角色扮演"）
 *   V3: 移除宗门"仁德"设定（角色设定去英雄化）
 *   V4: V1+V2+V3 全部组合
 *
 * 每变体 10 次决策（两阶段 pipeline），共 50 次
 * 总计 100 次 API 调用
 *
 * 运行: npx tsx scripts/poc-ij11-bias-v2.ts
 */

import { NarrativeSnippetBuilder } from '../src/ai/narrative-snippet-builder';
import type { RelationshipMemory } from '../src/shared/types/relationship-memory';
import type { RelationshipTag } from '../src/shared/types/soul';
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

// ===== 常量 =====

const BASE_URL = 'http://localhost:3001';
const RUNS = 10;

const SUBJECT = '张清风';
const TARGET = '李沐阳';
const TARGET_ID = 'li_muyang';
const EVENT = '宗门遭妖兽来袭，李沐阳正被三头妖兽围困，命悬一线';

const CONSISTENT_ACTIONS = ['OBSERVE', 'IGNORE', 'FLEE'];
const BIAS_ACTIONS = ['PROTECT', 'FIGHT'];

const EMOTION_ENUM = ['joy','anger','envy','admiration','sadness','fear',
  'contempt','neutral','jealousy','gratitude','guilt','worry','shame','pride','relief'];

const CANDIDATE_EMOTIONS = ['anger', 'contempt', 'fear', 'neutral', 'worry'];
const EMOTION_LABELS: Record<string, string> = {
  anger: '愤怒', contempt: '轻蔑', fear: '恐惧', neutral: '平静', worry: '担忧',
};

// ===== 变体定义 =====

interface Variant {
  id: string;
  label: string;
  /** 变更说明 */
  change: string;
  /** 角色身份 */
  identity: string;
  /** 系统提示 */
  systemMsg: string;
  /** 行动池 */
  actions: Array<{ code: string; label: string }>;
}

// 原始行动池
const ACTIONS_ORIGINAL = [
  { code: 'FIGHT', label: '挺身迎战，击退妖兽' },
  { code: 'PROTECT', label: '舍身保护李沐阳' },
  { code: 'FLEE', label: '趁乱逃离现场' },
  { code: 'OBSERVE', label: '远处观望，伺机而动' },
  { code: 'IGNORE', label: '视若无睹，径直走开' },
];

// V1: 重新框定行动描述
const ACTIONS_REFRAMED = [
  { code: 'FIGHT', label: '挺身迎战，击退妖兽' },
  { code: 'PROTECT', label: '舍身保护李沐阳' },
  { code: 'FLEE', label: '趁乱逃离，保存实力' },
  { code: 'OBSERVE', label: '冷静观察局势，等待最佳时机再行动' },
  { code: 'IGNORE', label: '此人自作自受，从长计议不予理会' },
];

// 原始身份
const IDENTITY_ORIGINAL = `你是修仙宗门弟子「${SUBJECT}」，性格内向正直。道德偏善守序。你所在的宗门：崇尚仁德，门规严明。`;

// V3: 去英雄化身份
const IDENTITY_NEUTRAL = `你是修仙宗门弟子「${SUBJECT}」，性格内向冷静。道德偏中立务实。你所在的宗门：门规严明，弟子以自保为先。`;

// 原始系统提示
const SYS_ORIGINAL = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。';

// V2: 反 bias 系统提示
const SYS_ANTIBIAS = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。\n' +
  '重要原则：角色的行动必须符合其与对方的实际关系。对于仇人或死对头，在危急时刻选择旁观、离开或趁机报复都是合理的角色扮演——不要让角色做出与关系矛盾的"英雄"行为。\n' +
  '好感度为负数意味着角色不愿意帮助对方。好感度越低，越不可能施以援手。';

const SYS_CALL2 = '你是修仙世界弟子的内心独白生成器。根据角色的性格、情绪和行为，写一段简短内心独白。严格按JSON格式输出。';

const VARIANTS: Variant[] = [
  {
    id: 'Baseline',
    label: '基线（原始 prompt）',
    change: '无变更，与阶段3 A-AI组相同',
    identity: IDENTITY_ORIGINAL,
    systemMsg: SYS_ORIGINAL,
    actions: ACTIONS_ORIGINAL,
  },
  {
    id: 'V1-Actions',
    label: 'V1: 重新框定行动描述',
    change: 'OBSERVE→"冷静观察局势，等待最佳时机", IGNORE→"此人自作自受，从长计议不予理会", FLEE→"趁乱逃离，保存实力"',
    identity: IDENTITY_ORIGINAL,
    systemMsg: SYS_ORIGINAL,
    actions: ACTIONS_REFRAMED,
  },
  {
    id: 'V2-System',
    label: 'V2: 反 bias 系统提示',
    change: '系统提示加入"对仇人选择旁观/离开是合理角色扮演"、"好感为负不愿帮助"',
    identity: IDENTITY_ORIGINAL,
    systemMsg: SYS_ANTIBIAS,
    actions: ACTIONS_ORIGINAL,
  },
  {
    id: 'V3-Identity',
    label: 'V3: 去英雄化身份',
    change: '"内向正直"→"内向冷静", "善守序"→"中立务实", "崇尚仁德"→"弟子以自保为先"',
    identity: IDENTITY_NEUTRAL,
    systemMsg: SYS_ORIGINAL,
    actions: ACTIONS_ORIGINAL,
  },
  {
    id: 'V4-Combined',
    label: 'V4: 全部组合',
    change: 'V1+V2+V3 全部应用',
    identity: IDENTITY_NEUTRAL,
    systemMsg: SYS_ANTIBIAS,
    actions: ACTIONS_REFRAMED,
  },
];

// ===== 关系上下文 =====

const RELATIONSHIP_BASE = `【与${TARGET}的关系】好感：-45（死对头）
关键经历：曾被李沐阳当众羞辱(-30)；因争夺破境草翻脸(-20)；在灵兽山被其暗算(-10)
近况：筑基突破成功，实力大增
旁人关系：好友王灵均也被李沐阳陷害过（好感：-30）`;

const EXTRA = '李沐阳上次在你闭关时散布你的谣言，还试图拉拢你的弟子。宗门长老对此事心知肚明却未处罚他。';

// ===== API =====

function buildCall1Schema(actions: Variant['actions']): object {
  return {
    type: 'object',
    properties: {
      emotion: { type: 'string', enum: EMOTION_ENUM },
      intensity: { type: 'integer', enum: [1, 2, 3] },
      actionCode: { type: 'string', enum: actions.map(a => a.code) },
    },
    required: ['emotion', 'intensity', 'actionCode'],
  };
}

const CALL2_SCHEMA = {
  type: 'object',
  properties: {
    innerThought: { type: 'string', maxLength: 80 },
    relationshipDeltas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetId: { type: 'string' },
          delta: { type: 'number', minimum: -10, maximum: 10 },
          reason: { type: 'string', maxLength: 30 },
        },
        required: ['targetId', 'delta', 'reason'],
      },
      maxItems: 1,
    },
  },
  required: ['innerThought', 'relationshipDeltas'],
};

async function callInfer(
  systemMsg: string, userMsg: string, schema: object, schemaName: string,
): Promise<{ content: string; parsed: Record<string, unknown> | null; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 200, temperature: 0.6, top_p: 0.9, timeout_ms: 10000,
        response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { content: `HTTP_${res.status}`, parsed: null, latencyMs };
    const data = await res.json() as { content: string; parsed?: Record<string, unknown> | null };
    const parsed = data.parsed ?? (() => { try { return JSON.parse(data.content) as Record<string, unknown>; } catch { return null; } })();
    return { content: data.content ?? '', parsed, latencyMs };
  } catch (err) {
    return { content: err instanceof Error ? err.name : 'Error', parsed: null, latencyMs: Date.now() - start };
  }
}

// ===== Decision Runner =====

interface Result {
  variantId: string;
  runIndex: number;
  emotion: string | null;
  actionCode: string | null;
  innerThought: string | null;
  latencyMs: number;
  parseSuccess: boolean;
  isConsistent: boolean;
  isBias: boolean;
}

async function runDecision(v: Variant, runIdx: number, snippet: string): Promise<Result> {
  const candidateList = CANDIDATE_EMOTIONS.map(e => `${e}(${EMOTION_LABELS[e]})`).join('、');
  const actionList = v.actions.map(a => `${a.code}(${a.label})`).join(' / ');

  let relBlock = RELATIONSHIP_BASE + `\n${snippet}\n补充：${EXTRA}`;
  relBlock += `\n（注意：relationshipDeltas.targetId 请填「${TARGET_ID}」）`;

  const userMsg = [
    v.identity, relBlock,
    `刚才发生了：${EVENT}`, '',
    '你此刻内心的情绪是什么？你会怎么做？', '',
    `【候选情绪】（必须从以下选择一种）：${candidateList}`,
    `【候选行动】（必须从以下选择一种）：${actionList}`, '',
    '只需选择情绪和行动，用JSON输出。',
  ].join('\n');

  const r1 = await callInfer(v.systemMsg, userMsg, buildCall1Schema(v.actions), 'soul_bias_v2');

  let emotion: string | null = null;
  let actionCode: string | null = null;
  if (r1.parsed) {
    emotion = (r1.parsed.emotion as string) ?? null;
    actionCode = (r1.parsed.actionCode as string) ?? null;
  }

  if (!emotion || !actionCode) {
    return { variantId: v.id, runIndex: runIdx, emotion: null, actionCode: null,
      innerThought: null, latencyMs: r1.latencyMs, parseSuccess: false, isConsistent: false, isBias: false };
  }

  // Call 2
  const actionLabel = v.actions.find(a => a.code === actionCode)?.label ?? actionCode;
  const p2 = `你是修仙宗门弟子「${SUBJECT}」。\n${RELATIONSHIP_BASE}\n${snippet}\n` +
    `刚才发生了：${EVENT}\n你的情绪是${emotion}，你选择了${actionCode}（${actionLabel}）。\n请用JSON输出内心独白和关系变化。`;
  const r2 = await callInfer(SYS_CALL2, p2, CALL2_SCHEMA, 'soul_thought_v2');

  const innerThought = r2.parsed ? (r2.parsed.innerThought as string) ?? null : null;
  const isConsistent = CONSISTENT_ACTIONS.includes(actionCode);
  const isBias = BIAS_ACTIONS.includes(actionCode);

  return { variantId: v.id, runIndex: runIdx, emotion, actionCode, innerThought,
    latencyMs: r1.latencyMs + r2.latencyMs, parseSuccess: true, isConsistent, isBias };
}

// ===== Main =====

async function main() {
  const startTime = Date.now();
  log('INFO', '=== IJ-11 阶段 3v2: PROTECT bias prompt 工程对比 ===');
  log('INFO', `${VARIANTS.length} 个变体 × ${RUNS} 次 = ${VARIANTS.length * RUNS} 次决策`);

  // Health
  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json() as { model?: string; modelFile?: string; modelReady?: boolean };
    if (!d.modelReady) { log('ERROR', '模型未就绪'); process.exit(1); }
    log('INFO', `模型: ${d.model} (${d.modelFile})`);
  } catch { log('ERROR', 'ai-server 不可用'); process.exit(1); }

  // 生成 AI snippet
  const builder = new NarrativeSnippetBuilder();
  const memory: RelationshipMemory = {
    sourceId: 'zhang', targetId: 'li', affinity: -45, tags: ['rival'] as RelationshipTag[],
    keyEvents: [
      { content: '曾被李沐阳当众羞辱', tick: 50, affinityDelta: -30 },
      { content: '因争夺破境草翻脸', tick: 150, affinityDelta: -20 },
      { content: '在灵兽山被其暗算', tick: 250, affinityDelta: -10 },
    ],
    encounterCount: 20, lastEncounterTick: 300, dialogueCount: 8,
  };
  const aiSnippet = await builder.buildByAI(SUBJECT, TARGET, memory);
  if (!aiSnippet) { log('ERROR', 'AI snippet 生成失败'); process.exit(1); }
  log('INFO', `AI 叙事: "${aiSnippet}"`);

  // 运行所有变体
  const allResults: Result[] = [];

  for (const v of VARIANTS) {
    log('INFO', `\n--- ${v.id}: ${v.label} ---`);
    log('INFO', `变更: ${v.change}`);

    for (let i = 0; i < RUNS; i++) {
      const r = await runDecision(v, i, aiSnippet);
      allResults.push(r);
      const icon = r.parseSuccess ? (r.isConsistent ? '✅' : (r.isBias ? '⚠️' : '🔸')) : '❌';
      log('INFO', `  [${i + 1}/${RUNS}] ${icon} ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | "${(r.innerThought ?? '').slice(0, 25)}..." ${r.latencyMs}ms`);
    }
  }

  const endTime = Date.now();

  // ===== 统计 =====

  interface VStats {
    id: string; label: string; change: string;
    total: number; parsed: number;
    consistentRate: number; biasRate: number;
    protectRate: number; fightRate: number; fleeRate: number; observeRate: number; ignoreRate: number;
    dist: Record<string, number>;
    avgLatencyMs: number;
  }

  const vStats: VStats[] = VARIANTS.map(v => {
    const vr = allResults.filter(r => r.variantId === v.id);
    const parsed = vr.filter(r => r.parseSuccess);
    const n = parsed.length;
    const dist: Record<string, number> = {};
    for (const r of parsed) { if (r.actionCode) dist[r.actionCode] = (dist[r.actionCode] ?? 0) + 1; }
    const rate = (code: string) => n > 0 ? (dist[code] ?? 0) / n : 0;
    return {
      id: v.id, label: v.label, change: v.change,
      total: vr.length, parsed: n,
      consistentRate: n > 0 ? parsed.filter(r => r.isConsistent).length / n : 0,
      biasRate: n > 0 ? parsed.filter(r => r.isBias).length / n : 0,
      protectRate: rate('PROTECT'), fightRate: rate('FIGHT'),
      fleeRate: rate('FLEE'), observeRate: rate('OBSERVE'), ignoreRate: rate('IGNORE'),
      dist, avgLatencyMs: n > 0 ? Math.round(parsed.reduce((s, r) => s + r.latencyMs, 0) / n) : 0,
    };
  });

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  log('INFO', '\n============================================================');
  log('INFO', `完成 | ${((endTime - startTime) / 1000).toFixed(1)}s`);
  for (const s of vStats) {
    log('INFO', `${s.id}: 一致=${pct(s.consistentRate)} bias=${pct(s.biasRate)} | P=${pct(s.protectRate)} F=${pct(s.fightRate)} FL=${pct(s.fleeRate)} O=${pct(s.observeRate)} I=${pct(s.ignoreRate)}`);
  }
  log('INFO', '============================================================');

  // ===== Save =====

  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  // JSON
  const jsonPath = join(logsDir, `poc-ij11-bias-v2-${ts}.json`);
  writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(), durationMs: endTime - startTime,
    aiSnippet, variants: VARIANTS.map(v => ({ id: v.id, label: v.label, change: v.change })),
    results: allResults, variantStats: vStats,
  }, null, 2), 'utf8');

  // Log
  const txtPath = join(logsDir, `poc-ij11-bias-v2-${ts}.txt`);
  writeFileSync(txtPath, logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  }).join('\n\n'), 'utf8');

  // Report
  const reportLines = [
    '# IJ-11 阶段 3v2: PROTECT bias prompt 工程对比报告',
    '',
    `> **日期**: ${new Date().toISOString().slice(0, 19)} | **模型**: Qwen3.5-2B`,
    `> **总调用**: ${VARIANTS.length * RUNS} 次决策 (${VARIANTS.length * RUNS * 2} 次API) | **耗时**: ${((endTime - startTime) / 1000).toFixed(1)}s`,
    '',
    `> **注入叙事**: "${aiSnippet}"`,
    '',
    '---',
    '',
    '## 变体定义',
    '',
    '| 变体 | 变更内容 |',
    '|------|---------|',
    ...VARIANTS.map(v => `| **${v.id}** | ${v.change} |`),
    '',
    '---',
    '',
    '## 核心对比',
    '',
    '| 变体 | PROTECT | FIGHT | FLEE | OBSERVE | IGNORE | bias率 | 正确率 |',
    '|------|:-------:|:-----:|:----:|:-------:|:------:|:------:|:------:|',
    ...vStats.map(s => `| **${s.id}** | ${pct(s.protectRate)} | ${pct(s.fightRate)} | ${pct(s.fleeRate)} | ${pct(s.observeRate)} | ${pct(s.ignoreRate)} | ${pct(s.biasRate)} | ${pct(s.consistentRate)} |`),
    '',
    '---',
    '',
    '## 逐次明细',
    '',
    '| 变体 | Run | 行动 | 情绪 | 内心独白 | 耗时 | 评价 |',
    '|------|:---:|------|------|---------|:----:|:----:|',
    ...allResults.map(r => {
      const icon = r.parseSuccess ? (r.isConsistent ? '✅' : (r.isBias ? '⚠️' : '🔸')) : '❌';
      return `| ${r.variantId} | ${r.runIndex + 1} | ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | ${(r.innerThought ?? '').slice(0, 25)}... | ${r.latencyMs}ms | ${icon} |`;
    }),
    '',
    '## 数据文件',
    '',
    `- JSON: \`logs/poc-ij11-bias-v2-${ts}.json\``,
    `- 日志: \`logs/poc-ij11-bias-v2-${ts}.txt\``,
  ];

  const mdPath = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'review-ij11-bias-v2.md');
  writeFileSync(mdPath, reportLines.join('\n'), 'utf8');

  log('INFO', `\n保存: ${jsonPath}`);
  log('INFO', `       ${txtPath}`);
  log('INFO', `       ${mdPath}`);
}

main().catch(err => {
  log('ERROR', `失败: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
