/**
 * 因果规则注册表 — Phase I-alpha
 *
 * 6 条因果规则 + 18 条 MUD 文案模板。
 * INV-4: Object.freeze，只增不删。
 *
 * @see phaseI-alpha-PRD.md §5.1
 * @see phaseI-alpha-TDD.md S2.3
 */

import type { CausalRule } from '../types/causal-event';
import { EventSeverity } from '../types/world-event';

// ===== MUD 文案模板 =====

/** MUD 文案模板（每条规则 3 条） */
export interface CausalMudTemplate {
  ruleId: string;
  templates: string[];  // length >= 3
}

/**
 * 因果 MUD 文案模板
 * 每条规则至少 3 条模板，使用 {A}/{B}/{L} 占位符
 *
 * @see phaseI-alpha-PRD.md §5.7
 */
export const CAUSAL_MUD_TEMPLATES: readonly CausalMudTemplate[] = Object.freeze([
  {
    ruleId: 'CR-01',
    templates: [
      '{A}在{L}遇见{B}，冷冷一笑："又是你。"',
      '{A}与{B}在{L}四目相对，空气中弥漫着火药味。',
      '{A}在{L}故意撞了{B}一下，冷哼一声扬长而去。',
    ],
  },
  {
    ruleId: 'CR-02',
    templates: [
      '{A}在{L}递给{B}一株灵草，笑道："上次多谢了。"',
      '{A}在{L}将一颗丹药塞给{B}："别客气。"',
      '{A}与{B}在{L}并肩而坐，分享了一壶灵茶。',
    ],
  },
  {
    ruleId: 'CR-03',
    templates: [
      '宗门灵石库传来异动——{A}鬼鬼祟祟地离开了库房。',
      '{A}趁夜色潜入藏宝阁，窃走了一批灵石。',
      '有人发现灵石少了二十枚——{A}最近出手颇为阔绰。',
    ],
  },
  {
    ruleId: 'CR-04',
    templates: [
      '{B}听闻{A}突破成功，攥紧了拳头。',
      '{A}的突破喜讯传来，{B}的眼中闪过一丝阴翳。',
      '{B}在{L}看着{A}意气风发的模样，心中五味杂陈。',
    ],
  },
  {
    ruleId: 'CR-05',
    templates: [
      '{A}接连失败后，默默走向后山闭关洞。',
      '{A}叹了口气："是我急躁了。"转身闭关去了。',
      '{A}在连续受挫后选择闭关静修，等待下一次机缘。',
    ],
  },
  {
    ruleId: 'CR-06',
    templates: [
      '{A}对宗门近来的做法颇有微词，眉头紧锁。',
      '{A}低声嘟囔："这门规……与我道心不合。"',
      '{A}独自站在山崖边，似乎在思考自己在宗门的位置。',
    ],
  },
]);

// ===== 因果规则注册表 =====

/**
 * 6 条因果规则
 * INV-4: Object.freeze，静态注册，只增不删
 *
 * @see phaseI-alpha-PRD.md §5.1 C1-C6
 */
export const CAUSAL_RULE_REGISTRY: readonly CausalRule[] = Object.freeze([
  // C1: 仇人挑衅（pair）
  {
    id: 'CR-01',
    name: '仇人挑衅',
    triggerType: 'closeness-threshold',
    condition: { closenessMax: -60, requireSameZone: true },
    resultEventType: 'causal-provoke',
    resultSeverity: EventSeverity.SPLASH,
    cooldownTicks: 600,
    priority: 50,
  },
  // C2: 至交赠礼（pair）
  {
    id: 'CR-02',
    name: '至交赠礼',
    triggerType: 'closeness-threshold',
    condition: { closenessMin: 80, requireSameZone: true },
    resultEventType: 'causal-gift',
    resultSeverity: EventSeverity.RIPPLE,
    cooldownTicks: 900,
    priority: 30,
  },
  // C3: 邪心窃取（solo）
  {
    id: 'CR-03',
    name: '邪心窃取',
    triggerType: 'moral-threshold',
    condition: { goodEvilMax: -60, minSpiritStones: 100 },
    resultEventType: 'causal-theft',
    resultSeverity: EventSeverity.STORM,
    cooldownTicks: 1800,
    priority: 70,
  },
  // C4: 对手嫉妒（pair）
  {
    id: 'CR-04',
    name: '对手嫉妒',
    triggerType: 'relationship-tag',
    condition: { requiredTag: 'rival', recentBreakthroughTicks: 50, requireSameZone: true },
    resultEventType: 'causal-jealousy',
    resultSeverity: EventSeverity.SPLASH,
    cooldownTicks: 600,
    priority: 60,
  },
  // C5: 连败闭关（solo）
  {
    id: 'CR-05',
    name: '连败闭关',
    triggerType: 'consecutive-failure',
    condition: { minFailures: 3, maxAggressive: 0.3 },
    resultEventType: 'causal-seclusion',
    resultSeverity: EventSeverity.RIPPLE,
    cooldownTicks: 1800,
    priority: 20,
  },
  // C6: 道风冲突（solo）
  {
    id: 'CR-06',
    name: '道风冲突',
    triggerType: 'ethos-conflict',
    condition: { minEthosGap: 120 },
    resultEventType: 'causal-ethos-clash',
    resultSeverity: EventSeverity.SPLASH,
    cooldownTicks: 1200,
    priority: 40,
  },
]);

/** 扫描间隔（ticks） */
export const CAUSAL_SCAN_INTERVAL_TICKS = 300;

// ===== 模板查询工具 =====

/**
 * 获取指定规则的随机 MUD 文案
 * @param ruleId 规则 ID
 * @param actorName 触发者名
 * @param targetName 目标名（solo 规则可为空）
 * @param locationLabel 地点中文名
 */
export function getRandomCausalMudText(
  ruleId: string,
  actorName: string,
  targetName: string,
  locationLabel: string,
): string {
  const entry = CAUSAL_MUD_TEMPLATES.find(t => t.ruleId === ruleId);
  if (!entry || entry.templates.length === 0) {
    return `${actorName}引发了一场因果事件。`;
  }
  const template = entry.templates[Math.floor(Math.random() * entry.templates.length)];
  return template
    .replace(/\{A\}/g, actorName)
    .replace(/\{B\}/g, targetName)
    .replace(/\{L\}/g, locationLabel);
}
