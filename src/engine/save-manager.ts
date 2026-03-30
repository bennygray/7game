/**
 * 存档管理器 — localStorage 版
 *
 * v2: Phase B-α 存档迁移
 *   - 删除 fields/alchemy（旧灵田/炼丹）
 *   - 弟子增 farmPlots/currentRecipeId
 *   - 增 pills/sect.tributePills
 *
 * v3: Phase C 存档迁移
 *   - 增 breakthroughBuff/cultivateBoostBuff
 *   - lifetimeStats +pillsConsumed/breakthroughFailed
 *
 * v4: Phase E 存档迁移
 *   - 弟子增 moral/initialMoral/traits
 *   - RelationshipEdge: value → affinity + tags + lastInteraction
 *
 * @see AGENTS.md §3.1 前端性能红线：localStorage ≤ 10MB
 */

import type { LiteGameState } from '../shared/types/game-state';
import { createDefaultLiteGameState } from '../shared/types/game-state';
import { generateInnateTraits } from '../shared/data/trait-registry';

const SAVE_KEY = '7game-lite-save';
const SAVE_VERSION = 5;

/** 保存游戏状态到 localStorage */
export function saveGame(state: LiteGameState): boolean {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch (e) {
    console.error('[SaveManager] 存档失败:', e);
    return false;
  }
}

/**
 * v1 → v2 显式迁移
 *
 * - 删除 fields / alchemy（旧字段）
 * - 弟子增 farmPlots / currentRecipeId
 * - 增 pills / sect.tributePills
 */
function migrateV1toV2(raw: Record<string, unknown>): void {
  // 删除旧字段
  delete raw['fields'];
  delete raw['alchemy'];

  // 弟子级迁移
  const disciples = raw['disciples'] as Record<string, unknown>[] | undefined;
  if (Array.isArray(disciples)) {
    for (const d of disciples) {
      if (!Array.isArray(d['farmPlots'])) {
        d['farmPlots'] = [];
      }
      if (d['currentRecipeId'] === undefined) {
        d['currentRecipeId'] = null;
      }
    }
  }

  // 新增全局字段
  if (!Array.isArray(raw['pills'])) {
    raw['pills'] = [];
  }

  // sect 迁移
  const sect = raw['sect'] as Record<string, unknown> | undefined;
  if (sect && typeof sect === 'object') {
    if (sect['tributePills'] === undefined) {
      sect['tributePills'] = 0;
    }
  }

  raw['version'] = 2;
  console.log('[SaveManager] v1 → v2 迁移完成');
}

/**
 * v2 → v3 显式迁移 (Phase C)
 *
 * - 增 breakthroughBuff / cultivateBoostBuff
 * - lifetimeStats +pillsConsumed +breakthroughFailed
 */
function migrateV2toV3(raw: Record<string, unknown>): void {
  // 新增 buff 字段
  if (!raw['breakthroughBuff']) {
    raw['breakthroughBuff'] = { pillsConsumed: [], totalBonus: 0 };
  }
  if (raw['cultivateBoostBuff'] === undefined) {
    raw['cultivateBoostBuff'] = null;
  }

  // lifetimeStats 扩展
  const stats = raw['lifetimeStats'] as Record<string, unknown> | undefined;
  if (stats && typeof stats === 'object') {
    if (stats['pillsConsumed'] === undefined) {
      stats['pillsConsumed'] = 0;
    }
    if (stats['breakthroughFailed'] === undefined) {
      stats['breakthroughFailed'] = 0;
    }
  }

  raw['version'] = 3;
  console.log('[SaveManager] v2 → v3 迁移完成');
}

/**
 * v3 → v4 显式迁移 (Phase E)
 *
 * - 弟子增 moral / initialMoral / traits
 * - RelationshipEdge.value → affinity + tags + lastInteraction
 */
