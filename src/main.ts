/**
 * 7game-lite 应用入口
 *
 * Story #1: 脚手架 + 存档
 * Story #2: 修炼引擎 Tick 循环
 */

import { loadGame, saveGame } from './engine/save-manager';
import { IdleEngine } from './engine/idle-engine';
import { getRealmAuraCost, getMaxSubRealm } from './shared/formulas/realm-formulas';

// ===== 初始化 =====

const state = loadGame();
const engine = new IdleEngine(state);

const AUTO_SAVE_INTERVAL = 30_000;

// ===== 渲染 =====

function getRealmName(realm: number, subRealm: number): string {
  if (realm === 1) return `炼气${subRealm}层`;
  if (realm === 2) {
    const names = ['初期', '中期', '后期', '圆满'];
    return `筑基${names[subRealm - 1] ?? ''}`;
  }
  return '未知';
}

function getNextBreakthroughCost(): number {
  const maxSub = getMaxSubRealm(state.realm);
  if (state.subRealm >= maxSub) {
    return Infinity; // 需天劫
  }
  return getRealmAuraCost(state.realm, state.subRealm + 1);
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const auraRate = engine.getCurrentAuraRate();
  const nextCost = getNextBreakthroughCost();
  const progress = nextCost === Infinity
    ? '需天劫'
    : `${Math.min(100, (state.aura / nextCost * 100)).toFixed(1)}%`;

  const discipleList = state.disciples
    .map(d => `  ${d.name} (${d.starRating}★ ${d.personalityName}) — ${d.behavior}`)
    .join('\n');

  const worldYear = Math.floor(state.inGameWorldTime * 12); // 月换算
  const worldMonth = Math.floor((state.inGameWorldTime * 12 % 12)) + 1;

  app.innerHTML = `
    <pre id="mud-screen" style="
      font-family: 'Courier New', 'SimHei', monospace;
      color: #c8b88b;
      background: #1a1a2e;
      padding: 20px;
      min-height: 100vh;
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
    ">
╔══════════════════════════════════════════╗
║     七 道 修 仙 — MUD 灵智版            ║
╚══════════════════════════════════════════╝

  [仙历第${worldYear}年 ${worldMonth}月]

  ─── 宗主状态 ───
  宗门：${state.sect.name}（${state.sect.level}级）
  境界：${getRealmName(state.realm, state.subRealm)}
  灵气：${state.aura.toFixed(0)} (+${auraRate.toFixed(1)}/s)
  灵石：${state.spiritStones.toFixed(1)}
  悟性：${state.comprehension.toFixed(1)}
  突破进度：${progress}

  ─── 弟子 ───
${discipleList}

  ─── 命令 ───</pre>
  <div style="
    background: #1a1a2e;
    padding: 0 20px 20px;
    margin: 0;
  ">
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
  </div>`;

  // 绑定命令输入
  const input = document.getElementById('cmd-input') as HTMLInputElement;
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleCommand(input.value.trim());
      input.value = '';
    }
  });
}

// ===== 命令系统 =====

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
  logEl.innerHTML = mudLogs
    .map(l => `<div>${l}</div>`)
    .join('');
  logEl.scrollTop = logEl.scrollHeight;
}

function handleCommand(cmd: string): void {
  if (!cmd) {
    addMudLog('<span style="color:#666">[系统] 未知指令，输入 \'help\' 查看可用命令</span>');
    return;
  }

  switch (cmd.toLowerCase()) {
    case 'help':
      addMudLog('<span style="color:#8bc8c8">[系统] 可用命令：</span>');
      addMudLog('  status  — 查看宗主状态');
      addMudLog('  bt      — 尝试突破');
      addMudLog('  help    — 显示帮助');
      break;

    case 'status':
      addMudLog(`<span style="color:#c8b88b">[状态] 境界：${getRealmName(state.realm, state.subRealm)}</span>`);
      addMudLog(`  灵气：${state.aura.toFixed(0)} | 灵石：${state.spiritStones.toFixed(1)} | 悟性：${state.comprehension.toFixed(1)}`);
      addMudLog(`  弟子数：${state.disciples.length} | 突破次数：${state.lifetimeStats.breakthroughTotal}`);
      break;

    case 'bt':
    case 'breakthrough': {
      const result = engine.tryBreakthrough();
      if (result.success) {
        addMudLog(`<span style="color:#ffd700">[突破] ${result.message}</span>`);
      } else {
        addMudLog(`<span style="color:#ff6b6b">[突破] ${result.message}</span>`);
      }
      break;
    }

    default:
      addMudLog(`<span style="color:#666">[系统] 未知指令 '${cmd}'，输入 'help' 查看可用命令</span>`);
  }
}

// ===== 引擎回调 =====

let tickCounter = 0;

engine.setOnTick((_s, _dt) => {
  tickCounter++;
  // 每 5 秒输出一次修炼日志
  if (tickCounter % 5 === 0) {
    const rate = engine.getCurrentAuraRate();
    addMudLog(`<span style="color:#6a8a6a">[修炼] 宗主打坐入定，灵气 +${(rate * 5).toFixed(1)}</span>`);
  }
  render();
});

engine.setOnBreakthrough((_s, result) => {
  addMudLog(`<span style="color:#ffd700">═══ 突破！境界提升至${getRealmName(result.newRealm, result.newSubRealm)} ═══</span>`);
});

// ===== 启动 =====

render();
engine.start();
addMudLog('<span style="color:#8bc8c8">[系统] 七道修仙 MUD 灵智版 v0.1.0 已启动</span>');
addMudLog('<span style="color:#8bc8c8">[系统] 引擎 Tick 循环已激活，修炼进行中...</span>');
addMudLog(`<span style="color:#8bc8c8">[系统] 输入 'help' 查看可用命令</span>`);

// 自动存档
setInterval(() => saveGame(state), AUTO_SAVE_INTERVAL);
window.addEventListener('beforeunload', () => saveGame(state));

console.log('[7game-lite] 启动完成', state);
