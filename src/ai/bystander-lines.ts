/**
 * 旁观评论 Fallback 台词池
 *
 * Phase D: 当 AI 不可用时提供弟子间旁观评论的模板台词。
 *
 * R-D1h: AI 超时使用 fallback 模板台词
 * 5 种 outcomeTag x 5+ 条模板 + 性格前缀
 *
 * @see phaseD-PRD.md R-D1h
 * @see Story #3
 */

import type { PersonalityTraits } from '../shared/types/game-state';

// ===== 旁观评论模板 =====

const BYSTANDER_TEMPLATES: Record<string, string[]> = {
  'alchemy-success': [
    '哟，又出丹了？让我看看品质',
    '丹香四溢，修为又要精进了',
    '这丹药成色不错嘛',
    '上次我炼的比这个好多了',
    '真是个炼丹的好苗子',
    '哼，运气好罢了',
  ],
  'alchemy-fail': [
    '炸炉了？没事，下次注意火候',
    '这丹炉看着要散架了',
    '别灰心，失败是成功之母',
    '呵，又浪费材料了',
    '小心点，别把灵田也炸了',
    '慢慢来，急不得',
  ],
  'harvest': [
    '这收成不错嘛',
    '灵草长势喜人啊',
    '帮你摘几株吧',
    '这灵草品相上佳',
    '勤劳的修士，运气不会差',
    '灵田打理得不错',
  ],
  'meditation': [
    '修炼有所感悟？说来听听',
    '看你气息稳固，进步不小',
    '修行之道，贵在坚持',
    '灵气波动变大了，要突破了？',
    '这次入定时间不短啊',
    '感觉你的气息变强了',
  ],
  'explore-return': [
    '外面有什么新鲜事？',
    '怎么满身风尘，遇到什么了？',
    '带回什么好东西没？',
    '看你一脸兴奋，收获不小吧',
    '下次记得叫上我',
    '外面的灵气浓度如何？',
  ],
};

// ===== 性格前缀 =====

/** 根据性格特征添加口吻前缀 */
function getPersonalityPrefix(p: PersonalityTraits): string {
  // 找到最突出的性格维度
  const traits = [
    { key: 'aggressive', val: p.aggressive, prefix: '' },  // 攻击性高→直接无前缀
    { key: 'lazy', val: p.lazy, prefix: '（打了个哈欠）' },
    { key: 'kind', val: p.kind, prefix: '' },
    { key: 'smart', val: p.smart, prefix: '（推了推眼镜）' },
    { key: 'persistent', val: p.persistent, prefix: '' },
  ];

  const dominant = traits.reduce((a, b) => a.val > b.val ? a : b);

  // 只有突出性格 >= 0.7 才加前缀
  if (dominant.val >= 0.7 && dominant.prefix) {
    return dominant.prefix;
  }

  return '';
}

// ===== 导出 =====

/**
 * 生成旁观评论 fallback 台词
 *
 * @param outcomeTag 行为结果标签
 * @param personality 旁观弟子性格
 * @returns 台词文本，null 表示该 outcomeTag 不触发旁观评论
 */
export function generateBystanderLine(
  outcomeTag: string,
  personality: PersonalityTraits,
): string | null {
  const templates = BYSTANDER_TEMPLATES[outcomeTag];
  if (!templates || templates.length === 0) return null;

  // 随机选择一条
  const template = templates[Math.floor(Math.random() * templates.length)];

  // 添加性格前缀
  const prefix = getPersonalityPrefix(personality);
  return prefix ? `${prefix}${template}` : template;
}

// ===== 触发者回应模板（第二轮） =====

const RESPONSE_TEMPLATES: Record<string, string[]> = {
  'alchemy-success': [
    '哈哈，承让承让',
    '这次运气好罢了',
    '多练多练，总会好的',
  ],
  'alchemy-fail': [
    '唉，下次一定成功',
    '别提了，心疼材料……',
    '没事没事，习惯了',
  ],
  'harvest': [
    '一起来尝尝鲜？',
    '嘿嘿，这片灵田可是我精心打理的',
    '等会儿炼丹正好用上',
  ],
  'meditation': [
    '还差得远呢，继续努力',
    '嗯，今天感觉灵气特别充沛',
    '谢谢关心，你也加油',
  ],
  'explore-return': [
    '确实长了不少见识',
    '外面的世界比想象中大多了',
    '下次一起去？',
  ],
};

/**
 * 生成触发者的回应台词（第二轮对话）
 */
export function generateResponseLine(
  outcomeTag: string,
  personality: PersonalityTraits,
): string | null {
  const templates = RESPONSE_TEMPLATES[outcomeTag];
  if (!templates || templates.length === 0) return null;

  const template = templates[Math.floor(Math.random() * templates.length)];
  const prefix = getPersonalityPrefix(personality);
  return prefix ? `${prefix}${template}` : template;
}
