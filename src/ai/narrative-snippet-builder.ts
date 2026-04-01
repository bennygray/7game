/**
 * Phase IJ v3.0: Narrative Snippet 三层降级构建器
 *
 * PRD R-M07~R-M10:
 *   层级 1: AI 预生成（需 PoC 验证，接口预留）
 *   层级 2: 规则拼接（本 Phase 实现）
 *   层级 3: 模板插值（本 Phase 实现）
 */
import type { RelationshipMemory } from '../shared/types/relationship-memory';
import { NARRATIVE_SNIPPET_MAX_CHARS } from '../shared/types/relationship-memory';
import type { RelationshipTag } from '../shared/types/soul';

// ===== AI 预生成配置（IJ-11 PoC） =====

const AI_SERVER_URL = 'http://localhost:3001';
/** PRD A-6: P95 ≤ 2000ms */
const AI_SNIPPET_TIMEOUT_MS = 2000;
/** 中文 ≤80 字符 ≈ 50-80 tokens，留余量 */
const AI_SNIPPET_MAX_TOKENS = 100;

/** IJ-11: AI 叙事片段的结构化输出 Schema */
const AI_SNIPPET_SCHEMA = {
  type: 'object',
  properties: {
    snippet: {
      type: 'string',
      maxLength: 80,
      description: '两个角色之间的关系叙事归纳（≤80字，古典仙侠文风，第三人称）',
    },
  },
  required: ['snippet'],
};

// ===== 数据表 =====

/** PRD R-M09 步骤 1: 框架短语表（按 affinity 区间） */
const FRAMING_PHRASES: Array<{ min: number; max: number; template: string }> = [
  { min: -100, max: -60, template: '{A}与{B}势同水火' },
  { min: -59,  max: -30, template: '{A}与{B}积怨已深' },
  { min: -29,  max: -10, template: '{A}与{B}关系不睦' },
  { min: -9,   max: 9,   template: '{A}与{B}并无深交' },
  { min: 10,   max: 29,  template: '{A}与{B}颇有好感' },
  { min: 30,   max: 59,  template: '{A}与{B}交情匪浅' },
  { min: 60,   max: 100, template: '{A}与{B}情同手足' },
];

/** PRD R-M09 步骤 3: 归纳定性表 */
const CONCLUSION_PHRASES: Record<string, string> = {
  rival:   '——屡次三番，此人不可信。',
  grudge:  '——其心可诛，不可不防。',
  friend:  '——患难与共，值得以命相托。',
  mentor:  '——恩重如山，当铭记于心。',
  admirer: '——仰慕之情溢于言表。',
  default: '——时日将证一切。',
};

/** PRD R-M10: 模板表（8 个，按 affinity × tags 选择） */
const TEMPLATES: Array<{ condition: (a: number, t: RelationshipTag[]) => boolean; template: string }> = [
  { condition: (a, t) => a < -30 && t.includes('rival'),  template: '{A}与{B}宿怨极深，彼此视若仇敌，不可同日而语。' },
  { condition: (a, t) => a < -30 && !hasRelTag(t),        template: '{A}与{B}关系紧张，多有摩擦，积怨渐深。' },
  { condition: (a) => a < 0,                               template: '{A}与{B}颇有嫌隙，相处不甚融洽。' },
  { condition: (a) => a >= -9 && a <= 9,                   template: '{A}与{B}交集不多，谈不上亲疏。' },
  { condition: (a) => a > 0 && a < 30,                      template: '{A}与{B}尚有几分交情，偶有往来。' },
  { condition: (a, t) => a > 60 && t.includes('friend'),   template: '{A}与{B}情谊非凡，堪称知己，生死相托。' },
  { condition: (a, t) => a > 30 && t.includes('friend'),   template: '{A}与{B}交情深厚，时常互相扶持。' },
  { condition: (a, t) => a > 30 && !hasRelTag(t),         template: '{A}与{B}相处甚为融洽，渐生亲近之意。' },
];

/** 检查 tags 是否为空（无关系标签） */
function hasRelTag(tags: RelationshipTag[]): boolean {
  return tags.length > 0;
}

// ===== 构建器 =====

export class NarrativeSnippetBuilder {

