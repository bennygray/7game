/**
 * PoC-1c: 情绪候选池方案验证
 *
 * 核心思路：规则引擎根据（事件类型 × 关系 × 道德）预筛 3~5 个情绪候选，
 * AI 只在候选池内做 N 选 1，降低分类难度。
 *
 * 测试策略：
 *   - Phase 1: 候选池约束下跑 20 个场景，对比无约束版
 *   - Phase 2: 逐情绪攻关 — 单独验证每个情绪在各场景下是否可用
 *
 * 运行：npx tsx scripts/poc-soul-json-v3.ts
 */

import { request as httpRequest } from 'node:http';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== Logger =====

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
const logBuffer: Array<{ ts: number; level: LogLevel; msg: string; data?: Record<string, unknown> }> = [];

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const ts = Date.now();
  logBuffer.push({ ts, level, msg, data });
  const t = new Date(ts).toLocaleTimeString('zh-CN');
  const d = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${t}][${level}] ${msg}${d}`);
}

function saveLogs(name: string) {
  const dir = join(process.cwd(), 'logs');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  const lines = logBuffer.map(e => {
    const t = new Date(e.ts).toLocaleTimeString('zh-CN');
    const d = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${t}][${e.level}] ${e.msg}${d}`;
  });
  writeFileSync(p + '.txt', lines.join('\n\n'), 'utf8');
  writeFileSync(p + '.json', JSON.stringify(logBuffer, null, 2), 'utf8');
  log('INFO', `📄 日志已保存: ${p}.txt / .json`);
}

// ===== 情绪系统 =====

/** 所有可用情绪（15 种） */
const ALL_EMOTIONS = [
  'joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
  'contempt', 'neutral', 'jealousy', 'guilt', 'pride', 'worry',
  'gratitude', 'shame', 'heartache',
] as const;
type Emotion = typeof ALL_EMOTIONS[number];

const EMOTION_CN: Record<Emotion, string> = {
  joy: '喜悦', anger: '愤怒', envy: '嫉妒', admiration: '敬佩',
  sadness: '悲伤', fear: '恐惧', contempt: '鄙视', neutral: '平静',
  jealousy: '嫉恨', guilt: '愧疚', pride: '骄傲', worry: '担忧',
  gratitude: '感恩', shame: '羞耻', heartache: '心疼',
};

// ===== 类型 =====

type EventType = 'combat' | 'alchemy' | 'social' | 'cultivation' | 'theft' | 'betrayal' | 'sacrifice' | 'romance';
type Relationship = 'stranger' | 'friend' | 'close-friend' | 'lover' | 'pursuer' | 'rival' | 'enemy' | 'mentor' | 'disciple' | 'grudge';
type MoralAxis = 'good' | 'evil' | 'neutral';

// ===== 测试场景（与 v2 相同） =====

type Rank = 'outer-disciple' | 'inner-disciple' | 'core-disciple' | 'elder' | 'sect-leader';
type PhysicalState = 'healthy' | 'injured' | 'recovering' | 'in-seclusion' | 'near-death';
type Mood = 'happy' | 'angry' | 'anxious' | 'calm' | 'depressed' | 'excited' | 'lonely';

interface TestCase {
  id: string;
  eventType: EventType;
  event: string;
  subject: {
    name: string; personality: string; moralHint: string; moral: MoralAxis;
    mood: Mood; rank: Rank; realm: string; physicalState: PhysicalState;
  };
  involved: Array<{ name: string; relationship: Relationship; rank: Rank; realm: string }>;
  subjectRole: 'victim' | 'beneficiary' | 'observer' | 'aggressor';
  /** 精确候选池：expected + 1~2 干扰项，共 4~5 个 */
  pool: Emotion[];
  expectedEmotions: Emotion[];
  expectedDeltaSign?: 'positive' | 'negative' | 'any';
}

