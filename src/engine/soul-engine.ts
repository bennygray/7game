/**
 * 灵魂评估引擎 — 核心三层流水线
 *
 * 流程:
 *   [EventBus.drain()] → for each event → for each disciple:
 *     → role = (disciple === actor) ? 'self' : 'observer'
 *     → candidates = buildCandidatePool(event.type, role)
 *     → IF (AI available): AI 评估 → correctDelta → clamp
 *       ELSE: fallback 规则引擎
 *     → applyDeltas(state, disciple, result)
 *     → updateTags(state, disciple)
 *     → emitSoulLog(disciple, result)
 *
 * I1: 引擎仲裁 — correctDeltaDirection + clampDelta 在 AI 输出后强制执行
 * I3: 规则验证 — AI 不直接写 GameState，soul-engine 作为中介
 * I5: 变化硬上限 — clampDelta([-5, +5])
 *
 * ADR-E01: EventBus 发布-订阅，soul-engine 被 soul-event.handler 调用
 *
 * @see phaseE-TDD.md Step 3.3
 * @see Story #3, #4
 */

import type { LiteGameState, LiteDiscipleState, RelationshipEdge } from '../shared/types/game-state';
import type {
  SoulEvaluationResult, EmotionTag, SoulRole,
  RelationshipTag, DiscipleEmotionState,
} from '../shared/types/soul';
import { RELATIONSHIP_TAG_THRESHOLDS, EMOTION_LABEL } from '../shared/types/soul';
import type { SoulEvent } from './event-bus';
import type { RelationshipMemoryManager } from './relationship-memory-manager';
import type { NarrativeSnippetBuilder } from '../ai/narrative-snippet-builder';
import { EVENT_THRESHOLD } from '../shared/types/relationship-memory';
import {
  buildCandidatePool,
  correctDeltaDirection,
  clampDelta,
  fallbackSelectEmotion,
  fallbackComputeDelta,
  fallbackGenerateThought,
} from '../shared/data/emotion-pool';
import { getTraitDef, ACQUIRED_TRAITS } from '../shared/data/trait-registry';
import { EMOTION_DECAY_TICKS } from '../shared/data/emotion-behavior-modifiers';
import type { GameLogger } from '../shared/types/logger';
import { LogCategory } from '../shared/types/logger';
import type { GoalManager } from './goal-manager';
import { getRealmAuraCost } from '../shared/formulas/realm-formulas';
import { GOAL_LABEL, GOAL_MUD_TEXT } from '../shared/data/goal-data';
import {
  shouldAssignMentor,
  shouldAssignGrudge,
  shouldAssignAdmirer,
} from '../shared/formulas/relationship-formulas';

// ===== 常量 =====

/** 关系衰减系数（每 tick-5min 执行一次）— R-E15 */
const AFFINITY_DECAY_RATE = 0.98;

/** 关系衰减停止阈值（|affinity| <= 此值时停止衰减）— R-E15 */
const AFFINITY_DECAY_THRESHOLD = 5;

/** soul-tick 衰减间隔（秒，每 5 分钟一次） */
const DECAY_INTERVAL_SEC = 300;

/** 道德自然漂移系数（向初始道德方向每 tick 漂移）— R-E14 */
const MORAL_DRIFT_RATE = 0.001;

/** AI 评估超时（毫秒）— R-D1g */
const AI_TIMEOUT_MS = 5000;

// ===== 工具：获取关系边 =====

/** 获取 A→B 的关系边（可能不存在） */
function getEdge(state: LiteGameState, sourceId: string, targetId: string): RelationshipEdge | undefined {
  return state.relationships.find(r => r.sourceId === sourceId && r.targetId === targetId);
}

// ===== 特性情绪权重 =====

/**
 * 根据弟子特性调整候选情绪权重
 * 返回修正后的候选列表（可含重复以增加权重）
 */