  /**
   * 规则拼接生成 narrative snippet（层级 2）
   * PRD R-M09 完整逻辑
   * 边界：keyEvents 为空时跳过事件串联，仅输出框架短语+归纳定性
   * @returns ≤80 字符的叙事段落（超限时截断）
   */
  buildByRules(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): string {
    // 步骤 1: 选择框架短语
    const framing = this.selectFramingPhrase(memory.affinity, sourceName, targetName);

    // 步骤 2: 事件串联（按 |affinityDelta| 降序取 top 3）
    const eventsPart = this.buildEventChain(memory);

    // 步骤 3: 归纳定性
    const conclusion = this.selectConclusion(memory.tags);

    // 拼接
    let result = framing;
    if (eventsPart) {
      result += `。${eventsPart}`;
    }
    result += conclusion;

    // 截断保护
    if (result.length > NARRATIVE_SNIPPET_MAX_CHARS) {
      result = result.substring(0, NARRATIVE_SNIPPET_MAX_CHARS - 1) + '…';
    }

    return result;
  }

  /**
   * 模板插值生成 narrative snippet（层级 3 降级）
   * PRD R-M10: 8 个模板
   */
  buildByTemplate(
    sourceName: string,
    targetName: string,
    affinity: number,
    tags: RelationshipTag[]
  ): string {
    for (const t of TEMPLATES) {
      if (t.condition(affinity, tags)) {
        return t.template.replace('{A}', sourceName).replace('{B}', targetName);
      }
    }
    // fallback: 中性模板
    return `${sourceName}与${targetName}交集不多，谈不上亲疏。`;
  }

  /**
   * AI 预生成接口（层级 1，IJ-11 PoC）
   * 调用 ai-server /api/infer 结构化补全生成叙事摘要
   *
   * 调用路径: buildByAI() → fetch /api/infer → llama-server → Qwen3.5-2B
   * 超时: 2000ms（PRD A-6）
   * 降级: 返回 null，由 getSnippet() fallback 到规则拼接
   *
   * @returns 叙事片段字符串，或 null（不可用/超时/解析失败）
   */
  async buildByAI(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): Promise<string | null> {
    // 1. 构造输入数据
    const sorted = [...memory.keyEvents].sort(
      (a, b) => Math.abs(b.affinityDelta) - Math.abs(a.affinityDelta)
    );
    const top3 = sorted.slice(0, 3);

    const eventsDesc = top3.length > 0
      ? top3.map(e => `- ${e.content}（好感${e.affinityDelta > 0 ? '+' : ''}${e.affinityDelta}）`).join('\n')
      : '（暂无关键事件）';

    const tagsDesc = memory.tags.length > 0 ? memory.tags.join('、') : '无';

    // 2. 构造 prompt（v2: 修复加戏/省名/极性偏移）
    const polarityHint = memory.affinity >= 30 ? '正面（友善、信任）'
      : memory.affinity <= -30 ? '负面（敌意、不信任）'
      : '中性（淡漠、无特殊关系）';

    const systemMsg = '你是修仙世界叙事器。根据两个角色的关系数据，用一句话概括他们的关系本质。\n' +
      '硬性要求：\n' +
      '1. ≤80字，古典仙侠文风，第三人称\n' +
      '2. 必须包含角色A和角色B的完整姓名\n' +
      '3. 严格遵循好感度极性——正面关系只写正面，负面关系只写负面，不得反转\n' +
      '4. 只引用关键事件中已有的内容，不得虚构事件\n' +
      '5. 只输出JSON';

    const userMsg = `角色A: ${sourceName}\n` +
      `角色B: ${targetName}\n` +
      `好感度: ${memory.affinity}（极性: ${polarityHint}）\n` +
      `关系标签: ${tagsDesc}\n` +
      `关键事件:\n${eventsDesc}\n\n` +
      `请输出一句叙事归纳。`;

    // 3. 调用 ai-server
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_SNIPPET_TIMEOUT_MS);

