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
