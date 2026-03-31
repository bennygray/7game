# Phase X Review 问题修复 — 执行记录

> **执行日期**: 2026-03-31
> **触发**: `docs/pipeline/phaseX-gamma/code-review.md` 中 P0+P1+P3-06 共 10 项
> **状态**: ✅ 全部完成

---

## 修复范围

本次修复 P0（4项）+ P1（4项）+ P2-07（1项）+ P3-06 运行时 Bug（1项），共 10 项。
P2 其余 / P3 留给 Phase Y（ESLint 治理）批量处理。

---

## 修改文件清单

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `src/ai/llm-adapter.ts` | 接口补全 | `LLMAdapter` 添加 `tryConnect(): Promise<boolean>`；`FallbackLLMAdapter`/`HttpLLMAdapter` 补实现 |
| `src/ui/log-manager.ts` | 添加方法 | `LogManager` 接口 + 实现添加 `clearMainLog(): void` |
| `src/ui/command-handler.ts` | 重构 | `CommandContext` 扩展 `onReset`/`clearSave`/`connectAI`；消除 `as any`、`getElementById`、`localStorage` 直操 |
| `src/ui/engine-bindings.ts` | Bug 修复 + 重构 | 导出 `onTickHandler()`（不再直接 `setOnTick`）；类型守卫替代 `as number`；AI 上下文改用 Engine API |
| `src/engine/idle-engine.ts` | 新增方法 | `getOrCreateAIContext()` + `recordAIMemory()`（P1-04 封装） |
| `src/main.ts` | 清理 + 合并 | 单一 `setOnTick` 合并 R-01+状态栏；`connectAI()` 共用函数；删除无用导入和 `window.__mudReset` |

**未改动**: `save-manager.ts`（`clearSave` 已 export）、`mud-formatter.ts`、`panel-manager.ts`、`layout.ts`、`mud-theme.css`

---

## 逐项修复对照

### P0 — 类型安全（4 项）

| # | 问题 | 修复方案 | 验证 |
|---|------|----------|------|
| P0-01 | `(llmAdapter as any).tryConnect()` ×2 处 | `LLMAdapter` 接口补 `tryConnect()` 方法 | grep `as any` = 0 |
| P0-02 | `(window as any).__mudReset` ×3 处 | `CommandContext.onReset` 依赖注入 | grep `__mudReset` = 0 |
| P0-03 | `entry.data.severity as number` | `typeof === 'number'` 类型守卫 | tsc 零错误 |
| P0-04 | `entry.data?.result === 'chat'` 无守卫 | `typeof === 'string' && ===` 双重检查 | tsc 零错误 |

### P1 — 架构违规（4 项）

| # | 问题 | 修复方案 | 验证 |
|---|------|----------|------|
| P1-01 | command-handler 直操 `document.getElementById` | `LogManager.clearMainLog()` 封装 | grep `getElementById` in command-handler = 0 |
| P1-02 | command-handler 直操 `localStorage` | `CommandContext.clearSave` 委托 save-manager | grep `localStorage` in command-handler = 0 |
| P1-04 | engine-bindings 直写 `state.aiContexts` | `engine.getOrCreateAIContext()` + `recordAIMemory()` | import `ai-soul` 从 engine-bindings 移除 |
| P1-05 | main.ts 与 ai 命令重复 AI 连接逻辑 | 抽取 `connectAI(ctx)` 函数共用 | main.ts 启动时和 ai 命令共用同一函数 |

### P2 — 代码质量（1 项）

| # | 问题 | 修复方案 |
|---|------|----------|
| P2-07 | 无用导入 `getRealmAuraCost`/`getMaxSubRealm` + `void` 压制 | 直接删除 |

### P3 — 运行时 Bug（1 项）

| # | 问题 | 修复方案 | 影响 |
|---|------|----------|------|
| P3-06 | `setOnTick` 覆盖语义：engine-bindings 注册的 R-01 被 main.ts 覆盖 | 导出 `onTickHandler()`，main.ts 单一 `setOnTick` 内合并调用 | R-01 修炼灵气日志恢复正常显示 |

---

## 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | ✅ 零错误 |
| `npm run test:regression` | ✅ 64/64 通过 |
| grep `as any` in `src/ui/` + `src/main.ts` | ✅ 零匹配 |
| grep `document.getElementById` in `command-handler.ts` | ✅ 零匹配 |
| grep `localStorage` in `command-handler.ts` | ✅ 零匹配 |
| grep `__mudReset` in `src/` | ✅ 零匹配 |
| 浏览器冒烟测试 | ⏳ 待手动验证 |

---

## 遗留（Phase Y 处理）

| # | 问题 | 原因 |
|---|------|------|
| P1-03 | status 格式化逻辑内联 | 需 mud-formatter 新增函数，工作量 M |
| P2-01 | 模块级 mutable 状态 | 需重构 command-handler 为闭包模式 |
| P2-02 | 环境呼吸定时器无清理 | 需添加 dispose 机制 |
| P2-03 | 弟子未找到消息格式不一致 | UX 统一，低优先级 |
| P2-05 | escapeHtml 从 disciple-generator 导入 | 需创建 shared/utils/ 并迁移 |
| P2-06 | formatRulingResult 返回含 \n 的字符串 | 需改为数组或逐行调用 |
| P2-08 | 命令别名实现分裂 | 需统一到 ALIASES 映射表 |
| P3-01 | 魔法数字散布 | ESLint `no-magic-numbers` 配合处理 |
| P3-02 | HTML 字符串拼接 120+ 处 | 当前可接受，长期考虑模板方案 |
| P3-03 | 面板 body 全量 innerHTML | 当前规模无性能问题 |
| P3-04 | CSS 738 行单文件 | Phase Y 拆分 |
| P3-05 | 纯函数无单元测试 | Phase Y 添加 |
