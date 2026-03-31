# Phase Y 后端代码质量 Review 报告

> **审查范围**: 后端 AI 推理服务 + 前端 AI 适配层（5 文件，~1303 行 TS）
> **审查日期**: 2026-03-31
> **审查方式**: 逐行人工 Review，对照 CLAUDE.md 编码规范 + AGENTS.md 架构约束
> **结论**: 发现 **15 项问题**（P0×3 / P1×4 / P2×5 / P3×3），整体评级 **B-**

---

## 一、总评

后端代码量不大（5 文件 ~1300 行），核心推理逻辑设计合理（SmartAdapter 三层降级、SoulEvaluator 结构化补全），
但在架构合规、稳定性防护、输入校验方面存在明显缺口。

最大的架构问题是 **SoulEvaluator 直连 llama-server:8080 绕过 ai-server:3001**，
这违反了 CLAUDE.md 的通信约束，且两个调用者竞争单并发推理槽。
此问题影响面广，已独立拆出为 **Phase Z**。

### 逐文件评级

| 文件 | 行数 | 评级 | 主要问题 |
|------|:----:|:----:|----------|
| `src/ai/soul-evaluator.ts` | 453 | **B+** | 代码质量高，但架构路径违规（直连 llama-server:8080） |
| `server/ai-server.ts` | 389 | **B-** | CORS 全开 + 端点命名违规 + 无输入校验 + 无崩溃恢复 |
| `src/ai/llm-adapter.ts` | 184 | **B+** | Smart 降级模式设计好，但下标访问私有属性 |
| `server/download-model.ts` | 151 | **A-** | 小问题：重定向无深度限制 |
| `server/tests/ai-stress-test.ts` | 126 | **A-** | 压力测试设计好，但缺少功能测试 |

---

## 二、问题清单

### P0 — 架构违规（3 项）

> 违反 CLAUDE.md 硬约束

#### P0-01: SoulEvaluator 绕过 ai-server 直连 llama-server [→ Phase Z]

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

#### P0-02: 端点命名不符规范

**位置**: `server/ai-server.ts:338`

```typescript
if (req.method === 'POST' && req.url === '/api/generate') {
```

**问题**: 实际端点是 `/api/generate`，CLAUDE.md 规定应为 `/api/infer`。

**修复**: 重命名端点 + 同步更新前端 `llm-adapter.ts:56` 和压力测试 `ai-stress-test.ts:37`。

---

#### P0-03: CORS 配置违规

**位置**: `server/ai-server.ts:312-315`

```typescript
'Access-Control-Allow-Origin': '*',
```

**问题**: 允许任何来源的跨域请求。

**违反规则**: CLAUDE.md「CORS: 后端仅接受 localhost 来源请求」

**修复**: 将 CORS origin 限制为 `http://localhost:5173`（Vite dev）和 `http://localhost:4173`（preview），对不匹配的 origin 不返回 CORS 头。

---

### P1 — 稳定性 / 安全风险（4 项）

#### P1-01: 请求体无大小限制

**位置**: `server/ai-server.ts:301-308`

```typescript
function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
```

**问题**: 无限累积 chunks，异常大请求可耗尽内存。

**修复**: 添加 body 大小限制（64KB），超限销毁请求并返回 413 Payload Too Large。

---

#### P1-02: llama-server 崩溃后无自动恢复

**位置**: `server/ai-server.ts:283-287`

```typescript
llamaProcess.on('exit', (code) => {
  console.log(`[AI Server] llama-server 退出 (code=${code})`);
  modelLoaded = false;
  if (!started) resolve(false);
});
```

**问题**: llama-server 退出后 `modelLoaded = false`，之后所有请求永远返回 placeholder，无法恢复。用户必须手动重启 ai-server。

**修复**: 在 `exit` 事件中添加延迟自动重启逻辑（延迟 5 秒，最多重试 3 次），重启成功后恢复 `modelLoaded = true`。

---

#### P1-03: Windows 下 SIGTERM 可能无效

**位置**: `server/ai-server.ts:368`

```typescript
llamaProcess.kill('SIGTERM');
```

**问题**: Windows 上 `process.kill('SIGTERM')` 对子进程可能不起作用（Windows 不支持 POSIX 信号），导致 llama-server 成为孤儿进程。

**修复**: 使用 `llamaProcess.kill()` 不传参数（Node.js 在 Windows 上默认使用 TerminateProcess），或检测平台后使用 `taskkill /pid /f /t`。

---

#### P1-04: HTTP server 未优雅关闭

**位置**: `server/ai-server.ts:365-374`

```typescript
function cleanup() {
  if (llamaProcess) {
    console.log('[AI Server] 关闭 llama-server...');
    llamaProcess.kill('SIGTERM');
    llamaProcess = null;
  }
}
```

**问题**: `cleanup()` 只 kill 了 llama-server，没有 `server.close()` 关闭 HTTP server。进行中的请求可能中断，端口可能不释放。

**修复**: 在 cleanup 中加入 `server.close()`，等待现有连接完成后再退出。

---

### P2 — 代码质量（5 项）

#### P2-01: 下载脚本重定向无深度限制

**位置**: `server/download-model.ts:49`

```typescript
download(res.headers.location, destPath).then(resolve).catch(reject);
```

**问题**: 递归跟随重定向无最大深度限制，理论上可能无限递归（如 CDN 配置错误导致重定向循环）。

**修复**: 添加 `maxRedirects` 参数（默认 5），超过时报错。

