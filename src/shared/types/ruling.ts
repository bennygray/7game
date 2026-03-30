/**
 * 掌门裁决系统类型定义 — Phase H-γ
 *
 * 定义：裁决定义（静态注册表）、运行时裁决状态、裁决结算结果。
 *
 * 设计原则：
 * - ActiveRuling 不持久化（与 StorytellerState 一致，ADR-Hγ-02）
 * - 裁决仅修改 sect.ethos/discipline，不修改弟子属性（PRD I5）
 *
 * @see phaseH-gamma-PRD.md §3
 * @see phaseH-gamma-TDD.md §2.1
 */

import type { WorldEventPayload, EventPolarity } from './world-event';

// ===== 裁决定义（静态注册表条目） =====

/** 裁决定义 — 关联世界事件或通用池 */
export interface RulingDef {
  /** 裁决 ID，格式 RD-{eventId}-{N} 或 RD-G{polarity}-{N} */
  id: string;
  /** 关联的 WorldEventDef.id（通用池为 null） */
  eventDefId: string | null;
  /** 通用池极性匹配（仅通用裁决使用） */
  polarity: EventPolarity | null;
  /** 选项标签（中文，≤20字） */
  label: string;
  /** 选项描述（中文，1~2句话） */
  description: string;
  /** 道风漂移值 [-2, +2] */
  ethosShift: number;
  /** 门规漂移值 [-2, +2] */
  disciplineShift: number;
  /** 裁决后 MUD 文案 */
  mudText: string;
}

// ===== 裁决选项（运行时实例） =====

/** 裁决选项 — 从 RulingDef 实例化，附带序号 */
export interface RulingOption {
  /** 选项序号（1-based，用于 judge N 命令） */
  index: number;
  /** 选项标签 */
  label: string;
  /** 选项描述 */
  description: string;
  /** 道风漂移值 */
  ethosShift: number;
  /** 门规漂移值 */
  disciplineShift: number;
  /** 裁决后 MUD 文案 */
  mudText: string;
}

// ===== 活跃裁决（运行时状态） =====

/** 活跃裁决 — STORM 事件触发时创建，超时或玩家裁决后销毁 */
export interface ActiveRuling {
  /** 触发此裁决的事件载荷 */
  eventPayload: WorldEventPayload;
  /** 事件名称 */
  eventName: string;
  /** 事件渲染文案 */
  eventText: string;
  /** 可选裁决项 */
  options: RulingOption[];
  /** 创建时间戳（inGameWorldTime） */
  createdAt: number;
  /** 过期时间戳（inGameWorldTime） */
  expiresAt: number;
  /** 是否已裁决 */
  resolved: boolean;
}

// ===== 裁决结算结果 =====

/** 裁决结算结果 — 包含选项、是否超时、漂移后新值 */
export interface RulingResolution {
  /** 选择的选项 */
  option: RulingOption;
  /** 是否超时自动结算 */
  timedOut: boolean;
  /** 超时 fallback 文案（仅超时时有值） */
  timeoutText: string | null;
  /** 道风漂移后的新值 */
  newEthos: number;
  /** 门规漂移后的新值 */
  newDiscipline: number;
}
