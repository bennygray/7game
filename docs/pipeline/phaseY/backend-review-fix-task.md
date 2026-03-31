# Phase Y 后端 Review 修复追踪

> **创建日期**: 2026-03-31
> **来源**: `docs/pipeline/phaseY/backend-code-review.md`
> **状态**: 待执行（Phase Y 统一修复）

---

## 修复清单

### Phase Y 内修复（14 项）

#### 第一优先级 — 架构合规 + 安全

- [ ] **P0-02**: 端点重命名 `/api/generate` → `/api/infer`
  - 文件: `server/ai-server.ts`, `src/ai/llm-adapter.ts`, `server/tests/ai-stress-test.ts`
  - 验证: `curl http://localhost:3001/api/infer` 返回结果

- [ ] **P0-03**: CORS 限制为 localhost only
  - 文件: `server/ai-server.ts`
  - 验证: 非 localhost origin 请求不返回 CORS 头

- [ ] **P2-03**: POST 端点输入校验（必需字段检查，缺失返回 400）
  - 文件: `server/ai-server.ts`
  - 验证: 发送空 body / 缺少 discipleName 返回 400

- [ ] **P2-05**: SmartLLMAdapter `tryConnect()` 委托给 `this.http.tryConnect()`
  - 文件: `src/ai/llm-adapter.ts`
  - 验证: `tsc --noEmit` 零错误

#### 第二优先级 — 稳定性

- [ ] **P1-02**: llama-server 崩溃自动重启（延迟 5s，最多 3 次）
  - 文件: `server/ai-server.ts`
  - 验证: 手动 kill llama-server PID，观察 5s 后重启日志

- [ ] **P1-01**: `parseBody()` 添加 64KB body 大小限制
  - 文件: `server/ai-server.ts`
  - 验证: 发送 >64KB body 返回 413

- [ ] **P1-03**: Windows SIGTERM 兼容（不传参数或检测平台）
  - 文件: `server/ai-server.ts`
  - 验证: Windows 下关闭 ai-server 后无孤儿 llama-server 进程

- [ ] **P1-04**: HTTP server 优雅关闭（cleanup 中加 `server.close()`）
  - 文件: `server/ai-server.ts`
  - 验证: 关闭后端口释放，无 EADDRINUSE

#### 第三优先级 — 代码质量

- [ ] **P2-02**: 移除 `node-llama-cpp` 未使用依赖
  - 命令: `npm uninstall node-llama-cpp`
  - 验证: `npm run build` 通过

- [ ] **P2-01**: 下载脚本重定向深度限制（默认 5）
  - 文件: `server/download-model.ts`
  - 验证: 代码审查确认

- [ ] **P2-04**: `presence_penalty` 调参（标记需测试）
  - 文件: `server/ai-server.ts`
  - 验证: 启动 AI 后对比生成质量

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

> 修复完成后在此记录：修改文件、验证结果、commit hash

（待 Phase Y 执行时填写）
