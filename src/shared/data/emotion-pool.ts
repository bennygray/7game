/**
 * 情绪候选池 — 事件 × 角色 → 候选情绪列表
 *
 * 数据结构：
 *   emotionPool[eventType][role] → EmotionTag[]
 *
 * Delta 方向修正规则（R-E11 执行基础）：
 *   - self + positive event → delta 保持正向
 *   - self + negative event → delta 强制负向
 *   - observer → 不干预方向（允许嫉妒等负向情绪在正向事件时出现）
 *
 * @see phaseE-TDD.md Step 2, Story #3
 */

import type { EmotionTag, SoulEventType, SoulRole } from '../types/soul';

// ===== 候选情绪池 =====

/**
 * 事件×角色 → 候选情绪池
 * 每组 4~6 种情绪，AI 从中选择 1 种。
 */
export const EMOTION_CANDIDATE_POOL: Record<SoulEventType, Record<SoulRole, EmotionTag[]>> = {
  'alchemy-success': {
    self:     ['joy', 'pride', 'relief', 'neutral'],
    observer: ['admiration', 'joy', 'envy', 'jealousy', 'neutral'],
  },
  'alchemy-fail': {
    self:     ['sadness', 'anger', 'shame', 'worry', 'neutral'],
    observer: ['worry', 'contempt', 'neutral', 'sadness'],
  },
  'harvest': {
    self:     ['joy', 'pride', 'relief', 'neutral'],
    observer: ['joy', 'envy', 'admiration', 'neutral'],
  },
  'meditation': {
    self:     ['relief', 'pride', 'neutral', 'joy'],
    observer: ['admiration', 'envy', 'neutral', 'joy'],
  },
  'explore-return': {
    self:     ['joy', 'relief', 'pride', 'neutral', 'worry'],
    observer: ['admiration', 'joy', 'envy', 'neutral', 'worry'],
  },
  'breakthrough-success': {
    self:     ['joy', 'pride', 'relief', 'gratitude'],
    observer: ['admiration', 'joy', 'envy', 'jealousy', 'neutral'],
  },
  'breakthrough-fail': {
    self:     ['sadness', 'anger', 'shame', 'worry', 'neutral'],
    observer: ['worry', 'sadness', 'neutral', 'relief', 'contempt'],
  },
  // Phase F0-α: 碰面事件情绪候选池
  'encounter-chat': {
    self:     ['joy', 'neutral', 'relief', 'admiration'],
    observer: ['neutral', 'joy'],
  },
  'encounter-discuss': {
    self:     ['joy', 'admiration', 'gratitude', 'pride', 'neutral'],
    observer: ['admiration', 'envy', 'neutral', 'joy'],
  },
  'encounter-conflict': {
    self:     ['anger', 'contempt', 'sadness', 'fear', 'neutral'],
    observer: ['worry', 'contempt', 'neutral', 'fear'],
  },
  // Phase F0-β: 世界事件情绪候选池（广谱覆盖，实际极性由 metadata 决定）
  'world-event': {
    self:     ['joy', 'fear', 'worry', 'pride', 'neutral', 'sadness'],
    observer: ['worry', 'neutral', 'admiration', 'fear'],
  },
  // Phase I-alpha: 因果事件情绪候选池
  'causal-provoke': {
    self:     ['anger', 'contempt', 'pride', 'neutral'],
    observer: ['fear', 'worry', 'anger', 'neutral'],
  },
  'causal-gift': {
    self:     ['joy', 'gratitude', 'pride', 'neutral'],
    observer: ['admiration', 'joy', 'envy', 'neutral'],
  },
  'causal-theft': {
    self:     ['guilt', 'pride', 'contempt', 'neutral'],
    observer: ['anger', 'contempt', 'fear', 'neutral'],
  },
  'causal-jealousy': {
    self:     ['envy', 'anger', 'shame', 'neutral'],
    observer: ['contempt', 'sadness', 'neutral', 'worry'],
  },
  'causal-seclusion': {
    self:     ['sadness', 'worry', 'relief', 'neutral'],
    observer: ['admiration', 'worry', 'neutral', 'sadness'],
  },
  'causal-ethos-clash': {
    self:     ['anger', 'contempt', 'sadness', 'neutral'],
    observer: ['worry', 'fear', 'neutral', 'anger'],
  },
  // Phase I-beta: 社交事件情绪候选池
  'social-flirt': {
    self:     ['joy', 'pride', 'shame', 'neutral'],
    observer: ['envy', 'joy', 'contempt', 'neutral'],
  },
  'social-confession': {
    self:     ['fear', 'joy', 'worry', 'pride', 'neutral'],
    observer: ['admiration', 'envy', 'neutral', 'joy'],
  },
  'social-confession-accepted': {
    self:     ['joy', 'gratitude', 'pride', 'relief'],
    observer: ['admiration', 'envy', 'jealousy', 'neutral'],
  },
  'social-confession-rejected': {
    self:     ['sadness', 'shame', 'anger', 'neutral'],
    observer: ['worry', 'sadness', 'neutral', 'contempt'],
  },
  'social-sworn-proposal': {
    self:     ['joy', 'worry', 'pride', 'neutral'],
    observer: ['admiration', 'envy', 'neutral', 'joy'],
  },
  'social-sworn-accepted': {
    self:     ['joy', 'gratitude', 'pride', 'relief'],
    observer: ['admiration', 'envy', 'neutral', 'joy'],
  },
  'social-sworn-rejected': {
    self:     ['sadness', 'shame', 'anger', 'neutral'],
    observer: ['worry', 'neutral', 'sadness'],
  },
  'social-nemesis-declare': {
    self:     ['anger', 'contempt', 'pride', 'neutral'],
    observer: ['fear', 'worry', 'anger', 'neutral'],
  },
  'social-nemesis-accepted': {
    self:     ['anger', 'contempt', 'pride', 'neutral'],
    observer: ['fear', 'worry', 'neutral', 'anger'],
  },
  'social-nemesis-rejected': {
    self:     ['contempt', 'anger', 'shame', 'neutral'],
    observer: ['neutral', 'relief', 'worry'],
  },
  'social-lover-broken': {
    self:     ['sadness', 'anger', 'relief', 'neutral'],
    observer: ['sadness', 'worry', 'neutral', 'contempt'],
  },
  'social-sworn-broken': {
    self:     ['sadness', 'anger', 'contempt', 'neutral'],
    observer: ['sadness', 'worry', 'neutral', 'fear'],
  },
  'social-nemesis-resolved': {
    self:     ['relief', 'joy', 'gratitude', 'neutral'],
    observer: ['admiration', 'joy', 'neutral', 'relief'],
  },
};

