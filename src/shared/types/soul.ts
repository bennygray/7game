/**
 * NPC 灵魂系统类型定义 — Phase E
 *
 * 定义：道德双轴、特性系统、情绪/事件、AI 评估结果、关系标签
 *
 * 设计原则：
 * - I3: AI 不直接写 GameState，soul-engine 作为中介校验
 * - I5: delta 变化硬上限 [-5, +5]（clampDelta 执行）
 * - I6: 关系有向存储（RelationshipEdge 双向独立）
 *
 * @see phaseE-TDD.md Step 2.1
 * @see Story #1
 */

// ===== 道德系统 =====

/** 道德双轴 — 善恶轴 × 秩序轴 */
export interface MoralAlignment {
  /** 善恶: [-100, +100]，正数=善，负数=恶 */
  goodEvil: number;
  /** 秩序: [-100, +100]，正数=守序，负数=混乱 */
  lawChaos: number;
}

// ===== 特性系统 =====

/** 弟子特性实例（存档用） */
export interface DiscipleTrait {
  /** 指向 TRAIT_REGISTRY 的 id */
  defId: string;
  /** 后天特性获取时间戳（先天特性无此字段） */
  acquiredAt?: number;
}

/** 特性效果 */
export interface TraitEffect {
  /** 效果类型 */
  type: 'behavior-weight' | 'relationship-modifier' | 'moral-drift' | 'emotion-weight';
  /** 效果目标（行为名/情绪名/etc.） */
  target: string;
  /** 数值 */
  value: number;
}

/** 后天特性触发条件 */
export interface AcquiredTrigger {
  /** 触发条件描述（用于引擎检测） */
  condition: string;
  /** 触发概率 [0, 1] */
  probability: number;
}

/** 特性定义（注册表条目） */
export interface TraitDef {
  id: string;
  name: string;
  /** 先天/后天 */
  category: 'innate' | 'acquired';
  /** 正面/负面/中性 */
  polarity: 'positive' | 'negative' | 'neutral';
  /** 特性效果列表 */
  effects: TraitEffect[];
  /** AI 提示词描述（植入 prompt 的人格描述） */
  aiHint: string;
  /** 仅后天特性有触发条件 */
  trigger?: AcquiredTrigger;
}

// ===== 情绪与事件 =====

/** 情绪标签 — 15 种基础情绪 */
export type EmotionTag =
  | 'joy'        // 喜悦
  | 'anger'      // 愤怒
  | 'envy'       // 嫉妒
  | 'admiration' // 钦佩
  | 'sadness'    // 悲伤
  | 'fear'       // 恐惧
  | 'contempt'   // 蔑视
  | 'neutral'    // 平静
  | 'jealousy'   // 妒忌
  | 'gratitude'  // 感激
  | 'guilt'      // 愧疚
  | 'worry'      // 担忧
  | 'shame'      // 羞耻
  | 'pride'      // 自豪
  | 'relief';    // 释然

/** 灵魂事件类型 — 可触发 AI 评估的事件 */
export type SoulEventType =
  | 'alchemy-success'    // 炼丹成功
  | 'alchemy-fail'       // 炼丹失败
  | 'harvest'            // 收获灵田
  | 'meditation'         // 修炼结束
  | 'explore-return'     // 历练归来
  | 'breakthrough-success' // 突破成功
  | 'breakthrough-fail'   // 突破失败
  | 'encounter-chat'      // Phase F0-α: 碰面闲聊
  | 'encounter-discuss'   // Phase F0-α: 碰面论道
  | 'encounter-conflict'  // Phase F0-α: 碰面冲突
  | 'world-event';        // Phase F0-β: 世界事件

/** 事件极性 — 正面/负面（用于 delta 方向修正） */
export type SoulEventPolarity = 'positive' | 'negative';

/** 弟子在事件中的角色 */
export type SoulRole = 'self' | 'observer';

// ===== 事件极性映射表 =====

/** 事件极性映射（用于 correctDeltaDirection） */
export const SOUL_EVENT_POLARITY: Record<SoulEventType, SoulEventPolarity> = {
  'alchemy-success':     'positive',
  'alchemy-fail':        'negative',
  'harvest':             'positive',
  'meditation':          'positive',
  'explore-return':      'positive',
  'breakthrough-success': 'positive',
  'breakthrough-fail':   'negative',
  // Phase F0-α: 碰面事件极性
  'encounter-chat':      'positive',
  'encounter-discuss':   'positive',
  'encounter-conflict':  'negative',
  // Phase F0-β: 世界事件（默认 positive；实际极性由 metadata.polarity 运行时覆盖）
  'world-event':         'positive',
};

// ===== AI 评估结果 =====

// ===== 弟子短期情绪状态（Phase F） =====

/**
 * 弟子短期情绪状态 — 运行时，不持久化
 *
 * 由 soul-engine.processSoulEvent 写入，soul-tick 衰减
 * planIntent → getEnhancedPersonalityWeights 读取
 *
 * @see phaseF-PRD.md §3.1 R-F-E1
 * @see phaseF-TDD.md Step 2.1
 */
export interface DiscipleEmotionState {
  /** 当前主导情绪 */
  currentEmotion: EmotionTag | null;
  /** 情绪强度 1~3 */
  emotionIntensity: 1 | 2 | 3;
  /** 设置时间戳 */
  emotionSetAt: number;
  /** 衰减计数器（soul-tick 每次 +1，到 EMOTION_DECAY_TICKS 时 intensity -1） */
  decayCounter: number;
}

// ===== AI 评估结果 =====

/** AI 评估结果 — soul-engine 后处理后写入 GameState */
export interface SoulEvaluationResult {
  /** 主导情绪 */
  emotion: EmotionTag;
  /** 情绪强度 1~3 */
  intensity: 1 | 2 | 3;
  /** 关系变化（引擎仲裁后的结果） */
  relationshipDeltas: Array<{
    targetId: string;
    delta: number;
    reason: string;
  }>;
  /** 内心独白（MUD 日志用） */
  innerThought: string;
}

// ===== 关系标签 =====

/** 关系标签 — 由 soul-engine 根据 affinity 自动分配 */
export type RelationshipTag = 'friend' | 'rival' | 'mentor' | 'admirer' | 'grudge';

/** 关系标签 affinity 阈值 */
export const RELATIONSHIP_TAG_THRESHOLDS = {
  friend:   60,   // affinity >= 60 → friend
  rival:   -60,   // affinity <= -60 → rival
} as const;

// ===== 情绪中文标签 =====

export const EMOTION_LABEL: Record<EmotionTag, string> = {
  joy:        '喜悦',
  anger:      '愤怒',
  envy:       '嫉妒',
  admiration: '钦佩',
  sadness:    '悲伤',
  fear:       '恐惧',
  contempt:   '蔑视',
  neutral:    '平静',
  jealousy:   '妒忌',
  gratitude:  '感激',
  guilt:      '愧疚',
  worry:      '担忧',
  shame:      '羞耻',
  pride:      '自豪',
  relief:     '释然',
};
