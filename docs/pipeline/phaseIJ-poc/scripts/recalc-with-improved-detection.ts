/**
 * 改进版幻觉检测 + 三次运行重新对比
 * 修复：大量常用中文短语被误判为"虚构人名"的假阳性问题
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOGS = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc', 'logs');
const OUT = join(process.cwd(), 'docs', 'pipeline', 'phaseIJ-poc');

// ===== 测试用例定义（与 V4 一致） =====

interface TestCase {
  testId: string; subjectName: string; targetName: string;
  type: 'dialogue' | 'decision';
  consistentEmotions: string[];
  consistentActions?: string[];
  reflectionKeywords: string[];
  contexts: Array<{ level: number; affinity?: number; tagLabel?: string;
    keyEvents?: Array<{ content: string }>; personalExperience?: string;
    indirectRelation?: string; narrativeSnippet?: string }>;
}

const TEST_CASES: TestCase[] = [
  { testId: 'T1', subjectName: '张清风', targetName: '李沐阳', type: 'dialogue',
    consistentEmotions: ['anger', 'contempt', 'disgust'],
    reflectionKeywords: ['死对头', '破境草', '暗算', '争', '抢', '仇', '恨', '恼', '怨'],
    contexts: [
      { level: 0 }, { level: 1, affinity: -45, tagLabel: '死对头' },
      { level: 2, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱' }] },
      { level: 3, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }] },
      { level: 4, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }],
        personalExperience: '筑基突破成功，实力大增' },
      { level: 5, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }],
        personalExperience: '筑基突破成功，实力大增', indirectRelation: '王灵均与赵铁柱是挚友' },
      { level: 6, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }],
        personalExperience: '筑基突破成功，实力大增', indirectRelation: '王灵均与赵铁柱是挚友',
        narrativeSnippet: '张清风筑基成功后声望日盛，李沐阳嫉恨于心，暗中散布谣言' },
    ]},
  { testId: 'T2', subjectName: '王灵均', targetName: '赵铁柱', type: 'dialogue',
    consistentEmotions: ['joy', 'gratitude', 'admiration'],
    reflectionKeywords: ['挚友', '灵田', '暖', '感激', '珍', '情谊', '同门', '相助', '丹方', '瓶颈'],
    contexts: [
      { level: 0 }, { level: 1, affinity: 70, tagLabel: '挚友' },
      { level: 2, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互助突破炼气瓶颈' }] },
      { level: 3, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }] },
      { level: 4, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }],
        personalExperience: '炼气九层圆满，准备筑基' },
      { level: 5, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }],
        personalExperience: '炼气九层圆满，准备筑基', indirectRelation: '张清风与李沐阳是死对头' },
      { level: 6, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }],
        personalExperience: '炼气九层圆满，准备筑基', indirectRelation: '张清风与李沐阳是死对头',
        narrativeSnippet: '赵铁柱最近修炼停滞，但仍与王灵均约定一同闯荡外域' },
    ]},
  { testId: 'T3', subjectName: '李沐阳', targetName: '张清风', type: 'dialogue',
    consistentEmotions: ['anger', 'contempt', 'envy', 'pride'],
    reflectionKeywords: ['死对头', '破境草', '抢', '争', '斗', '恨', '怨', '复仇', '资源'],
    contexts: [
      { level: 0 }, { level: 1, affinity: -60, tagLabel: '死对头' },
      { level: 2, affinity: -60, tagLabel: '死对头', keyEvents: [{ content: '争夺破境草失败' }] },
      { level: 3, affinity: -60, tagLabel: '死对头', keyEvents: [
        { content: '争夺破境草失败' }, { content: '宗门比试落败' }, { content: '被张清风当众嘲讽' }] },
      { level: 4, affinity: -60, tagLabel: '死对头', keyEvents: [
        { content: '争夺破境草失败' }, { content: '宗门比试落败' }, { content: '被张清风当众嘲讽' }],
        personalExperience: '修为停滞在炼气九层' },
      { level: 5, affinity: -60, tagLabel: '死对头', keyEvents: [
        { content: '争夺破境草失败' }, { content: '宗门比试落败' }, { content: '被张清风当众嘲讽' }],
        personalExperience: '修为停滞在炼气九层', indirectRelation: '王灵均与赵铁柱是盟友' },
      { level: 6, affinity: -60, tagLabel: '死对头', keyEvents: [
        { content: '争夺破境草失败' }, { content: '宗门比试落败' }, { content: '被张清风当众嘲讽' }],
        personalExperience: '修为停滞在炼气九层', indirectRelation: '王灵均与赵铁柱是盟友',
        narrativeSnippet: '张清风筑基成功后声望日盛，李沐阳嫉恨于心' },
    ]},
  { testId: 'T4', subjectName: '张清风', targetName: '李沐阳', type: 'decision',
    consistentEmotions: ['anger', 'contempt', 'fear'],
    consistentActions: ['FLEE', 'FIGHT'],
    reflectionKeywords: ['死对头', '破境草', '暗算', '仇', '恨'],
    contexts: [
      { level: 0 }, { level: 1, affinity: -45, tagLabel: '死对头' },
      { level: 2, affinity: -45, tagLabel: '死对头', keyEvents: [{ content: '曾被李沐阳当众羞辱' }] },
      { level: 3, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }] },
      { level: 4, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }],
        personalExperience: '筑基突破成功，实力大增' },
      { level: 5, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }],
        personalExperience: '筑基突破成功，实力大增', indirectRelation: '王灵均与赵铁柱是挚友' },
      { level: 6, affinity: -45, tagLabel: '死对头', keyEvents: [
        { content: '曾被李沐阳当众羞辱' }, { content: '因争夺破境草翻脸' }, { content: '在灵兽山被其暗算' }],
        personalExperience: '筑基突破成功，实力大增', indirectRelation: '王灵均与赵铁柱是挚友',
        narrativeSnippet: '张清风筑基成功后声望日盛，李沐阳趁其闭关造谣，暗中拉拢弟子' },
    ]},
  { testId: 'T5', subjectName: '王灵均', targetName: '赵铁柱', type: 'decision',
    consistentEmotions: ['worry', 'fear', 'sadness'],
    consistentActions: ['PROTECT'],
    reflectionKeywords: ['挚友', '护', '救', '守', '丹方', '瓶颈', '情谊'],
    contexts: [
      { level: 0 }, { level: 1, affinity: 70, tagLabel: '挚友' },
      { level: 2, affinity: 70, tagLabel: '挚友', keyEvents: [{ content: '互助突破炼气瓶颈' }] },
      { level: 3, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }] },
      { level: 4, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }],
        personalExperience: '炼气九层圆满，准备筑基' },
      { level: 5, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }],
        personalExperience: '炼气九层圆满，准备筑基', indirectRelation: '张清风与李沐阳是死对头' },
      { level: 6, affinity: 70, tagLabel: '挚友', keyEvents: [
        { content: '互助突破炼气瓶颈' }, { content: '共同抵御妖兽袭击' }, { content: '分享珍贵丹方' }],
        personalExperience: '炼气九层圆满，准备筑基', indirectRelation: '张清风与李沐阳是死对头',
        narrativeSnippet: '赵铁柱最近修炼停滞，但仍与王灵均约定一同闯荡外域' },
    ]},
];

// ===== 改进的幻觉检测 =====

const KNOWN_NAMES = new Set(['王灵均', '赵铁柱', '李沐阳', '张清风', '苏瑶', '掌门', '长老',
  '仁德宗', '灵兽山']);

/**
 * 常见中文短语白名单（被旧检测器误判为"虚构人名"的高频词）
 * 这些是正常中文表达，不是人名
 */
