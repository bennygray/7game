# Phase Y 后端 Review 修复追踪

> **创建日期**: 2026-03-31
> **更新日期**: 2026-03-31（同步 V0.4.9 实际代码状态）
> **来源**: `docs/pipeline/phaseY/backend-code-review.md`
> **状态**: ✅ 11/14 项已修复（V0.4.9），3 项低优先级延后

---

## 修复清单

### Phase Y 内修复（14 项）

#### 第一优先级 — 架构合规 + 安全

- [x] **P0-02**: 端点重命名 `/api/generate` → `/api/infer` — ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:392`, `src/ai/llm-adapter.ts:56`, `server/tests/ai-stress-test.ts:37`
  - 验证: 三处均已使用 `/api/infer`

- [x] **P0-03**: CORS 限制为 localhost only — ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:349-365` `ALLOWED_ORIGINS` 白名单 + `getCorsHeaders()` 过滤
  - 验证: 非 localhost origin 不返回 `Access-Control-Allow-Origin` 头

- [x] **P2-03**: POST 端点输入校验（必需字段检查，缺失返回 400）— ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:404-411` 校验 `discipleName`/`personalityName`/`behavior`
  - 验证: JSON.parse 失败→400 Invalid JSON；字段缺失→400 Missing required fields

- [x] **P2-05**: SmartLLMAdapter `tryConnect()` 委托给 `this.http.tryConnect()` — ✅ V0.4.9 已修复
  - 文件: `src/ai/llm-adapter.ts:153-154` 已委托，无下标访问
  - 验证: 零 `['baseUrl']` 绕过私有属性

#### 第二优先级 — 稳定性

- [x] **P1-02**: llama-server 崩溃自动重启（延迟 5s，最多 3 次）— ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:32-35,297-312` `restartCount` + `MAX_RESTARTS=3` + `RESTART_DELAY_MS=5000`
  - 验证: exit 事件中有延迟重启逻辑，重启成功后计数器归零

- [x] **P1-01**: `parseBody()` 添加 64KB body 大小限制 — ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:328-346` `MAX_BODY_SIZE=65536`，超限 `req.destroy()` + 413
  - 验证: catch `Payload too large` → 返回 413

- [x] **P1-03**: Windows SIGTERM 兼容（不传参数或检测平台）— ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:444-448` `process.platform === 'win32'` → `.kill()` 无参数
  - 验证: Windows 上使用 TerminateProcess，非 Windows 使用 SIGTERM

- [x] **P1-04**: HTTP server 优雅关闭（cleanup 中加 `server.close()`）— ✅ V0.4.9 已修复
  - 文件: `server/ai-server.ts:451-453` `server.close()` + 关闭日志
  - 验证: cleanup 中先 kill llama-server，再 close HTTP server

#### 第三优先级 — 代码质量

- [x] **P2-02**: 移除 `node-llama-cpp` 未使用依赖 — ✅ V0.4.9 已修复
  - 验证: `package.json` 中已无 `node-llama-cpp` 依赖

- [x] **P2-01**: 下载脚本重定向深度限制（默认 5）— ✅ V0.4.9 已修复
  - 文件: `server/download-model.ts:39-46` `MAX_REDIRECTS=5`，`depth` 参数递增
  - 验证: 超过 5 次重定向抛出 Error

- [x] **P2-04**: `presence_penalty` 调参 — ✅ V0.4.9 已修复（1.8 → 1.0）
  - 文件: `server/ai-server.ts:140` 已降至 `1.0`
  - 验证: 在 OpenAI 推荐范围内 (0.6-1.2)

#### 第四优先级 — 可选

- [ ] **P3-01**: llama-server 端口改为 18080
  - 文件: `server/ai-server.ts`
  - 验证: `npm run ai` 启动正常

- [ ] **P3-02**: 补充功能测试 → 延后
- [ ] **P3-03**: 请求 ID 日志 → 延后

---

### Phase Z 独立处理（1 项）

- [ ] **P0-01**: SoulEvaluator 绕过 ai-server 直连 llama-server
  - 见 `docs/pipeline/phaseZ/spm-analysis.md`

---

## 执行记录

- **V0.4.9** (`01bd78e`): 11/14 项已修复（P0×2 + P1×4 + P2×5），同步于 Phase X Review 修复批次
- **遗留**: P3-01/02/03 为低优先级，按需处理
- **Phase Z**: P0-01 SoulEvaluator 架构统一仍待独立处理
