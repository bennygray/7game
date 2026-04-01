/**
 * Phase IJ v3.0: T2 幕后 NPC 类型定义（仅设计，零实现代码）
 *
 * R-T01/R-T02: T2 原型和行为循环
 */

/** R-T01: T2 原型 */
export type T2Archetype =
  | 'scattered-monk'
  | 'merchant'
  | 'beast'
  | 'rival-sect'
  | 'hermit';

/** R-T01: T2 幕后 NPC 档案 */
export interface T2NpcProfile {
  id: string;
  name: string;
  archetype: T2Archetype;
  /** 威胁等级 1-3 */
  threat: 1 | 2 | 3;
  /** 对宗门态度 [-100, +100] */
  disposition: number;
  /** 距下次行动的 tick */
  cooldown: number;
  /** 当前位置（null=不在宗门范围） */
  zone: string | null;
}

/** R-T02: 行为循环间隔 */
export const T2_BEHAVIOR_INTERVAL = 60;
