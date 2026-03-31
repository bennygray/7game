# Phase Z — 执行追踪

> **创建日期**: 2026-03-31

---

## 任务清单

| # | 任务 | 文件 | 状态 |
|---|------|------|:----:|
| Z-1 | callLlamaServer 通用化（payload 签名） | `server/ai-server.ts` | ✅ |
| Z-2 | generateWithModel 调用点适配 | `server/ai-server.ts` | ✅ |
| Z-3 | /api/infer 新增结构化补全分支 | `server/ai-server.ts` | ✅ |
| Z-4 | 新增 Timeout (504) + error code 错误处理 | `server/ai-server.ts` | ✅ |
| Z-5 | SoulEvaluator 默认 URL 改为 ai-server:3001 | `src/ai/soul-evaluator.ts` | ✅ |
| Z-6 | tryConnect 改走 /api/health | `src/ai/soul-evaluator.ts` | ✅ |
| Z-7 | structuredCompletion 改走 /api/infer + 响应解析 | `src/ai/soul-evaluator.ts` | ✅ |
| Z-8 | Call1/Call2 超时放宽 (+100ms buffer) | `src/ai/soul-evaluator.ts` | ✅ |

## 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | ✅ 零错误 |
| `npm run lint` | ✅ 零新增 error（existing warnings only） |
| `npm run test:regression` | ✅ 64/64 通过 |
| 架构验证：soul-evaluator.ts 无 8080/v1 | ✅ 确认 |
