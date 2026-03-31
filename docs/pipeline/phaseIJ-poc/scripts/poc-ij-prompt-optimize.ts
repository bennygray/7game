/**
 * Phase IJ-PoC v2: Prompt 优化对比实验
 *
 * 对照 v1 结果，测试两种优化策略：
 *   V2 — 单次调用 + Prompt/Schema 收紧（7 项 A 类优化）
 *   V3 — 两阶段分离 + Prompt/Schema 收紧（A+B 类优化）
 *
 * 实验矩阵：
 *   V2 + V3 × L0/L1/L3 × 5 用例 × 5 轮
 *   V2: 3 × 5 × 5 = 75 次调用
 *   V3: 3 × 5 × 5 = 75 次（每次 2 calls → 150 次 API 调用）
 *   总计：225 次 API 调用
 *
 * 运行：npx tsx docs/pipeline/phaseIJ-poc/scripts/poc-ij-prompt-optimize.ts [--runs=N]
 *
 * @see docs/pipeline/phaseIJ-poc/review.md — v1 结论
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ===== S1: Logger =====

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
const logBuffer: Array<{ ts: number; level: LogLevel; msg: string; data?: Record<string, unknown> }> = [];

function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  const ts = Date.now();
  logBuffer.push({ ts, level, msg, data });
  const t = new Date(ts).toLocaleTimeString('zh-CN');
  const d = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${t}][${level}] ${msg}${d}`);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ===== S2: Types & Constants =====

type ContextLevel = 0 | 1 | 3;
const TEST_LEVELS: ContextLevel[] = [0, 1, 3];

type VariantId = 'V2' | 'V3';
const ALL_VARIANTS: VariantId[] = ['V2', 'V3'];

type ScenarioType = 'dialogue' | 'decision';

interface MockKeyEvent {
  content: string;
  affinityDelta: number;
}

interface RelationshipContext {
  level: ContextLevel;
  affinity?: number;
  tagLabel?: string;
  keyEvents?: MockKeyEvent[];
}

interface ActionOption {
  code: string;
  label: string;
}

interface TestCase {
  id: string;
  type: ScenarioType;
  subjectName: string;
  personality: string;
  moralDesc: string;
  sectDesc: string;
  targetName: string;
  targetId: string;
  eventType: string;
  eventDescription: string;
  candidateEmotions: string[];
  emotionLabels: Record<string, string>;
  actionPool?: ActionOption[];
  reflectionKeywords: string[];
  consistentEmotions: string[];
  consistentActions?: string[];
  contexts: RelationshipContext[];
}

interface CallResult {
  variant: VariantId;
  testId: string;
  level: ContextLevel;
  runIndex: number;
  emotion: string | null;
  intensity: number | null;
  relationshipDelta: number | null;
  innerThought: string | null;
  actionCode: string | null;
  latencyMs: number;
  promptTokenEstimate: number;
  parseSuccess: boolean;
  rawContent: string;
  /** V3: raw content of call 2 (innerThought generation) */
  rawContentCall2?: string;
  /** V3: total API calls made (2 for two-stage) */
  apiCalls: number;
}

interface LevelMetrics {
  variant: VariantId;
  level: ContextLevel;
  relationshipReflectionRate: number;
  emotionConsistencyRate: number;
  levelDifferentiationRate: number;
  hallucinationRate: number;
  avgLatencyMs: number;
  parseSuccessRate: number;
  avgPromptTokens: number;
  sampleCount: number;
  avgInnerThoughtLen: number;
  /** V3-specific: decision accuracy rate (only for decision tasks) */
  actionConsistencyRate: number;
}

// Emotion label map
const EMOTION_LABEL: Record<string, string> = {
  joy: '喜悦', anger: '愤怒', envy: '嫉妒', admiration: '钦佩',
  sadness: '悲伤', fear: '恐惧', contempt: '轻蔑', neutral: '平静',
  jealousy: '嫉恨', gratitude: '感激', guilt: '愧疚',
  worry: '担忧', shame: '羞耻', pride: '自豪', relief: '释然',
};

// ===== S3: Test Case Data (5 cases × 3 levels) =====