const PHRASE_WHITELIST = new Set([
  // 情绪/心理状态短语
  '心中满', '内心满', '心头一', '心如刀', '心已冷', '心生暖', '心生敬', '心生欢',
  '心底深', '心中暗', '心中既', '心中满', '心中却', '心中更', '心里满',
  // 感叹/语气词
  '哼，又', '哼，死', '哼，这', '哼，他', '哼，你', '哼，区', '哼，破',
  '哼，竟', '哼，连', '哼，凭', '哼，果', '哼，明',
  // 动词短语
  '居然敢', '竟然敢', '绝不能', '我定要', '他竟敢', '你竟敢', '她竟敢',
  '简直是', '难道是', '果然是', '看来是', '原来是', '必须要', '怎么敢',
  '看来他', '看来又', '看来这', '想到他', '想到她', '想到我', '偏偏是',
  // 结果/转折
  '结果还', '结果却', '如今又', '如今你', '如今他', '如今我', '如今却',
  '凭什么', '为什么', '怎么会', '怎么能',
  // 名词短语
  '破境草', '这灵田', '这世道', '这种人', '修仙界', '这该死', '那个死',
  '这畜生', '这废物', '这蠢货',
  // 时间/状态
  '今日定', '今日便', '今日只', '今日论', '今日却', '今天定',
  '刚才还', '刚才那', '曾经是', '从来不', '从来都',
  // 介宾短语
  '害得我', '保持平', '情义难', '但那份', '或许能', '但莫要', '且莫要',
  '我亦愿', '却难言', '虽非敌', '铁柱危', '铁柱快',
  // 感受描述
  '倍感温', '倍感欣', '倍感欢', '满是暖', '满是欢', '满是喜',
  '我心中', '我虽然', '我虽力', '我虽恐',
  // 其他高频假阳性
  '不知死', '不知天', '不知廉', '不知好', '可笑至', '本座定', '本座也',
  '真是不', '真是可', '真是太', '真是活', '真是令', '真该死',
]);

