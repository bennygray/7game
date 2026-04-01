/**
 * IJ-11 阶段 3: PROTECT bias 对比验证
 *
 * 场景: V4 T4 — 张清风 vs 李沐阳（死对头被妖兽围困，是否救援？）
 * 
 * 三组对比:
 *   A: 注入 AI 预生成叙事（buildByAI 输出）
 *   B: 注入规则拼接叙事（buildByRules 输出）
 *   C: 无叙事对照组（仅事件列表）
 *
 * 每组 10 次决策评估（两阶段 pipeline）
 * 总计 30 次逻辑调用，60 次 API 调用
 *
 * 评估指标:
 *   - consistentActions: ['OBSERVE', 'IGNORE', 'FLEE']（负面关系应选的行动）
 *   - PROTECT/FIGHT 选择率（bias 指标）
 *
 * 运行: npx tsx scripts/poc-ij11-protect-bias.ts
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
const RUNS_PER_GROUP = 10;

/** 负面关系下"正确"的行动（不救死对头） */
const CONSISTENT_ACTIONS = ['OBSERVE', 'IGNORE', 'FLEE'];
/** PROTECT bias 的行动（2B 模型默认倾向） */
const BIAS_ACTIONS = ['PROTECT', 'FIGHT'];

// ===== V4 T4 场景数据 =====

const SUBJECT_NAME = '张清风';
const TARGET_NAME = '李沐阳';
const TARGET_ID = 'li_muyang';

const IDENTITY = `你是修仙宗门弟子「${SUBJECT_NAME}」，性格内向正直。道德偏善守序。你所在的宗门：崇尚仁德，门规严明。`;

const EVENT_DESC = '宗门遭妖兽来袭，李沐阳正被三头妖兽围困，命悬一线';

const CANDIDATE_EMOTIONS = ['anger', 'contempt', 'fear', 'neutral', 'worry'];
const EMOTION_LABELS: Record<string, string> = {
  anger: '愤怒', contempt: '轻蔑', fear: '恐惧', neutral: '平静', worry: '担忧',
};

const ACTION_POOL = [
  { code: 'FIGHT', label: '挺身迎战，击退妖兽' },
  { code: 'PROTECT', label: '舍身保护李沐阳' },
  { code: 'FLEE', label: '趁乱逃离现场' },
  { code: 'OBSERVE', label: '远处观望，伺机而动' },
  { code: 'IGNORE', label: '视若无睹，径直走开' },
];

/** L6 关系上下文（不含叙事片段，作为基础模板） */
const RELATIONSHIP_BASE = `【与${TARGET_NAME}的关系】好感：-45（死对头）
关键经历：曾被李沐阳当众羞辱(-30)；因争夺破境草翻脸(-20)；在灵兽山被其暗算(-10)
近况：筑基突破成功，实力大增
旁人关系：好友王灵均也被李沐阳陷害过（好感：-30）`;

/** L6 额外上下文（V4 T4 的 extraContext） */
const EXTRA_CONTEXT = '李沐阳上次在你闭关时散布你的谣言，还试图拉拢你的弟子。宗门长老对此事心知肚明却未处罚他。';

// ===== Prompt Builder =====

const SYSTEM_MSG = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。';
const SYSTEM_CALL2 = '你是修仙世界弟子的内心独白生成器。根据角色的性格、情绪和行为，写一段简短内心独白。严格按JSON格式输出。';

const EMOTION_ENUM = ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
  'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
  'worry', 'shame', 'pride', 'relief'];

function buildCall1Schema(): object {
  return {
    type: 'object',
    properties: {
      emotion: { type: 'string', enum: EMOTION_ENUM },
      intensity: { type: 'integer', enum: [1, 2, 3] },
      actionCode: { type: 'string', enum: ACTION_POOL.map(a => a.code) },
    },
    required: ['emotion', 'intensity', 'actionCode'],
  };
}

