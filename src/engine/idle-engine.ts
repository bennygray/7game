/**
 * 修炼引擎 — 核心 Tick 循环
 *
 * Phase 4 重构: 硬编码 tick() → TickPipeline + TickHandler 模式。
 * Phase D: +对话系统集成 +Logger 集成 +Intent 模式
 * Phase E: +灵魂系统（EventBus + soul-tick + soul-event）
 * Phase F0-α: +碰面系统（encounter-tick）
 * Phase G: +异步 AI 缓冲区（async-ai-buffer + ai-result-apply）
 *
 * Pipeline 执行顺序（16 个 Handler）：
 *   100 BUFF_COUNTDOWN  — boost-countdown: 修速丹 buff 倒计时
 *   200 PRE_PRODUCTION   — breakthrough-aid: 自动服破镜丹
 *   200 PRE_PRODUCTION   — auto-breakthrough: 自动突破检测+执行
 *   300 RESOURCE_PROD    — core-production: 灵气/悟性/灵石/时间/统计（内联）
 *   500 SYSTEM_TICK      — farm-tick: 灵田生长推进
 *   500 SYSTEM_TICK(10)  — soul-tick: 关系衰减 + 道德漂移 + 后天特性（Phase E）
 *   500 SYSTEM_TICK(20)  — goal-tick: 目标生命周期（Phase J-Goal）
 *   600 DISCIPLE_AI      — disciple-tick: 弟子行为树 tick（Phase D Intent 模式）
 *   610 ENCOUNTER        — encounter-tick: 碰面检定引擎（Phase F0-α）
 *   612 CAUSAL_EVAL      — causal-tick: 因果规则扫描（Phase I-alpha）
 *   612 CAUSAL_EVAL(5)   — social-tick: 社交邀约扫描（Phase I-beta）
 *   625 SOUL_EVAL        — soul-event: 灵魂事件评估（Phase E）
 *   625 SOUL_EVAL(5)     — ai-result-apply: AI 结果异步应用（Phase G）
 *   650 DIALOGUE         — dialogue-tick: 弟子间对话触发（Phase D）
 *   700 POST_PRODUCTION  — cultivate-boost: 自动服修速丹
 *
 * CR-A1: 突破冷却防竞态
 * CR-B3: 修速丹自动服用移到灵气产出之后（1 tick 空窗）
 *
 * TD-002: core-production 内联，未来专项重构时拆出
 *
 * @see arch/pipeline.md
 * @see ADR-004: Tick Pipeline Handler 模式
 */

import type { LiteGameState } from '../shared/types/game-state';
import {
  calculateAuraRate,
  calculateComprehensionRate,
  calculateSpiritStoneRate,
} from '../shared/formulas/idle-formulas';
import { getSpiritVeinDensity } from '../shared/data/realm-table';
import type { DiscipleBehaviorEvent } from './behavior-tree';
import { getBoostMultiplier } from './pill-consumer';
import {
  BREAKTHROUGH_COOLDOWN_TICKS,
  type BreakthroughLog,
} from './breakthrough-engine';
import { executeBreakthrough } from './breakthrough-engine';
import { TickPipeline, TickPhase, type TickHandler, type TickContext, type BreakthroughCallback } from './tick-pipeline';
import { LogLevel, type LogEntry, type GameLogger } from '../shared/types/logger';
import type { DialogueExchange } from '../shared/types/dialogue';
import { DialogueCoordinator } from './dialogue-coordinator';
import { EventBus } from './event-bus';
import type { DiscipleEmotionState } from '../shared/types/soul';
import type { ActiveRuling, RulingOption, RulingResolution } from '../shared/types/ruling';
import { findRulingOptions } from '../shared/data/ruling-registry';
import { WORLD_EVENT_REGISTRY } from '../shared/data/world-event-registry';

