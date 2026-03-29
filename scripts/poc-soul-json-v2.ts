/**
 * PoC-1b v2: AI 结构化 JSON 输出 — 高复杂度版（带结构化日志）
 *
 * 使用项目 GameLogger 格式输出详细日志到文件，方便可视化审阅。
 * 输出文件：logs/poc-1b-<timestamp>.log
 *
 * 运行：npx tsx scripts/poc-soul-json-v2.ts
 */

import { request as httpRequest } from 'node:http';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ===== 简化的 Node Logger（兼容 GameLogger 格式） =====

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogCategory = 'AI' | 'ENGINE' | 'SYSTEM';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

const logBuffer: LogEntry[] = [];

function log(level: LogLevel, cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>) {
  const entry: LogEntry = { timestamp: Date.now(), level, category: cat, source: src, message: msg, ...(data ? { data } : {}) };
  logBuffer.push(entry);
  // 同步输出到 console（与 GameLogger 行为一致）
  const ts = new Date(entry.timestamp).toLocaleTimeString('zh-CN');
  const prefix = `[${ts}][${level}][${cat}][${src}]`;
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`${prefix} ${msg}${dataStr}`);
}

function saveLogs(filename: string) {
  const dir = join(process.cwd(), 'logs');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);

  // 两种格式：JSON 用于程序读取，TXT 用于人类审阅
  writeFileSync(path + '.json', JSON.stringify(logBuffer, null, 2), 'utf8');

  const lines = logBuffer.map(e => {
    const ts = new Date(e.timestamp).toLocaleTimeString('zh-CN');
    const dataStr = e.data ? `\n    ${JSON.stringify(e.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${ts}][${e.level}][${e.category}][${e.source}] ${e.message}${dataStr}`;
  });
  writeFileSync(path + '.txt', lines.join('\n\n'), 'utf8');

  console.log(`\n📄 日志已保存:`);
  console.log(`   结构化: ${path}.json`);
  console.log(`   可读版: ${path}.txt`);
}

// ===== 类型 =====

type EmotionTag = '喜悦' | '愤怒' | '嫉妒' | '敬佩' | '悲伤' | '恐惧'
  | '鄙视' | '平静' | '嫉恨' | '愧疚' | '骄傲' | '担忧'
  | '感动' | '委屈' | '心疼';

interface SoulEvaluationResult {
  emotion: EmotionTag;
  intensity: 1 | 2 | 3;
  relationshipDeltas: Array<{ targetId: string; delta: number; reason: string }>;
  behaviorBias?: { behavior: string; weight: number };
  innerThought: string;
}

// ===== JSON Schema =====

const SOUL_EVAL_SCHEMA = {
  type: 'object' as const,
  properties: {
    emotion: {
      type: 'string' as const,
      enum: ['喜悦', '愤怒', '嫉妒', '敬佩', '悲伤', '恐惧',
        '鄙视', '平静', '嫉恨', '愧疚', '骄傲', '担忧',
        '感动', '委屈', '心疼'],
    },
    intensity: { type: 'integer' as const, enum: [1, 2, 3] },
    relationshipDeltas: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          targetId: { type: 'string' as const },
          delta: { type: 'integer' as const, minimum: -10, maximum: 10 },
          reason: { type: 'string' as const },
        },
        required: ['targetId', 'delta', 'reason'],
      },
      maxItems: 4,
    },
    behaviorBias: {
      type: 'object' as const,
      properties: {
        behavior: { type: 'string' as const },
        weight: { type: 'number' as const },
      },
      required: ['behavior', 'weight'],
    },
    innerThought: { type: 'string' as const, maxLength: 150 },
  },
  required: ['emotion', 'intensity', 'relationshipDeltas', 'innerThought'],
};

// ===== 测试场景 =====

type Relationship = 'stranger' | 'friend' | 'close-friend' | 'lover' | 'pursuer'
  | 'rival' | 'enemy' | 'mentor' | 'disciple' | 'grudge';
type Rank = 'outer-disciple' | 'inner-disciple' | 'core-disciple' | 'elder' | 'sect-leader';
type PhysicalState = 'healthy' | 'injured' | 'recovering' | 'in-seclusion' | 'near-death';
type Mood = 'happy' | 'angry' | 'anxious' | 'calm' | 'depressed' | 'excited' | 'lonely';
type EventType = 'combat' | 'alchemy' | 'social' | 'cultivation' | 'theft' | 'betrayal' | 'sacrifice' | 'romance';

