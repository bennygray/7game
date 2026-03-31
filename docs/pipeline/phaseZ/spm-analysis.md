# Phase Z — AI 通信架构统一 · SPM 分析

> **创建日期**: 2026-03-31
> **触发**: 后端 Code Review 发现 P0-01 架构违规（SoulEvaluator 绕过 ai-server）
> **来源**: `docs/pipeline/phaseY/backend-code-review.md` P0-01
> **目标**: 统一 AI 通信路径，所有前端 AI 调用走 ai-server:3001

---

## 一、问题描述

### 现状

当前 AI 推理有**两条独立的通信路径**：

```
路径 A (台词生成):
  前端 SmartLLMAdapter → HTTP POST → ai-server:3001 /api/generate → llama-server:8080

路径 B (灵魂评估):
  前端 SoulEvaluator → HTTP POST → llama-server:8080 /v1/chat/completions (直连)
```

### 问题

1. **架构违规**: CLAUDE.md 明确要求「前端通过 LLMAdapter 接口调用后端，UI 层不得直接 fetch」和「后端仅暴露 `/api/infer` 端点」
2. **资源竞争**: llama-server 以 `-np 1`（单并发）运行，两条路径的请求竞争同一推理槽，可能导致排队和超时
3. **管理分裂**: ai-server 的健康检查、日志、错误处理、崩溃恢复机制被路径 B 完全绕过
4. **端口耦合**: SoulEvaluator 硬编码 `127.0.0.1:8080`，如果 llama-server 端口变更需要同步修改两处

### 影响范围

| 文件 | 当前行为 | 需要变更 |
|------|---------|---------|
| `src/ai/soul-evaluator.ts` | 直连 llama-server:8080 | 改走 ai-server:3001 |
| `server/ai-server.ts` | 只有 `/api/generate` 端点 | 新增结构化补全端点 |
| `src/main.ts` | SoulEvaluator 独立实例化 | 通过统一入口初始化 |
| `src/engine/handlers/soul-event.handler.ts` | 使用 SoulEvaluator 直调 | 可能需要适配接口 |

---

## 二、目标架构

```
统一路径:
  前端 (LLMAdapter / SoulEvaluator)
    → HTTP POST → ai-server:3001 /api/infer
      → ai-server 内部 → llama-server:8080 /v1/chat/completions

ai-server 成为唯一网关:
  - 统一健康检查
  - 统一日志记录
  - 统一错误处理
  - 统一崩溃恢复
  - 统一推理队列（串行保证）
```

---

## 三、方案设计

### 核心变更

1. **ai-server 新增结构化补全端点** `POST /api/infer`
   - 接收 messages + JSON schema + 超时配置
   - 内部转发到 llama-server `/v1/chat/completions`
   - 返回解析后的 JSON 结果

2. **SoulEvaluator 改走 ai-server**
   - `baseUrl` 从 `http://127.0.0.1:8080` 改为 `http://localhost:3001`
   - `structuredCompletion()` 调 `/api/infer` 而非直调 `/v1/chat/completions`
   - `tryConnect()` 调 `/api/health` 而非 `/v1/models`

3. **推理队列管理**
   - ai-server 内部维护串行队列（当前 `-np 1` 已隐式串行）
   - 显式排队 + 超时拒绝，避免请求堆积

### `/api/infer` 端点接口设计

```typescript
// 请求
interface InferRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens?: number;       // 默认 200
  temperature?: number;      // 默认 0.6
  top_p?: number;            // 默认 0.9
  response_format?: {        // 可选 JSON schema 约束
    type: 'json_schema';
    json_schema: { name: string; strict: boolean; schema: object };
  };
  timeout_ms?: number;       // 客户端期望超时，默认 5000
}

// 响应
interface InferResponse {
  content: string;           // 原始生成内容（已清理 <think> 标签）
  parsed?: unknown;          // 如果有 response_format，尝试 JSON.parse 后的结果
}

// 错误
interface InferError {
  error: string;
  code: 'MODEL_NOT_READY' | 'TIMEOUT' | 'PARSE_ERROR' | 'INTERNAL';
}
```

---

## 四、不变量

- GameState v5 不变，零存档迁移
- 13 个 Tick Handler 不修改
- 64 组回归测试不受影响
- SoulEvaluator 的 3 个评估方法签名不变（evaluateEmotion / evaluateMonologue / evaluateDecisionAndMonologue）
- 前端 fallback 机制不变（AI 不可用时走模板）
- llama-server 子进程管理不变（ai-server 仍然 spawn）

---

## 五、风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 推理延迟增加（多一层 HTTP） | P95 +20~50ms | 本机通信延迟极低，可接受 |
| 超时参数需重新调优 | Call1/Call2 的 800ms/700ms 可能不够 | 预留 buffer，适当放宽到 1000ms/900ms |
| ai-server 成为单点 | 所有 AI 调用依赖 ai-server | 已有 fallback 机制保底 |
| 接口设计需兼容两种调用模式 | 台词生成 vs 结构化补全 | `/api/infer` 统一接口，response_format 可选 |

---

## 六、前置条件

- Phase Y 完成后再启动 Phase Z（Phase Y 的端点重命名为 Phase Z 铺路）
- Phase Y 完成 ESLint 覆盖 server/（Phase Z 改动需要 lint 保护）

---

## 七、参考文件

- 后端 Review 报告: `docs/pipeline/phaseY/backend-code-review.md` P0-01
- 现有 SoulEvaluator: `src/ai/soul-evaluator.ts`
- 现有 ai-server: `server/ai-server.ts`
- 架构约束: `CLAUDE.md` 前端↔后端通信约束
- AI 层约束: `CLAUDE.md` AI 层专项约束
