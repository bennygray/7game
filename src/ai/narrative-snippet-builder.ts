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
   * AI 预生成接口（层级 1，PoC 阶段）
   * IJ-11: 异步调用 AI 生成叙事摘要
   * @returns null 表示 AI 不可用，fallback 到规则拼接
   */
  buildByAI(
    _sourceName: string,
    _targetName: string,
    _memory: RelationshipMemory
  ): Promise<string | null> {
    // PoC 阶段：接口预留，始终返回 null
    return Promise.resolve(null);
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
   * 触发 AI 预生成（异步，不阻塞）
   * 在 keyEvent 记录后调用
   * PoC 阶段为空实现
   */
  triggerAIPregenerate(
    _sourceName: string,
    _targetName: string,
    _memory: RelationshipMemory
  ): void {
    // PoC 阶段：空实现
    // 未来通过 AsyncAIBuffer 提交异步任务
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
