/**
 * 特性注册表 — TRAIT_REGISTRY
 *
 * 包含 ≥10 个 TraitDef，覆盖 positive/negative/neutral 三极。
 * 主题：仙侠人性（勇气、嫉妒、慈悲、贪婪、智慧…）
 *
 * 互斥规则（R-E8）：同一弟子不能同时持有极性正负相反的同类特性。
 * 例如：持有「慈悲」(positive/kind) 不能再获得「冷酷」(negative/kind)。
 *
 * @see phaseE-TDD.md Step 2, Story #1 AC3
 */

import type { TraitDef } from '../types/soul';

export const TRAIT_REGISTRY: TraitDef[] = [
  // ===== 先天特性 — 正面 =====
  {
    id: 'innate_courageous',
    name: '胆魄如虹',
    category: 'innate',
    polarity: 'positive',
    effects: [
      { type: 'behavior-weight', target: 'explore', value: 0.3 },
      { type: 'behavior-weight', target: 'bounty',  value: 0.2 },
    ],
    aiHint: '此弟子天生胆大，遇险不退，喜爱冒险与挑战。',
  },
  {
    id: 'innate_diligent',
    name: '勤勉不倦',
    category: 'innate',
    polarity: 'positive',
    effects: [
      { type: 'behavior-weight', target: 'meditate', value: 0.4 },
      { type: 'behavior-weight', target: 'farm',     value: 0.2 },
      { type: 'emotion-weight',  target: 'pride',    value: 0.2 },
    ],
    aiHint: '此弟子刻苦勤奋，修炼从不懈怠，以努力为荣。',
  },
  {
    id: 'innate_compassionate',
    name: '悲天悯人',
    category: 'innate',
    polarity: 'positive',
    effects: [
      { type: 'relationship-modifier', target: 'all',   value: 5 },
      { type: 'emotion-weight',        target: 'guilt',  value: 0.2 },
      { type: 'emotion-weight',        target: 'relief', value: 0.2 },
    ],
    aiHint: '此弟子心怀慈悲，对同门关爱有加，见人受苦心如刀割。',
  },
  {
    id: 'innate_perceptive',
    name: '慧眼天生',
    category: 'innate',
    polarity: 'positive',
    effects: [
      { type: 'behavior-weight', target: 'alchemy',  value: 0.3 },
      { type: 'emotion-weight',  target: 'admiration', value: 0.2 },
    ],
    aiHint: '此弟子天资聪颖，洞察力超群，善于发现他人长处。',
  },
  {
    id: 'innate_loyal',
    name: '忠义为先',
    category: 'innate',
    polarity: 'positive',
    effects: [
      { type: 'relationship-modifier', target: 'all', value: 3 },
      { type: 'moral-drift',           target: 'lawChaos', value: 0.1 },
    ],
    aiHint: '此弟子重情重义，对同门忠心耿耿，绝不背叛。',
  },

  // ===== 先天特性 — 负面 =====
  {
    id: 'innate_jealous',
    name: '妒性难改',
    category: 'innate',
    polarity: 'negative',
    effects: [
      { type: 'emotion-weight',        target: 'envy',    value: 0.4 },
      { type: 'emotion-weight',        target: 'jealousy', value: 0.3 },
      { type: 'relationship-modifier', target: 'all',     value: -3 },
    ],
    aiHint: '此弟子嫉妒心极重，见同门有所成就内心便燃起妒火。',
  },
  {
    id: 'innate_greedy',
    name: '贪婪成性',
    category: 'innate',
    polarity: 'negative',
    effects: [
      { type: 'behavior-weight', target: 'alchemy', value: 0.3 },
      { type: 'moral-drift',     target: 'goodEvil', value: -0.1 },
      { type: 'emotion-weight',  target: 'envy',    value: 0.2 },
    ],
    aiHint: '此弟子贪婪成性，对财物和丹药有着近乎偏执的渴望。',
  },
  {
    id: 'innate_arrogant',
    name: '傲骨冲天',
    category: 'innate',
    polarity: 'negative',
    effects: [
      { type: 'emotion-weight',        target: 'contempt', value: 0.3 },
      { type: 'emotion-weight',        target: 'pride',    value: 0.2 },
      { type: 'relationship-modifier', target: 'all',      value: -5 },
    ],
    aiHint: '此弟子傲气冲天，视同门为蝼蚁，难以与人真心相处。',
  },
  {
    id: 'innate_cowardly',
    name: '胆怯如鼠',
    category: 'innate',
    polarity: 'negative',
    effects: [
      { type: 'behavior-weight', target: 'explore', value: -0.3 },
      { type: 'behavior-weight', target: 'bounty',  value: -0.2 },
      { type: 'emotion-weight',  target: 'fear',    value: 0.4 },
    ],
    aiHint: '此弟子胆小怕事，遇到危险第一反应是逃跑，修炼也畏难。',
  },

  // ===== 先天特性 — 中性 =====
  {
    id: 'innate_solitary',
    name: '喜独其身',
    category: 'innate',
    polarity: 'neutral',
    effects: [
      { type: 'behavior-weight',       target: 'meditate', value: 0.2 },
      { type: 'relationship-modifier', target: 'all',      value: -2 },
      { type: 'emotion-weight',        target: 'neutral',  value: 0.3 },
    ],
    aiHint: '此弟子生性孤僻，喜欢独处，对同门不冷不热。',
  },
  {
    id: 'innate_curious',
    name: '好奇心旺',
    category: 'innate',
    polarity: 'neutral',
    effects: [
      { type: 'behavior-weight', target: 'explore',  value: 0.2 },
      { type: 'behavior-weight', target: 'alchemy',  value: 0.1 },
      { type: 'emotion-weight',  target: 'joy',      value: 0.2 },
    ],
    aiHint: '此弟子充满好奇心，对世间万物都充满兴趣和探索欲。',
  },
  {
    id: 'innate_stoic',
    name: '淡泊宁静',
    category: 'innate',
    polarity: 'neutral',
    effects: [
      { type: 'emotion-weight', target: 'neutral',   value: 0.5 },
      { type: 'emotion-weight', target: 'anger',     value: -0.2 },
      { type: 'emotion-weight', target: 'joy',       value: -0.1 },
    ],
    aiHint: '此弟子内心平静，情绪波澜不惊，无论好事坏事皆泰然处之。',
  },

  // ===== 后天特性 =====
  {
    id: 'acquired_battle_hardened',
    name: '百战磨砺',
    category: 'acquired',
    polarity: 'positive',
    effects: [
      { type: 'behavior-weight', target: 'bounty',   value: 0.3 },
      { type: 'emotion-weight',  target: 'pride',    value: 0.2 },
      { type: 'emotion-weight',  target: 'fear',     value: -0.2 },
    ],
    aiHint: '此弟子历经百战，胆魄日益坚韧，对危险已经见惯不怪。',
    trigger: {
      condition: 'explore-return:count>=5',
      probability: 0.15,
    },
  },
  {
    id: 'acquired_alchemy_obsessed',
    name: '丹道痴迷',
    category: 'acquired',
    polarity: 'neutral',
    effects: [
      { type: 'behavior-weight', target: 'alchemy',  value: 0.5 },
      { type: 'behavior-weight', target: 'explore',  value: -0.2 },
      { type: 'emotion-weight',  target: 'joy',      value: 0.3 },
    ],
    aiHint: '此弟子对炼丹之道几近痴迷，视炉火为全部，其余皆是浮云。',
    trigger: {
      condition: 'alchemy-success:count>=3',
      probability: 0.2,
    },
  },
];