const TEST_CASES: TestCase[] = [
  // T1: 张清风(rival) ↔ 李沐阳, encounter-chat → 预期敌意
  {
    id: 'T1', type: 'dialogue',
    subjectName: '张清风', personality: '内向正直', moralDesc: '偏善守序',
    sectDesc: '崇尚仁德，门规严明', targetName: '李沐阳', targetId: 'li_muyang',
    eventType: 'encounter-chat', eventDescription: '在后山与李沐阳碰面交谈',
    candidateEmotions: ['anger', 'contempt', 'sadness', 'fear', 'neutral'],
    emotionLabels: { anger: '愤怒', contempt: '轻蔑', sadness: '悲伤', fear: '恐惧', neutral: '平静' },
    reflectionKeywords: ['敌', '仇', '恨', '对手', '宿敌', '可恶', '该死', '报复', '冤', '死对头', '不共戴天', '厌恶', '鄙视', '李沐阳'],
    consistentEmotions: ['anger', 'contempt'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: -45, tagLabel: '死对头' },
      { level: 3, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '裁决中被掌门判有过', affinityDelta: -15 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ] },
    ],
  },

  // T2: 王灵均(friend) ↔ 赵铁柱, encounter-chat → 预期友善
  {
    id: 'T2', type: 'dialogue',
    subjectName: '王灵均', personality: '温和善良', moralDesc: '偏善中立',
    sectDesc: '崇尚仁德，门规严明', targetName: '赵铁柱', targetId: 'zhao_tiezhu',
    eventType: 'encounter-chat', eventDescription: '在灵田旁偶遇赵铁柱，闲聊起来',
    candidateEmotions: ['joy', 'gratitude', 'worry', 'neutral', 'admiration'],
    emotionLabels: { joy: '喜悦', gratitude: '感激', worry: '担忧', neutral: '平静', admiration: '钦佩' },
    reflectionKeywords: ['友', '善', '帮', '关心', '牵挂', '情谊', '兄弟', '同袍', '信任', '恩', '赵铁柱', '知己', '好友'],
    consistentEmotions: ['joy', 'gratitude', 'admiration'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: 70, tagLabel: '挚友' },
      { level: 3, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ] },
    ],
  },

  // T3: 李沐阳 vs 张清风, encounter-conflict → 预期引用历史
  {
    id: 'T3', type: 'dialogue',
    subjectName: '李沐阳', personality: '好胜外向', moralDesc: '偏恶混乱',
    sectDesc: '崇尚仁德，门规严明', targetName: '张清风', targetId: 'zhang_qingfeng',
    eventType: 'encounter-conflict', eventDescription: '在后山因资源分配与张清风发生激烈争执',
    candidateEmotions: ['anger', 'contempt', 'envy', 'pride', 'neutral'],
    emotionLabels: { anger: '愤怒', contempt: '轻蔑', envy: '嫉妒', pride: '自豪', neutral: '平静' },
    reflectionKeywords: ['敌', '仇', '恨', '对手', '破境草', '翻脸', '暗算', '可恶', '该死', '报复', '张清风', '不服', '争'],
    consistentEmotions: ['anger', 'contempt', 'envy'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: -60, tagLabel: '死对头' },
      { level: 3, affinity: -60, tagLabel: '死对头',
        keyEvents: [
          { content: '争夺破境草时被张清风抢先', affinityDelta: -25 },
          { content: '宗门比试中败给张清风', affinityDelta: -20 },
          { content: '曾设计暗算张清风被识破', affinityDelta: -15 },
        ] },
    ],
  },

  // T4: 张清风(rival, humiliated) in STORM → 预期攻击/非保护
  {
    id: 'T4', type: 'decision',
    subjectName: '张清风', personality: '内向正直', moralDesc: '偏善守序',
    sectDesc: '崇尚仁德，门规严明', targetName: '李沐阳', targetId: 'li_muyang',
    eventType: 'world-event', eventDescription: '宗门遭妖兽来袭，李沐阳正被三头妖兽围困，命悬一线',
    candidateEmotions: ['anger', 'contempt', 'fear', 'neutral', 'worry'],
    emotionLabels: { anger: '愤怒', contempt: '轻蔑', fear: '恐惧', neutral: '平静', worry: '担忧' },
    reflectionKeywords: ['敌', '仇', '恨', '活该', '不救', '自作自受', '报应', '不管', '不值得', '李沐阳'],
    consistentEmotions: ['contempt', 'neutral'],
    actionPool: [
      { code: 'FIGHT', label: '挺身迎战，击退妖兽' },
      { code: 'PROTECT', label: '舍身保护李沐阳' },
      { code: 'FLEE', label: '趁乱逃离现场' },
      { code: 'OBSERVE', label: '远处观望，伺机而动' },
      { code: 'IGNORE', label: '视若无睹，径直走开' },
    ],
    consistentActions: ['OBSERVE', 'IGNORE', 'FLEE'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: -45, tagLabel: '死对头' },
      { level: 3, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '曾被李沐阳当众羞辱', affinityDelta: -30 },
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ] },
    ],
  },

  // T5: 王灵均(friend, mutual help) in STORM → 预期保护
  {
    id: 'T5', type: 'decision',
    subjectName: '王灵均', personality: '温和善良', moralDesc: '偏善中立',
    sectDesc: '崇尚仁德，门规严明', targetName: '赵铁柱', targetId: 'zhao_tiezhu',
    eventType: 'world-event', eventDescription: '宗门遭妖兽来袭，赵铁柱被三头妖兽围困，命悬一线',
    candidateEmotions: ['worry', 'fear', 'anger', 'sadness', 'neutral'],
    emotionLabels: { worry: '担忧', fear: '恐惧', anger: '愤怒', sadness: '悲伤', neutral: '平静' },
    reflectionKeywords: ['友', '救', '保护', '帮', '赵铁柱', '不能', '必须', '牵挂', '兄弟', '同袍', '情谊'],
    consistentEmotions: ['worry', 'fear', 'anger'],
    actionPool: [
      { code: 'FIGHT', label: '挺身迎战，击退妖兽' },
      { code: 'PROTECT', label: '舍身保护赵铁柱' },
      { code: 'FLEE', label: '趁乱逃离现场' },
      { code: 'OBSERVE', label: '远处观望，伺机而动' },
      { code: 'IGNORE', label: '视若无睹，径直走开' },
    ],
    consistentActions: ['FIGHT', 'PROTECT'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: 70, tagLabel: '挚友' },
      { level: 3, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ] },
    ],
  },
];

// ===== S4: Prompt Builder — V2 (A-class optimizations) =====

