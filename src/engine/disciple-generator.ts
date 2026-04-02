/**
 * 弟子生成器 — 随机生成弟子
 *
 * 从 game-state.ts 拆分出来（CR-04）
 * 类型文件不应包含业务逻辑
 */

import type { LiteDiscipleState, PersonalityTraits, StarRating, Gender, Orientation } from '../shared/types/game-state';
import { DiscipleBehavior } from '../shared/types/game-state';
import type { RelationshipEdge } from '../shared/types/game-state';
import { generateInnateTraits } from '../shared/data/trait-registry';

// ===== 随机整数工具 =====

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== 数据表 =====

const SURNAMES = [
  '林', '陈', '张', '李', '王', '赵', '周', '吴', '孙', '刘',
  '萧', '苏', '沈', '叶', '顾',
];

const MALE_GIVEN_NAMES = [
  '清风', '星河', '玄冰', '天华', '承志',
  '昊然', '九霄', '剑鸣', '长渊', '铁衣',
  '鸿飞', '墨尘', '崇岳', '砺锋', '破军',
];

const FEMALE_GIVEN_NAMES = [
  '明月', '紫霞', '云烟', '碧落', '青莲',
  '灵犀', '瑶琴', '秋水', '若兰', '素心',
  '落雁', '凝霜', '映雪', '绮梦', '蝶衣',
];

/** 女性生成概率（可配置） */
const FEMALE_RATIO = 0.5;

const SPIRITUAL_ROOTS = ['金', '木', '水', '火', '土'];

const PERSONALITY_TEMPLATES: { name: string; traits: PersonalityTraits }[] = [
  { name: '刚烈', traits: { aggressive: 0.8, persistent: 0.7, kind: 0.2, lazy: 0.1, smart: 0.5 } },
  { name: '温和', traits: { aggressive: 0.2, persistent: 0.5, kind: 0.8, lazy: 0.3, smart: 0.6 } },
  { name: '机敏', traits: { aggressive: 0.4, persistent: 0.6, kind: 0.5, lazy: 0.2, smart: 0.9 } },
  { name: '沉稳', traits: { aggressive: 0.3, persistent: 0.8, kind: 0.4, lazy: 0.2, smart: 0.7 } },
  { name: '散漫', traits: { aggressive: 0.3, persistent: 0.3, kind: 0.6, lazy: 0.8, smart: 0.4 } },
  { name: '狡黠', traits: { aggressive: 0.6, persistent: 0.5, kind: 0.3, lazy: 0.4, smart: 0.8 } },
  { name: '孤傲', traits: { aggressive: 0.5, persistent: 0.9, kind: 0.1, lazy: 0.1, smart: 0.6 } },
  { name: '恐懦', traits: { aggressive: 0.1, persistent: 0.4, kind: 0.7, lazy: 0.5, smart: 0.3 } },
];

// ===== 工具函数 =====

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function rollStarRating(): StarRating {
  const roll = Math.random() * 100;
  if (roll < 30) return 1;
  if (roll < 60) return 2;
  if (roll < 85) return 3;
  if (roll < 97) return 4;
  return 5;
}

/** HTML 转义（防 XSS） */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== 性取向生成 =====

/**
 * 根据性别生成性取向（PRD §4.2 分布）
 * 80% 异性恋, 15% 双性恋, 5% 同性恋
 */
export function generateOrientation(gender: Gender): Orientation {
  const roll = Math.random() * 100;
  if (roll < 80) {
    // 异性恋
    return gender === 'male'
      ? { maleAttraction: 0, femaleAttraction: 1 }
      : { maleAttraction: 1, femaleAttraction: 0 };
  } else if (roll < 95) {
    // 双性恋
    return gender === 'male'
      ? { maleAttraction: 0.5, femaleAttraction: 1 }
      : { maleAttraction: 1, femaleAttraction: 0.5 };
  } else {
    // 同性恋
    return gender === 'male'
      ? { maleAttraction: 1, femaleAttraction: 0 }
      : { maleAttraction: 0, femaleAttraction: 1 };
  }
}

// ===== 生成函数 =====

