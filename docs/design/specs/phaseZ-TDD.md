# Phase Z — AI 通信架构统一 · TDD

> **版本**: v1.0 | **创建日期**: 2026-03-31
> **前置**: Phase Z SPM 分析 (`docs/pipeline/phaseZ/spm-analysis.md`) GATE 1 已过

---

## 一、全局对齐

### 层级归属

| 变更 | 层级 | 文件 |
|------|------|------|
| callLlamaServer 通用化 + 结构化补全分支 | ⑤ Server (`server/`) | `server/ai-server.ts` |
| SoulEvaluator 路由统一 | ③ AI (`ai/`) | `src/ai/soul-evaluator.ts` |

### Invariant 验证

| 不变量 | 状态 |
|--------|------|
| GameState v5 | ✅ 不变 |
| 13 个 Tick Handler | ✅ 不修改 |
| SoulEvaluator 3 个公开方法签名 | ✅ 不变 |
| 前端 fallback 机制 | ✅ 不变 |
| llama-server 子进程管理 | ✅ 不变 |
| 存档迁移链 | ✅ 不变 |

### 架构约束修复

修复 MASTER-ARCHITECTURE X-2（UI 层禁止直调 server API）和 X-4（后端仅暴露 `/api/infer`）的隐式违规：
SoulEvaluator 当前直连 llama-server:8080，绕过 ai-server 网关。

---

## 二、Interface 设计

### 新增：LlamaRequestPayload（server/ai-server.ts）

```typescript
interface LlamaRequestPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature: number;
  top_p: number;
  response_format?: { type: 'json_schema'; json_schema: { name: string; strict: boolean; schema: object } };
  chat_template_kwargs?: Record<string, unknown>;
  top_k?: number;
  presence_penalty?: number;
}
```

### 变更：callLlamaServer 签名

```
旧: callLlamaServer(systemPrompt: string, userPrompt: string): Promise<string>
新: callLlamaServer(payload: LlamaRequestPayload, timeoutMs?: number): Promise<string>
```

### 变更：/api/infer 请求路由

```
检测 body.messages (Array) → 结构化补全分支（新）
检测 body.discipleName (string) → 台词生成分支（现有）
```

### 结构化补全请求/响应

```typescript
// 请求（body 含 messages[]）
{
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;      // 默认 200
  temperature?: number;     // 默认 0.6
  top_p?: number;           // 默认 0.9
  timeout_ms?: number;      // 客户端期望超时，默认 5000
  response_format?: { type: 'json_schema'; json_schema: object };
}

// 响应
{ content: string; parsed?: unknown }

// 错误
{ error: string; code?: 'MODEL_NOT_READY' | 'TIMEOUT' | 'INTERNAL' }
```

### 变更：SoulEvaluator.structuredCompletion

```
旧: fetch → llama-server:8080/v1/chat/completions → choices[0].message.content → JSON.parse
新: fetch → ai-server:3001/api/infer → { content, parsed } → 优先 parsed，fallback JSON.parse(content)
```

---

## 三、Pipeline 挂载

**无变更**。Phase Z 不新增 Handler，不修改 Tick Pipeline。

---

## 四、依赖矩阵变更

**无变更**。SoulEvaluator 仍依赖 ai-server，只是路径从 llama-server 改为 ai-server。

---

## 五、ADR

### ADR-Z-01: callLlamaServer 通用化策略

**背景**: callLlamaServer 原本硬编码 systemPrompt/userPrompt 两参数 + 固定的模型参数。结构化补全需要不同的参数组合。

**方案 A**: 新增独立函数 `callLlamaStructured()`
- 优点：不影响现有台词生成
- 缺点：HTTP 通信逻辑重复

**方案 B（采纳）**: 通用化 callLlamaServer 为 `(payload, timeoutMs)` 签名
- 优点：单一 HTTP 出口，复用连接/超时/错误处理
- 缺点：现有 generateWithModel 调用点需适配
- 理由：ai-server 内只有一个下游（llama-server），统一出口更易维护

### ADR-Z-02: 超时放宽

**背景**: SoulEvaluator Call1/Call2 原超时 800ms/700ms 是直连 llama-server 的值。经 ai-server 中转多一层 HTTP，需加 buffer。

**决策**: Call1 800→900ms，Call2 700→800ms（+100ms buffer）。ai-server 内部用 clientTimeout + 2000ms 作为 llama-server 超时，确保 ai-server 不会先于客户端超时。

---

## SGA Signoff

- [x] Interface 设计完整（LlamaRequestPayload + 请求路由 + 响应格式）
- [x] 迁移策略完整（零存档迁移）
- [x] Pipeline 挂载方案确认（无变更）
- [x] 依赖矩阵已更新（无变更）
- [x] Party Review：纯后端重构，2 文件，零 GameState/Pipeline 变更，风险极低
- [x] 技术债务已登记（无新增）

签章：`[x] GATE 2 PASSED` — 2026-03-31