function migrateV3toV4(raw: Record<string, unknown>): void {
  // 1. 弟子迁移：补充 moral + traits
  const disciples = raw['disciples'] as Record<string, unknown>[] | undefined;
  if (Array.isArray(disciples)) {
    for (const d of disciples) {
      if (!d['moral']) {
        const goodEvil = Math.floor(Math.random() * 61) - 30; // [-30, +30]
        const lawChaos = Math.floor(Math.random() * 61) - 30;
        d['moral'] = { goodEvil, lawChaos };
      }
      if (!d['initialMoral']) {
        d['initialMoral'] = { ...(d['moral'] as Record<string, unknown>) };
      }
      if (!Array.isArray(d['traits'])) {
        // 迁移时随机分配 1 个先天特性
        d['traits'] = generateInnateTraits();
      }
    }
  }

  // 2. 关系边迁移：value → affinity + tags + lastInteraction
  const relationships = raw['relationships'] as Record<string, unknown>[] | undefined;
  if (Array.isArray(relationships)) {
    raw['relationships'] = relationships.map((r) => ({
      sourceId: r['sourceId'],
      targetId: r['targetId'],
      affinity: (r['value'] as number) ?? (r['affinity'] as number) ?? 0,
      tags: (r['tags'] as unknown[]) ?? [],
      lastInteraction: (r['lastInteraction'] as number) ?? Date.now(),
    }));
  }

  raw['version'] = 4;
  console.log('[SaveManager] v3 → v4 迁移完成');
}

/**
 * v4 → v5 显式迁移 (Phase F0-α)
 *
 * - SectState 增 ethos / discipline（默认 0 = 中庸）
 */
function migrateV4toV5(raw: Record<string, unknown>): void {
  const sect = raw['sect'] as Record<string, unknown> | undefined;
  if (sect && typeof sect === 'object') {
    if (sect['ethos'] === undefined) sect['ethos'] = 0;
    if (sect['discipline'] === undefined) sect['discipline'] = 0;
  }
  raw['version'] = 5;
  console.log('[SaveManager] v4 → v5 迁移完成');
}

/**
 * 迁移旧存档：逐版本号升级 + 默认值填充
 */
function migrateSave(raw: Record<string, unknown>): LiteGameState {
  const version = (raw['version'] as number) ?? 1;

  // 版本链式迁移
  if (version < 2) {
    migrateV1toV2(raw);
  }
  if ((raw['version'] as number) < 3) {
    migrateV2toV3(raw);
  }
  if ((raw['version'] as number) < 4) {
    migrateV3toV4(raw);
  }
  if ((raw['version'] as number) < 5) {
    migrateV4toV5(raw);
  }

  // 兜底：用 defaults 补全可能缺失的字段（安全网）
  const defaults = createDefaultLiteGameState();
  const result: Record<string, unknown> = {};
  const defaultsRec = defaults as unknown as Record<string, unknown>;

  for (const key of Object.keys(defaults as unknown as Record<string, unknown>)) {
    const defaultVal = defaultsRec[key];
    if (key in raw && raw[key] !== undefined) {
      const rawVal = raw[key];

      // 对象类型浅合并（非数组）
      if (
        defaultVal !== null &&
        typeof defaultVal === 'object' &&
        !Array.isArray(defaultVal) &&
        rawVal !== null &&
        typeof rawVal === 'object' &&
        !Array.isArray(rawVal)
      ) {
        result[key] = { ...defaultVal as Record<string, unknown>, ...rawVal as Record<string, unknown> };
      } else {
        result[key] = rawVal;
      }
    } else {
      result[key] = defaultVal;
    }
  }

  result['version'] = SAVE_VERSION;
  return result as unknown as LiteGameState;
}

/** 从 localStorage 加载游戏状态 */
export function loadGame(): LiteGameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      console.log('[SaveManager] 无存档，创建新游戏');
      return createDefaultLiteGameState();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const state = migrateSave(parsed);
    console.log('[SaveManager] 存档已加载（含迁移检查）');
    return state;
  } catch (e) {
    console.error('[SaveManager] 读档失败:', e);
    return createDefaultLiteGameState();
  }
}

/** 清除存档 */
export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
  console.log('[SaveManager] 存档已清除');
}

/** 检查是否有存档 */
export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

