/**
 * 7game-lite 应用入口
 *
 * Story #1: 脚手架 + 存档
 * Story #2: 修炼引擎 Tick 循环
 * Story #3: MUD 文字面板
 * Story #4: 弟子行为树
 * Story #5: AI 灵智接入
 *
 * Phase C:
 *   - bt 命令改概率模型
 *   - status 扩展（修速丹/破镜丹/灵脉/统计）
 *   - 系统日志回调（自动服丹/突破）
 *
 * CR-01: 分离初始化渲染与增量更新（不再每 tick 重建 DOM）
 * CR-02: 命令输入 HTML 转义（防 XSS）
 */

import { loadGame, saveGame } from './engine/save-manager';
import { IdleEngine } from './engine/idle-engine';
import { getRealmAuraCost, getMaxSubRealm } from './shared/formulas/realm-formulas';
import { escapeHtml } from './engine/disciple-generator';
import { getBehaviorLabel } from './engine/behavior-tree';
import { createLLMAdapter, type GenerateRequest } from './ai/llm-adapter';
import { createDefaultAISoulContext, addShortTermMemory } from './shared/types/ai-soul';
import { SEED_BY_ID } from './shared/data/seed-table';
import { RECIPE_BY_ID } from './shared/data/recipe-table';
import { getSpiritVeinDensity } from './shared/data/realm-table';
import { getRealmDisplayName } from './shared/formulas/realm-display';
import { createLogger } from './engine/game-logger';
import type { DialogueExchange } from './shared/types/dialogue';

// ===== 初始化 =====

const state = loadGame();
const llmAdapter = createLLMAdapter();
const logger = createLogger();
const engine = new IdleEngine(state, logger, llmAdapter);

const AUTO_SAVE_INTERVAL = 30_000;

// ===== 工具函数 =====

// CR-A3: getRealmDisplayName 已提取到 shared/formulas/realm-display.ts
// main.ts 中使用 getRealmDisplayName 替代旧 getRealmName

function getNextBreakthroughCost(): number {
  const maxSub = getMaxSubRealm(state.realm);
  if (state.subRealm >= maxSub) return Infinity;
  return getRealmAuraCost(state.realm, state.subRealm + 1);
}

function getProgressText(): string {
  const nextCost = getNextBreakthroughCost();
  if (nextCost === Infinity) return '需天劫';
  return `${Math.min(100, (state.aura / nextCost * 100)).toFixed(1)}%`;
}

// ===== DOM 初始化（只调用一次） =====