// ===== 候选池查询 =====

/**
 * 获取事件×角色对应的候选情绪列表
 *
 * Story #3 AC1, AC2
 * 返回候选池，过滤掉不存在的情绪（如 sympathy 是错误填充）
 */
export function buildCandidatePool(eventType: SoulEventType, role: SoulRole): EmotionTag[] {
  const pool = EMOTION_CANDIDATE_POOL[eventType]?.[role];
  if (!pool || pool.length === 0) {
    // 兜底候选池
    return ['neutral', 'joy', 'sadness'];
  }
  // 过滤无效情绪标签（类型安全保证，但防止数据错误）
  const VALID_EMOTIONS: EmotionTag[] = [
    'joy', 'anger', 'envy', 'admiration', 'sadness', 'fear', 'contempt',
    'neutral', 'jealousy', 'gratitude', 'guilt', 'worry', 'shame', 'pride', 'relief',
  ];
  return pool.filter(e => VALID_EMOTIONS.includes(e));
}

// ===== Delta 方向修正 =====

import { SOUL_EVENT_POLARITY } from '../types/soul';

/**
 * 修正 AI 输出的关系 delta 方向（R-E11）
 *
 * 规则：
 * - role=self + polarity=positive → delta ≥ 0（强制为正或 0）
 * - role=self + polarity=negative → delta ≤ 0（强制为负或 0）
 * - role=observer → 不干预（允许正向事件出现负向嫉妒 delta）
 *
 * Story #3 AC3, AC4, AC6
 */
export function correctDeltaDirection(
  delta: number,
  role: SoulRole,
  eventType: SoulEventType,
): number {
  // observer 不干预方向
  if (role === 'observer') return delta;

  const polarity = SOUL_EVENT_POLARITY[eventType];

  if (polarity === 'positive' && delta < 0) {
    // self + positive event: delta 不应为负
    return Math.abs(delta);
  }
  if (polarity === 'negative' && delta > 0) {
    // self + negative event: delta 不应为正
    return -Math.abs(delta);
  }

  return delta;
}

/**
 * 夹值 delta 到 [-5, +5]（R-E11/I5）
 *
 * Story #3 AC5
 */
export function clampDelta(delta: number): number {
  const MAX_DELTA = 5;
  return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));
}

// ===== Fallback 规则引擎 =====

/**
 * fallback 情绪评估（无 AI 时使用）
 *
 * 从候选池随机选择，根据事件极性加权：
 * - positive event + self: 偏向 joy/pride
 * - negative event + self: 偏向 sadness/anger
 * - observer: 均匀随机
 *
 * Story #4 AC2
 */