/** Estimate token count for Chinese + English mixed text */
function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    if (char.charCodeAt(0) > 0x2E80) {
      count += 1.5;
    } else {
      count += 0.25;
    }
  }
  return Math.round(count);
}

/**
 * O7: Build relationship context block with structured indentation
 * O3: Include explicit targetId constraint
 */
function buildRelationshipBlockV2(ctx: RelationshipContext, targetName: string, targetId: string): string {
  if (ctx.level === 0) return '';

  const lines: string[] = [];

  // L1+: affinity + tag (structured)
  if (ctx.affinity !== undefined && ctx.tagLabel) {
    lines.push(`【与${targetName}的关系】`);
    lines.push(`  好感：${ctx.affinity}（${ctx.tagLabel}）`);
  }

  // L3: key events (structured, indented)
  if (ctx.keyEvents && ctx.keyEvents.length > 0) {
    lines.push('  关键经历：');
    for (const e of ctx.keyEvents) {
      const sign = e.affinityDelta > 0 ? '+' : '';
      lines.push(`    · ${e.content}（${sign}${e.affinityDelta}）`);
    }
  }

  // O3: Explicit targetId constraint
  lines.push(`  （relationshipDeltas.targetId 必须填「${targetId}」）`);

  return lines.join('\n');
}

/**
 * V2 Prompt: Single call with all A-class optimizations
 *
 * O4: innerThought "一句话，15-25字"
 * O5: Decision guidance for behavior tasks
 * O7: Structured relationship block
 */
function buildPromptV2(tc: TestCase, ctx: RelationshipContext): string {
  let identity = `你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`;
  identity += `道德${tc.moralDesc}。`;
  identity += `你所在的宗门：${tc.sectDesc}。`;

  const relBlock = buildRelationshipBlockV2(ctx, tc.targetName, tc.targetId);

  const eventLine = `【事件】${tc.eventDescription}`;

  const candidateList = tc.candidateEmotions
    .map(e => `${e}(${tc.emotionLabels[e] ?? e})`)
    .join('、');

  const parts = [identity];
  if (relBlock) parts.push(relBlock);
  parts.push(eventLine);
  parts.push('');
  parts.push(`【候选情绪】（从中选一种）：${candidateList}`);

  // O5: Decision guidance
  if (tc.type === 'decision' && tc.actionPool) {
    const actionListDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(' / ');
    parts.push('');
    parts.push(`【候选行动】（从中选一种）：${actionListDesc}`);

    // Decision guidance based on relationship
    if (ctx.level > 0 && ctx.affinity !== undefined && ctx.tagLabel) {
      parts.push('');
      parts.push(`提示：结合你的性格（${tc.personality}）和与${tc.targetName}的关系（${ctx.tagLabel}，好感${ctx.affinity}）选择行动。`);
    }
  }

  // O4: Tighter innerThought instruction
  parts.push('');
  parts.push('只输出JSON。innerThought写一句话内心独白（15-25字，第一人称，仙侠风格）。');

  return parts.join('\n');
}

/**
 * V3 Prompt — Call 1: Decision/Emotion only (极简)
 * No innerThought, no relationshipDeltas — pure logic
 */
function buildPromptV3Call1(tc: TestCase, ctx: RelationshipContext): string {
  let identity = `你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`;
  identity += `道德${tc.moralDesc}。`;
  identity += `你所在的宗门：${tc.sectDesc}。`;

  const relBlock = buildRelationshipBlockV2(ctx, tc.targetName, tc.targetId);

  const eventLine = `【事件】${tc.eventDescription}`;

  const candidateList = tc.candidateEmotions
    .map(e => `${e}(${tc.emotionLabels[e] ?? e})`)
    .join('、');

  const parts = [identity];
  if (relBlock) parts.push(relBlock);
  parts.push(eventLine);
  parts.push('');
  parts.push(`【候选情绪】（从中选一种）：${candidateList}`);

  if (tc.type === 'decision' && tc.actionPool) {
    const actionListDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(' / ');
    parts.push(`【候选行动】（从中选一种）：${actionListDesc}`);

    if (ctx.level > 0 && ctx.affinity !== undefined && ctx.tagLabel) {
      parts.push(`提示：结合性格（${tc.personality}）和关系（${ctx.tagLabel}，好感${ctx.affinity}）选择。`);
    }
  }

  parts.push('');
  parts.push('只输出JSON，不要解释。');

  return parts.join('\n');
}

/**
 * V3 Prompt — Call 2: innerThought + relationshipDeltas
 * Based on Call 1 result (emotion, action)
 */
function buildPromptV3Call2(
  tc: TestCase,
  ctx: RelationshipContext,
  emotion: string,
  actionCode: string | null,
): string {
  const relBlock = buildRelationshipBlockV2(ctx, tc.targetName, tc.targetId);

  const parts: string[] = [];
  parts.push(`你是「${tc.subjectName}」，性格${tc.personality}。`);
  if (relBlock) parts.push(relBlock);
  parts.push(`【事件】${tc.eventDescription}`);
  parts.push(`【你的情绪】${emotion}（${EMOTION_LABEL[emotion] ?? emotion}）`);
  if (actionCode) {
    const actionLabel = tc.actionPool?.find(a => a.code === actionCode)?.label ?? actionCode;
    parts.push(`【你的行动】${actionCode}（${actionLabel}）`);
  }
  parts.push('');
  parts.push(`根据以上情绪${actionCode ? '和行动' : ''}，写一句内心独白（15-25字，第一人称，仙侠风格）。`);
  parts.push(`同时评估与${tc.targetName}的关系变化。只输出JSON。`);

  return parts.join('\n');
}