function initUI(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div id="mud-container" style="
      font-family: 'Courier New', 'SimHei', monospace;
      background: #1a1a2e;
      color: #c8b88b;
      min-height: 100vh;
      margin: 0;
    ">
      <pre id="mud-screen" style="
        padding: 20px 20px 0;
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
      ">
╔══════════════════════════════════════════╗
║     七 道 修 仙 — MUD 灵智版            ║
╚══════════════════════════════════════════╝

  [仙历 <span id="ui-time">---</span>]

  ─── 宗主状态 ───
  宗门：<span id="ui-sect">---</span>
  境界：<span id="ui-realm">---</span>
  灵气：<span id="ui-aura">0</span> (<span id="ui-aura-rate">+0</span>/s)
  灵石：<span id="ui-stones">0</span>
  悟性：<span id="ui-comp">0</span>
  突破进度：<span id="ui-progress">0%</span>

  ─── 弟子 ───
<span id="ui-disciples">---</span>

  ─── 命令 ───</pre>
      <div style="padding: 0 20px 20px;">
        <input id="cmd-input" type="text" placeholder="输入命令..." style="
          width: 100%;
          box-sizing: border-box;
          background: #0d0d1a;
          color: #c8b88b;
          border: 1px solid #333;
          padding: 8px 12px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          outline: none;
        " />
        <div id="mud-log" style="
          color: #8a8a6a;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 10px;
          max-height: 300px;
          overflow-y: auto;
        "></div>
      </div>
    </div>`;

  // 绑定命令输入（只绑定一次，不会因 render 丢失）
  const input = document.getElementById('cmd-input') as HTMLInputElement;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleCommand(input.value.trim());
      input.value = '';
    }
  });
}

// ===== 增量更新（每 tick 调用） =====

function updateDisplay(): void {
  const worldMonths = state.inGameWorldTime * 12;
  const year = Math.floor(worldMonths / 12);
  const month = Math.floor(worldMonths % 12) + 1;

  setText('ui-time', `第${year}年 ${month}月`);
  setText('ui-sect', `${state.sect.name}（${state.sect.level}级）`);
  setText('ui-realm', getRealmDisplayName(state.realm, state.subRealm));
  setText('ui-aura', state.aura.toFixed(0));
  setText('ui-aura-rate', `+${engine.getCurrentAuraRate().toFixed(1)}`);
  setText('ui-stones', state.spiritStones.toFixed(1));
  setText('ui-comp', state.comprehension.toFixed(1));
  setText('ui-progress', getProgressText());

  // 弟子列表
  const discipleText = state.disciples
    .map(d => `  ${d.name} (${d.starRating}★ ${d.personalityName}) — ${d.behavior}`)
    .join('\n');
  setText('ui-disciples', discipleText);
}

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ===== MUD 日志系统 =====

const mudLogs: string[] = [];
const MUD_LOG_MAX = 200;

function addMudLog(text: string): void {
  mudLogs.push(text);
  if (mudLogs.length > MUD_LOG_MAX) {
    mudLogs.splice(0, mudLogs.length - MUD_LOG_MAX);
  }
  updateLogDisplay();
}

function updateLogDisplay(): void {
  const logEl = document.getElementById('mud-log');
  if (!logEl) return;
  logEl.innerHTML = mudLogs.map(l => `<div>${l}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;
}

// ===== 命令系统 =====

function handleCommand(cmd: string): void {
  if (!cmd) {
    addMudLog(`<span style="color:#666">[系统] 未知指令，输入 'help' 查看可用命令</span>`);
    return;
  }

  // CR-02: HTML 转义防 XSS
  const safeCmd = escapeHtml(cmd);

  switch (cmd.toLowerCase()) {
    case 'help':
      addMudLog('<span style="color:#8bc8c8">[系统] 可用命令：</span>');
      addMudLog('  status  — 查看宗主状态');
      addMudLog('  bt      — 尝试突破');
      addMudLog('  clear   — 清空日志');
      addMudLog('  reset   — 清除存档（重新开始）');
      addMudLog('  help    — 显示帮助');
      break;

    case 'status':
      addMudLog(`<span style="color:#c8b88b">[状态] 境界：${escapeHtml(getRealmDisplayName(state.realm, state.subRealm))}</span>`);
      addMudLog(`  灵气：${state.aura.toFixed(0)} | 灵石：${state.spiritStones.toFixed(1)} | 悟性：${state.comprehension.toFixed(1)}`);
      addMudLog(`  弟子数：${state.disciples.length} | 突破次数：${state.lifetimeStats.breakthroughTotal}`);
      // Phase B-α: 材料 + 丹药
      {
        const matEntries = Object.entries(state.materialPouch).filter(([, v]) => v > 0);
        if (matEntries.length > 0) {
          addMudLog(`  材料：${matEntries.map(([k, v]) => `${SEED_BY_ID.get(k)?.name ?? k}×${v}`).join('、')}`);
        }
        if (state.pills.length > 0) {
          addMudLog(`  丹药：${state.pills.map(p => `${RECIPE_BY_ID.get(p.defId)?.name ?? p.defId}(${p.quality})×${p.count}`).join('、')}`);
        }
        addMudLog(`  上缴丹药：${state.sect.tributePills}`);
      }
      // Phase C: 新增状态显示
      {
        const density = getSpiritVeinDensity(state.realm, state.subRealm);
        addMudLog(`  灵脉密度：×${density.toFixed(1)}`);

        if (state.cultivateBoostBuff) {
          addMudLog(`  修速丹：加速中 (剩余 ${state.cultivateBoostBuff.remainingSec.toFixed(0)}s)`);
        }

        const btBuff = state.breakthroughBuff;
        if (btBuff.pillsConsumed.length > 0) {
          addMudLog(`  破镜丹：${btBuff.pillsConsumed.length}/3 颗，加成 +${(btBuff.totalBonus * 100).toFixed(0)}%`);
        }

        addMudLog(`  丹药消费总数：${state.lifetimeStats.pillsConsumed} | 突破失败：${state.lifetimeStats.breakthroughFailed}`);
      }
      break;

    case 'bt':
    case 'breakthrough': {
      // Phase C: 概率突破模型
      const btLog = engine.tryBreakthrough();

      // 输出回灵丹补差额日志
      for (const hl of btLog.healLogs) {
        addMudLog(`<span style="color:#8ac8c8">[系统] ${escapeHtml(hl.detail)}</span>`);
      }

      if (btLog.success) {
        addMudLog(`<span style="color:#ffd700">[突破] ${escapeHtml(btLog.message)}</span>`);
      } else {
        addMudLog(`<span style="color:#ff6b6b">[突破] ${escapeHtml(btLog.message)}</span>`);
      }
      break;
    }

    case 'clear':
      mudLogs.length = 0;
      updateLogDisplay();
      break;

    case 'ai':
      addMudLog('<span style="color:#8bc8c8">[系统] 正在尝试连接 AI 后端...</span>');
      if ('tryConnect' in llmAdapter) {
        (llmAdapter as any).tryConnect().then((ok: boolean) => {
          if (ok) {
            addMudLog('<span style="color:#50fa7b">[系统] ✓ AI 后端连接成功！弟子台词切换到 AI 模式</span>');
          } else {
            addMudLog('<span style="color:#ff6b6b">[系统] ✗ AI 后端不可用，请先运行 npm run ai</span>');
          }
        });
      }
      break;

    case 'reset':
      engine.stop();
      resetting = true;  // 阻止 beforeunload 重新保存
      localStorage.removeItem('7game-lite-save');
      addMudLog('<span style="color:#ff6b6b">[系统] 存档已清除，正在重新加载...</span>');
      setTimeout(() => window.location.reload(), 300);
      break;

    default:
      addMudLog(`<span style="color:#666">[系统] 未知指令 '${safeCmd}'，输入 'help' 查看可用命令</span>`);
  }
}

