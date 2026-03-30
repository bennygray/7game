/**
 * command-handler.ts — 命令解析 + 历史管理
 *
 * Phase X-α: 从 main.ts 拆分（L226-411），新增命令历史（PRD §2.6 CMD-01~03）
 * Phase X-γ: 命令输出路由 addMainLog→openPanel（PRD §2.6 P-CMD）
 * 职责：解析用户输入，路由到对应命令处理器，管理命令历史
 *
 * 依赖注入：CommandContext（避免全局变量，ADR-Xα-03）
 */

import type { LiteGameState } from '../shared/types/game-state';
import type { IdleEngine } from '../engine/idle-engine';
import type { LLMAdapter } from '../ai/llm-adapter';
import { escapeHtml } from '../engine/disciple-generator';
import { getRealmDisplayName } from '../shared/formulas/realm-display';
import { getSpiritVeinDensity } from '../shared/data/realm-table';
import { SEED_BY_ID } from '../shared/data/seed-table';
import { RECIPE_BY_ID } from '../shared/data/recipe-table';
import { SoulEvaluator } from '../ai/soul-evaluator';
import { initSoulEventEvaluator } from '../engine/handlers/soul-event.handler';
import { EventSeverity } from '../shared/types/world-event';
import {
  formatLookOverview,
  formatDiscipleProfile,
  matchDisciple,
  formatSeverityLog,
  formatDiscipleInspect,
  formatSectProfile,
  formatRulingWindow,
} from './mud-formatter';
import type { LogManager } from './log-manager';
import type { PanelManager } from './panel-manager';

// ===== 命令上下文（依赖注入，ADR-Xα-03）=====

export interface CommandContext {
  state: LiteGameState;
  engine: IdleEngine;
  llmAdapter: LLMAdapter;
  logManager: LogManager;
  panelManager: PanelManager;  // Phase X-γ: 面板管理器注入
}

// ===== 命令别名（Phase X-β PRD §2.3）=====

/** 新别名→完整命令映射（l/i/bt 已在 if/case 中实现） */
const COMMAND_ALIASES: Record<string, string> = {
  s: 'status',
  j: 'judge',
  h: 'help',
};

// ===== 命令历史（PRD §2.6）=====

const CMD_HISTORY_MAX = 50;
const history: string[] = [];
let historyIndex = -1;

// ===== Tab 补全（Phase X-β PRD §2.2）=====

/** 可补全的命令名列表（按字母序） */
const COMPLETABLE_COMMANDS = [
  'ai', 'bt', 'clear', 'help', 'inspect', 'judge', 'look', 'reset', 'sect', 'status',
];

interface TabCompletionState {
  candidates: string[];  // 候选列表
  index: number;         // 当前循环索引
  prefix: string;        // 触发补全时的原始输入
}

let tabState: TabCompletionState | null = null;

// ===== 初始化命令系统 =====

/**
 * 初始化命令系统：绑定输入框键盘事件
 */
export function initCommandSystem(
  inputEl: HTMLInputElement,
  ctx: CommandContext,
): void {
  inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
    // Tab/Shift+Tab 补全（T-01~T-08）
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion(inputEl, ctx, e.shiftKey);
      return;
    }

    // 任意其他键→退出补全循环（T-07）
    if (e.key !== 'Tab') {
      tabState = null;
    }

    if (e.key === 'ArrowUp') {
      // CMD-01: ↑ 回溯历史
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        inputEl.value = history[history.length - 1 - historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      // CMD-01: ↓ 向下翻阅
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        inputEl.value = history[history.length - 1 - historyIndex];
      } else {
        historyIndex = -1;
        inputEl.value = '';
      }
    } else if (e.key === 'Enter') {
      const raw = inputEl.value.trim();
      inputEl.value = '';
      historyIndex = -1;

      if (!raw) return; // CMD-03: 空命令不记录

      // CMD-02: 命令回显
      ctx.logManager.addMainLog(`<span class="mud-cmd-echo">&gt; ${escapeHtml(raw)}</span>`);

      // 记录历史（CMD-01）
      history.push(raw);
      if (history.length > CMD_HISTORY_MAX) history.shift();

      handleCommand(raw, ctx);
    }
  });
}

