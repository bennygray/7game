# Phase Z — 实施计划

> **创建日期**: 2026-03-31
> **前置**: SPM ✅ GATE 1 | SGA ✅ GATE 2

---

## 变更清单

### 文件 1: `server/ai-server.ts`

1. 新增 `LlamaRequestPayload` 接口
2. `callLlamaServer` 签名改为 `(payload: LlamaRequestPayload, timeoutMs?: number)`
3. `generateWithModel` 内调用适配为构造 payload 对象
4. `/api/infer` 端点新增结构化补全分支：
   - 检测 `body.messages` (Array) → 结构化补全
   - 检测 `body.discipleName` (string) → 台词生成（现有）
5. 结构化补全分支：model 校验 → 参数提取 → 构造 payload → callLlamaServer → 清理 think 标签 → 尝试 JSON.parse → 返回 `{ content, parsed }`
6. 错误处理新增 Timeout (504) + error code 字段

### 文件 2: `src/ai/soul-evaluator.ts`

1. 构造函数默认 URL: `http://127.0.0.1:8080` → `http://localhost:3001`
2. `tryConnect()`: `/v1/models` → `/api/health`
3. `structuredCompletion()`:
   - 载荷移除 `model`、`chat_template_kwargs`，新增 `timeout_ms`
   - 端点 `/v1/chat/completions` → `/api/infer`
   - 响应解析从 `choices[0].message.content` 改为 `{ content, parsed }`
4. `evaluateDecisionAndMonologue` 超时放宽: Call1 800→900ms, Call2 700→800ms

## 验证计划

1. `npx tsc --noEmit` — 零错误
2. `npm run lint` — 零错误
3. `npm run test:regression` — 64/64 通过
4. 架构验证：grep 确认 soul-evaluator.ts 不含 `8080` 或 `/v1/`
