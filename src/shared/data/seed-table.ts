/**
 * 种子数据表 — 纯数据，零逻辑
 *
 * 3 种种子：清心草、碧灵果、破境草
 * 数值来源：7game-lite-phaseB-analysis.md §3.1
 */

export interface SeedDef {
  /** 种子 ID */
  id: string;
  /** 中文名 */
  name: string;
  /** 生长总时间（秒） */
  growthTimeSec: number;
  /** 收获产量（份） */
  harvestYield: number;
  /** 购买种子费用（灵石） */
  costStones: number;
  /** 解锁所需大境界（realm）和小层数（subRealm） */
  requiredRealm: number;
  requiredSubRealm: number;
}

export const SEED_TABLE: readonly SeedDef[] = [
  {
    id: 'low-herb',
    name: '清心草',
    growthTimeSec: 30,
    harvestYield: 2,
    costStones: 5,
    requiredRealm: 1,
    requiredSubRealm: 1,
  },
  {
    id: 'mid-herb',
    name: '碧灵果',
    growthTimeSec: 90,
    harvestYield: 1,
    costStones: 30,
    requiredRealm: 1,
    requiredSubRealm: 6,
  },
  {
    id: 'break-herb',
    name: '破境草',
    growthTimeSec: 180,
    harvestYield: 1,
    costStones: 100,
    requiredRealm: 1,
    requiredSubRealm: 9,
  },
] as const;

/** 按 ID 快速查找 */
export const SEED_BY_ID: ReadonlyMap<string, SeedDef> = new Map(
  SEED_TABLE.map(s => [s.id, s])
);
