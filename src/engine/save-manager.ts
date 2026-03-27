/**
 * 存档管理器 — localStorage 版
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

/** 从 localStorage 加载游戏状态 */
export function loadGame(): LiteGameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      console.log('[SaveManager] 无存档，创建新游戏');
      return createDefaultLiteGameState();
    }
    const parsed = JSON.parse(raw) as LiteGameState;
    if (parsed.version !== SAVE_VERSION) {
      console.warn(`[SaveManager] 存档版本不匹配 (${parsed.version} !== ${SAVE_VERSION})，创建新游戏`);
      return createDefaultLiteGameState();
    }
    return parsed;
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
