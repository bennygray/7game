/**
 * Phase IJ-PoC v4: 混合最优方案验证
 *
 * 策略：取 V1/V2/V3 各自优势
 *   - Schema：V2（maxItems:1 + innerThought 前置）→ 解析率 100%
 *   - Prompt：V1 措辞（情绪一致率 78%）+ O3（targetId 约束）
 *   - Pipeline：Dialogue 单次调用 / Decision 两阶段分离（V3，行为一致率 80%）
 *
 * 实验矩阵：L0~L6 × 5 用例 × 5 轮（甜蜜点搜索）
 *   Dialogue: 3 cases × 7 levels × 5 runs = 105 calls
 *   Decision: 2 cases × 7 levels × 5 runs = 70 logical (140 API calls)
 *   总计：175 逻辑调用，245 API 调用
 *
 * 运行：npx tsx docs/pipeline/phaseIJ-poc/scripts/poc-ij-v4-hybrid.ts [--runs=N]
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====

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

// ===== Types =====

type ContextLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const TEST_LEVELS: ContextLevel[] = [0, 1, 2, 3, 4, 5, 6];
type ScenarioType = 'dialogue' | 'decision';

interface MockKeyEvent { content: string; affinityDelta: number; }

interface RelationshipContext {
  level: ContextLevel;
  affinity?: number;
  tagLabel?: string;
  keyEvents?: MockKeyEvent[];
  personalExperience?: string;
  indirectRelationship?: string;
  extraContext?: string;
}

interface ActionOption { code: string; label: string; }

interface TestCase {
  id: string;
  type: ScenarioType;
  subjectName: string;
  personality: string;
  moralDesc: string;
  sectDesc: string;
  targetName: string;
  targetId: string;
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
  rawContentCall2?: string;
  apiCalls: number;
  pipeline: 'single' | 'two-stage';
}

// Emotion labels
const EMOTION_LABEL: Record<string, string> = {
  joy: '喜悦', anger: '愤怒', envy: '嫉妒', admiration: '钦佩',
  sadness: '悲伤', fear: '恐惧', contempt: '轻蔑', neutral: '平静',
  jealousy: '嫉恨', gratitude: '感激', guilt: '愧疚',
  worry: '担忧', shame: '羞耻', pride: '自豪', relief: '释然',
};

// ===== Test Cases (5 cases × 7 levels L0~L6) =====

const TEST_CASES: TestCase[] = [
  {
    id: 'T1', type: 'dialogue',
    subjectName: '张清风', personality: '内向正直', moralDesc: '偏善守序',
    sectDesc: '崇尚仁德，门规严明', targetName: '李沐阳', targetId: 'li_muyang',
    eventDescription: '在后山与李沐阳碰面交谈',
    candidateEmotions: ['anger', 'contempt', 'sadness', 'fear', 'neutral'],
    emotionLabels: { anger: '愤怒', contempt: '轻蔑', sadness: '悲伤', fear: '恐惧', neutral: '平静' },
    reflectionKeywords: ['敌', '仇', '恨', '对手', '宿敌', '可恶', '该死', '报复', '冤', '死对头', '不共戴天', '厌恶', '鄙视', '李沐阳'],
    consistentEmotions: ['anger', 'contempt'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: -45, tagLabel: '死对头' },
      { level: 2, affinity: -45, tagLabel: '死对头',
        keyEvents: [{ content: '因争夺破境草翻脸', affinityDelta: -20 }] },
      { level: 3, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '裁决中被掌门判有过', affinityDelta: -15 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ] },
      { level: 4, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '裁决中被掌门判有过', affinityDelta: -15 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ],
        personalExperience: '筑基突破成功' },
      { level: 5, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '裁决中被掌门判有过', affinityDelta: -15 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ],
        personalExperience: '筑基突破成功',
        indirectRelationship: '你的好友王灵均也与李沐阳不合（好感：-30）' },
      { level: 6, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '裁决中被掌门判有过', affinityDelta: -15 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ],
        personalExperience: '筑基突破成功',
        indirectRelationship: '你的好友王灵均也与李沐阳不合（好感：-30）',
        extraContext: '李沐阳曾在宗门大会上嘲笑你资质低下。你在最近一次宗门比试中击败过他，他因此更加记恨你。' },
    ],
  },
  {
    id: 'T2', type: 'dialogue',
    subjectName: '王灵均', personality: '温和善良', moralDesc: '偏善中立',
    sectDesc: '崇尚仁德，门规严明', targetName: '赵铁柱', targetId: 'zhao_tiezhu',
    eventDescription: '在灵田旁偶遇赵铁柱，闲聊起来',
    candidateEmotions: ['joy', 'gratitude', 'worry', 'neutral', 'admiration'],
    emotionLabels: { joy: '喜悦', gratitude: '感激', worry: '担忧', neutral: '平静', admiration: '钦佩' },
    reflectionKeywords: ['友', '善', '帮', '关心', '牵挂', '情谊', '兄弟', '同袍', '信任', '恩', '赵铁柱', '知己', '好友'],
    consistentEmotions: ['joy', 'gratitude', 'admiration'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: 70, tagLabel: '挚友' },
      { level: 2, affinity: 70, tagLabel: '挚友',
        keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }] },
      { level: 3, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ] },
      { level: 4, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ],
        personalExperience: '炼气九层圆满，即将突破筑基' },
      { level: 5, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ],
        personalExperience: '炼气九层圆满，即将突破筑基',
        indirectRelationship: '你们共同的好友苏瑶也很信任赵铁柱（好感：+55）' },
      { level: 6, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ],
        personalExperience: '炼气九层圆满，即将突破筑基',
        indirectRelationship: '你们共同的好友苏瑶也很信任赵铁柱（好感：+55）',
        extraContext: '赵铁柱曾在你受伤时日夜守护，你们约定将来一起闯荡外域。他最近修炼进展缓慢，你颇为挂念。' },
    ],
  },
  {
    id: 'T3', type: 'dialogue',
    subjectName: '李沐阳', personality: '好胜外向', moralDesc: '偏恶混乱',
    sectDesc: '崇尚仁德，门规严明', targetName: '张清风', targetId: 'zhang_qingfeng',
    eventDescription: '在后山因资源分配与张清风发生激烈争执',
    candidateEmotions: ['anger', 'contempt', 'envy', 'pride', 'neutral'],
    emotionLabels: { anger: '愤怒', contempt: '轻蔑', envy: '嫉妒', pride: '自豪', neutral: '平静' },
    reflectionKeywords: ['敌', '仇', '恨', '对手', '破境草', '翻脸', '暗算', '可恶', '该死', '报复', '张清风', '不服', '争'],
    consistentEmotions: ['anger', 'contempt', 'envy'],
    contexts: [
      { level: 0 },
      { level: 1, affinity: -60, tagLabel: '死对头' },
      { level: 2, affinity: -60, tagLabel: '死对头',
        keyEvents: [{ content: '争夺破境草时被张清风抢先', affinityDelta: -25 }] },
      { level: 3, affinity: -60, tagLabel: '死对头',
        keyEvents: [
          { content: '争夺破境草时被张清风抢先', affinityDelta: -25 },
          { content: '宗门比试中败给张清风', affinityDelta: -20 },
          { content: '曾设计暗算张清风被识破', affinityDelta: -15 },
        ] },
      { level: 4, affinity: -60, tagLabel: '死对头',
        keyEvents: [
          { content: '争夺破境草时被张清风抢先', affinityDelta: -25 },
          { content: '宗门比试中败给张清风', affinityDelta: -20 },
          { content: '曾设计暗算张清风被识破', affinityDelta: -15 },
        ],
        personalExperience: '炼气九层停滞不前，焦躁不安' },
      { level: 5, affinity: -60, tagLabel: '死对头',
        keyEvents: [
          { content: '争夺破境草时被张清风抢先', affinityDelta: -25 },
          { content: '宗门比试中败给张清风', affinityDelta: -20 },
          { content: '曾设计暗算张清风被识破', affinityDelta: -15 },
        ],
        personalExperience: '炼气九层停滞不前，焦躁不安',
        indirectRelationship: '张清风的好友王灵均也对你抱有敌意（好感：-35）' },
      { level: 6, affinity: -60, tagLabel: '死对头',
        keyEvents: [
          { content: '争夺破境草时被张清风抢先', affinityDelta: -25 },
          { content: '宗门比试中败给张清风', affinityDelta: -20 },
          { content: '曾设计暗算张清风被识破', affinityDelta: -15 },
        ],
        personalExperience: '炼气九层停滞不前，焦躁不安',
        indirectRelationship: '张清风的好友王灵均也对你抱有敌意（好感：-35）',
        extraContext: '张清风近日筑基成功，实力远超于你。他在宗门中声望日盛，掌门对他颇为器重，这让你更加不甘。' },
    ],
  },
  {
    id: 'T4', type: 'decision',
    subjectName: '张清风', personality: '内向正直', moralDesc: '偏善守序',
    sectDesc: '崇尚仁德，门规严明', targetName: '李沐阳', targetId: 'li_muyang',
    eventDescription: '宗门遭妖兽来袭，李沐阳正被三头妖兽围困，命悬一线',
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
      { level: 2, affinity: -45, tagLabel: '死对头',
        keyEvents: [{ content: '曾被李沐阳当众羞辱', affinityDelta: -30 }] },
      { level: 3, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '曾被李沐阳当众羞辱', affinityDelta: -30 },
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ] },
      { level: 4, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '曾被李沐阳当众羞辱', affinityDelta: -30 },
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ],
        personalExperience: '筑基突破成功，实力大增' },
      { level: 5, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '曾被李沐阳当众羞辱', affinityDelta: -30 },
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ],
        personalExperience: '筑基突破成功，实力大增',
        indirectRelationship: '好友王灵均也被李沐阳陷害过（好感：-30）' },
      { level: 6, affinity: -45, tagLabel: '死对头',
        keyEvents: [
          { content: '曾被李沐阳当众羞辱', affinityDelta: -30 },
          { content: '因争夺破境草翻脸', affinityDelta: -20 },
          { content: '在灵兽山被其暗算', affinityDelta: -10 },
        ],
        personalExperience: '筑基突破成功，实力大增',
        indirectRelationship: '好友王灵均也被李沐阳陷害过（好感：-30）',
        extraContext: '李沐阳上次在你闭关时散布你的谣言，还试图拉拢你的弟子。宗门长老对此事心知肚明却未处罚他。' },
    ],
  },
  {
    id: 'T5', type: 'decision',
    subjectName: '王灵均', personality: '温和善良', moralDesc: '偏善中立',
    sectDesc: '崇尚仁德，门规严明', targetName: '赵铁柱', targetId: 'zhao_tiezhu',
    eventDescription: '宗门遭妖兽来袭，赵铁柱被三头妖兽围困，命悬一线',
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
      { level: 2, affinity: 70, tagLabel: '挚友',
        keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }] },
      { level: 3, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ] },
      { level: 4, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ],
        personalExperience: '炼气九层圆满，即将突破筑基' },
      { level: 5, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ],
        personalExperience: '炼气九层圆满，即将突破筑基',
        indirectRelationship: '共同好友苏瑶也很信任赵铁柱（好感：+55）' },
      { level: 6, affinity: 70, tagLabel: '挚友',
        keyEvents: [
          { content: '互相帮助突破炼气瓶颈', affinityDelta: 25 },
          { content: '共同抵御妖兽袭击', affinityDelta: 20 },
          { content: '分享珍贵丹方', affinityDelta: 15 },
        ],
        personalExperience: '炼气九层圆满，即将突破筑基',
        indirectRelationship: '共同好友苏瑶也很信任赵铁柱（好感：+55）',
        extraContext: '赵铁柱曾在你受伤时日夜守护。你们约定将来一起闯荡外域。他最近修炼遇到瓶颈，你一直想找机会帮他。' },
    ],
  },
];

// ===== Prompt Builder — V1 style wording + O3 targetId =====

function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    if (char.charCodeAt(0) > 0x2E80) count += 1.5;
    else count += 0.25;
  }
  return Math.round(count);
}

/** V1-style relationship block (flat format, proven 78% consistency) + O3 targetId hint */
function buildRelationshipBlock(ctx: RelationshipContext, targetName: string, targetId: string): string {
  if (ctx.level === 0) return '';
  const lines: string[] = [];

  if (ctx.affinity !== undefined && ctx.tagLabel) {
    lines.push(`【与${targetName}的关系】好感：${ctx.affinity}（${ctx.tagLabel}）`);
  }
  if (ctx.keyEvents && ctx.keyEvents.length > 0) {
    const evtStr = ctx.keyEvents
      .map(e => `${e.content}(${e.affinityDelta > 0 ? '+' : ''}${e.affinityDelta})`)
      .join('；');
    lines.push(`关键经历：${evtStr}`);
  }
  if (ctx.personalExperience) {
    lines.push(`近况：${ctx.personalExperience}`);
  }
  if (ctx.indirectRelationship) {
    lines.push(`旁人关系：${ctx.indirectRelationship}`);
  }
  if (ctx.extraContext) {
    lines.push(`补充：${ctx.extraContext}`);
  }
  // O3: targetId hint (only addition to V1 prompt)
  lines.push(`（注意：relationshipDeltas.targetId 请填「${targetId}」）`);

  return lines.join('\n');
}

