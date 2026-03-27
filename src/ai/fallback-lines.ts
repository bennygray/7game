/**
 * 模板台词库 — AI 推理不可用时的 fallback
 *
 * 按 行为类型 × 性格倾向 组织，确保无后端时体验完整。
 *
 * @see Story #5 AC3
 */

import type { PersonalityTraits, DiscipleBehavior } from '../shared/types/game-state';

/** 通用台词池（按行为分类） */
const LINES: Record<string, string[]> = {
  meditate: [
    '闭目凝神，灵气如潮水般涌来……',
    '心如止水，万物皆空。',
    '吸一口灵气，感觉经脉都在震动。',
    '今日修炼，必有所悟！',
    '安静……让我好好感悟天地之理。',
  ],
  explore: [
    '出去走走，说不定有什么奇遇。',
    '这片灵山还有很多未探索之地。',
    '听说东边的密林里有灵药……',
    '出发！去看看外面的世界。',
    '独自探索，最是自在。',
  ],
  rest: [
    '好困啊……先睡一会儿……',
    '修炼太累了，歇一歇。',
    '打个盹，恢复精力。',
    '……zzZ',
    '不急不急，养好精神再说。',
  ],
  alchemy: [
    '丹炉已热，该炼丹了。',
    '今天试试新配方……',
    '火候很关键，不能分心。',
    '希望这炉丹药能成功。',
    '药材备齐，开炉！',
  ],
  farm: [
    '这些灵草长势不错呢～',
    '浇点灵泉水，它们会长得更快。',
    '灵田的活儿虽累，但让人心安。',
    '看着灵草发芽，很有成就感。',
    '除除草，松松土。',
  ],
  bounty: [
    '这悬赏任务交给我吧！',
    '赏金到手，美滋滋。',
    '出发执行任务了。',
    '这任务有点挑战，正合我意。',
    '悬赏榜上的任务，我来接！',
  ],
};

/** 性格化加料台词（追加在通用台词前） */
const PERSONALITY_PREFIX: {
  trait: keyof PersonalityTraits;
  threshold: number;
  prefixes: string[];
}[] = [
  {
    trait: 'aggressive',
    threshold: 0.7,
    prefixes: ['哼！', '让开！', '谁敢拦我？', '本座……'],
  },
  {
    trait: 'kind',
    threshold: 0.7,
    prefixes: ['嗯～', '大家加油！', '一起努力吧！', '希望大家都好。'],
  },
  {
    trait: 'lazy',
    threshold: 0.7,
    prefixes: ['唔……', '好麻烦啊……', '能不能不去……', '哈欠～'],
  },
  {
    trait: 'smart',
    threshold: 0.8,
    prefixes: ['据我推算……', '有意思……', '我倒要研究研究。', '依理而言……'],
  },
];

/**
 * 生成 fallback 台词
 *
 * @param behavior 当前行为
 * @param personality 弟子性格
 * @returns 一句模板台词
 */
export function generateFallbackLine(
  behavior: DiscipleBehavior,
  personality: PersonalityTraits,
): string {
  // 1. 从行为台词池随机选一句
  const pool = LINES[behavior] ?? LINES.meditate;
  const baseLine = pool[Math.floor(Math.random() * pool.length)];

  // 2. 检查是否有突出性格 → 加料
  for (const rule of PERSONALITY_PREFIX) {
    if (personality[rule.trait] >= rule.threshold) {
      const prefix = rule.prefixes[Math.floor(Math.random() * rule.prefixes.length)];
      return `${prefix}${baseLine}`;
    }
  }

  return baseLine;
}
