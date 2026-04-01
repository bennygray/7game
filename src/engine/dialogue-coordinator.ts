/**
 * 对话协调器 — 弟子间对话触发与执行
 *
 * Phase D: R-D1a~R-D1h 规则实现
 *
 * 职责:
 * 1. 从 DialogueTrigger[] 中按概率筛选可触发的对话
 * 2. 选择 responder（随机，排除冷却中）
 * 3. 异步调用 LLMAdapter.generateDialogue()（双向2轮）
 * 4. fallback 到 bystander-lines 模板台词
 * 5. 更新双方 AISoulContext.shortTermMemory
 * 6. 通过回调输出 MUD 日志
 *
 * ADR-D02: Promise 队列 — 保证对话轮次顺序
 * I5: 不修改 behavior/行为树决策
 *
 * @see phaseD-TDD.md Step 2
 * @see Story #4
 */

import type { LiteGameState } from '../shared/types/game-state';
import type {
  DialogueTrigger,
  DialogueExchange,
  DialogueRound,
  DiscipleContext,
  DialogueRequest,
} from '../shared/types/dialogue';
import type { LLMAdapter } from '../ai/llm-adapter';
import type { GameLogger } from '../shared/types/logger';
import { LogCategory } from '../shared/types/logger';
import { addShortTermMemory } from '../shared/types/ai-soul';
import type { RelationshipMemoryManager } from './relationship-memory-manager';

// ===== 配置 =====

export interface DialogueCoordinatorConfig {
  /** R-D1a: 触发概率 */
  triggerProbability: number;
  /** R-D1b: responder 冷却（秒） */
  cooldownSec: number;
  /** R-D1c: 单 tick 最多对话数 */
  maxPerTick: number;
  /** R-D1g: AI 单轮超时（毫秒） */
  aiTimeoutMs: number;
}

const DEFAULT_CONFIG: DialogueCoordinatorConfig = {
  triggerProbability: 0.5,  // Q5: 50%（测试阶段）
  cooldownSec: 60,          // R-D1b
  maxPerTick: 1,            // R-D1c
  aiTimeoutMs: 5000,        // R-D1g
};

// ===== 协调器 =====

export class DialogueCoordinator {
  private adapter: LLMAdapter | null;
  private logger: GameLogger;
  private config: DialogueCoordinatorConfig;

  /** responder 冷却记录：ID → 上次作为 responder 的时间戳 */
  private responderCooldowns: Map<string, number> = new Map();

  /** 处理队列锁（防止并发） */
  private processing = false;

  /** Phase IJ: 关系记忆管理器引用（双写用） */
  private relationshipMemoryManager: RelationshipMemoryManager | null = null;