function applyTraitWeights(
  candidates: EmotionTag[],
  disciple: LiteDiscipleState,
): EmotionTag[] {
  // 先收集需要移除的情绪（负权重）
  const suppressedEmotions = new Set<EmotionTag>();
  for (const trait of disciple.traits) {
    const def = getTraitDef(trait.defId);
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'emotion-weight' && effect.value < 0) {
        suppressedEmotions.add(effect.target as EmotionTag);
      }
    }
  }

  // 过滤掉被压制的情绪，但确保至少保留 1 个候选
  let filtered = candidates.filter(e => !suppressedEmotions.has(e));
  if (filtered.length === 0) filtered = [...candidates]; // 全部被压制时回退

  // 再增加正权重情绪的出现次数
  const weighted = [...filtered];
  for (const trait of disciple.traits) {
    const def = getTraitDef(trait.defId);
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type === 'emotion-weight' && effect.value > 0) {
        const emotion = effect.target as EmotionTag;
        if (filtered.includes(emotion)) {
          const extraCount = Math.round(effect.value * 3);
          for (let i = 0; i < extraCount; i++) {
            weighted.push(emotion);
          }
        }
      }
    }
  }
  return weighted;
}

// ===== Fallback 评估 =====

/**
 * 规则引擎 fallback 评估（无 AI 时）
 *
 * Story #4 AC2
 */
export function fallbackEvaluate(
  event: SoulEvent,
  subject: LiteDiscipleState,
  role: SoulRole,
  _state: LiteGameState,
  actorName: string,
): SoulEvaluationResult {
  const weightedCandidates = applyTraitWeights(buildCandidatePool(event.type, role), subject);

  // Phase I-alpha: admirer 正面情绪加权
  const hasAdmirer = _state.relationships.some(
    r => r.sourceId === subject.id && r.targetId === event.actorId && r.tags.includes('admirer'),
  );
  if (hasAdmirer) {
    const positiveEmotions: EmotionTag[] = ['joy', 'gratitude', 'admiration', 'pride', 'relief'];
    for (const e of positiveEmotions) {
      if (weightedCandidates.includes(e)) {
        weightedCandidates.push(e); // 增加 1 次出现 ≈ +0.2 概率
      }
    }
  }

  const emotion = weightedCandidates.length > 0
    ? weightedCandidates[Math.floor(Math.random() * weightedCandidates.length)]
    : fallbackSelectEmotion(event.type, role);

  const intensity: 1 | 2 | 3 = 1;

  // 关系 delta（仅针对 actor）
  const relationshipDeltas: SoulEvaluationResult['relationshipDeltas'] = [];
  if (role === 'observer') {
    const rawDelta = fallbackComputeDelta(event.type, role);
    const corrected = correctDeltaDirection(rawDelta, role, event.type);
    const clamped = clampDelta(corrected);
    if (clamped !== 0) {
      relationshipDeltas.push({
        targetId: event.actorId,
        delta: clamped,
        reason: `规则引擎：${event.type} 事件`,
      });
    }
  }

  const innerThought = fallbackGenerateThought(event.type, role, subject.name, actorName);

  return { emotion, intensity, relationshipDeltas, innerThought };
}

// ===== 应用评估结果 =====

/**
 * 将评估结果写入 GameState
 * - 更新关系边 affinity + lastInteraction
 * - 更新道德（自我事件微幅漂移）
 *
 * Story #4 AC3
 */
export function applyEvaluationResult(
  state: LiteGameState,
  subject: LiteDiscipleState,
  result: SoulEvaluationResult,
  role: SoulRole,
): void {
  const now = Date.now();

  for (const { targetId, delta } of result.relationshipDeltas) {
    // clampDelta 已在评估阶段执行，这里只更新关系边
    const edge = getEdge(state, subject.id, targetId);
    if (edge) {
      edge.affinity = Math.max(-100, Math.min(100, edge.affinity + delta));
      edge.lastInteraction = now;
    }
  }

  // 道德自我微调（正面事件轻微向善，负面事件保持不变——规则层行为，不影响 AI 自主性）
  if (role === 'self') {
    // 仅做极微弱漂移，不覆盖 AI 决策
    // 实际道德变化由 soul-tick.handler 的自然漂移处理
  }
}