// ===== Tab 补全逻辑（PRD §2.2 T-01~T-08）=====

function handleTabCompletion(
  inputEl: HTMLInputElement,
  ctx: CommandContext,
  reverse: boolean,
): void {
  const currentValue = inputEl.value;

  // T-01: 空输入不触发
  if (!currentValue && !tabState) return;

  // 已在循环中 → 切换下一个候选
  if (tabState && tabState.candidates.length > 0) {
    if (reverse) {
      tabState.index = (tabState.index - 1 + tabState.candidates.length) % tabState.candidates.length;
    } else {
      tabState.index = (tabState.index + 1) % tabState.candidates.length;
    }
    inputEl.value = tabState.candidates[tabState.index];
    return;
  }

  // 首次触发 → 生成候选列表
  const candidates = getCompletionCandidates(currentValue, ctx);

  // T-06: 无匹配
  if (candidates.length === 0) return;

  // 唯一匹配 → 直接填入
  if (candidates.length === 1) {
    inputEl.value = candidates[0];
    tabState = null;
    return;
  }

  // 多匹配 → 进入循环模式
  const startIndex = reverse ? candidates.length - 1 : 0;
  tabState = {
    candidates,
    index: startIndex,
    prefix: currentValue,
  };
  inputEl.value = candidates[startIndex];
}

/**
 * 生成补全候选列表（纯函数）
 * - verb 未完成 → 匹配命令名
 * - verb 已完成 + arg 前缀 → 匹配弟子名
 */
function getCompletionCandidates(input: string, ctx: CommandContext): string[] {
  const parts = input.split(/\s+/);
  const verb = parts[0].toLowerCase();
  const hasSpace = input.includes(' ');

  if (!hasSpace) {
    // verb 补全
    const matches = COMPLETABLE_COMMANDS.filter(c => c.startsWith(verb));
    return matches.map(c => c + ' ');
  }

  // arg 补全（弟子名）
  const argPrefix = parts.slice(1).join(' ').trim();
  const names = ctx.state.disciples.map(d => d.name);
  const matchedNames = argPrefix
    ? names.filter(n => n.startsWith(argPrefix))
    : names; // 空 arg → 全部弟子

  return matchedNames.map(n => `${verb} ${n}`);
}

// ===== 命令路由 =====

