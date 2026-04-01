# 7game-lite — 全局架构文档 (MASTER-ARCHITECTURE)

> **版本**：v1.8 | **最后更新**：2026-04-02
> **文档角色**：宪法层索引 — 所有 Phase 的架构总纲
> **存档版本**：v5（Phase F0-α 新增，Phase H-γ 未变）
> **阅读策略**：本文件为索引，永远在 Bootstrap 时读取。按需阅读 detail 文件。

---

## §1 分层架构 → [detail](arch/layers.md)

> 四层架构图 + 20 个文件的层级归属。设计新系统时必读。

| 层级 | 职责 | 文件数 |
|------|------|:------:|
| ① Data (`shared/`) | 类型 + 公式 + 数据表 | 20 |
| ② Engine (`engine/`) | Tick / 行为树 / 存档 / 灵魂 / AI 缓冲 | 25 |
| ③ AI (`ai/`) | LLM 适配 / prompt / 灵魂评估 / AI 决策 | 8+ |
| ④ Presentation (`main.ts` + `ui/` + `styles/`) | MUD 面板 / 命令系统 / 日志管理 / 浮层面板 / 格式化 | 8 |

### 跨层通信路径

| 编号 | 通信路径 | 方向 | 说明 |
|------|---------|------|------|
| C-1 | `TickPipeline.execute(ctx)` | Engine→Handler | 15 个 Handler 顺序执行 |
| C-2 | `ctx.farmLogs/systemLogs/discipleEvents` | Engine→Presentation | 专用回调管线（Phase A~D，TD-015 待迁移） |
| C-3 | `ctx.logger.flush()→onMudLog` | Engine→Presentation | **统一日志管线**（Phase H-β ADR-Hβ-01） |
| C-4 | `DialogueCoordinator` | Engine→AI→Presentation | 异步对话（Phase D） |
| C-5 | `AsyncAIBuffer.drain()` | Engine→AI | 异步 AI 结果应用（Phase G） |
| C-6 | `onRulingCreated/onRulingResolved` | Engine→Presentation | 裁决窗口/裁决结算回调（Phase H-γ） |

### 跨层通信禁令

| 编号 | 禁令 |
|------|------|
| X-1 | **禁止** UI 层直接修改 `GameState` |
| X-2 | **禁止** UI 层直接调用 server API |
| X-3 | **禁止** Engine/UI 层重复实现公式 |
| X-4 | **禁止** AI 后端暴露除 `/api/infer` 外的端点 |
| X-5 | **禁止** 代码中硬编码 AI prompt 字符串 |
| X-6 | **禁止** 修改 Pipeline 挂载而不更新 `arch/pipeline.md` |

---

## §2 GameState 拓扑树 → [detail](arch/gamestate.md)

> 24 个属性的完整清单 + 多写者审计 + 读写矩阵。新增字段时必读。

---

## §3 引擎 Tick Pipeline → [detail](arch/pipeline.md)

> 15 个 Handler 注册表 + TickPipeline 架构 + 新系统接入协议。新系统挂载时必读。

---

## §4 系统依赖矩阵 → [detail](arch/dependencies.md)

> Engine×Data 依赖表 + Engine 内部依赖 + 影响分析速查。修改代码时必读。

---

## §4.5 系统交叉索引 → [detail](arch/cross-index.md)

> 系统×引入 Phase×核心文件×Handler×依赖。查询"某系统由哪个 Phase 引入"时必读。

---

## §5 存档 Schema Registry → [detail](arch/schema.md)

> v1→v2→v3 变更链 + 迁移策略。涉及 GameState 变更时必读。

---

## §6 新系统接入规范

### 6.1 注册到 Tick Pipeline

**当前方式（TickPipeline + Handler）**：
```typescript
// 1. 创建新 handler: src/engine/handlers/my-system.handler.ts
import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';

export const mySystemHandler: TickHandler = {
  name: 'my-system',
  phase: TickPhase.SYSTEM_TICK,
  execute(ctx: TickContext) { /* ... */ }
};
// 2. 在 idle-engine.ts 构造函数中注册: this.pipeline.register(mySystemHandler);
// 3. 更新 arch/pipeline.md
```

### 6.2 扩展 GameState

1. `src/shared/types/game-state.ts` 新增 interface / 字段
2. 更新 `createDefaultLiteGameState()` 返回值
3. 编写迁移函数 `migrateVNtoVN+1()`
4. 递增 `SAVE_VERSION` 常量
5. 更新 `arch/gamestate.md` + `arch/schema.md`

### 6.3 更新 detail 文件

| 变更类型 | 需更新的 detail 文件 |
|---------|:------------------:|
| 新增 GameState 字段 | `arch/gamestate.md` + `arch/schema.md` |
| 新增 Pipeline Handler | `arch/pipeline.md` |
| 新增代码依赖 | `arch/dependencies.md` |
| 新增代码文件 | `arch/layers.md` |
| 新增资源 / 公式 | `prd/economy.md` + `prd/formulas.md` |
| 新增系统 | `prd/systems.md` |

---

## Detail 文件清单

| 文件 | 内容 | 维护 Skill |
|------|------|-----------|
| [`arch/layers.md`](arch/layers.md) | 四层架构 Mermaid + 文件清单 | /SGA |
| [`arch/gamestate.md`](arch/gamestate.md) | 属性清单 + 多写者审计 + 读写矩阵 | /SGA |
| [`arch/pipeline.md`](arch/pipeline.md) | Tick 执行顺序 + Handler 架构 | /SGA |
| [`arch/dependencies.md`](arch/dependencies.md) | 依赖矩阵 + 影响速查 | /SGA |
| [`arch/schema.md`](arch/schema.md) | 存档版本链 + 迁移策略 | /SGA, /SGE |
| [`arch/cross-index.md`](arch/cross-index.md) | 系统交叉索引（系统×Phase×文件×依赖） | /SGA |

---

## 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-03-28 | v1.0 | 初始创建，如实描述当前硬编码结构 + 目标 Handler 模式 |
| 2026-03-28 | v1.1 | 模块化拆分：§1→layers.md, §2→gamestate.md, §3→pipeline.md, §4→dependencies.md, §5→schema.md |
| 2026-03-28 | v1.2 | Phase 4 重构完成: §3→Handler 架构, §6.1→当前为 Pipeline 模式, Engine 8→15 文件 |
| 2026-03-29 | v1.3 | Phase E: 存档 v3→v4, Data 11→14, Engine 19→22, AI 4+→5+, Handler 8→10 |
| 2026-03-30 | v1.4 | Phase G: Engine 22→25 (+async-ai-buffer, ai-result-apply.handler, action-executor), AI 5+→8+ (+soul-evaluator, few-shot-examples, action-pool-builder), Handler 12→13 |
| 2026-03-30 | v1.5 | Phase H-β: +跨层通信路径表（C-1~C-5），记录统一日志管线（ADR-Hβ-01/02）；Presentation 层 1→2 文件（+ui/mud-formatter.ts） |
| 2026-03-31 | v1.6 | Phase H-γ: Data 14→16（+ruling.ts, +ruling-registry.ts）；新增通信路径 C-6（裁决回调 onRulingCreated/onRulingResolved） |
| 2026-03-31 | v1.7 | Phase X-γ: Presentation 7→8（+ui/panel-manager.ts）；面板系统 + BUG-Xγ-01内存修复 + 可点击弟子名 |
| 2026-04-02 | v1.8 | Phase TG-3: Data 22→20 修正 + Handler 13→15 修正 + §4.5 系统交叉索引指针 + cross-index.md 注册 |
