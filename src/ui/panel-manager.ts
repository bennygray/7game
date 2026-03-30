/**
 * panel-manager.ts — 面板生命周期管理
 *
 * Phase X-γ: 浮层面板系统（PRD §2.2~§2.7）
 *
 * 职责：
 *   - 管理面板的打开/关闭（单面板不变量 I3）
 *   - ESC 键全局关闭（L-02）
 *   - Overlay 背景点击关闭（L-03）
 *
 * ADR-Xγ-01: cmd-area z-index=1000 > panel-overlay z-index=900
 */

export interface PanelManager {
  /** 打开面板（若已有面板，先关闭再打开）— L-01 */
  openPanel(title: string, contentHtml: string): void;
  /** 关闭当前面板 */
  closePanel(): void;
  /** 当前是否有面板打开 */
  isOpen(): boolean;
}

/**
 * 创建 PanelManager 实例
 *
 * @param overlayEl — .mud-panel-overlay 容器
 * @param titleEl — .mud-panel__title 元素
 * @param bodyEl — .mud-panel__body 元素
 * @param closeBtn — .mud-panel__close 按钮
 */
export function createPanelManager(
  overlayEl: HTMLElement,
  titleEl: HTMLElement,
  bodyEl: HTMLElement,
  closeBtn: HTMLElement,
): PanelManager {

  let open = false;

  function openPanel(title: string, contentHtml: string): void {
    // L-01: 同时最多一个面板 — 隐式关闭旧面板
    titleEl.textContent = title;
    bodyEl.innerHTML = contentHtml;
    overlayEl.style.display = 'flex';
    open = true;
  }

  function closePanel(): void {
    overlayEl.style.display = 'none';
    open = false;
  }

  function isOpen(): boolean {
    return open;
  }

  // L-02: ESC 键关闭
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      closePanel();
    }
  });

  // L-03: Overlay 背景点击关闭（不冒泡到面板内部）
  overlayEl.addEventListener('click', (e: MouseEvent) => {
    if (e.target === overlayEl) {
      closePanel();
    }
  });

  // 关闭按钮
  closeBtn.addEventListener('click', () => {
    closePanel();
  });

  return { openPanel, closePanel, isOpen };
}