/** V1-style prompt for dialogue (single call) */
function buildDialoguePrompt(tc: TestCase, ctx: RelationshipContext): string {
  let identity = `你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`;
  identity += `道德${tc.moralDesc}。`;
  identity += `你所在的宗门：${tc.sectDesc}。`;

  const relBlock = buildRelationshipBlock(ctx, tc.targetName, tc.targetId);
  const candidateList = tc.candidateEmotions
    .map(e => `${e}(${tc.emotionLabels[e] ?? e})`)
    .join('、');

  const parts = [identity];
  if (relBlock) parts.push(relBlock);
  parts.push(`刚才发生了：${tc.eventDescription}`);
  parts.push('');
  parts.push('你此刻内心的情绪是什么？关系如何变化？');
  parts.push('');
  parts.push(`【候选情绪】（必须从以下情绪中选择一种）：${candidateList}`);
  parts.push('');
  parts.push('请用JSON格式输出你的内心反应。innerThought写你此刻的内心独白（20-30字，第一人称）。');

  return parts.join('\n');
}

/** V1-style prompt for decision Call 1 (emotion + action only) */
function buildDecisionCall1Prompt(tc: TestCase, ctx: RelationshipContext): string {
  let identity = `你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`;
  identity += `道德${tc.moralDesc}。`;
  identity += `你所在的宗门：${tc.sectDesc}。`;

  const relBlock = buildRelationshipBlock(ctx, tc.targetName, tc.targetId);
  const candidateList = tc.candidateEmotions
    .map(e => `${e}(${tc.emotionLabels[e] ?? e})`)
    .join('、');
  const actionListDesc = tc.actionPool!.map(a => `${a.code}(${a.label})`).join(' / ');

  const parts = [identity];
  if (relBlock) parts.push(relBlock);
  parts.push(`刚才发生了：${tc.eventDescription}`);
  parts.push('');
  parts.push('你此刻内心的情绪是什么？你会怎么做？');
  parts.push('');
  parts.push(`【候选情绪】（必须从以下情绪中选择一种）：${candidateList}`);
  parts.push(`【候选行动】（必须从以下行动中选择一种）：${actionListDesc}`);
  parts.push('');
  parts.push('只需选择情绪和行动，用JSON输出。');

  return parts.join('\n');
}