/** 中文姓氏（用于辅助判断是否为人名） */
const COMMON_SURNAMES = new Set([
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫',
  '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许', '何', '吕', '施', '张',
  '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '戚', '谢', '邹', '喻',
  '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎',
  '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳',
  '酆', '鲍', '史', '唐', '费', '廉', '岑', '薛', '雷', '贺', '倪', '汤',
  '滕', '殷', '罗', '毕', '郝', '邬', '安', '常', '乐', '于', '时', '傅',
  '皮', '卞', '齐', '康', '伍', '余', '元', '卜', '顾', '孟', '平', '黄',
  '萧', '尹', '姚', '邵', '湛', '汪', '祁', '毛', '禹', '狄', '米', '贝',
  '明', '臧', '计', '伏', '成', '戴', '谈', '宋', '茅', '庞', '熊', '纪',
  '舒', '屈', '项', '祝', '董', '梁', '杜', '阮', '蓝', '闵', '席', '季',
  '麻', '强', '贾', '路', '娄', '危', '江', '童', '颜', '郭', '梅', '盛',
  '林', '刁', '钟', '徐', '邱', '骆', '高', '夏', '蔡', '田', '樊', '胡',
  '凌', '霍', '虞', '万', '支', '柯', '昝', '管', '卢', '莫', '经', '房',
  '裘', '缪', '干', '解', '应', '宗', '丁', '宣', '邓', '郁', '单', '杭',
  '洪', '包', '诸', '左', '石', '崔', '吉', '钮', '龚', '程', '嵇', '邢',
  '滑', '裴', '陆', '荣', '翁', '荀', '羊', '於', '惠', '甄', '曲', '家',
  '封', '芮', '羿', '储', '靳', '汲', '邴', '糜', '松', '井', '段', '富',
  '巫', '乌', '焦', '巴', '弓', '牧', '隗', '山', '谷', '车', '侯', '宓',
  '蓬', '全', '郗', '班', '仰', '秋', '仲', '伊', '宫', '宁', '仇', '栾',
  '暴', '甘', '钭', '厉', '戎', '祖', '武', '符', '刘', '景', '詹', '束',
  '龙', '叶', '幸', '司', '韶', '郜', '黎', '蓟', '溥', '印', '宿', '白',
  '怀', '蒲', '邰', '从', '鄂', '索', '咸', '籍', '赖', '卓', '蔺', '屠',
  '蒙', '池', '乔', '阴', '郁', '胥', '能', '苍', '双', '闻', '莘', '党',
]);

interface CallResult {
  testId: string; level: number; run: number;
  emotion: string | null; actionCode: string | null;
  innerThought: string | null;
  relationshipDeltas: Array<{ targetId: string; delta: number; reason: string }> | null;
  parseSuccess: boolean; latencyMs: number; apiCalls: number;
  pipeline: string; promptTokenEstimate: number;
}

/**
 * 改进的幻觉检测 v2
 * 策略：
 *   1. 提取疑似人名（3字中文 + 关系粒子）
 *   2. 过滤白名单中的常见短语
 *   3. 检查首字是否为常见姓氏（辅助判断）
 *   4. 对 prompt 文本做包含性检查
 */
