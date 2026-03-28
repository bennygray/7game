/**
 * Phase D DialogueCoordinator 诊断
 * 直接测试对话协调器是否能正确生成 fallback 对话
 */

import { createDefaultLiteGameState } from '../src/shared/types/game-state';
import { DiscipleBehavior } from '../src/shared/types/game-state';
import { DialogueCoordinator } from '../src/engine/dialogue-coordinator';
import { createFallbackAdapter } from '../src/ai/llm-adapter';
import { createLogger } from '../src/engine/game-logger';
import type { DialogueTrigger, DialogueExchange } from '../src/shared/types/dialogue';

const state = createDefaultLiteGameState();
const logger = createLogger();
const adapter = createFallbackAdapter();

// 100% 概率、无冷却，确保测试条件最大化
const coordinator = new DialogueCoordinator(adapter, logger, {
  triggerProbability: 1.0,
  cooldownSec: 0,
  maxPerTick: 5,
  aiTimeoutMs: 5000,
});

// 确保 aiContexts 存在
for (const d of state.disciples) {
  if (!state.aiContexts) (state as any).aiContexts = {};
  if (!state.aiContexts[d.id]) {
    state.aiContexts[d.id] = { shortTermMemory: [], lastInferenceTime: 0 };
  }
}

const triggers: DialogueTrigger[] = [
  {
    type: 'behavior-end',
    sourceId: state.disciples[0].id,
    eventDescription: `${state.disciples[0].name}结束了一段修炼，似有所悟`,
    behavior: DiscipleBehavior.MEDITATE,
    outcomeTag: 'meditation',
  },
  {
    type: 'behavior-end',
    sourceId: state.disciples[1].id,
    eventDescription: `${state.disciples[1].name}炼丹成功，丹药出炉`,
    behavior: DiscipleBehavior.ALCHEMY,
    outcomeTag: 'alchemy-success',
  },
];

console.log('=== DialogueCoordinator 诊断 ===\n');
console.log(`弟子数量: ${state.disciples.length}`);
console.log(`Trigger 数量: ${triggers.length}`);
console.log(`配置: 概率=100%, 冷却=0s\n`);

let dialogueCount = 0;

coordinator.processTriggers(triggers, state, (exchange: DialogueExchange) => {
  dialogueCount++;
  console.log(`✅ 对话 #${dialogueCount}:`);
  console.log(`  触发者: ${exchange.triggerId}`);
  console.log(`  回应者: ${exchange.responderId}`);
  console.log(`  轮次数: ${exchange.rounds.length}`);
  for (const round of exchange.rounds) {
    const name = state.disciples.find(d => d.id === round.speakerId)?.name ?? '???';
    console.log(`  [轮${round.round}] ${name}: "${round.line}"`);
  }
});

// 等待异步结果
setTimeout(() => {
  console.log(`\n--- 结果 ---`);
  console.log(`对话生成数: ${dialogueCount}`);
  if (dialogueCount === 0) {
    console.error('❌ DialogueCoordinator 未生成任何对话！');
    process.exit(1);
  } else {
    console.log('✅ DialogueCoordinator 工作正常');
  }
}, 3000);