// ===== 引擎回调 =====

let tickCounter = 0;

engine.setOnTick(() => {
  tickCounter++;
  // 每 5 秒输出一次修炼日志
  if (tickCounter % 5 === 0) {
    const rate = engine.getCurrentAuraRate();
    const wm = state.inGameWorldTime * 12;
    const y = Math.floor(wm / 12);
    const m = Math.floor(wm % 12) + 1;
    addMudLog(`<span style="color:#6a8a6a">[仙历${y}年${m}月] 宗主打坐入定，灵气 +${(rate * 5).toFixed(1)}</span>`);
  }
  updateDisplay();
});

// Phase C: 突破回调改为接收 BreakthroughLog
engine.setOnBreakthrough((_s, btLog) => {
  if (btLog.success) {
    const r = btLog.result;
    addMudLog(`<span style="color:#ffd700">═══ 突破！境界提升至${escapeHtml(getRealmDisplayName(r.newRealm, r.newSubRealm))} ═══</span>`);
  } else {
    addMudLog(`<span style="color:#ff6b6b">═══ 突破失败！${escapeHtml(btLog.message)} ═══</span>`);
  }
});

// Phase B-α: 灵田 tick 日志
engine.setOnFarmTickLog((logs) => {
  for (const log of logs) {
    addMudLog(`<span style="color:#8ac88a">${escapeHtml(log)}</span>`);
  }
});

// Phase C: 系统日志（自动服丹/突破自动触发）
engine.setOnSystemLog((logs) => {
  for (const log of logs) {
    addMudLog(`<span style="color:#8ac8c8">${escapeHtml(log)}</span>`);
  }
});

