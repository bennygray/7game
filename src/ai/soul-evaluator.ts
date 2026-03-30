/**
 * 灵魂评估器 — Phase G1
 *
 * 中央 AI 评估服务，包装所有 AI 调用模式：
 *   - evaluateEmotion(): Lv.1+ 情绪评估 (poc-1c schema)
 *   - evaluateMonologue(): Lv.2 独白渲染 (Call2)
 *   - evaluateDecisionAndMonologue(): Lv.3 双阶段 (Call1+Call2)
 *
 * 使用 /v1/chat/completions 端点（OpenAI 兼容，匹配 llama-server）。
 * 所有方法返回 SoulEvaluationResult，由 soul-engine 后处理。
 *
 * @see SOUL-VISION-ROADMAP.md Phase G, G1/G2/G4
 * @see poc-2e-split-pipeline.ts — 双阶段验证
 */

import type { SoulEvaluationResult, EmotionTag, SoulRole } from '../shared/types/soul';
import type { SoulEvent } from '../engine/event-bus';
import type { LiteDiscipleState, LiteGameState } from '../shared/types/game-state';
import { buildSoulEvalPrompt, SOUL_EVAL_JSON_SCHEMA, type SoulPromptInput, type SectContext, describeEthos, describeMoral } from './soul-prompt-builder';
import { buildCandidatePool } from '../shared/data/emotion-pool';
import { getTraitDef } from '../shared/data/trait-registry';
import { selectFewShotExamples } from './few-shot-examples';
import { buildActionPool, type ActionOption } from './action-pool-builder';

// ===== 类型 =====

/** 结构化补全请求 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** LLM 结构化补全配置 */
interface StructuredCompletionConfig {
  messages: ChatMessage[];
  schema: object;
  schemaName: string;
  timeoutMs: number;
  maxTokens?: number;
}

/** 独白 JSON Schema */
const MONOLOGUE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    innerThought: {
      type: 'string',
      maxLength: 150,
      description: '弟子内心独白（中文，20-80字，第一人称）',
    },
  },
  required: ['innerThought'],
};

// ===== 限速器 =====

/** 最小调用间隔（毫秒）— 限制 AI 调用频率 */
const MIN_CALL_INTERVAL_MS = 30_000;

// ===== SoulEvaluator =====

export class SoulEvaluator {
  private baseUrl: string;
  private connected = false;
  private lastCallTime = 0;

  constructor(baseUrl = 'http://127.0.0.1:8080') {
    this.baseUrl = baseUrl;
  }

  /** 检查后端是否已连接 */
  isAvailable(): boolean {
    return this.connected;
  }

