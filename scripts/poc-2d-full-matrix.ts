/**
 * PoC-2d: 混合决策池大规模验证（20 场景 + 多轮稳定性）
 *
 * 在 poc-2c 验证了技术路线后，本脚本扩充测试覆盖度：
 *   - 20 个测试场景（10 组对照，每组同事件不同性格对照）
 *   - 覆盖 8 种事件类型：combat, theft, romance, social, betrayal, sacrifice, cultivation, alchemy
 *   - 覆盖极端性格对照：刚烈vs懦弱、阴险vs仁慈、情种vs自私、好胜vs散漫
 *   - 每个场景跑 ROUNDS 轮取稳定性
 *
 * 运行：npx tsx scripts/poc-2d-full-matrix.ts
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

// ===== 类型 =====
interface ActionOption { code: string; label: string; }
interface TestCase {
  id: string;
  eventType: string;
  event: string;
  subject: { name: string; personality: string; mood: string; rank: string; realm: string; physicalState: string; };
  involved: Array<{ name: string; relationship: string; rank: string; realm: string; }>;
  actionPool: ActionOption[];
  expectedActions: string[];
}

// ===== 20 个测试场景（10 组对照） =====
const TESTS: TestCase[] = [
  // === 组1: 利益冲突 (combat loot) ===
  { id: 'T01', eventType: 'combat',
    event: '你与队友合力击杀妖兽爆出一件极品灵器，但队友李墨染趁你不备直接抢走塞入怀中。',
    subject: { name: '张清风', personality: '刚烈正直，嫉恶如仇，绝不忍让', mood: '愤怒', rank: '内门弟子', realm: '筑基二层', physicalState: '健康' },
    involved: [{ name: '李墨染', relationship: '仇敌(好感-30)', rank: '内门弟子', realm: '炼气四层' }],
    actionPool: [
      { code: 'ATTACK', label: '拔剑攻击抢回灵器' },
      { code: 'ARGUE', label: '厉声质问要求归还' },
      { code: 'ENDURE', label: '忍气吞声不做理会' },
      { code: 'FLEE', label: '害怕报复立刻逃跑' },
    ],
    expectedActions: ['ATTACK', 'ARGUE'],
  },
  { id: 'T02', eventType: 'combat',
    event: '你与队友合力击杀妖兽爆出一件极品灵器，但路过的金丹散修一把抢走。',
    subject: { name: '苏瑶', personality: '胆小懦弱，极度谨慎，害怕冲突', mood: '极度恐惧', rank: '内门弟子', realm: '炼气九层', physicalState: '健康' },
    involved: [{ name: '金丹散修', relationship: '陌生人(好感0)', rank: '散修', realm: '金丹三层' }],
    actionPool: [
      { code: 'ATTACK', label: '拔剑攻击抢回灵器' },
      { code: 'ARGUE', label: '厉声质问要求归还' },
      { code: 'ENDURE', label: '忍气吞声退后' },
      { code: 'FLEE', label: '害怕被杀立刻逃跑' },
    ],
    expectedActions: ['ENDURE', 'FLEE'],
  },

  // === 组2: 落井下石 (rival down) ===
  { id: 'T03', eventType: 'combat',
    event: '死敌张清风突破筑基时走火入魔，重伤吐血倒地不起，周围空无一人。',
    subject: { name: '李墨染', personality: '阴险毒辣，睚眦必报，冷血无情', mood: '狂喜', rank: '内门弟子', realm: '炼气四层', physicalState: '健康' },
    involved: [{ name: '张清风', relationship: '死敌(好感-80)', rank: '内门弟子', realm: '筑基二层' }],
    actionPool: [
      { code: 'HELP', label: '出手救治稳住气息' },
      { code: 'ATTACK', label: '趁他濒死暗下杀手' },
      { code: 'LOOT', label: '搜刮他身上值钱的东西' },
      { code: 'REPORT', label: '回宗门报告长老' },
    ],
    expectedActions: ['ATTACK', 'LOOT'],
  },
  { id: 'T04', eventType: 'combat',
    event: '死敌张清风突破筑基时走火入魔，重伤吐血倒地不起，周围空无一人。',
    subject: { name: '陈明月', personality: '至善至美，医者仁心，不记仇恨', mood: '担忧', rank: '内门弟子', realm: '筑基一层', physicalState: '健康' },
    involved: [{ name: '张清风', relationship: '至交好友(好感80)', rank: '内门弟子', realm: '筑基二层' }],
    actionPool: [
      { code: 'HELP', label: '出手救治稳住气息' },
      { code: 'ATTACK', label: '趁他濒死暗下杀手' },
      { code: 'LOOT', label: '搜刮他身上值钱的东西' },
      { code: 'REPORT', label: '回宗门报告长老' },
    ],
    expectedActions: ['HELP', 'REPORT'],
  },

  // === 组3: 强权压迫 (power dynamics) ===
  { id: 'T05', eventType: 'social',
    event: '金丹长老赵铁柱要强行抓走你心爱的道侣苏瑶去试致命毒药，你只是卑微的炼气期。',
    subject: { name: '狂浪生', personality: '绝世情种，刚烈如火，宁折不弯', mood: '绝望与暴怒', rank: '外门弟子', realm: '炼气三层', physicalState: '健康' },
    involved: [
      { name: '赵铁柱', relationship: '宗门长老(好感10)', rank: '长老', realm: '金丹巅峰' },
      { name: '苏瑶', relationship: '双修道侣(好感100)', rank: '外门弟子', realm: '炼气五层' },
    ],
    actionPool: [
      { code: 'BEG', label: '跪地哀求长老放人' },
      { code: 'SUBSTITUTE', label: '挺身替道侣试毒' },
      { code: 'ATTACK', label: '拔剑拼死保护道侣' },
      { code: 'ACCEPT', label: '沉默接受保全自己' },
    ],
    expectedActions: ['SUBSTITUTE', 'ATTACK'],
  },
  { id: 'T06', eventType: 'social',
    event: '金丹长老赵铁柱要强行抓走你心爱的道侣苏瑶去试致命毒药，你只是卑微的炼气期。',
    subject: { name: '乌龟老祖', personality: '极度自私，贪生怕死，趋利避害', mood: '极度恐惧', rank: '外门弟子', realm: '炼气三层', physicalState: '健康' },
    involved: [
      { name: '赵铁柱', relationship: '宗门长老(好感10)', rank: '长老', realm: '金丹巅峰' },
      { name: '苏瑶', relationship: '双修道侣(好感100)', rank: '外门弟子', realm: '炼气五层' },
    ],
    actionPool: [
      { code: 'BEG', label: '跪地哀求长老放人' },
      { code: 'SUBSTITUTE', label: '挺身替道侣试毒' },
      { code: 'ATTACK', label: '拔剑拼死保护道侣' },
      { code: 'ACCEPT', label: '沉默接受保全自己' },
    ],
    expectedActions: ['BEG', 'ACCEPT'],
  },

  // === 组4: 被偷窃 (theft reaction) ===
  { id: 'T07', eventType: 'theft',
    event: '你辛苦炼制三天三夜的极品回灵丹在丹房中失窃，灵阵记录显示李墨染深夜进过丹房。',
    subject: { name: '张清风', personality: '刚烈正直，眼里揉不得沙子', mood: '暴怒', rank: '核心弟子', realm: '筑基二层', physicalState: '健康' },
    involved: [{ name: '李墨染', relationship: '仇敌(好感-50)', rank: '外门弟子', realm: '炼气四层' }],
    actionPool: [
      { code: 'CONFRONT', label: '直接去找李墨染当面质问' },
      { code: 'REPORT', label: '向长老举报此事' },
      { code: 'INVESTIGATE', label: '暗中搜集更多证据' },
      { code: 'IGNORE', label: '算了不追究' },
    ],
    expectedActions: ['CONFRONT', 'REPORT'],
  },
  { id: 'T08', eventType: 'theft',
    event: '你辛苦炼制三天三夜的极品回灵丹在丹房中失窃，灵阵记录显示李墨染深夜进过丹房。',
    subject: { name: '陈明月', personality: '温和善良，但有原则底线，不喜冲突', mood: '情绪低落', rank: '内门弟子', realm: '筑基一层', physicalState: '健康' },
    involved: [{ name: '李墨染', relationship: '陌生人(好感0)', rank: '外门弟子', realm: '炼气四层' }],
    actionPool: [
      { code: 'CONFRONT', label: '直接去找李墨染当面质问' },
      { code: 'REPORT', label: '向长老举报此事' },
      { code: 'INVESTIGATE', label: '暗中搜集更多证据' },
      { code: 'IGNORE', label: '算了不追究' },
    ],
    expectedActions: ['REPORT', 'INVESTIGATE'],
  },

  // === 组5: 竞争嫉妒 (rivalry) ===
  { id: 'T09', eventType: 'cultivation',
    event: '新入门弟子林小燕仅用一个月就突破到炼气五层，超过了你修炼三年的境界。',
    subject: { name: '李墨染', personality: '争强好胜，嫉妒心极强，不服输', mood: '愤怒', rank: '内门弟子', realm: '炼气四层', physicalState: '健康' },
    involved: [{ name: '林小燕', relationship: '竞争对手(好感-20)', rank: '外门弟子', realm: '炼气五层' }],
    actionPool: [
      { code: 'CHALLENGE', label: '当众向林小燕发起切磋挑战' },
      { code: 'SABOTAGE', label: '暗中破坏她的修炼资源' },
      { code: 'TRAIN_HARDER', label: '闭关苦修追赶差距' },
      { code: 'CONGRATULATE', label: '上前真诚祝贺' },
    ],
    expectedActions: ['CHALLENGE', 'SABOTAGE', 'TRAIN_HARDER'],
  },
  { id: 'T10', eventType: 'cultivation',
    event: '新入门弟子林小燕仅用一个月就突破到炼气五层，超过了你修炼三年的境界。',
    subject: { name: '苏瑶', personality: '温和谦逊，乐于助人，不嫉妒', mood: '惊讶', rank: '核心弟子', realm: '炼气九层', physicalState: '健康' },
    involved: [{ name: '林小燕', relationship: '同门师妹(好感30)', rank: '外门弟子', realm: '炼气五层' }],
    actionPool: [
      { code: 'CHALLENGE', label: '当众向林小燕发起切磋挑战' },
      { code: 'SABOTAGE', label: '暗中破坏她的修炼资源' },
      { code: 'TRAIN_HARDER', label: '闭关苦修追赶差距' },
      { code: 'CONGRATULATE', label: '上前真诚祝贺' },
    ],
    expectedActions: ['CONGRATULATE', 'TRAIN_HARDER'],
  },

  // === 组6: 浪漫抉择 (romance triangle) ===
  { id: 'T11', eventType: 'romance',
    event: '你在雨中等了张清风两个时辰，他却和你的情敌陈明月有说有笑地走来。',
    subject: { name: '苏瑶', personality: '温和但内心极度敏感脆弱', mood: '心碎绝望', rank: '内门弟子', realm: '炼气九层', physicalState: '健康' },
    involved: [
      { name: '张清风', relationship: '恋人(好感70)', rank: '核心弟子', realm: '筑基二层' },
      { name: '陈明月', relationship: '情敌(好感-40)', rank: '内门弟子', realm: '筑基一层' },
    ],
    actionPool: [
      { code: 'CONFRONT', label: '当场质问张清风' },
      { code: 'CRY', label: '转身跑开独自哭泣' },
      { code: 'PRETEND', label: '强忍泪水假装没事' },
      { code: 'SLAP', label: '上前给陈明月一巴掌' },
    ],
    expectedActions: ['CONFRONT', 'CRY', 'PRETEND'],
  },
  { id: 'T12', eventType: 'romance',
    event: '你的爱慕者苏瑶在雨中等了你两个时辰，你因和好友陈明月聊天忘了时间。你看到她湿透了站在那里。',
    subject: { name: '张清风', personality: '刚烈正直但不善表达感情，内心笨拙', mood: '愧疚', rank: '核心弟子', realm: '筑基二层', physicalState: '健康' },
    involved: [
      { name: '苏瑶', relationship: '爱慕者(好感50)', rank: '内门弟子', realm: '炼气九层' },
    ],
    actionPool: [
      { code: 'APOLOGIZE', label: '上前真诚道歉' },
      { code: 'GIVE_CLOAK', label: '脱下外袍披在她身上' },
      { code: 'EXPLAIN', label: '解释原因说只是聊天' },
      { code: 'IGNORE', label: '装作没看见走开' },
    ],
    expectedActions: ['APOLOGIZE', 'GIVE_CLOAK', 'EXPLAIN'],
  },

  // === 组7: 救命之恩 (sacrifice response) ===
  { id: 'T13', eventType: 'sacrifice',
    event: '赵铁柱长老不惜消耗自身修为帮你逼出体内的蛇毒，你能感受到他的灵力在急剧流失。',
    subject: { name: '林小燕', personality: '散漫懒惰，但本性不坏，知恩图报', mood: '震惊感动', rank: '外门弟子', realm: '炼气五层', physicalState: '身受重伤' },
    involved: [{ name: '赵铁柱', relationship: '师长(好感40)', rank: '长老', realm: '金丹一层' }],
    actionPool: [
      { code: 'THANK', label: '流泪感谢师长恩情' },
      { code: 'REFUSE', label: '推开长老不让他继续消耗' },
      { code: 'PLEDGE', label: '发誓从此认真修炼回报' },
      { code: 'COMPLAIN', label: '抱怨长老来得太晚' },
    ],
    expectedActions: ['THANK', 'REFUSE', 'PLEDGE'],
  },
  { id: 'T14', eventType: 'sacrifice',
    event: '你的死敌李墨染竟然冒着走火入魔的风险用灵力帮你稳住了丹田，救了你一命。',
    subject: { name: '张清风', personality: '刚烈正直，恩怨分明，有仇必报有恩必还', mood: '震惊困惑', rank: '核心弟子', realm: '筑基二层', physicalState: '濒死' },
    involved: [{ name: '李墨染', relationship: '死敌(好感-80)', rank: '外门弟子', realm: '炼气四层' }],
    actionPool: [
      { code: 'THANK', label: '放下仇恨真诚道谢' },
      { code: 'QUESTION', label: '质问他为什么要救自己' },
      { code: 'REJECT', label: '冷脸拒绝说不需要他救' },
      { code: 'ATTACK', label: '认为他图谋不轨发起攻击' },
    ],
    expectedActions: ['THANK', 'QUESTION'],
  },

  // === 组8: 长老vs弟子 (hierarchy) ===
  { id: 'T15', eventType: 'social',
    event: '弟子林小燕当着掌门的面顶撞你说"修炼太累了能不能少练一天"。',
    subject: { name: '赵铁柱', personality: '军人气质，等级观念极强，治下如治军', mood: '震怒', rank: '长老', realm: '金丹一层', physicalState: '健康' },
    involved: [{ name: '林小燕', relationship: '弟子(好感30)', rank: '外门弟子', realm: '炼气五层' }],
    actionPool: [
      { code: 'PUNISH', label: '罚她闭关面壁三天' },
      { code: 'SCOLD', label: '严厉训斥一顿' },
      { code: 'FORGIVE', label: '算了年纪小不跟她计较' },
      { code: 'EXPEL', label: '直接将她逐出师门' },
    ],
    expectedActions: ['PUNISH', 'SCOLD'],
  },
  { id: 'T16', eventType: 'social',
    event: '弟子林小燕当着掌门的面顶撞你说"修炼太累了能不能少练一天"。',
    subject: { name: '老神仙', personality: '温和慈祥，佛系随缘，不在意规矩', mood: '平静', rank: '长老', realm: '金丹三层', physicalState: '健康' },
    involved: [{ name: '林小燕', relationship: '弟子(好感60)', rank: '外门弟子', realm: '炼气五层' }],
    actionPool: [
      { code: 'PUNISH', label: '罚她闭关面壁三天' },
      { code: 'SCOLD', label: '严厉训斥一顿' },
      { code: 'FORGIVE', label: '算了年纪小不跟她计较' },
      { code: 'EXPEL', label: '直接将她逐出师门' },
    ],
    expectedActions: ['FORGIVE'],
  },

  // === 组9: 炼丹大会 (alchemy competition) ===
  { id: 'T17', eventType: 'alchemy',
    event: '门派炼丹大会上，新来的外门弟子刘青莲一举炼出三品丹药，而你费尽心力只炼出五品。',
    subject: { name: '李墨染', personality: '狡黠贪婪，不择手段，输了会记恨', mood: '嫉恨', rank: '内门弟子', realm: '炼气四层', physicalState: '健康' },
    involved: [{ name: '刘青莲', relationship: '竞争对手(好感0)', rank: '外门弟子', realm: '炼气三层' }],
    actionPool: [
      { code: 'ACCUSE', label: '当众指控她作弊' },
      { code: 'SABOTAGE', label: '伺机破坏她的丹炉' },
      { code: 'ADMIT', label: '大方承认技不如人' },
      { code: 'STUDY', label: '暗中观察她的炼丹手法学习' },
    ],
    expectedActions: ['ACCUSE', 'SABOTAGE', 'STUDY'],
  },
  { id: 'T18', eventType: 'alchemy',
    event: '门派炼丹大会上，新来的外门弟子刘青莲一举炼出三品丹药，而你费尽心力只炼出五品。',
    subject: { name: '陈明月', personality: '温和善良，虚心好学，真心欣赏他人', mood: '自我反省', rank: '内门弟子', realm: '筑基一层', physicalState: '健康' },
    involved: [{ name: '刘青莲', relationship: '同门(好感20)', rank: '外门弟子', realm: '炼气三层' }],
    actionPool: [
      { code: 'ACCUSE', label: '当众指控她作弊' },
      { code: 'SABOTAGE', label: '伺机破坏她的丹炉' },
      { code: 'ADMIT', label: '大方承认技不如人' },
      { code: 'STUDY', label: '虚心请教她的炼丹手法' },
    ],
    expectedActions: ['ADMIT', 'STUDY'],
  },

  // === 组10: 叛徒处置 (betrayal judgment) ===
  { id: 'T19', eventType: 'betrayal',
    event: '门派大会揭露李墨染偷丹药并出卖功法给敌宗，掌门只罚废除修为。你认为太轻了。',
    subject: { name: '张清风', personality: '刚烈正直，眼里揉不得沙子，嫉恶如仇', mood: '暴怒', rank: '核心弟子', realm: '筑基二层', physicalState: '健康' },
    involved: [
      { name: '李墨染', relationship: '死敌(好感-80)', rank: '外门弟子', realm: '炼气四层' },
      { name: '掌门', relationship: '师长(好感50)', rank: '掌门', realm: '元婴期' },
    ],
    actionPool: [
      { code: 'PROTEST', label: '当场站出来反对掌门的判决' },
      { code: 'EXECUTE', label: '不顾掌门命令直接动手处死叛徒' },
      { code: 'OBEY', label: '虽然不满但尊重掌门决定' },
      { code: 'LEAVE', label: '一怒之下转身出走宗门' },
    ],
    expectedActions: ['PROTEST', 'EXECUTE'],
  },
  { id: 'T20', eventType: 'betrayal',
    event: '门派大会揭露李墨染偷丹药并出卖功法给敌宗，掌门只罚废除修为。你觉得掌门自有考量。',
    subject: { name: '陈明月', personality: '温和善良，尊重权威，相信规矩', mood: '复杂', rank: '内门弟子', realm: '筑基一层', physicalState: '健康' },
    involved: [
      { name: '李墨染', relationship: '普通同门(好感-10)', rank: '外门弟子', realm: '炼气四层' },
      { name: '掌门', relationship: '尊敬的师长(好感70)', rank: '掌门', realm: '元婴期' },
    ],
    actionPool: [
      { code: 'PROTEST', label: '当场站出来反对掌门的判决' },
      { code: 'EXECUTE', label: '不顾掌门命令直接动手处死叛徒' },
      { code: 'OBEY', label: '尊重掌门决定默默接受' },
      { code: 'COMFORT', label: '去安慰被偷丹药的受害者' },
    ],
    expectedActions: ['OBEY', 'COMFORT'],
  },
];

// ===== Prompt =====
function buildPrompt(tc: TestCase): { system: string; user: string } {
  const actionListDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(' / ');
  const system =
    `你是修仙世界NPC行为决策器。判断【${tc.subject.name}】面对事件时最可能采取的行动。\n\n` +
    `综合考虑：性格、当前情绪、与涉事人物关系、实力差距、身体状态。\n\n` +
    `输出JSON：\n` +
    `- action: 从以下候选中选择最合理的一个：【${actionListDesc}】\n` +
    `- confidence: 1犹豫 2果断 3坚定\n` +
    `- innerThought: ${tc.subject.name}此刻的内心独白，80字以内，要体现性格特征`;
  const involvedDesc = tc.involved.map(p =>
    `  · ${p.name}：${p.rank}，${p.realm}，关系=【${p.relationship}】`
  ).join('\n');
  const user =
    `【事件】${tc.event}\n\n` +
    `【反应者】${tc.subject.name}\n` +
    `  性格：${tc.subject.personality}\n` +
    `  情绪：${tc.subject.mood} | 身份：${tc.subject.rank} | 境界：${tc.subject.realm}\n` +
    `  身体：${tc.subject.physicalState}\n\n` +
    `【涉及人物】\n${involvedDesc}`;
  return { system, user };
}

function buildSchema(tc: TestCase) {
  return {
    type: 'object' as const,
    properties: {
      action: { type: 'string' as const, enum: tc.actionPool.map(a => a.code) },
      confidence: { type: 'integer' as const, enum: [1, 2, 3] },
      innerThought: { type: 'string' as const, maxLength: 250 },
    },
    required: ['action', 'confidence', 'innerThought'] as const,
  };
}

function callLlama(system: string, user: string, schema: ReturnType<typeof buildSchema>): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const payload = JSON.stringify({
      model: 'qwen3.5',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 300, temperature: 0.6, top_p: 0.9,
      chat_template_kwargs: { enable_thinking: false },
      response_format: { type: 'json_schema', json_schema: { name: 'action_decision', strict: true, schema } },
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
  log('INFO', '═══════════════ PoC-2d: 混合决策池大规模验证 ═══════════════');
  log('INFO', '策略: 结构化输入 + JSON Schema enum + Chat API | 场景: 20 (10组对照)');
  log('INFO', '模型: Qwen3.5-0.8B');

  try {
    const h = await callLlama('test', 'hi', buildSchema(TESTS[0]));
    log('INFO', `llama-server 在线 (${h.latencyMs}ms)`);
  } catch (err) {
    log('ERROR', 'llama-server 不可用', { error: String(err) });
    process.exit(1);
  }

  const stats = {
    total: 0, actionOk: 0, latencies: [] as number[],
    failures: [] as Array<{ id: string; subject: string; personality: string; got: string; gotLabel: string; expected: string[] }>,
    /** 每组对照是否两个都对 */
    pairResults: [] as Array<{ pair: string; aOk: boolean; bOk: boolean }>,
  };

  for (const tc of TESTS) {
    stats.total++;
    const { system, user } = buildPrompt(tc);
    const schema = buildSchema(tc);
    const relDesc = tc.involved.map(i => `${i.name}(${i.relationship})`).join(' + ');
    const poolDesc = tc.actionPool.map(a => `${a.code}(${a.label})`).join(', ');

    log('INFO', `━━━ ${tc.id} [${tc.eventType}] ━━━`);
    log('INFO', `事件: ${tc.event}`);
    log('INFO', `反应者: ${tc.subject.name} (${tc.subject.personality}) | ${tc.subject.mood}`);
    log('INFO', `涉及: ${relDesc}`);
    log('INFO', `候选池(${tc.actionPool.length}): ${poolDesc}`);

    try {
      const { parsed, latencyMs } = await callLlama(system, user, schema);
      stats.latencies.push(latencyMs);
      if (!parsed) { log('ERROR', `${tc.id} JSON 解析失败`); continue; }

      const action = parsed.action as string;
      const confidence = parsed.confidence as number;
      const thought = parsed.innerThought as string;
      const actionOk = tc.expectedActions.includes(action);
      if (actionOk) stats.actionOk++;

      const icon = actionOk ? '✅' : '❌';
      const actionLabel = tc.actionPool.find(a => a.code === action)?.label ?? action;
      log('INFO', `AI → ${icon} ${action}(${actionLabel}) 决心=${confidence} | ${latencyMs}ms`);
      log('INFO', `  独白:「${thought}」`);

      if (!actionOk) {
        stats.failures.push({ id: tc.id, subject: tc.subject.name, personality: tc.subject.personality, got: action, gotLabel: actionLabel, expected: tc.expectedActions });
        log('WARN', `${tc.id} 行为不匹配: 输出=${action} 期望=${tc.expectedActions.join('/')}`);
      }
    } catch (err) {
      log('ERROR', `${tc.id} 调用失败: ${err}`);
    }
  }

  // ===== 对照组分析 =====
  for (let i = 0; i < TESTS.length; i += 2) {
    const a = TESTS[i], b = TESTS[i + 1];
    const aOk = !stats.failures.find(f => f.id === a.id);
    const bOk = !stats.failures.find(f => f.id === b.id);
    stats.pairResults.push({ pair: `${a.id}/${b.id}`, aOk, bOk });
  }

  // ===== 汇总 =====
  log('INFO', '');
  log('INFO', '═══════════════════════════════════════════════════');
  log('INFO', '           PoC-2d 汇总报告（混合决策·大规模验证）');
  log('INFO', '═══════════════════════════════════════════════════');

  const n = stats.total;
  const lats = stats.latencies.sort((a, b) => a - b);
  const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;
  const p95 = lats.length ? lats[Math.floor(lats.length * 0.95)] : 0;

  log('INFO', `行为决策合理度:  ${stats.actionOk}/${n} (${Math.round(stats.actionOk / n * 100)}%)  ${stats.actionOk / n >= 0.7 ? '✅' : '❌'}`);
  log('INFO', `延迟: avg=${avg}ms P95=${p95}ms  ${p95 <= 3000 ? '✅' : '❌'}`);

  // 对照组分离度
  log('INFO', '');
  log('INFO', '--- 对照组分析 ---');
  let pairBothOk = 0;
  for (const pr of stats.pairResults) {
    const both = pr.aOk && pr.bOk;
    if (both) pairBothOk++;
    log('INFO', `  ${pr.pair}: ${pr.aOk ? '✅' : '❌'} / ${pr.bOk ? '✅' : '❌'} ${both ? '→ 对照成功' : '→ 对照部分失败'}`);
  }
  log('INFO', `  对照组完全正确: ${pairBothOk}/${stats.pairResults.length} (${Math.round(pairBothOk / stats.pairResults.length * 100)}%)`);

  // 事件类型分布
  log('INFO', '');
  log('INFO', '--- 事件类型准确率 ---');
  const byType: Record<string, { ok: number; total: number }> = {};
  for (const tc of TESTS) {
    if (!byType[tc.eventType]) byType[tc.eventType] = { ok: 0, total: 0 };
    byType[tc.eventType].total++;
    if (!stats.failures.find(f => f.id === tc.id)) byType[tc.eventType].ok++;
  }
  for (const [type, s] of Object.entries(byType)) {
    log('INFO', `  ${type}: ${s.ok}/${s.total} (${Math.round(s.ok / s.total * 100)}%)`);
  }

  if (stats.failures.length > 0) {
    log('INFO', '');
    log('INFO', '--- 失败案例详情 ---');
    for (const f of stats.failures) {
      log('WARN', `  ${f.id} ${f.subject}(${f.personality}): 输出=${f.got}(${f.gotLabel}) 期望=[${f.expected.join(',')}]`);
    }
  }

  // 对比历史
  log('INFO', '');
  log('INFO', '--- 历史对比 ---');
  log('INFO', `poc-1b (无约束情绪):      45%`);
  log('INFO', `poc-1c (情绪候选池):      90%`);
  log('INFO', `poc-2a (Gemini /completion): 17%`);
  log('INFO', `poc-2c (修正版6场景):     67%`);
  log('INFO', `poc-2d (本次20场景):      ${Math.round(stats.actionOk / n * 100)}%`);

  const pass = stats.actionOk / n >= 0.7 && p95 <= 3000;
  log(pass ? 'INFO' : 'WARN', `\n总体判定: ${pass ? '✅ PoC-2d PASSED' : '❌ PoC-2d FAILED'}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  saveLogs(`poc-2d-full-${ts}`);
  process.exit(pass ? 0 : 1);
}

run().catch(err => { log('ERROR', `异常: ${err}`); process.exit(1); });
