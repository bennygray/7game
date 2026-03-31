/**
 * Phase IJ-PoC: 0.8B 模型关系上下文利用能力验证
 *
 * 核心目标：映射"上下文量 vs AI 输出质量"曲线，找到甜蜜点。
 *   7 层级递增上下文 (L0-L6) × 5 测试用例 × 5 轮 = 245 次 AI 调用
 *
 * 两个独立场景：
 *   PoC-1（对话质量）：T1-T3 — 关系摘要 → 独白质量
 *   PoC-2（行为决策）：T4-T5 — 关系摘要 → 行为选择
 *
 * 运行：npx tsx scripts/poc-ij-relationship-test.ts [--runs=N]
 *
 * @see docs/features/phaseIJ-poc-PRD.md
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
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

function saveLogs(name: string): void {
  const dir = join(process.cwd(), 'logs');
  ensureDir(dir);
  const p = join(dir, name);
  const lines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  writeFileSync(p + '.txt', lines.join('\n\n'), 'utf8');
  writeFileSync(p + '.json', JSON.stringify(logBuffer, null, 2), 'utf8');
  log('INFO', `日志已保存: ${p}.txt / .json`);
}

// ===== S2: Types & Constants =====

type ContextLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const ALL_LEVELS: ContextLevel[] = [0, 1, 2, 3, 4, 5, 6];

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
  personalExperience?: string;
  indirectRelationship?: string;
  extraContext?: string;
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
  /** Keywords indicating relationship-aligned innerThought */
  reflectionKeywords: string[];
  /** Emotions logically consistent with the relationship */
  consistentEmotions: string[];
  /** Expected action codes for PoC-2 (consistent with relationship) */
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
}

interface LevelMetrics {
  level: ContextLevel;
  relationshipReflectionRate: number;
  emotionConsistencyRate: number;
  levelDifferentiationRate: number;
  hallucinationRate: number;
  avgLatencyMs: number;
  parseSuccessRate: number;
  avgPromptTokens: number;
  sampleCount: number;
}

// Emotion label map (subset used in PoC)
const EMOTION_LABEL: Record<string, string> = {
  joy: '喜悦', anger: '愤怒', envy: '嫉妒', admiration: '钦佩',
  sadness: '悲伤', fear: '恐惧', contempt: '轻蔑', neutral: '平静',
  jealousy: '嫉恨', gratitude: '感激', guilt: '愧疚',
  worry: '担忧', shame: '羞耻', pride: '自豪', relief: '释然',
};

// ===== S3: Test Case Data (5 cases × 7 levels) =====