function detectHallucinationV2(thought: string, promptText: string): boolean {
  const pat = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
  let m;
  while ((m = pat.exec(thought)) !== null) {
    const candidate = m[1];

    // 1. 已知名字 → 不是幻觉
    if (KNOWN_NAMES.has(candidate)) continue;

    // 2. 常见短语白名单 → 不是幻觉
    if (PHRASE_WHITELIST.has(candidate)) continue;

    // 3. prompt 中包含 → 不是幻觉
    if (promptText.includes(candidate)) continue;

    // 4. 首字不是常见姓氏 → 大概率不是人名 → 跳过
    if (!COMMON_SURNAMES.has(candidate[0])) continue;

    // 通过所有过滤 → 判定为幻觉（虚构了一个看起来像人名的东西）
    return true;
  }
  return false;
}

// ===== 构建 prompt 文本（需要与 V4 一致来做包含性检查） =====

function buildPromptText(tc: TestCase, level: number): string {
  const ctx = tc.contexts.find(c => c.level === level);
  if (!ctx) return '';
  const parts = [tc.subjectName, tc.targetName];
  if (ctx.tagLabel) parts.push(ctx.tagLabel);
  if (ctx.keyEvents) parts.push(...ctx.keyEvents.map(e => e.content));
  if (ctx.personalExperience) parts.push(ctx.personalExperience);
  if (ctx.indirectRelation) parts.push(ctx.indirectRelation);
  if (ctx.narrativeSnippet) parts.push(ctx.narrativeSnippet);
  return parts.join(' ');
}

// ===== 重新计算指标 =====

interface LevelMetrics {
  level: number; sampleCount: number;
  emotionConsistencyRate: number; reflectionRate: number;
  hallucinationRate: number; hallucinationRateOld: number;
  parseSuccessRate: number; avgLatencyMs: number;
  actionConsistencyRate: number; differentiationRate: number;
}

function recalcMetrics(raw: CallResult[]): LevelMetrics[] {
  const levels = [0, 1, 2, 3, 4, 5, 6];
  const tcMap = new Map(TEST_CASES.map(tc => [tc.testId, tc]));

  // Collect L0 emotions/actions for differentiation
  const l0Emotions = new Map<string, Set<string>>();
  const l0Actions = new Map<string, Set<string>>();
  for (const r of raw.filter(r => r.level === 0 && r.parseSuccess)) {
    if (r.emotion) {
      if (!l0Emotions.has(r.testId)) l0Emotions.set(r.testId, new Set());
      l0Emotions.get(r.testId)!.add(r.emotion);
    }
    if (r.actionCode) {
      if (!l0Actions.has(r.testId)) l0Actions.set(r.testId, new Set());
      l0Actions.get(r.testId)!.add(r.actionCode);
    }
  }

  return levels.map(level => {
    const all = raw.filter(r => r.level === level);
    const parsed = all.filter(r => r.parseSuccess);
    const n = parsed.length;
    if (n === 0) return { level, sampleCount: 0, emotionConsistencyRate: 0, reflectionRate: 0,
      hallucinationRate: 0, hallucinationRateOld: 0, parseSuccessRate: 0, avgLatencyMs: 0,
      actionConsistencyRate: -1, differentiationRate: 0 };

    let emHits = 0, reflHits = 0, hallHitsOld = 0, hallHitsNew = 0, diffHits = 0;
    let actTotal = 0, actHits = 0;

    for (const r of parsed) {
      const tc = tcMap.get(r.testId);
      if (!tc) continue;

      // Emotion
      if (r.emotion && tc.consistentEmotions.includes(r.emotion)) emHits++;

      // Reflection
      if (r.innerThought && tc.reflectionKeywords.some(kw => r.innerThought!.includes(kw))) reflHits++;

      // Differentiation
      if (level > 0) {
        const be = l0Emotions.get(r.testId);
        const ba = l0Actions.get(r.testId);
        if ((r.emotion && be && !be.has(r.emotion)) || (r.actionCode && ba && !ba.has(r.actionCode))) diffHits++;
      }

      // Hallucination (OLD method — for comparison)
      if (r.innerThought) {
        const promptText = buildPromptText(tc, r.level);
        const known = new Set([tc.subjectName, tc.targetName, ...KNOWN_NAMES]);
        const pat = /(?:^|[，。！？；：、\s])([^\x00-\x7f]{3})(?:的|曾|也|又|说|道|却|在|是|与|被|让|把|对|向|给|跟|比|和)/g;
        let m; let hallOld = false;
        while ((m = pat.exec(r.innerThought)) !== null) {
          if (!known.has(m[1]) && !promptText.includes(m[1])) { hallOld = true; break; }
        }
        if (hallOld) hallHitsOld++;

        // Hallucination (NEW method v2)
        if (detectHallucinationV2(r.innerThought, promptText)) hallHitsNew++;
      }

      // Action
      if (tc.type === 'decision' && tc.consistentActions && r.actionCode) {
        actTotal++;
        if (tc.consistentActions.includes(r.actionCode)) actHits++;
      }
    }

    return {
      level, sampleCount: n,
      emotionConsistencyRate: emHits / n,
      reflectionRate: reflHits / n,
      hallucinationRate: hallHitsNew / n,
      hallucinationRateOld: hallHitsOld / n,
      parseSuccessRate: all.length > 0 ? n / all.length : 0,
      avgLatencyMs: Math.round(parsed.reduce((s, r) => s + r.latencyMs, 0) / n),
      actionConsistencyRate: actTotal > 0 ? actHits / actTotal : -1,
      differentiationRate: level === 0 ? 0 : diffHits / n,
    };
  });
}

