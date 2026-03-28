/**
 * Phase D 全流水线诊断（含 DialogueCoordinator）
 * 
 * 模拟完整的 tick 执行路径：
 *   planIntent → executeIntents → DialogueCoordinator → onDialogue
 * 
 * 通过 GameLogger 输出完整日志链
 */

import { planIntent } from '../src/engine/behavior-tree';
import { executeIntents } from '../src/engine/intent-executor';
import { createDefaultLiteGameState } from '../src/shared/types/game-state';
import { DiscipleBehavior } from '../src/shared/types/game-state';
import { DialogueCoordinator } from '../src/engine/dialogue-coordinator';
import { createFallbackAdapter } from '../src/ai/llm-adapter';
import { createLogger } from '../src/engine/game-logger';
import { createDefaultAISoulContext } from '../src/shared/types/ai-soul';
import type { DialogueExchange } from '../src/shared/types/dialogue';

// ===== 初始化 =====
const state = createDefaultLiteGameState();
const logger = createLogger();
const adapter = createFallbackAdapter();

// 高概率测试：100% 触发 + 0 冷却
const coordinator = new DialogueCoordinator(adapter, logger, {
  triggerProbability: 1.0,
  cooldownSec: 0,
  maxPerTick: 3,
  aiTimeoutMs: 5000,
});

// 初始化 aiContexts
for (const d of state.disciples) {
  if (!state.aiContexts) (state as any).aiContexts = {};
  state.aiContexts[d.id] = createDefaultAISoulContext();
}

const DELTA_S = 1;
const TOTAL_TICKS = 60;

let totalBehaviorChanges = 0;
let totalTriggers = 0;
let totalDialogues = 0;

const dialogueResults: DialogueExchange[] = [];

console.log('╔══════════════════════════════════════════╗');
console.log('║  Phase D 全流水线诊断 (60 ticks)         ║');
console.log('╚══════════════════════════════════════════╝\n');

// ===== 初始状态 =====
console.log('【初始弟子状态】');
for (const d of state.disciples) {
  console.log(`  ${d.name} | ${d.behavior} | timer=${d.behaviorTimer.toFixed(1)}s | stamina=${d.stamina.toFixed(0)}`);
}

// ===== 模拟 tick =====
for (let tick = 1; tick <= TOTAL_TICKS; tick++) {
  // Step 1: planIntent (纯函数)
  const allIntents = [];
  for (const d of state.disciples) {
    allIntents.push(...planIntent(d, DELTA_S, state));
  }

  // Step 2: executeIntents (副作用)
  const result = executeIntents(allIntents, state);

  // Step 3: 输出行为事件
  for (const evt of result.events) {
    totalBehaviorChanges++;
    const tag = evt.auraReward > 0 ? '结束' : '开始';
    console.log(`  [tick ${String(tick).padStart(3)}] ${evt.disciple.name} ${tag} ${evt.oldBehavior}→${evt.newBehavior}` +
      (evt.auraReward > 0 ? ` (+${evt.auraReward.toFixed(1)} aura)` : '') +
      (evt.farmAlchemyLogs ? ` | ${evt.farmAlchemyLogs[0]}` : ''));
  }

  // Step 4: 对话触发
  totalTriggers += result.triggers.length;
  for (const trigger of result.triggers) {
    console.log(`  [tick ${String(tick).padStart(3)}] 🗨️ TRIGGER: ${trigger.outcomeTag} | "${trigger.eventDescription}"`);
  }

  // Step 5: DialogueCoordinator 处理
  if (result.triggers.length > 0) {
    coordinator.processTriggers(result.triggers, state, (exchange: DialogueExchange) => {
      totalDialogues++;
      dialogueResults.push(exchange);
      const triggerName = state.disciples.find(d => d.id === exchange.triggerId)?.name ?? '???';
      const responderName = state.disciples.find(d => d.id === exchange.responderId)?.name ?? '???';
      console.log(`  [tick ${String(tick).padStart(3)}] 💬 DIALOGUE: ${triggerName} ← ${responderName}`);
      for (const round of exchange.rounds) {
        const speaker = state.disciples.find(d => d.id === round.speakerId)?.name ?? '???';
        console.log(`           [轮${round.round}] ${speaker}: "${round.line}"`);
      }
    });
  }
}

// 等 3s 让异步对话完成
setTimeout(() => {
  // ===== 最终状态 =====
  console.log('\n【最终弟子状态】');
  for (const d of state.disciples) {
    const mem = state.aiContexts[d.id]?.shortTermMemory ?? [];
    console.log(`  ${d.name} | ${d.behavior} | timer=${d.behaviorTimer.toFixed(1)}s | stamina=${d.stamina.toFixed(0)} | aura=${d.aura.toFixed(1)} | 记忆=${mem.length}条`);
  }

  // ===== 日志系统输出 =====
  const logs = logger.flush();
  console.log(`\n【Logger 缓冲区】${logs.length} 条日志`);
  for (const entry of logs.slice(0, 20)) {
    console.log(`  [${entry.level === 1 ? 'INFO' : entry.level === 2 ? 'WARN' : 'DEBUG'}][${entry.category}] ${entry.message}`);
  }

  // ===== 汇总 =====
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  行为切换: ${String(totalBehaviorChanges).padStart(3)} 次                       ║`);
  console.log(`║  触发生成: ${String(totalTriggers).padStart(3)} 次                       ║`);
  console.log(`║  对话输出: ${String(totalDialogues).padStart(3)} 次                       ║`);
  console.log(`║  Logger:   ${String(logs.length).padStart(3)} 条                       ║`);
  console.log('╚══════════════════════════════════════════╝\n');

  // 诊断判定
  const issues: string[] = [];
  if (totalBehaviorChanges === 0) issues.push('❌ 行为系统: 无切换（behaviorTimer 未递减）');
  if (totalTriggers === 0) issues.push('❌ 触发系统: 无 DialogueTrigger 生成');
  if (totalDialogues === 0) issues.push('❌ 对话系统: DialogueCoordinator 未生成任何对话');

  if (issues.length > 0) {
    console.log('诊断失败:');
    issues.forEach(i => console.log(`  ${i}`));
    process.exit(1);
  } else {
    console.log('✅ 全流水线诊断通过: 行为切换 → 触发生成 → 对话输出 完整链路正常');
  }
}, 3000);
