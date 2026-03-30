/**
 * layout.ts — DOM 布局初始化
 *
 * Phase X-α: 从 main.ts 拆分
 * Phase X-γ: +面板 Overlay DOM（PRD §2.3 P-DOM）
 * 职责：创建并注入 DOM 结构，返回关键元素引用
 * ADR-Xα-02: 系统消息条默认展开，可折叠
 */

export interface LayoutElements {
  statusBar: HTMLElement;
  mainLog: HTMLElement;
  systemBarContent: HTMLElement;
  cmdInput: HTMLInputElement;
  /** Phase X-γ: 面板 Overlay 元素引用 */
  panelOverlay: HTMLElement;
  panelTitle: HTMLElement;
  panelBody: HTMLElement;
  panelClose: HTMLElement;
}

/**
 * 初始化 MUD 布局，插入 #app 容器
 * 返回关键 DOM 元素引用
 */
export function initLayout(appEl: HTMLElement): LayoutElements {
  appEl.innerHTML = `
    <div class="mud-container">

      <!-- 顶部状态栏 -->
      <div id="status-bar" class="mud-status-bar">七道修仙 — 加载中...</div>

      <!-- ASCII 标题区 -->
      <div class="mud-title-area"><pre>
╔══════════════════════════════════════════╗
║     七 道 修 仙 — MUD 灵智版            ║
╚══════════════════════════════════════════╝</pre></div>

      <!-- 主事件流 -->
      <div id="main-log" class="mud-main-log"></div>

      <!-- 面板覆盖层（Phase X-γ PRD §2.3 P-DOM） -->
      <div class="mud-panel-overlay" id="panel-overlay" style="display:none">
        <div class="mud-panel" id="panel-content">
          <div class="mud-panel__header">
            <span class="mud-panel__title" id="panel-title"></span>
            <button class="mud-panel__close" id="panel-close" title="关闭 (ESC)">✕</button>
          </div>
          <div class="mud-panel__body" id="panel-body"></div>
        </div>
      </div>

      <!-- 系统消息条 -->
      <div id="system-bar" class="mud-system-bar">
        <div class="mud-system-bar__header" id="system-bar-header">
          <span>⚙ 系统</span>
          <button class="mud-system-bar__toggle" id="system-bar-toggle" title="折叠/展开">▲</button>
        </div>
        <div id="system-bar-content" class="mud-system-bar__content"></div>
      </div>

      <!-- 命令输入（底部） -->
      <div class="mud-cmd-area">
        <span class="mud-cmd-prompt">&gt;</span>
        <input
          id="cmd-input"
          class="mud-cmd-input"
          type="text"
          placeholder="输入命令 (help 查看列表)..."
          autocomplete="off"
          spellcheck="false"
        />
      </div>

    </div>
  `;

  // 绑定系统消息条折叠（ADR-Xα-02）
  const header = document.getElementById('system-bar-header')!;
  const toggle = document.getElementById('system-bar-toggle')!;
  const sysBar = document.getElementById('system-bar')!;
  let collapsed = false;

  header.addEventListener('click', () => {
    collapsed = !collapsed;
    if (collapsed) {
      sysBar.classList.add('mud-collapsed');
      toggle.textContent = '▼';
    } else {
      sysBar.classList.remove('mud-collapsed');
      toggle.textContent = '▲';
    }
  });

  return {
    statusBar:        document.getElementById('status-bar')!         as HTMLElement,
    mainLog:          document.getElementById('main-log')!           as HTMLElement,
    systemBarContent: document.getElementById('system-bar-content')! as HTMLElement,
    cmdInput:         document.getElementById('cmd-input')!          as HTMLInputElement,
    panelOverlay:     document.getElementById('panel-overlay')!      as HTMLElement,
    panelTitle:       document.getElementById('panel-title')!        as HTMLElement,
    panelBody:        document.getElementById('panel-body')!         as HTMLElement,
    panelClose:       document.getElementById('panel-close')!        as HTMLElement,
  };
}