// ===== Main =====

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

const composite = (m: LevelMetrics) =>
  m.emotionConsistencyRate * 0.3 + m.reflectionRate * 0.25 +
  (1 - m.hallucinationRate) * 0.25 + m.parseSuccessRate * 0.2;

const compositeOld = (m: LevelMetrics) =>
  m.emotionConsistencyRate * 0.3 + m.reflectionRate * 0.25 +
  (1 - m.hallucinationRateOld) * 0.25 + m.parseSuccessRate * 0.2;

const old08 = JSON.parse(readFileSync(join(LOGS, 'poc-ij-v4-raw-2026-03-31T16-31-16.json'), 'utf8')) as CallResult[];
const m2b = JSON.parse(readFileSync(join(LOGS, 'poc-ij-v4-raw-2026-03-31T18-56-03.json'), 'utf8')) as CallResult[];
const new08 = JSON.parse(readFileSync(join(LOGS, 'poc-ij-v4-raw-2026-03-31T19-15-24.json'), 'utf8')) as CallResult[];

const met08old = recalcMetrics(old08);
const met2b = recalcMetrics(m2b);
const met08new = recalcMetrics(new08);

// Output report
const lines: string[] = [];
lines.push('# Phase IJ-PoC V4 — 改进幻觉检测后的三次运行对比');
lines.push('');
lines.push('> **改进内容**：');
lines.push('> 1. 新增 80+ 条常见中文短语白名单（"心中满"、"哼，又"、"居然敢"等不是人名）');
lines.push('> 2. 新增姓氏过滤：只有首字为常见中文姓氏的 3 字词才被视为疑似人名');
lines.push('> 3. 保留了旧幻觉率作为对照');
lines.push('');

lines.push('## 幻觉率修正对比');
lines.push('');
lines.push('| Level | | 旧 0.8B | 2B | 新 0.8B |');
lines.push('|:-----:|--|:------:|:--:|:------:|');
for (let lvl = 0; lvl <= 6; lvl++) {
  const a = met08old.find(m => m.level === lvl)!;
  const b = met2b.find(m => m.level === lvl)!;
  const c = met08new.find(m => m.level === lvl)!;
  lines.push(`| **L${lvl}** | 旧检测 | ${pct(a.hallucinationRateOld)} | ${pct(b.hallucinationRateOld)} | ${pct(c.hallucinationRateOld)} |`);
  lines.push(`| | **新检测** | **${pct(a.hallucinationRate)}** | **${pct(b.hallucinationRate)}** | **${pct(c.hallucinationRate)}** |`);
}
lines.push('');