function buildCall2Schema(): object {
  return {
    type: 'object',
    properties: {
      innerThought: { type: 'string', maxLength: 80, description: '内心独白（20-30字，第一人称）' },
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
}

function buildCall1Prompt(narrativeSnippet: string | null): string {
  const candidateList = CANDIDATE_EMOTIONS
    .map(e => `${e}(${EMOTION_LABELS[e] ?? e})`)
    .join('、');
  const actionListDesc = ACTION_POOL.map(a => `${a.code}(${a.label})`).join(' / ');

  const parts = [IDENTITY];

  // 关系上下文
  let relBlock = RELATIONSHIP_BASE;
  if (narrativeSnippet) {
    relBlock += `\n${narrativeSnippet}`;
  }
  relBlock += `\n补充：${EXTRA_CONTEXT}`;
  relBlock += `\n（注意：relationshipDeltas.targetId 请填「${TARGET_ID}」）`;
  parts.push(relBlock);

  parts.push(`刚才发生了：${EVENT_DESC}`);
  parts.push('');
  parts.push('你此刻内心的情绪是什么？你会怎么做？');
  parts.push('');
  parts.push(`【候选情绪】（必须从以下情绪中选择一种）：${candidateList}`);
  parts.push(`【候选行动】（必须从以下行动中选择一种）：${actionListDesc}`);
  parts.push('');
  parts.push('只需选择情绪和行动，用JSON输出。');

  return parts.join('\n');
}

function buildCall2Prompt(emotion: string, actionCode: string, narrativeSnippet: string | null): string {
  let relBlock = RELATIONSHIP_BASE;
  if (narrativeSnippet) relBlock += `\n${narrativeSnippet}`;
  const actionLabel = ACTION_POOL.find(a => a.code === actionCode)?.label ?? actionCode;

  return `你是修仙宗门弟子「${SUBJECT_NAME}」，性格内向正直。\n` +
    `${relBlock}\n` +
    `刚才发生了：${EVENT_DESC}\n` +
    `你的情绪是${emotion}（${EMOTION_LABELS[emotion] ?? emotion}），你选择了${actionCode}（${actionLabel}）。\n\n` +
    `请用JSON输出你此刻的内心独白（20-30字，第一人称）和关系变化。`;
}

// ===== API =====

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
        max_tokens: 200,
        temperature: 0.6,
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
    if (!res.ok) return { content: `HTTP_${res.status}`, parsed: null, latencyMs };
    const data = await res.json() as { content: string; parsed?: Record<string, unknown> | null };
    const parsed = (data.parsed !== undefined && data.parsed !== null)
      ? data.parsed
      : (() => { try { return JSON.parse(data.content) as Record<string, unknown>; } catch { return null; } })();
    return { content: data.content ?? '', parsed, latencyMs };
  } catch (err) {
    return { content: err instanceof Error ? err.name : 'Error', parsed: null, latencyMs: Date.now() - start };
  }
}

// ===== Run Decision =====

interface DecisionResult {
  group: 'A-AI' | 'B-Rules' | 'C-Control';
  runIndex: number;
  narrativeSnippet: string | null;
  emotion: string | null;
  actionCode: string | null;
  innerThought: string | null;
  latencyMs: number;
  parseSuccess: boolean;
  isConsistent: boolean;
  isBias: boolean;
  rawCall1: string;
  rawCall2: string;
}

async function runDecision(
  group: DecisionResult['group'],
  runIdx: number,
  narrativeSnippet: string | null,
): Promise<DecisionResult> {
  // Call 1: emotion + action
  const prompt1 = buildCall1Prompt(narrativeSnippet);
  const r1 = await callInfer(SYSTEM_MSG, prompt1, buildCall1Schema(), 'soul_decide_bias');

  let emotion: string | null = null;
  let actionCode: string | null = null;

  if (r1.parsed) {
    emotion = (r1.parsed.emotion as string) ?? null;
    actionCode = (r1.parsed.actionCode as string) ?? null;
  }

  if (!emotion || !actionCode) {
    return {
      group, runIndex: runIdx, narrativeSnippet,
      emotion: null, actionCode: null, innerThought: null,
      latencyMs: r1.latencyMs, parseSuccess: false,
      isConsistent: false, isBias: false,
      rawCall1: r1.content, rawCall2: '',
    };
  }

  // Call 2: innerThought
  const prompt2 = buildCall2Prompt(emotion, actionCode, narrativeSnippet);
  const r2 = await callInfer(SYSTEM_CALL2, prompt2, buildCall2Schema(), 'soul_thought_bias');

  let innerThought: string | null = null;
  if (r2.parsed) {
    innerThought = (r2.parsed.innerThought as string) ?? null;
  }

  const isConsistent = CONSISTENT_ACTIONS.includes(actionCode);
  const isBias = BIAS_ACTIONS.includes(actionCode);

  return {
    group, runIndex: runIdx, narrativeSnippet,
    emotion, actionCode, innerThought,
    latencyMs: r1.latencyMs + r2.latencyMs,
    parseSuccess: true, isConsistent, isBias,
    rawCall1: r1.content, rawCall2: r2.content,
  };
}

// ===== Main =====