// ===== 工具函数 =====

/** 先天特性列表 */
export const INNATE_TRAITS = TRAIT_REGISTRY.filter(t => t.category === 'innate');

/** 后天特性列表 */
export const ACQUIRED_TRAITS = TRAIT_REGISTRY.filter(t => t.category === 'acquired');

/** 根据 ID 查找特性定义 */
export function getTraitDef(id: string): TraitDef | undefined {
  return TRAIT_REGISTRY.find(t => t.id === id);
}

/** 判断两个特性是否互斥（同类别下正负相反，且目标相同） —— R-E8 */
export function areTraitsMutuallyExclusive(idA: string, idB: string): boolean {
  const a = getTraitDef(idA);
  const b = getTraitDef(idB);
  if (!a || !b) return false;
  if (a.category !== b.category) return false;
  if (a.polarity === 'neutral' || b.polarity === 'neutral') return false;
  // 正负相反 + 共享同类效果目标
  const applicablePolarities = ['positive', 'negative'];
  if (applicablePolarities.includes(a.polarity) && applicablePolarities.includes(b.polarity) && a.polarity !== b.polarity) {
    const aTargets = new Set(a.effects.map(e => `${e.type}:${e.target}`));
    return b.effects.some(e => aTargets.has(`${e.type}:${e.target}`));
  }
  return false;
}

/**
 * 随机生成 1~2 个先天特性（R-E5, R-E8 互斥规则）
 * count = 1: 80% 概率; count = 2: 20% 概率
 */
export function generateInnateTraits(): import('../types/soul').DiscipleTrait[] {
  const count = Math.random() < 0.8 ? 1 : 2;
  const shuffled = [...INNATE_TRAITS].sort(() => Math.random() - 0.5);

  const selected: TraitDef[] = [];
  for (const trait of shuffled) {
    if (selected.length >= count) break;
    // 检查互斥
    const hasConflict = selected.some(s => areTraitsMutuallyExclusive(s.id, trait.id));
    if (!hasConflict) {
      selected.push(trait);
    }
  }

  return selected.map(t => ({ defId: t.id }));
}
