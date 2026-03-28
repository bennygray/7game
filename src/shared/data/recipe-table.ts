/**
 * 丹方数据表 — 纯数据，零逻辑
 *
 * 3 种丹方：回灵丹、修速丹、破镜丹
 * 数值来源：7game-lite-phaseB-analysis.md §3.2
 */

import type { AlchemyQuality } from '../types/game-state';

export type PillType = 'heal' | 'cultivate-boost' | 'breakthrough-aid';

export interface RecipeDef {
  /** 丹方 ID */
  id: string;
  /** 中文名 */
  name: string;
  /** 丹药类型 */
  type: PillType;
  /** 炼制耗时（秒） — 直接覆盖 behaviorTimer */
  craftTimeSec: number;
  /** 基础成功率 0~1 */
  baseSuccessRate: number;
  /** 主药消耗 */
  materials: Record<string, number>;
  /** 灵石消耗 */
  costStones: number;
  /** 最低悟性门槛 */
  requiredComprehension: number;
}

export const RECIPE_TABLE: readonly RecipeDef[] = [
  {
    id: 'hui-ling-dan',
    name: '回灵丹',
    type: 'heal',
    craftTimeSec: 15,
    baseSuccessRate: 0.80,
    materials: { 'low-herb': 3 },
    costStones: 10,
    requiredComprehension: 0,
  },
  {
    id: 'xiu-su-dan',
    name: '修速丹',
    type: 'cultivate-boost',
    craftTimeSec: 30,
    baseSuccessRate: 0.65,
    materials: { 'mid-herb': 1, 'low-herb': 2 },
    costStones: 30,
    requiredComprehension: 100,
  },
  {
    id: 'po-jing-dan',
    name: '破镜丹',
    type: 'breakthrough-aid',
    craftTimeSec: 60,
    baseSuccessRate: 0.50,
    materials: { 'break-herb': 2, 'mid-herb': 1 },
    costStones: 100,
    requiredComprehension: 500,
  },
] as const;

/** 按 ID 快速查找 */
export const RECIPE_BY_ID: ReadonlyMap<string, RecipeDef> = new Map(
  RECIPE_TABLE.map(r => [r.id, r])
);

/**
 * 品质效果倍率 — F-B3
 *
 * waste=0, low=0.6, mid=1.0, high=1.5, perfect=2.5
 */
export const QUALITY_MULTIPLIER: Record<AlchemyQuality, number> = {
  waste: 0,
  low: 0.6,
  mid: 1.0,
  high: 1.5,
  perfect: 2.5,
};

// ===== 丹药 ID 常量 (CR-P2) =====

/** 丹药 ID 集中管理，避免 magic string 散落 */
export const PILL_ID = {
  /** 回灵丹 */
  HEAL: 'hui-ling-dan',
  /** 修速丹 */
  BOOST: 'xiu-su-dan',
  /** 破镜丹 */
  BREAKTHROUGH: 'po-jing-dan',
} as const;

// ===== 丹药效果常量 (CR-P3) =====

/** 回灵丹基础恢复量（灵气） */
export const HEAL_PILL_BASE_AMOUNT = 500;

/** 修速丹基础持续秒数 */
export const BOOST_PILL_BASE_DURATION_SEC = 60;

/** 修速丹灵气速率倍率 */
export const BOOST_PILL_AURA_MULTIPLIER = 2.0;

/** 破镜丹每颗基础加成系数 */
export const BREAKTHROUGH_PILL_BONUS_PER = 0.15;

/** 破镜丹最大服用数量 */
export const BREAKTHROUGH_PILL_MAX_COUNT = 3;

/** 突破失败灵气惩罚比例 */
export const BREAKTHROUGH_FAILURE_PENALTY_RATIO = 0.5;

/** 突破成功率上限 */
export const BREAKTHROUGH_SUCCESS_CAP = 0.99;

/** 破镜丹自动服用门槛：基础成功率 ≤ 此值时才自动吃 (Fix C) */
export const BREAKTHROUGH_PILL_AUTO_THRESHOLD = 0.85;

/** 自动突破触发门槛：成功率 ≥ 此值时自动突破 (F-C1c) */
export const AUTO_BREAKTHROUGH_THRESHOLD = 0.80;