async function main() {
  const startTime = Date.now();
  log('INFO', '=== IJ-11 阶段 3: PROTECT bias 对比验证 ===');
  log('INFO', `场景: ${SUBJECT_NAME} vs ${TARGET_NAME} (死对头被妖兽围困)`);
  log('INFO', `每组 ${RUNS_PER_GROUP} 次，共 3 组 = ${RUNS_PER_GROUP * 3} 次决策调用`);

  // Health check
  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json() as { model?: string; modelFile?: string; modelReady?: boolean };
    if (!d.modelReady) { log('ERROR', 'AI 模型未就绪'); process.exit(1); }
    log('INFO', `模型: ${d.model} (${d.modelFile})`);
  } catch { log('ERROR', 'ai-server 不可用'); process.exit(1); }

  // 生成叙事片段
  const builder = new NarrativeSnippetBuilder();
  const memory: RelationshipMemory = {
    sourceId: 'zhang', targetId: 'li',
    affinity: -45, tags: ['rival'] as RelationshipTag[],
    keyEvents: [
      { content: '曾被李沐阳当众羞辱', tick: 50, affinityDelta: -30 },
      { content: '因争夺破境草翻脸', tick: 150, affinityDelta: -20 },
      { content: '在灵兽山被其暗算', tick: 250, affinityDelta: -10 },
    ],
    encounterCount: 20, lastEncounterTick: 300, dialogueCount: 8,
  };

  log('INFO', '\n--- 生成叙事片段 ---');
  const aiSnippet = await builder.buildByAI(SUBJECT_NAME, TARGET_NAME, memory);
  const rulesSnippet = builder.buildByRules(SUBJECT_NAME, TARGET_NAME, memory);
  log('INFO', `A 组 (AI): "${aiSnippet}"`);
  log('INFO', `B 组 (Rules): "${rulesSnippet}"`);
  log('INFO', `C 组 (Control): 无叙事注入`);

  if (!aiSnippet) {
    log('ERROR', 'AI snippet 生成失败，无法进行对比');
    process.exit(1);
  }

  // 执行三组测试
  const allResults: DecisionResult[] = [];

  const groups: Array<{ label: DecisionResult['group']; snippet: string | null }> = [
    { label: 'A-AI', snippet: aiSnippet },
    { label: 'B-Rules', snippet: rulesSnippet },
    { label: 'C-Control', snippet: null },
  ];

  for (const { label, snippet } of groups) {
    log('INFO', `\n--- ${label} 组: ${snippet ? `"${snippet.substring(0, 30)}..."` : '(无叙事)'} ---`);

    for (let i = 0; i < RUNS_PER_GROUP; i++) {
      const result = await runDecision(label, i, snippet);
      allResults.push(result);

      const icon = result.parseSuccess
        ? (result.isConsistent ? '✅' : (result.isBias ? '⚠️' : '🔸'))
        : '❌';
      log('INFO', `  [${i + 1}/${RUNS_PER_GROUP}] ${icon} action=${result.actionCode ?? '?'} emotion=${result.emotion ?? '?'} thought="${(result.innerThought ?? '').slice(0, 20)}..." ${result.latencyMs}ms`);
    }
  }

  // ===== 统计 =====

  const endTime = Date.now();

  interface GroupStats {
    group: string;
    total: number;
    parseSuccess: number;
    consistentRate: number;      // OBSERVE/IGNORE/FLEE
    biasRate: number;            // PROTECT/FIGHT
    actionDistribution: Record<string, number>;
    avgLatencyMs: number;
  }

  const groupStats: GroupStats[] = groups.map(({ label }) => {
    const gr = allResults.filter(r => r.group === label);
    const parsed = gr.filter(r => r.parseSuccess);
    const n = parsed.length;

    const dist: Record<string, number> = {};
    for (const r of parsed) {
      if (r.actionCode) dist[r.actionCode] = (dist[r.actionCode] ?? 0) + 1;
    }

    return {
      group: label,
      total: gr.length,
      parseSuccess: n,
      consistentRate: n > 0 ? parsed.filter(r => r.isConsistent).length / n : 0,
      biasRate: n > 0 ? parsed.filter(r => r.isBias).length / n : 0,
      actionDistribution: dist,
      avgLatencyMs: n > 0 ? Math.round(parsed.reduce((s, r) => s + r.latencyMs, 0) / n) : 0,
    };
  });

  // 输出统计
  log('INFO', '\n============================================================');
  log('INFO', `IJ-11 阶段 3 完成 | ${((endTime - startTime) / 1000).toFixed(1)}s`);
  log('INFO', '');

  for (const gs of groupStats) {
    const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
    const distStr = Object.entries(gs.actionDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    log('INFO', `${gs.group}: 一致率=${pct(gs.consistentRate)} | bias率=${pct(gs.biasRate)} | 分布=[${distStr}] | ${gs.avgLatencyMs}ms`);
  }

  // bias 改善量
  const cBias = groupStats.find(g => g.group === 'C-Control')!.biasRate;
  const aBias = groupStats.find(g => g.group === 'A-AI')!.biasRate;
  const bBias = groupStats.find(g => g.group === 'B-Rules')!.biasRate;
  log('INFO', '');
  log('INFO', `PROTECT bias 改善: C(无叙事)=${(cBias * 100).toFixed(0)}% → A(AI)=${(aBias * 100).toFixed(0)}% / B(规则)=${(bBias * 100).toFixed(0)}%`);
  log('INFO', '============================================================');

  // ===== 保存 =====

  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  const jsonData = {
    timestamp: new Date().toISOString(),
    durationMs: endTime - startTime,
    scenario: { subject: SUBJECT_NAME, target: TARGET_NAME, event: EVENT_DESC },
    snippets: { ai: aiSnippet, rules: rulesSnippet, control: null },
    results: allResults,
    groupStats,
    biasComparison: {
      control: { biasRate: cBias, consistentRate: groupStats[2].consistentRate },
      ai: { biasRate: aBias, consistentRate: groupStats[0].consistentRate, biasReduction: cBias - aBias },
      rules: { biasRate: bBias, consistentRate: groupStats[1].consistentRate, biasReduction: cBias - bBias },
    },
  };
  const jsonPath = join(logsDir, `poc-ij11-protect-bias-${ts}.json`);
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');

  // 日志
  const logLines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  const txtPath = join(logsDir, `poc-ij11-protect-bias-${ts}.txt`);
  writeFileSync(txtPath, logLines.join('\n\n'), 'utf8');

  // 报告
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const reportLines = [
    `# IJ-11 阶段 3: PROTECT bias 对比验证报告`,
    ``,
    `> **日期**: ${new Date().toISOString().slice(0, 19)} | **场景**: ${SUBJECT_NAME} vs ${TARGET_NAME}（妖兽围困决策）`,
    `> **模型**: Qwen3.5-2B | **每组**: ${RUNS_PER_GROUP} 次 × 3 组 = ${RUNS_PER_GROUP * 3} 次决策`,
    ``,
    `---`,
    ``,
    `## 核心结论`,
    ``,
    `| 组别 | 叙事注入 | PROTECT/FIGHT (bias) | OBSERVE/IGNORE/FLEE (正确) | bias 改善 |`,
    `|------|---------|:--------------------:|:-------------------------:|:---------:|`,
    ...groupStats.map(gs => {
      const biasReduction = gs.group === 'C-Control' ? '—（基线）'
        : `${cBias > gs.biasRate ? '↓' : '↑'}${Math.abs(Math.round((cBias - gs.biasRate) * 100))}pp`;
      return `| ${gs.group} | ${gs.group === 'C-Control' ? '无' : gs.group === 'A-AI' ? 'AI 预生成' : '规则拼接'} | ${pct(gs.biasRate)} | ${pct(gs.consistentRate)} | ${biasReduction} |`;
    }),
    ``,
    `---`,
    ``,
    `## 注入的叙事片段`,
    ``,
    `| 组别 | 叙事内容 |`,
    `|------|---------|`,
    `| A-AI | "${aiSnippet}" |`,
    `| B-Rules | "${rulesSnippet}" |`,
    `| C-Control | （无） |`,
    ``,
    `---`,
    ``,
    `## 逐次决策明细`,
    ``,
    `| 组别 | Run | 行动 | 情绪 | 内心独白 | 耗时 | 正确 |`,
    `|------|:---:|------|------|---------|:----:|:----:|`,
    ...allResults.map(r => {
      const icon = r.parseSuccess ? (r.isConsistent ? '✅' : (r.isBias ? '⚠️' : '🔸')) : '❌';
      return `| ${r.group} | ${r.runIndex + 1} | ${r.actionCode ?? '?'} | ${r.emotion ?? '?'} | ${(r.innerThought ?? '').slice(0, 25)}... | ${r.latencyMs}ms | ${icon} |`;
    }),
    ``,
    `---`,
    ``,
    `## 行动分布`,
    ``,
    `| 行动 | A-AI | B-Rules | C-Control |`,
    `|------|:----:|:-------:|:---------:|`,
    ...ACTION_POOL.map(a => {
      const counts = groupStats.map(gs => gs.actionDistribution[a.code] ?? 0);
      return `| ${a.code} (${a.label}) | ${counts[0]} | ${counts[1]} | ${counts[2]} |`;
    }),
    ``,
    `## 数据文件`,
    ``,
    `- JSON: \`logs/poc-ij11-protect-bias-${ts}.json\``,
    `- 日志: \`logs/poc-ij11-protect-bias-${ts}.txt\``,
  ];

  const mdPath = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', `review-ij11-protect-bias.md`);
  writeFileSync(mdPath, reportLines.join('\n'), 'utf8');

  log('INFO', `\n输出已保存:`);
  log('INFO', `  JSON: ${jsonPath}`);
  log('INFO', `  日志: ${txtPath}`);
  log('INFO', `  报告: ${mdPath}`);
}

main().catch(err => {
  log('ERROR', `失败: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