/**
 * 更新关系标签 — 统一管理所有 5 种标签（INV-5）
 *
 * Phase I-alpha: 新增 mentor/grudge/admirer 自动管理。
 * 不再"保留手动标签"——所有标签均由此函数统一计算。
 *
 * Story #4 AC4, Phase I-alpha S2.6
 */
export function updateRelationshipTags(
  state: LiteGameState,
  subjectId: string,
  relationshipMemoryManager?: RelationshipMemoryManager,
): void {
  for (const edge of state.relationships) {
    if (edge.sourceId !== subjectId) continue;

    const tags: RelationshipTag[] = [];

    // 基础标签（现有逻辑）
    if (edge.affinity >= RELATIONSHIP_TAG_THRESHOLDS.friend) tags.push('friend');
    if (edge.affinity <= RELATIONSHIP_TAG_THRESHOLDS.rival) tags.push('rival');

    // 高级标签（Phase I-alpha）
    const source = state.disciples.find(d => d.id === edge.sourceId);
    const target = state.disciples.find(d => d.id === edge.targetId);
    const memory = relationshipMemoryManager?.getMemory(edge.sourceId, edge.targetId);

    if (source && target) {
      if (shouldAssignMentor(edge.affinity, source.starRating, target.starRating)) {
        tags.push('mentor');
      }
      if (shouldAssignGrudge(edge.affinity, memory)) {
        tags.push('grudge');
      }
      if (shouldAssignAdmirer(edge.affinity, target, memory)) {
        tags.push('admirer');
      }
    }

    edge.tags = tags;
  }
}

// ===== 周期性更新（soul-tick.handler 调用） =====

/**
 * 关系衰减 — 每 5 分钟执行
 *
 * R-E15: |affinity| <= DECAY_THRESHOLD 时停止
 * Story #4 AC6
 */
export function decayRelationships(state: LiteGameState): void {
  for (const edge of state.relationships) {
    if (Math.abs(edge.affinity) <= AFFINITY_DECAY_THRESHOLD) continue;
    // 向 0 方向衰减
    if (edge.affinity > 0) {
      edge.affinity = Math.max(AFFINITY_DECAY_THRESHOLD, edge.affinity * AFFINITY_DECAY_RATE);
    } else {
      edge.affinity = Math.min(-AFFINITY_DECAY_THRESHOLD, edge.affinity * AFFINITY_DECAY_RATE);
    }
  }
}

/**
 * 道德自然漂移 — 向初始道德方向缓慢回归（R-E14）
 * 每 tick 执行，漂移量极小
 */
export function driftMoral(state: LiteGameState): void {
  for (const disciple of state.disciples) {
    const { moral, initialMoral } = disciple;
    // 向初始值方向回归
    const geGap = initialMoral.goodEvil - moral.goodEvil;
    const lcGap = initialMoral.lawChaos - moral.lawChaos;
    if (Math.abs(geGap) > 0.1) {
      moral.goodEvil += geGap * MORAL_DRIFT_RATE;
    }
    if (Math.abs(lcGap) > 0.1) {
      moral.lawChaos += lcGap * MORAL_DRIFT_RATE;
    }
  }
}

// ===== 后天特性检测（soul-tick.handler 调用） =====

/** 行为计数缓存（用于后天特性触发条件，内存中，不持久化） */
const behaviorCountCache = new Map<string, Map<string, number>>();

/**
 * 增加弟子行为计数（由 intent-executor 在 end-behavior 时调用，当前简化为事件类型累计）
 */
export function incrementBehaviorCount(discipleId: string, eventType: string): void {
  if (!behaviorCountCache.has(discipleId)) {
    behaviorCountCache.set(discipleId, new Map());
  }
  const counts = behaviorCountCache.get(discipleId)!;
  counts.set(eventType, (counts.get(eventType) ?? 0) + 1);
}

/**
 * 检测并触发后天特性（soul-tick.handler 调用）
 * 若条件满足且概率命中，添加后天特性
 */
