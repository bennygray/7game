/**
 * 境界数值表 — 纯数据，零逻辑
 *
 * 复用自 7waygame shared/data/realm-table.ts
 * 速率公式：幂函数 ceil(层数^1.35)
 * lite 版截止筑基圆满，移除金丹以上、战斗属性
 *
 * @see AGENTS.md §八 跨项目复用约束
 */

export interface SubRealmEntry {
  realm: number;
  subRealm: number;
  /** 到达该层所需灵气消耗 */
  auraCost: number;
  /** 该层基础灵气产出率（灵/秒） */
  baseAuraRate: number;
  unlockDesc: string;
}

// ===== 炼气期 1-9 层 =====

export const LIANQI_TABLE: readonly SubRealmEntry[] = [
  { realm: 1, subRealm: 1, auraCost: 60,      baseAuraRate: 1,  unlockDesc: '游戏开始' },
  { realm: 1, subRealm: 2, auraCost: 180,     baseAuraRate: 3,  unlockDesc: '灵田浇水加速' },
  { realm: 1, subRealm: 3, auraCost: 500,     baseAuraRate: 5,  unlockDesc: '解锁第2格灵田' },
  { realm: 1, subRealm: 4, auraCost: 1_500,   baseAuraRate: 7,  unlockDesc: '解锁炼丹炉' },
  { realm: 1, subRealm: 5, auraCost: 4_000,   baseAuraRate: 10, unlockDesc: '服用回灵丹' },
  { realm: 1, subRealm: 6, auraCost: 10_000,  baseAuraRate: 13, unlockDesc: '种植碧灵果' },
  { realm: 1, subRealm: 7, auraCost: 25_000,  baseAuraRate: 16, unlockDesc: '解锁第3格灵田' },
  { realm: 1, subRealm: 8, auraCost: 60_000,  baseAuraRate: 20, unlockDesc: '百年期药材种子' },
  { realm: 1, subRealm: 9, auraCost: 150_000, baseAuraRate: 24, unlockDesc: '炼气圆满，准备筑基' },
] as const;

export const LIANQI_BY_SUB: ReadonlyMap<number, SubRealmEntry> = new Map(
  LIANQI_TABLE.map(e => [e.subRealm, e])
);

/** 炼气 → 筑基突破所需灵气（天劫前置条件） */
export const LIANQI_TO_ZHUJI_COST = 500_000;

// ===== 筑基期（4 阶段） =====

export const ZHUJI_TABLE: readonly SubRealmEntry[] = [
  { realm: 2, subRealm: 1, auraCost: 2_000_000,   baseAuraRate: 80,  unlockDesc: '筑基初期' },
  { realm: 2, subRealm: 2, auraCost: 8_000_000,   baseAuraRate: 120, unlockDesc: '筑基中期' },
  { realm: 2, subRealm: 3, auraCost: 30_000_000,  baseAuraRate: 200, unlockDesc: '筑基后期' },
  { realm: 2, subRealm: 4, auraCost: 100_000_000, baseAuraRate: 320, unlockDesc: '筑基圆满' },
] as const;

export const ZHUJI_BY_SUB: ReadonlyMap<number, SubRealmEntry> = new Map(
  ZHUJI_TABLE.map(e => [e.subRealm, e])
);

// ===== 道基品质倍率 =====

export const DAO_FOUNDATION_MULTIPLIER: Record<number, number> = {
  0: 1.0,   // 炼气期（无道基）
  1: 1.5,   // 凡品
  2: 2.5,   // 地道
  3: 4.0,   // 天道
  4: 8.0,   // 无暇
};

// ===== Phase C: 突破基础成功率 (F-C1) =====

/**
 * 突破基础成功率表
 * key = `${realm}-${subRealm}→${nextSubRealm}` 的简化：用目标小层数编码
 * 特殊值: -1 = 不可突破（需天劫或已达上限）
 *
 * @see 7game-lite-phaseC-analysis.md §3.1 F-C1
 */
export interface BreakthroughEntry {
  /** 大境界 */
  realm: number;
  /** 当前小层 */
  fromSub: number;
  /** 目标小层 */
  toSub: number;
  /** 基础成功率 0~1，-1 = 不可突破 */
  baseRate: number;
}

export const BREAKTHROUGH_TABLE: readonly BreakthroughEntry[] = [
  // 炼气期
  { realm: 1, fromSub: 1, toSub: 2, baseRate: 0.95 },
  { realm: 1, fromSub: 2, toSub: 3, baseRate: 0.90 },
  { realm: 1, fromSub: 3, toSub: 4, baseRate: 0.85 },
  { realm: 1, fromSub: 4, toSub: 5, baseRate: 0.80 },
  { realm: 1, fromSub: 5, toSub: 6, baseRate: 0.75 },
  { realm: 1, fromSub: 6, toSub: 7, baseRate: 0.70 },
  { realm: 1, fromSub: 7, toSub: 8, baseRate: 0.60 },
  { realm: 1, fromSub: 8, toSub: 9, baseRate: 0.50 },
  { realm: 1, fromSub: 9, toSub: -1, baseRate: -1 },  // 需天劫
  // 筑基期
  { realm: 2, fromSub: 1, toSub: 2, baseRate: 0.25 },
  { realm: 2, fromSub: 2, toSub: 3, baseRate: 0.20 },
  { realm: 2, fromSub: 3, toSub: -1, baseRate: -1 },  // 已达上限
] as const;

/** 按 `realm-fromSub` 快速查找 */
export const BREAKTHROUGH_BY_KEY: ReadonlyMap<string, BreakthroughEntry> = new Map(
  BREAKTHROUGH_TABLE.map(e => [`${e.realm}-${e.fromSub}`, e])
);

// ===== Phase C: 灵脉密度倍率 (F-C3) =====

/**
 * 灵脉密度表 — 境界越高灵脉越强，全局灵气加速
 *
 * @see 7game-lite-phaseC-analysis.md §3.3 F-C3
 */
export function getSpiritVeinDensity(realm: number, subRealm: number): number {
  if (realm === 1) {
    if (subRealm <= 3) return 1.0;
    if (subRealm <= 6) return 1.2;
    return 1.5;  // 7~9
  }
  if (realm === 2) {
    if (subRealm === 1) return 2.0;
    if (subRealm === 2) return 3.0;
    return 5.0;  // 3+
  }
  return 1.0;
}
