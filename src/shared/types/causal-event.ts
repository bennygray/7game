/**
 * Phase IJ v3.0: 因果事件类型定义（仅设计，零实现代码）
 *
 * R-C01/R-C02: 因果触发规则和冷却状态
 */

/** R-C01: 因果触发类型 */
export type CausalTriggerType =
  | 'affinity-threshold'    // 好感度达标
  | 'moral-threshold'       // 道德偏移达标
  | 'relationship-tag'      // 特定标签（rival/friend）
  | 'consecutive-failure'   // 连续失败
  | 'ethos-conflict'        // 道风冲突
  | 'goal-driven';          // 目标驱动

/** R-C01: 因果触发规则 */
export interface CausalRule {
  id: string;
  name: string;
  triggerType: CausalTriggerType;
  /** 触发条件参数 */
  condition: Record<string, unknown>;
  /** 产生的事件类型 */
  resultEventType: string;
  /** 事件等级 */
  resultSeverity: number;
  /** R-C02: 冷却（ticks） */
  cooldownTicks: number;
  /** 优先级（同时触发时取最高） */
  priority: number;
}

/** R-C02: 冷却状态 */
export interface CausalCooldownState {
  ruleId: string;
  disciplePairKey: string;
  lastFireTick: number;
}
