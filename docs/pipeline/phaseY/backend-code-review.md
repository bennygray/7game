# Phase Y 后端代码质量 Review 报告

> **审查范围**: 后端 AI 推理服务 + 前端 AI 适配层（5 文件，~1303 行 TS）
> **审查日期**: 2026-03-31
> **审查方式**: 逐行人工 Review，对照 CLAUDE.md 编码规范 + AGENTS.md 架构约束
> **结论**: 发现 **15 项问题**（P0×3 / P1×4 / P2×5 / P3×3），整体评级 **B-**
> **修复状态**: V0.4.9 (`01bd78e`) 已修复 11/15 项，剩余 4 项（1→Phase Z，3 低优先级）。修复后评级 **B+**

---

## 一、总评

后端代码量不大（5 文件 ~1300 行），核心推理逻辑设计合理（SmartAdapter 三层降级、SoulEvaluator 结构化补全），
但在架构合规、稳定性防护、输入校验方面存在明显缺口。

最大的架构问题是 **SoulEvaluator 直连 llama-server:8080 绕过 ai-server:3001**，
这违反了 CLAUDE.md 的通信约束，且两个调用者竞争单并发推理槽。
此问题影响面广，已独立拆出为 **Phase Z**。

### 逐文件评级

| 文件 | 行数 | 评级（修复前→后） | 主要问题 |
|------|:----:|:----:|----------|
| `src/ai/soul-evaluator.ts` | 453 | B+ → **B+** | 架构路径违规仍存在（→ Phase Z） |
| `server/ai-server.ts` | 389 | B- → **A-** | V0.4.9 修复 CORS/端点/校验/崩溃恢复/shutdown |
| `src/ai/llm-adapter.ts` | 184 | B+ → **A** | V0.4.9 修复 tryConnect 委托 |
| `server/download-model.ts` | 151 | A- → **A** | V0.4.9 修复重定向深度限制 |
| `server/tests/ai-stress-test.ts` | 126 | **A-** | 缺功能测试（延后） |

---

## 二、问题清单

### P0 — 架构违规（3 项）

> 违反 CLAUDE.md 硬约束

#### P0-01: SoulEvaluator 绕过 ai-server 直连 llama-server [→ Phase Z] ⬜ 待修复

**位置**: `src/ai/soul-evaluator.ts:67`

```typescript
constructor(baseUrl = 'http://127.0.0.1:8080') {
  this.baseUrl = baseUrl;
}
```

**问题**: SoulEvaluator 直接连接 llama-server:8080，完全绕过 ai-server:3001。

**违反规则**:
- CLAUDE.md「前端通过 LLMAdapter 接口调用后端，UI 层不得直接 fetch」
- CLAUDE.md「后端仅暴露 `/api/infer` 端点」

**风险**:
1. 两个调用者（ai-server 的 `/api/generate` 和 soul-evaluator）竞争 llama-server 的单并发推理槽（`-np 1`），导致请求排队或超时
2. 绕过了 ai-server 的错误处理和日志
3. 如果 llama-server 端口变更，需要同步修改两处

**修复方案**: 在 ai-server 新增结构化补全端点，SoulEvaluator 改走 ai-server。
**影响面大，已拆出为 Phase Z 独立处理。**

---

#### P0-02: 端点命名不符规范 ✅ 已修复（V0.4.9）

**位置**: `server/ai-server.ts:392`

**修复内容**: 端点已从 `/api/generate` 重命名为 `/api/infer`，同步更新 `llm-adapter.ts` 和 `ai-stress-test.ts`。

---

#### P0-03: CORS 配置违规 ✅ 已修复（V0.4.9）

**修复内容**: CORS 已限制为 `localhost:5173`/`localhost:4173`/`localhost:3000`，非白名单 origin 不返回 CORS 头。

---

### P1 — 稳定性 / 安全风险（4 项）

#### P1-01: 请求体无大小限制 ✅ 已修复（V0.4.9）

**修复内容**: `parseBody()` 已添加 `MAX_BODY_SIZE = 65536`（64KB）限制，超限返回 413 Payload Too Large。

---

#### P1-02: llama-server 崩溃后无自动恢复 ✅ 已修复（V0.4.9）

**修复内容**: 已添加崩溃自动重启逻辑（`MAX_RESTARTS = 3`，`RESTART_DELAY_MS = 5000`），重启成功后恢复 `modelLoaded = true`。

---

#### P1-03: Windows 下 SIGTERM 可能无效 ✅ 已修复（V0.4.9）

**修复内容**: 已添加平台检测，Windows 下使用 `process.kill()` 无参数（TerminateProcess），其他平台使用 `kill('SIGTERM')`。

---

#### P1-04: HTTP server 未优雅关闭 ✅ 已修复（V0.4.9）

**修复内容**: `cleanup()` 已加入 `server.close()` + 信号监听（SIGINT/SIGTERM），确保端口释放和连接完成。

---

### P2 — 代码质量（5 项）

#### P2-01: 下载脚本重定向无深度限制 ✅ 已修复（V0.4.9）

**修复内容**: 已添加 `MAX_REDIRECTS = 5` 限制，超过时抛出错误。

---

#### P2-02: `node-llama-cpp` 依赖未使用 ✅ 已修复（V0.4.9）

