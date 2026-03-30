# Phase H-β — 世界缝合 TDD

> **版本**：v1.0 | **日期**：2026-03-30 | **作者**：/SGA
> **PRD**：[phaseH-beta-PRD.md](../../features/phaseH-beta-PRD.md) — `[x] GATE 1 PASSED`
> **User Stories**：[phaseH-beta-user-stories.md](phaseH-beta-user-stories.md)

---

## §1 全局对齐检查

### 分层归属

| 变更项 | 层级 | 文件 |
|--------|------|------|
| S0 flush 回调 + emotionMap getter | ② Engine | `idle-engine.ts` |
| S0 flush 语义变更 | ② Engine | `game-logger.ts` |
| S0 路由函数 | ④ Presentation | `main.ts` |
| S3 formatDiscipleInspect | ④ Presentation | `mud-formatter.ts` |
| S4 formatSectProfile | ④ Presentation | `mud-formatter.ts` |
| S3/S4 命令解析 | ④ Presentation | `main.ts` |

### 跨层通信审计

- X-1 ✅ UI 不修改 GameState（inspect/sect 只读）
- X-3 ✅ 复用 shared 层标签函数
- X-6 ✅ 不修改 Pipeline 挂载

### GameState 变更

**无**。零存档迁移。GameState v5 不变。

---

## §2 Interface 设计

### 2.1 IdleEngine 新增

```typescript
// ===== 新增回调类型 =====

/** 统一日志管线回调：每 tick 传递本轮 LogEntry[] */
export type MudLogCallback = (entries: LogEntry[]) => void;

// ===== IdleEngine 新增方法 =====

/** 注册统一日志管线回调 */
setOnMudLog(cb: MudLogCallback): void {
  this.onMudLog = cb;
}

/**
 * 查询弟子当前情绪状态（只读）
 * @returns 情绪状态副本，或 undefined（无情绪）
 */
getEmotionState(discipleId: string): DiscipleEmotionState | undefined {
  const state = this.emotionMap.get(discipleId);
  return state ? { ...state } : undefined;
}
```

### 2.2 GameLogger.flush() 语义变更

**变更前**（Phase D 原始）：
```typescript
flush(): LogEntry[] {
  const entries = [...this.buffer];
  this.buffer = [];
  return entries;
}
```

**变更后**：
```typescript
flush(): LogEntry[] {
  const entries = [...this.buffer];
  // 持久化保障：fire-and-forget 写盘，防止清空后丢失
  if (entries.length > 0) {
    writeLogs(entries);  // async, not awaited — 不阻塞 tick
  }
  this.buffer = [];
  return entries;
}
```

**设计理由**（ADR-Hβ-01）：
- `persistBuffer()` 每 30s 从 buffer splice 出一批写 IndexedDB
- 新增的 tick 后 flush 每 1s 清空 buffer
- 若不先写盘，30s 窗口内的日志会被 flush 清空导致持久化丢失
- fire-and-forget `writeLogs()` 开销极小（0~4 条/tick），不阻塞
- IndexedDB 可能有少量重复（persist 和 flush 竞态），可接受

### 2.3 新增格式化函数

```typescript
// mud-formatter.ts

/**
 * 渲染弟子灵魂档案（inspect 命令）
 * @param d - 弟子状态
 * @param state - 游戏状态（用于关系查询）
 * @param emotion - 当前情绪（可选，来自 emotionMap）
 */
export function formatDiscipleInspect(
  d: LiteDiscipleState,
  state: LiteGameState,
  emotion?: DiscipleEmotionState,
): string;

/**
 * 渲染宗门道风总览（sect 命令）
 * @param state - 游戏状态
 */
export function formatSectProfile(state: LiteGameState): string;
```

### 2.4 main.ts 路由函数

```typescript
/**
 * 将 LogEntry 路由到 MUD 显示
 * 实现 PRD R-S0-01 / R-S0-02 / R-S0-03 映射规则
 */
function routeLogEntryToMud(entry: LogEntry): void;
```

**映射逻辑伪代码**：

```
1. 如果 entry.level === DEBUG → 跳过（不显示）
2. 确定 EventSeverity：
   a. 如果 entry.source === 'world-event' 且 entry.data?.severity 存在
      → 使用 entry.data.severity 作为 EventSeverity
   b. 如果 entry.source === 'encounter'
      → data.result === 'chat' ? RIPPLE : SPLASH
   c. 如果 entry.source === 'ai-result-apply'
      → 强制 SPLASH
   d. 否则：LogLevel 映射（INFO→RIPPLE, WARN→SPLASH, ERROR→STORM）
3. 调用 addMudLog(formatSeverityLog(severity, entry.message))
```

---

## §3 Pipeline 挂载

**无新增 Handler。** 变更仅在 `idle-engine.tick()` 的回调分发区（L234-256），在现有三个回调分发之后新增：

```typescript
// 统一日志管线（Phase H-β S0）
const logEntries = ctx.logger.flush();
const mudEntries = logEntries.filter(e => e.level > LogLevel.DEBUG);
if (mudEntries.length > 0) {
  this.onMudLog?.(mudEntries);
}
```

### 执行时序

```
Pipeline.execute(ctx)    ← 所有 handler 执行完毕
  ↓
ctx.farmLogs → onFarmTickLog        ← 既有
ctx.discipleEvents → onDiscipleBehaviorChange  ← 既有
ctx.systemLogs → onSystemLog        ← 既有
dialogueTriggers → dialogueCoordinator  ← 既有
  ↓
ctx.logger.flush() → onMudLog       ← 新增（Phase H-β）
  ↓
onTick → 最终通知                    ← 既有
```