/** 随机生成一名弟子 */
export function generateRandomDisciple(): LiteDiscipleState {
  const gender: Gender = Math.random() < FEMALE_RATIO ? 'female' : 'male';
  const givenNames = gender === 'male' ? MALE_GIVEN_NAMES : FEMALE_GIVEN_NAMES;
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  const starRating = rollStarRating();
  const rootCount = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...SPIRITUAL_ROOTS].sort(() => Math.random() - 0.5);
  const spiritualRoots = shuffled.slice(0, rootCount);
  const template = PERSONALITY_TEMPLATES[Math.floor(Math.random() * PERSONALITY_TEMPLATES.length)];
  const personality: PersonalityTraits = {
    aggressive: clamp(template.traits.aggressive + (Math.random() - 0.5) * 0.2, 0, 1),
    persistent: clamp(template.traits.persistent + (Math.random() - 0.5) * 0.2, 0, 1),
    kind: clamp(template.traits.kind + (Math.random() - 0.5) * 0.2, 0, 1),
    lazy: clamp(template.traits.lazy + (Math.random() - 0.5) * 0.2, 0, 1),
    smart: clamp(template.traits.smart + (Math.random() - 0.5) * 0.2, 0, 1),
  };
  const subRealm = 1 + Math.floor(Math.random() * 3);

  // Phase E 新增：道德双轴
  const moral = {
    goodEvil: randomInt(-30, 30),
    lawChaos: randomInt(-30, 30),
  };

  return {
    id: crypto.randomUUID(),
    name: `${surname}${givenName}`,
    starRating,
    realm: 1,
    subRealm,
    aura: 0,
    personality,
    personalityName: template.name,
    spiritualRoots,
    behavior: DiscipleBehavior.IDLE,
    lastDecisionTime: Date.now(),
    behaviorTimer: 0,
    stamina: 100,
    farmPlots: [],
    currentRecipeId: null,
    moral,
    initialMoral: { ...moral },
    traits: generateInnateTraits(),
    gender,
    orientation: generateOrientation(gender),
  };
}

/** 生成 N 名初始弟子（保证性格多样性） */
export function generateInitialDisciples(count = 8): LiteDiscipleState[] {
  // 前 N 个弟子依次分配不同性格，超出模板数量后随机
  const shuffledTemplates = [...PERSONALITY_TEMPLATES].sort(() => Math.random() - 0.5);
  const usedNames = new Set<string>();

  return Array.from({ length: count }, (_, i) => {
    // Phase GS: 性别决定名字池
    const gender: Gender = Math.random() < FEMALE_RATIO ? 'female' : 'male';
    const givenNames = gender === 'male' ? MALE_GIVEN_NAMES : FEMALE_GIVEN_NAMES;

    // 确保名字不重复
    let name: string;
    do {
      const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
      const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
      name = `${surname}${givenName}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    // 性格：前 N 个保证不重复，超出后随机
    const template = i < shuffledTemplates.length
      ? shuffledTemplates[i]
      : PERSONALITY_TEMPLATES[Math.floor(Math.random() * PERSONALITY_TEMPLATES.length)];

    const starRating = rollStarRating();
    const rootCount = 1 + Math.floor(Math.random() * 3);
    const shuffledRoots = [...SPIRITUAL_ROOTS].sort(() => Math.random() - 0.5);
    const spiritualRoots = shuffledRoots.slice(0, rootCount);
    const personality: PersonalityTraits = {
      aggressive: clamp(template.traits.aggressive + (Math.random() - 0.5) * 0.2, 0, 1),
      persistent: clamp(template.traits.persistent + (Math.random() - 0.5) * 0.2, 0, 1),
      kind: clamp(template.traits.kind + (Math.random() - 0.5) * 0.2, 0, 1),
      lazy: clamp(template.traits.lazy + (Math.random() - 0.5) * 0.2, 0, 1),
      smart: clamp(template.traits.smart + (Math.random() - 0.5) * 0.2, 0, 1),
    };
    const subRealm = 1 + Math.floor(Math.random() * 3);

    // Phase E 新增：道德双轴
    const moral = {
      goodEvil: randomInt(-30, 30),
      lawChaos: randomInt(-30, 30),
    };

    return {
      id: crypto.randomUUID(),
      name,
      starRating,
      realm: 1,
      subRealm,
      aura: 0,
      personality,
      personalityName: template.name,
      spiritualRoots,
      behavior: DiscipleBehavior.IDLE,
      lastDecisionTime: Date.now(),
      behaviorTimer: 0,
      stamina: 100,
      farmPlots: [],
      currentRecipeId: null,
      moral,
      initialMoral: { ...moral },
      traits: generateInnateTraits(),
      gender,
      orientation: generateOrientation(gender),
    };
  });
}

/**
 * 生成初始关系矩阵 — v8
 *
 * - closeness 初始值: [-20, +20]（按 R-E9 简化版）
 * - tags: []
 * - lastInteraction: Date.now()
 */
export function generateInitialRelationships(disciples: LiteDiscipleState[]): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  const now = Date.now();
  for (let i = 0; i < disciples.length; i++) {
    for (let j = 0; j < disciples.length; j++) {
      if (i === j) continue;
      const a = disciples[i];
      const b = disciples[j];
      // R-E9: 初始亲疏度基于道德相似度弱影响
      const moralSimilarity =
        1 - (Math.abs(a.moral.goodEvil - b.moral.goodEvil) +
             Math.abs(a.moral.lawChaos - b.moral.lawChaos)) / 400;
      // 基础值 [-10, +10] + 道德影响 [-10, +10]
      const baseCloseness = randomInt(-10, 10) + Math.round((moralSimilarity - 0.5) * 20);
      const closeness = Math.max(-20, Math.min(20, baseCloseness));
      edges.push({
        sourceId: a.id,
        targetId: b.id,
        closeness,
        attraction: 0,
        trust: randomInt(0, 10) + Math.round((moralSimilarity - 0.5) * 10),
        tags: [],
        status: null,
        lastInteraction: now,
      });
    }
  }
  return edges;
}