const TEST_CASES: TestCase[] = [
  // T1: 张清风(rival) ↔ 李沐阳, encounter-chat → 预期敌意
  {
    id: 'T1', type: 'dialogue',
    subjectName: '张清风', personality: '内向正直', moralDesc: '偏善守序',
    sectDesc: '崇尚仁德，门规严明', targetName: '李沐阳', targetId: 'limuyang',
    eventType: 'encounter-chat', eventDescription: '在后山与李沐阳碰面交谈',
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

  // T2: 王灵均(friend) ↔ 赵铁柱, encounter-chat → 预期友善
  {
    id: 'T2', type: 'dialogue',
    subjectName: '王灵均', personality: '温和善良', moralDesc: '偏善中立',
    sectDesc: '崇尚仁德，门规严明', targetName: '赵铁柱', targetId: 'zhaotiezhu',
    eventType: 'encounter-chat', eventDescription: '在灵田旁偶遇赵铁柱，闲聊起来',
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

  // T3: 李沐阳 vs 张清风, encounter-conflict → 预期引用历史
  {
    id: 'T3', type: 'dialogue',
    subjectName: '李沐阳', personality: '好胜外向', moralDesc: '偏恶混乱',
    sectDesc: '崇尚仁德，门规严明', targetName: '张清风', targetId: 'zhangqingfeng',
    eventType: 'encounter-conflict', eventDescription: '在后山因资源分配与张清风发生激烈争执',
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

  // T4: 张清风(rival, humiliated) in STORM → 预期攻击/非保护
  {
    id: 'T4', type: 'decision',
    subjectName: '张清风', personality: '内向正直', moralDesc: '偏善守序',
    sectDesc: '崇尚仁德，门规严明', targetName: '李沐阳', targetId: 'limuyang',
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

  // T5: 王灵均(friend, mutual help) in STORM → 预期保护
  {
    id: 'T5', type: 'decision',
    subjectName: '王灵均', personality: '温和善良', moralDesc: '偏善中立',
    sectDesc: '崇尚仁德，门规严明', targetName: '赵铁柱', targetId: 'zhaotiezhu',
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

// ===== S4: Prompt Builder =====

/** Estimate token count for Chinese + English mixed text */
function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    // CJK characters ~1.5 tokens, ASCII words ~1 token per 4 chars
    if (char.charCodeAt(0) > 0x2E80) {
      count += 1.5;
    } else {
      count += 0.25;
    }
  }
  return Math.round(count);
}

/** Build relationship context block for a given level */
function buildRelationshipBlock(ctx: RelationshipContext, targetName: string): string {
  if (ctx.level === 0) return '';

  const lines: string[] = [];

  // L4+: personal experience comes first
  if (ctx.personalExperience) {
    lines.push(`个人经历：${ctx.personalExperience}`);
  }

  // L1+: affinity + tag
  if (ctx.affinity !== undefined && ctx.tagLabel) {
    lines.push(`【与${targetName}的关系】好感：${ctx.affinity}（${ctx.tagLabel}）`);
  }

  // L2+: key events
  if (ctx.keyEvents && ctx.keyEvents.length > 0) {
    const evtStr = ctx.keyEvents
      .map(e => `${e.content}(${e.affinityDelta > 0 ? '+' : ''}${e.affinityDelta})`)
      .join('；');
    lines.push(`关键经历：${evtStr}`);
  }

  // L5+: indirect relationship
  if (ctx.indirectRelationship) {
    lines.push(`【间接关系】${ctx.indirectRelationship}`);
  }

  // L6: extra context
  if (ctx.extraContext) {
    lines.push(ctx.extraContext);
  }

  return lines.join('\n');
}

/** Build the full prompt for a test case at a given context level */
function buildPrompt(tc: TestCase, ctx: RelationshipContext): string {
  // Identity paragraph (replicates soul-prompt-builder pattern)
  let identity = `你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`;
  identity += `道德${tc.moralDesc}。`;
  identity += `你所在的宗门：${tc.sectDesc}。`;

  // Relationship block (inserted between identity and event)
  const relBlock = buildRelationshipBlock(ctx, tc.targetName);

  // Event description
  const eventLine = `刚才发生了：${tc.eventDescription}`;

  // Emotion candidates
  const candidateList = tc.candidateEmotions
    .map(e => `${e}(${tc.emotionLabels[e] ?? e})`)
    .join('、');

  // Build full prompt
  const parts = [identity];
  if (relBlock) parts.push(relBlock);
  parts.push(eventLine);
  parts.push('');
  parts.push('你此刻内心的情绪是什么？关系如何变化？');
  parts.push('');
  parts.push(`【候选情绪】（必须从以下情绪中选择一种）：${candidateList}`);

  // PoC-2: action pool
  if (tc.type === 'decision' && tc.actionPool) {
    const actionListDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(' / ');
    parts.push('');
    parts.push(`【候选行动】（必须从以下行动中选择一种）：${actionListDesc}`);
  }

  parts.push('');
  parts.push('请用JSON格式输出你的内心反应。innerThought写你此刻的内心独白（20-30字，第一人称）。');

  return parts.join('\n');
}

// ===== S5: API Caller =====

const BASE_URL = 'http://localhost:3001';
const CALL_TIMEOUT_MS = 15000;

/** JSON Schema for dialogue (PoC-1) */
const DIALOGUE_SCHEMA = {
  type: 'object',
  properties: {
    emotion: {
      type: 'string',
      enum: ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
        'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
        'worry', 'shame', 'pride', 'relief'],
      description: '从候选情绪池中选择一种',
    },
    intensity: {
      type: 'integer',
      enum: [1, 2, 3],
      description: '情绪强度：1=轻微，2=明显，3=强烈',
    },
    relationshipDeltas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetId: { type: 'string' },
          delta: { type: 'number', minimum: -10, maximum: 10 },
          reason: { type: 'string' },
        },
        required: ['targetId', 'delta', 'reason'],
      },
      description: '关系变化列表',
    },
    innerThought: {
      type: 'string',
      maxLength: 80,
      description: '弟子内心独白（中文，20-30字）',
    },
  },
  required: ['emotion', 'intensity', 'relationshipDeltas', 'innerThought'],
};

