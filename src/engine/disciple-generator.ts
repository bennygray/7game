/**
 * 弟子生成器 — 随机生成弟子
 *
 * 从 game-state.ts 拆分出来（CR-04）
 * 类型文件不应包含业务逻辑
 */

import type { LiteDiscipleState, PersonalityTraits, StarRating } from '../shared/types/game-state';
import { DiscipleBehavior } from '../shared/types/game-state';
import type { RelationshipEdge } from '../shared/types/game-state';

// ===== 数据表 =====

const SURNAMES = ['林', '陈', '张', '李', '王', '赵', '周', '吴', '孙', '刘'];
const GIVEN_NAMES = ['清风', '明月', '星河', '云烟', '紫霞', '青莲', '玄冰', '碧落', '天华', '灵犀'];
const SPIRITUAL_ROOTS = ['金', '木', '水', '火', '土'];

const PERSONALITY_TEMPLATES: { name: string; traits: PersonalityTraits }[] = [
  { name: '刚烈', traits: { aggressive: 0.8, persistent: 0.7, kind: 0.2, lazy: 0.1, smart: 0.5 } },
  { name: '温和', traits: { aggressive: 0.2, persistent: 0.5, kind: 0.8, lazy: 0.3, smart: 0.6 } },
  { name: '机敏', traits: { aggressive: 0.4, persistent: 0.6, kind: 0.5, lazy: 0.2, smart: 0.9 } },
  { name: '沉稳', traits: { aggressive: 0.3, persistent: 0.8, kind: 0.4, lazy: 0.2, smart: 0.7 } },
  { name: '散漫', traits: { aggressive: 0.3, persistent: 0.3, kind: 0.6, lazy: 0.8, smart: 0.4 } },
  { name: '狡黠', traits: { aggressive: 0.6, persistent: 0.5, kind: 0.3, lazy: 0.4, smart: 0.8 } },
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

// ===== 生成函数 =====

/** 随机生成一名弟子 */
export function generateRandomDisciple(): LiteDiscipleState {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const givenName = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
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
  };
}

/** 生成 N 名初始弟子 */
export function generateInitialDisciples(count = 4): LiteDiscipleState[] {
  return Array.from({ length: count }, () => generateRandomDisciple());
}

/** 生成初始关系矩阵 */
export function generateInitialRelationships(disciples: LiteDiscipleState[]): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  for (let i = 0; i < disciples.length; i++) {
    for (let j = 0; j < disciples.length; j++) {
      if (i === j) continue;
      edges.push({ sourceId: disciples[i].id, targetId: disciples[j].id, value: 0 });
    }
  }
  return edges;
}