export function checkAcquiredTraits(state: LiteGameState): void {
  // ACQUIRED_TRAITS 已通过顶部 static import 引入
  for (const disciple of state.disciples) {
    const counts = behaviorCountCache.get(disciple.id);
    if (!counts) continue;

    for (const traitDef of ACQUIRED_TRAITS) {
      if (!traitDef.trigger) continue;
      // 跳过已有特性
      if (disciple.traits.some(t => t.defId === traitDef.id)) continue;

      // 解析条件：格式 "event-type:count>=N"
      const match = traitDef.trigger.condition.match(/^(.+):count>=(\d+)$/);
      if (!match) continue;
      const [, eventType, threshStr] = match;
      const threshold = parseInt(threshStr, 10);
      const count = counts.get(eventType) ?? 0;

      if (count >= threshold && Math.random() < traitDef.trigger.probability) {
        disciple.traits.push({ defId: traitDef.id, acquiredAt: Date.now() });
      }
    }
  }
}

// ===== 衰减累积计数器 =====

/** 衰减累积（非整数秒计时），由 soul-tick 维护 */
let decayAccumulatorSec = 0;

/**
 * 周期性 soul-tick 主入口（每 tick 调用）
 * - 累积时间
 * - 每 DECAY_INTERVAL_SEC 执行一次衰减
 * - 每 tick 道德漂移
 */
export function soulTickUpdate(
  state: LiteGameState,
  deltaS: number,
  emotionMap?: Map<string, DiscipleEmotionState>,
): void {
  // 道德自然漂移（每 tick 执行）
  driftMoral(state);

  // 关系衰减（每 5 分钟）
  decayAccumulatorSec += deltaS;
  if (decayAccumulatorSec >= DECAY_INTERVAL_SEC) {
    decayRelationships(state);
    decayAccumulatorSec -= DECAY_INTERVAL_SEC;
  }

  // 后天特性检测（每 tick）
  checkAcquiredTraits(state);

  // Phase F: 情绪衰减
  if (emotionMap) {
    decayEmotions(emotionMap);
  }
}

// ===== AI 评估流水线（soul-event.handler 调用） =====

/**
 * 处理单个 SoulEvent — 灵魂评估流水线
 *
 * 当前阶段（Phase E fallback）为 **同步** 执行。
 * ⚠️ 未来 AI 路径接入时，需改回 async 并在 handler 层处理竞态：
 *   - 方案 A: handler 标记为 async-aware，pipeline 支持 await
 *   - 方案 B: AI 回调写入独立 buffer，下一 tick 合并到 state
 *
 * I1/I3: AI 输出后强制 correctDeltaDirection + clampDelta
 * I2: AI 不可用时 fallback 规则引擎
 *
 * Story #4 AC1~AC8
 */
