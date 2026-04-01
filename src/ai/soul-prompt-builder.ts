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
import type { ContextLevel } from '../shared/types/relationship-memory';

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

// ===== G5: 宗门道风描述 =====

/** 宗门上下文（用于 prompt 注入） */
export interface SectContext {
  name: string;
  ethos: number;      // [-100, +100]: -100=仁道 ↔ +100=霸道
  discipline: number; // [-100, +100]: -100=放任 ↔ +100=律法
}

/**
 * 将宗门数值映射为自然语言道风描述
 *
 * @see SOUL-VISION-ROADMAP.md Phase G, G5
 */
export function describeEthos(ethos: number, discipline: number): string {
  const parts: string[] = [];

  // 道风轴
  if (ethos > 50) {
    parts.push('宗门崇尚强者，弱肉强食');
  } else if (ethos > 20) {
    parts.push('宗门风气偏向刚猛');
  } else if (ethos < -50) {
    parts.push('宗门以仁义为本，扶危济困');
  } else if (ethos < -20) {
    parts.push('宗门风气偏向温和');
  }

  // 门规轴
  if (discipline > 50) {
    parts.push('门规森严，不容逾矩');
  } else if (discipline > 20) {
    parts.push('门规较为严格');
  } else if (discipline < -50) {
    parts.push('门风自由，弟子各行其是');
  } else if (discipline < -20) {
    parts.push('门规较为宽松');
  }

  return parts.length > 0 ? parts.join('，') : '宗门风气中正平和';
}

// ===== G3: 道德描述 =====

/**
 * 将弟子道德双轴映射为自然语言描述
 *
 * @see SOUL-VISION-ROADMAP.md Phase G, G3
 */
export function describeMoral(goodEvil: number, lawChaos: number): string {
  const parts: string[] = [];

  // 善恶轴
  if (goodEvil > 50) {
    parts.push('你心怀正义，以善为本');
  } else if (goodEvil > 20) {
    parts.push('你心性偏善');
  } else if (goodEvil < -50) {
    parts.push('你内心阴暗，行事不择手段');
  } else if (goodEvil < -20) {
    parts.push('你心性偏恶');
  }

  // 秩序轴
  if (lawChaos > 50) {
    parts.push('恪守规矩');
  } else if (lawChaos > 20) {
    parts.push('倾向守序');
  } else if (lawChaos < -50) {
    parts.push('无视规矩，随心所欲');
  } else if (lawChaos < -20) {
    parts.push('略显散漫');
  }

  return parts.length > 0 ? parts.join('，') : '';
}

// ===== Prompt 构建 =====

export interface SoulPromptInput {
  event: SoulEvent;
  subject: LiteDiscipleState;
  role: SoulRole;
  actorName: string;
  actorRealm: string;
  candidates: EmotionTag[];
  otherDiscipleIds: string[];
  /** Phase G5: 宗门上下文（可选） */
  sectContext?: SectContext;
  /** Phase J-Goal: 弟子当前目标（可选） */
  goals?: readonly PersonalGoal[];
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
  const { event, subject, role, actorName, candidates, sectContext, goals } = input;

  // G6: 特性 ai 提示词
  const traitHints = subject.traits
    .map(t => getTraitDef(t.defId)?.aiHint)
    .filter(Boolean)
    .join('；');

  // G5: 宗门道风描述
  const ethosDesc = sectContext
    ? describeEthos(sectContext.ethos, sectContext.discipline)
    : '';

  // G3: 道德描述
  const moralDesc = subject.moral
    ? describeMoral(subject.moral.goodEvil, subject.moral.lawChaos)
    : '';

  const candidateList = candidates
    .map(e => `${e}(${EMOTION_LABEL[e] ?? e})`)
    .join('、');

  const eventDescription = getEventDescription(event.type, role, actorName, subject.name);

  // J-Goal: 目标段落
  const goalSegment = goals ? buildGoalPromptSegment(goals) : '';

  // 构建身份段落
  let identity = `你是修仙宗门弟子「${subject.name}」，性格${subject.personalityName}。`;
  if (traitHints) identity += `性格特点：${traitHints}。`;
  if (moralDesc) identity += `${moralDesc}。`;
  if (ethosDesc) identity += `你所在的宗门：${ethosDesc}。`;

  const prompt = `${identity}${goalSegment}

刚才发生了：${eventDescription}

你此刻内心的情绪是什么？关系如何变化？

【候选情绪】（必须从以下情绪中选择一种）：${candidateList}

请用JSON格式输出你的内心反应。innerThought写你此刻的内心独白（20-30字，第一人称）。`;

  return prompt;
}

// ===== Phase IJ v3.0: L2/L6 动态切换 =====

/**
 * 根据事件等级选择 context level（PRD R-M08）
 * Lv.0-1 → L2, Lv.2+ → L6
 */
export function getContextLevel(eventSeverity: number): ContextLevel {
  if (eventSeverity >= 2) return 'L6';
  return 'L2';
}

/**
 * 构建关系摘要注入段（L2/L6 双级）
 * 插入在身份段落之后、事件描述之前
 */
export function buildRelationshipPromptSegment(
  summary: string | null,
  _contextLevel: ContextLevel
): string {
  if (!summary) return '';
  return `\n${summary}\n`;
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

// ===== Phase J-Goal: 目标 Prompt 注入 =====

import type { PersonalGoal } from '../shared/types/personal-goal';
import { GOAL_LABEL } from '../shared/data/goal-data';

/**
 * 构建目标 prompt 段落（ADR-JG-04）
 *
 * 无目标时返回空字符串（不注入）。
 * 多个目标时每行一条。
 *
 * @see phaseJ-goal-TDD.md S3 ADR-JG-04
 * @see phaseJ-goal-PRD.md §3.7
 */
export function buildGoalPromptSegment(goals: readonly PersonalGoal[]): string {
  if (goals.length === 0) return '';

  const lines = goals.map(g => {
    const label = GOAL_LABEL[g.type];
    return `当前心愿：${label}（剩余约 ${g.remainingTtl} 个时辰）`;
  });

  return '\n' + lines.join('\n') + '\n';
}

// ===== 导出给 soul-engine 用的工具函数 =====

/**
 * 从 soul.ts 重新导出 buildCandidatePool（避免 soul-engine 跨层直接 import AI 层）
 * 实际上 soul-engine.ts 应直接 import from emotion-pool，此文件主要供 AI 推理使用
 */
export { buildSoulEvalPrompt as default };