// Handler 导入
import { boostCountdownHandler } from './handlers/boost-countdown.handler';
import { breakthroughAidHandler } from './handlers/breakthrough-aid.handler';
import { autoBreakthroughHandler } from './handlers/auto-breakthrough.handler';
import { farmTickHandler } from './handlers/farm-tick.handler';
import { discipleTickHandler } from './handlers/disciple-tick.handler';
import { cultivateBoostHandler } from './handlers/cultivate-boost.handler';
import { dialogueTickHandler } from './handlers/dialogue-tick.handler';
import { soulTickHandler } from './handlers/soul-tick.handler';
import { soulEventHandler } from './handlers/soul-event.handler';
import { encounterTickHandler } from './handlers/encounter-tick.handler';
import { worldEventTickHandler } from './handlers/world-event-tick.handler';
import { aiResultApplyHandler } from './handlers/ai-result-apply.handler';
import { AsyncAIBuffer } from './async-ai-buffer';
import { createDefaultAISoulContext, addShortTermMemory } from '../shared/types/ai-soul';
import { RelationshipMemoryManager } from './relationship-memory-manager';
import { NarrativeSnippetBuilder } from '../ai/narrative-snippet-builder';
import { GoalManager } from './goal-manager';
import { goalTickHandler } from './handlers/goal-tick.handler';
import { CausalRuleEvaluator } from './causal-evaluator';
import { causalTickHandler } from './handlers/causal-tick.handler';
import { SocialEngine } from './social-engine';
import { socialTickHandler } from './handlers/social-tick.handler';

/** Tick 回调：引擎每次 tick 后通知上层 */
export type TickCallback = (state: LiteGameState, deltaS: number) => void;

// BreakthroughCallback 已移至 tick-pipeline.ts（避免循环依赖）
// 重新导出以保持向后兼容
export type { BreakthroughCallback } from './tick-pipeline';

/** 弟子行为变更回调 */
export type DiscipleBehaviorChangeCallback = (events: DiscipleBehaviorEvent[]) => void;

/** 灵田/炼丹 tick 日志回调 */
export type FarmTickLogCallback = (logs: string[]) => void;

/** 丹药/系统日志回调 (Phase C) */
export type SystemLogCallback = (logs: string[]) => void;

/** Phase D: 弟子间对话回调 */
export type DialogueCallback = (exchange: DialogueExchange) => void;

/** Phase H-β: 统一日志管线回调 — 每 tick 传递本轮 LogEntry[] */
export type MudLogCallback = (entries: LogEntry[]) => void;

/** Phase H-γ: 裁决窗口创建回调 */
export type RulingCreatedCallback = (ruling: ActiveRuling) => void;

/** Phase H-γ: 裁决结算回调 */
export type RulingResolvedCallback = (resolution: RulingResolution) => void;

export class IdleEngine {
  private state: LiteGameState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number;
  private onTick: TickCallback | null = null;
  private onBreakthrough: BreakthroughCallback | null = null;
  private onDiscipleBehaviorChange: DiscipleBehaviorChangeCallback | null = null;
  private onFarmTickLog: FarmTickLogCallback | null = null;
  private onSystemLog: SystemLogCallback | null = null;
  private onDialogue: DialogueCallback | null = null;
  private onMudLog: MudLogCallback | null = null;
  private onRulingCreated: RulingCreatedCallback | null = null;
  private onRulingResolved: RulingResolvedCallback | null = null;

  /** Phase H-γ: 活跃裁决（运行时，不持久化，ADR-Hγ-02） */
  private activeRuling: ActiveRuling | null = null;

  /** CR-A1: 突破冷却计数器，>0 时不允许突破 */
  private breakthroughCooldown: number = 0;

  /** Phase D: Logger 引用 */
  private logger: GameLogger;

  /** Phase D: 对话协调器 */
  private dialogueCoordinator: DialogueCoordinator;

  /** Tick Pipeline（Phase 4 重构） */
  private pipeline: TickPipeline;

  /** Phase F: 弟子情绪运行时状态 (ADR-F-01) */
  private emotionMap: Map<string, DiscipleEmotionState> = new Map();

  /** Phase G: 异步 AI 缓冲区 */
  private asyncAIBuffer = new AsyncAIBuffer();

  /** Phase IJ: 关系记忆管理器（运行时，不持久化） */
  private relationshipMemoryManager = new RelationshipMemoryManager();