function handleCommand(cmd: string, ctx: CommandContext): void {
  const { state, engine, llmAdapter, logManager } = ctx;
  const { addMainLog } = logManager;

  const parts = cmd.trim().split(/\s+/);
  let verb   = parts[0].toLowerCase();
  const arg  = parts.slice(1).join(' ').trim();

  // Phase X-β: 别名展开（A-别名表）
  verb = COMMAND_ALIASES[verb] ?? verb;

  // look / l → Phase X-γ: 输出到面板（PRD §2.6 P-CMD）
  if (verb === 'look' || verb === 'l') {
    if (arg) {
      const result = matchDisciple(arg, state.disciples);
      if (result.type === 'exact') {
        ctx.panelManager.openPanel(`弟子档案 · ${result.disciple.name}`, formatDiscipleProfile(result.disciple, state));
      } else if (result.type === 'multiple') {
        addMainLog(`<span class="mud-text-cyan">[系统] 找到多名匹配弟子，请输入更完整的名字：</span>`);
        for (const c of result.candidates) {
          addMainLog(`  ${escapeHtml(c.name)}`);
        }
      } else {
        addMainLog(`<span class="mud-text-mute">[系统] 未找到名为"${escapeHtml(arg)}"的弟子</span>`);
      }
    } else {
      ctx.panelManager.openPanel('宗门总览', formatLookOverview(state));
    }
    return;
  }

  // inspect / i → Phase X-γ: 输出到面板
  if (verb === 'inspect' || verb === 'i') {
    if (!arg) {
      addMainLog(`<span class="mud-text-mute">[系统] 用法：inspect <弟子名></span>`);
      return;
    }
    const result = matchDisciple(arg, state.disciples);
    if (result.type === 'exact') {
      const emotion = engine.getEmotionState(result.disciple.id);
      ctx.panelManager.openPanel(`灵魂档案 · ${result.disciple.name}`, formatDiscipleInspect(result.disciple, state, emotion));
    } else if (result.type === 'multiple') {
      addMainLog(`<span class="mud-text-cyan">[系统] 找到多位弟子：${result.candidates.map(c => escapeHtml(c.name)).join('、')}... 请输入更完整的名字。</span>`);
    } else {
      addMainLog(`<span class="mud-text-mute">[系统] 未找到名为「${escapeHtml(arg)}」的弟子。</span>`);
    }
    return;
  }

  // sect → Phase X-γ: 输出到面板
  if (verb === 'sect') {
    ctx.panelManager.openPanel('宗门道风', formatSectProfile(state));
    return;
  }

  // judge [N] → Phase X-γ: 无参数输出到面板，judge N 执行后关闭面板
  if (verb === 'judge') {
    const ruling = engine.getActiveRuling();
    if (!ruling) {
      addMainLog(`<span class="mud-text-mute">[系统] 当前没有需要裁决的事件。</span>`);
      return;
    }
    if (!arg) {
      const remaining = (ruling.expiresAt - Date.now()) / 1000;
      ctx.panelManager.openPanel('⚡ 风暴裁决', formatRulingWindow(ruling, remaining));
      return;
    }
    const optIndex = parseInt(arg, 10);
    if (isNaN(optIndex) || optIndex < 1 || optIndex > ruling.options.length) {
      addMainLog(`<span class="mud-text-red">[系统] 无效选项，请输入 judge 1~${ruling.options.length}</span>`);
      return;
    }
    engine.resolveRuling(optIndex);
    ctx.panelManager.closePanel();  // L-08: judge N 执行后即时关闭面板
    return;
  }

  switch (verb) {
    case 'help':
      addMainLog(`<span class="mud-text-cyan">[系统] 可用命令：</span>`);
      addMainLog('  look / l          — 查看宗门总览（各区弟子分布）');
      addMainLog('  look &lt;弟子名&gt;    — 查看弟子档案（性格/特性/关系）');
      addMainLog('  inspect / i &lt;弟子名&gt; — 查看弟子灵魂档案（情绪/道德/特性）');
      addMainLog('  sect            — 查看宗门道风总览');
      addMainLog('  judge / j &lt;N&gt;   — 裁决风暴事件（输入选项编号）');
      addMainLog('  status / s      — 查看宗主状态');
      addMainLog('  bt              — 尝试突破');
      addMainLog('  clear           — 清空日志');
      addMainLog('  reset           — 清除存档（重新开始）');
      addMainLog('  ai              — 连接 AI 后端');
      addMainLog('  help / h        — 显示帮助');
      addMainLog(`<span class="mud-text-mute">  提示：Tab 补全命令/弟子名 | ↑/↓ 翻阅历史</span>`);
      break;

    case 'status':
      addMainLog(`<span class="mud-separator">[状态] 境界：${escapeHtml(getRealmDisplayName(state.realm, state.subRealm))}</span>`);
      addMainLog(`  灵气：${state.aura.toFixed(0)} | 灵石：${state.spiritStones.toFixed(1)} | 悟性：${state.comprehension.toFixed(1)}`);
      addMainLog(`  弟子数：${state.disciples.length} | 突破次数：${state.lifetimeStats.breakthroughTotal}`);
      {
        const matEntries = Object.entries(state.materialPouch).filter(([, v]) => v > 0);
        if (matEntries.length > 0) {
          addMainLog(`  材料：${matEntries.map(([k, v]) => `${SEED_BY_ID.get(k)?.name ?? k}×${v}`).join('、')}`);
        }
        if (state.pills.length > 0) {
          addMainLog(`  丹药：${state.pills.map(p => `${RECIPE_BY_ID.get(p.defId)?.name ?? p.defId}(${p.quality})×${p.count}`).join('、')}`);
        }
        addMainLog(`  上缴丹药：${state.sect.tributePills}`);
      }
      {
        const density = getSpiritVeinDensity(state.realm, state.subRealm);
        addMainLog(`  灵脉密度：×${density.toFixed(1)}`);
        if (state.cultivateBoostBuff) {
          addMainLog(`  修速丹：加速中 (剩余 ${state.cultivateBoostBuff.remainingSec.toFixed(0)}s)`);
        }
        const btBuff = state.breakthroughBuff;
        if (btBuff.pillsConsumed.length > 0) {
          addMainLog(`  破镜丹：${btBuff.pillsConsumed.length}/3 颗，加成 +${(btBuff.totalBonus * 100).toFixed(0)}%`);
        }
        addMainLog(`  丹药消费总数：${state.lifetimeStats.pillsConsumed} | 突破失败：${state.lifetimeStats.breakthroughFailed}`);
      }
      break;

    case 'bt':
    case 'breakthrough': {
      const btLog = engine.tryBreakthrough();
      for (const hl of btLog.healLogs) {
        addMainLog(`<span class="mud-text-cyan">[系统] ${escapeHtml(hl.detail)}</span>`);
      }
      if (btLog.success) {
        const r = btLog.result;
        addMainLog(formatSeverityLog(
          EventSeverity.STORM,
          `突破！境界提升至${getRealmDisplayName(r.newRealm, r.newSubRealm)}`
        ));
      } else {
        addMainLog(formatSeverityLog(EventSeverity.SPLASH, `突破失败！${btLog.message}`));
      }
      break;
    }

    case 'clear':
      // 清空主日志（DOM 直接清空）
      {
        const mainLogEl = document.getElementById('main-log');
        if (mainLogEl) mainLogEl.innerHTML = '';
      }
      break;

    case 'ai':
      addMainLog(`<span class="mud-text-cyan">[系统] 正在尝试连接 AI 后端...</span>`);
      if ('tryConnect' in llmAdapter) {
        (llmAdapter as any).tryConnect().then((ok: boolean) => {
          if (ok) {
            addMainLog(`<span class="mud-text-green">[系统] ✓ AI 后端连接成功！弟子台词切换到 AI 模式</span>`);
          } else {
            addMainLog(`<span class="mud-text-red">[系统] ✗ AI 后端不可用，请先运行 npm run ai</span>`);
          }
        });
      }
      {
        const soulEval = new SoulEvaluator();
        soulEval.tryConnect().then((ok) => {
          if (ok) {
            initSoulEventEvaluator(soulEval);
            addMainLog(`<span class="mud-text-green">[系统] ✓ 灵魂 AI 评估已激活（Lv.2+ 事件将使用 AI）</span>`);
          }
        });
      }
      break;

    case 'reset': {
      const mainEl = document.getElementById('main-log');
      if (mainEl) mainEl.innerHTML = '';
      addMainLog(`<span class="mud-text-red">[系统] 存档已清除，正在重新加载...</span>`);
      engine.stop();
      if (typeof (window as any).__mudReset === 'function') {
        (window as any).__mudReset();
      }
      localStorage.removeItem('7game-lite-save');
      setTimeout(() => window.location.reload(), 300);
      break;
    }

    default:
      addMainLog(`<span class="mud-text-mute">[系统] 未知指令 '${escapeHtml(cmd)}'，输入 'help' 查看可用命令</span>`);
  }
}