// ===== S5: JSON Schema — V2 optimized =====

/**
 * V2 Schema: O1 (maxItems:1) + O2 (innerThought before relationshipDeltas)
 */
function buildSchemaV2(tc: TestCase): object {
  const emotionEnum = ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
    'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
    'worry', 'shame', 'pride', 'relief'];

  const props: Record<string, object> = {
    emotion: {
      type: 'string',
      enum: emotionEnum,
      description: '从候选情绪中选一种',
    },
    intensity: {
      type: 'integer',
      enum: [1, 2, 3],
      description: '1=轻微，2=明显，3=强烈',
    },
    // O2: innerThought BEFORE relationshipDeltas
    innerThought: {
      type: 'string',
      maxLength: 60,
      description: '内心独白（15-25字，第一人称）',
    },
    // O1: maxItems: 1
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
      description: '关系变化（最多1条）',
    },
  };

  const required = ['emotion', 'intensity', 'innerThought', 'relationshipDeltas'];

  if (tc.type === 'decision' && tc.actionPool) {
    props.actionCode = {
      type: 'string',
      enum: tc.actionPool.map(a => a.code),
      description: '从候选行动中选一种',
    };
    required.push('actionCode');
  }

  return { type: 'object', properties: props, required };
}

/**
 * V3 Schema — Call 1: Emotion + optional action (极简)
 */
function buildSchemaV3Call1(tc: TestCase): object {
  const emotionEnum = ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
    'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
    'worry', 'shame', 'pride', 'relief'];

  const props: Record<string, object> = {
    emotion: { type: 'string', enum: emotionEnum },
    intensity: { type: 'integer', enum: [1, 2, 3] },
  };
  const required = ['emotion', 'intensity'];

  if (tc.type === 'decision' && tc.actionPool) {
    props.actionCode = {
      type: 'string',
      enum: tc.actionPool.map(a => a.code),
    };
    required.push('actionCode');
  }

  return { type: 'object', properties: props, required };
}

/**
 * V3 Schema — Call 2: innerThought + relationshipDeltas
 */
