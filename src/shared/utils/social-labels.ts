/**
 * Phase UI-S: 社交系统共享标签工具
 *
 * 集中管理 RelationshipStatus / RelationshipTag / Orientation 的中文标签映射，
 * 消除 UI 层与 Engine 层的重复定义。
 *
 * @see phaseUI-S-PRD.md §4.1~§4.3
 * @see phaseUI-S-TDD.md §2.1
 */

import type { RelationshipStatus, RelationshipTag } from '../types/soul';
import type { Orientation, Gender } from '../types/game-state';

// ===== RelationshipStatus 中文标签 =====

/** PRD §4.1: crush→倾慕, lover→道侣, sworn-sibling→金兰, nemesis→宿敌 */
export const RELATIONSHIP_STATUS_LABEL: Record<RelationshipStatus, string> = {
  crush: '倾慕',
  lover: '道侣',
  'sworn-sibling': '金兰',
  nemesis: '宿敌',
};

/** null 安全的 status 标签查询 */
export function getRelationshipStatusLabel(status: RelationshipStatus | null): string | null {
  if (status === null) return null;
  return RELATIONSHIP_STATUS_LABEL[status] ?? null;
}

// ===== RelationshipTag 中文标签 =====

/** PRD §4.2: friend→知己, rival→对头, mentor→师恩, admirer→仰慕, grudge→积怨 */
export const RELATIONSHIP_TAG_LABEL: Record<RelationshipTag, string> = {
  friend: '知己',
  rival: '对头',
  mentor: '师恩',
  admirer: '仰慕',
  grudge: '积怨',
};

// ===== 统一分隔符 =====

/** PRD §4.6: 统一中点分隔符 */
export const TAG_SEPARATOR = '·';

// ===== 关系类型标签（提取自 social-tick.handler.ts） =====

/** 关系类型→中文标签（注：sworn-sibling 从原"结拜"变更为"金兰"） */
export function getRelationLabel(type: string): string {
  switch (type) {
    case 'crush': return '倾慕';
    case 'lover': return '道侣';
    case 'sworn-sibling': return '金兰';
    case 'nemesis': return '宿敌';
    default: return type;
  }
}

// ===== Orientation 取向标签 =====

/**
 * PRD §4.3 优先级规则（从上到下，首条匹配即返回）：
 * 1. gender==unknown → 无慕
 * 2. 两者均==0 → 无慕
 * 3. 两者均>0 → 兼慕
 * 4-7. 单向 → 慕异/慕同
 */
export function getOrientationLabel(orientation: Orientation, gender: Gender): string {
  if (gender === 'unknown') return '无慕';

  const { maleAttraction, femaleAttraction } = orientation;

  if (maleAttraction === 0 && femaleAttraction === 0) return '无慕';
  if (maleAttraction > 0 && femaleAttraction > 0) return '兼慕';

  if (gender === 'male') {
    return femaleAttraction > 0 ? '慕异' : '慕同';
  }
  // gender === 'female'
  return maleAttraction > 0 ? '慕异' : '慕同';
}