---

## §4 文件变更清单

| # | 文件 | 变更类型 | 变更内容 |
|---|------|---------|---------|
| 1 | `src/engine/idle-engine.ts` | 修改 | +MudLogCallback 类型, +onMudLog 属性, +setOnMudLog(), +getEmotionState(), tick() 末尾 flush 分发 |
| 2 | `src/engine/game-logger.ts` | 修改 | flush() 增加 fire-and-forget writeLogs 调用 |
| 3 | `src/main.ts` | 修改 | +routeLogEntryToMud(), +engine.setOnMudLog() 注册, +inspect/i 命令, +sect 命令 |
| 4 | `src/ui/mud-formatter.ts` | 修改 | +formatDiscipleInspect(), +formatSectProfile() |

**不修改的文件**：所有 handler 文件、tick-pipeline.ts、game-state.ts、存档相关。

---

## §5 实施计划

### 实施顺序

```
Step A: game-logger.ts flush 变更     ← 独立，可先做
Step B: idle-engine.ts 回调+getter    ← 依赖 Step A
Step C: mud-formatter.ts 新增函数     ← 独立，可与 A/B 并行
Step D: main.ts 路由+命令            ← 依赖 B+C
Step E: 回归测试 + 手动验证          ← 依赖 D
```

### 验证计划

| # | 验证项 | 方式 | Story 对应 |
|---|--------|------|-----------|
| V1 | 回归测试 64/64 | `npm run test:regression` | AC-09 |
| V2 | 碰面事件在 MUD 可见 | 浏览器运行 15 分钟 | AC-01 |
| V3 | 世界事件在 MUD 可见 | 浏览器运行 15 分钟 | AC-02 |
| V4 | AI 独白在 MUD 可见 | AI 在线 + 浏览器 | AC-03 |
| V5 | AI 离线不报错 | AI 离线 + 浏览器 | AC-04 |
| V6 | inspect 命令完整输出 | 浏览器手动 | AC-05~09 |
| V7 | sect 命令完整输出 | 浏览器手动 | AC-08 |
| V8 | IndexedDB 持久化正常 | DevTools 检查 | AC-10 |

---

## §6 ADR 决策日志

### ADR-Hβ-01：统一日志管线方案选择

**背景**：项目存在两条互不相通的日志管线。管线 A（专用回调 ctx.systemLogs/farmLogs/discipleEvents）通 MUD 显示；管线 B（ctx.logger → GameLogger）只通 IndexedDB。Phase F0/G 的 handler 使用管线 B，导致世界事件、碰面、AI 独白对玩家不可见。

**备选方案**：

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. tick 后 flush → 新回调 | 每 tick 从 logger flush LogEntry[]，通过 onMudLog 回调传给 main.ts | 一劳永逸，后续 handler 自动受益 | 需解决 flush 与 persist 时序 |
| B. 专用回调 | 为 encounter/AI/world-event 各加一个回调 | 与现有模式一致 | 回调数膨胀（13+ handler 未来都需要） |
| C. 双写 | handler 同时写 ctx.logger 和 ctx.systemLogs | 无架构变更 | 每个 handler 重复代码，违反 DRY |

**决策**：方案 A。

**理由**：
1. 后续 Phase I 将新增更多 handler，统一管线避免每次新增 handler 都要改 idle-engine 回调
2. LogEntry 携带 source/level/data 元数据，比纯 string[] 回调更灵活
3. flush 时序问题通过 fire-and-forget writeLogs 解决，代价极小（少量 IndexedDB 重复）

**后果**：
- 现有三个回调（farmLogs/systemLogs/discipleEvents）可在未来 Phase 逐步迁移到统一管线（记为 TD-016）
- 不立即迁移——避免回归风险，保持 Phase H-β 范围最小

### ADR-Hβ-02：flush 持久化兼容策略

**背景**：GameLogger.flush() 清空 buffer 后，定时 persistBuffer() 无数据可写，导致 IndexedDB 丢日志。

**决策**：flush() 内部先 fire-and-forget `writeLogs(entries)` 再清空 buffer。

**理由**：
- writeLogs 是已有 async 函数，fire-and-forget 不阻塞 tick
- 每 tick 最多 4 条日志，写入开销可忽略
- IndexedDB 可能有少量重复（persist 和 flush 竞态），但调试日志允许重复
- 方案最小化变更——只修改 flush() 一个函数

**后果**：
- IndexedDB 日志可能有 ≤4 条/tick 的重复（persist 和 flush 同时取到同一批）
- 如重复不可接受，未来可引入 `lastPersistedIndex` 去重（TD-017 预留）

---

## SGA Signoff

- [x] Interface 设计完整（新增 MudLogCallback + getEmotionState，无新 GameState 字段）
- [x] 迁移策略完整（零存档迁移）
- [x] Pipeline 挂载方案确认（无新增 Handler，变更在回调分发区）
- [x] 依赖矩阵无新增跨层方向
- [x] Party Review 无 BLOCK 项（见下方）
- [x] 技术债务已登记（TD-016/TD-017）

签章：`[x] GATE 2 PASSED` — 2026-03-30

---

## SGE Signoff

- [x] 所有 Step 按 TDD §5 顺序实施（A→B→C→D→E）
- [x] 回归测试 64/64 通过
- [x] TypeScript 编译零错误
- [x] Party Review 无 BLOCK 项（2 WARN 可接受）
- [x] 交接文档已更新（handoff/task-tracker/feature-backlog）

签章：`[x] GATE 3 PASSED` — 2026-03-30

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-30 | v1.0 | 初始创建 |
