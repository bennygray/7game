/**
 * 世界事件系统类型定义 — Phase F0-β
 *
 * 定义：五级事件严重度、影响范围、世界事件定义注册表接口、
 * 运行时载荷、Storyteller 状态。
 *
 * 设计原则：
 * - I1: 事件不直接修改 GameState（纯信息流, emit → EventBus）
 * - I4: Storyteller 不持久化（运行时状态, ADR-F0β-01）
 * - I5: 静态池只增不删（WORLD_EVENT_REGISTRY 为冻结数组）
 *
 * @see phaseF0-beta-PRD.md §3.1
 * @see phaseF0-beta-TDD.md Step 2.1
 */

import type { LiteGameState } from './game-state';

// ===== 事件严重度 =====

/** 五级事件严重度体系 */
export const EventSeverity = {
  /** Lv.0 喘息 — 纯氛围文案，不触发 SoulEvent */
  BREATH: 0,
  /** Lv.1 涟漪 — 触发 SoulEvent，轻微情绪 */
  RIPPLE: 1,
  /** Lv.2 浪花 — 触发 SoulEvent，中等情绪 */
  SPLASH: 2,
  /** Lv.3 风暴 — 触发 SoulEvent + 喘息期 */
  STORM: 3,
  /** Lv.4 天劫 — F0-β 仅定义类型，不实际抽取 */
  CALAMITY: 4,
} as const;
export type EventSeverity = (typeof EventSeverity)[keyof typeof EventSeverity];

// ===== 事件影响范围 =====

/** 事件作用范围 */
export type EventScope = 'single' | 'multi' | 'sect';

// ===== 事件极性 =====

/** 事件极性（用于 soul-engine 消费时的情绪方向） */
export type EventPolarity = 'positive' | 'negative' | 'neutral';

// ===== 道风亲和度 =====

/** 道风亲和度配置 — 控制 ethos 对事件权重的调节 */
export interface EthosAffinity {
  /** +1=霸道亲和（ethos>0时权重增加）, -1=仁道亲和（ethos<0时权重增加） */
  sign: number;
  /** 调节强度，范围 [0.0, 1.0] */
  factor: number;
}

// ===== 世界事件定义 =====

/** 世界事件定义（静态注册表条目） */
export interface WorldEventDef {
  /** 唯一标识符 */
  id: string;
  /** 事件名称（日志/调试用） */
  name: string;
  /** 基础严重度 */
  baseSeverity: EventSeverity;
  /** 基础权重（加权随机用） */
  weight: number;
  /** 影响范围 */
  scope: EventScope;
  /** 事件极性 */
  polarity: EventPolarity;
  /** 是否可被升级（五级漏斗） */
  canEscalate: boolean;
  /** 道风亲和度配置 */
  ethosAffinity: EthosAffinity;
  /** 条件判定：返回 true 表示此事件可被抽取（纯函数，只读 GameState） */
  condition: (state: LiteGameState) => boolean;
  /** MUD 文案模板（至少 3 条），支持 {D} {D2} 占位符 */
  templates: string[];
}

// ===== 运行时载荷 =====

/** 世界事件运行时载荷（emit 到 EventBus） */
export interface WorldEventPayload {
  /** 事件定义 id */
  eventDefId: string;
  /** 实际严重度（可能经过升级） */
  severity: EventSeverity;
  /** 影响范围 */
  scope: EventScope;
  /** 事件极性 */
  polarity: EventPolarity;
  /** 涉事弟子 ID 列表 */
  involvedDiscipleIds: string[];
  /** 事件地点（scope='sect' 时为 null） */
  location: string | null;
  /** 事件时间戳 */
  timestamp: number;
}

// ===== Storyteller 状态 =====

/** Storyteller 运行时状态（不持久化，重启后重置） */
export interface StorytellerState {
  /** 张力指数 [0, 100]，初始值 30 */
  tensionIndex: number;
  /** 上次 Lv.3+ 事件的时间戳（喘息期判定用） */
  lastStormTimestamp: number;
  /** 最近事件记录（FIFO，上限 20 条） */
  eventHistory: WorldEventPayload[];
}