---

#### P2-02: `node-llama-cpp` 依赖未使用

**位置**: `package.json`

```json
"node-llama-cpp": "^3.18.1"
```

**问题**: 从未被任何代码 import，浪费 `npm install` 时间和磁盘空间（node-llama-cpp 包含原生编译组件）。

**修复**: 确认不再需要后 `npm uninstall node-llama-cpp`。

---

#### P2-03: 请求字段无验证

**位置**: `server/ai-server.ts:341-347`

```typescript
const body = JSON.parse(rawBody) as {
  discipleName: string;
  personality: Record<string, number>;
  personalityName: string;
  behavior: string;
  shortTermMemory: string[];
};
```

**问题**: `JSON.parse` 后直接 `as` 类型断言，无字段校验。缺少 `discipleName` 等必需字段时会在下游产生 `undefined` 错误，返回 500 而非 400。

**修复**: 添加最小字段校验（检查 `discipleName`、`personalityName`、`behavior` 存在且为 string），缺失返回 400 Bad Request。

---

#### P2-04: `presence_penalty: 1.8` 偏高

**位置**: `server/ai-server.ts:135`

```typescript
presence_penalty: 1.8,
```

**问题**: 1.8 的 presence penalty 对 25 字短文本来说偏高，可能导致不自然的用词回避和输出不连贯。OpenAI 文档建议范围 -2.0 ~ 2.0，常用值 0.6-1.2。

**建议**: 降低到 0.6-1.0 范围，或通过实际生成效果 A/B 测试确认当前值是否合理。标记为"需测试"。

---

#### P2-05: SmartLLMAdapter 通过下标访问私有属性

**位置**: `src/ai/llm-adapter.ts:155`

```typescript
await fetch(`${this.http['baseUrl']}/api/health`, {
```

**问题**: 通过 `['baseUrl']` 下标语法访问 HttpLLMAdapter 的 `private baseUrl` 属性，绕过 TypeScript 类型检查。ESLint `@typescript-eslint/no-unsafe-member-access` 会标记此问题。

**修复**: 将 `tryConnect()` 委托给 `this.http.tryConnect()`（该方法已存在），消除重复逻辑和私有属性访问。

---

### P3 — 可维护性（3 项）

#### P3-01: 端口 8080 冲突风险

**位置**: `server/ai-server.ts:24`

```typescript
const LLAMA_PORT = 8080;
```

**问题**: 8080 是常见端口（Tomcat、各种代理、其他开发服务器），容易与其他服务冲突。

**建议**: 改为不常见端口如 18080 或 38080。低优先级。

---

#### P3-02: 缺少功能测试

**现状**: 只有压力测试（`ai-stress-test.ts`），没有功能/集成测试。

**缺失覆盖**: 端点路由正确性、请求字段校验、错误响应格式、placeholder 生成、输出清理/截断逻辑、CORS 行为。

**建议**: 后续补充基础功能测试到 `server/tests/`。可选。

---

#### P3-03: 并发日志无请求 ID

**问题**: 当多个请求并发时，日志中无法区分属于哪个请求，难以追踪问题。

**建议**: 低优先级。当前 `-np 1` 单并发配置下实际不存在并发。

---

## 三、按优先级排列的修复建议

### 第一优先级（架构合规 + 安全）

| # | 问题 | 工作量 | 影响 | Phase |
|---|------|:------:|------|:-----:|
| 1 | P0-02: 端点重命名 `/api/generate` → `/api/infer` | S | 规范合规 | Y |
| 2 | P0-03: CORS `*` → localhost only | S | 安全合规 | Y |
| 3 | P2-03: POST 端点输入校验 | S | 错误报告 | Y |
| 4 | P2-05: 私有属性访问修复 | S | 类型安全 | Y |

### 第二优先级（稳定性）

| # | 问题 | 工作量 | 影响 | Phase |
|---|------|:------:|------|:-----:|
| 5 | P1-02: llama-server 崩溃自动恢复 | M | 可用性 | Y |
| 6 | P1-01: parseBody 请求体大小限制 | S | 安全 | Y |
| 7 | P1-03: Windows SIGTERM 兼容 | S | 跨平台 | Y |
| 8 | P1-04: HTTP server 优雅关闭 | S | 资源释放 | Y |

### 第三优先级（代码质量）

| # | 问题 | 工作量 | 影响 | Phase |
|---|------|:------:|------|:-----:|
| 9 | P2-02: 移除 node-llama-cpp 依赖 | XS | 清理 | Y |
| 10 | P2-01: 重定向深度限制 | S | 防御性 | Y |
| 11 | P2-04: presence_penalty 调参 | S | 质量 | Y |

### 第四优先级（可选 / 后续）

| # | 问题 | 工作量 | 影响 | Phase |
|---|------|:------:|------|:-----:|
| 12 | P3-01: 端口号更换 | XS | 兼容性 | Y |
| 13 | P3-02: 功能测试补充 | M | 质量保障 | 后续 |
| 14 | P3-03: 请求 ID 日志 | S | 可观测性 | 后续 |

### 独立 Phase

| # | 问题 | 工作量 | 影响 | Phase |
|---|------|:------:|------|:-----:|
| 15 | P0-01: SoulEvaluator 架构统一 | L | 架构 | **Z** |

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

Phase Y 的 ESLint + SGE Skill 增强将从工具层面解决大部分可自动化检测的问题。
Phase Z 则解决需要架构级重构的 AI 通信路径问题。