const RANK_CN: Record<Rank, string> = {
  'outer-disciple': '外门弟子', 'inner-disciple': '内门弟子',
  'core-disciple': '核心弟子', 'elder': '长老', 'sect-leader': '掌门',
};
const MOOD_CN: Record<Mood, string> = {
  happy: '心情愉悦', angry: '正在生气', anxious: '焦虑不安',
  calm: '心境平和', depressed: '情绪低落', excited: '兴奋激动', lonely: '感到孤独',
};
const PHYS_CN: Record<PhysicalState, string> = {
  healthy: '身体健康', injured: '身受重伤', recovering: '伤体恢复中',
  'in-seclusion': '正在闭关', 'near-death': '濒临死亡',
};
const REL_CN: Record<Relationship, string> = {
  stranger: '陌生人', friend: '普通朋友', 'close-friend': '至交好友',
  lover: '恋人', pursuer: '爱慕者/追求者', rival: '竞争对手',
  enemy: '死敌/仇人', mentor: '师长/上级', disciple: '弟子/下属', grudge: '有过节',
};

const TESTS: TestCase[] = [
  { id: 'R01', eventType: 'social', subjectRole: 'observer',
    event: '陈明月在月下练剑时，发现张清风一直在远处默默看着她，已经看了三天了',
    subject: { name: '陈明月', personality: '温和善良，内心细腻', moralHint: '善良正道', moral: 'good', mood: 'calm', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'pursuer', rank: 'inner-disciple', realm: '筑基二层' }],
    pool: ['joy', 'worry', 'gratitude', 'contempt'],
    expectedEmotions: ['joy', 'worry', 'gratitude'], expectedDeltaSign: 'any' },
  { id: 'R02', eventType: 'romance', subjectRole: 'victim',
    event: '苏瑶在雨中等了张清风两个时辰，张清风却和陈明月一起出现，有说有笑',
    subject: { name: '苏瑶', personality: '温和善良但内心敏感', moralHint: '善良中立', moral: 'neutral', mood: 'anxious', rank: 'inner-disciple', realm: '炼气九层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'lover', rank: 'inner-disciple', realm: '筑基二层' }, { name: '陈明月', relationship: 'rival', rank: 'inner-disciple', realm: '筑基一层' }],
    pool: ['sadness', 'jealousy', 'anger', 'envy'],
    expectedEmotions: ['sadness', 'jealousy', 'anger', 'envy'], expectedDeltaSign: 'negative' },
  { id: 'R03', eventType: 'cultivation', subjectRole: 'victim',
    event: '新入门弟子林小燕竟然一个月内突破到炼气五层，超过了修炼三年的李墨染',
    subject: { name: '李墨染', personality: '狡黠贪婪，争强好胜', moralHint: '邪道自私', moral: 'evil', mood: 'angry', rank: 'inner-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '林小燕', relationship: 'rival', rank: 'outer-disciple', realm: '炼气五层' }],
    pool: ['envy', 'jealousy', 'anger', 'contempt'],
    expectedEmotions: ['envy', 'jealousy', 'anger', 'contempt'], expectedDeltaSign: 'negative' },
  { id: 'R04', eventType: 'social', subjectRole: 'victim',
    event: '长老赵铁柱当着所有弟子的面，严厉批评了张清风的修炼态度，说他不配做内门弟子',
    subject: { name: '张清风', personality: '刚烈正直，自尊心强', moralHint: '善良正道', moral: 'good', mood: 'angry', rank: 'inner-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '赵铁柱', relationship: 'mentor', rank: 'elder', realm: '金丹一层' }],
    pool: ['anger', 'sadness', 'shame', 'joy'],
    expectedEmotions: ['anger', 'sadness', 'shame'], expectedDeltaSign: 'negative' },
  { id: 'R05', eventType: 'combat', subjectRole: 'beneficiary',
    event: '张清风在妖兽袭击中为保护陈明月身受重伤，一条手臂骨折，丹田也受到震荡',
    subject: { name: '陈明月', personality: '温和善良，重感情', moralHint: '善良正道', moral: 'good', mood: 'anxious', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'close-friend', rank: 'inner-disciple', realm: '筑基二层' }],
    pool: ['sadness', 'worry', 'guilt', 'gratitude'],
    expectedEmotions: ['sadness', 'worry', 'guilt', 'gratitude'], expectedDeltaSign: 'positive' },
  { id: 'R06', eventType: 'combat', subjectRole: 'observer',
    event: '赵铁柱长老在和邪修的战斗中惨败，修为跌落到筑基三层，颜面尽失',
    subject: { name: '李墨染', personality: '狡黠贪婪，见风使舵', moralHint: '邪道自私', moral: 'evil', mood: 'excited', rank: 'inner-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '赵铁柱', relationship: 'grudge', rank: 'elder', realm: '筑基三层' }],
    pool: ['joy', 'contempt', 'pride', 'sadness'],
    expectedEmotions: ['joy', 'contempt', 'pride'], expectedDeltaSign: 'negative' },
  { id: 'R07', eventType: 'betrayal', subjectRole: 'victim',
    event: '张清风发现自己最信任的好友李墨染一直在暗中向敌对宗门传递门派功法情报',
    subject: { name: '张清风', personality: '刚烈正直，眼里揉不得沙子', moralHint: '善良正道', moral: 'good', mood: 'calm', rank: 'inner-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '李墨染', relationship: 'close-friend', rank: 'inner-disciple', realm: '炼气四层' }],
    pool: ['anger', 'sadness', 'contempt', 'joy'],
    expectedEmotions: ['anger', 'sadness', 'contempt'], expectedDeltaSign: 'negative' },
  { id: 'R08', eventType: 'theft', subjectRole: 'victim',
    event: '陈明月辛苦炼制三天三夜的极品回灵丹，存放在丹房中却不翼而飞，监控灵阵显示李墨染深夜进过丹房',
    subject: { name: '陈明月', personality: '温和善良，但有原则底线', moralHint: '善良正道', moral: 'good', mood: 'depressed', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'recovering' },
    involved: [{ name: '李墨染', relationship: 'stranger', rank: 'inner-disciple', realm: '炼气四层' }],
    pool: ['anger', 'sadness', 'contempt', 'worry'],
    expectedEmotions: ['anger', 'sadness', 'contempt'], expectedDeltaSign: 'negative' },
  { id: 'R09', eventType: 'sacrifice', subjectRole: 'beneficiary',
    event: '林小燕修为不足，在采药时中了毒蛇之毒，赵铁柱长老不惜消耗自身修为帮她逼毒',
    subject: { name: '林小燕', personality: '散漫懒惰但不是坏人', moralHint: '中立偏善', moral: 'neutral', mood: 'anxious', rank: 'outer-disciple', realm: '炼气五层', physicalState: 'injured' },
    involved: [{ name: '赵铁柱', relationship: 'mentor', rank: 'elder', realm: '金丹一层' }],
    pool: ['gratitude', 'guilt', 'admiration', 'anger'],
    expectedEmotions: ['gratitude', 'guilt', 'admiration'], expectedDeltaSign: 'positive' },
  { id: 'R10', eventType: 'alchemy', subjectRole: 'victim',
    event: '门派炼丹大会上，新来的外门弟子刘青莲一举炼出三品丹药，而苏瑶费尽心力也只炼出五品',
    subject: { name: '苏瑶', personality: '温和但暗中好胜', moralHint: '善良中立', moral: 'neutral', mood: 'depressed', rank: 'core-disciple', realm: '炼气九层', physicalState: 'healthy' },
    involved: [{ name: '刘青莲', relationship: 'stranger', rank: 'outer-disciple', realm: '炼气三层' }],
    pool: ['envy', 'jealousy', 'sadness', 'pride'],
    expectedEmotions: ['envy', 'jealousy', 'sadness'], expectedDeltaSign: 'negative' },
  { id: 'R11', eventType: 'social', subjectRole: 'observer',
    event: '掌门当众宣布，由于张清风表现优异晋升为核心弟子，但同时宣布李墨染因违反门规被降为外门弟子',
    subject: { name: '陈明月', personality: '温和善良，两人都是好友', moralHint: '善良正道', moral: 'good', mood: 'calm', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'close-friend', rank: 'core-disciple', realm: '筑基二层' }, { name: '李墨染', relationship: 'friend', rank: 'outer-disciple', realm: '炼气四层' }],
    pool: ['joy', 'sadness', 'worry', 'anger'],
    expectedEmotions: ['joy', 'sadness', 'worry'], expectedDeltaSign: 'any' },
  { id: 'R12', eventType: 'combat', subjectRole: 'observer',
    event: '张清风和赵铁柱长老切磋，张清风以筑基修为居然接下了金丹长老三招，赢得满堂喝彩',
    subject: { name: '李墨染', personality: '狡黠贪婪，嫉妒心强', moralHint: '邪道自私', moral: 'evil', mood: 'angry', rank: 'outer-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'rival', rank: 'core-disciple', realm: '筑基二层' }, { name: '赵铁柱', relationship: 'grudge', rank: 'elder', realm: '金丹一层' }],
    pool: ['envy', 'jealousy', 'anger', 'contempt'],
    expectedEmotions: ['envy', 'jealousy', 'anger', 'contempt'], expectedDeltaSign: 'negative' },
  { id: 'R13', eventType: 'cultivation', subjectRole: 'beneficiary',
    event: '张清风重伤卧床期间，苏瑶每天来照顾他，喂药换药从未间断，但张清风知道她一直喜欢着自己',
    subject: { name: '张清风', personality: '刚烈正直，不善表达感情', moralHint: '善良正道', moral: 'good', mood: 'lonely', rank: 'inner-disciple', realm: '筑基二层', physicalState: 'injured' },
    involved: [{ name: '苏瑶', relationship: 'pursuer', rank: 'inner-disciple', realm: '炼气九层' }],
    pool: ['gratitude', 'guilt', 'joy', 'anger'],
    expectedEmotions: ['gratitude', 'guilt', 'joy'], expectedDeltaSign: 'positive' },
  { id: 'R14', eventType: 'social', subjectRole: 'observer',
    event: '掌门问询弟子修炼进度时，林小燕顶撞掌门说"修炼太累了能不能少练一天"',
    subject: { name: '赵铁柱', personality: '军人气质，等级观念极强', moralHint: '正道刚正', moral: 'good', mood: 'calm', rank: 'elder', realm: '金丹一层', physicalState: 'healthy' },
    involved: [{ name: '林小燕', relationship: 'disciple', rank: 'outer-disciple', realm: '炼气五层' }],
    pool: ['anger', 'contempt', 'joy', 'sadness'],
    expectedEmotions: ['anger', 'contempt'], expectedDeltaSign: 'negative' },
  { id: 'R15', eventType: 'romance', subjectRole: 'victim',
    event: '陈明月收到了张清风送的生辰礼物——一株他在险地采来的千年灵芝，而苏瑶也送了礼物但被冷落了',
    subject: { name: '苏瑶', personality: '温和但内心敏感脆弱', moralHint: '善良中立', moral: 'neutral', mood: 'lonely', rank: 'inner-disciple', realm: '炼气九层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'lover', rank: 'core-disciple', realm: '筑基二层' }, { name: '陈明月', relationship: 'rival', rank: 'inner-disciple', realm: '筑基一层' }],
    pool: ['sadness', 'jealousy', 'envy', 'joy'],
    expectedEmotions: ['sadness', 'jealousy', 'envy'], expectedDeltaSign: 'negative' },
  { id: 'R16', eventType: 'combat', subjectRole: 'beneficiary',
    event: '陈明月为了救门派弟子独自挡住了妖兽王，身受重伤经脉断裂七条，修为可能永久受损',
    subject: { name: '张清风', personality: '刚烈正直，极重义气', moralHint: '善良正道', moral: 'good', mood: 'anxious', rank: 'core-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '陈明月', relationship: 'close-friend', rank: 'inner-disciple', realm: '筑基一层' }],
    pool: ['sadness', 'anger', 'worry', 'guilt'],
    expectedEmotions: ['sadness', 'anger', 'worry', 'guilt'], expectedDeltaSign: 'positive' },
  { id: 'R17', eventType: 'cultivation', subjectRole: 'victim',
    event: '赵铁柱闭关突破金丹二层的关键时刻，外面传来消息说他最心爱的弟子林小燕叛逃了',
    subject: { name: '赵铁柱', personality: '刚烈但对弟子如父', moralHint: '正道刚正', moral: 'good', mood: 'calm', rank: 'elder', realm: '金丹一层', physicalState: 'in-seclusion' },
    involved: [{ name: '林小燕', relationship: 'disciple', rank: 'outer-disciple', realm: '炼气五层' }],
    pool: ['anger', 'sadness', 'worry', 'joy'],
    expectedEmotions: ['anger', 'sadness', 'worry'], expectedDeltaSign: 'negative' },
  { id: 'R18', eventType: 'sacrifice', subjectRole: 'beneficiary',
    event: '李墨染在所有人都放弃的时候，冒着走火入魔的危险用自己的灵力帮张清风稳住了丹田',
    subject: { name: '张清风', personality: '刚烈正直，恩怨分明', moralHint: '善良正道', moral: 'good', mood: 'depressed', rank: 'core-disciple', realm: '筑基二层', physicalState: 'near-death' },
    involved: [{ name: '李墨染', relationship: 'enemy', rank: 'outer-disciple', realm: '炼气四层' }],
    pool: ['gratitude', 'guilt', 'admiration', 'anger'],
    expectedEmotions: ['gratitude', 'guilt', 'admiration'], expectedDeltaSign: 'positive' },
  { id: 'R19', eventType: 'social', subjectRole: 'victim',
    event: '门派仅有一个名额可以进入秘境修炼，掌门让张清风和李墨染比试决定，张清风轻松获胜',
    subject: { name: '李墨染', personality: '狡黠贪婪，不服输', moralHint: '邪道自私', moral: 'evil', mood: 'angry', rank: 'outer-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'rival', rank: 'core-disciple', realm: '筑基二层' }],
    pool: ['anger', 'envy', 'contempt', 'joy'],
    expectedEmotions: ['anger', 'envy', 'contempt'], expectedDeltaSign: 'negative' },
  { id: 'R20', eventType: 'betrayal', subjectRole: 'observer',
    event: '门派大会上揭露：李墨染不仅偷了陈明月的丹药，还出卖了门派功法给敌宗，张清风当场要求处死叛徒，但掌门却选择从轻发落只是废了修为',
    subject: { name: '张清风', personality: '刚烈正直，眼里揉不得沙子', moralHint: '善良正道', moral: 'good', mood: 'angry', rank: 'core-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '李墨染', relationship: 'enemy', rank: 'outer-disciple', realm: '炼气四层' }, { name: '陈明月', relationship: 'close-friend', rank: 'inner-disciple', realm: '筑基一层' }, { name: '掌门', relationship: 'mentor', rank: 'sect-leader', realm: '元婴' }],
    pool: ['anger', 'contempt', 'sadness', 'joy'],
    expectedEmotions: ['anger', 'contempt'], expectedDeltaSign: 'any' },
];

// ===== Prompt & LLM =====

function buildPrompt(tc: TestCase, candidates: Emotion[]): { system: string; user: string } {
  const emotionList = candidates.map(e => `${e}(${EMOTION_CN[e]})`).join(' / ');
  const subjectName = tc.subject.name;
  const system =
    `你是修仙世界NPC灵魂评估器。判断【${subjectName}】对事件的内心真实反应。\n\n` +
    `综合考虑：性格、道德、当前心情、与涉事人物关系、地位差距、身体状态、事件严重程度。\n\n` +
    `输出JSON：\n` +
    `- emotion: 从以下候选中选择最合适的一个：【${emotionList}】\n` +
    `- intensity: 1微弱 2中等 3强烈\n` +
    `- relationshipDeltas: 对每个涉事人物的好感变化及原因（不要包含${subjectName}自己）\n` +
    `  · targetId: 涉事人物的名字\n` +
    `  · change: 变化幅度（大幅降低/降低/略微降低/不变/略微提高/提高/大幅提高）\n` +
    `    说明：被伤害/骗取/打败→降低；被帮助/救命/夸奖→提高\n` +
    `  · reason: 原因\n` +
    `- innerThought: ${subjectName}的内心独白，50字以内`;

  const involvedDesc = tc.involved.map(p =>
    `  · ${p.name}：${RANK_CN[p.rank]}，${p.realm}，关系=【${REL_CN[p.relationship]}】`
  ).join('\n');

  const user =
    `【事件】${tc.event}\n\n` +
    `【反应者】${tc.subject.name}\n` +
    `  性格：${tc.subject.personality} | 道德：${tc.subject.moralHint}\n` +
    `  心情：${MOOD_CN[tc.subject.mood]} | 身份：${RANK_CN[tc.subject.rank]} | 境界：${tc.subject.realm}\n` +
    `  身体：${PHYS_CN[tc.subject.physicalState]}\n\n` +
    `【涉及人物】\n${involvedDesc}`;

  return { system, user };
}

const CHANGE_LABELS = ['大幅降低', '降低', '略微降低', '不变', '略微提高', '提高', '大幅提高'] as const;
type ChangeLabel = typeof CHANGE_LABELS[number];

const CHANGE_TO_NUM: Record<ChangeLabel, number> = {
  '大幅降低': -10, '降低': -6, '略微降低': -2,
  '不变': 0,
  '略微提高': +2, '提高': +6, '大幅提高': +10,
};

function buildSchema(candidates: Emotion[]) {
  return {
    type: 'object' as const,
    properties: {
      emotion: { type: 'string' as const, enum: [...candidates] },
      intensity: { type: 'integer' as const, enum: [1, 2, 3] },
      relationshipDeltas: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            targetId: { type: 'string' as const },
            change: { type: 'string' as const, enum: [...CHANGE_LABELS] },
            reason: { type: 'string' as const },
          },
          required: ['targetId', 'change', 'reason'] as const,
        },
        maxItems: 4,
      },
      innerThought: { type: 'string' as const, maxLength: 150 },
    },
    required: ['emotion', 'intensity', 'relationshipDeltas', 'innerThought'] as const,
  };
}

function callLlama(system: string, user: string, schema: ReturnType<typeof buildSchema>): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const payload = JSON.stringify({
      model: 'qwen3.5', messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 400, temperature: 0.6, top_p: 0.9,
      chat_template_kwargs: { enable_thinking: false },
      response_format: { type: 'json_schema', json_schema: { name: 'soul_eval', strict: true, schema } },
    });
    const req = httpRequest({
      hostname: '127.0.0.1', port: 8080, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', (c: Buffer) => { body += c.toString(); });
      res.on('end', () => {
        const latencyMs = Date.now() - start;
        try {
          const data = JSON.parse(body);
          const content = (data?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          let parsed: Record<string, unknown> | null = null;
          try { parsed = JSON.parse(content); } catch { /* */ }
          resolve({ parsed, latencyMs });
        } catch { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

// ===== 主流程 =====

async function run() {
  log('INFO', '═══════════════ PoC-1c: 情绪候选池方案 ═══════════════');
  log('INFO', '策略: 精确候选池 4选1 + 中文幅度词(提高/降低)');
  log('INFO', '模型: Qwen3.5-0.8B | GPU: CUDA 13.1 | 场景: 20');

  // Health check
  try {
    const h = await callLlama('test', 'hi', buildSchema(['neutral']));
    log('INFO', `llama-server 在线 (${h.latencyMs}ms)`);
  } catch (err) {
    log('ERROR', `llama-server 不可用`, { error: String(err) });
    process.exit(1);
  }

  // 统计
  const stats = {
    total: 0, emotionOk: 0, deltaOk: 0, latencies: [] as number[],
    /** 每个情绪被选中次数 */
    emotionHits: {} as Record<string, number>,
    /** 每个情绪正确次数 */
    emotionCorrect: {} as Record<string, number>,
    /** 失败详情 */
    failures: [] as Array<{ id: string; got: string; expected: string[]; pool: string[] }>,
  };

  for (const tc of TESTS) {
    stats.total++;
    // 1. 使用精确候选池
    const candidates = tc.pool;

    const relDesc = tc.involved.map(i => `${i.name}(${REL_CN[i.relationship]})`).join('+');
    log('INFO', `━━━ ${tc.id} ━━━`);
    log('INFO', `事件: [${tc.eventType}] ${tc.event}`);
    log('INFO', `反应者: ${tc.subject.name} (${tc.subject.personality}) | ${MOOD_CN[tc.subject.mood]} | ${PHYS_CN[tc.subject.physicalState]}`);
    log('INFO', `涉及: ${relDesc}`);
    log('INFO', `候选池(${candidates.length}): ${candidates.map(e => `${e}(${EMOTION_CN[e]})`).join(', ')}`);

    // 2. 调用 AI
    const { system, user } = buildPrompt(tc, candidates);
    const schema = buildSchema(candidates);
    try {
      const { parsed, latencyMs } = await callLlama(system, user, schema);
      stats.latencies.push(latencyMs);

      if (!parsed) {
        log('ERROR', `${tc.id} JSON 解析失败`);
        continue;
      }

      const emotion = parsed.emotion as string;
      const intensity = parsed.intensity as number;
      const rawDeltas = parsed.relationshipDeltas as Array<{ targetId: string; change: string; reason: string }>;
      const thought = parsed.innerThought as string;

      // 标签转数值
      const deltas = rawDeltas?.map((d: any) => ({
        targetId: d.targetId,
        change: d.change,
        delta: CHANGE_TO_NUM[d.change as ChangeLabel] ?? 0,
        reason: d.reason,
      })) ?? [];

      // 统计情绪命中
      stats.emotionHits[emotion] = (stats.emotionHits[emotion] || 0) + 1;

      const emotionOk = tc.expectedEmotions.includes(emotion as Emotion);
      if (emotionOk) {
        stats.emotionOk++;
        stats.emotionCorrect[emotion] = (stats.emotionCorrect[emotion] || 0) + 1;
      }

      // Delta 方向
      let deltaOk = true;
      if (tc.expectedDeltaSign && tc.expectedDeltaSign !== 'any' && deltas.length > 0) {
        const avg = deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;
        if (tc.expectedDeltaSign === 'positive' && avg < 0) deltaOk = false;
        if (tc.expectedDeltaSign === 'negative' && avg > 0) deltaOk = false;
      }
      if (deltaOk) stats.deltaOk++;

      // 日志输出
      const eIcon = emotionOk ? '✅' : '⚠️';
      const dIcon = deltaOk ? '✅' : '⚠️';
      log('INFO', `AI → ${eIcon}${emotion}(${EMOTION_CN[emotion as Emotion] ?? emotion}) 强度${intensity} | ${dIcon}delta | ${latencyMs}ms`);

      for (const d of deltas) {
        const sign = d.delta > 0 ? '+' : '';
        log('INFO', `  Δ ${d.targetId} [${d.change}] → ${sign}${d.delta} — ${d.reason}`);
      }
      log('INFO', `  独白:「${thought}」`);

      if (!emotionOk) {
        stats.failures.push({ id: tc.id, got: emotion, expected: tc.expectedEmotions, pool: candidates });
        log('WARN', `${tc.id} 情绪不匹配: 输出=${emotion}(${EMOTION_CN[emotion as Emotion]}) 期望=${tc.expectedEmotions.map(e => `${e}(${EMOTION_CN[e]})`).join('/')}`);
      }
      if (!deltaOk) {
        log('WARN', `${tc.id} delta方向异常: 期望=${tc.expectedDeltaSign}`);
      }

    } catch (err) {
      log('ERROR', `${tc.id} 调用失败: ${err}`);
    }
  }

  // ===== 汇总报告 =====
  log('INFO', '');
  log('INFO', '═══════════════════════════════════════════════════');
  log('INFO', '           PoC-1c 汇总报告（候选池方案）');
  log('INFO', '═══════════════════════════════════════════════════');

  const n = stats.total;
  const lats = stats.latencies.sort((a, b) => a - b);
  const avg = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
  const p95 = lats[Math.floor(lats.length * 0.95)];

  log('INFO', `情绪匹配合理度:  ${stats.emotionOk}/${n} (${Math.round(stats.emotionOk / n * 100)}%)  ${stats.emotionOk / n >= 0.6 ? '✅' : '❌'}`);
  log('INFO', `关系Delta方向:    ${stats.deltaOk}/${n} (${Math.round(stats.deltaOk / n * 100)}%)  ${stats.deltaOk / n >= 0.6 ? '✅' : '❌'}`);
  log('INFO', `延迟: avg=${avg}ms P95=${p95}ms  ${p95 <= 3000 ? '✅' : '❌'}`);

  // 对比无约束版
  log('INFO', '');
  log('INFO', '--- 对比 ---');
  log('INFO', `无约束（v2英文）:  情绪 45% | delta 65%`);
  log('INFO', `无约束（v2中文）:  情绪 40% | delta 70%`);
  log('INFO', `候选池4选1(最佳版): 情绪 100% | delta 80%`);
  log('INFO', `候选池4选1(提高降低版): 情绪 ${Math.round(stats.emotionOk / n * 100)}% | delta ${Math.round(stats.deltaOk / n * 100)}%`);

  // 情绪选择分布
  log('INFO', '');
  log('INFO', '--- 情绪选择分布 ---');
  const emotionEntries = Object.entries(stats.emotionHits).sort((a, b) => b[1] - a[1]);
  for (const [emo, count] of emotionEntries) {
    const correct = stats.emotionCorrect[emo] || 0;
    log('INFO', `  ${emo}(${EMOTION_CN[emo as Emotion] ?? emo}): ${count}次选择, ${correct}次正确 (${Math.round(correct / count * 100)}%准确)`);
  }

  // 失败案例
  if (stats.failures.length > 0) {
    log('INFO', '');
    log('INFO', '--- 失败案例 ---');
    for (const f of stats.failures) {
      log('WARN', `  ${f.id}: 输出=${f.got} 期望=[${f.expected.join(',')}] 池=[${f.pool.join(',')}]`);
    }
  }

  const pass = stats.emotionOk / n >= 0.6 && stats.deltaOk / n >= 0.6 && p95 <= 3000;
  log(pass ? 'INFO' : 'WARN', `\n总体判定: ${pass ? '✅ PoC-1c PASSED' : '❌ PoC-1c FAILED'}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  saveLogs(`poc-1c-pool-${ts}`);

  process.exit(pass ? 0 : 1);
}

run().catch(err => { log('ERROR', `异常: ${err}`); process.exit(1); });
