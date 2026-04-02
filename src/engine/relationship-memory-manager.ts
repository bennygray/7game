/**
 * Phase IJ v3.0: 关系记忆管理器
 *
 * 运行时内存存储（PoC 不持久化）。
 * 按 pairKey (`sourceId:targetId`) 索引 RelationshipMemory。
 *
 * 双写策略（ADR-IJ-03）：旧路径不变 + 本管理器并行记录。
 */
import type { RelationshipEdge } from '../shared/types/game-state';
import type {
  RelationshipMemory,
  KeyRelationshipEvent,
  ContextLevel,
} from '../shared/types/relationship-memory';
import {
  makePairKey,
  EVENT_THRESHOLD,
  KEY_EVENTS_SOFT_LIMIT,
  CONTRADICTION_TICK_WINDOW,
} from '../shared/types/relationship-memory';

export class RelationshipMemoryManager {
  /** 运行时内存存储（页面刷新即清空） */
  private memories: Map<string, RelationshipMemory> = new Map();

  // ===== 写入 API =====

  /**
   * 记录关键事件（含矛盾覆盖）
   * 仅当 |closenessDelta| >= EVENT_THRESHOLD 时调用
   */
  recordEvent(
    sourceId: string,
    targetId: string,
    event: KeyRelationshipEvent
  ): void {
    if (Math.abs(event.closenessDelta) < EVENT_THRESHOLD) return;

    const memory = this.getOrCreate(sourceId, targetId);

    // R-M03: 矛盾覆盖（同类事件 ≤50 tick 内替换）
    const existingIdx = memory.keyEvents.findIndex(
      (e) =>
        Math.abs(e.tick - event.tick) <= CONTRADICTION_TICK_WINDOW &&
        this.isSameType(e, event)
    );

    if (existingIdx >= 0) {
      memory.keyEvents[existingIdx] = event;
    } else {
      memory.keyEvents.push(event);
    }

    // 淘汰：超过上限时移除 |closenessDelta| 最小的
    while (memory.keyEvents.length > KEY_EVENTS_SOFT_LIMIT) {
      let minIdx = 0;
      let minDelta = Math.abs(memory.keyEvents[0].closenessDelta);
      for (let i = 1; i < memory.keyEvents.length; i++) {
        const d = Math.abs(memory.keyEvents[i].closenessDelta);
        if (d < minDelta || (d === minDelta && memory.keyEvents[i].tick < memory.keyEvents[minIdx].tick)) {
          minDelta = d;
          minIdx = i;
        }
      }
      memory.keyEvents.splice(minIdx, 1);
    }
  }

  /** 更新碰面统计 */
  recordEncounter(sourceId: string, targetId: string, tick: number): void {
    const memory = this.getOrCreate(sourceId, targetId);
    memory.encounterCount++;
    memory.lastEncounterTick = tick;
  }

  /** 更新对话统计 */
  recordDialogue(sourceId: string, targetId: string, tick: number): void {
    const memory = this.getOrCreate(sourceId, targetId);
    memory.dialogueCount++;
    // 对话也算碰面
    memory.lastEncounterTick = tick;
  }

  /** v3.0: 更新 narrative snippet 缓存 */
  updateNarrativeSnippet(
    sourceId: string,
    targetId: string,
    snippet: string
  ): void {
    const memory = this.getOrCreate(sourceId, targetId);
    memory.narrativeSnippet = snippet;
  }

  // ===== 读取 API =====

  /** 获取 A→B 的关系记忆（不存在则返回 null） */
  getMemory(sourceId: string, targetId: string): RelationshipMemory | null {
    return this.memories.get(makePairKey(sourceId, targetId)) ?? null;
  }

  /** 从 RelationshipEdge 同步 closeness/attraction/trust/tags */
  syncFromEdge(edge: RelationshipEdge): void {
    const memory = this.getOrCreate(edge.sourceId, edge.targetId);
    memory.closeness = edge.closeness;
    memory.attraction = edge.attraction;
    memory.trust = edge.trust;
    memory.tags = [...edge.tags];
  }

  /**
   * 构建 Prompt 用的关系摘要文本
   * 输出格式由 contextLevel 决定（L2 或 L6）
   */
  buildRelationshipSummary(
    sourceId: string,
    targetId: string,
    targetName: string,
    contextLevel: ContextLevel
  ): string | null {
    if (contextLevel === 'L0') return null;

    const memory = this.getMemory(sourceId, targetId);
    if (!memory) return null;

    const tagsStr = memory.tags.length > 0 ? `（${memory.tags.join('/')}）` : '';
    const lines: string[] = [
      `【与${targetName}的关系】`,
      `亲疏：${memory.closeness} 吸引：${memory.attraction} 信赖：${memory.trust}${tagsStr}`,
    ];

    // 按 |closenessDelta| 降序排列
    const sorted = [...memory.keyEvents].sort(
      (a, b) => Math.abs(b.closenessDelta) - Math.abs(a.closenessDelta)
    );

    if (contextLevel === 'L2') {
      // L2: 三维数值+标签+1条关键事件
      if (sorted.length > 0) {
        const e = sorted[0];
        lines.push(`关键经历：${e.content}(${e.closenessDelta > 0 ? '+' : ''}${e.closenessDelta})`);
      }
    } else {
      // L6: +top3事件 +narrative snippet +个人近况
      if (sorted.length > 0) {
        const top3 = sorted.slice(0, 3);
        const eventsStr = top3
          .map((e) => `${e.content}(${e.closenessDelta > 0 ? '+' : ''}${e.closenessDelta})`)
          .join('；');
        lines.push(`关键经历：${eventsStr}`);
      }
      if (memory.narrativeSnippet) {
        lines.push(memory.narrativeSnippet);
      }
    }

    return lines.join('\n');
  }

  // ===== 内部 =====

  /** 获取或创建关系记忆 */
  private getOrCreate(sourceId: string, targetId: string): RelationshipMemory {
    const key = makePairKey(sourceId, targetId);
    let memory = this.memories.get(key);
    if (!memory) {
      memory = {
        sourceId,
        targetId,
        closeness: 0,
        attraction: 0,
        trust: 0,
        tags: [],
        keyEvents: [],
        encounterCount: 0,
        lastEncounterTick: 0,
        dialogueCount: 0,
      };
      this.memories.set(key, memory);
    }
    return memory;
  }

  /**
   * R-M03: 判断两个事件是否"同类型"
   * 同类 = 同 content 前缀（取前 4 字符）
   */
  private isSameType(a: KeyRelationshipEvent, b: KeyRelationshipEvent): boolean {
    const prefixLen = 4;
    return a.content.substring(0, prefixLen) === b.content.substring(0, prefixLen);
  }
}
