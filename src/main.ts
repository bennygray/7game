/**
 * 7game-lite 应用入口 — Phase X-α/X-γ
 *
 * Phase X-α: main.ts 瘦身（606→<150行）
 * Phase X-γ: +PanelManager 初始化 + 弟子名点击委托
 * 职责：初始化 + 连接各模块 + 启动引擎
 *
 * 架构：
 *   initLayout()         → DOM 结构（layout.ts）
 *   createLogManager()   → 双区日志（log-manager.ts）
 *   createPanelManager() → 面板系统（panel-manager.ts）
 *   bindEngineCallbacks()→ 引擎回调 + 路由（engine-bindings.ts）
 *   initCommandSystem()  → 命令系统 + 历史（command-handler.ts）
 *
 * @see phaseX-gamma-TDD.md
 */

import './styles/mud-theme.css';

import { loadGame, saveGame, clearSave } from './engine/save-manager';
import { IdleEngine } from './engine/idle-engine';
import { createLLMAdapter } from './ai/llm-adapter';
import { SoulEvaluator } from './ai/soul-evaluator';
import { initSoulEventEvaluator } from './engine/handlers/soul-event.handler';
import { createLogger } from './engine/game-logger';

import { initLayout } from './ui/layout';
import { createLogManager } from './ui/log-manager';
import { createPanelManager } from './ui/panel-manager';
import { bindEngineCallbacks, onTickHandler } from './ui/engine-bindings';
import { initCommandSystem, type CommandContext } from './ui/command-handler';
import { formatStatusBar, formatDiscipleInspect } from './ui/mud-formatter';

// ===== 全局状态 =====

let resetting = false;

// ===== 初始化核心实例 =====

const state      = loadGame();
const llmAdapter = createLLMAdapter();
const logger     = createLogger();
const engine     = new IdleEngine(state, logger, llmAdapter);

// ===== DOM 初始化 =====

const appEl = document.getElementById('app')!;
const {
  statusBar, mainLog, systemBarContent, cmdInput,
  panelOverlay, panelTitle, panelBody, panelClose,
} = initLayout(appEl);

// ===== 日志管理器 =====

const logManager = createLogManager();
logManager.init(mainLog, systemBarContent);

// ===== 面板管理器（Phase X-γ）=====

const panelManager = createPanelManager(panelOverlay, panelTitle, panelBody, panelClose);

// ===== 状态栏更新 =====

function updateDisplay(): void {
  statusBar.innerHTML = formatStatusBar(state, engine.getCurrentAuraRate());
}

// ===== 引擎回调（R-02~R-13 + 裁决自动推送 L-06/L-07）=====

bindEngineCallbacks(engine, state, llmAdapter, logManager, panelManager);

// P3-06 修复：setOnTick 是覆盖语义，统一在此处注册，合并 R-01 路由 + 状态栏刷新
engine.setOnTick(() => {
  onTickHandler(engine, state, logManager.addSystemLog);
  updateDisplay();
});

// ===== AI 连接（共用逻辑，P1-05 去重）=====

function connectAI(ctx: CommandContext): void {
  ctx.llmAdapter.tryConnect().then((ok) => {
    if (ok) {
      ctx.logManager.addMainLog(`<span class="mud-text-green">[系统] ✓ AI 后端连接成功！弟子台词切换到 AI 模式</span>`);
    } else {
      ctx.logManager.addMainLog(`<span class="mud-text-red">[系统] ✗ AI 后端不可用，请先运行 npm run ai</span>`);
    }
  });
  const soulEval = new SoulEvaluator();
  soulEval.tryConnect().then((ok) => {
    if (ok) {
      initSoulEventEvaluator(soulEval);
      ctx.logManager.addMainLog(`<span class="mud-text-green">[系统] ✓ 灵魂 AI 评估已激活（Lv.2+ 事件将使用 AI）</span>`);
    }
  });
}

// ===== 命令系统 =====

const cmdCtx: CommandContext = {
  state, engine, llmAdapter, logManager, panelManager,
  onReset: () => { resetting = true; },
  clearSave,
  connectAI,
};
initCommandSystem(cmdInput, cmdCtx);

// ===== 弟子名点击委托（PRD §2.9 CK-02/CK-04，ADR-Xγ-03）=====

function handleDiscipleClick(container: HTMLElement): void {
  container.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-disciple-id]') as HTMLElement | null;
    if (!target) return;
    const id = target.getAttribute('data-disciple-id');
    if (!id) return;
    const disciple = state.disciples.find(d => d.id === id);
    if (!disciple) return;
    const emotion = engine.getEmotionState(disciple.id);
    panelManager.openPanel(`灵魂档案 · ${disciple.name}`, formatDiscipleInspect(disciple, state, emotion));
  });
}

handleDiscipleClick(mainLog);       // 日志流中的弟子名
handleDiscipleClick(panelBody);     // 面板内的弟子名

// ===== 启动 =====

updateDisplay();
engine.start();

logManager.addMainLog(`<span class="mud-text-cyan">[系统] 七道修仙 MUD 灵智版 v0.5.5 已启动</span>`);
logManager.addMainLog(`<span class="mud-text-cyan">[系统] 引擎 Tick 循环已激活，修炼进行中...</span>`);
logManager.addMainLog(`<span class="mud-text-mute">[系统] 输入 'help' 查看可用命令 | 'look' 查看宗门总览 | ↑/↓ 翻阅历史</span>`);

// 自动尝试连接 AI 后端（静默，复用 connectAI）
connectAI(cmdCtx);

// ===== 自动存档 =====

const AUTO_SAVE_INTERVAL = 30_000;

setInterval(() => { if (!resetting) saveGame(state); }, AUTO_SAVE_INTERVAL);
window.addEventListener('beforeunload', () => { if (!resetting) saveGame(state); });

console.log('[7game-lite] v0.5.5 Phase GS + I-beta + UI-S 完成', state);