/** Decision Call 2: innerThought + relationshipDeltas, grounded in Call 1 result */
function buildDecisionCall2Prompt(
  tc: TestCase, ctx: RelationshipContext,
  emotion: string, actionCode: string,
): string {
  const relBlock = buildRelationshipBlock(ctx, tc.targetName, tc.targetId);
  const actionLabel = tc.actionPool?.find(a => a.code === actionCode)?.label ?? actionCode;

  const parts: string[] = [];
  parts.push(`你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`);
  if (relBlock) parts.push(relBlock);
  parts.push(`刚才发生了：${tc.eventDescription}`);
  parts.push(`你的情绪是${emotion}（${EMOTION_LABEL[emotion] ?? emotion}），你选择了${actionCode}（${actionLabel}）。`);
  parts.push('');
  parts.push('请用JSON输出你此刻的内心独白（20-30字，第一人称）和关系变化。');

  return parts.join('\n');
}

// ===== Schema — V2 optimized (maxItems:1, innerThought first) =====

const EMOTION_ENUM = ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
  'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
  'worry', 'shame', 'pride', 'relief'];

/** Dialogue: full schema (emotion + intensity + innerThought + deltas) */
function buildDialogueSchema(): object {
  return {
    type: 'object',
    properties: {
      emotion: { type: 'string', enum: EMOTION_ENUM },
      intensity: { type: 'integer', enum: [1, 2, 3] },
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
    required: ['emotion', 'intensity', 'innerThought', 'relationshipDeltas'],
  };
}

/** Decision Call 1: emotion + action only (极简) */
function buildDecisionCall1Schema(actionCodes: string[]): object {
  return {
    type: 'object',
    properties: {
      emotion: { type: 'string', enum: EMOTION_ENUM },
      intensity: { type: 'integer', enum: [1, 2, 3] },
      actionCode: { type: 'string', enum: actionCodes },
    },
    required: ['emotion', 'intensity', 'actionCode'],
  };
}

/** Decision Call 2: innerThought + deltas */
function buildDecisionCall2Schema(): object {
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

// ===== API =====

const BASE_URL = 'http://localhost:3001';
const CALL_TIMEOUT_MS = 15000;

/** V1 system message (proven, NOT adding "只输出JSON") */
const SYSTEM_MSG = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。';

/** Call 2 system message — literary style */
const SYSTEM_CALL2 = '你是修仙世界弟子的内心独白生成器。根据角色的性格、情绪和行为，写一段简短内心独白。严格按JSON格式输出。';

async function checkHealth(): Promise<{ ok: boolean; model: string; modelFile: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, model: 'unknown', modelFile: 'unknown' };
    const data = await res.json() as { status: string; modelReady: boolean; model?: string; modelFile?: string };
    return {
      ok: data.status === 'ok' && data.modelReady,
      model: data.model ?? 'unknown',
      modelFile: data.modelFile ?? 'unknown',
    };
  } catch { return { ok: false, model: 'unknown', modelFile: 'unknown' }; }
}

