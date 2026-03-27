/**
 * 7game-lite 精简游戏状态
 *
 * 从 7waygame GameState 精简而来。仅保留骨架集 6 系统所需字段。
 * 止步筑基圆满，无功法/装备/薪俸/丹毒。
 *
 * @see AGENTS.md §3.5 版本边界
 * @see 7game-lite-analysis.md Step 2
 */

import type { AISoulContext } from './ai-soul';

// ===== 枚举 =====

/** 大境界枚举 */
export enum Realm {
  LIANQI = 1,   // 炼气
  ZHUJI  = 2,   // 筑基
}

/** 道基品质 */
export enum DaoFoundation {
  NONE    = 0,  // 未突破（炼气期）
  FANPIN  = 1,  // 凡品 ×1.5
  DIDAO   = 2,  // 地道 ×2.5
  TIANDAO = 3,  // 天道 ×4.0
  WUXIA   = 4,  // 无暇 ×8.0
}

/** 炼丹品质 */
export type AlchemyQuality = 'waste' | 'low' | 'mid' | 'high' | 'perfect';

// ===== 子结构 =====

/** 灵田格子 */
export interface FieldSlot {
  /** 种子 ID，null = 空地 */
  seedId: string | null;
  /** 生长进度 0~1，1 = 成熟 */
  progress: number;
  /** 种下时的现实时间戳 */
  plantedAt: number;
  /** 是否已成熟 */
  mature: boolean;
}

/** 炼丹状态 */
export interface AlchemyState {
  /** 当前炼制的丹方 ID，null = 未在炼丹 */
  recipeId: string | null;
  /** 炼丹开始的现实时间戳 */
  startTime: number;
  /** 炼丹结束的现实时间戳（预计） */
  endTime: number;
  /** 是否正在炼丹 */
  active: boolean;
}

/** 弟子行为枚举 */
export enum DiscipleBehavior {
  IDLE      = 'idle',
  MEDITATE  = 'meditate',
  ALCHEMY   = 'alchemy',
  FARM      = 'farm',
  EXPLORE   = 'explore',
  REST      = 'rest',
  BOUNTY    = 'bounty',
}

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

/** 7game-lite 精简游戏状态 */
export interface LiteGameState {
  /** 存档版本号 */
  version: number;

  // === 核心资源 ===
  aura: number;
  spiritStones: number;

  // === 境界 ===
  realm: number;
  subRealm: number;
  daoFoundation: number;

  // === 悟性 ===
  comprehension: number;

  // === 灵田 ===
  fields: FieldSlot[];

  // === 炼丹 ===
  alchemy: AlchemyState;

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

/** 创建默认新游戏状态 */
export function createDefaultLiteGameState(): LiteGameState {
  const now = Date.now();
  const disciples = generateInitialDisciples();
  return {
    version: 1,
    aura: 0,
    spiritStones: 200,
    realm: Realm.LIANQI,
    subRealm: 1,
    daoFoundation: DaoFoundation.NONE,
    comprehension: 0,
    fields: [
      { seedId: null, progress: 0, plantedAt: 0, mature: false },
      { seedId: null, progress: 0, plantedAt: 0, mature: false },
    ],
    alchemy: { recipeId: null, startTime: 0, endTime: 0, active: false },
    sect: { name: '无名小宗', level: 1, reputation: 0, auraDensity: 1.0, stoneDripAccumulator: 0 },
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

// ===== 弟子生成 =====

const SURNAMES = ['林', '陈', '张', '李', '王', '赵', '周', '吴', '孙', '刘'];
const GIVEN_NAMES = ['清风', '明月', '星河', '云烟', '紫霞', '青莲', '玄冰', '碧落', '天华', '灵犀'];
const SPIRITUAL_ROOTS = ['金', '木', '水', '火', '土'];

const PERSONALITY_TEMPLATES: { name: string; traits: PersonalityTraits }[] = [
  { name: '刚烈', traits: { aggressive: 0.8, persistent: 0.7, kind: 0.2, lazy: 0.1, smart: 0.5 } },
  { name: '温和', traits: { aggressive: 0.2, persistent: 0.5, kind: 0.8, lazy: 0.3, smart: 0.6 } },
  { name: '机敏', traits: { aggressive: 0.4, persistent: 0.6, kind: 0.5, lazy: 0.2, smart: 0.9 } },
];

let _idCounter = 0;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function rollStarRating(): StarRating {
  const roll = Math.random() * 100;
  if (roll < 30) return 1;
  if (roll < 60) return 2;
  if (roll < 85) return 3;
  if (roll < 97) return 4;
  return 5;
}

/** 随机生成一名弟子 */
export function generateRandomDisciple(): LiteDiscipleState {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const givenName = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
  const starRating = rollStarRating();
  const rootCount = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...SPIRITUAL_ROOTS].sort(() => Math.random() - 0.5);
  const spiritualRoots = shuffled.slice(0, rootCount);
  const template = PERSONALITY_TEMPLATES[Math.floor(Math.random() * PERSONALITY_TEMPLATES.length)];
  const personality: PersonalityTraits = {
    aggressive: clamp(template.traits.aggressive + (Math.random() - 0.5) * 0.2, 0, 1),
    persistent: clamp(template.traits.persistent + (Math.random() - 0.5) * 0.2, 0, 1),
    kind: clamp(template.traits.kind + (Math.random() - 0.5) * 0.2, 0, 1),
    lazy: clamp(template.traits.lazy + (Math.random() - 0.5) * 0.2, 0, 1),
    smart: clamp(template.traits.smart + (Math.random() - 0.5) * 0.2, 0, 1),
  };
  const subRealm = 1 + Math.floor(Math.random() * 3);

  _idCounter++;
  return {
    id: `disciple_${Date.now()}_${_idCounter}`,
    name: `${surname}${givenName}`,
    starRating,
    realm: 1,
    subRealm,
    aura: 0,
    personality,
    personalityName: template.name,
    spiritualRoots,
    behavior: DiscipleBehavior.IDLE,
    lastDecisionTime: Date.now(),
    behaviorTimer: 0,
    stamina: 100,
  };
}

/** 生成 4 名初始弟子 */
function generateInitialDisciples(): LiteDiscipleState[] {
  return Array.from({ length: 4 }, () => generateRandomDisciple());
}

/** 生成初始关系矩阵 */
function generateInitialRelationships(disciples: LiteDiscipleState[]): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  for (let i = 0; i < disciples.length; i++) {
    for (let j = 0; j < disciples.length; j++) {
      if (i === j) continue;
      edges.push({ sourceId: disciples[i].id, targetId: disciples[j].id, value: 0 });
    }
  }
  return edges;
}