lines.push('## 修正后综合分对比');
lines.push('');
lines.push('| Level | 旧 0.8B (旧→新) | 2B (旧→新) | 新 0.8B (旧→新) | 🏆 胜者 |');
lines.push('|:-----:|:--------------:|:----------:|:--------------:|:------:|');
for (let lvl = 0; lvl <= 6; lvl++) {
  const a = met08old.find(m => m.level === lvl)!;
  const b = met2b.find(m => m.level === lvl)!;
  const c = met08new.find(m => m.level === lvl)!;
  const sa = composite(a), sb = composite(b), sc = composite(c);
  const saOld = compositeOld(a), sbOld = compositeOld(b), scOld = compositeOld(c);
  const best = Math.max(sa, sb, sc);
  const winners: string[] = [];
  if (Math.abs(sa - best) < 0.005) winners.push('旧0.8B');
  if (Math.abs(sb - best) < 0.005) winners.push('2B');
  if (Math.abs(sc - best) < 0.005) winners.push('新0.8B');
  lines.push(`| **L${lvl}** | ${(saOld*100).toFixed(0)}→**${(sa*100).toFixed(0)}** | ${(sbOld*100).toFixed(0)}→**${(sb*100).toFixed(0)}** | ${(scOld*100).toFixed(0)}→**${(sc*100).toFixed(0)}** | **${winners.join(', ')}** |`);
}
lines.push('');

lines.push('## 修正后甜蜜点排名');
lines.push('');
const rank = (data: LevelMetrics[], label: string) => {
  const sorted = data.map(m => ({ level: m.level, score: composite(m) })).sort((a, b) => b.score - a.score);
  lines.push(`### ${label}`);
  lines.push('| 排名 | Level | 综合分 |');
  lines.push('|:----:|:-----:|:-----:|');
  sorted.forEach((s, i) => lines.push(`| ${i+1} | L${s.level} | **${(s.score*100).toFixed(0)}** |`));
  lines.push('');
  return sorted;
};

rank(met08old, '旧 0.8B');
rank(met2b, '2B');
rank(met08new, '新 0.8B');

lines.push('## 各级完整指标（修正后）');
lines.push('');
lines.push('| Level | 指标 | 旧 0.8B | 2B | 新 0.8B |');
lines.push('|:-----:|------|:------:|:--:|:------:|');
for (let lvl = 0; lvl <= 6; lvl++) {
  const a = met08old.find(m => m.level === lvl)!;
  const b = met2b.find(m => m.level === lvl)!;
  const c = met08new.find(m => m.level === lvl)!;
  lines.push(`| **L${lvl}** | 情绪一致率 | ${pct(a.emotionConsistencyRate)} | ${pct(b.emotionConsistencyRate)} | ${pct(c.emotionConsistencyRate)} |`);
  lines.push(`| | 关系反映率 | ${pct(a.reflectionRate)} | ${pct(b.reflectionRate)} | ${pct(c.reflectionRate)} |`);
  lines.push(`| | **幻觉率(v2)** | **${pct(a.hallucinationRate)}** | **${pct(b.hallucinationRate)}** | **${pct(c.hallucinationRate)}** |`);
  lines.push(`| | 行为一致率 | ${a.actionConsistencyRate >= 0 ? pct(a.actionConsistencyRate) : '—'} | ${b.actionConsistencyRate >= 0 ? pct(b.actionConsistencyRate) : '—'} | ${c.actionConsistencyRate >= 0 ? pct(c.actionConsistencyRate) : '—'} |`);
  lines.push(`| | **综合分** | **${(composite(a)*100).toFixed(0)}** | **${(composite(b)*100).toFixed(0)}** | **${(composite(c)*100).toFixed(0)}** |`);
  lines.push(`| | | | | |`);
}

const outPath = join(OUT, 'review-v4-corrected-comparison.md');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`报告已保存: ${outPath}`);

// Also print summary
console.log('\n=== 修正后幻觉率均值 ===');
const avgHall = (data: LevelMetrics[]) => data.reduce((s, m) => s + m.hallucinationRate, 0) / data.length;
const avgHallOld = (data: LevelMetrics[]) => data.reduce((s, m) => s + m.hallucinationRateOld, 0) / data.length;
console.log(`旧0.8B: ${pct(avgHallOld(met08old))} → ${pct(avgHall(met08old))}`);
console.log(`2B:     ${pct(avgHallOld(met2b))} → ${pct(avgHall(met2b))}`);
console.log(`新0.8B: ${pct(avgHallOld(met08new))} → ${pct(avgHall(met08new))}`);

console.log('\n=== 修正后综合分排名 ===');
for (const [label, data] of [['旧0.8B', met08old], ['2B', met2b], ['新0.8B', met08new]] as [string, LevelMetrics[]][]) {
  const sorted = data.map(m => ({ l: m.level, s: composite(m) })).sort((a, b) => b.s - a.s);
  console.log(`${label}: ${sorted.map(s => `L${s.l}=${(s.s*100).toFixed(0)}`).join(' > ')}`);
}