async function callInfer(
  systemMsg: string, userMsg: string, schema: object, schemaName: string,
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
    if (!res.ok) return { content: `HTTP_${res.status}`, parsed: null, latencyMs };
    const data = await res.json() as { content: string; parsed?: Record<string, unknown> | null };
    const parsed = (data.parsed !== undefined && data.parsed !== null)
      ? data.parsed
      : (() => { try { return JSON.parse(data.content) as Record<string, unknown>; } catch { return null; } })();
    return { content: data.content ?? '', parsed, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return { content: err instanceof Error ? err.name : 'UnknownError', parsed: null, latencyMs };
  } finally { clearTimeout(timer); }
}

// ===== Runners =====

/** Dialogue: single call (V1 prompt + V2 schema) */
async function runDialogue(tc: TestCase, ctx: RelationshipContext, runIdx: number): Promise<CallResult> {
  const prompt = buildDialoguePrompt(tc, ctx);
  const schema = buildDialogueSchema();
  const tokenEst = estimateTokens(SYSTEM_MSG + prompt);

  const { content, parsed, latencyMs } = await callInfer(SYSTEM_MSG, prompt, schema, 'soul_eval_v4');

  let emotion: string | null = null;
  let intensity: number | null = null;
  let innerThought: string | null = null;
  let relationshipDelta: number | null = null;
  let parseSuccess = false;

  if (parsed) {
    emotion = (parsed.emotion as string) ?? null;
    intensity = (parsed.intensity as number) ?? null;
    innerThought = (parsed.innerThought as string) ?? null;
    const deltas = parsed.relationshipDeltas as Array<{ delta: number }> | undefined;
    if (deltas && deltas.length > 0) relationshipDelta = deltas[0].delta;
    parseSuccess = emotion !== null && innerThought !== null;
  }

  return {
    testId: tc.id, level: ctx.level, runIndex: runIdx,
    emotion, intensity, relationshipDelta, innerThought, actionCode: null,
    latencyMs, promptTokenEstimate: tokenEst, parseSuccess,
    rawContent: content, apiCalls: 1, pipeline: 'single',
  };
}