export function fallbackSelectEmotion(eventType: SoulEventType, role: SoulRole): EmotionTag {
  const candidates = buildCandidatePool(eventType, role);
  if (candidates.length === 0) return 'neutral';

  // 简单随机（候选池已按事件极性预设）
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Fallback delta 计算（确定性，无 AI 时）
 *
 * 规则：
 * - positive event + self → +2
 * - negative event + self → -2
 * - observer → ±1（随机方向，模拟围观情绪）
 */
export function fallbackComputeDelta(eventType: SoulEventType, role: SoulRole): number {
  const polarity = SOUL_EVENT_POLARITY[eventType];
  if (role === 'self') {
    return polarity === 'positive' ? 2 : -2;
  }
  // observer: 小幅随机波动
  return (Math.random() < 0.5 ? 1 : -1);
}

/**
 * Fallback 内心独白生成（模板替换）
 *
 * Story #4 AC2
 */
export function fallbackGenerateThought(
  eventType: SoulEventType,
  role: SoulRole,
  discipleName: string,
  actorName: string,
): string {
  if (role === 'self') {
    const templates: Record<SoulEventType, string> = {
      'alchemy-success':     `${discipleName}心中暗喜：「功夫不负有心人，此次炼丹终于成了！」`,
      'alchemy-fail':        `${discipleName}暗叹：「炉火把握失当，又是一炉废丹…须得再加苦练。」`,
      'harvest':             `${discipleName}欣然想道：「灵草长势喜人，宗门的灵田没有白照料。」`,
      'meditation':          `${discipleName}静思：「今日修炼颇有所得，道心更进一步。」`,
      'explore-return':      `${discipleName}回想此行：「外面的世界风云变幻，历练令我成长不少。」`,
      'breakthrough-success':`${discipleName}心潮澎湃：「终于突破了！境界提升，天地法则更加清晰！」`,
      'breakthrough-fail':   `${discipleName}眉头紧锁：「距离突破尚有一线之隔，须从长计议…」`,
      // Phase F0-α: 碰面事件
      'encounter-chat':      `${discipleName}想：「今日碰见了同门，闲聊了几句，倒也有趣。」`,
      'encounter-discuss':   `${discipleName}想：「从同门处学到了不少，修炼的感悟更深了。」`,
      'encounter-conflict':  `${discipleName}怒道：「今日受了气，必须记住这笔账！」`,
      // Phase F0-β: 世界事件
      'world-event':         `${discipleName}喊道：「宗门出了异事，不知是福是祸…」`,
      // Phase I-alpha: 因果事件
      'causal-provoke':     `${discipleName}冷哼一声："今日且让你知道厉害。"`,
      'causal-gift':        `${discipleName}微微一笑，将礼物递了出去。`,
      'causal-theft':       `${discipleName}心中暗忖："这些灵石，不过是取回该拿的。"`,
      'causal-jealousy':    `${discipleName}攥紧了拳头，心中难以平静。`,
      'causal-seclusion':   `${discipleName}叹了口气，默默走向闭关洞。`,
      'causal-ethos-clash': `${discipleName}低声道："此道非我道……"`,
      // Phase I-beta: 社交事件
      'social-flirt':                `${discipleName}心中微微一荡，面上却不动声色。`,
      'social-confession':           `${discipleName}深吸一口气，鼓起了告白的勇气。`,
      'social-confession-accepted':  `${discipleName}喜不自胜："你……当真愿意？"`,
      'social-confession-rejected':  `${discipleName}苦笑一声，转身离去。`,
      'social-sworn-proposal':       `${discipleName}抱拳道："愿与君结为金兰之交！"`,
      'social-sworn-accepted':       `${discipleName}大喜："自此祸福与共，不离不弃！"`,
      'social-sworn-rejected':       `${discipleName}默然片刻："也罢，是我唐突了。"`,
      'social-nemesis-declare':      `${discipleName}冷声道："你我之间，不死不休！"`,
      'social-nemesis-accepted':     `${discipleName}冷笑一声："那便来吧。"`,
      'social-nemesis-rejected':     `${discipleName}哼了一声："躲得了初一，躲不了十五。"`,
      'social-lover-broken':         `${discipleName}长叹一声："道不同，不相为谋。"`,
      'social-sworn-broken':         `${discipleName}攥紧双拳："金兰之谊，今日到此为止！"`,
      'social-nemesis-resolved':     `${discipleName}缓缓放下了手中的兵刃："罢了，恩怨一笔勾销。"`,
    };
    return templates[eventType] ?? `${discipleName}陷入沉思。`;
  } else {
    const templates: Partial<Record<SoulEventType, string>> = {
      'alchemy-success':     `${discipleName}望着${actorName}的炼丹成果，心中五味杂陈。`,
      'alchemy-fail':        `${discipleName}见${actorName}炼丹失败，默默叹了口气。`,
      'breakthrough-success':`${discipleName}看着${actorName}突破成功，心中不由得生出感慨。`,
      'breakthrough-fail':   `${discipleName}听闻${actorName}突破受阻，心中微微一动。`,
    };
    return templates[eventType] ?? `${discipleName}注意到了${actorName}的情况。`;
  }
}
