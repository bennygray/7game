/**
 * Phase IJ v3.0: 因果事件类型定义（仅设计，零实现代码）
 *
 * R-C01/R-C02: 因果触发规则和冷却状态
 */

/** R-C01: 因果触发类型 */
export type CausalTriggerType =
  | 'closeness-threshold'   // 亲疏度达标（原 affinity-threshold）
  | 'moral-threshold'       // 道德偏移达标
  | 'relationship-tag'      // 特定标签（rival/friend）
  | 'consecutive-failure'   // 连续失败
  | 'ethos-conflict'        // 道风冲突
  | 'goal-driven'           // 目标驱动
  | 'social-invitation'     // Phase I-beta: 社交邀约阈值触发
  | 'social-dissolution';   // Phase I-beta: 社交关系解除条件触发

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