export function processSoulEvent(
  event: SoulEvent,
  state: LiteGameState,
  logger: GameLogger,
  onSoulLog?: (msg: string) => void,
  emotionMap?: Map<string, DiscipleEmotionState>,
  relationshipMemoryManager?: RelationshipMemoryManager,
  narrativeSnippetBuilder?: NarrativeSnippetBuilder,
  goalManager?: GoalManager,
): void {
  const actor = state.disciples.find(d => d.id === event.actorId);
  if (!actor) return;

  // 为每个弟子生成灵魂反应（actor=self, 其他=observer）
  for (const disciple of state.disciples) {
    const role: SoulRole = disciple.id === actor.id ? 'self' : 'observer';

    let result: SoulEvaluationResult;

    // 使用 fallback（Phase E 初期，AI 集成在 soul-prompt-builder 中）
    result = fallbackEvaluate(event, disciple, role, state, actor.name);

    // 后处理：方向修正 + 夹值（I1/I5）
    result = {
      ...result,
      relationshipDeltas: result.relationshipDeltas.map(rd => ({
        ...rd,
        delta: clampDelta(correctDeltaDirection(rd.delta, role, event.type)),
      })),
    };

    // 写入 GameState
    applyEvaluationResult(state, disciple, result, role);
    updateRelationshipTags(state, disciple.id, relationshipMemoryManager);

    // Phase IJ 双写：记录关键事件到关系记忆 + 同步 edge + 触发 snippet rebuild
    if (relationshipMemoryManager) {
      for (const rd of result.relationshipDeltas) {
        if (Math.abs(rd.delta) >= EVENT_THRESHOLD) {
          relationshipMemoryManager.recordEvent(disciple.id, rd.targetId, {
            content: rd.reason.substring(0, 30),
            tick: Math.floor(state.inGameWorldTime),
            affinityDelta: rd.delta,
          });
          // 触发 narrative snippet 重建
          if (narrativeSnippetBuilder) {
            const targetDisc = state.disciples.find(d => d.id === rd.targetId);
            if (targetDisc) {
              const mem = relationshipMemoryManager.getMemory(disciple.id, rd.targetId);
              if (mem) {
                narrativeSnippetBuilder.triggerAIPregenerate(disciple.name, targetDisc.name, mem);
                // 同步更新规则拼接 snippet 缓存
                const snippet = narrativeSnippetBuilder.buildByRules(disciple.name, targetDisc.name, mem);
                relationshipMemoryManager.updateNarrativeSnippet(disciple.id, rd.targetId, snippet);
              }
            }
          }
        }
        // 同步 edge 到关系记忆
        const edge = state.relationships.find(
          e => e.sourceId === disciple.id && e.targetId === rd.targetId
        );
        if (edge) {
          relationshipMemoryManager.syncFromEdge(edge);
        }
      }
    }

    // 记录行为计数（用于后天特性触发）
    if (role === 'self') {
      incrementBehaviorCount(disciple.id, event.type);
    }

    // 生成 MUD 日志（Story #4 AC5）
    const emotionLabel = EMOTION_LABEL[result.emotion] ?? result.emotion;
    const logLine = `[灵魂] ${disciple.name}感到 ${emotionLabel}(${result.intensity})：「${result.innerThought}」`;

    logger.info(LogCategory.DISCIPLE, 'soul-engine', logLine, {
      discipleId: disciple.id,
      eventType: event.type,
      emotion: result.emotion,
      intensity: result.intensity,
    });

    if (onSoulLog) {
      onSoulLog(logLine);
    }

    // Phase F: 记录情绪到 emotionMap
    if (emotionMap) {
      recordEmotion(emotionMap, disciple.id, result);
    }

    // Phase J-Goal: 事件驱动目标触发（ADR-JG-01，仅 self 角色）
    if (goalManager && role === 'self') {
      const currentTick = Math.floor(state.inGameWorldTime);
      tryEventDrivenGoalTriggers(event, disciple, result, state, goalManager, currentTick, logger);
    }
  }
}

/**
 * 事件驱动目标触发（ADR-JG-01）
 *
 * 在 processSoulEvent 尾部调用，此时：
 * - encounter(610) 已完成
 * - applyEvaluationResult + updateRelationshipTags 已执行
 * - affinity delta 和 tags 均为最新状态
 *
 * @see phaseJ-goal-TDD.md S6
 */
function tryEventDrivenGoalTriggers(
  event: SoulEvent,
  disciple: LiteDiscipleState,
  result: SoulEvaluationResult,
  state: LiteGameState,
  goalManager: GoalManager,
  currentTick: number,
  logger: GameLogger,
): void {
  // T-EV-01: breakthrough 触发
  if (event.type === 'breakthrough-fail') {
    const threshold = getRealmAuraCost(disciple.realm, disciple.subRealm) * 0.7;
    if (disciple.aura >= threshold) {
      const goal = goalManager.assignGoal(state, disciple.id, 'breakthrough', {
        realmTarget: disciple.realm,
        subRealmTarget: disciple.subRealm + 1,
      }, currentTick, true);
      if (goal) {
        logGoalAssigned(logger, state, goal);
      }
    }
  }

  // T-EV-02: revenge 触发（仅 encounter-conflict）
  if (event.type === 'encounter-conflict') {
    for (const rd of result.relationshipDeltas) {
      if (rd.delta >= -5) continue; // 仅 delta < -5
      const edge = state.relationships.find(
        e => e.sourceId === disciple.id && e.targetId === rd.targetId,
      );
      if (!edge || !edge.tags.includes('rival')) continue;
      const goal = goalManager.assignGoal(state, disciple.id, 'revenge', {
        targetDiscipleId: rd.targetId,
      }, currentTick, true);
      if (goal) {
        logGoalAssigned(logger, state, goal);
      }
    }
  }

  // T-EV-03: friendship 触发（任意正向 affinity 变化）
  for (const rd of result.relationshipDeltas) {
    if (rd.delta <= 0) continue;
    const edge = state.relationships.find(
      e => e.sourceId === disciple.id && e.targetId === rd.targetId,
    );
    if (!edge || edge.affinity < 40) continue;
    if (edge.tags.includes('friend')) continue; // 已是好友
    const goal = goalManager.assignGoal(state, disciple.id, 'friendship', {
      targetDiscipleId: rd.targetId,
    }, currentTick, true);
    if (goal) {
      logGoalAssigned(logger, state, goal);
    }
  }
}