interface RichTestCase {
  id: string;
  eventType: EventType;
  event: string;
  subject: {
    name: string; personality: string; moralHint: string;
    mood: Mood; rank: Rank; realm: string; physicalState: PhysicalState;
  };
  involved: Array<{ name: string; relationship: Relationship; rank: Rank; realm: string }>;
  expectedEmotionHints: EmotionTag[];
  expectedDeltaSign?: 'positive' | 'negative' | 'any';
}

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  'stranger': '陌生人', 'friend': '普通朋友', 'close-friend': '至交好友',
  'lover': '恋人', 'pursuer': '爱慕者/追求者', 'rival': '竞争对手',
  'enemy': '死敌/仇人', 'mentor': '师长/上级', 'disciple': '弟子/下属', 'grudge': '有过节',
};
const RANK_LABELS: Record<Rank, string> = {
  'outer-disciple': '外门弟子', 'inner-disciple': '内门弟子',
  'core-disciple': '核心弟子', 'elder': '长老', 'sect-leader': '掌门',
};
const MOOD_LABELS: Record<Mood, string> = {
  'happy': '心情愉悦', 'angry': '正在生气', 'anxious': '焦虑不安',
  'calm': '心境平和', 'depressed': '情绪低落', 'excited': '兴奋激动', 'lonely': '感到孤独',
};
const PHYSICAL_LABELS: Record<PhysicalState, string> = {
  'healthy': '身体健康', 'injured': '身受重伤', 'recovering': '伤体恢复中',
  'in-seclusion': '正在闭关', 'near-death': '濒临死亡',
};