      const res = await fetch(`${AI_SERVER_URL}/api/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
          max_tokens: AI_SNIPPET_MAX_TOKENS,
          temperature: 0.5,       // v2: 降低创造性，提高可控性
          top_p: 0.9,
          timeout_ms: AI_SNIPPET_TIMEOUT_MS,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'narrative_snippet',
              strict: true,
              schema: AI_SNIPPET_SCHEMA,
            },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) return null;

      const data = await res.json() as { content?: string; parsed?: { snippet?: string } };

      // 4. 解析结果
      let snippet: string | null = null;

      if (data.parsed?.snippet) {
        snippet = data.parsed.snippet;
      } else if (data.content) {
        try {
          const obj = JSON.parse(data.content) as { snippet?: string };
          snippet = obj.snippet ?? null;
        } catch {
          return null;
        }
      }

      // 5. 截断保护
      if (snippet && snippet.length > NARRATIVE_SNIPPET_MAX_CHARS) {
        snippet = snippet.substring(0, NARRATIVE_SNIPPET_MAX_CHARS - 1) + '…';
      }

      return snippet || null;
    } catch {
      // 超时/网络错误 → 返回 null，降级到规则拼接
      return null;
    }
  }

  /**
   * 统一入口：按三层降级策略生成 snippet
   * 1. 返回已缓存的 narrativeSnippet（如有）
   * 2. 无缓存 → 规则拼接
   * 3. 规则拼接异常 → 模板插值
   */
  getSnippet(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory
  ): string {
    // 层级 1: 返回已缓存的 AI 预生成结果
    if (memory.narrativeSnippet) {
      return memory.narrativeSnippet;
    }

    // 层级 2: 规则拼接
    try {
      return this.buildByRules(sourceName, targetName, memory);
    } catch {
      // 层级 3: 模板插值（理论上不会走到这里）
      return this.buildByTemplate(sourceName, targetName, memory.affinity, memory.tags);
    }
  }

  /**
   * 触发 AI 预生成（异步，不阻塞调用方）
   * IJ-11 PoC: 在 keyEvent 记录后调用
   *
   * 效果：成功时将 snippet 写入 memory.narrativeSnippet 缓存
   * 失败时：静默失败，下次 getSnippet() 走规则拼接
   */
  triggerAIPregenerate(
    sourceName: string,
    targetName: string,
    memory: RelationshipMemory,
    onSuccess?: (snippet: string) => void,
  ): void {
    // 异步调用，不 await（不阻塞 tick pipeline）
    this.buildByAI(sourceName, targetName, memory)
      .then(snippet => {
        if (snippet) {
          memory.narrativeSnippet = snippet;
          onSuccess?.(snippet);
        }
      })
      .catch(() => {
        // 静默失败 — 规则拼接作为 fallback
      });
  }

  // ===== 内部方法 =====

  /** 步骤 1: 按 affinity 区间选择框架短语 */
  private selectFramingPhrase(affinity: number, sourceName: string, targetName: string): string {
    const clamped = Math.max(-100, Math.min(100, affinity));
    for (const phrase of FRAMING_PHRASES) {
      if (clamped >= phrase.min && clamped <= phrase.max) {
        return phrase.template.replace('{A}', sourceName).replace('{B}', targetName);
      }
    }
    // fallback（不应到达）
    return `${sourceName}与${targetName}并无深交`;
  }

  /** 步骤 2: 事件串联（top-3，因果连接词） */
  private buildEventChain(memory: RelationshipMemory): string {
    if (memory.keyEvents.length === 0) return '';

    const sorted = [...memory.keyEvents].sort(
      (a, b) => Math.abs(b.affinityDelta) - Math.abs(a.affinityDelta)
    );
    const top = sorted.slice(0, 3);

    if (top.length === 1) {
      return `此人曾${top[0].content}`;
    } else if (top.length === 2) {
      return `此人曾${top[0].content}，又${top[1].content}`;
    } else {
      return `此人曾${top[0].content}，又${top[1].content}，更${top[2].content}`;
    }
  }

  /** 步骤 3: 按关系标签选择归纳定性 */
  private selectConclusion(tags: RelationshipTag[]): string {
    // 按优先级匹配：grudge > rival > mentor > friend > admirer > default
    const priority: RelationshipTag[] = ['grudge', 'rival', 'mentor', 'friend', 'admirer'];
    for (const tag of priority) {
      if (tags.includes(tag)) {
        return CONCLUSION_PHRASES[tag];
      }
    }
    return CONCLUSION_PHRASES['default'];
  }
}