/**
 * 输出目标分配 MUD 日志
 */
function logGoalAssigned(
  logger: GameLogger,
  state: LiteGameState,
  goal: import('../shared/types/personal-goal').PersonalGoal,
): void {
  const disciple = state.disciples.find(d => d.id === goal.discipleId);
  const name = disciple?.name ?? '???';
  const label = GOAL_LABEL[goal.type];

  let template = GOAL_MUD_TEXT.assigned[goal.type];
  template = template.replace(/\{name\}/g, name).replace(/\{pronoun\}/g, '其');

  const targetId = goal.target['targetDiscipleId'] as string | undefined;
  if (targetId) {
    const targetDisc = state.disciples.find(d => d.id === targetId);
    template = template.replace(/\{target\}/g, targetDisc?.name ?? '???');
  }

  logger.info(LogCategory.DISCIPLE, 'soul-engine', template, {
    discipleId: goal.discipleId,
    goalType: goal.type,
    goalLabel: label,
    event: 'goal-assigned',
  });
}

// ===== Phase F: 情绪记录与衰减 =====

/**
 * 记录弟子情绪（soul-engine 评估后调用）
 *
 * 策略：last-write-wins（新情绪覆盖旧情绪）
 * @see phaseF-PRD.md §3.2 F-F-03
 */
function recordEmotion(
  emotionMap: Map<string, DiscipleEmotionState>,
  discipleId: string,
  result: SoulEvaluationResult,
): void {
  emotionMap.set(discipleId, {
    currentEmotion: result.emotion,
    emotionIntensity: result.intensity,
    emotionSetAt: Date.now(),
    decayCounter: 0,
  });
}

/**
 * 衰减所有弟子情绪（soul-tick 每次调用）
 *
 * 每次 soul-tick 增加 decayCounter；
 * 到达 EMOTION_DECAY_TICKS 时 intensity -1，重置 counter；
 * intensity 降到 0 时清除情绪。
 *
 * @see phaseF-PRD.md §3.2 F-F-02
 */
function decayEmotions(emotionMap: Map<string, DiscipleEmotionState>): void {
  for (const [discipleId, emo] of emotionMap) {
    if (!emo.currentEmotion) continue;

    emo.decayCounter++;
    if (emo.decayCounter >= EMOTION_DECAY_TICKS) {
      emo.decayCounter = 0;
      emo.emotionIntensity = (emo.emotionIntensity - 1) as 1 | 2 | 3;

      if (emo.emotionIntensity <= 0) {
        // 情绪完全衰减
        emotionMap.delete(discipleId);
      }
    }
  }
}

// 导出常量供测试用
export { AFFINITY_DECAY_RATE, AFFINITY_DECAY_THRESHOLD, DECAY_INTERVAL_SEC, AI_TIMEOUT_MS };

/**
 * 重置模块级状态（测试/HMR 清理用）
 * 清除衰减累积器和行为计数缓存
 */
export function resetSoulEngineState(): void {
  decayAccumulatorSec = 0;
  behaviorCountCache.clear();
}
