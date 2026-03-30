/**
 * 异步 AI 缓冲区 — Phase G0
 *
 * 设计：Fire-and-Forget + Deferred Correction
 *   - fallback 在当前 tick 立即执行（保证游戏流畅）
 *   - AI 调用异步发射，完成后存入 completedResults
 *   - ai-result-apply.handler 在下一 tick drain 结果，计算修正 delta 并应用
 *
 * 约束：
 *   - TTL 10s：超时结果自动丢弃（GC on drain）
 *   - 容量上限 50 pending：超限时最旧请求被驱逐
 *   - key 去重：同一 event+disciple 不重复提交
 *
 * @see SOUL-VISION-ROADMAP.md Phase G, G0
 * @see TD-006: AI 调用不阻塞 Tick
 */

import type { SoulEvaluationResult } from '../shared/types/soul';

/** AI 请求的 fallback 快照，用于计算修正 delta */
export interface FallbackSnapshot {
  /** fallback 产出的评估结果 */
  result: SoulEvaluationResult;
  /** 弟子 ID */
  discipleId: string;
  /** 事件时间戳（用于 TTL） */
  timestamp: number;
}

/** 已完成的 AI 结果条目 */
export interface CompletedAIResult {
  /** 去重 key: `${timestamp}:${discipleId}` */
  key: string;
  /** AI 返回的评估结果 */
  aiResult: SoulEvaluationResult;
  /** 对应的 fallback 快照 */
  fallbackSnapshot: FallbackSnapshot;
  /** 完成时间戳 */
  completedAt: number;
}

/** TTL 毫秒数 — 超时自动丢弃 */
const TTL_MS = 10_000;

/** 最大 pending 请求数 */
const MAX_PENDING = 50;

export class AsyncAIBuffer {
  /** 进行中的请求 key 集合（防重复提交） */
  private pendingKeys = new Set<string>();

  /** 已完成等待 drain 的结果队列 */
  private completedResults: CompletedAIResult[] = [];

  /**
   * 提交异步 AI 请求
   *
   * @param key 去重 key，格式 `${timestamp}:${discipleId}`
   * @param aiPromise AI 调用的 Promise（由 SoulEvaluator 发起）
   * @param fallbackSnapshot fallback 快照（用于修正 delta 计算）
   */
  submit(
    key: string,
    aiPromise: Promise<SoulEvaluationResult>,
    fallbackSnapshot: FallbackSnapshot,
  ): void {
    // 去重
    if (this.pendingKeys.has(key)) return;

    // 容量驱逐（FIFO：移除最早的 pending）
    if (this.pendingKeys.size >= MAX_PENDING) {
      const oldest = this.pendingKeys.values().next().value;
      if (oldest !== undefined) {
        this.pendingKeys.delete(oldest);
      }
    }

    this.pendingKeys.add(key);

    aiPromise
      .then(aiResult => {
        this.completedResults.push({
          key,
          aiResult,
          fallbackSnapshot,
          completedAt: Date.now(),
        });
      })
      .catch(() => {
        // AI 失败 → 静默丢弃，fallback 已生效
      })
      .finally(() => {
        this.pendingKeys.delete(key);
      });
  }

  /**
   * 排空已完成结果（每 tick 调用一次）
   *
   * 自动执行 TTL GC：丢弃超时结果
   */
  drain(): CompletedAIResult[] {
    const now = Date.now();
    // TTL 过滤
    const valid = this.completedResults.filter(
      r => now - r.fallbackSnapshot.timestamp <= TTL_MS,
    );
    this.completedResults = [];
    return valid;
  }

  /** 当前 pending 数量（调试/监控用） */
  get pendingCount(): number {
    return this.pendingKeys.size;
  }

  /** 当前 completed 待 drain 数量（调试/监控用） */
  get completedCount(): number {
    return this.completedResults.length;
  }
}
