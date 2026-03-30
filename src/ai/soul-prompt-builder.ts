/**
 * 灵魂评估 Prompt 构建器 — AI 层
 *
 * 职责:
 * 1. 构建结构化 prompt（候选情绪池 + 弟子上下文）
 * 2. 定义 JSON Schema（response_format 约束）
 * 3. 提供 inferSoulEvaluation 调用接口
 *
 * 禁令 X-5: prompt 不得硬编码在 engine 层，统一在此 AI 层维护
 *
 * I4: 结构化输出 — llama.cpp response_format json_schema 约束
 *
 * @see phaseE-TDD.md Step 1.1
 * @see Story #4 AC1
 */

import type { LiteDiscipleState } from '../shared/types/game-state';
import type {
  EmotionTag, SoulEventType, SoulRole,
} from '../shared/types/soul';
import { EMOTION_LABEL } from '../shared/types/soul';
import type { SoulEvent } from '../engine/event-bus';
import { getTraitDef } from '../shared/data/trait-registry';

// ===== JSON Schema for AI 响应 =====

/** AI 灵魂评估响应的 JSON Schema */
export const SOUL_EVAL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    emotion: {
      type: 'string',
      enum: [
        'joy', 'anger', 'envy', 'admiration', 'sadness', 'fear',
        'contempt', 'neutral', 'jealousy', 'gratitude', 'guilt',
        'worry', 'shame', 'pride', 'relief',
      ],
      description: '从候选情绪池中选择一种',
    },
    intensity: {
      type: 'integer',
      enum: [1, 2, 3],
      description: '情绪强度：1=轻微，2=明显，3=强烈',
    },
    relationshipDeltas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetId: { type: 'string' },
          delta: { type: 'number', minimum: -10, maximum: 10 },
          reason: { type: 'string' },
        },
        required: ['targetId', 'delta', 'reason'],
      },
      description: '关系变化列表（引擎将执行方向修正和夹值）',
    },
    innerThought: {
      type: 'string',
      maxLength: 80,
      description: '弟子内心独白（中文，20-80字）',
    },
  },
  required: ['emotion', 'intensity', 'relationshipDeltas', 'innerThought'],
};

// ===== Prompt 构建 =====

export interface SoulPromptInput {
  event: SoulEvent;
  subject: LiteDiscipleState;
  role: SoulRole;
  actorName: string;
  actorRealm: string;
  candidates: EmotionTag[];
  otherDiscipleIds: string[];
}

/**
 * 构建灵魂评估 prompt
 *
 * 结构:
 * 1. 系统角色：弟子身份
 * 2. 事件描述
 * 3. 候选情绪（必须从中选择）
 * 4. 关系信息
 * 5. 输出格式说明
 */
export function buildSoulEvalPrompt(input: SoulPromptInput): string {
  const { event, subject, role, actorName, candidates } = input;

  // 特性ai提示词
  const traitHints = subject.traits
    .map(t => getTraitDef(t.defId)?.aiHint)
    .filter(Boolean)
    .join('；');

  const candidateList = candidates
    .map(e => `${e}(${EMOTION_LABEL[e] ?? e})`)
    .join('、');

  const eventDescription = getEventDescription(event.type, role, actorName, subject.name);

  const prompt = `你是修仙宗门弟子「${subject.name}」，性格${subject.personalityName}。${traitHints ? '性格特点：' + traitHints + '。' : ''}

刚才发生了：${eventDescription}

你此刻内心的情绪是什么？关系如何变化？

【候选情绪】（必须从以下情绪中选择一种）：${candidateList}

请用JSON格式输出你的内心反应。innerThought写你此刻的内心独白（20-30字，第一人称）。`;

  return prompt;
}

function getEventDescription(
  eventType: SoulEventType,
  role: SoulRole,
  actorName: string,
  _subjectName: string,
): string {
  if (role === 'self') {
    const selfDesc: Record<SoulEventType, string> = {
      'alchemy-success':     '你炼丹成功，丹药出炉',
      'alchemy-fail':        '你炼丹失败，丹炉碎裂',
      'harvest':             '你完成了灵田的收割',
      'meditation':          '你结束了一段打坐修炼',
      'explore-return':      '你完成外出历练归来',
      'breakthrough-success': '你成功突破了境界',
      'breakthrough-fail':   '你突破境界失败了',
      // Phase F0-α: 碰面事件
      'encounter-chat':      '你和同门偶然碰面，闲聊了几句',
      'encounter-discuss':   '你和同门碰面，交流了修炼心得',
      'encounter-conflict':  '你和同门碰面，发生了言语冲突',
      // Phase F0-β: 世界事件
      'world-event':         '宗门发生了一件异事',
    };
    return selfDesc[eventType] ?? `你完成了${eventType}`;
  } else {
    const observerDesc: Record<SoulEventType, string> = {
      'alchemy-success':     `你的同门${actorName}炼丹成功`,
      'alchemy-fail':        `你的同门${actorName}炼丹失败`,
      'harvest':             `你的同门${actorName}收获了灵田`,
      'meditation':          `你的同门${actorName}完成了修炼`,
      'explore-return':      `你的同门${actorName}历练归来`,
      'breakthrough-success': `你的同门${actorName}成功突破了境界`,
      'breakthrough-fail':   `你的同门${actorName}突破境界失败`,
      // Phase F0-α: 碰面事件
      'encounter-chat':      `你和${actorName}偶然碰面，闲聊了几句`,
      'encounter-discuss':   `你和${actorName}碰面，交流了修炼心得`,
      'encounter-conflict':  `你和${actorName}碰面，发生了言语冲突`,
      // Phase F0-β: 世界事件
      'world-event':         `宗门发生了一件异事，波及${actorName}`,
    };
    return observerDesc[eventType] ?? `你的同门${actorName}发生了${eventType}`;
  }
}

// ===== 导出给 soul-engine 用的工具函数 =====

/**
 * 从 soul.ts 重新导出 buildCandidatePool（避免 soul-engine 跨层直接 import AI 层）
 * 实际上 soul-engine.ts 应直接 import from emotion-pool，此文件主要供 AI 推理使用
 */
export { buildSoulEvalPrompt as default };
