# Phase Z — 完成总结

> **完成日期**: 2026-03-31
> **版本**: V0.4.13

---

## 概述

Phase Z 统一了 AI 通信路径，修复了 SoulEvaluator 绕过 ai-server 直连 llama-server:8080 的架构违规。

## 变更要点

### server/ai-server.ts
1. `callLlamaServer` 从 `(systemPrompt, userPrompt)` 通用化为 `(payload: LlamaRequestPayload, timeoutMs)`
2. `/api/infer` 端点新增结构化补全分支（按 `body.messages` 检测路由）
3. 新增 Timeout (504) 错误处理和 error code 字段

### src/ai/soul-evaluator.ts
1. 默认连接 `localhost:3001`（ai-server）而非 `127.0.0.1:8080`（llama-server）
2. `tryConnect()` 调用 `/api/health` 而非 `/v1/models`
3. `structuredCompletion()` 调用 `/api/infer` 而非 `/v1/chat/completions`
4. 响应解析改为 `{ content, parsed }` 格式，优先使用服务端已解析结果
5. Call1/Call2 超时各 +100ms buffer

## 架构改善

```
旧: SoulEvaluator → llama-server:8080 (直连，绕过网关)
新: SoulEvaluator → ai-server:3001/api/infer → llama-server:8080 (统一网关)
```

ai-server 成为所有 AI 调用的唯一入口，统一健康检查、日志、错误处理和崩溃恢复。
