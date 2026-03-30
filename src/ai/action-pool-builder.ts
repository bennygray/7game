/**
 * 行为动作候选池构建器 — Phase G4
 *
 * 为 Lv.3 STORM 级别事件构建 AI 可选的行为动作池。
 * 类似于 emotion-pool.ts 对情绪的候选约束，此文件约束行为决策。
 *
 * 设计：
 * - 每种事件类型映射到 4-6 个候选动作
 * - G3 道德过滤：根据弟子 moral.goodEvil 过滤不合适的选项
 * - 动作码用于 json_schema enum 约束（GBNF 硬件级强制）
 *
 * @see poc-2e-split-pipeline.ts — 双阶段验证
 * @see SOUL-VISION-ROADMAP.md Phase G, G4
 */

/** 动作选项 */
export interface ActionOption {
  code: string;
  label: string;
  /** 道德倾向：'good'=善良选项, 'evil'=邪恶选项, 'neutral'=中性 */
  moralAlign: 'good' | 'evil' | 'neutral';
}

// ===== 世界事件动作池 =====

/** 战斗类事件（妖兽来袭等） */
const COMBAT_ACTIONS: ActionOption[] = [
  { code: 'FIGHT', label: '挺身迎战', moralAlign: 'neutral' },
  { code: 'PROTECT', label: '保护弱小同门', moralAlign: 'good' },
  { code: 'FLEE', label: '趁乱逃跑', moralAlign: 'neutral' },
  { code: 'LOOT', label: '趁乱捡拾战利品', moralAlign: 'evil' },
  { code: 'HIDE', label: '躲起来观望', moralAlign: 'neutral' },
];

/** 社交类事件（散修来访/宗门挑战等） */
const SOCIAL_ACTIONS: ActionOption[] = [
  { code: 'WELCOME', label: '热情迎接', moralAlign: 'good' },
  { code: 'OBSERVE', label: '冷眼旁观', moralAlign: 'neutral' },
  { code: 'CHALLENGE', label: '出言挑衅', moralAlign: 'evil' },
  { code: 'TRADE', label: '尝试交易', moralAlign: 'neutral' },
  { code: 'REPORT', label: '向长老禀报', moralAlign: 'neutral' },
];

/** 机缘类事件（天材地宝/灵脉波动等） */
const OPPORTUNITY_ACTIONS: ActionOption[] = [
  { code: 'SHARE', label: '与同门分享', moralAlign: 'good' },
  { code: 'SEIZE', label: '独吞机缘', moralAlign: 'evil' },
  { code: 'EXPLORE', label: '谨慎探索', moralAlign: 'neutral' },
  { code: 'GUARD', label: '守护现场等长老', moralAlign: 'good' },
  { code: 'IGNORE', label: '视而不见', moralAlign: 'neutral' },
];

/** 冲突类事件（碰面冲突/突破失败等） */
const CONFLICT_ACTIONS: ActionOption[] = [
  { code: 'CONFRONT', label: '正面对峙', moralAlign: 'neutral' },
  { code: 'MEDIATE', label: '出面调解', moralAlign: 'good' },
  { code: 'PROVOKE', label: '火上浇油', moralAlign: 'evil' },
  { code: 'RETREAT', label: '退让避让', moralAlign: 'neutral' },
  { code: 'SABOTAGE', label: '暗中使绊', moralAlign: 'evil' },
];

/** 默认通用动作池 */
const DEFAULT_ACTIONS: ActionOption[] = [
  { code: 'ACT', label: '积极应对', moralAlign: 'neutral' },
  { code: 'HELP', label: '出手帮忙', moralAlign: 'good' },
  { code: 'IGNORE', label: '置身事外', moralAlign: 'neutral' },
  { code: 'EXPLOIT', label: '趁火打劫', moralAlign: 'evil' },
];

// ===== 事件类型→动作池映射 =====

/** 世界事件 ID 前缀到动作池的映射 */
const WORLD_EVENT_ACTION_MAP: Record<string, ActionOption[]> = {
  'beast-': COMBAT_ACTIONS,
  'wandering-': SOCIAL_ACTIONS,
  'merchant-': SOCIAL_ACTIONS,
  'sect-master-': SOCIAL_ACTIONS,
  'spirit-herb-': OPPORTUNITY_ACTIONS,
  'ancient-artifact-': OPPORTUNITY_ACTIONS,
  'spiritual-vein-': OPPORTUNITY_ACTIONS,
  'incense-': SOCIAL_ACTIONS,
  'philosophical-': SOCIAL_ACTIONS,
};

/** 非世界事件的动作池映射 */
const EVENT_TYPE_ACTION_MAP: Record<string, ActionOption[]> = {
  'encounter-conflict': CONFLICT_ACTIONS,
  'breakthrough-fail': [
    { code: 'PERSEVERE', label: '咬牙再试', moralAlign: 'neutral' },
    { code: 'REST', label: '安心疗伤', moralAlign: 'neutral' },
    { code: 'SEEK_HELP', label: '求助同门', moralAlign: 'good' },
    { code: 'BLAME', label: '迁怒他人', moralAlign: 'evil' },
  ],
};

/**
 * 构建动作候选池
 *
 * @param eventType SoulEventType
 * @param eventDefId 世界事件定义 ID（仅 world-event 类型有）
 * @param goodEvil 弟子善恶轴 [-100, +100]
 * @returns 过滤后的动作候选列表（至少 2 个）
 */
export function buildActionPool(
  eventType: string,
  eventDefId: string | undefined,
  goodEvil: number,
): ActionOption[] {
  // 1. 选择基础动作池
  let pool: ActionOption[];

  if (eventType === 'world-event' && eventDefId) {
    // 按世界事件 ID 前缀匹配
    const matchedKey = Object.keys(WORLD_EVENT_ACTION_MAP).find(prefix =>
      eventDefId.startsWith(prefix),
    );
    pool = matchedKey ? [...WORLD_EVENT_ACTION_MAP[matchedKey]] : [...DEFAULT_ACTIONS];
  } else {
    pool = [...(EVENT_TYPE_ACTION_MAP[eventType] ?? DEFAULT_ACTIONS)];
  }

  // 2. G3: 道德感知过滤
  if (goodEvil > 30) {
    // 善良弟子：移除邪恶选项
    const filtered = pool.filter(a => a.moralAlign !== 'evil');
    if (filtered.length >= 2) pool = filtered;
  } else if (goodEvil < -30) {
    // 邪恶弟子：移除善良选项
    const filtered = pool.filter(a => a.moralAlign !== 'good');
    if (filtered.length >= 2) pool = filtered;
  }

  return pool;
}