function buildSchemaV3Call2(targetId: string): object {
  return {
    type: 'object',
    properties: {
      innerThought: {
        type: 'string',
        maxLength: 60,
        description: '内心独白（15-25字，第一人称，仙侠风格）',
      },
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

// ===== S6: API Caller =====

const BASE_URL = 'http://localhost:3001';
const CALL_TIMEOUT_MS = 15000;

/** O6: Optimized system message — "只输出JSON" */
const SYSTEM_V2 = '你是修仙宗门弟子的灵魂引擎。根据事件和性格产出情绪评估。角色的性格和道德立场决定反应——邪恶角色做邪恶的事，善良角色做善良的事。只输出JSON，不要解释。';

/** V3 Call 2: Literary style system message */
const SYSTEM_V3_CALL2 = '你是修仙世界的内心独白生成器。根据角色性格、情绪和关系，用仙侠风格写一句简短独白。只输出JSON。';

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = await res.json() as { status: string; modelReady: boolean };
    return data.status === 'ok' && data.modelReady;
  } catch {
    return false;
  }
}

async function callInfer(
  systemMsg: string,
  userMsg: string,
  schema: object,
  schemaName: string,
): Promise<{ content: string; parsed: Record<string, unknown> | null; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const payload = {
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
    };

    const res = await fetch(`${BASE_URL}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { content: `HTTP_${res.status}`, parsed: null, latencyMs };
    }

    const data = await res.json() as { content: string; parsed?: Record<string, unknown> | null };
    const parsed = (data.parsed !== undefined && data.parsed !== null)
      ? data.parsed
      : (() => { try { return JSON.parse(data.content) as Record<string, unknown>; } catch { return null; } })();

    return { content: data.content ?? '', parsed, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errMsg = err instanceof Error ? err.name : 'UnknownError';
    return { content: errMsg, parsed: null, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

// ===== S7: Experiment Runner =====

/** Run V2: single optimized call */
async function runV2(tc: TestCase, ctx: RelationshipContext, runIdx: number): Promise<CallResult> {
  const prompt = buildPromptV2(tc, ctx);
  const schema = buildSchemaV2(tc);
  const tokenEst = estimateTokens(SYSTEM_V2 + prompt);

  const { content, parsed, latencyMs } = await callInfer(SYSTEM_V2, prompt, schema, 'soul_eval_v2');

  let emotion: string | null = null;
  let intensity: number | null = null;
  let innerThought: string | null = null;
  let relationshipDelta: number | null = null;
  let actionCode: string | null = null;
  let parseSuccess = false;

  if (parsed) {
    emotion = (parsed.emotion as string) ?? null;
    intensity = (parsed.intensity as number) ?? null;
    innerThought = (parsed.innerThought as string) ?? null;
    actionCode = (parsed.actionCode as string) ?? null;
    const deltas = parsed.relationshipDeltas as Array<{ delta: number }> | undefined;
    if (deltas && deltas.length > 0) {
      relationshipDelta = deltas[0].delta;
    }
    parseSuccess = emotion !== null && innerThought !== null;
  }

  return {
    variant: 'V2', testId: tc.id, level: ctx.level, runIndex: runIdx,
    emotion, intensity, relationshipDelta, innerThought, actionCode,
    latencyMs, promptTokenEstimate: tokenEst, parseSuccess,
    rawContent: content, apiCalls: 1,
  };
}

/** Run V3: two-stage separated calls */
async function runV3(tc: TestCase, ctx: RelationshipContext, runIdx: number): Promise<CallResult> {
  // --- Call 1: Emotion + Action ---
  const prompt1 = buildPromptV3Call1(tc, ctx);
  const schema1 = buildSchemaV3Call1(tc);
  const tokenEst = estimateTokens(SYSTEM_V2 + prompt1);

  const r1 = await callInfer(SYSTEM_V2, prompt1, schema1, 'soul_decide_v3');

  let emotion: string | null = null;
  let intensity: number | null = null;
  let actionCode: string | null = null;

  if (r1.parsed) {
    emotion = (r1.parsed.emotion as string) ?? null;
    intensity = (r1.parsed.intensity as number) ?? null;
    actionCode = (r1.parsed.actionCode as string) ?? null;
  }

  // If Call 1 failed, return early
  if (!emotion) {
    return {
      variant: 'V3', testId: tc.id, level: ctx.level, runIndex: runIdx,
      emotion: null, intensity: null, relationshipDelta: null,
      innerThought: null, actionCode: null,
      latencyMs: r1.latencyMs, promptTokenEstimate: tokenEst,
      parseSuccess: false, rawContent: r1.content, apiCalls: 1,
    };
  }

  // --- Call 2: innerThought + relationshipDeltas ---
  const prompt2 = buildPromptV3Call2(tc, ctx, emotion, actionCode);
  const schema2 = buildSchemaV3Call2(tc.targetId);

  const r2 = await callInfer(SYSTEM_V3_CALL2, prompt2, schema2, 'soul_thought_v3');

  let innerThought: string | null = null;
  let relationshipDelta: number | null = null;

  if (r2.parsed) {
    innerThought = (r2.parsed.innerThought as string) ?? null;
    const deltas = r2.parsed.relationshipDeltas as Array<{ delta: number }> | undefined;
    if (deltas && deltas.length > 0) {
      relationshipDelta = deltas[0].delta;
    }
  }

  const totalLatency = r1.latencyMs + r2.latencyMs;
  const parseSuccess = emotion !== null && innerThought !== null;

  return {
    variant: 'V3', testId: tc.id, level: ctx.level, runIndex: runIdx,
    emotion, intensity, relationshipDelta, innerThought, actionCode,
    latencyMs: totalLatency, promptTokenEstimate: tokenEst,
    parseSuccess, rawContent: r1.content,
    rawContentCall2: r2.content, apiCalls: 2,
  };
}

// ===== S8: Metrics Calculator =====

function calculateMetrics(results: CallResult[], variant: VariantId): LevelMetrics[] {
  const tcMap = new Map(TEST_CASES.map(tc => [tc.id, tc]));

  // L0 baselines per variant
  const l0Emotions = new Map<string, Set<string>>();
  const l0Actions = new Map<string, Set<string>>();
  for (const r of results) {
    if (r.variant === variant && r.level === 0 && r.parseSuccess) {
      if (r.emotion) {
        if (!l0Emotions.has(r.testId)) l0Emotions.set(r.testId, new Set());
        l0Emotions.get(r.testId)!.add(r.emotion);
      }
      if (r.actionCode) {
        if (!l0Actions.has(r.testId)) l0Actions.set(r.testId, new Set());
        l0Actions.get(r.testId)!.add(r.actionCode);
      }
    }
  }

  return TEST_LEVELS.map(level => {
    const vResults = results.filter(r => r.variant === variant && r.level === level);
    const parsed = vResults.filter(r => r.parseSuccess);
    const n = parsed.length;

    if (n === 0) {
      return {
        variant, level,
        relationshipReflectionRate: 0, emotionConsistencyRate: 0,
        levelDifferentiationRate: 0, hallucinationRate: 0,
        avgLatencyMs: 0, parseSuccessRate: 0, avgPromptTokens: 0,
        sampleCount: 0, avgInnerThoughtLen: 0, actionConsistencyRate: 0,
      };
    }

    // Relationship Reflection Rate
    let reflectionHits = 0;
    for (const r of parsed) {
      const tc = tcMap.get(r.testId);
      if (tc && r.innerThought) {
        if (tc.reflectionKeywords.some(kw => r.innerThought!.includes(kw))) reflectionHits++;
      }
    }

    // Emotion Consistency Rate
    let emotionHits = 0;
    for (const r of parsed) {
      const tc = tcMap.get(r.testId);
      if (tc && r.emotion && tc.consistentEmotions.includes(r.emotion)) emotionHits++;
    }

    // Level Differentiation Rate
    let diffHits = 0;
    if (level > 0) {
      for (const r of parsed) {
        const baseE = l0Emotions.get(r.testId);
        const baseA = l0Actions.get(r.testId);
        let isDiff = false;
        if (r.emotion && baseE && !baseE.has(r.emotion)) isDiff = true;
        if (r.actionCode && baseA && !baseA.has(r.actionCode)) isDiff = true;
        if (isDiff) diffHits++;
      }
    }

    // Hallucination Rate
    let hallucinationHits = 0;
    for (const r of parsed) {
      const tc = tcMap.get(r.testId);
      if (tc && r.innerThought) {
        const allKnownNames = new Set([
          tc.subjectName, tc.targetName,
          '王灵均', '赵铁柱', '李沐阳', '张清风', '苏瑶',
          '掌门', '长老',
        ]);
        const namePattern = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
        let match;
        let hasHallucination = false;
        while ((match = namePattern.exec(r.innerThought)) !== null) {
          const candidate = match[1];
          if (!allKnownNames.has(candidate)) {
            hasHallucination = true;
            break;
          }
        }
        if (hasHallucination) hallucinationHits++;
      }
    }

    // Action Consistency Rate (decision tasks only)
    let actionHits = 0;
    let actionTotal = 0;
    for (const r of parsed) {
      const tc = tcMap.get(r.testId);
      if (tc && tc.type === 'decision' && tc.consistentActions && r.actionCode) {
        actionTotal++;
        if (tc.consistentActions.includes(r.actionCode)) actionHits++;
      }
    }

    // Average innerThought length
    const thoughtLens = parsed
      .filter(r => r.innerThought)
      .map(r => r.innerThought!.length);
    const avgThoughtLen = thoughtLens.length > 0
      ? Math.round(thoughtLens.reduce((a, b) => a + b, 0) / thoughtLens.length)
      : 0;

    return {
      variant, level,
      relationshipReflectionRate: reflectionHits / n,
      emotionConsistencyRate: emotionHits / n,
      levelDifferentiationRate: level === 0 ? 0 : diffHits / n,
      hallucinationRate: hallucinationHits / n,
      avgLatencyMs: Math.round(parsed.reduce((s, r) => s + r.latencyMs, 0) / n),
      parseSuccessRate: vResults.length > 0 ? n / vResults.length : 0,
      avgPromptTokens: Math.round(parsed.reduce((s, r) => s + r.promptTokenEstimate, 0) / n),
      sampleCount: n,
      avgInnerThoughtLen: avgThoughtLen,
      actionConsistencyRate: actionTotal > 0 ? actionHits / actionTotal : -1,
    };
  });
}

// ===== S9: Load V1 baseline from existing metrics =====

interface V1LevelData {
  level: number;
  relationshipReflectionRate: number;
  emotionConsistencyRate: number;
  levelDifferentiationRate: number;
  hallucinationRate: number;
  avgLatencyMs: number;
  parseSuccessRate: number;
  avgPromptTokens: number;
  sampleCount: number;
}

function loadV1Metrics(): V1LevelData[] {
  const logsDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  const files = readdirSync(logsDir).filter(f => f.startsWith('poc-ij-metrics-'));
  if (files.length === 0) {
    log('WARN', '未找到 V1 metrics 文件，跳过 V1 对比');
    return [];
  }
  // Use the latest metrics file
  const latest = files.sort().pop()!;
  const raw = readFileSync(join(logsDir, latest), 'utf8');
  const data = JSON.parse(raw) as V1LevelData[];
  // Filter to only L0/L1/L3
  return data.filter(d => [0, 1, 3].includes(d.level));
}

// ===== S10: Report Generator =====

function generateReport(
  allResults: CallResult[],
  v1Data: V1LevelData[],
  startTime: number,
  endTime: number,
): string {
  const v2Metrics = calculateMetrics(allResults, 'V2');
  const v3Metrics = calculateMetrics(allResults, 'V3');

  const totalCalls = allResults.length;
  const totalApi = allResults.reduce((s, r) => s + r.apiCalls, 0);
  const successCount = allResults.filter(r => r.parseSuccess).length;
  const durationMin = ((endTime - startTime) / 60000).toFixed(1);

  // V1 metrics lookup
  const v1Map = new Map(v1Data.map(d => [d.level, d]));

  // Comparison table for each level
  function makeRow(level: number, metric: string, v1Val: string, v2Val: string, v3Val: string): string {
    return `| L${level} | ${metric} | ${v1Val} | ${v2Val} | ${v3Val} |`;
  }

  const comparisonRows: string[] = [];
  for (const level of TEST_LEVELS) {
    const v1 = v1Map.get(level);
    const v2 = v2Metrics.find(m => m.level === level);
    const v3 = v3Metrics.find(m => m.level === level);

    const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
    const v1Ec = v1 ? pct(v1.emotionConsistencyRate) : '—';
    const v1Rr = v1 ? pct(v1.relationshipReflectionRate) : '—';
    const v1Ps = v1 ? pct(v1.parseSuccessRate) : '—';
    const v1Hl = v1 ? pct(v1.hallucinationRate) : '—';
    const v1Lt = v1 ? `${v1.avgLatencyMs}ms` : '—';

    comparisonRows.push(makeRow(level, '情绪一致率', v1Ec, v2 ? pct(v2.emotionConsistencyRate) : '—', v3 ? pct(v3.emotionConsistencyRate) : '—'));
    comparisonRows.push(makeRow(level, '关系反映率', v1Rr, v2 ? pct(v2.relationshipReflectionRate) : '—', v3 ? pct(v3.relationshipReflectionRate) : '—'));
    comparisonRows.push(makeRow(level, '解析成功率', v1Ps, v2 ? pct(v2.parseSuccessRate) : '—', v3 ? pct(v3.parseSuccessRate) : '—'));
    comparisonRows.push(makeRow(level, '幻觉率', v1Hl, v2 ? pct(v2.hallucinationRate) : '—', v3 ? pct(v3.hallucinationRate) : '—'));
    comparisonRows.push(makeRow(level, '平均延迟', v1Lt, v2 ? `${v2.avgLatencyMs}ms` : '—', v3 ? `${v3.avgLatencyMs}ms` : '—'));
    comparisonRows.push(makeRow(level, '独白均长', '—', v2 ? `${v2.avgInnerThoughtLen}字` : '—', v3 ? `${v3.avgInnerThoughtLen}字` : '—'));
    if (level > 0) {
      const v1Dd = v1 ? pct(v1.levelDifferentiationRate) : '—';
      comparisonRows.push(makeRow(level, '层级差异率', v1Dd, v2 ? pct(v2.levelDifferentiationRate) : '—', v3 ? pct(v3.levelDifferentiationRate) : '—'));
    }
    comparisonRows.push('| | | | | |');
  }

  // Action consistency for decision tasks
  const v2ActionRows: string[] = [];
  const v3ActionRows: string[] = [];
  for (const level of TEST_LEVELS) {
    const v2 = v2Metrics.find(m => m.level === level);
    const v3 = v3Metrics.find(m => m.level === level);
    if (v2 && v2.actionConsistencyRate >= 0) {
      v2ActionRows.push(`| L${level} | ${(v2.actionConsistencyRate * 100).toFixed(0)}% |`);
    }
    if (v3 && v3.actionConsistencyRate >= 0) {
      v3ActionRows.push(`| L${level} | ${(v3.actionConsistencyRate * 100).toFixed(0)}% |`);
    }
  }

  // Per-test detail sections
  const testDetails: string[] = [];
  for (const tc of TEST_CASES) {
    const lines: string[] = [`### ${tc.id}: ${tc.subjectName} ↔ ${tc.targetName}（${tc.type}）`, ''];
    for (const level of TEST_LEVELS) {
      lines.push(`**L${level}**：`);
      for (const variant of ALL_VARIANTS) {
        const vr = allResults.filter(r => r.variant === variant && r.testId === tc.id && r.level === level && r.parseSuccess);
        if (vr.length === 0) {
          lines.push(`  ${variant}: 无有效数据`);
          continue;
        }
        const emotions = vr.map(r => r.emotion ?? '?').join(', ');
        const actions = tc.type === 'decision' ? ` | 行动=[${vr.map(r => r.actionCode ?? '?').join(', ')}]` : '';
        const thoughts = vr.map(r => `"${(r.innerThought ?? '').slice(0, 30)}"`).join(' / ');
        lines.push(`  ${variant}: 情绪=[${emotions}]${actions}`);
        lines.push(`    独白: ${thoughts}`);
      }
      lines.push('');
    }
    testDetails.push(lines.join('\n'));
  }

  return `# Phase IJ-PoC v2 — Prompt 优化对比报告

> **生成时间**：${new Date(endTime).toISOString()}
> **模型**：Qwen3.5-0.8B GGUF Q4_K_M
> **实验调用**：${totalCalls} 次逻辑调用（${totalApi} 次 API 调用）
> **成功率**：${successCount}/${totalCalls}（${((successCount / totalCalls) * 100).toFixed(0)}%）
> **耗时**：${durationMin} 分钟

---

## 优化项

### A 类（V2 + V3 共用）
| # | 优化 | 改动 |
|---|------|------|
| O1 | relationshipDeltas maxItems: 1 | Schema |
| O2 | innerThought 排在 relationshipDeltas 之前 | Schema |
| O3 | Prompt 明确指定合法 targetId | Prompt |
| O4 | innerThought "一句话，15-25字，仙侠风格" | Prompt |
| O5 | Decision 任务加决策引导语 | Prompt |
| O6 | System Message 加 "只输出JSON，不要解释" | System |
| O7 | 关系上下文缩进层级结构 | Prompt |

### B 类（仅 V3）
| # | 优化 | 改动 |
|---|------|------|
| O8 | 两阶段分离：Call 1 决策/情绪，Call 2 独白/关系变化 | Pipeline |

---

## 核心对比：V1 vs V2 vs V3

| Level | 指标 | V1（对照） | V2（A类优化） | V3（A+B两阶段） |
|:-----:|:----:|:--------:|:----------:|:------------:|
${comparisonRows.join('\n')}

---

## 行为决策一致率（仅 T4/T5）

**V2**：
| Level | 行动一致率 |
|:-----:|:--------:|
${v2ActionRows.join('\n')}

**V3**：
| Level | 行动一致率 |
|:-----:|:--------:|
${v3ActionRows.join('\n')}

---

## 每用例明细

${testDetails.join('\n\n')}

---

## 结论

> 由实验数据自动生成，需人工审阅确认。

### 解析成功率对比
${(() => {
    const v2L3 = v2Metrics.find(m => m.level === 3);
    const v3L3 = v3Metrics.find(m => m.level === 3);
    const v1L3 = v1Map.get(3);
    return `- V1 L3: ${v1L3 ? (v1L3.parseSuccessRate * 100).toFixed(0) : '?'}%\n- V2 L3: ${v2L3 ? (v2L3.parseSuccessRate * 100).toFixed(0) : '?'}%\n- V3 L3: ${v3L3 ? (v3L3.parseSuccessRate * 100).toFixed(0) : '?'}%`;
  })()}

### 情绪一致率对比
${(() => {
    const v2L3 = v2Metrics.find(m => m.level === 3);
    const v3L3 = v3Metrics.find(m => m.level === 3);
    const v1L3 = v1Map.get(3);
    return `- V1 L3: ${v1L3 ? (v1L3.emotionConsistencyRate * 100).toFixed(0) : '?'}%\n- V2 L3: ${v2L3 ? (v2L3.emotionConsistencyRate * 100).toFixed(0) : '?'}%\n- V3 L3: ${v3L3 ? (v3L3.emotionConsistencyRate * 100).toFixed(0) : '?'}%`;
  })()}

### 独白质量
${(() => {
    const v2L3 = v2Metrics.find(m => m.level === 3);
    const v3L3 = v3Metrics.find(m => m.level === 3);
    return `- V2 L3 均长: ${v2L3?.avgInnerThoughtLen ?? '?'}字\n- V3 L3 均长: ${v3L3?.avgInnerThoughtLen ?? '?'}字\n- 目标: 15-25字`;
  })()}

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| ${new Date().toISOString().slice(0, 10)} | v1.0 | 自动生成（${totalApi} 次 API 调用） |
`;
}

// ===== S11: Main =====

async function main(): Promise<void> {
  const startTime = Date.now();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Parse --runs=N
  const runsArg = process.argv.find(a => a.startsWith('--runs='));
  const RUNS = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5;

  log('INFO', `=== Phase IJ-PoC v2: Prompt 优化对比实验 ===`);
  log('INFO', `配置：${RUNS} 轮 × 3 levels × 5 cases × 2 variants`);
  log('INFO', `预计：V2 ${3 * 5 * RUNS} + V3 ${3 * 5 * RUNS}(×2) = ${3 * 5 * RUNS * 3} 次 API 调用`);

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    log('ERROR', 'AI 服务不可用，请先运行 npm run ai');
    process.exit(1);
  }
  log('INFO', 'AI 服务健康检查通过');

  // Load V1 baseline
  const v1Data = loadV1Metrics();
  if (v1Data.length > 0) {
    log('INFO', `已加载 V1 基线数据：${v1Data.length} 个 level`);
  }

  const allResults: CallResult[] = [];
  let callCount = 0;
  const totalLogical = 2 * 3 * 5 * RUNS; // V2 + V3

  // Run experiments
  for (const variant of ALL_VARIANTS) {
    log('INFO', `--- 开始 ${variant} 实验 ---`);

    for (const tc of TEST_CASES) {
      for (const ctx of tc.contexts) {
        for (let run = 0; run < RUNS; run++) {
          callCount++;
          const progress = `[${callCount}/${totalLogical}]`;

          log('INFO', `${progress} ${variant} ${tc.id} L${ctx.level} R${run + 1}`, {
            variant, testId: tc.id, level: ctx.level, run: run + 1,
          });

          let result: CallResult;
          if (variant === 'V2') {
            result = await runV2(tc, ctx, run);
          } else {
            result = await runV3(tc, ctx, run);
          }

          allResults.push(result);

          const status = result.parseSuccess ? '✅' : '❌';
          log('INFO', `${progress} ${status} emotion=${result.emotion} action=${result.actionCode ?? '-'} thought="${(result.innerThought ?? '').slice(0, 20)}..." ${result.latencyMs}ms (${result.apiCalls} calls)`);
        }
      }
    }
  }

  const endTime = Date.now();

  // Save results
  const outDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  ensureDir(outDir);

  // Raw results
  const rawPath = join(outDir, `poc-ij-v2-raw-${ts}.json`);
  writeFileSync(rawPath, JSON.stringify(allResults, null, 2), 'utf8');
  log('INFO', `原始数据已保存: ${rawPath}`);

  // Metrics
  const v2Metrics = calculateMetrics(allResults, 'V2');
  const v3Metrics = calculateMetrics(allResults, 'V3');
  const metricsPath = join(outDir, `poc-ij-v2-metrics-${ts}.json`);
  writeFileSync(metricsPath, JSON.stringify({ v2: v2Metrics, v3: v3Metrics, v1: v1Data }, null, 2), 'utf8');
  log('INFO', `指标数据已保存: ${metricsPath}`);

  // Report
  const report = generateReport(allResults, v1Data, startTime, endTime);
  const reportDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc');
  const reportPath = join(reportDir, 'review-v2.md');
  writeFileSync(reportPath, report, 'utf8');
  log('INFO', `对比报告已保存: ${reportPath}`);

  // Save logs
  const logName = `poc-ij-v2-${ts}`;
  const logDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  ensureDir(logDir);
  const logLines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  writeFileSync(join(logDir, logName + '.txt'), logLines.join('\n\n'), 'utf8');
  writeFileSync(join(logDir, logName + '.json'), JSON.stringify(logBuffer, null, 2), 'utf8');

  // Summary
  const totalApiCalls = allResults.reduce((s, r) => s + r.apiCalls, 0);
  const successRate = allResults.filter(r => r.parseSuccess).length / allResults.length;
  log('INFO', '=== 实验完成 ===');
  log('INFO', `总计 ${allResults.length} 次逻辑调用，${totalApiCalls} 次 API 调用`);
  log('INFO', `总体解析成功率：${(successRate * 100).toFixed(0)}%`);
  log('INFO', `耗时：${((endTime - startTime) / 60000).toFixed(1)} 分钟`);
  log('INFO', `报告: ${reportPath}`);
}

main().catch(err => {
  log('ERROR', `实验失败: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
