/**
 * 结构化日志系统 — 类型定义
 *
 * Phase D: 分级分类日志，替代散布的 console.log。
 *
 * @see phaseD-TDD.md Step 2.1
 * @see Story #1
 */

// ===== 日志级别 =====

export const LogLevel = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

// ===== 日志类别 =====

export const LogCategory = {
  /** 引擎 tick/pipeline */
  ENGINE: 'ENGINE',
  /** 弟子行为 */
  DISCIPLE: 'DISCIPLE',
  /** AI 推理/对话 */
  AI: 'AI',
  /** 系统事件（存档/突破/服丹） */
  SYSTEM: 'SYSTEM',
  /** 资源变动（灵气/灵石/丹药） */
  ECONOMY: 'ECONOMY',
  /** Phase F0-α: 世界事件（碰面/地点） */
  WORLD: 'WORLD',
} as const;
export type LogCategory = (typeof LogCategory)[keyof typeof LogCategory];

// ===== 日志条目 =====

export interface LogEntry {
  /** 时间戳 (Date.now()) */
  timestamp: number;
  /** 日志级别 */
  level: LogLevel;
  /** 日志类别 */
  category: LogCategory;
  /** 产出模块名，如 'idle-engine', 'alchemy-engine' */
  source: string;
  /** 日志消息 */
  message: string;
  /** 可选结构化数据 */
  data?: Record<string, unknown>;
}

// ===== Logger 接口 =====

export interface GameLogger {
  debug(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  info(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  warn(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;
  error(cat: LogCategory, src: string, msg: string, data?: Record<string, unknown>): void;

  /** 获取并清空日志缓冲区（用于持久化写盘） */
  flush(): LogEntry[];

  /** 设置最小日志级别 */
  setLevel(level: LogLevel): void;
}