/** JSON Schema for decision (PoC-2) — extends dialogue with actionCode */
function buildDecisionSchema(actionCodes: string[]): object {
  return {
    type: 'object',
    properties: {
      emotion: {
        type: 'string',
        enum: ['joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
          'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
          'worry', 'shame', 'pride', 'relief'],
        description: '从候选情绪池中选择一种',
      },
      intensity: {
        type: 'integer',
        enum: [1, 2, 3],
        description: '情绪强度：1=轻微，2=明显，3=强烈',
      },
      relationshipDeltas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            targetId: { type: 'string' },
            delta: { type: 'number', minimum: -10, maximum: 10 },
            reason: { type: 'string' },
          },
          required: ['targetId', 'delta', 'reason'],
        },
        description: '关系变化列表',
      },
      innerThought: {
        type: 'string',
        maxLength: 80,
        description: '弟子内心独白（中文，20-30字）',
      },
      actionCode: {
        type: 'string',
        enum: actionCodes,
        description: '从候选行动中选择一种',
      },
    },
    required: ['emotion', 'intensity', 'relationshipDeltas', 'innerThought', 'actionCode'],
  };
}

/** Check AI server health */
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

/** System message for soul evaluation (matches soul-evaluator.ts) */
const SYSTEM_INSTRUCTION = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。';

