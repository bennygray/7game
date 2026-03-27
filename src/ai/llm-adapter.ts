/**
 * LLM 适配层 — 前端 AI 接口抽象
 *
 * SmartAdapter: 先尝试 HTTP 调后端，失败自动 fallback 到模板台词。
 * 迁移 Electron 后只需替换 HttpAdapter → IpcAdapter。
 *
 * @see Story #5 ACs
 * @see 7game-lite-analysis.md Step 4 (B 方案)
 */

import type { PersonalityTraits, DiscipleBehavior } from '../shared/types/game-state';
import { generateFallbackLine } from './fallback-lines';

// ===== 请求/响应结构 =====

export interface GenerateRequest {
  discipleId: string;
  discipleName: string;
  personality: PersonalityTraits;
  personalityName: string;
  behavior: DiscipleBehavior;
  shortTermMemory: string[];
  starRating: number;
  realm: number;
  subRealm: number;
}

// ===== 适配器接口 =====

export interface LLMAdapter {
  generateLine(req: GenerateRequest): Promise<string>;
}

// ===== HTTP 适配器（调后端 API） =====

class HttpLLMAdapter implements LLMAdapter {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl = 'http://localhost:3001', timeoutMs = 5000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async generateLine(req: GenerateRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as { line: string };
      return data.line;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ===== Fallback 适配器（模板台词） =====

class FallbackLLMAdapter implements LLMAdapter {
  async generateLine(req: GenerateRequest): Promise<string> {
    return generateFallbackLine(req.behavior, req.personality);
  }
}

// ===== Smart 适配器（HTTP 优先，失败自动 fallback） =====

class SmartLLMAdapter implements LLMAdapter {
  private http: HttpLLMAdapter;
  private fallback: FallbackLLMAdapter;
  private backendAvailable: boolean | null = null;
  private lastCheckTime = 0;
  /** 后端不可用时的重试间隔（ms） */
  private static readonly RETRY_INTERVAL_MS = 30_000;

  constructor(baseUrl?: string) {
    this.http = new HttpLLMAdapter(baseUrl);
    this.fallback = new FallbackLLMAdapter();
  }

  async generateLine(req: GenerateRequest): Promise<string> {
    // 如果已知后端不可用且未过重试间隔 → 直接 fallback
    if (this.backendAvailable === false) {
      const elapsed = Date.now() - this.lastCheckTime;
      if (elapsed < SmartLLMAdapter.RETRY_INTERVAL_MS) {
        return this.fallback.generateLine(req);
      }
    }

    try {
      const line = await this.http.generateLine(req);
      this.backendAvailable = true;
      return line;
    } catch {
      // 后端不可用 → 标记 + fallback
      this.backendAvailable = false;
      this.lastCheckTime = Date.now();
      console.log('[LLMAdapter] 后端不可用，使用 fallback 模板台词');
      return this.fallback.generateLine(req);
    }
  }
}

// ===== 导出工厂 =====

/** 创建默认 LLM 适配器（Smart 模式） */
export function createLLMAdapter(backendUrl?: string): LLMAdapter {
  return new SmartLLMAdapter(backendUrl);
}

/** 创建纯 fallback 适配器（测试用） */
export function createFallbackAdapter(): LLMAdapter {
  return new FallbackLLMAdapter();
}
