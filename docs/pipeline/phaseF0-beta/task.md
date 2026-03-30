# Phase F0-β — SGE 执行追踪

> **Phase**：F0-β（活世界）| **开始**：2026-03-30 | **完成**：2026-03-30

---

## 任务清单

### Data Layer（Shared/Types + Shared/Data）

- [x] 1.1 创建 `src/shared/types/world-event.ts` — 类型定义
- [x] 1.2 扩展 `src/shared/types/soul.ts` — +SoulEventType 'world-event'
- [x] 1.3 创建 `src/shared/data/world-event-registry.ts` — 12 事件 + 36 文案
- [x] 1.4 扩展 `src/shared/data/emotion-pool.ts` — +'world-event' 映射

### Engine Layer

- [x] 2.1 创建 `src/engine/storyteller.ts` — Storyteller 类
- [x] 2.2 扩展 `src/engine/tick-pipeline.ts` — +WORLD_EVENT=605
- [x] 2.3 创建 `src/engine/handlers/world-event-tick.handler.ts` — Handler
- [x] 2.4 扩展 `src/engine/idle-engine.ts` — 注册 handler（12 个）

### Verification

- [x] 3.1 创建 `scripts/verify-phaseF0-beta.ts` — 108 条专项验证
- [x] 3.2 TypeScript 编译通过（0 errors）
- [x] 3.3 F0-β 专项验证通过（108/108）
- [x] 3.4 全量回归通过（64/64）

### Documentation

- [x] 4.1 更新 `docs/design/arch/pipeline.md` — +WORLD_EVENT=605, +handler #12
- [x] 4.2 更新 `docs/design/arch/dependencies.md` — +storyteller, +world-event-tick
- [x] 4.3 更新 `docs/project/handoff.md` — Phase F0-β 交付状态

### 修复

- [x] BUG-01 Storyteller lastStormTimestamp 初始值 0 → -COOLDOWN（喘息期误判）
- [x] BUG-02 soul-prompt-builder.ts 缺少 'world-event' 映射（Record 类型错误）
