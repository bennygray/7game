# Phase Y 后端 Review 修复追踪

> **创建日期**: 2026-03-31
> **来源**: `docs/pipeline/phaseY/backend-code-review.md`
> **状态**: V0.4.9 前置修复已交付（11/14 项完成），剩余 3 项低优先级

---

## 修复清单

### Phase Y 内修复（14 项）

#### 第一优先级 — 架构合规 + 安全

- [x] **P0-02**: 端点重命名 `/api/generate` → `/api/infer` ✅ V0.4.9
  - 文件: `server/ai-server.ts`, `src/ai/llm-adapter.ts`, `server/tests/ai-stress-test.ts`

- [x] **P0-03**: CORS 限制为 localhost only ✅ V0.4.9
  - 文件: `server/ai-server.ts`（白名单: 5173/4173/3000）

- [x] **P2-03**: POST 端点输入校验（必需字段检查，缺失返回 400） ✅ V0.4.9
  - 文件: `server/ai-server.ts`（JSON.parse 捕获 + discipleName/personalityName/behavior 类型检查）

- [x] **P2-05**: SmartLLMAdapter `tryConnect()` 委托给 `this.http.tryConnect()` ✅ V0.4.9
  - 文件: `src/ai/llm-adapter.ts`

#### 第二优先级 — 稳定性

- [x] **P1-02**: llama-server 崩溃自动重启（延迟 5s，最多 3 次） ✅ V0.4.9
  - 文件: `server/ai-server.ts`（MAX_RESTARTS=3, RESTART_DELAY_MS=5000）

- [x] **P1-01**: `parseBody()` 添加 64KB body 大小限制 ✅ V0.4.9
  - 文件: `server/ai-server.ts`（MAX_BODY_SIZE=65536，超限返回 413）

- [x] **P1-03**: Windows SIGTERM 兼容（平台检测） ✅ V0.4.9
  - 文件: `server/ai-server.ts`（Windows 下 kill() 无参数）

- [x] **P1-04**: HTTP server 优雅关闭 ✅ V0.4.9
  - 文件: `server/ai-server.ts`（cleanup 中加 server.close() + SIGINT/SIGTERM 监听）

#### 第三优先级 — 代码质量

- [x] **P2-02**: 移除 `node-llama-cpp` 未使用依赖 ✅ V0.4.9
  - 已从 package.json + package-lock.json 移除

- [x] **P2-01**: 下载脚本重定向深度限制（默认 5） ✅ V0.4.9
  - 文件: `server/download-model.ts`（MAX_REDIRECTS=5）

- [x] **P2-04**: `presence_penalty` 1.8 → 1.0 ✅ V0.4.9
  - 文件: `server/ai-server.ts`

#### 第四优先级 — 可选

- [ ] **P3-01**: llama-server 端口改为 18080 — 低优先级
- [ ] **P3-02**: 补充功能测试 → 延后
- [ ] **P3-03**: 请求 ID 日志 → 延后

---

### Phase Z 独立处理（1 项）

- [ ] **P0-01**: SoulEvaluator 绕过 ai-server 直连 llama-server
  - 见 `docs/pipeline/phaseZ/spm-analysis.md`

---

## 执行记录

### V0.4.9 前置修复 (`01bd78e`) — 2026-03-31

**修改文件**（11 文件）:
- `server/ai-server.ts` — CORS/端点/校验/崩溃恢复/shutdown/SIGTERM/body限制
- `src/ai/llm-adapter.ts` — tryConnect 委托 + 端点更新
- `server/tests/ai-stress-test.ts` — 端点更新
- `server/download-model.ts` — 重定向深度限制
- `package.json` / `package-lock.json` — 移除 node-llama-cpp
- `src/main.ts` / `src/ui/command-handler.ts` / `src/ui/engine-bindings.ts` / `src/ui/log-manager.ts` / `src/engine/idle-engine.ts` — 前端修复

**验证**: `tsc --noEmit` 零错误，`npm run test:regression` 64/64 通过

**完成**: 11/14 项（3 项低优先级延后）
