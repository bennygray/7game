/**
 * 裁决注册表 — Phase H-γ
 *
 * 12 个预定义裁决选项：
 * - 专属裁决：WE-B04 妖潮来袭（3 选项）
 * - 通用裁决池：negative（3）+ positive（3）+ neutral（3）
 *
 * 设计原则：
 * - 静态池只增不删（Object.freeze 防篡改）
 * - ethosShift/disciplineShift 绝对值 ≤ 2（PRD I3 水滴石穿）
 *
 * @see phaseH-gamma-PRD.md §4 R-03
 * @see phaseH-gamma-TDD.md §2.5
 */

import type { RulingDef } from '../types/ruling';
import type { EventPolarity } from '../types/world-event';

/** 全量裁决注册表 */
export const RULING_REGISTRY: readonly RulingDef[] = Object.freeze([

  // ===== 专属裁决：WE-B04 妖潮来袭 =====

  {
    id: 'RD-B04-1',
    eventDefId: 'WE-B04',
    polarity: null,
    label: '全力守护',
    description: '不惜代价保护每一位弟子',
    ethosShift: -1,
    disciplineShift: +1,
    mudText: '掌门下令全力守护，弟子们并肩抵御妖潮，无一人落单。',
  },
  {
    id: 'RD-B04-2',
    eventDefId: 'WE-B04',
    polarity: null,
    label: '以战养战',
    description: '借妖潮锤炼弟子实战能力',
    ethosShift: +1,
    disciplineShift: -1,
    mudText: '掌门视妖潮为试炼，令弟子各凭本事，弱者自当奋起。',
  },
  {
    id: 'RD-B04-3',
    eventDefId: 'WE-B04',
    polarity: null,
    label: '严令布阵',
    description: '按阵法部署，违令者罚',
    ethosShift: 0,
    disciplineShift: +2,
    mudText: '掌门严令弟子按阵法站位，不得擅离，阵眼岿然不动。',
  },

  // ===== 通用裁决池：negative =====

  {
    id: 'RD-GN-1',
    eventDefId: null,
    polarity: 'negative' as const,
    label: '安抚弟子',
    description: '以慈悲之心平息风波',
    ethosShift: -1,
    disciplineShift: 0,
    mudText: '掌门温言安抚，众弟子心定如磐。',
  },
  {
    id: 'RD-GN-2',
    eventDefId: null,
    polarity: 'negative' as const,
    label: '严查根源',
    description: '追查事件真相，严惩责任人',
    ethosShift: 0,
    disciplineShift: +1,
    mudText: '掌门下令彻查此事，绝不姑息。',
  },
  {
    id: 'RD-GN-3',
    eventDefId: null,
    polarity: 'negative' as const,
    label: '放手历练',
    description: '视此为弟子成长的磨砺',
    ethosShift: +1,
    disciplineShift: -1,
    mudText: '掌门沉默不语，任弟子自行应对。',
  },

  // ===== 通用裁决池：positive =====

  {
    id: 'RD-GP-1',
    eventDefId: null,
    polarity: 'positive' as const,
    label: '广施恩泽',
    description: '将好事惠及全宗',
    ethosShift: -1,
    disciplineShift: 0,
    mudText: '掌门令将此福缘与全宗共享，众弟子感恩不已。',
  },
  {
    id: 'RD-GP-2',
    eventDefId: null,
    polarity: 'positive' as const,
    label: '优者独享',
    description: '论功行赏，强者优先',
    ethosShift: +1,
    disciplineShift: 0,
    mudText: '掌门将机缘赐予最有实力者，余人只得旁观。',
  },
  {
    id: 'RD-GP-3',
    eventDefId: null,
    polarity: 'positive' as const,
    label: '纳入门规',
    description: '定下规矩，以后照此办理',
    ethosShift: 0,
    disciplineShift: +1,
    mudText: '掌门将此事写入宗规，日后遇同类事务照此执行。',
  },

  // ===== 通用裁决池：neutral =====

  {
    id: 'RD-GU-1',
    eventDefId: null,
    polarity: 'neutral' as const,
    label: '慎重处置',
    description: '召集弟子商议后决定',
    ethosShift: -1,
    disciplineShift: +1,
    mudText: '掌门召集众弟子商议，最终做出了审慎的决定。',
  },
  {
    id: 'RD-GU-2',
    eventDefId: null,
    polarity: 'neutral' as const,
    label: '顺势而为',
    description: '不必大惊小怪',
    ethosShift: 0,
    disciplineShift: -1,
    mudText: '掌门微微一笑，言道此事顺其自然即可。',
  },
  {
    id: 'RD-GU-3',
    eventDefId: null,
    polarity: 'neutral' as const,
    label: '立下规矩',
    description: '以此为契机整顿门风',
    ethosShift: +1,
    disciplineShift: +1,
    mudText: '掌门借此事重申门规，弟子们肃然起敬。',
  },
]);

/**
 * 查找裁决选项
 *
 * 1. 优先匹配 eventDefId 专属选项
 * 2. 无专属 → fallback 到 polarity 通用池
 * 3. 通用池也无 → 返回空数组
 *
 * @param eventDefId - 世界事件定义 ID
 * @param polarity - 事件极性（用于通用池 fallback）
 */
export function findRulingOptions(
  eventDefId: string,
  polarity: EventPolarity,
): RulingDef[] {
  // 优先专属
  const dedicated = RULING_REGISTRY.filter(
    (r) => r.eventDefId === eventDefId,
  );
  if (dedicated.length > 0) return [...dedicated];

  // fallback 到通用池
  const generic = RULING_REGISTRY.filter(
    (r) => r.eventDefId === null && r.polarity === polarity,
  );
  return [...generic];
}