/** Decision: two-stage (V1 prompt + V2 schema + V3 pipeline) */
async function runDecision(tc: TestCase, ctx: RelationshipContext, runIdx: number): Promise<CallResult> {
  // Call 1: emotion + action
  const prompt1 = buildDecisionCall1Prompt(tc, ctx);
  const schema1 = buildDecisionCall1Schema(tc.actionPool!.map(a => a.code));
  const tokenEst = estimateTokens(SYSTEM_MSG + prompt1);

  const r1 = await callInfer(SYSTEM_MSG, prompt1, schema1, 'soul_decide_v4');

  let emotion: string | null = null;
  let intensity: number | null = null;
  let actionCode: string | null = null;

  if (r1.parsed) {
    emotion = (r1.parsed.emotion as string) ?? null;
    intensity = (r1.parsed.intensity as number) ?? null;
    actionCode = (r1.parsed.actionCode as string) ?? null;
  }

  if (!emotion || !actionCode) {
    return {
      testId: tc.id, level: ctx.level, runIndex: runIdx,
      emotion: null, intensity: null, relationshipDelta: null,
      innerThought: null, actionCode: null,
      latencyMs: r1.latencyMs, promptTokenEstimate: tokenEst,
      parseSuccess: false, rawContent: r1.content, apiCalls: 1, pipeline: 'two-stage',
    };
  }

  // Call 2: innerThought + deltas
  const prompt2 = buildDecisionCall2Prompt(tc, ctx, emotion, actionCode);
  const schema2 = buildDecisionCall2Schema();
  const r2 = await callInfer(SYSTEM_CALL2, prompt2, schema2, 'soul_thought_v4');

  let innerThought: string | null = null;
  let relationshipDelta: number | null = null;

  if (r2.parsed) {
    innerThought = (r2.parsed.innerThought as string) ?? null;
    const deltas = r2.parsed.relationshipDeltas as Array<{ delta: number }> | undefined;
    if (deltas && deltas.length > 0) relationshipDelta = deltas[0].delta;
  }

  return {
    testId: tc.id, level: ctx.level, runIndex: runIdx,
    emotion, intensity, relationshipDelta, innerThought, actionCode,
    latencyMs: r1.latencyMs + r2.latencyMs, promptTokenEstimate: tokenEst,
    parseSuccess: emotion !== null && innerThought !== null,
    rawContent: r1.content, rawContentCall2: r2.content,
    apiCalls: 2, pipeline: 'two-stage',
  };
}

// ===== Metrics =====

interface LevelMetrics {
  level: ContextLevel;
  reflectionRate: number;
  emotionConsistencyRate: number;
  differentiationRate: number;
  hallucinationRate: number;
  actionConsistencyRate: number;
  parseSuccessRate: number;
  avgLatencyMs: number;
  avgPromptTokens: number;
  avgThoughtLen: number;
  sampleCount: number;
}

