/**
 * 7game-lite 精简游戏状态 — v2
 *
 * Phase B-α: 删除 FieldSlot/AlchemyState，新增 FarmPlot/PillItem，
 * 弟子级 farmPlots + currentRecipeId。
 *
 * @see AGENTS.md §3.5 版本边界
 * @see 7game-lite-phaseB-analysis.md Step 2 + Fix 1~7
 */

import type { AISoulContext } from './ai-soul';
import { generateInitialDisciples, generateInitialRelationships } from '../../engine/disciple-generator';

// ===== 常量 =====

/** 大境界 */
export const Realm = {
  LIANQI: 1,
  ZHUJI:  2,
} as const;
export type Realm = (typeof Realm)[keyof typeof Realm];

/** 道基品质 */
export const DaoFoundation = {
  NONE:    0,  // 未突破（炼气期）
  FANPIN:  1,  // 凡品 ×1.5
  DIDAO:   2,  // 地道 ×2.5
  TIANDAO: 3,  // 天道 ×4.0
  WUXIA:   4,  // 无暇 ×8.0
} as const;
export type DaoFoundation = (typeof DaoFoundation)[keyof typeof DaoFoundation];

/** 炼丹品质 */
export type AlchemyQuality = 'waste' | 'low' | 'mid' | 'high' | 'perfect';

// ===== 子结构 =====

/**
 * 弟子种植记录（替代旧 FieldSlot）
 *
 * 使用 elapsedTicks 累计模式，解决 Date.now() 关机瞬间成熟问题 (Fix 1)
 * FARM 行为 ×2 加速 (Fix 7)
 */
export interface FarmPlot {
  /** 种子 ID */
  seedId: string;
  /** 种子固有生长时间（秒） */
  growthTimeSec: number;
  /** 已累计的生长 tick（受 FARM ×2 加速） */
  elapsedTicks: number;
  /** 是否已成熟 */
  mature: boolean;
}

/** 背包丹药 */
export interface PillItem {
  /** 丹方定义 ID */
  defId: string;
  /** 品质 */
  quality: AlchemyQuality;
  /** 数量 */
  count: number;
}

/** 弟子行为 */
export const DiscipleBehavior = {
  IDLE:      'idle',
  MEDITATE:  'meditate',
  ALCHEMY:   'alchemy',
  FARM:      'farm',
  EXPLORE:   'explore',
  REST:      'rest',
  BOUNTY:    'bounty',
} as const;
export type DiscipleBehavior = (typeof DiscipleBehavior)[keyof typeof DiscipleBehavior];

/** 五维性格特质 */
export interface PersonalityTraits {
  aggressive: number; // 0~1
  persistent: number;
  kind: number;
  lazy: number;
  smart: number;
}

/** 资质星级 */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/** 弟子状态（精简版，无薪俸字段） */
export interface LiteDiscipleState {
  /** 唯一 ID */
  id: string;
  /** 姓名 */
  name: string;
  /** 资质星级 1~5 */
  starRating: StarRating;
  /** 大境界 */
  realm: number;
  /** 小层数 */
  subRealm: number;
  /** 累积灵气 */
  aura: number;
  /** 五维性格特质 */
  personality: PersonalityTraits;
  /** 性格模板名称 */
  personalityName: string;
  /** 灵根 */
  spiritualRoots: string[];
  /** 当前行为状态 */
  behavior: DiscipleBehavior;
  /** 上次行为决策时间戳 */
  lastDecisionTime: number;
  /** 行为持续时间剩余（秒） */
  behaviorTimer: number;
  /** 体力 (0~100) */
  stamina: number;

  // === Phase B-α 新增 ===

  /** 灵田种植记录，最多 3 块 */
  farmPlots: FarmPlot[];
  /** 当前炼制的丹方 ID（null = 未在炼丹） */
  currentRecipeId: string | null;
}

/** 弟子关系边 */
export interface RelationshipEdge {
  sourceId: string;
  targetId: string;
  /** 关系值 -100 ~ +100 */
  value: number;
}

/** 宗门等级 */
export type SectLevel = 1 | 2 | 3 | 4;

/** 宗门状态 */
export interface SectState {
  name: string;
  level: SectLevel;
  reputation: number;
  /** 当前灵气浓度系数 */
  auraDensity: number;
  /** 灵石滴漏累积器 */
  stoneDripAccumulator: number;
  /** 弟子上缴丹药总数 */
  tributePills: number;
}

/** 悬赏任务状态 */
export type BountyStatus = 'posted' | 'assigned' | 'completed' | 'failed';

/** 悬赏任务实例 */
export interface BountyTask {
  id: string;
  grade: string;
  reward: number;
  reputationReward: number;
  durationSec: number;
  postedAt: number;
  assignedDiscipleId: string | null;
  assignedAt: number;
  status: BountyStatus;
}

/** 悬赏榜 */
export interface BountyBoard {
  activeBounties: BountyTask[];
  completedCount: number;
}

/** 一生统计 */
export interface LifetimeStats {
  alchemyTotal: number;
  alchemyPerfect: number;
  highestRealm: number;
  highestSubRealm: number;
  totalAuraEarned: number;
  breakthroughTotal: number;
}

// ===== 主状态 =====

/** 7game-lite 精简游戏状态 — v2 */
export interface LiteGameState {
  /** 存档版本号 */
  version: number;

  // === 核心资源 ===
  aura: number;
  spiritStones: number;

  // === 境界 ===
  realm: Realm;
  subRealm: number;
  daoFoundation: DaoFoundation;

  // === 悟性 ===
  comprehension: number;

  // === 丹药背包 (Phase B-α) ===
  pills: PillItem[];

  // === 宗门 ===
  sect: SectState;

  // === 弟子 ===
  disciples: LiteDiscipleState[];
  relationships: RelationshipEdge[];
  bountyBoard: BountyBoard;

  // === AI 灵智 ===
  aiContexts: Record<string, AISoulContext>;

  // === 背包 + 时间 ===
  materialPouch: Record<string, number>;
  inGameWorldTime: number;
  lastOnlineTime: number;

  // === 统计 ===
  lifetimeStats: LifetimeStats;
}

// ===== 工厂函数 =====

/** 创建默认新游戏状态 — v2 */
export function createDefaultLiteGameState(): LiteGameState {
  const now = Date.now();
  const disciples = generateInitialDisciples();
  return {
    version: 2,
    aura: 0,
    spiritStones: 200,
    realm: Realm.LIANQI,
    subRealm: 1,
    daoFoundation: DaoFoundation.NONE,
    comprehension: 0,
    pills: [],
    sect: {
      name: '无名小宗', level: 1, reputation: 0,
      auraDensity: 1.0, stoneDripAccumulator: 0, tributePills: 0,
    },
    disciples,
    relationships: generateInitialRelationships(disciples),
    bountyBoard: { activeBounties: [], completedCount: 0 },
    aiContexts: {},
    materialPouch: {},
    inGameWorldTime: 0,
    lastOnlineTime: now,
    lifetimeStats: {
      alchemyTotal: 0, alchemyPerfect: 0,
      highestRealm: Realm.LIANQI, highestSubRealm: 1,
      totalAuraEarned: 0, breakthroughTotal: 0,
    },
  };
}
