/**
 * 存档管理器 — localStorage 版
 *
 * CR-06: 添加 migrateSave 字段迁移机制
 *
 * @see AGENTS.md §3.1 前端性能红线：localStorage ≤ 5MB
 */

import type { LiteGameState } from '../shared/types/game-state';
import { createDefaultLiteGameState } from '../shared/types/game-state';

const SAVE_KEY = '7game-lite-save';
const SAVE_VERSION = 1;

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
 * 迁移旧存档：逐字段填充默认值
 * 防止新增字段导致运行时 undefined crash
 */
function migrateSave(raw: Record<string, unknown>): LiteGameState {
  const defaults = createDefaultLiteGameState();

  // 递归合并：以 defaults 为模板，raw 覆盖已有值
  function mergeDefaults<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    const result = { ...target };
    for (const key of Object.keys(target)) {
      if (key in source && source[key] !== undefined) {
        const targetVal = target[key];
        const sourceVal = source[key];
        if (
          targetVal !== null &&
          typeof targetVal === 'object' &&
          !Array.isArray(targetVal) &&
          sourceVal !== null &&
          typeof sourceVal === 'object' &&
          !Array.isArray(sourceVal)
        ) {
          (result as Record<string, unknown>)[key] = mergeDefaults(
            targetVal as Record<string, unknown>,
            sourceVal as Record<string, unknown>,
          );
        } else {
          (result as Record<string, unknown>)[key] = sourceVal;
        }
      }
    }
    return result;
  }

  const migrated = mergeDefaults(defaults as unknown as Record<string, unknown>, raw) as unknown as LiteGameState;
  migrated.version = SAVE_VERSION;
  return migrated;
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

    // CR-06: 使用 migrateSave 而非直接 as 断言
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
