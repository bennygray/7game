# Phase H-α — MUD 世界呈现升级 (TDD)

> **Phase**：H-α（掌门体验首片）
> **SGA 设计日期**：2026-03-30
> **前置**：[phaseH-alpha-PRD.md](../../features/phaseH-alpha-PRD.md) — GATE 1 PASSED
> **架构影响**：**极小** — 纯 Layer ④ Presentation，零 Engine/Data 变更

---

## Step 1：全局对齐 + Invariant 验证

### 1.1 所属层级

| 分析项 | 结论 |
|--------|------|
| **架构层** | **Layer ④ Presentation**（`main.ts`） |
| **GameState 变更** | **无** — 所有新数据从现有 state 只读渲染 |
| **Pipeline 变更** | **无** — 不新增/修改任何 Handler |
| **存档迁移** | **无** — 存档版本 v5 不变 |
| **新增代码文件** | 2 个存数据文件（Layer ① Data） |

### 1.2 Invariant 与现有架构冲突检查

| PRD Invariant | 架构约束对照 | 冲突？ |
|---------------|-------------|:------:|
| I1: 表现层只读 GameState | X-1: 禁止 UI 层修改 GameState | ✅ 一致 |
| I3: 零引擎改动 | X-6: 禁止改 Pipeline 不更新文档 | ✅ 不需改 Pipeline |
| I4: 日志分级映射 EventSeverity | EventSeverity 定义在 Layer ① Data | ✅ 正确依赖方向 |
| I5: MUD 纯文字约束 | MASTER-PRD §4.1 IN/OUT 表 | ✅ 一致 |

**结论**：零冲突。

---

## Step 2：Interface 设计 + 数据变更

### 2.1 新增类型/接口：无

Phase H-α 不新增任何 TypeScript interface 或 type。所有数据类型复用现有定义：
- `LocationTag`, `LOCATION_LABEL`, `BEHAVIOR_LOCATION_MAP` — from `encounter.ts`
- `EventSeverity` — from `world-event.ts`
- `LiteGameState`, `LiteDiscipleState` — from `game-state.ts`

### 2.2 新增数据文件

#### [NEW] `src/shared/data/zone-descriptions.ts`

纯数据常量文件：

```typescript
import type { LocationTag } from '../types/encounter';

/** 地点固定场景描述 — PRD §2.1 E5 */
export const ZONE_DESCRIPTIONS: Record<LocationTag, string> = { /* 6条 */ };

/** 全局环境呼吸文案池 — PRD §2.1 E5 */
export const AMBIENT_BREATHING_POOL: readonly string[] = [ /* 8条 */ ];
```

- Owner: `/SPM`（文案内容） + `/SGA`（文件位置）
- 层级: Layer ① Data
- 依赖: 仅依赖 `LocationTag` 类型

#### [NEW] `src/ui/mud-formatter.ts`

纯函数格式化模块（**不依赖 DOM**，可单元测试）：

```typescript
// 类型签名（不含实现）
export function formatLookOverview(state: LiteGameState): string;
export function formatDiscipleProfile(d: LiteDiscipleState, state: LiteGameState): string;
export function matchDisciple(query: string, disciples: LiteDiscipleState[]): MatchResult;
export function formatSeverityLog(severity: number, text: string): string;
export function formatStatusBar(state: LiteGameState, auraRate: number): string;
export function pickAmbientLine(): string;
export function getMoralLabel(value: number): string;
export function getEthosLabel(value: number): string;

export type MatchResult =
  | { type: 'exact'; disciple: LiteDiscipleState }
  | { type: 'prefix'; candidates: LiteDiscipleState[] }
  | { type: 'none' };
```

- Owner: `/SGE`
- 层级: 新建 `src/ui/` 目录，归属 Layer ④ 但逻辑独立可测
- 依赖: Layer ① Data 类型 + `zone-descriptions.ts` + `encounter.ts` LOCATION_LABEL

### 2.3 GameState 变更：无

### 2.4 存档迁移：不需要

---

## Step 3：Pipeline 挂载 + 依赖 + 回归影响

### 3.1 Pipeline 挂载：不需要

Phase H-α 不新增 Handler。

### 3.2 依赖变更

| 变更 | 从 | 到 | 说明 |
|------|---|---|------|
| 新增读取 | `main.ts` (④) | `zone-descriptions.ts` (①) | Room Description 数据 |
| 新增读取 | `main.ts` (④) | `mud-formatter.ts` (④) | 格式化函数 |
| 新增读取 | `mud-formatter.ts` (④) | `encounter.ts` (①) | LOCATION_LABEL, LocationTag |
| 新增读取 | `mud-formatter.ts` (④) | `world-event.ts` (①) | EventSeverity |
| 新增读取 | `mud-formatter.ts` (④) | `behavior-tree.ts` (②) | getBehaviorLabel |