const TEST_CASES: RichTestCase[] = [
  {
    id: 'R01', eventType: 'social',
    event: '陈明月在月下练剑时，发现张清风一直在远处默默看着她，已经看了三天了',
    subject: { name: '陈明月', personality: '温和善良，内心细腻', moralHint: '善良正道', mood: 'calm', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'pursuer', rank: 'inner-disciple', realm: '筑基二层' }],
    expectedEmotionHints: ['喜悦', '担忧', '平静', '感动'], expectedDeltaSign: 'any',
  },
  {
    id: 'R02', eventType: 'romance',
    event: '苏瑶在雨中等了张清风两个时辰，张清风却和陈明月一起出现，有说有笑',
    subject: { name: '苏瑶', personality: '温和善良但内心敏感', moralHint: '善良中立', mood: 'anxious', rank: 'inner-disciple', realm: '炼气九层', physicalState: 'healthy' },
    involved: [
      { name: '张清风', relationship: 'lover', rank: 'inner-disciple', realm: '筑基二层' },
      { name: '陈明月', relationship: 'rival', rank: 'inner-disciple', realm: '筑基一层' },
    ],
    expectedEmotionHints: ['悲伤', '嫉妒', '愤怒', '委屈'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R03', eventType: 'cultivation',
    event: '新入门弟子林小燕竟然一个月内突破到炼气五层，超过了修炼三年的李墨染',
    subject: { name: '李墨染', personality: '狡黠贪婪，争强好胜', moralHint: '邪道自私', mood: 'angry', rank: 'inner-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '林小燕', relationship: 'rival', rank: 'outer-disciple', realm: '炼气五层' }],
    expectedEmotionHints: ['嫉妒', '嫉恨', '愤怒', '鄙视'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R04', eventType: 'social',
    event: '长老赵铁柱当着所有弟子的面，严厉批评了张清风的修炼态度，说他不配做内门弟子',
    subject: { name: '张清风', personality: '刚烈正直，自尊心强', moralHint: '善良正道', mood: 'angry', rank: 'inner-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '赵铁柱', relationship: 'mentor', rank: 'elder', realm: '金丹一层' }],
    expectedEmotionHints: ['愤怒', '悲伤', '委屈', '鄙视'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R05', eventType: 'combat',
    event: '张清风在妖兽袭击中为保护陈明月身受重伤，一条手臂骨折，丹田也受到震荡',
    subject: { name: '陈明月', personality: '温和善良，重感情', moralHint: '善良正道', mood: 'anxious', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'close-friend', rank: 'inner-disciple', realm: '筑基二层' }],
    expectedEmotionHints: ['悲伤', '担忧', '愧疚', '感动', '心疼'], expectedDeltaSign: 'positive',
  },
  {
    id: 'R06', eventType: 'combat',
    event: '赵铁柱长老在和邪修的战斗中惨败，修为跌落到筑基三层，颜面尽失',
    subject: { name: '李墨染', personality: '狡黠贪婪，见风使舵', moralHint: '邪道自私', mood: 'excited', rank: 'inner-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '赵铁柱', relationship: 'grudge', rank: 'elder', realm: '筑基三层（原金丹）' }],
    expectedEmotionHints: ['喜悦', '鄙视', '骄傲'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R07', eventType: 'betrayal',
    event: '张清风发现自己最信任的好友李墨染一直在暗中向敌对宗门传递门派功法情报',
    subject: { name: '张清风', personality: '刚烈正直，眼里揉不得沙子', moralHint: '善良正道', mood: 'calm', rank: 'inner-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '李墨染', relationship: 'close-friend', rank: 'inner-disciple', realm: '炼气四层' }],
    expectedEmotionHints: ['愤怒', '悲伤', '鄙视'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R08', eventType: 'theft',
    event: '陈明月辛苦炼制三天三夜的极品回灵丹，存放在丹房中却不翼而飞，监控灵阵显示李墨染深夜进过丹房',
    subject: { name: '陈明月', personality: '温和善良，但有原则底线', moralHint: '善良正道', mood: 'depressed', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'recovering' },
    involved: [{ name: '李墨染', relationship: 'stranger', rank: 'inner-disciple', realm: '炼气四层' }],
    expectedEmotionHints: ['愤怒', '悲伤', '鄙视'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R09', eventType: 'sacrifice',
    event: '林小燕修为不足，在采药时中了毒蛇之毒，赵铁柱长老不惜消耗自身修为帮她逼毒',
    subject: { name: '林小燕', personality: '散漫懒惰但不是坏人', moralHint: '中立偏善', mood: 'anxious', rank: 'outer-disciple', realm: '炼气五层', physicalState: 'injured' },
    involved: [{ name: '赵铁柱', relationship: 'mentor', rank: 'elder', realm: '金丹一层' }],
    expectedEmotionHints: ['感动', '愧疚', '悲伤', '喜悦'], expectedDeltaSign: 'positive',
  },
  {
    id: 'R10', eventType: 'alchemy',
    event: '门派炼丹大会上，新来的外门弟子刘青莲一举炼出三品丹药，而苏瑶费尽心力也只炼出五品',
    subject: { name: '苏瑶', personality: '温和但暗中好胜', moralHint: '善良中立', mood: 'depressed', rank: 'core-disciple', realm: '炼气九层', physicalState: 'healthy' },
    involved: [{ name: '刘青莲', relationship: 'stranger', rank: 'outer-disciple', realm: '炼气三层' }],
    expectedEmotionHints: ['嫉妒', '嫉恨', '悲伤', '委屈'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R11', eventType: 'social',
    event: '掌门当众宣布，由于张清风表现优异晋升为核心弟子，但同时宣布李墨染因违反门规被降为外门弟子',
    subject: { name: '陈明月', personality: '温和善良，两人都是好友', moralHint: '善良正道', mood: 'calm', rank: 'inner-disciple', realm: '筑基一层', physicalState: 'healthy' },
    involved: [
      { name: '张清风', relationship: 'close-friend', rank: 'core-disciple', realm: '筑基二层' },
      { name: '李墨染', relationship: 'friend', rank: 'outer-disciple', realm: '炼气四层' },
    ],
    expectedEmotionHints: ['喜悦', '悲伤', '担忧', '平静'], expectedDeltaSign: 'any',
  },
  {
    id: 'R12', eventType: 'combat',
    event: '张清风和赵铁柱长老切磋，张清风以筑基修为居然接下了金丹长老三招，赢得满堂喝彩',
    subject: { name: '李墨染', personality: '狡黠贪婪，嫉妒心强', moralHint: '邪道自私', mood: 'angry', rank: 'outer-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [
      { name: '张清风', relationship: 'rival', rank: 'core-disciple', realm: '筑基二层' },
      { name: '赵铁柱', relationship: 'grudge', rank: 'elder', realm: '金丹一层' },
    ],
    expectedEmotionHints: ['嫉妒', '嫉恨', '愤怒', '鄙视'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R13', eventType: 'cultivation',
    event: '张清风重伤卧床期间，苏瑶每天来照顾他，喂药换药从未间断，但张清风知道她一直喜欢着自己',
    subject: { name: '张清风', personality: '刚烈正直，不善表达感情', moralHint: '善良正道', mood: 'lonely', rank: 'inner-disciple', realm: '筑基二层', physicalState: 'injured' },
    involved: [{ name: '苏瑶', relationship: 'pursuer', rank: 'inner-disciple', realm: '炼气九层' }],
    expectedEmotionHints: ['感动', '愧疚', '喜悦', '担忧'], expectedDeltaSign: 'positive',
  },
  {
    id: 'R14', eventType: 'social',
    event: '掌门问询弟子修炼进度时，林小燕顶撞掌门说"修炼太累了能不能少练一天"',
    subject: { name: '赵铁柱', personality: '军人气质，等级观念极强', moralHint: '正道刚正', mood: 'calm', rank: 'elder', realm: '金丹一层', physicalState: 'healthy' },
    involved: [{ name: '林小燕', relationship: 'disciple', rank: 'outer-disciple', realm: '炼气五层' }],
    expectedEmotionHints: ['愤怒', '鄙视'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R15', eventType: 'romance',
    event: '陈明月收到了张清风送的生辰礼物——一株他在险地采来的千年灵芝，而苏瑶也送了礼物但被冷落了',
    subject: { name: '苏瑶', personality: '温和但内心敏感脆弱', moralHint: '善良中立', mood: 'lonely', rank: 'inner-disciple', realm: '炼气九层', physicalState: 'healthy' },
    involved: [
      { name: '张清风', relationship: 'lover', rank: 'core-disciple', realm: '筑基二层' },
      { name: '陈明月', relationship: 'rival', rank: 'inner-disciple', realm: '筑基一层' },
    ],
    expectedEmotionHints: ['悲伤', '嫉妒', '委屈', '愤怒'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R16', eventType: 'combat',
    event: '陈明月为了救门派弟子独自挡住了妖兽王，身受重伤经脉断裂七条，修为可能永久受损',
    subject: { name: '张清风', personality: '刚烈正直，极重义气', moralHint: '善良正道', mood: 'anxious', rank: 'core-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [{ name: '陈明月', relationship: 'close-friend', rank: 'inner-disciple', realm: '筑基一层' }],
    expectedEmotionHints: ['悲伤', '愤怒', '恐惧', '担忧', '愧疚', '心疼'], expectedDeltaSign: 'positive',
  },
  {
    id: 'R17', eventType: 'cultivation',
    event: '赵铁柱闭关突破金丹二层的关键时刻，外面传来消息说他最心爱的弟子林小燕叛逃了',
    subject: { name: '赵铁柱', personality: '刚烈但对弟子如父', moralHint: '正道刚正', mood: 'calm', rank: 'elder', realm: '金丹一层', physicalState: 'in-seclusion' },
    involved: [{ name: '林小燕', relationship: 'disciple', rank: 'outer-disciple', realm: '炼气五层' }],
    expectedEmotionHints: ['愤怒', '悲伤', '恐惧', '担忧', '心疼'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R18', eventType: 'sacrifice',
    event: '李墨染在所有人都放弃的时候，冒着走火入魔的危险用自己的灵力帮张清风稳住了丹田',
    subject: { name: '张清风', personality: '刚烈正直，恩怨分明', moralHint: '善良正道', mood: 'depressed', rank: 'core-disciple', realm: '筑基二层', physicalState: 'near-death' },
    involved: [{ name: '李墨染', relationship: 'enemy', rank: 'outer-disciple', realm: '炼气四层' }],
    expectedEmotionHints: ['感动', '愧疚', '喜悦'], expectedDeltaSign: 'positive',
  },
  {
    id: 'R19', eventType: 'social',
    event: '门派仅有一个名额可以进入秘境修炼，掌门让张清风和李墨染比试决定，张清风轻松获胜',
    subject: { name: '李墨染', personality: '狡黠贪婪，不服输', moralHint: '邪道自私', mood: 'angry', rank: 'outer-disciple', realm: '炼气四层', physicalState: 'healthy' },
    involved: [{ name: '张清风', relationship: 'rival', rank: 'core-disciple', realm: '筑基二层' }],
    expectedEmotionHints: ['愤怒', '嫉妒', '鄙视', '嫉恨'], expectedDeltaSign: 'negative',
  },
  {
    id: 'R20', eventType: 'betrayal',
    event: '门派大会上揭露：李墨染不仅偷了陈明月的丹药，还出卖了门派功法给敌宗，张清风当场要求处死叛徒，但掌门却选择从轻发落只是废了修为',
    subject: { name: '张清风', personality: '刚烈正直，眼里揉不得沙子', moralHint: '善良正道', mood: 'angry', rank: 'core-disciple', realm: '筑基二层', physicalState: 'healthy' },
    involved: [
      { name: '李墨染', relationship: 'enemy', rank: 'outer-disciple', realm: '炼气四层' },
      { name: '陈明月', relationship: 'close-friend', rank: 'inner-disciple', realm: '筑基一层' },
      { name: '掌门', relationship: 'mentor', rank: 'sect-leader', realm: '元婴' },
    ],
    expectedEmotionHints: ['愤怒', '鄙视'], expectedDeltaSign: 'any',
  },
];

// ===== Prompt 构建 =====

function buildPrompt(tc: RichTestCase): { system: string; user: string } {
  const system =
    `你是一个修仙世界NPC灵魂评估器。给定一个事件场景和一个NPC的完整档案，` +
    `你需要判断该NPC对这件事的内心真实反应。\n\n` +
    `你必须综合考虑以下因素：\n` +
    `1. NPC的性格和道德倾向 — 决定反应的基调\n` +
    `2. NPC当前的心情 — 影响反应的强度\n` +
    `3. NPC与涉事人物的关系 — 决定好感变化方向\n` +
    `4. 双方的地位差距 — 影响表达方式\n` +
    `5. NPC的身体状态 — 影响反应方式\n` +
    `6. 事件的严重程度 — 影响情绪强度\n\n` +
    `输出JSON：\n` +
    `- emotion: 情绪标签（喜悦/愤怒/嫉妒/敬佩/悲伤/恐惧/鄙视/平静/嫉恨/愧疚/骄傲/担忧/感动/委屈/心疼）\n` +
    `- intensity: 1微弱 2中等 3强烈\n` +
    `- relationshipDeltas: 对每个涉事人物的好感变化(-10~+10)及原因\n` +
    `- behaviorBias: (可选) 后续行为偏好及权重(0.5~2.0)\n` +
    `- innerThought: 内心独白，用中文，50字以内，要符合人物性格`;

  const involvedDesc = tc.involved.map(p =>
    `  · ${p.name}：${RANK_LABELS[p.rank]}，${p.realm}，与${tc.subject.name}的关系是【${RELATIONSHIP_LABELS[p.relationship]}】`
  ).join('\n');

  const user =
    `【事件类型】${tc.eventType}\n【事件描述】${tc.event}\n\n` +
    `【反应者档案】\n  姓名：${tc.subject.name}\n  性格：${tc.subject.personality}\n` +
    `  道德倾向：${tc.subject.moralHint}\n  当前心情：${MOOD_LABELS[tc.subject.mood]}\n` +
    `  身份：${RANK_LABELS[tc.subject.rank]}\n  境界：${tc.subject.realm}\n` +
    `  身体状态：${PHYSICAL_LABELS[tc.subject.physicalState]}\n\n` +
    `【涉及人物】\n${involvedDesc}`;

  return { system, user };
}

// ===== llama-server =====

function callLlama(system: string, user: string): Promise<{ raw: string; parsed: unknown; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const payload = JSON.stringify({
      model: 'qwen3.5', messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 400, temperature: 0.7, top_p: 0.9,
      chat_template_kwargs: { enable_thinking: false },
      response_format: { type: 'json_schema', json_schema: { name: 'soul_evaluation', strict: true, schema: SOUL_EVAL_SCHEMA } },
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
          let parsed: unknown = null;
          try { parsed = JSON.parse(content); } catch { /* */ }
          resolve({ raw: content, parsed, latencyMs });
        } catch { reject(new Error(`Parse error`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

// ===== 验证 =====

const VALID_EMOTIONS = new Set(
  ['喜悦', '愤怒', '嫉妒', '敬佩', '悲伤', '恐惧', '鄙视', '平静', '嫉恨', '愧疚', '骄傲', '担忧', '感动', '委屈', '心疼']
);

function validate(tc: RichTestCase, parsed: unknown): { schemaValid: boolean; emotionReasonable: boolean; deltaReasonable: boolean } {
  if (!parsed || typeof parsed !== 'object') return { schemaValid: false, emotionReasonable: false, deltaReasonable: false };
  const r = parsed as Record<string, unknown>;
  const schemaValid = typeof r.emotion === 'string' && VALID_EMOTIONS.has(r.emotion)
    && typeof r.intensity === 'number' && [1, 2, 3].includes(r.intensity)
    && Array.isArray(r.relationshipDeltas)
    && typeof r.innerThought === 'string' && r.innerThought.length > 0;
  let emotionReasonable = true;
  if (typeof r.emotion === 'string' && tc.expectedEmotionHints.length > 0)
    emotionReasonable = tc.expectedEmotionHints.includes(r.emotion as EmotionTag);
  let deltaReasonable = true;
  if (Array.isArray(r.relationshipDeltas) && tc.expectedDeltaSign && tc.expectedDeltaSign !== 'any') {
    const deltas = r.relationshipDeltas as Array<{ delta: number }>;
    if (deltas.length > 0) {
      const avg = deltas.reduce((s, d) => s + (d.delta ?? 0), 0) / deltas.length;
      if (tc.expectedDeltaSign === 'positive' && avg < 0) deltaReasonable = false;
      if (tc.expectedDeltaSign === 'negative' && avg > 0) deltaReasonable = false;
    }
  }
  return { schemaValid, emotionReasonable, deltaReasonable };
}

// ===== 主流程 =====

async function run() {
  log('INFO', 'SYSTEM', 'poc-1b', '═══════════════ PoC-1b 启动（中文情绪版）═══════════════');
  log('INFO', 'SYSTEM', 'poc-1b', '模型: Qwen3.5-0.8B | GPU: CUDA | 场景: 20 | 情绪标签: 中文 | 维度: 心情×关系×地位×境界×身体×事件');

  // Health check
  try {
    const h = await callLlama('test', 'say hi');
    log('INFO', 'AI', 'poc-1b', `llama-server 预检通过`, { latencyMs: h.latencyMs });
  } catch (err) {
    log('ERROR', 'AI', 'poc-1b', `llama-server 预检失败`, { error: String(err) });
    process.exit(1);
  }

  log('INFO', 'SYSTEM', 'poc-1b', `开始测试 ${TEST_CASES.length} 个场景`);

  const stats = { total: 0, jsonOk: 0, schemaOk: 0, emotionOk: 0, deltaOk: 0, latencies: [] as number[] };

  for (const tc of TEST_CASES) {
    stats.total++;
    const { system, user } = buildPrompt(tc);
    const relDesc = tc.involved.map(i => `${i.name}(${RELATIONSHIP_LABELS[i.relationship]})`).join(' + ');

    log('INFO', 'AI', 'poc-1b', `━━━ ${tc.id} 开始 ━━━`);
    log('INFO', 'AI', 'poc-1b', `事件: [${tc.eventType}] ${tc.event}`);
    log('INFO', 'DISCIPLE', 'poc-1b', `反应者: ${tc.subject.name}`, {
      personality: tc.subject.personality, moral: tc.subject.moralHint,
      mood: MOOD_LABELS[tc.subject.mood], rank: RANK_LABELS[tc.subject.rank],
      realm: tc.subject.realm, physical: PHYSICAL_LABELS[tc.subject.physicalState],
    });
    log('INFO', 'DISCIPLE', 'poc-1b', `涉及: ${relDesc}`);

    try {
      const { parsed, latencyMs } = await callLlama(system, user);
      const jsonValid = parsed !== null;
      const { schemaValid, emotionReasonable, deltaReasonable } = jsonValid
        ? validate(tc, parsed) : { schemaValid: false, emotionReasonable: false, deltaReasonable: false };

      if (jsonValid) stats.jsonOk++;
      if (schemaValid) stats.schemaOk++;
      if (emotionReasonable) stats.emotionOk++;
      if (deltaReasonable) stats.deltaOk++;
      stats.latencies.push(latencyMs);

      const p = parsed as SoulEvaluationResult | null;

      // 详细日志输出
      log('INFO', 'AI', 'poc-1b', `AI 输出: emotion=${p?.emotion}(${p?.intensity})`, {
        emotion: p?.emotion, intensity: p?.intensity, latencyMs,
        jsonValid, schemaValid, emotionReasonable, deltaReasonable,
      });

      if (p?.relationshipDeltas) {
        for (const d of p.relationshipDeltas) {
          const sign = d.delta > 0 ? '+' : '';
          log('INFO', 'AI', 'poc-1b', `  好感变化: ${d.targetId} ${sign}${d.delta} — ${d.reason}`);
        }
      }

      if (p?.behaviorBias) {
        log('INFO', 'AI', 'poc-1b', `  行为偏好: ${p.behaviorBias.behavior} (×${p.behaviorBias.weight})`);
      }

      log('INFO', 'AI', 'poc-1b', `  内心独白: 「${p?.innerThought ?? '(无)'}」`);

      // 判定结果
      const verdict = schemaValid && emotionReasonable && deltaReasonable ? '✅ PASS' : '⚠️ ISSUES';
      const issues: string[] = [];
      if (!emotionReasonable) issues.push(`情绪:${p?.emotion}(期望:${tc.expectedEmotionHints.join('/')})`);
      if (!deltaReasonable) issues.push(`delta方向:${tc.expectedDeltaSign}`);
      log(issues.length ? 'WARN' : 'INFO', 'AI', 'poc-1b', `${tc.id} ${verdict} ${latencyMs}ms${issues.length ? ' | ' + issues.join(', ') : ''}`);

    } catch (err) {
      log('ERROR', 'AI', 'poc-1b', `${tc.id} 执行失败`, { error: String(err) });
    }
  }

  // ===== 汇总报告 =====
  log('INFO', 'SYSTEM', 'poc-1b', '');
  log('INFO', 'SYSTEM', 'poc-1b', '═══════════════ PoC-1b 汇总报告 ═══════════════');

  const n = stats.total;
  const lats = stats.latencies.sort((a, b) => a - b);
  const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;
  const p50 = lats.length ? lats[Math.floor(lats.length * 0.5)] : 0;
  const p95 = lats.length ? lats[Math.floor(lats.length * 0.95)] : 0;

  const pct = (v: number) => `${v}/${n} (${Math.round(v / n * 100)}%)`;
  log('INFO', 'SYSTEM', 'poc-1b', `JSON 格式正确率:   ${pct(stats.jsonOk)}  ${stats.jsonOk / n >= 0.8 ? '✅' : '❌'}`);
  log('INFO', 'SYSTEM', 'poc-1b', `Schema 完整率:     ${pct(stats.schemaOk)}  ${stats.schemaOk / n >= 0.8 ? '✅' : '❌'}`);
  log('INFO', 'SYSTEM', 'poc-1b', `情绪匹配合理度:   ${pct(stats.emotionOk)}  ${stats.emotionOk / n >= 0.6 ? '✅' : '❌'}`);
  log('INFO', 'SYSTEM', 'poc-1b', `关系Delta方向:     ${pct(stats.deltaOk)}  ${stats.deltaOk / n >= 0.6 ? '✅' : '❌'}`);
  log('INFO', 'SYSTEM', 'poc-1b', `平均延迟: ${avg}ms | P50: ${p50}ms | P95: ${p95}ms  ${p95 <= 3000 ? '✅' : '❌'}`);

  const pass = stats.jsonOk / n >= 0.8 && stats.schemaOk / n >= 0.8
    && stats.emotionOk / n >= 0.6 && stats.deltaOk / n >= 0.6 && p95 <= 3000;

  log(pass ? 'INFO' : 'WARN', 'SYSTEM', 'poc-1b', `总体判定: ${pass ? '✅ PoC-1b PASSED' : '❌ PoC-1b FAILED'}`);
  log('INFO', 'SYSTEM', 'poc-1b', '═══════════════════════════════════════════════');

  // 保存日志
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  saveLogs(`poc-1b-cn-${ts}`);

  process.exit(pass ? 0 : 1);
}

run().catch(err => { log('ERROR', 'SYSTEM', 'poc-1b', `执行异常: ${err}`); process.exit(1); });