  /** 手动连接后端 */
  async tryConnect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        this.connected = true;
        return true;
      }
    } catch {
      // 连接失败
    }
    this.connected = false;
    return false;
  }

  /** 限速检查：是否允许调用 */
  canCall(): boolean {
    return this.connected && (Date.now() - this.lastCallTime >= MIN_CALL_INTERVAL_MS);
  }

  /**
   * Lv.1+ 情绪评估（poc-1c schema）
   *
   * 用于所有 severity 的 AI 情绪评估。
   * 返回完整的 SoulEvaluationResult。
   */
  async evaluateEmotion(
    event: SoulEvent,
    subject: LiteDiscipleState,
    role: SoulRole,
    state: LiteGameState,
  ): Promise<SoulEvaluationResult> {
    const actor = state.disciples.find(d => d.id === event.actorId);
    const candidates = buildCandidatePool(event.type, role);
    const otherIds = state.disciples
      .filter(d => d.id !== subject.id)
      .map(d => d.id);

    // G5: 构建宗门上下文
    const sectContext: SectContext = {
      name: state.sect.name,
      ethos: state.sect.ethos,
      discipline: state.sect.discipline,
    };

    const input: SoulPromptInput = {
      event,
      subject,
      role,
      actorName: actor?.name ?? '未知',
      actorRealm: '修炼者',
      candidates,
      otherDiscipleIds: otherIds,
      sectContext,
    };

    const prompt = buildSoulEvalPrompt(input);

    // G3: Few-shot 示例注入（按道德阵营选择）
    const fewShotMessages = selectFewShotExamples(subject.moral?.goodEvil ?? 0);

    const result = await this.structuredCompletion({
      messages: [
        { role: 'system', content: '你是修仙宗门弟子的灵魂引擎，根据事件和性格产出情绪评估。严格按 JSON 格式输出。角色的性格和道德立场决定了他的反应——邪恶角色会做邪恶的事，善良角色会做善良的事。' },
        ...fewShotMessages,
        { role: 'user', content: prompt },
      ],
      schema: SOUL_EVAL_JSON_SCHEMA,
      schemaName: 'soul_eval',
      timeoutMs: 5000,
      maxTokens: 200,
    });

    this.lastCallTime = Date.now();
    return this.parseSoulEvalResult(result, candidates);
  }

  /**
   * Lv.2 独白渲染（Call2 only）
   *
   * 在 fallback 情绪已确定后，生成个性化独白。
   * 返回仅包含 innerThought 的部分结果。
   */
  async evaluateMonologue(
    event: SoulEvent,
    subject: LiteDiscipleState,
    role: SoulRole,
    emotion: EmotionTag,
    state: LiteGameState,
  ): Promise<{ innerThought: string }> {
    const actor = state.disciples.find(d => d.id === event.actorId);

    // G6: 特性 aiHint 注入
    const traitHints = subject.traits
      .map(t => getTraitDef(t.defId)?.aiHint)
      .filter(Boolean)
      .join('；');

    // G5: 宗门道风
    const ethosDesc = describeEthos(state.sect.ethos, state.sect.discipline);

    const prompt =
      `【角色】${subject.name}（${subject.personalityName}）${traitHints ? '。性格特点：' + traitHints : ''}\n` +
      `【宗门】${ethosDesc}\n` +
      `【事件】${this.getEventDesc(event, role, actor?.name ?? '同门')}\n` +
      `【当前情绪】${emotion}\n` +
      `请为${subject.name}生成此刻的内心独白（20-80字，第一人称，仙侠风）。`;

    const result = await this.structuredCompletion({
      messages: [
        { role: 'system', content: '你是修仙世界的文学渲染器。根据角色性格和情绪，生成简洁有力的内心独白。中国古典仙侠风格。' },
        { role: 'user', content: prompt },
      ],
      schema: MONOLOGUE_JSON_SCHEMA,
      schemaName: 'monologue',
      timeoutMs: 5000,
      maxTokens: 150,
    });

    this.lastCallTime = Date.now();
    const parsed = result as { innerThought?: string } | null;
    return {
      innerThought: (typeof parsed?.innerThought === 'string' && parsed.innerThought.length > 0)
        ? parsed.innerThought
        : '……',
    };
  }

  /**
   * Lv.3 双阶段行为决策 (Call1 决策 + Call2 独白)
   *
   * Call1: 从动作候选池中选择行为（800ms timeout）
   * Call2: 基于选择的行为生成独白（700ms timeout）
   *
   * 失败策略：Call1 超时=全部 fallback; Call1 成功+Call2 超时=用 AI 决策+fallback 独白
   *
   * @see poc-2e-split-pipeline.ts
   */
  async evaluateDecisionAndMonologue(
    event: SoulEvent,
    subject: LiteDiscipleState,
    role: SoulRole,
    state: LiteGameState,
  ): Promise<SoulEvaluationResult & { actionCode?: string }> {
    const actor = state.disciples.find(d => d.id === event.actorId);
    const actorName = actor?.name ?? '同门';
    const eventDefId = (event.metadata as Record<string, unknown> | undefined)?.eventDefId as string | undefined;

    // 构建动作候选池
    const actionPool = buildActionPool(
      event.type,
      eventDefId,
      subject.moral?.goodEvil ?? 0,
    );

    // ===== Call 1: 纯行为决策 =====
    const actionListDesc = actionPool.map(a => `${a.code}(${a.label})`).join(' / ');
    const decisionSchema = {
      type: 'object' as const,
      properties: {
        action: { type: 'string' as const, enum: actionPool.map(a => a.code) },
        confidence: { type: 'integer' as const, enum: [1, 2, 3] },
      },
      required: ['action', 'confidence'] as const,
    };

    // G5+G6: 身份描述
    const traitHints = subject.traits
      .map(t => getTraitDef(t.defId)?.aiHint)
      .filter(Boolean)
      .join('；');
    const ethosDesc = describeEthos(state.sect.ethos, state.sect.discipline);
    const moralDesc = describeMoral(subject.moral?.goodEvil ?? 0, subject.moral?.lawChaos ?? 0);

    const decisionSystem =
      `你是修仙世界NPC行为决策器。根据角色性格和当前处境，从候选行动中选出最合理的一个。\n` +
      `只需选择行动，不需要解释。角色的道德立场决定了他的选择——邪恶角色会做邪恶的事。\n` +
      `候选行动：【${actionListDesc}】`;

    const decisionUser =
      `【事件】${this.getEventDesc(event, role, actorName)}\n` +
      `【角色】${subject.name} | 性格：${subject.personalityName}${traitHints ? ' | 特点：' + traitHints : ''}${moralDesc ? ' | ' + moralDesc : ''}\n` +
      `【宗门】${ethosDesc}`;

    // G3: Few-shot for decision
    const fewShotDecision = selectFewShotExamples(subject.moral?.goodEvil ?? 0);

    let chosenAction: ActionOption;
    try {
      const decisionResult = await this.structuredCompletion({
        messages: [
          { role: 'system', content: decisionSystem },
          ...fewShotDecision.slice(0, 4), // limit few-shot for decision
          { role: 'user', content: decisionUser },
        ],
        schema: decisionSchema,
        schemaName: 'decision',
        timeoutMs: 800,
        maxTokens: 50,
      });

      const parsed = decisionResult as { action?: string } | null;
      const foundAction = actionPool.find(a => a.code === parsed?.action);
      chosenAction = foundAction ?? actionPool[0];
    } catch {
      // Call1 超时/失败 → 全用 fallback
      throw new Error('Decision call failed');
    }

    this.lastCallTime = Date.now();

    // ===== Call 2: 独白渲染（基于决策结果） =====
    const candidates = buildCandidatePool(event.type, role);
    let innerThought = '……';
    let emotion: EmotionTag = candidates[0] ?? 'neutral';
    let intensity: 1 | 2 | 3 = 2;

    try {
      const monologuePrompt =
        `【角色】${subject.name}（${subject.personalityName}）${traitHints ? '。' + traitHints : ''}\n` +
        `【事件】${this.getEventDesc(event, role, actorName)}\n` +
        `【选择的行动】${chosenAction.code}（${chosenAction.label}）\n` +
        `【候选情绪】${candidates.map(e => e).join('、')}\n` +
        `请为${subject.name}生成此刻的内心独白（20-80字），并选择一种情绪。`;

      const monologueSchema = {
        type: 'object' as const,
        properties: {
          emotion: { type: 'string' as const, enum: candidates },
          intensity: { type: 'integer' as const, enum: [1, 2, 3] },
          innerThought: { type: 'string' as const, maxLength: 150 },
        },
        required: ['emotion', 'intensity', 'innerThought'] as const,
      };

      const monologueResult = await this.structuredCompletion({
        messages: [
          { role: 'system', content: '你是修仙世界的文学渲染器。根据角色性格和所选行动，生成内心独白并选择情绪。中国古典仙侠风。' },
          { role: 'user', content: monologuePrompt },
        ],
        schema: monologueSchema,
        schemaName: 'monologue_with_emotion',
        timeoutMs: 700,
        maxTokens: 150,
      });

      const parsed = monologueResult as { emotion?: string; intensity?: number; innerThought?: string } | null;
      if (parsed?.innerThought) innerThought = parsed.innerThought;
      if (parsed?.emotion && candidates.includes(parsed.emotion as EmotionTag)) {
        emotion = parsed.emotion as EmotionTag;
      }
      if (parsed?.intensity && [1, 2, 3].includes(parsed.intensity)) {
        intensity = parsed.intensity as 1 | 2 | 3;
      }
    } catch {
      // Call2 超时 → 用 AI 决策 + fallback 独白
    }

    return {
      emotion,
      intensity,
      relationshipDeltas: [], // 关系变化由 action-executor 处理
      innerThought,
      actionCode: chosenAction.code,
    };
  }

  // ===== 私有方法 =====

  /** 结构化 LLM 补全调用 */
  private async structuredCompletion(config: StructuredCompletionConfig): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const payload = {
        model: 'default',
        messages: config.messages,
        max_tokens: config.maxTokens ?? 200,
        temperature: 0.6,
        top_p: 0.9,
        chat_template_kwargs: { enable_thinking: false },
        response_format: {
          type: 'json_schema',
          json_schema: { name: config.schemaName, strict: true, schema: config.schema },
        },
      };

      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.connected = false;
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = (data?.choices?.[0]?.message?.content ?? '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();

      return JSON.parse(content);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('AI call timeout');
      }
      this.connected = false;
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 解析 AI 返回为 SoulEvaluationResult */
  private parseSoulEvalResult(
    raw: unknown,
    candidates: EmotionTag[],
  ): SoulEvaluationResult {
    const obj = raw as Record<string, unknown> | null;
    if (!obj) throw new Error('Empty AI response');

    // emotion — 必须在候选池中
    let emotion = obj.emotion as EmotionTag;
    if (!candidates.includes(emotion)) {
      emotion = candidates[0] ?? 'neutral';
    }

    // intensity — 必须是 1/2/3
    let intensity = obj.intensity as number;
    if (![1, 2, 3].includes(intensity)) intensity = 1;

    // relationshipDeltas
    const rawDeltas = Array.isArray(obj.relationshipDeltas) ? obj.relationshipDeltas : [];
    const relationshipDeltas = rawDeltas.map((rd: Record<string, unknown>) => ({
      targetId: String(rd.targetId ?? ''),
      delta: typeof rd.delta === 'number' ? rd.delta : 0,
      reason: String(rd.reason ?? 'AI评估'),
    })).filter((rd: { targetId: string }) => rd.targetId.length > 0);

    // innerThought
    const innerThought = typeof obj.innerThought === 'string' && obj.innerThought.length > 0
      ? obj.innerThought
      : '……';

    return {
      emotion,
      intensity: intensity as 1 | 2 | 3,
      relationshipDeltas,
      innerThought,
    };
  }

  /** 事件描述（简化版，供独白 prompt 用） */
  private getEventDesc(event: SoulEvent, role: SoulRole, actorName: string): string {
    const desc: Record<string, string> = {
      'alchemy-success': role === 'self' ? '你炼丹成功' : `${actorName}炼丹成功`,
      'alchemy-fail': role === 'self' ? '你炼丹失败' : `${actorName}炼丹失败`,
      'breakthrough-success': role === 'self' ? '你突破境界成功' : `${actorName}突破境界成功`,
      'breakthrough-fail': role === 'self' ? '你突破境界失败' : `${actorName}突破境界失败`,
      'encounter-conflict': role === 'self' ? `你和${actorName}发生冲突` : `${actorName}与人发生冲突`,
      'encounter-discuss': role === 'self' ? `你和${actorName}论道` : `${actorName}与人论道`,
      'encounter-chat': role === 'self' ? `你和${actorName}闲聊` : `${actorName}与人闲聊`,
      'world-event': '宗门发生异事',
      'harvest': role === 'self' ? '你收获灵田' : `${actorName}收获灵田`,
      'meditation': role === 'self' ? '你完成修炼' : `${actorName}完成修炼`,
      'explore-return': role === 'self' ? '你历练归来' : `${actorName}历练归来`,
    };
    return desc[event.type] ?? '发生了一件事';
  }
}