  /** Phase IJ v3.0: 叙事片段构建器 */
  private narrativeSnippetBuilder = new NarrativeSnippetBuilder();

  /** Phase J-Goal: 目标管理器 */
  private goalManager = new GoalManager();

  /** Phase I-alpha: 因果规则评估器 */
  private causalEvaluator = new CausalRuleEvaluator();

  /** Phase I-beta: 社交引擎 */
  private socialEngine = new SocialEngine();

  /** Tick 间隔（毫秒） */
  static readonly TICK_INTERVAL_MS = 1000;

  /** 仙历推进速率：降低 10× 以增加沉浸感（CR-08） */
  static readonly WORLD_TIME_PER_SECOND = 0.5 / 30 / 10;

  constructor(state: LiteGameState, logger: GameLogger, llmAdapter?: import('../ai/llm-adapter').LLMAdapter) {
    this.state = state;
    this.lastTickTime = Date.now();
    this.logger = logger;

    // Phase D: 初始化对话协调器
    this.dialogueCoordinator = new DialogueCoordinator(llmAdapter ?? null, logger);
    // Phase IJ: 注入关系记忆管理器
    this.dialogueCoordinator.setRelationshipMemoryManager(this.relationshipMemoryManager);

    // 初始化 Pipeline 并注册所有 Handler（13 个）
    this.pipeline = new TickPipeline();
    this.pipeline.register(boostCountdownHandler);
    this.pipeline.register(breakthroughAidHandler);
    this.pipeline.register(autoBreakthroughHandler);
    this.pipeline.register(this.createCoreProductionHandler());
    this.pipeline.register(farmTickHandler);
    this.pipeline.register(soulTickHandler);     // Phase E: 500:10 内心周期更新
    this.pipeline.register(discipleTickHandler);
    this.pipeline.register(worldEventTickHandler); // Phase F0-β: 605 世界事件
    this.pipeline.register(encounterTickHandler); // Phase F0-α: 610 碰面检定
    this.pipeline.register(causalTickHandler);   // Phase I-alpha: 612 因果规则扫描
    this.pipeline.register(socialTickHandler);   // Phase I-beta: 612:5 社交邀约扫描
    this.pipeline.register(soulEventHandler);    // Phase E: 625 灵魂事件评估
    this.pipeline.register(aiResultApplyHandler); // Phase G: 625:5 AI 结果异步应用
    this.pipeline.register(dialogueTickHandler);
    this.pipeline.register(cultivateBoostHandler);
    this.pipeline.register(goalTickHandler);      // Phase J-Goal: 500:20 目标生命周期
  }

  /** 注册 tick 回调 */
  setOnTick(cb: TickCallback): void {
    this.onTick = cb;
  }

  /** 注册突破回调（Phase C: 概率模型） */
  setOnBreakthrough(cb: BreakthroughCallback): void {
    this.onBreakthrough = cb;
  }

  /** 注册弟子行为变更回调 */
  setOnDiscipleBehaviorChange(cb: DiscipleBehaviorChangeCallback): void {
    this.onDiscipleBehaviorChange = cb;
  }

  /** 注册灵田 tick 日志回调 */
  setOnFarmTickLog(cb: FarmTickLogCallback): void {
    this.onFarmTickLog = cb;
  }

  /** 注册系统日志回调（Phase C: 丹药/突破自动日志） */
  setOnSystemLog(cb: SystemLogCallback): void {
    this.onSystemLog = cb;
  }

  /** Phase D: 注册弟子间对话回调 */
  setOnDialogue(cb: DialogueCallback): void {
    this.onDialogue = cb;
  }

  /** Phase H-β: 注册统一日志管线回调 */
  setOnMudLog(cb: MudLogCallback): void {
    this.onMudLog = cb;
  }

  /** Phase H-γ: 注册裁决创建回调 */
  setOnRulingCreated(cb: RulingCreatedCallback): void {
    this.onRulingCreated = cb;
  }

  /** Phase H-γ: 注册裁决结算回调 */
  setOnRulingResolved(cb: RulingResolvedCallback): void {
    this.onRulingResolved = cb;
  }

