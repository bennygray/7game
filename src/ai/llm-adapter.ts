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
import type { DialogueRequest, DialogueRound } from '../shared/types/dialogue';
import { generateFallbackLine } from './fallback-lines';
import { generateBystanderLine, generateResponseLine } from './bystander-lines';

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
  /** Phase D: 弟子间对话生成（最多 2 轮） */
  generateDialogue(req: DialogueRequest): Promise<DialogueRound[]>;
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

  async generateDialogue(_req: DialogueRequest): Promise<DialogueRound[]> {
    // HTTP 对话接口预留，当前直接抛出让 SmartAdapter 走 fallback
    throw new Error('HTTP dialogue not implemented');
  }
}

// ===== Fallback 适配器（模板台词） =====

class FallbackLLMAdapter implements LLMAdapter {
  async generateLine(req: GenerateRequest): Promise<string> {
    return generateFallbackLine(req.behavior, req.personality);
  }

  async generateDialogue(req: DialogueRequest): Promise<DialogueRound[]> {
    const rounds: DialogueRound[] = [];

    // 第 1 轮：旁观者评论
    const bystanderLine = generateBystanderLine(
      req.triggerEvent.outcomeTag,
      req.responder.personality,
    );
    if (!bystanderLine) return [];
    rounds.push({ speakerId: req.responder.id, line: bystanderLine, round: 1 });

    // 第 2 轮：触发者回应
    const responseLine = generateResponseLine(
      req.triggerEvent.outcomeTag,
      req.source.personality,
    );
    if (responseLine) {
      rounds.push({ speakerId: req.source.id, line: responseLine, round: 2 });
    }

    return rounds;
  }
}

// ===== Smart 适配器（HTTP 优先，失败自动 fallback） =====

class SmartLLMAdapter implements LLMAdapter {
  private http: HttpLLMAdapter;
  private fallback: FallbackLLMAdapter;
  /** 默认 false — 后端未确认可用时始终走 fallback，零网络请求 */
  private backendAvailable = false;

  constructor(baseUrl?: string) {
    this.http = new HttpLLMAdapter(baseUrl);
    this.fallback = new FallbackLLMAdapter();
  }

  async generateLine(req: GenerateRequest): Promise<string> {
    // 后端未确认可用 → 始终 fallback，零网络请求
    if (!this.backendAvailable) {
      return this.fallback.generateLine(req);
    }

    try {
      const line = await this.http.generateLine(req);
      return line;
    } catch {
      // 后端掉线 → 切回 fallback
      this.backendAvailable = false;
      console.warn('[LLM] 后端断开，切换到 fallback 模式');
      return this.fallback.generateLine(req);
    }
  }

  /** 手动连接后端（由 main.ts 的 'ai-connect' 命令调用） */
  async tryConnect(): Promise<boolean> {
    try {
      await fetch(`${this.http['baseUrl']}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      this.backendAvailable = true;
      console.log('[LLM] 后端连接成功，切换到 AI 模式');
      return true;
    } catch {
      console.log('[LLM] 后端不可用，保持 fallback 模式');
      return false;
    }
  }

  async generateDialogue(req: DialogueRequest): Promise<DialogueRound[]> {
    // 对话始终使用 fallback（Phase D 测试阶段，后续接入 HTTP）
    return this.fallback.generateDialogue(req);
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
