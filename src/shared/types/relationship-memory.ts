/**
 * Phase IJ v3.0: 关系记忆类型定义
 *
 * R-M01: 扩展现有 RelationshipEdge，增加关系记忆
 * 按 A→B 方向索引（pairKey = `${sourceId}:${targetId}`）
 */
import type { RelationshipTag } from './soul';

// ===== 核心接口 =====

/**
 * R-M01: 关系记忆实例
 * A→B 和 B→A 是两个���立的 RelationshipMemory
 */
export interface RelationshipMemory {
  /** A→B 方向（与 RelationshipEdge 一致） */
  sourceId: string;
  targetId: string;

  /** 已有数据（从 RelationshipEdge 实时读取，此处为缓存引用） */
  closeness: number;          // 亲疏度 [-100, +100]（原 affinity）
  attraction: number;         // 吸引力 [0, 100]
  trust: number;              // 信赖度 [-100, +100]
  tags: RelationshipTag[];    // friend / rival / mentor / admirer / grudge

  /** 改变关系的关键事件摘要 */
  keyEvents: KeyRelationshipEvent[];

  /** 叙事片段缓存（由 NarrativeSnippetBuilder 生��，L6 Prompt 注入用） */
  narrativeSnippet?: string;  // ≤80 字符

  /** 统计量（不注入 prompt，仅用于规则引擎） */
  encounterCount: number;     // 碰面次数
  lastEncounterTick: number;  // 上次碰面 tick
  dialogueCount: number;      // 对话次数
}

/**
 * R-M02: 记录改变关系的重大事件
 * 仅当 |affinityDelta| >= EVENT_THRESHOLD 时记录
 */
export interface KeyRelationshipEvent {
  /** 摘要文本（≤30 字符） */
  content: string;
  /** 发生时的游戏 tick */
  tick: number;
  /** 这次事件带来的亲疏度变化（ADR-Iβ-04: 保持单值） */
  closenessDelta: number;
}

// ===== 常量 =====

/** R-M02: 关键事件记录阈值 */
export const EVENT_THRESHOLD = 5;

/** R-M02: 每对关系的 keyEvents 存储上限 */
export const KEY_EVENTS_SOFT_LIMIT = 10;

/** R-M03: 矛盾覆盖窗口（同类事件在此 tick 范围内替换而非追加） */
export const CONTRADICTION_TICK_WINDOW = 50;

/** v3.0: Prompt 总量上限（从 512 放宽） */
export const MAX_PROMPT_TOKENS = 1024;

/** v3.0: Narrative snippet 最大字符数 */
export const NARRATIVE_SNIPPET_MAX_CHARS = 80;

// ===== 工具函数 =====

/**
 * 生成关系对的唯一键
 * A→B 和 B→A 是两个不同的 RelationshipMemory
 */
export function makePairKey(sourceId: string, targetId: string): string {
  return `${sourceId}:${targetId}`;
}

// ===== Context Level =====

/**
 * v3.0: Context level 枚举
 * 由事件等级决定使用哪个级别（PRD R-M08）
 */
export type ContextLevel = 'L0' | 'L2' | 'L6';
