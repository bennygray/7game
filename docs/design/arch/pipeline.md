# 引擎 Tick Pipeline

> **来源**：MASTER-ARCHITECTURE 拆分 | **维护者**：/SGA
> **索引入口**：[MASTER-ARCHITECTURE.md](../MASTER-ARCHITECTURE.md) §3
> **硬约束**：修改此文件必须同步运行 `npm run test:regression`

---

## §1 Pipeline 架构（Phase 4 重构后）

> TickPipeline + TickHandler 模式。每个 Handler 按 `phase + order` 排序执行。
> 基础设施：`src/engine/tick-pipeline.ts`（TickPhase, TickHandler, TickContext, TickPipeline）

```mermaid
graph LR
    subgraph Pipeline["TickPipeline"]
        P100["100 BUFF_COUNTDOWN"]
        P200["200 PRE_PRODUCTION"]
        P300["300 RESOURCE_PROD"]
        P400["400 WORLD_UPDATE<br>(合并在 300)"]
        P500["500 SYSTEM_TICK"]
        P600["600 DISCIPLE_AI"]
        P700["700 POST_PRODUCTION"]
    end
    P100 --> P200 --> P300 --> P500 --> P600 --> P700
    style P400 fill:#f5f5f5,stroke-dasharray: 5 5
```

### TickPhase 定义

```typescript
export const TickPhase = {
  BUFF_COUNTDOWN:   100,
  PRE_PRODUCTION:   200,
  RESOURCE_PROD:    300,
  WORLD_UPDATE:     400,  // 当前合并在 core-production handler
  SYSTEM_TICK:      500,
  DISCIPLE_AI:      600,
  POST_PRODUCTION:  700,
} as const;
```

---

## §2 Handler 清单

| # | Handler 名称 | Phase | Order | 文件 | 系统 | 来源 |
|---|-------------|:-----:|:-----:|------|------|------|
| 1 | `boost-countdown` | 100 | 0 | `handlers/boost-countdown.handler.ts` | pill-consumer | Phase C |
| 2 | `breakthrough-aid` | 200 | 0 | `handlers/breakthrough-aid.handler.ts` | pill-consumer | Phase C |
| 3 | `auto-breakthrough` | 200 | 10 | `handlers/auto-breakthrough.handler.ts` | breakthrough-engine | Phase C |
| 4 | `core-production` | 300 | 0 | `idle-engine.ts`（内联） | idle-engine 核心 | Phase A |
| 5 | `farm-tick` | 500 | 0 | `handlers/farm-tick.handler.ts` | farm-engine | Phase B-α |
| 6 | `disciple-tick` | 600 | 0 | `handlers/disciple-tick.handler.ts` | behavior-tree | Phase A |
| 7 | `cultivate-boost` | 700 | 0 | `handlers/cultivate-boost.handler.ts` | pill-consumer | Phase C |

### Handler 拆分判定标准

- **独立 handler 文件**：有开关条件（if 判断）、有系统依赖、是 Phase B+ 新增的
- **内联 handler**：tick 间无条件执行、是基础资源产出逻辑（TD-002 暂保留）

---

## §3 新系统接入协议

新增系统只需 3 步接入 Tick Pipeline：

```typescript
// 1. 创建 handler 文件: src/engine/handlers/my-system.handler.ts
import type { TickHandler, TickContext } from '../tick-pipeline';
import { TickPhase } from '../tick-pipeline';

export const mySystemHandler: TickHandler = {
  name: 'my-system',
  phase: TickPhase.SYSTEM_TICK,  // 选择合适的阶段
  order: 10,                     // 同阶段内排序
  execute(ctx: TickContext): void {
    // 业务逻辑
  },
};

// 2. 在 idle-engine.ts 构造函数中注册:
//    this.pipeline.register(mySystemHandler);

// 3. 更新本文件（arch/pipeline.md）Handler 清单
```

---

## §4 TickContext 说明

```typescript
export interface TickContext {
  state: LiteGameState;                    // 游戏状态引用
  deltaS: number;                          // tick 时间增量（秒）
  systemLogs: string[];                    // 系统日志收集器
  farmLogs: string[];                      // 灵田日志收集器
  discipleEvents: DiscipleBehaviorEvent[]; // 弟子行为事件
  onBreakthrough: BreakthroughCallback | null; // 突破回调
  breakthroughCooldown: number;            // 突破冷却计数器 (TD-001)
}
```

> ⚠️ **TD-001**: `breakthroughCooldown` 通过 TickContext 暴露是已知技术债务。
> 详见 `docs/project/tech-debt.md`。

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-03-28 | 从 MASTER-ARCHITECTURE.md §3 拆出 |
| 2026-03-28 | Phase 4 重构: 硬编码 → TickPipeline + 7 Handler，移除"当前硬编码"章节 |