所有新依赖方向为 ④→①（正确）或 ④→②（已存在，main.ts 已依赖 behavior-tree.ts）。**无反向依赖引入**。

### 3.3 回归影响评估

| 影响范围 | 风险 | 说明 |
|---------|:----:|------|
| Engine 层 | **零** | 不改任何 engine 文件 |
| Data 层 | **极低** | 仅新增只读数据文件 |
| 存档 | **零** | 不改 schema |
| 现有命令 | **低** | status/bt/clear/reset/ai/help 保留不变 |
| 日志显示 | **中** | 现有回调的日志颜色可能微调 |

### 3.4 回归测试要求

```bash
npx tsx scripts/regression-all.ts    # 64/64 必须通过
```

---

## Step 4：ADR 决策日志

### ADR-Hα-01：mud-formatter 分离 vs 内联 main.ts

| 项 | 内容 |
|----|------|
| **决策** | 将格式化逻辑抽取到 `src/ui/mud-formatter.ts` |
| **备选** | 直接内联在 `main.ts`（快但膨胀到 650+ 行） |
| **理由** | tech-debt 中已有 Party Review W2 记录 main.ts 膨胀风险；分离后格式化函数可独立单元测试；新建 `src/ui/` 目录为后续 Phase H 主线做铺垫 |
| **后果** | 新增 1 个目录 + 1 个文件；main.ts 的改动量反而减少（调用函数而不是内联逻辑） |

### ADR-Hα-02：日志颜色走 inline style vs CSS class

| 项 | 内容 |
|----|------|
| **决策** | 保持 inline style（与现有 main.ts 一致） |
| **备选** | 引入 CSS class 系统 |
| **理由** | 当前 main.ts 全部使用 inline style；此 Phase 不做 CSS 重构；后续 Phase H 完整 UI 重写时一并改 |
| **后果** | 格式化函数返回包含 `<span style="...">` 的 HTML 字符串（与现有 `addMudLog` 兼容） |

---

## 架构文档更新清单

| 文件 | 更新内容 | 执行者 |
|------|---------|:------:|
| `arch/layers.md` | Layer ① Data +1 文件（zone-descriptions.ts）; Layer ④ +1 文件 + 新目录 `src/ui/` | /SGE |
| `arch/dependencies.md` | +3 条新依赖（main→zone-desc, main→mud-formatter, formatter→encounter） | /SGE |
| `arch/pipeline.md` | 无变更 | — |
| `arch/gamestate.md` | 无变更 | — |
| `arch/schema.md` | 无变更 | — |
| `prd/systems.md` | MUD 文字面板 → 升级为 MUD 世界呈现 | /SGE |
| `tech-debt.md` | +1 条（W2: main.ts 膨胀，已通过 mud-formatter 部分缓解） | /SGE |

---

## Party Review 报告

### L1：维度穷举审查

#### R4 项目经理（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 工期评估 | ✅ | 2 新文件 + 1 修改，<3h，S 复杂度 |
| 2 | 风险评估 | ✅ | 零引擎改动消除大部分风险 |
| 3 | 技术债务 | ✅ | 通过 mud-formatter 分离部分缓解 W2 |
| 4 | 依赖管理 | ✅ | 所有依赖方向正确 |
| 5 | 文档同步 | ✅ | 更新清单已列出 |

#### R5 偏执架构师（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 层间耦合 | ✅ | 无反向依赖引入 |
| 2 | 状态管理 | ✅ | 无新状态，纯渲染 |
| 3 | 扩展性 | ✅ | mud-formatter 模式为后续 Phase H 铺路 |
| 4 | 持久化 | ✅ | 零存档影响 |
| 5 | 测试策略 | ⚠️ | mud-formatter 纯函数可写单元测试，但当前 Phase 不强制（S 复杂度） |

#### R6 找茬QA（5 维度）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| 1 | 回归覆盖 | ✅ | regression-all.ts 64/64 覆盖引擎层 |
| 2 | 边界条件 | ✅ | 弟子名匹配逻辑有 3 路径覆盖 |
| 3 | 安全性 | ✅ | 复用现有 escapeHtml 防 XSS |
| 4 | 性能 | ✅ | 无新 setInterval（呼吸计时器复用现有模式） |
| 5 | 可观测性 | ✅ | 日志分级反而提升可观测性 |

### 最终判定

✅ **PASS** — 14 PASS + 1 WARN（R5-5: 单元测试可选，不阻塞）

---

## SGA Signoff

- [x] Interface 设计完整（无新字段，2 个新文件有 Owner）
- [x] 迁移策略完整（不需要迁移）
- [x] Pipeline 挂载方案确认（不需要挂载）
- [x] 依赖矩阵已更新（3 条新依赖，方向正确）
- [x] Party Review 无 BLOCK 项（PASS，1 WARN 不阻塞）
- [x] 技术债务已登记（W2 部分缓解记录）

签章：`[x] GATE 2 PASSED` — 2026-03-30
