/**
 * 碰面系统类型定义 — Phase F0-α
 *
 * 定义：地点标签、碰面结果、行为→地点映射、碰面引擎常量、概率表
 *
 * 设计原则：
 * - I1: 地点是行为的纯函数派生，不独立持久化
 * - I2: 碰面检定不改变任何 GameState
 *
 * @see phaseF0-alpha-TDD.md Step 2.1
 * @see phaseF0-alpha-PRD.md §3
 */

import type { DiscipleBehavior } from './game-state';

// ===== 地点标签 =====

/** 地点标签 — 6 个 Zone (PRD §3.1 R-F0α-E1) */
export const LocationTag = {
  SECT_HALL:      'sect-hall',
  DAN_ROOM:       'dan-room',
  LING_TIAN:      'ling-tian',
  BACK_MOUNTAIN:  'back-mountain',
  LING_SHOU_SHAN: 'ling-shou-shan',
  BOUNTY_FIELD:   'bounty-field',
} as const;
export type LocationTag = (typeof LocationTag)[keyof typeof LocationTag];

// ===== 碰面结果 =====

/** 碰面结果 — 5 种 (PRD §3.1 R-F0α-E2 + Phase I-beta) */
export const EncounterResult = {
  CHAT:     'chat',
  DISCUSS:  'discuss',
  CONFLICT: 'conflict',
  FLIRT:    'flirt',     // Phase I-beta: 碰面调情
  NONE:     'none',
} as const;
export type EncounterResult = (typeof EncounterResult)[keyof typeof EncounterResult];

// ===== 地点中文名映射 =====

/** 地点中文名映射 (PRD §4.1) */
export const LOCATION_LABEL: Record<LocationTag, string> = {
  'sect-hall':      '宗门大殿',
  'dan-room':       '丹房',
  'ling-tian':      '灵田',
  'back-mountain':  '后山',
  'ling-shou-shan': '灵兽山',
  'bounty-field':   '悬赏任务区',
};

// ===== 行为 → 地点映射 =====

/** 行为 → 地点完整映射表 (PRD §3.3 F-F0α-01) */
export const BEHAVIOR_LOCATION_MAP: Record<DiscipleBehavior, LocationTag> = {
  meditate: 'back-mountain',
  alchemy:  'dan-room',
  farm:     'ling-tian',
  explore:  'ling-shou-shan',
  bounty:   'bounty-field',
  rest:     'sect-hall',
  idle:     'sect-hall',
};

/**
 * 纯函数：推导弟子所在地点
 *
 * Story #1 AC1/AC2: 行为→地点映射
 * I1: 无副作用，不持久化
 *
 * @see PRD §3.3 F-F0α-01
 */
export function getDiscipleLocation(behavior: DiscipleBehavior): LocationTag {
  return BEHAVIOR_LOCATION_MAP[behavior];
}

// ===== 碰面引擎常量 =====

/** 碰面扫描间隔（秒/tick）(PRD §3.3 F-F0α-02) */
export const ENCOUNTER_SCAN_INTERVAL_SEC = 5;

/** 同一对弟子碰面冷却（秒）(PRD §3.3 F-F0α-02) */
export const ENCOUNTER_COOLDOWN_SEC = 60;

/** 碰面基础概率 (PRD §3.3 F-F0α-02) */
export const BASE_ENCOUNTER_CHANCE = 0.20;

// ===== 好感度分档阈值 =====

/** 亲疏度分档阈值 (PRD §3.3 F-F0α-03 + Phase I-beta) */
export const CLOSENESS_BAND = {
  /** 挚友带：avg_closeness >= 60 */
  FRIEND_THRESHOLD:  60,
  /** 敌对带：avg_closeness <= -60 */
  HOSTILE_THRESHOLD: -60,
} as const;

/** 亲疏度分档标签（Phase I-beta: +crush-lover） */
export type ClosenessBand = 'friend' | 'hostile' | 'neutral' | 'crush-lover';

// ===== 碰面结果概率表 =====

/**
 * 概率表 — 加权随机权重
 * 按 [discuss, chat, conflict, none] 排列
 * 每行权重之和 = 100（与 PRD 百分比 1:1 对应）
 *
 * @see PRD §3.3 F-F0α-03 结果概率表
 */
export const ENCOUNTER_PROBABILITY_TABLE: Record<
  ClosenessBand,
  { discuss: number; chat: number; conflict: number; flirt: number; none: number }
> = {
  friend:        { discuss: 50, chat: 50, conflict:  0, flirt:  0, none:  0 },
  hostile:       { discuss:  0, chat: 10, conflict: 60, flirt:  0, none: 30 },
  neutral:       { discuss:  5, chat: 30, conflict:  5, flirt:  0, none: 60 },
  'crush-lover': { discuss: 20, chat: 60, conflict:  0, flirt: 15, none:  5 },
};

// ===== 碰面事件元数据 =====

/**
 * 碰面事件元数据负载 (PRD §3.1 R-F0α-E6)
 *
 * 通过 SoulEvent.metadata 传递，encounter-tick handler 写入，
 * 未来 Phase F 的 soul-event handler 消费。
 */
export interface EncounterEventPayload {
  partnerId: string;
  partnerName: string;
  location: LocationTag;
  encounterResult: Exclude<EncounterResult, 'none'>;
  avgCloseness: number;
}

// ===== 工具函数 =====

/**
 * 根据平均亲疏度判定分档
 * Phase I-beta: hasRomanticInterest 为 true 时使用 crush-lover 分档
 * @see PRD §3.3 F-F0α-03 + phaseI-beta-PRD §5.4
 */
export function getClosenessBand(avgCloseness: number, hasRomanticInterest: boolean = false): ClosenessBand {
  if (hasRomanticInterest) return 'crush-lover';
  if (avgCloseness >= CLOSENESS_BAND.FRIEND_THRESHOLD) return 'friend';
  if (avgCloseness <= CLOSENESS_BAND.HOSTILE_THRESHOLD) return 'hostile';
  return 'neutral';
}

/**
 * 加权随机选择碰面结果
 *
 * Review WARN-2：支持注入 randomFn 以实现 seed 化测试
 * @see PRD §3.3 F-F0α-03 掷骰方法
 */
export function decideEncounterResult(
  avgCloseness: number,
  hasRomanticInterest: boolean = false,
  randomFn: () => number = Math.random,
): EncounterResult {
  const band = getClosenessBand(avgCloseness, hasRomanticInterest);
  const weights = ENCOUNTER_PROBABILITY_TABLE[band];

  const roll = randomFn() * 100;
  let cumulative = 0;

  cumulative += weights.discuss;
  if (roll < cumulative) return EncounterResult.DISCUSS;

  cumulative += weights.chat;
  if (roll < cumulative) return EncounterResult.CHAT;

  cumulative += weights.conflict;
  if (roll < cumulative) return EncounterResult.CONFLICT;

  cumulative += weights.flirt;
  if (roll < cumulative) return EncounterResult.FLIRT;

  return EncounterResult.NONE;
}

/**
 * 查找两个弟子之间的平均好感度
 *
 * Review WARN-1：关系边不存在时 fallback 为 0
 */
export function getAvgCloseness(
  relationships: ReadonlyArray<{ sourceId: string; targetId: string; closeness: number }>,
  idA: string,
  idB: string,
): number {
  const aToB = relationships.find(r => r.sourceId === idA && r.targetId === idB);
  const bToA = relationships.find(r => r.sourceId === idB && r.targetId === idA);
  const closA = aToB?.closeness ?? 0;
  const closB = bToA?.closeness ?? 0;
  return (closA + closB) / 2;
}