  /** Phase H-γ: 获取当前活跃裁决（只读副本） */
  getActiveRuling(): ActiveRuling | null {
    return this.activeRuling ? { ...this.activeRuling, options: [...this.activeRuling.options] } : null;
  }

  /**
   * Phase H-γ: 玩家裁决 — 选择选项 N
   * @param optionIndex - 选项序号（1-based）
   * @returns RulingResolution 如果成功，null 如果无效
   */
  resolveRuling(optionIndex: number): RulingResolution | null {
    if (!this.activeRuling || this.activeRuling.resolved) return null;
    const option = this.activeRuling.options.find((o) => o.index === optionIndex);
    if (!option) return null;

    this.activeRuling.resolved = true;
    this.applyEthosDrift(option);

    const resolution: RulingResolution = {
      option,
      timedOut: false,
      timeoutText: null,
      newEthos: this.state.sect.ethos,
      newDiscipline: this.state.sect.discipline,
    };

    this.activeRuling = null;
    this.onRulingResolved?.(resolution);
    return resolution;
  }

  /**
   * 查询弟子当前情绪状态（只读副本）
   * @param discipleId - 弟子 ID
   * @returns 情绪状态副本，或 undefined（无情绪记录）
   */
  getEmotionState(discipleId: string): DiscipleEmotionState | undefined {
    const state = this.emotionMap.get(discipleId);
    return state ? { ...state } : undefined;
  }