// Phase D: 弟子间对话
engine.setOnDialogue((exchange: DialogueExchange) => {
  // 构建上下文：谁触发了什么事件
  const triggerDisciple = state.disciples.find(d => d.id === exchange.triggerId);
  const triggerName = triggerDisciple ? escapeHtml(triggerDisciple.name) : '???';
  const eventDesc = escapeHtml(exchange.trigger.eventDescription);

  // 先显示触发上下文
  addMudLog(`<span style="color:#6a8a6a">── ${triggerName}${eventDesc.includes(triggerName) ? eventDesc.replace(triggerName, '') : '：' + eventDesc} ──</span>`);

  // 再显示对话内容
  for (const round of exchange.rounds) {
    const speaker = state.disciples.find(d => d.id === round.speakerId);
    const speakerName = speaker ? escapeHtml(speaker.name) : '???';
    if (round.round === 1) {
      addMudLog(`<span style="color:#b8d4a8">  ${speakerName}对${triggerName}说："${escapeHtml(round.line)}"</span>`);
    } else {
      addMudLog(`<span style="color:#a8c4d4">  ${triggerName}回应："${escapeHtml(round.line)}"</span>`);
    }
  }
});

engine.setOnDiscipleBehaviorChange((events) => {
  for (const evt of events) {
    const name = escapeHtml(evt.disciple.name);

    // Phase B-α: 输出 FARM/ALCHEMY 引擎日志
    if (evt.farmAlchemyLogs) {
      for (const log of evt.farmAlchemyLogs) {
        addMudLog(`<span style="color:#c8a858">${escapeHtml(log)}</span>`);
      }
    }

    if (evt.auraReward > 0) {
      // 行为结束事件
      addMudLog(`<span style="color:#8a9a8a">[${name}] 结束${getBehaviorLabel(evt.oldBehavior)}，灵气 +${evt.auraReward.toFixed(1)}</span>`);
    }
    if (evt.newBehavior !== 'idle' && evt.auraReward === 0) {
      // 行为开始事件 → 输出行为日志 + 异步请求 AI 台词
      addMudLog(`<span style="color:#7a8aba">[${name}] 开始${getBehaviorLabel(evt.newBehavior)}</span>`);

      // 确保弟子有 AISoulContext
      if (!state.aiContexts[evt.disciple.id]) {
        state.aiContexts[evt.disciple.id] = createDefaultAISoulContext();
      }
      const ctx = state.aiContexts[evt.disciple.id];

      // 异步 AI 台词（不阻塞引擎 tick）
      const req: GenerateRequest = {
        discipleId: evt.disciple.id,
        discipleName: evt.disciple.name,
        personality: evt.disciple.personality,
        personalityName: evt.disciple.personalityName,
        behavior: evt.newBehavior,
        shortTermMemory: ctx.shortTermMemory,
        starRating: evt.disciple.starRating,
        realm: evt.disciple.realm,
        subRealm: evt.disciple.subRealm,
      };

      llmAdapter.generateLine(req).then((line) => {
        addMudLog(`<span style="color:#d4a574">[${name}] "${escapeHtml(line)}"</span>`);
        // 记录到短期记忆 (FIFO, max 10)
        addShortTermMemory(ctx, `${getBehaviorLabel(evt.newBehavior)}: ${line}`);
        ctx.lastInferenceTime = Date.now();
      });
    }
  }
});

// ===== 启动 =====

initUI();
updateDisplay();
engine.start();

addMudLog('<span style="color:#8bc8c8">[系统] 七道修仙 MUD 灵智版 v0.2.0 已启动</span>');
addMudLog('<span style="color:#8bc8c8">[系统] 引擎 Tick 循环已激活，修炼进行中...</span>');
addMudLog('<span style="color:#8bc8c8">[系统] 输入 \'help\' 查看可用命令</span>');

// 自动尝试连接 AI 后端（静默，成功才显示）
if ('tryConnect' in llmAdapter) {
  (llmAdapter as any).tryConnect().then((ok: boolean) => {
    if (ok) {
      addMudLog('<span style="color:#50fa7b">[系统] ✓ AI 后端已连接，弟子台词切换到 AI 模式</span>');
    }
  });
}

// 自动存档
let resetting = false;
setInterval(() => { if (!resetting) saveGame(state); }, AUTO_SAVE_INTERVAL);
window.addEventListener('beforeunload', () => { if (!resetting) saveGame(state); });

console.log('[7game-lite] 启动完成', state);