/** Call /api/infer with structured completion */
async function callInfer(
  prompt: string,
  schema: object,
  schemaName: string,
): Promise<{ content: string; parsed: Record<string, unknown> | null; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const payload = {
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt },
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

// ===== S6: Metrics Calculator =====

interface MetricsInput {
  results: CallResult[];
  testCases: TestCase[];
}

/** Calculate per-level metrics */
function calculateMetrics(input: MetricsInput): LevelMetrics[] {
  const { results, testCases } = input;
  const tcMap = new Map(testCases.map(tc => [tc.id, tc]));

  // Collect L0 emotions per test case for differentiation calculation
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

  return ALL_LEVELS.map(level => {
    const levelResults = results.filter(r => r.level === level && r.parseSuccess);
    const allLevelResults = results.filter(r => r.level === level);
    const n = levelResults.length;
    if (n === 0) {
      return {
        level, relationshipReflectionRate: 0, emotionConsistencyRate: 0,
        levelDifferentiationRate: 0, hallucinationRate: 0,
        avgLatencyMs: 0, parseSuccessRate: 0, avgPromptTokens: 0, sampleCount: 0,
      };
    }

    // Relationship Reflection Rate
    let reflectionHits = 0;
    for (const r of levelResults) {
      const tc = tcMap.get(r.testId);
      if (tc && r.innerThought) {
        const hasKeyword = tc.reflectionKeywords.some(kw => r.innerThought!.includes(kw));
        if (hasKeyword) reflectionHits++;
      }
    }

    // Emotion Consistency Rate
    let emotionHits = 0;
    for (const r of levelResults) {
      const tc = tcMap.get(r.testId);
      if (tc && r.emotion) {
        if (tc.consistentEmotions.includes(r.emotion)) emotionHits++;
      }
    }

    // Level Differentiation Rate (vs L0 baseline)
    let diffHits = 0;
    if (level === 0) {
      // L0 vs itself: 0% by definition
    } else {
      for (const r of levelResults) {
        const baseEmotions = l0Emotions.get(r.testId);
        const baseActions = l0Actions.get(r.testId);
        let isDifferent = false;
        if (r.emotion && baseEmotions && !baseEmotions.has(r.emotion)) isDifferent = true;
        if (r.actionCode && baseActions && !baseActions.has(r.actionCode)) isDifferent = true;
        if (isDifferent) diffHits++;
      }
    }

    // Hallucination Rate: check if innerThought fabricates specific events
    // or references entities NOT present in the prompt for this call
    let hallucinationHits = 0;
    for (const r of levelResults) {
      const tc = tcMap.get(r.testId);
      if (tc && r.innerThought) {
        // Build the full prompt for this level to know what was actually provided
        const ctx = tc.contexts.find(c => c.level === r.level);
        const promptText = ctx ? buildPrompt(tc, ctx) : '';

        // Strategy: check for fabricated person names (3-char Chinese names
        // not present anywhere in the prompt or known context names)
        const allKnownNames = new Set([
          tc.subjectName, tc.targetName,
          '王灵均', '赵铁柱', '李沐阳', '张清风', '苏瑶',
          '掌门', '长老',
        ]);

        // Extract 3-char strings that follow name-introducing patterns
        // like "与X", "X的", "X曾", "X也", or appear after punctuation
        const namePattern = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
        let match;
        let hasHallucination = false;
        while ((match = namePattern.exec(r.innerThought)) !== null) {
          const candidate = match[1];
          if (!allKnownNames.has(candidate) && !promptText.includes(candidate)) {
            hasHallucination = true;
            break;
          }
        }

        // Also check for completely invented event details:
        // If innerThought mentions a specific location/event not in the prompt
        // (e.g., "在xxx" where xxx is a 2-3 char place not in prompt)
        // This is a softer check — only flag very obvious fabrications
        if (!hasHallucination && r.innerThought.length > 40) {
          // Check for detailed narrative elements that suggest fabrication
          // Only flag if innerThought contains quoted speech or very specific
          // event details that couldn't come from the prompt
          const hasQuotedSpeech = /[""「」]/.test(r.innerThought);
          const hasSpecificTime = /[昨去前]日|[三五七]年前|那[一]?[天日夜]/.test(r.innerThought);
          if (hasQuotedSpeech || (hasSpecificTime && !promptText.includes('年前'))) {
            hasHallucination = true;
          }
        }

        if (hasHallucination) hallucinationHits++;
      }
    }

    const parseSuccessCount = allLevelResults.filter(r => r.parseSuccess).length;

    return {
      level,
      relationshipReflectionRate: reflectionHits / n,
      emotionConsistencyRate: emotionHits / n,
      levelDifferentiationRate: level === 0 ? 0 : diffHits / n,
      hallucinationRate: hallucinationHits / n,
      avgLatencyMs: Math.round(levelResults.reduce((s, r) => s + r.latencyMs, 0) / n),
      parseSuccessRate: allLevelResults.length > 0 ? parseSuccessCount / allLevelResults.length : 0,
      avgPromptTokens: Math.round(levelResults.reduce((s, r) => s + r.promptTokenEstimate, 0) / n),
      sampleCount: n,
    };
  });
}

/** Find the sweet spot: level with highest combined quality before degradation */
function findSweetSpot(metrics: LevelMetrics[]): { level: ContextLevel; reasoning: string } {
  // Combined score = reflection + consistency + differentiation - hallucination
  const scores = metrics.map(m => ({
    level: m.level,
    score: m.relationshipReflectionRate + m.emotionConsistencyRate + m.levelDifferentiationRate - m.hallucinationRate,
    parse: m.parseSuccessRate,
  }));

  // Find the level with highest score that still has good parse success
  let best = scores[0];
  for (const s of scores) {
    if (s.parse >= 0.6 && s.score > best.score) best = s;
  }

  const reasoning = best.level === 0
    ? '所有层级无显著差异，建议仅使用规则引擎'
    : `L${best.level} 综合质量分最高（反映率+一致率+差异率-幻觉率），且解析成功率 ≥ 60%`;

  return { level: best.level as ContextLevel, reasoning };
}

// ===== S7: Report Generator =====

function generateReviewMarkdown(
  metrics: LevelMetrics[],
  sweetSpot: { level: ContextLevel; reasoning: string },
  results: CallResult[],
  testCases: TestCase[],
  startTime: number,
  endTime: number,
): string {
  const totalCalls = results.length;
  const successCalls = results.filter(r => r.parseSuccess).length;
  const durationMin = ((endTime - startTime) / 60000).toFixed(1);

  // Determine conclusion
  let conclusion: string;
  let conclusionEmoji: string;
  let nextAction: string;
  if (sweetSpot.level >= 3) {
    conclusionEmoji = '✅';
    conclusion = `L${sweetSpot.level}+ 层级显著优于 L0`;
    nextAction = '关系摘要 + 关键事件全量上线，按甜蜜点配置注入量';
  } else if (sweetSpot.level >= 1) {
    conclusionEmoji = '🔶';
    conclusion = '仅 L1-L2 有效（好感+标签有用，事件被忽略）';
    nextAction = '仅注入好感+标签，事件仅用于规则引擎';
  } else {
    conclusionEmoji = '❌';
    conclusion = '全部层级无显著差异';
    nextAction = '关系上下文仅用于规则引擎，AI prompt 不注入';
  }

  // Build metrics table
  const metricsTable = metrics.map(m =>
    `| L${m.level} | ${(m.relationshipReflectionRate * 100).toFixed(0)}% | ` +
    `${(m.emotionConsistencyRate * 100).toFixed(0)}% | ` +
    `${(m.levelDifferentiationRate * 100).toFixed(0)}% | ` +
    `${(m.hallucinationRate * 100).toFixed(0)}% | ` +
    `${m.avgPromptTokens} | ${m.avgLatencyMs}ms | ` +
    `${(m.parseSuccessRate * 100).toFixed(0)}% |`,
  ).join('\n');

  // ASCII quality curve (relationship reflection rate)
  const maxBarLen = 30;
  const maxRate = Math.max(...metrics.map(m => m.relationshipReflectionRate), 0.01);
  const curveLines = metrics.map(m => {
    const barLen = Math.round((m.relationshipReflectionRate / maxRate) * maxBarLen);
    const bar = '█'.repeat(barLen);
    const pct = (m.relationshipReflectionRate * 100).toFixed(0);
    const marker = m.level === sweetSpot.level ? ' ◀ 甜蜜点' : '';
    return `  L${m.level} |${bar} ${pct}%${marker}`;
  });

  // Per-test breakdown
  const testBreakdowns = testCases.map(tc => {
    const tcResults = results.filter(r => r.testId === tc.id);
    const levelSummaries = ALL_LEVELS.map(level => {
      const lr = tcResults.filter(r => r.level === level && r.parseSuccess);
      if (lr.length === 0) return `  L${level}: 无有效数据`;
      const emotions = lr.map(r => r.emotion ?? '?').join(', ');
      const thoughts = lr.map(r => `"${(r.innerThought ?? '').slice(0, 20)}..."`).join(' | ');
      const actions = tc.type === 'decision'
        ? `\n    行动: ${lr.map(r => r.actionCode ?? '?').join(', ')}`
        : '';
      return `  L${level}: 情绪=[${emotions}]${actions}\n    独白: ${thoughts}`;
    });
    return `### ${tc.id}: ${tc.subjectName} ↔ ${tc.targetName}（${tc.type}）\n\n${levelSummaries.join('\n')}`;
  });

  // AC checklist
  const poc1Count = results.filter(r => ['T1', 'T2', 'T3'].includes(r.testId)).length;
  const poc2Count = results.filter(r => ['T4', 'T5'].includes(r.testId)).length;

  return `# Phase IJ-PoC Review — 0.8B 关系上下文验证报告

> **生成时间**：${new Date(endTime).toISOString()}
> **模型**：Qwen3.5-0.8B GGUF Q4_K_M
> **总调用**：${totalCalls}（成功 ${successCalls}，失败 ${totalCalls - successCalls}）
> **耗时**：${durationMin} 分钟

---

## 结论：${conclusionEmoji} ${conclusion}

**甜蜜点**：L${sweetSpot.level}
**理由**：${sweetSpot.reasoning}
**后续动作**：${nextAction}

---

## 质量曲线（关系反映率）

\`\`\`
${curveLines.join('\n')}
\`\`\`

---

## 每级指标汇总

| 层级 | 关系反映率 | 情绪一致率 | 层级差异率 | 幻觉率 | Prompt Tokens | 延迟 | 解析率 |
|:----:|:--------:|:--------:|:--------:|:-----:|:------------:|:----:|:-----:|
${metricsTable}

---

## Token 预算实测

| 层级 | 预估 tokens | 实测 tokens |
|:----:|:--------:|:--------:|
${metrics.map(m => `| L${m.level} | ~${[200, 220, 240, 280, 300, 330, 400][m.level]} | ${m.avgPromptTokens} |`).join('\n')}

---

## 每用例明细

${testBreakdowns.join('\n\n')}

---

## 验收清单

| # | 标准 | 状态 |
|---|------|:----:|
| AC-1 | PoC-1 对话 175 次 AI 调用 | ${poc1Count >= 105 ? '✅' : '⚠️'} (${poc1Count}) |
| AC-2 | PoC-2 决策 70 次 AI 调用 | ${poc2Count >= 70 ? '✅' : '⚠️'} (${poc2Count}) |
| AC-3 | 质量曲线产出 | ✅ |
| AC-4 | 甜蜜点确定 | ✅ L${sweetSpot.level} |
| AC-5 | Token 实测 | ✅ |
| AC-6 | 结论文档 | ✅ |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| ${new Date(endTime).toISOString().slice(0, 10)} | v1.0 | 初始生成（245 调用实验完成） |
`;
}

// ===== S8: Main Loop =====

async function main(): Promise<void> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Parse CLI args
  const runsArg = process.argv.find(a => a.startsWith('--runs='));
  const runsPerLevel = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5;
  const totalExpected = TEST_CASES.length * ALL_LEVELS.length * runsPerLevel;

  log('INFO', '═══════════════ Phase IJ-PoC: 0.8B 关系上下文验证 ═══════════════');
  log('INFO', `配置: ${TEST_CASES.length} 用例 × ${ALL_LEVELS.length} 层级 × ${runsPerLevel} 轮 = ${totalExpected} 次调用`);
  log('INFO', '模型: Qwen3.5-0.8B | 端点: ai-server:3001 /api/infer');

  // Health check
  log('INFO', '检查 AI 服务...');
  const healthy = await checkHealth();
  if (!healthy) {
    log('ERROR', 'AI 服务不可用（确保运行 npm run ai）');
    process.exit(1);
  }
  log('INFO', 'AI 服务在线，模型已就绪');

  // Warmup (2 throwaway calls)
  log('INFO', '预热中...');
  for (let i = 0; i < 2; i++) {
    await callInfer('你是修仙弟子张清风。刚才发生了：你结束了一段打坐修炼。你此刻内心的情绪是什么？【候选情绪】（必须从以下情绪中选择一种）：neutral(平静)、joy(喜悦)。请用JSON格式输出你的内心反应。innerThought写你此刻的内心独白（20-30字，第一人称）。',
      DIALOGUE_SCHEMA, 'warmup');
  }
  log('INFO', '预热完成');

  // Main experiment loop
  const results: CallResult[] = [];
  let callIndex = 0;

  for (const tc of TEST_CASES) {
    log('INFO', `━━━ ${tc.id}: ${tc.subjectName} ↔ ${tc.targetName} [${tc.type}] ━━━`);

    for (const ctx of tc.contexts) {
      for (let run = 0; run < runsPerLevel; run++) {
        callIndex++;
        const prompt = buildPrompt(tc, ctx);
        const tokenEst = estimateTokens(prompt);

        const schema = tc.type === 'decision' && tc.actionPool
          ? buildDecisionSchema(tc.actionPool.map(a => a.code))
          : DIALOGUE_SCHEMA;
        const schemaName = tc.type === 'decision' ? 'soul_decision' : 'soul_eval';

        const { content, parsed, latencyMs } = await callInfer(prompt, schema, schemaName);

        const result: CallResult = {
          testId: tc.id,
          level: ctx.level,
          runIndex: run,
          emotion: (parsed?.emotion as string) ?? null,
          intensity: (parsed?.intensity as number) ?? null,
          relationshipDelta: null,
          innerThought: (parsed?.innerThought as string) ?? null,
          actionCode: (parsed?.actionCode as string) ?? null,
          latencyMs,
          promptTokenEstimate: tokenEst,
          parseSuccess: parsed !== null,
          rawContent: content,
        };

        // Extract relationship delta for target
        if (parsed?.relationshipDeltas && Array.isArray(parsed.relationshipDeltas)) {
          const deltas = parsed.relationshipDeltas as Array<{ targetId?: string; delta?: number }>;
          const targetDelta = deltas.find(d => d.targetId === tc.targetId);
          if (targetDelta?.delta !== undefined) {
            result.relationshipDelta = targetDelta.delta;
          }
        }

        results.push(result);

        // Progress log
        const statusIcon = result.parseSuccess ? '✅' : '❌';
        const emotionStr = result.emotion ? `${result.emotion}(${result.intensity ?? '?'})` : '?';
        const thoughtPreview = result.innerThought ? result.innerThought.slice(0, 25) : '(empty)';
        const actionStr = result.actionCode ? ` | 行动:${result.actionCode}` : '';
        log('INFO', `[${callIndex}/${totalExpected}] ${tc.id}-L${ctx.level}-R${run + 1} ${statusIcon} ${emotionStr}${actionStr} | ${latencyMs}ms | "${thoughtPreview}"`);
      }
    }
  }

  const endTime = Date.now();

  // Calculate metrics
  log('INFO', '═══════════════ 计算指标 ═══════════════');
  const metrics = calculateMetrics({ results, testCases: TEST_CASES });
  const sweetSpot = findSweetSpot(metrics);

  // Print summary table
  log('INFO', '层级指标汇总:');
  log('INFO', '  Level | 反映率 | 一致率 | 差异率 | 幻觉率 | Tokens | 延迟');
  for (const m of metrics) {
    log('INFO', `  L${m.level}    | ${(m.relationshipReflectionRate * 100).toFixed(0).padStart(4)}%  | ${(m.emotionConsistencyRate * 100).toFixed(0).padStart(4)}%  | ${(m.levelDifferentiationRate * 100).toFixed(0).padStart(4)}%  | ${(m.hallucinationRate * 100).toFixed(0).padStart(4)}%  | ${String(m.avgPromptTokens).padStart(4)}   | ${m.avgLatencyMs}ms`);
  }

  log('INFO', `甜蜜点: L${sweetSpot.level} — ${sweetSpot.reasoning}`);

  // Save raw results
  const rawPath = join(process.cwd(), 'logs', `poc-ij-raw-${timestamp}.json`);
  ensureDir(join(process.cwd(), 'logs'));
  writeFileSync(rawPath, JSON.stringify({
    timestamp: new Date(startTime).toISOString(),
    config: { runsPerLevel, totalCalls: results.length },
    results,
  }, null, 2), 'utf8');
  log('INFO', `原始结果: ${rawPath}`);

  // Save metrics
  const metricsPath = join(process.cwd(), 'logs', `poc-ij-metrics-${timestamp}.json`);
  writeFileSync(metricsPath, JSON.stringify({
    perLevel: metrics,
    sweetSpot,
    tokenBudget: metrics.map(m => ({ level: m.level, avgTokens: m.avgPromptTokens })),
  }, null, 2), 'utf8');
  log('INFO', `指标汇总: ${metricsPath}`);

  // Generate review.md
  const reviewDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc');
  ensureDir(reviewDir);
  const reviewPath = join(reviewDir, 'review.md');
  const reviewContent = generateReviewMarkdown(metrics, sweetSpot, results, TEST_CASES, startTime, endTime);
  writeFileSync(reviewPath, reviewContent, 'utf8');
  log('INFO', `Review 报告: ${reviewPath}`);

  // Save logs
  saveLogs(`poc-ij-${timestamp}`);

  // Final summary
  const durationMin = ((endTime - startTime) / 60000).toFixed(1);
  const parseRate = results.filter(r => r.parseSuccess).length / results.length;
  log('INFO', '═══════════════ 实验完成 ═══════════════');
  log('INFO', `总调用: ${results.length} | 成功率: ${(parseRate * 100).toFixed(0)}% | 耗时: ${durationMin}min`);
  log('INFO', `结论: ${sweetSpot.level >= 3 ? '✅' : sweetSpot.level >= 1 ? '🔶' : '❌'} 甜蜜点 = L${sweetSpot.level}`);

  // Exit code
  if (parseRate < 0.5) {
    log('ERROR', '解析成功率 < 50%，实验数据不可靠');
    process.exit(1);
  }
}

main().catch(err => {
  log('ERROR', `未捕获异常: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