function calculateMetrics(results: CallResult[]): LevelMetrics[] {
  const tcMap = new Map(TEST_CASES.map(tc => [tc.id, tc]));

  const l0Emotions = new Map<string, Set<string>>();
  const l0Actions = new Map<string, Set<string>>();
  for (const r of results) {
    if (r.level === 0 && r.parseSuccess) {
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
    const all = results.filter(r => r.level === level);
    const parsed = all.filter(r => r.parseSuccess);
    const n = parsed.length;
    if (n === 0) {
      return { level, reflectionRate: 0, emotionConsistencyRate: 0, differentiationRate: 0,
        hallucinationRate: 0, actionConsistencyRate: -1, parseSuccessRate: 0,
        avgLatencyMs: 0, avgPromptTokens: 0, avgThoughtLen: 0, sampleCount: 0 };
    }

    let reflHits = 0, emHits = 0, diffHits = 0, hallHits = 0, actHits = 0, actTotal = 0;

    for (const r of parsed) {
      const tc = tcMap.get(r.testId)!;

      // Reflection
      if (r.innerThought && tc.reflectionKeywords.some(kw => r.innerThought!.includes(kw))) reflHits++;

      // Emotion consistency
      if (r.emotion && tc.consistentEmotions.includes(r.emotion)) emHits++;

      // Differentiation
      if (level > 0) {
        const be = l0Emotions.get(r.testId);
        const ba = l0Actions.get(r.testId);
        if ((r.emotion && be && !be.has(r.emotion)) || (r.actionCode && ba && !ba.has(r.actionCode))) diffHits++;
      }

      // Hallucination
      if (r.innerThought) {
        const known = new Set([tc.subjectName, tc.targetName, '王灵均', '赵铁柱', '李沐阳', '张清风', '苏瑶', '掌门', '长老']);
        const pat = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
        let m; let hall = false;
        const ctx = tc.contexts.find(c => c.level === r.level);
        const promptText = ctx ? buildDialoguePrompt(tc, ctx) : '';
        while ((m = pat.exec(r.innerThought)) !== null) {
          if (!known.has(m[1]) && !promptText.includes(m[1])) { hall = true; break; }
        }
        if (hall) hallHits++;
      }

      // Action consistency
      if (tc.type === 'decision' && tc.consistentActions && r.actionCode) {
        actTotal++;
        if (tc.consistentActions.includes(r.actionCode)) actHits++;
      }
    }

    const tLens = parsed.filter(r => r.innerThought).map(r => r.innerThought!.length);

    return {
      level, sampleCount: n,
      reflectionRate: reflHits / n,
      emotionConsistencyRate: emHits / n,
      differentiationRate: level === 0 ? 0 : diffHits / n,
      hallucinationRate: hallHits / n,
      actionConsistencyRate: actTotal > 0 ? actHits / actTotal : -1,
      parseSuccessRate: all.length > 0 ? n / all.length : 0,
      avgLatencyMs: Math.round(parsed.reduce((s, r) => s + r.latencyMs, 0) / n),
      avgPromptTokens: Math.round(parsed.reduce((s, r) => s + r.promptTokenEstimate, 0) / n),
      avgThoughtLen: tLens.length > 0 ? Math.round(tLens.reduce((a, b) => a + b, 0) / tLens.length) : 0,
    };
  });
}

// ===== Load V1 baseline =====

interface V1Level { level: number; emotionConsistencyRate: number; relationshipReflectionRate: number;
  parseSuccessRate: number; hallucinationRate: number; levelDifferentiationRate: number; avgLatencyMs: number; avgPromptTokens: number; }

function loadV1(): Map<number, V1Level> {
  const dir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  const files = readdirSync(dir).filter(f => f.startsWith('poc-ij-metrics-') && !f.includes('v2'));
  if (files.length === 0) return new Map();
  const raw = readFileSync(join(dir, files.sort().pop()!), 'utf8');
  const parsed = JSON.parse(raw) as V1Level[] | { perLevel: V1Level[] };
  const data = Array.isArray(parsed) ? parsed : parsed.perLevel;
  return new Map(data.map(d => [d.level, d]));
}

// ===== Load V2/V3 baseline =====

interface V2V3Metrics { v2: Array<{ level: number; emotionConsistencyRate: number; parseSuccessRate: number;
  hallucinationRate: number; actionConsistencyRate: number; avgLatencyMs: number; avgInnerThoughtLen: number;
  relationshipReflectionRate: number; levelDifferentiationRate: number }>;
  v3: Array<{ level: number; emotionConsistencyRate: number; parseSuccessRate: number;
  hallucinationRate: number; actionConsistencyRate: number; avgLatencyMs: number; avgInnerThoughtLen: number;
  relationshipReflectionRate: number; levelDifferentiationRate: number }> }

function loadV2V3(): V2V3Metrics | null {
  const dir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  const files = readdirSync(dir).filter(f => f.startsWith('poc-ij-v2-metrics-'));
  if (files.length === 0) return null;
  const raw = readFileSync(join(dir, files.sort().pop()!), 'utf8');
  return JSON.parse(raw) as V2V3Metrics;
}

// ===== Report =====