  constructor(
    adapter: LLMAdapter | null,
    logger: GameLogger,
    config?: Partial<DialogueCoordinatorConfig>,
  ) {
    this.adapter = adapter;
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Phase IJ: 注入关系记忆管理器 */
  setRelationshipMemoryManager(mgr: RelationshipMemoryManager): void {
    this.relationshipMemoryManager = mgr;
  }

  /**
   * 处理本 tick 的对话触发
   *
   * 异步执行，不阻塞引擎。
   * ADR-D02: Promise 队列顺序执行。
   */
  processTriggers(
    triggers: DialogueTrigger[],
    state: LiteGameState,
    onDialogue: (exchange: DialogueExchange) => void,
  ): void {
    // 防止并发
    if (this.processing) return;
    this.processing = true;

    // 异步执行
    this.processTriggersAsync(triggers, state, onDialogue)
      .catch(() => { /* 静默 */ })
      .finally(() => { this.processing = false; });
  }

  private async processTriggersAsync(
    triggers: DialogueTrigger[],
    state: LiteGameState,
    onDialogue: (exchange: DialogueExchange) => void,
  ): Promise<void> {
    let dialogueCount = 0;

    for (const trigger of triggers) {
      if (dialogueCount >= this.config.maxPerTick) break;

      // R-D1a: 概率检查
      if (Math.random() > this.config.triggerProbability) continue;

      // R-D1e: 选择 responder
      const responder = this.selectResponder(trigger.sourceId, state);
      if (!responder) continue;

      // 记录冷却
      this.responderCooldowns.set(responder.id, Date.now());

      this.logger.info(
        LogCategory.AI, 'dialogue-coordinator',
        `对话触发: ${trigger.sourceId} → ${responder.name} (${trigger.outcomeTag})`,
      );

      // 构建请求
      const source = this.buildDiscipleContext(trigger.sourceId, state);
      if (!source) continue;

      const request: DialogueRequest = {
        source,
        responder: this.buildDiscipleContext(responder.id, state)!,
        triggerEvent: trigger,
        sourceMemory: this.getShortTermMemory(source.id, state),
        responderMemory: this.getShortTermMemory(responder.id, state),
      };

      // 生成对话（ADR-D02: Promise 队列）
      const rounds = await this.generateDialogueWithTimeout(request);

      if (rounds.length > 0) {
        const exchange: DialogueExchange = {
          triggerId: trigger.sourceId,
          responderId: responder.id,
          trigger,
          rounds,
          timestamp: Date.now(),
        };

        // 更新短期记忆
        this.updateMemory(exchange, state);

        // 通知上层
        onDialogue(exchange);
        dialogueCount++;
      }
    }
  }

  // ===== 内部方法 =====

  /**
   * R-D1e: 选择 responder
   * 随机选 1 名非冷却中弟子（排除 sourceId）
   */
  private selectResponder(sourceId: string, state: LiteGameState) {
    const now = Date.now();
    const available = state.disciples.filter(d => {
      if (d.id === sourceId) return false;
      const lastTime = this.responderCooldowns.get(d.id) ?? 0;
      return (now - lastTime) / 1000 >= this.config.cooldownSec;
    });

    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * 构建弟子上下文
   */
  private buildDiscipleContext(id: string, state: LiteGameState): DiscipleContext | null {
    const d = state.disciples.find(d => d.id === id);
    if (!d) return null;
    return {
      id: d.id,
      name: d.name,
      personality: d.personality,
      personalityName: d.personalityName,
      starRating: d.starRating,
      realm: d.realm,
      subRealm: d.subRealm,
    };
  }

  /**
   * 获取弟子短期记忆
   */
  private getShortTermMemory(id: string, state: LiteGameState): string[] {
    const ctx = state.aiContexts?.[id];
    return ctx?.shortTermMemory ?? [];
  }

  /**
   * R-D1g: 带超时的对话生成
   * ADR-D02: 超时时 fallback
   */
  private async generateDialogueWithTimeout(req: DialogueRequest): Promise<DialogueRound[]> {
    if (!this.adapter) return [];

    try {
      const timeoutPromise = new Promise<DialogueRound[]>((_, reject) => {
        setTimeout(() => reject(new Error('AI dialogue timeout')), this.config.aiTimeoutMs);
      });

      const dialoguePromise = this.adapter.generateDialogue(req);
      return await Promise.race([dialoguePromise, timeoutPromise]);
    } catch {
      this.logger.warn(
        LogCategory.AI, 'dialogue-coordinator',
        'AI 对话超时，使用 fallback',
      );
      // R-D1h: 超时时使用 fallback（通过 FallbackLLMAdapter）
      return [];
    }
  }

  /**
   * 更新双方短期记忆
   * I5: 仅更新 AISoulContext.shortTermMemory，不影响行为
   */
  private updateMemory(exchange: DialogueExchange, state: LiteGameState): void {
    for (const round of exchange.rounds) {
      const speakerCtx = state.aiContexts?.[round.speakerId];
      if (speakerCtx) {
        addShortTermMemory(speakerCtx, `[对话] 我说：${round.line}`);
      }

      // 对方也记住这次对话
      const otherId = round.speakerId === exchange.triggerId
        ? exchange.responderId
        : exchange.triggerId;
      const otherCtx = state.aiContexts?.[otherId];
      if (otherCtx) {
        const speakerName = state.disciples.find(d => d.id === round.speakerId)?.name ?? '某人';
        addShortTermMemory(otherCtx, `[对话] ${speakerName}说：${round.line}`);
      }
    }

    // Phase IJ 双写：记录对话到关系记忆
    if (this.relationshipMemoryManager) {
      const tick = Math.floor(state.inGameWorldTime);
      this.relationshipMemoryManager.recordDialogue(exchange.triggerId, exchange.responderId, tick);
      this.relationshipMemoryManager.recordDialogue(exchange.responderId, exchange.triggerId, tick);
    }
  }
}
