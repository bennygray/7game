/**
 * Phase J-Goal: 个人目标数据表
 *
 * 纯数据文件 — 乘数表、TTL、标签、MUD 文案、扫描间隔。
 * 所有数值来源：phaseJ-goal-PRD.md §3.1~§3.5
 *
 * @see phaseJ-goal-PRD.md §3
 * @see phaseJ-goal-TDD.md S2.2
 */

import type { GoalType } from '../types/personal-goal';
import type { DiscipleBehavior } from '../types/game-state';

// ===== 行为乘数表（PRD §3.2） =====

/** 目标行为乘数表 — Layer 5 叠加用 */
export const GOAL_BEHAVIOR_MULTIPLIERS: Record<GoalType, Record<DiscipleBehavior, number>> = {
  breakthrough: {
    meditate: 1.6, farm: 0.8, alchemy: 0.8, explore: 0.7, rest: 1.3, bounty: 0.7, idle: 0.5,
  },
  revenge: {
    meditate: 0.8, farm: 0.8, alchemy: 0.8, explore: 1.6, rest: 0.8, bounty: 1.2, idle: 0.6,
  },
  seclusion: {
    meditate: 1.8, farm: 0.6, alchemy: 0.6, explore: 0.5, rest: 1.2, bounty: 0.5, idle: 0.3,
  },
  friendship: {
    meditate: 0.9, farm: 1.0, alchemy: 1.0, explore: 1.5, rest: 0.9, bounty: 0.9, idle: 0.8,
  },
  ambition: {
    meditate: 1.1, farm: 1.3, alchemy: 1.3, explore: 1.0, rest: 0.8, bounty: 1.1, idle: 0.5,
  },
};

// ===== TTL 表（PRD §3.1） =====

/** 目标默认 TTL（ticks） */
export const GOAL_TTL: Record<GoalType, number> = {
  breakthrough: 300,
  revenge: 400,
  seclusion: 200,
  friendship: 300,
  ambition: 250,
};

// ===== 标签表 =====

/** 目标中文标签（MUD 文案用） */
export const GOAL_LABEL: Record<GoalType, string> = {
  breakthrough: '冲击突破',
  revenge: '复仇',
  seclusion: '闭关修炼',
  friendship: '结交知己',
  ambition: '宗门抱负',
};

// ===== MUD 文案模板（PRD §3.5） =====

/**
 * MUD 文案模板
 *
 * 占位符：
 * - `{name}` — 弟子名
 * - `{target}` — 目标弟子名（revenge/friendship）
 * - `{pronoun}` — 他/她
 */
export const GOAL_MUD_TEXT = {
  assigned: {
    breakthrough: '{name}目光坚定，似在酝酿一次冲击——{pronoun}要突破了。',
    revenge: '{name}眼中闪过寒光，似乎对{target}的所作所为耿耿于怀。',
    seclusion: '{name}盘膝而坐，气息渐沉——{pronoun}打算闭关一段时日。',
    friendship: '{name}望向{target}的背影，似乎想与其更亲近些。',
    ambition: '{name}翻阅功法典籍，眼中满是进取之心。',
  } as Record<GoalType, string>,
  completed: {
    breakthrough: '{name}长吁一口气，突破之愿已了，神情释然。',
    revenge: '{name}与{target}的恩怨似乎有了了结，眉宇间少了几分戾气。',
    seclusion: '{name}缓缓睁眼，闭关修炼圆满，气息沉稳了许多。',
    friendship: '{name}与{target}相视一笑——知己之缘，已然结下。',
    ambition: '{name}放下手中典籍，嘴角微扬，似有所得。',
  } as Record<GoalType, string>,
  expired: {
    breakthrough: '{name}叹了口气，突破之事看来还需从长计议。',
    revenge: '{name}摇了摇头，似乎决定暂时放下对{target}的怨念。',
    seclusion: '{name}起身活动筋骨，闭关之心渐淡。',
    friendship: '{name}收回目光，与{target}的缘分或许还需时日。',
    ambition: '{name}合上典籍，抱负之心暂且收敛。',
  } as Record<GoalType, string>,
} as const;

// ===== 扫描间隔 =====

/** 定期扫描间隔（ticks） */
export const GOAL_SCAN_INTERVAL = 60;

// ===== 触发来源分类 =====

/** 事件驱动目标类型 */
export const EVENT_DRIVEN_GOALS: readonly GoalType[] = ['breakthrough', 'revenge', 'friendship'];

/** 定期扫描目标类型 */
export const PERIODIC_GOALS: readonly GoalType[] = ['seclusion', 'ambition'];
