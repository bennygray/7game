/**
 * 事件总线 — 发布-订阅模式
 *
 * Phase E: 弟子行为结束 → SoulEvent 发布 → soul-event.handler 消费
 *
 * ADR-E01: 选择 EventBus（发布-订阅）而非直接调用 soul-engine，
 * 保持 intent-executor 与 soul-engine 解耦。
 *
 * ADR-E03: EventBus 通过 TickContext 注入，生命周期与 tick 绑定。
 *
 * @see phaseE-TDD.md Step 3.2
 * @see Story #2
 */

import type { SoulEventType } from '../shared/types/soul';

// ===== 事件数据结构 =====

/** 灵魂事件 — tick 内发布，soul-event.handler 消费 */
export interface SoulEvent {
  /** 事件类型 */
  type: SoulEventType;
  /** 执行行为的弟子 ID（事件主角） */
  actorId: string;
  /** 事件发生时间戳 */
  timestamp: number;
  /** 额外元数据（炼丹品质等） */
  metadata?: Record<string, unknown>;
}

// ===== EventBus 类 =====

/**
 * 事件总线 — tick 内 FIFO 队列
 *
 * 生命周期：每次 tick 创建（由 IdleEngine 注入到 TickContext），
 * tick 结束后由 soul-event.handler drain 消费。
 *
 * Story #2 AC4: 同一 tick 内多事件按顺序处理
 */
export class EventBus {
  private queue: SoulEvent[] = [];

  /**
   * 发布灵魂事件（由 intent-executor 在 end-behavior 时调用）
   * Story #2 AC1
   */
  emit(event: SoulEvent): void {
    this.queue.push(event);
  }

  /**
   * 排空队列并返回所有事件（由 soul-event.handler 调用）
   * Story #2 AC4: 顺序保证
   */
  drain(): SoulEvent[] {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }

  /**
   * 查看队列长度（调试/测试用）
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 清空队列（测试重置用）
   */
  clear(): void {
    this.queue = [];
  }
}
