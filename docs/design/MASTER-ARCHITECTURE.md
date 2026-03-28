# 7game-lite — 全局架构文档 (MASTER-ARCHITECTURE)

> **版本**：v1.1 | **最后更新**：2026-03-28
> **文档角色**：宪法层索引 — 所有 Phase 的架构总纲
> **存档版本**：v3（Phase C）
> **阅读策略**：本文件为索引，永远在 Bootstrap 时读取。按需阅读 detail 文件。

---

## §1 分层架构 → [detail](arch/layers.md)

> 四层架构图 + 20 个文件的层级归属。设计新系统时必读。

| 层级 | 职责 | 文件数 |
|------|------|:------:|
| ① Data (`shared/`) | 类型 + 公式 + 数据表 | 9 |
| ② Engine (`engine/`) | Tick / 行为树 / 存档 | 8 |
| ③ AI (`ai/`) | LLM 适配 / prompt | 3+ |
| ④ Presentation (`main.ts`) | MUD 面板 / 命令系统 | 1 |

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

> 12 步执行顺序 + 目标 Handler 架构。新系统挂载时必读。

---

## §4 系统依赖矩阵 → [detail](arch/dependencies.md)

> Engine×Data 依赖表 + Engine 内部依赖 + 影响分析速查。修改代码时必读。

---

## §5 存档 Schema Registry → [detail](arch/schema.md)

> v1→v2→v3 变更链 + 迁移策略。涉及 GameState 变更时必读。

---

## §6 新系统接入规范

### 6.1 注册到 Tick Pipeline

**当前方式（硬编码）**：
1. 在 `idle-engine.ts` 的 `tick()` 方法中找到合适的位置
2. 添加新的逻辑代码段

**目标方式（Handler 模式）**（重构后）：
```typescript
// 1. 创建新 handler: src/engine/handlers/my-system-tick.ts
export const mySystemHandler: TickHandler = {
  name: 'my-system',
  phase: TickPhase.SYSTEM_TICK,
  execute(state, deltaS, logs) { /* ... */ }
};
// 2. 注册: pipeline.register(mySystemHandler);
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

---

## 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-03-28 | v1.0 | 初始创建，如实描述当前硬编码结构 + 目标 Handler 模式 |
| 2026-03-28 | v1.1 | 模块化拆分：§1→layers.md, §2→gamestate.md, §3→pipeline.md, §4→dependencies.md, §5→schema.md |