**修复内容**: 已执行 `npm uninstall node-llama-cpp`，从 package.json 和 package-lock.json 中移除。

---

#### P2-03: 请求字段无验证 ✅ 已修复（V0.4.9）

**修复内容**: 已添加 JSON.parse 异常捕获（返回 400 Invalid JSON）+ 必需字段校验（`discipleName`/`personalityName`/`behavior` 类型检查，缺失返回 400）。

---

#### P2-04: `presence_penalty: 1.8` 偏高 ✅ 已修复（V0.4.9）

**修复内容**: 已从 1.8 降低至 1.0。后续可根据实际生成效果进一步调优。

---

#### P2-05: SmartLLMAdapter 通过下标访问私有属性 ✅ 已修复（V0.4.9）

**修复内容**: `tryConnect()` 已改为委托 `this.http.tryConnect()`，消除下标访问私有属性的问题。

---

### P3 — 可维护性（3 项）

#### P3-01: 端口 8080 冲突风险 ⬜ 低优先级

**位置**: `server/ai-server.ts`，当前仍为 8080。建议改为 18080 或 38080，低优先级。

---

#### P3-02: 缺少功能测试 ⬜ 延后

**现状**: 仅有压力测试，缺功能/集成测试。后续按需补充到 `server/tests/`。

---

#### P3-03: 并发日志无请求 ID ⬜ 延后

**现状**: 当前 `-np 1` 单并发，实际不存在并发日志混淆。低优先级。

---

## 三、按优先级排列的修复建议

### 修复总览（V0.4.9 后）

| # | 问题 | 状态 | Phase |
|---|------|:----:|:-----:|
| 1 | P0-02: 端点重命名 `/api/infer` | ✅ V0.4.9 | Y |
| 2 | P0-03: CORS localhost only | ✅ V0.4.9 | Y |
| 3 | P2-03: POST 端点输入校验 | ✅ V0.4.9 | Y |
| 4 | P2-05: 私有属性访问修复 | ✅ V0.4.9 | Y |
| 5 | P1-02: llama-server 崩溃自动恢复 | ✅ V0.4.9 | Y |
| 6 | P1-01: parseBody 请求体大小限制 | ✅ V0.4.9 | Y |
| 7 | P1-03: Windows SIGTERM 兼容 | ✅ V0.4.9 | Y |
| 8 | P1-04: HTTP server 优雅关闭 | ✅ V0.4.9 | Y |
| 9 | P2-02: 移除 node-llama-cpp | ✅ V0.4.9 | Y |
| 10 | P2-01: 重定向深度限制 | ✅ V0.4.9 | Y |
| 11 | P2-04: presence_penalty 调参 | ✅ V0.4.9 | Y |
| 12 | P3-01: 端口号更换 | ⬜ 低优先级 | Y |
| 13 | P3-02: 功能测试补充 | ⬜ 延后 | 后续 |
| 14 | P3-03: 请求 ID 日志 | ⬜ 延后 | 后续 |
| 15 | P0-01: SoulEvaluator 架构统一 | ⬜ 待 Phase Z | **Z** |

---

## 四、亮点

客观记录做得好的方面，作为后续开发标杆：

1. **SmartLLMAdapter 三层降级** — HTTP 优先 → 自动 fallback → 零网络请求保守模式，优雅的渐进退化设计
2. **SoulEvaluator 结构化补全** — JSON Schema 硬约束 + `<think>` 标签清理 + 候选池校验，防止 AI 输出越界
3. **双阶段推理 (Call1+Call2)** — 决策/独白分离，失败策略分级（全 fallback / AI 决策 + fallback 独白），maximizing partial success
4. **Placeholder 模式** — 模型未加载时仍可运行，不阻塞引擎 tick
5. **Few-shot 道德对齐** — 按善恶值动态注入示例（goodEvil < -20 注入邪恶示例），修正 AI 行为偏差

---

## 五、根因分析

| # | 根因 | 对应问题 | 预防手段 |
|---|------|---------|---------|
| R1 | 架构设计时未统一 AI 通信路径 | P0-01 | Phase Z 架构重构 + SGE 后端 checklist |
| R2 | 规范文档写了但无工具拦截 | P0-02/03 | ESLint 覆盖 server/ + PostToolUse Hook |
| R3 | 后端开发时无防御性编程意识 | P1-01~04 | SGE 后端 Code Quality Gate |
| R4 | 后端无 ESLint/类型检查约束 | P2-03/05 | ESLint strictTypeChecked 覆盖 server/ |
| R5 | 缺少后端 Code Review 流程 | 全部 | 本报告 + Phase Y SGE Skill 增强 |

---

## 六、结论

后端代码量小但问题密度不低（15 项 / 1303 行 ≈ 1.15 项/百行），主要集中在架构合规和防御性编程方面。
代码实现质量本身不差（SoulEvaluator 和 SmartAdapter 设计都很好），
问题主要来自"规范约束未落地到工具"和"后端开发时缺少 Review 环节"。

**V0.4.9 修复后**：11/15 项已修复，剩余 4 项（1 架构级→Phase Z，3 低优先级/延后）。
整体评级从 **B-** 提升至 **B+**。

Phase Y 剩余工作（ESLint + SGE Skill 增强）将从工具层面建立长期质量防线。
Phase Z 则解决需要架构级重构的 AI 通信路径问题。
