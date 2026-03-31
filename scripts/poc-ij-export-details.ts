/**
 * Phase IJ-PoC 详细报告导出器
 *
 * 读取原始实验结果，结合 PoC 脚本中的测试用例定义，
 * 生成每个用例的分层级详细报告（完整 prompt + AI 原始响应）。
 *
 * 产出：docs/pipeline/phaseIJ-poc/detail-T{1-5}.md
 *
 * 运行：npx tsx scripts/poc-ij-export-details.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ===== 复用 PoC 脚本中的类型和数据 =====
// (直接内联，避免 import 耦合)

type ContextLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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

interface TestCaseDef {
  id: string;
  type: 'dialogue' | 'decision';
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

interface RawResult {
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

// ===== System instruction (same as PoC script) =====
const SYSTEM_INSTRUCTION = '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。';

// ===== Prompt builder (same logic as PoC script) =====

function buildRelationshipBlock(ctx: RelationshipContext, targetName: string): string {
  if (ctx.level === 0) return '';
  const lines: string[] = [];
  if (ctx.personalExperience) lines.push(`个人经历：${ctx.personalExperience}`);
  if (ctx.affinity !== undefined && ctx.tagLabel) {
    lines.push(`【与${targetName}的关系】好感：${ctx.affinity}（${ctx.tagLabel}）`);
  }
  if (ctx.keyEvents && ctx.keyEvents.length > 0) {
    const evtStr = ctx.keyEvents
      .map(e => `${e.content}(${e.affinityDelta > 0 ? '+' : ''}${e.affinityDelta})`)
      .join('；');
    lines.push(`关键经历：${evtStr}`);
  }
  if (ctx.indirectRelationship) lines.push(`【间接关系】${ctx.indirectRelationship}`);
  if (ctx.extraContext) lines.push(ctx.extraContext);
  return lines.join('\n');
}

function buildPrompt(tc: TestCaseDef, ctx: RelationshipContext): string {
  let identity = `你是修仙宗门弟子「${tc.subjectName}」，性格${tc.personality}。`;
  identity += `道德${tc.moralDesc}。`;
  identity += `你所在的宗门：${tc.sectDesc}。`;
  const relBlock = buildRelationshipBlock(ctx, tc.targetName);
  const eventLine = `刚才发生了：${tc.eventDescription}`;
  const candidateList = tc.candidateEmotions
    .map(e => `${e}(${tc.emotionLabels[e] ?? e})`)
    .join('、');
  const parts = [identity];
  if (relBlock) parts.push(relBlock);
  parts.push(eventLine);
  parts.push('');
  parts.push('你此刻内心的情绪是什么？关系如何变化？');
  parts.push('');
  parts.push(`【候选情绪】（必须从以下情绪中选择一种）：${candidateList}`);
  if (tc.type === 'decision' && tc.actionPool) {
    const actionListDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(' / ');
    parts.push('');
    parts.push(`【候选行动】（必须从以下行动中选择一种）：${actionListDesc}`);
  }
  parts.push('');
  parts.push('请用JSON格式输出你的内心反应。innerThought写你此刻的内心独白（20-30字，第一人称）。');
  return parts.join('\n');
}

function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    if (char.charCodeAt(0) > 0x2E80) count += 1.5;
    else count += 0.25;
  }
  return Math.round(count);
}

// ===== 5 test case definitions (identical to PoC script) =====
const TEST_CASES: TestCaseDef[] = [
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
      { level: 2, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '因争夺破境草翻脸', affinityDelta: -20 }] },
      { level: 3, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '裁决中被掌门判有过', affinityDelta: -15 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }] },
      { level: 4, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '裁决中被掌门判有过', affinityDelta: -15 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }], personalExperience: '筑基突破成功' },
      { level: 5, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '裁决中被掌门判有过', affinityDelta: -15 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }], personalExperience: '筑基突破成功', indirectRelationship: '你的好友王灵均也与李沐阳不合（好感：-30）' },
      { level: 6, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '裁决中被掌门判有过', affinityDelta: -15 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }], personalExperience: '筑基突破成功', indirectRelationship: '你的好友王灵均也与李沐阳不合（好感：-30）', extraContext: '李沐阳曾在宗门大会上嘲笑你资质低下。你在最近一次宗门比试中击败过他，他因此更加记恨你。' },
    ],
  },
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
      { level: 2, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }] },
      { level: 3, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }] },
      { level: 4, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }], personalExperience: '炼气九层圆满，即将突破筑基' },
      { level: 5, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }], personalExperience: '炼气九层圆满，即将突破筑基', indirectRelationship: '你们共同的好友苏瑶也很信任赵铁柱（好感：+55）' },
      { level: 6, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }], personalExperience: '炼气九层圆满，即将突破筑基', indirectRelationship: '你们共同的好友苏瑶也很信任赵铁柱（好感：+55）', extraContext: '赵铁柱曾在你受伤时日夜守护，你们约定将来一起闯荡外域。他最近修炼进展缓慢，你颇为挂念。' },
    ],
  },
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
      { level: 2, affinity: -60, tagLabel: '死对头', keyEvents: [{ content: '争夺破境草时被张清风抢先', affinityDelta: -25 }] },
      { level: 3, affinity: -60, tagLabel: '死对头', keyEvents: [{ content: '争夺破境草时被张清风抢先', affinityDelta: -25 }, { content: '宗门比试中败给张清风', affinityDelta: -20 }, { content: '曾设计暗算张清风被识破', affinityDelta: -15 }] },
      { level: 4, affinity: -60, tagLabel: '死对头', keyEvents: [{ content: '争夺破境草时被张清风抢先', affinityDelta: -25 }, { content: '宗门比试中败给张清风', affinityDelta: -20 }, { content: '曾设计暗算张清风被识破', affinityDelta: -15 }], personalExperience: '炼气九层停滞不前，焦躁不安' },
      { level: 5, affinity: -60, tagLabel: '死对头', keyEvents: [{ content: '争夺破境草时被张清风抢先', affinityDelta: -25 }, { content: '宗门比试中败给张清风', affinityDelta: -20 }, { content: '曾设计暗算张清风被识破', affinityDelta: -15 }], personalExperience: '炼气九层停滞不前，焦躁不安', indirectRelationship: '张清风的好友王灵均也对你抱有敌意（好感：-35）' },
      { level: 6, affinity: -60, tagLabel: '死对头', keyEvents: [{ content: '争夺破境草时被张清风抢先', affinityDelta: -25 }, { content: '宗门比试中败给张清风', affinityDelta: -20 }, { content: '曾设计暗算张清风被识破', affinityDelta: -15 }], personalExperience: '炼气九层停滞不前，焦躁不安', indirectRelationship: '张清风的好友王灵均也对你抱有敌意（好感：-35）', extraContext: '张清风近日筑基成功，实力远超于你。他在宗门中声望日盛，掌门对他颇为器重，这让你更加不甘。' },
    ],
  },
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
      { level: 2, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱', affinityDelta: -30 }] },
      { level: 3, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱', affinityDelta: -30 }, { content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }] },
      { level: 4, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱', affinityDelta: -30 }, { content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }], personalExperience: '筑基突破成功，实力大增' },
      { level: 5, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱', affinityDelta: -30 }, { content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }], personalExperience: '筑基突破成功，实力大增', indirectRelationship: '好友王灵均也被李沐阳陷害过（好感：-30）' },
      { level: 6, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱', affinityDelta: -30 }, { content: '因争夺破境草翻脸', affinityDelta: -20 }, { content: '在灵兽山被其暗算', affinityDelta: -10 }], personalExperience: '筑基突破成功，实力大增', indirectRelationship: '好友王灵均也被李沐阳陷害过（好感：-30）', extraContext: '李沐阳上次在你闭关时散布你的谣言，还试图拉拢你的弟子。宗门长老对此事心知肚明却未处罚他。' },
    ],
  },
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
      { level: 2, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }] },
      { level: 3, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }] },
      { level: 4, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }], personalExperience: '炼气九层圆满，即将突破筑基' },
      { level: 5, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }], personalExperience: '炼气九层圆满，即将突破筑基', indirectRelationship: '共同好友苏瑶也很信任赵铁柱（好感：+55）' },
      { level: 6, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互相帮助突破炼气瓶颈', affinityDelta: 25 }, { content: '共同抵御妖兽袭击', affinityDelta: 20 }, { content: '分享珍贵丹方', affinityDelta: 15 }], personalExperience: '炼气九层圆满，即将突破筑基', indirectRelationship: '共同好友苏瑶也很信任赵铁柱（好感：+55）', extraContext: '赵铁柱曾在你受伤时日夜守护。你们约定将来一起闯荡外域。他最近修炼遇到瓶颈，你一直想找机会帮他。' },
    ],
  },
];

// ===== Main: Generate reports =====

function main(): void {
  // Find latest raw results
  const rawPath = join(process.cwd(), 'logs', 'poc-ij-raw-2026-03-31T14-19-58.json');
  if (!existsSync(rawPath)) {
    console.error(`找不到原始数据: ${rawPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(readFileSync(rawPath, 'utf8')) as {
    config: { runsPerLevel: number };
    results: RawResult[];
  };

  const outDir = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const LEVEL_NAMES: Record<number, string> = {
    0: '无（基线）',
    1: '好感 + 标签',
    2: 'L1 + 1 关键事件',
    3: 'L1 + 3 关键事件',
    4: 'L3 + 个人经历',
    5: 'L4 + 间接关系',
    6: '极限上下文',
  };

  for (const tc of TEST_CASES) {
    const tcResults = rawData.results.filter(r => r.testId === tc.id);
    const lines: string[] = [];

    lines.push(`# ${tc.id} 详细报告 — ${tc.subjectName} ↔ ${tc.targetName}`);
    lines.push('');
    lines.push(`> **类型**：${tc.type === 'dialogue' ? '对话质量（PoC-1）' : '行为决策（PoC-2）'}`);
    lines.push(`> **主体**：${tc.subjectName}（${tc.personality}，${tc.moralDesc}）`);
    lines.push(`> **对象**：${tc.targetName}`);
    lines.push(`> **事件**：${tc.eventDescription}`);
    lines.push(`> **候选情绪**：${tc.candidateEmotions.map(e => `${e}(${tc.emotionLabels[e]})`).join('、')}`);
    if (tc.actionPool) {
      lines.push(`> **候选行动**：${tc.actionPool.map(a => `${a.code}(${a.label})`).join('、')}`);
    }
    lines.push(`> **预期一致情绪**：${tc.consistentEmotions.join(', ')}`);
    if (tc.consistentActions) {
      lines.push(`> **预期一致行动**：${tc.consistentActions.join(', ')}`);
    }
    lines.push('');
    lines.push('---');

    for (const ctx of tc.contexts) {
      const levelResults = tcResults.filter(r => r.level === ctx.level);
      const prompt = buildPrompt(tc, ctx);
      const tokenEst = estimateTokens(prompt);

      lines.push('');
      lines.push(`## L${ctx.level} — ${LEVEL_NAMES[ctx.level]}`);
      lines.push('');
      lines.push(`**预估 Prompt Tokens**：~${tokenEst}`);
      lines.push('');

      // Show what context was injected (delta vs previous level)
      const relBlock = buildRelationshipBlock(ctx, tc.targetName);
      if (ctx.level === 0) {
        lines.push('**注入内容**：无（基线测试）');
      } else {
        lines.push('**注入内容**：');
        lines.push('```');
        lines.push(relBlock);
        lines.push('```');
      }
      lines.push('');

      // Full prompt
      lines.push('<details>');
      lines.push('<summary>完整 Prompt（点击展开）</summary>');
      lines.push('');
      lines.push('**System Message**：');
      lines.push('```');
      lines.push(SYSTEM_INSTRUCTION);
      lines.push('```');
      lines.push('');
      lines.push('**User Message**：');
      lines.push('```');
      lines.push(prompt);
      lines.push('```');
      lines.push('</details>');
      lines.push('');

      // Results table
      const successResults = levelResults.filter(r => r.parseSuccess);
      const failCount = levelResults.filter(r => !r.parseSuccess).length;

      lines.push(`**结果**（${successResults.length} 成功 / ${failCount} 失败）：`);
      lines.push('');

      if (tc.type === 'decision') {
        lines.push('| Run | 情绪 | 强度 | 行动 | 延迟 | innerThought |');
        lines.push('|:---:|:----:|:---:|:----:|:----:|:------------|');
      } else {
        lines.push('| Run | 情绪 | 强度 | 延迟 | innerThought |');
        lines.push('|:---:|:----:|:---:|:----:|:------------|');
      }

      for (const r of levelResults) {
        const runLabel = `R${r.runIndex + 1}`;
        if (!r.parseSuccess) {
          if (tc.type === 'decision') {
            lines.push(`| ${runLabel} | ❌ 解析失败 | — | — | ${r.latencyMs}ms | \`${r.rawContent.slice(0, 50)}...\` |`);
          } else {
            lines.push(`| ${runLabel} | ❌ 解析失败 | — | ${r.latencyMs}ms | \`${r.rawContent.slice(0, 50)}...\` |`);
          }
        } else {
          const emotionIcon = tc.consistentEmotions.includes(r.emotion ?? '') ? '✅' : '⚠️';
          const thought = (r.innerThought ?? '').replace(/\|/g, '\\|');
          if (tc.type === 'decision') {
            const actionIcon = tc.consistentActions?.includes(r.actionCode ?? '') ? '✅' : '⚠️';
            lines.push(`| ${runLabel} | ${emotionIcon} ${r.emotion} | ${r.intensity} | ${actionIcon} ${r.actionCode} | ${r.latencyMs}ms | ${thought} |`);
          } else {
            lines.push(`| ${runLabel} | ${emotionIcon} ${r.emotion} | ${r.intensity} | ${r.latencyMs}ms | ${thought} |`);
          }
        }
      }

      // Raw AI outputs
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>AI 原始输出（点击展开）</summary>');
      lines.push('');
      for (const r of levelResults) {
        lines.push(`**Run ${r.runIndex + 1}**（${r.latencyMs}ms）：`);
        lines.push('```json');
        // Pretty-print if valid JSON, otherwise raw
        try {
          const parsed = JSON.parse(r.rawContent);
          lines.push(JSON.stringify(parsed, null, 2));
        } catch {
          lines.push(r.rawContent || '(empty - parse timeout or server error)');
        }
        lines.push('```');
        lines.push('');
      }
      lines.push('</details>');
      lines.push('');

      // Level summary
      if (successResults.length > 0) {
        const emotionDist = new Map<string, number>();
        const actionDist = new Map<string, number>();
        for (const r of successResults) {
          if (r.emotion) emotionDist.set(r.emotion, (emotionDist.get(r.emotion) ?? 0) + 1);
          if (r.actionCode) actionDist.set(r.actionCode, (actionDist.get(r.actionCode) ?? 0) + 1);
        }
        const emotionStr = [...emotionDist.entries()].map(([e, c]) => `${e}×${c}`).join(', ');
        const consistentCount = successResults.filter(r => tc.consistentEmotions.includes(r.emotion ?? '')).length;
        lines.push(`**本级小结**：情绪分布 [${emotionStr}]，一致率 ${Math.round(consistentCount / successResults.length * 100)}%`);
        if (actionDist.size > 0) {
          const actionStr = [...actionDist.entries()].map(([a, c]) => `${a}×${c}`).join(', ');
          const actionConsistent = tc.consistentActions
            ? successResults.filter(r => tc.consistentActions!.includes(r.actionCode ?? '')).length
            : 0;
          lines.push(`行动分布 [${actionStr}]，一致率 ${Math.round(actionConsistent / successResults.length * 100)}%`);
        }
      }

      lines.push('');
      lines.push('---');
    }

    // Write file
    const filePath = join(outDir, `detail-${tc.id}.md`);
    writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ ${filePath}`);
  }

  console.log('\n所有详细报告已生成。');
}

main();
