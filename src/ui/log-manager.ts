/**
 * log-manager.ts — 双区日志管理
 *
 * Phase X-α: 从 main.ts 拆分 + 新增日志分区
 * Phase X-γ: BUG-Xγ-01 修复 — innerHTML 全量替换 → 增量 DOM 操作
 *            ADR-Xγ-02: 移除 JS 数组缓冲，DOM 即唯一状态源
 *
 * 职责：管理 main-log（主事件流）和 system-bar（系统消息条）两个区域
 *
 * PRD §2.2 消息路由规则 R-01~R-13:
 *   → addMainLog:   R-05/06/07/08/09/10/11/12（弟子/世界/AI/对话/突破/裁决）
 *   → addSystemLog: R-01/02/03/04/13（修炼灵气/灵田/系统/soul-engine/环境呼吸）
 */

const MAIN_LOG_MAX   = 200;
const SYSTEM_LOG_MAX = 5;   // PRD L-05：系统消息条最多显示最近 5 条

export interface LogManager {
  /** 添加到主事件流（弟子/世界/AI/对话/突破/裁决） */
  addMainLog(html: string): void;
  /** 添加到系统消息条（修炼灵气/灵田/soul-engine/环境呼吸） */
  addSystemLog(html: string): void;
  /** 清空主事件流 DOM（供 clear/reset 命令使用） */
  clearMainLog(): void;
  /** 初始化（注入 DOM 元素引用） */
  init(mainLogEl: HTMLElement, systemBarEl: HTMLElement): void;
}

/**
 * 增量追加一行到容器（BUG-Xγ-01 修复 — PRD §2.8 M-FIX）
 *
 * 修复前：container.innerHTML = lines.map(...).join('') — 每次 200 节点全量替换
 * 修复后：appendChild 1 个节点 + removeChild 溢出节点 — O(1) DOM 操作
 */
function appendLine(container: HTMLElement, html: string, maxLines: number): void {
  const span = document.createElement('span');
  span.className = 'mud-line';
  span.innerHTML = html;
  container.appendChild(span);

  // 溢出时移除最老的行（FIFO）
  while (container.childElementCount > maxLines) {
    container.removeChild(container.firstElementChild!);
  }

  container.scrollTop = container.scrollHeight;
}

/**
 * 创建日志管理器实例
 * ADR-Xγ-02: 无 JS 数组缓冲，DOM 即唯一状态源
 */
export function createLogManager(): LogManager {
  let mainLogEl: HTMLElement | null = null;
  let systemBarEl: HTMLElement | null = null;

  function addMainLog(html: string): void {
    if (mainLogEl) appendLine(mainLogEl, html, MAIN_LOG_MAX);
  }

  function addSystemLog(html: string): void {
    if (systemBarEl) appendLine(systemBarEl, html, SYSTEM_LOG_MAX);
  }

  function clearMainLog(): void {
    if (mainLogEl) mainLogEl.innerHTML = '';
  }

  function init(mainEl: HTMLElement, sysEl: HTMLElement): void {
    mainLogEl   = mainEl;
    systemBarEl = sysEl;
  }

  return { addMainLog, addSystemLog, clearMainLog, init };
}