function generateReport(
  results: CallResult[], metrics: LevelMetrics[],
  v1: Map<number, V1Level>, v2v3: V2V3Metrics | null,
  startTime: number, endTime: number,
  modelLabel: string = 'unknown',
): string {
  const total = results.length;
  const apiCalls = results.reduce((s, r) => s + r.apiCalls, 0);
  const success = results.filter(r => r.parseSuccess).length;
  const dur = ((endTime - startTime) / 60000).toFixed(1);

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  // Four-column comparison
  const rows: string[] = [];
  for (const level of TEST_LEVELS) {
    const v4 = metrics.find(m => m.level === level)!;
    const v1d = v1.get(level);
    const v2d = v2v3?.v2.find(m => m.level === level);
    const v3d = v2v3?.v3.find(m => m.level === level);

    const r = (label: string, v1v: string, v2v: string, v3v: string, v4v: string) =>
      `| L${level} | ${label} | ${v1v} | ${v2v} | ${v3v} | **${v4v}** |`;

    rows.push(r('情绪一致率',
      v1d ? pct(v1d.emotionConsistencyRate) : '—',
      v2d ? pct(v2d.emotionConsistencyRate) : '—',
      v3d ? pct(v3d.emotionConsistencyRate) : '—',
      pct(v4.emotionConsistencyRate)));
    rows.push(r('关系反映率',
      v1d ? pct(v1d.relationshipReflectionRate) : '—',
      v2d ? pct(v2d.relationshipReflectionRate) : '—',
      v3d ? pct(v3d.relationshipReflectionRate) : '—',
      pct(v4.reflectionRate)));
    rows.push(r('解析成功率',
      v1d ? pct(v1d.parseSuccessRate) : '—',
      v2d ? pct(v2d.parseSuccessRate) : '—',
      v3d ? pct(v3d.parseSuccessRate) : '—',
      pct(v4.parseSuccessRate)));
    rows.push(r('幻觉率',
      v1d ? pct(v1d.hallucinationRate) : '—',
      v2d ? pct(v2d.hallucinationRate) : '—',
      v3d ? pct(v3d.hallucinationRate) : '—',
      pct(v4.hallucinationRate)));
    rows.push(r('平均延迟',
      v1d ? `${v1d.avgLatencyMs}ms` : '—',
      v2d ? `${v2d.avgLatencyMs}ms` : '—',
      v3d ? `${v3d.avgLatencyMs}ms` : '—',
      `${v4.avgLatencyMs}ms`));
    rows.push(r('独白均长', '—',
      v2d ? `${v2d.avgInnerThoughtLen}字` : '—',
      v3d ? `${v3d.avgInnerThoughtLen}字` : '—',
      `${v4.avgThoughtLen}字`));
    if (level > 0) {
      rows.push(r('层级差异率',
        v1d ? pct(v1d.levelDifferentiationRate) : '—',
        v2d ? pct(v2d.levelDifferentiationRate) : '—',
        v3d ? pct(v3d.levelDifferentiationRate) : '—',
        pct(v4.differentiationRate)));
    }
    if (v4.actionConsistencyRate >= 0) {
      rows.push(r('行为一致率', '—',
        v2d && v2d.actionConsistencyRate >= 0 ? pct(v2d.actionConsistencyRate) : '—',
        v3d && v3d.actionConsistencyRate >= 0 ? pct(v3d.actionConsistencyRate) : '—',
        pct(v4.actionConsistencyRate)));
    }
    rows.push('| | | | | | |');
  }

  // Per-test details
  const details: string[] = [];
  for (const tc of TEST_CASES) {
    const lines = [`### ${tc.id}: ${tc.subjectName} ↔ ${tc.targetName}（${tc.type}，${tc.type === 'decision' ? '两阶段' : '单次调用'}）`, ''];
    for (const level of TEST_LEVELS) {
      const lr = results.filter(r => r.testId === tc.id && r.level === level && r.parseSuccess);
      if (lr.length === 0) { lines.push(`**L${level}**：无有效数据`); continue; }
      const emotions = lr.map(r => r.emotion ?? '?').join(', ');
      const acts = tc.type === 'decision' ? ` | 行动=[${lr.map(r => r.actionCode ?? '?').join(', ')}]` : '';
      const thoughts = lr.map(r => `"${(r.innerThought ?? '').slice(0, 25)}..."`).join(' / ');
      lines.push(`**L${level}**：情绪=[${emotions}]${acts}`);
      lines.push(`  独白: ${thoughts}`);
      lines.push('');
    }
    details.push(lines.join('\n'));
  }

  return `# Phase IJ-PoC v4 — 混合最优方案验证报告

> **生成时间**：${new Date(endTime).toISOString()}
> **模型**：${modelLabel}
> **逻辑调用**：${total}（API 调用 ${apiCalls}）
> **成功率**：${success}/${total}（${pct(success / total)}）
> **耗时**：${dur} 分钟

---

## 混合策略

| 组件 | 来源 | 选择理由 |
|------|------|---------|
| **Prompt 措辞** | V1 原版 | 情绪一致率最高（78%） |
| **Schema** | V2（maxItems:1 + innerThought 前置）| 解析率 100% |
| **targetId 约束** | O3 | 消灭幻觉 ID |
| **Dialogue Pipeline** | 单次调用 | 延迟最低 |
| **Decision Pipeline** | V3 两阶段分离 | 行为一致率最高（80%） |

---

## 四版本对比：V1 vs V2 vs V3 vs V4

| Level | 指标 | V1 | V2 | V3 | **V4（混合）** |
|:-----:|:----:|:--:|:--:|:--:|:----------:|
${rows.join('\n')}

---

## 每用例明细

${details.join('\n\n')}

---

## 结论

> 自动生成，需人工审阅。

### 甜蜜点分析

${(() => {
  // Find sweet spot: best composite score across levels
  const scored = metrics.filter(m => m.sampleCount > 0).map(m => {
    const composite = m.emotionConsistencyRate * 0.3 + m.reflectionRate * 0.25 +
      (1 - m.hallucinationRate) * 0.25 + m.parseSuccessRate * 0.2;
    return { level: m.level, composite, m };
  }).sort((a, b) => b.composite - a.composite);
  const best = scored[0];
  const rows = scored.map(s =>
    `| L${s.level} | ${pct(s.m.emotionConsistencyRate)} | ${pct(s.m.reflectionRate)} | ${pct(s.m.hallucinationRate)} | ${pct(s.m.parseSuccessRate)} | ${s.m.avgLatencyMs}ms | **${(s.composite * 100).toFixed(0)}** |`
  ).join('\n');
  return `| Level | 情绪一致 | 关系反映 | 幻觉率 | 解析率 | 延迟 | 综合分 |\n|:-----:|:-------:|:------:|:-----:|:-----:|:----:|:-----:|\n${rows}\n\n**推荐甜蜜点：L${best.level}**（综合分 ${(best.composite * 100).toFixed(0)}）`;
})()}

### 各级关键指标
${metrics.map(m => `- L${m.level}: 情绪一致${pct(m.emotionConsistencyRate)} | 反映${pct(m.reflectionRate)} | 幻觉${pct(m.hallucinationRate)} | 解析${pct(m.parseSuccessRate)} | ${m.avgLatencyMs}ms${m.actionConsistencyRate >= 0 ? ` | 行为一致${pct(m.actionConsistencyRate)}` : ''}`).join('\n')}

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| ${new Date().toISOString().slice(0, 10)} | v1.0 | 自动生成（${apiCalls} 次 API 调用） |
`;
}