  /** 启动引擎 */
  start(): void {
    if (this.intervalId !== null) return;
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => this.tick(), IdleEngine.TICK_INTERVAL_MS);
    console.log('[IdleEngine] 引擎已启动');
  }

  /** 停止引擎 */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[IdleEngine] 引擎已停止');
    }
  }

  /** 是否正在运行 */
  get running(): boolean {
    return this.intervalId !== null;
  }

  /**
   * 核心 tick — 每秒执行
   *
   * Phase 4 重构：委托 TickPipeline 顺序执行所有 Handler，
   * 然后分发回调通知上层。
   */
  private tick(): void {
    const now = Date.now();
    const deltaMs = now - this.lastTickTime;
    const deltaS = deltaMs / 1000;
    this.lastTickTime = now;

    // 构建 TickContext
    const ctx: TickContext = {
      state: this.state,
      deltaS,
      systemLogs: [],
      farmLogs: [],
      discipleEvents: [],
      dialogueTriggers: [],
      logger: this.logger,
      onBreakthrough: this.onBreakthrough,
      breakthroughCooldown: this.breakthroughCooldown,
      eventBus: new EventBus(),   // Phase E: 每 tick 创建新实例，生命周期与 tick 绑定
      emotionMap: this.emotionMap, // Phase F: 弟子情绪运行时状态 (ADR-F-01)
      asyncAIBuffer: this.asyncAIBuffer, // Phase G: 异步 AI 缓冲区
      relationshipMemoryManager: this.relationshipMemoryManager, // Phase IJ: 关系记忆
      narrativeSnippetBuilder: this.narrativeSnippetBuilder, // Phase IJ v3.0: 叙事片段
      goalManager: this.goalManager, // Phase J-Goal: 目标管理器
      causalEvaluator: this.causalEvaluator, // Phase I-alpha: 因果规则评估器
      socialEngine: this.socialEngine, // Phase I-beta: 社交引擎
    };

    // 执行 Pipeline（14 个 Handler 按 phase+order 顺序执行）
    this.pipeline.execute(ctx);

    // 回写引擎级状态（TD-001: 通过 ctx 共享的 breakthroughCooldown）
    this.breakthroughCooldown = ctx.breakthroughCooldown;

    // 分发回调通知上层
    if (ctx.farmLogs.length > 0) {
      this.onFarmTickLog?.(ctx.farmLogs);
    }
    if (ctx.discipleEvents.length > 0) {
      this.onDiscipleBehaviorChange?.(ctx.discipleEvents);
    }
    if (ctx.systemLogs.length > 0) {
      this.onSystemLog?.(ctx.systemLogs);
    }

    // Phase D: 处理对话触发（异步，不阻塞 tick）
    if (ctx.dialogueTriggers.length > 0) {
      this.dialogueCoordinator.processTriggers(
        ctx.dialogueTriggers,
        this.state,
        (exchange) => this.onDialogue?.(exchange),
      );
    }

    // Phase H-β S0: 统一日志管线 — flush logger 并分发到 MUD
    const logEntries = ctx.logger.flush();
    const mudEntries = logEntries.filter(e => e.level > LogLevel.DEBUG);
    if (mudEntries.length > 0) {
      this.onMudLog?.(mudEntries);
    }

    // Phase H-γ: 裁决超时检查
    this.checkRulingTimeout();

    // Phase H-γ: STORM 事件 → 创建裁决窗口
    if (ctx.pendingStormEvent && !this.activeRuling) {
      this.createRuling(ctx.pendingStormEvent);
    }

    // 最终通知上层 tick 完成
    this.onTick?.(this.state, deltaS);
  }

  /**
   * 尝试突破（玩家手动触发 bt 命令）
   * Phase C: 改为概率模型，委托 breakthrough-engine
   * CR-A1: 手动突破也设置冷却，防竞态
   */
  tryBreakthrough(): BreakthroughLog {
    const log = executeBreakthrough(this.state);
    this.breakthroughCooldown = BREAKTHROUGH_COOLDOWN_TICKS;
    return log;
  }

  /** 获取当前状态引用 */
  getState(): LiteGameState {
    return this.state;
  }

  /** 获取当前灵气速率（含灵脉密度 + 修速丹） */
  getCurrentAuraRate(): number {
    const density = getSpiritVeinDensity(this.state.realm, this.state.subRealm);
    const boostMul = getBoostMultiplier(this.state);
    return calculateAuraRate(
      this.state.realm, this.state.subRealm, this.state.daoFoundation,
      density, boostMul,
    );
  }

  /**
   * 获取弟子 AI 上下文（不存在则自动创建）
   * Phase X Review P1-04: AI 上下文管理由 Engine 层负责，UI 层不得直接写 state
   */
  getOrCreateAIContext(discipleId: string): import('../shared/types/ai-soul').AISoulContext {
    if (!this.state.aiContexts[discipleId]) {
      this.state.aiContexts[discipleId] = createDefaultAISoulContext();
    }
    return this.state.aiContexts[discipleId];
  }

  /**
   * 记录 AI 台词到弟子短期记忆
   * Phase X Review P1-04: AI 上下文写入由 Engine 层封装
   */
  recordAIMemory(discipleId: string, memory: string): void {
    const ctx = this.getOrCreateAIContext(discipleId);
    addShortTermMemory(ctx, memory);
    ctx.lastInferenceTime = Date.now();
  }

  /** Phase IJ: 获取关系记忆管理器引用（debug 命令用） */
  getRelationshipMemoryManager(): RelationshipMemoryManager {
    return this.relationshipMemoryManager;
  }

  // ===== Phase H-γ: 裁决管理私有方法 =====

  /** 超时 fallback 文案池 */
  private static readonly TIMEOUT_TEXTS = [
    '掌门闭关未出，此事由长老代为处置。',
    '掌门未及时裁决，事态自行平息。',
    '无人做出决断，弟子们只得各自应对。',
  ];

  /** 裁决窗口时长（毫秒），实时 5 分钟 */
  private static readonly RULING_TIMEOUT_MS = 300_000;

  /**
   * 创建裁决窗口（STORM 事件触发时调用）
   */
  private createRuling(payload: import('../shared/types/world-event').WorldEventPayload): void {
    if (this.activeRuling) return;

    // 查找裁决选项
    const defs = findRulingOptions(payload.eventDefId, payload.polarity);
    if (defs.length === 0) return;

    // 查找事件名称
    const eventDef = WORLD_EVENT_REGISTRY.find((d) => d.id === payload.eventDefId);
    const eventName = eventDef?.name ?? '异事';

    // 渲染事件文案
    const involvedNames = payload.involvedDiscipleIds
      .map((id) => this.state.disciples.find((d) => d.id === id)?.name ?? id);
    let eventText = '宗门发生了一件异事。';
    if (eventDef && eventDef.templates.length > 0) {
      const template = eventDef.templates[Math.floor(Math.random() * eventDef.templates.length)];
      eventText = template.replace(/\{D\}/g, involvedNames[0] ?? '').replace(/\{D2\}/g, involvedNames[1] ?? '');
    }

    // 构建选项
    const options: RulingOption[] = defs.map((def, i) => ({
      index: i + 1,
      label: def.label,
      description: def.description,
      ethosShift: def.ethosShift,
      disciplineShift: def.disciplineShift,
      mudText: def.mudText,
    }));

    const now = Date.now();
    this.activeRuling = {
      eventPayload: payload,
      eventName,
      eventText,
      options,
      createdAt: now,
      expiresAt: now + IdleEngine.RULING_TIMEOUT_MS,
      resolved: false,
    };

    this.onRulingCreated?.(this.activeRuling);
  }

  /**
   * 检查裁决超时（每 tick 调用）
   */
  private checkRulingTimeout(): void {
    if (!this.activeRuling || this.activeRuling.resolved) return;
    if (Date.now() < this.activeRuling.expiresAt) return;

    // 超时：等概率随机选择
    const options = this.activeRuling.options;
    const chosen = options[Math.floor(Math.random() * options.length)];

    this.activeRuling.resolved = true;
    this.applyEthosDrift(chosen);

    const timeoutText = IdleEngine.TIMEOUT_TEXTS[
      Math.floor(Math.random() * IdleEngine.TIMEOUT_TEXTS.length)
    ];

    const resolution: RulingResolution = {
      option: chosen,
      timedOut: true,
      timeoutText,
      newEthos: this.state.sect.ethos,
      newDiscipline: this.state.sect.discipline,
    };

    this.activeRuling = null;
    this.onRulingResolved?.(resolution);
  }

  /**
   * 执行道风漂移（PRD R-05）
   */
  private applyEthosDrift(option: RulingOption): void {
    this.state.sect.ethos = Math.max(-100, Math.min(100,
      this.state.sect.ethos + option.ethosShift,
    ));
    this.state.sect.discipline = Math.max(-100, Math.min(100,
      this.state.sect.discipline + option.disciplineShift,
    ));
  }

  /**
   * 创建核心资源产出 Handler（内联）
   *
   * TD-002: 灵气/悟性/灵石/时间/统计 6 步紧密耦合，
   * 暂保留在 idle-engine.ts 内部，未来专项重构时拆出。
   *
   * 等价于原 idle-engine.ts L158-190 的逻辑。
   */
  private createCoreProductionHandler(): TickHandler {
    return {
      name: 'core-production',
      phase: TickPhase.RESOURCE_PROD,
      order: 0,

      execute: (ctx: TickContext): void => {
        const { state, deltaS } = ctx;

        // 1. 灵气产出（含灵脉密度 + 修速丹加速）
        const density = getSpiritVeinDensity(state.realm, state.subRealm);
        const boostMul = getBoostMultiplier(state);
        const auraRate = calculateAuraRate(
          state.realm, state.subRealm, state.daoFoundation,
          density, boostMul,
        );
        const auraGain = auraRate * deltaS;
        state.aura += auraGain;

        // 2. 悟性产出（不含灵脉/修速丹 — Fix B）
        const compRate = calculateComprehensionRate(
          state.realm, state.subRealm, state.daoFoundation
        );
        state.comprehension += compRate * deltaS;

        // 3. 灵石副产（不含灵脉/修速丹 — Fix B）
        const stoneRate = calculateSpiritStoneRate(
          state.realm, state.subRealm, state.daoFoundation
        );
        state.spiritStones += stoneRate * deltaS;

        // 4. 仙历推进
        state.inGameWorldTime += deltaS * IdleEngine.WORLD_TIME_PER_SECOND;

        // 5. 更新统计
        state.lifetimeStats.totalAuraEarned += auraGain;
        if (state.subRealm > state.lifetimeStats.highestSubRealm) {
          state.lifetimeStats.highestSubRealm = state.subRealm;
        }

        // 6. 更新在线时间
        state.lastOnlineTime = Date.now();
      },
    };
  }
}
