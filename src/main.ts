/**
 * 7game-lite 应用入口
 */

import { loadGame, saveGame } from './engine/save-manager';

// 加载或创建游戏状态
const state = loadGame();

// 自动存档间隔（30 秒）
const AUTO_SAVE_INTERVAL = 30_000;

// 渲染初始状态
function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const discipleList = state.disciples
    .map(d => `  ${d.name} (${d.starRating}★ ${d.personalityName}) — ${d.behavior}`)
    .join('\n');

  app.innerHTML = `
    <pre style="
      font-family: 'Courier New', monospace;
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

[仙历${state.inGameWorldTime}年]

  宗门：${state.sect.name}（${state.sect.level}级）
  境界：炼气${state.subRealm}层
  灵气：${state.aura.toFixed(1)}
  灵石：${state.spiritStones}
  悟性：${state.comprehension.toFixed(1)}

  ─── 弟子 ───
${discipleList}

  [系统] 七道修仙 MUD 灵智版 v0.1.0 已启动。
  [系统] 引擎 Tick 循环待实现（Story #2）。
  [系统] 输入 'help' 查看可用命令。
    </pre>
  `;
}

render();

// 自动存档
setInterval(() => {
  saveGame(state);
}, AUTO_SAVE_INTERVAL);

// 页面关闭前存档
window.addEventListener('beforeunload', () => {
  saveGame(state);
});

console.log('[7game-lite] 启动完成', state);