// ===== Main =====

async function main(): Promise<void> {
  const startTime = Date.now();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runsArg = process.argv.find(a => a.startsWith('--runs='));
  const RUNS = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5;

  log('INFO', '=== Phase IJ-PoC v4: 混合最优方案验证 ===');
  const dialogueCalls = 3 * 7 * RUNS;
  const decisionCalls = 2 * 7 * RUNS;
  const apiTotal = dialogueCalls + decisionCalls * 2;
  log('INFO', `配置：${RUNS} 轮 × 7 levels (L0~L6) × 5 cases`);
  log('INFO', `预计：Dialogue ${dialogueCalls} + Decision ${decisionCalls}(×2) = ${apiTotal} 次 API 调用`);

  const healthResult = await checkHealth();
  if (!healthResult.ok) { log('ERROR', 'AI 服务不可用'); process.exit(1); }
  const modelLabel = `${healthResult.model} (${healthResult.modelFile})`;
  log('INFO', `AI 服务健康检查通过，模型：${modelLabel}`);

  const v1Data = loadV1();
  const v2v3Data = loadV2V3();
  if (v1Data.size > 0) log('INFO', `已加载 V1 基线：${v1Data.size} levels`);
  if (v2v3Data) log('INFO', '已加载 V2/V3 基线');

  const allResults: CallResult[] = [];
  let count = 0;
  const totalLogical = dialogueCalls + decisionCalls;

  for (const tc of TEST_CASES) {
    for (const ctx of tc.contexts) {
      for (let run = 0; run < RUNS; run++) {
        count++;
        log('INFO', `[${count}/${totalLogical}] ${tc.id} L${ctx.level} R${run + 1} (${tc.type})`,
          { testId: tc.id, level: ctx.level, run: run + 1, pipeline: tc.type === 'decision' ? '两阶段' : '单次' });

        const result = tc.type === 'dialogue'
          ? await runDialogue(tc, ctx, run)
          : await runDecision(tc, ctx, run);

        allResults.push(result);

        const s = result.parseSuccess ? '✅' : '❌';
        log('INFO', `[${count}/${totalLogical}] ${s} emotion=${result.emotion} action=${result.actionCode ?? '-'} thought="${(result.innerThought ?? '').slice(0, 20)}..." ${result.latencyMs}ms (${result.apiCalls}c)`);
      }
    }
  }

  const endTime = Date.now();
  const metrics = calculateMetrics(allResults);

  // Save outputs
  const outDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
  ensureDir(outDir);

  writeFileSync(join(outDir, `poc-ij-v4-raw-${ts}.json`), JSON.stringify(allResults, null, 2), 'utf8');
  writeFileSync(join(outDir, `poc-ij-v4-metrics-${ts}.json`), JSON.stringify(metrics, null, 2), 'utf8');
  log('INFO', '原始数据 + 指标已保存');

  const report = generateReport(allResults, metrics, v1Data, v2v3Data, startTime, endTime, modelLabel);
  const modelSlug = (healthResult.model ?? 'unknown').replace(/[^a-z0-9.-]/gi, '-');
  const reportFilename = `review-v4-${modelSlug}.md`;
  const reportPath = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', reportFilename);
  writeFileSync(reportPath, report, 'utf8');
  log('INFO', `报告: ${reportPath}`);

  // Save logs
  const logLines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  writeFileSync(join(outDir, `poc-ij-v4-${ts}.txt`), logLines.join('\n\n'), 'utf8');

  const apiCalls = allResults.reduce((s, r) => s + r.apiCalls, 0);
  const successRate = allResults.filter(r => r.parseSuccess).length / allResults.length;
  log('INFO', '=== 实验完成 ===');
  log('INFO', `${allResults.length} 逻辑调用，${apiCalls} API 调用，成功率 ${(successRate * 100).toFixed(0)}%，耗时 ${((endTime - startTime) / 60000).toFixed(1)}min`);
}

main().catch(err => {
  log('ERROR', `失败: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
