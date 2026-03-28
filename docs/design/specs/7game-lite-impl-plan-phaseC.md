# 7game-lite Phase C 实施计划 (Step 7)

> **生成日期**：2026-03-28
> **覆盖 Story**：#1~#5（GameState v3 → 灵脉 → 丹药消费 → 概率突破 → Tick 扩展）
> **编码顺序**：Data → Engine → Presentation（四层架构自底向上）
> **建议分支**：`feature/phase-c-breakthrough`

---

## 1. 需要新建/更新的 spec 文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 已存在 | `docs/design/specs/7game-lite-user-stories-phaseC.md` | 5 条 Story（已完成） |
| **新建** | `docs/design/specs/7game-lite-impl-plan-phaseC.md` | **本文件** |
| 待创建 | `docs/verification/7game-lite-phaseC-verification.md` | Step 9 产出 |

---

## 2. task-tracker 更新

> 注：项目未建立 `task-tracker.md`，将在 Step 10 交接时统一处理。

---

## 3. 编码实施顺序

### Layer 1: Data Layer (`src/shared/`) — Story #1, #2

| # | 文件 | 操作 | 改动说明 | Story |
|---|------|------|----------|-------|
| D1 | `types/game-state.ts` | 修改 | +`BreakthroughBuffState` +`CultivateBoostBuff` 接口；`LiteGameState` +2个buff字段；`LifetimeStats` +`pillsConsumed` +`breakthroughFailed`；`createDefaultLiteGameState()` 升v3 | #1 |
| D2 | `data/realm-table.ts` | 修改 | +`BREAKTHROUGH_BASE_RATE` Map（炼气1→2 ~ 筑基2→3）；+`SPIRIT_VEIN_DENSITY` Map | #2, #4 |
| D3 | `formulas/realm-formulas.ts` | 修改 | `BreakthroughResult` 重设计（Fix A: `canAttempt` + `blockReason`）；`calculateBreakthroughResult` 改概率模型，新增 `successRate`/`failurePenalty` 等字段 | #4 |
| D4 | `formulas/idle-formulas.ts` | 修改 | `calculateAuraRate` 新增 `auraDensity` + `boostMultiplier` 两个参数和乘区（Fix B: 仅影响灵气） | #2 |

### Layer 2: Engine Layer (`src/engine/`) — Story #3, #4, #5

| # | 文件 | 操作 | 改动说明 | Story |
|---|------|------|----------|-------|
| E1 | `pill-consumer.ts` | **新增** | 3 种自动服丹逻辑（修速丹/破镜丹/回灵丹）；Fix C: 破镜丹门槛 ≤85% | #3 |
| E2 | `breakthrough-engine.ts` | **新增** | 概率突破 + buff 管理；接受 `BreakthroughBuffState` 参数；回灵丹补差额 | #4 |
| E3 | `idle-engine.ts` | 修改 | tick +修速丹倒计时 +自动服丹(pill-consumer) +自动突破(breakthrough-engine)；`tryBreakthrough` 改概率模型；`getCurrentAuraRate` 传入灵脉/修速丹参数 | #5 |
| E4 | `save-manager.ts` | 修改 | +`migrateV2toV3`（链式 v1→v2→v3）；`SAVE_VERSION=3` | #1 |

### Layer 3: Presentation (`src/main.ts`) — Story #5

| # | 文件 | 操作 | 改动说明 | Story |
|---|------|------|----------|-------|
| P1 | `main.ts` | 修改 | bt命令改概率模型；status扩展(修速丹/破镜丹/灵脉密度/统计)；新增 pill-consumer/breakthrough-engine 日志回调 | #5 |

---

## 4. 跨系统影响评估

| 受影响模块 | 改动原因 | 回归验证方式 |
|-----------|---------|-------------|
| `idle-formulas.ts` → `calculateAuraRate` | 新增2个参数 | **所有调用点**必须同步更新（idle-engine.ts L109, L117, L123, L200; main.ts L246） |
| `realm-formulas.ts` → `BreakthroughResult` | 接口重设计（Fix A） | `canBreakthrough` 需改用 `result.canAttempt`；`idle-engine.ts` `tryBreakthrough` 全面重构 |
| `behavior-tree.ts` | 不改动 | MEDITATE 弟子仍走原逻辑，无影响 |
| `farm-engine.ts` / `alchemy-engine.ts` | 不改动 | 丹药产出由 Phase B-α 管理，Phase C 仅消费 |
| `save-manager.ts` | 新增 v3 迁移 | 需测试 v1→v3、v2→v3 链式迁移 |

### Blocker 检查

| 检查项 | 结果 |
|--------|------|
| 与现有接口冲突？ | ⚠️ `calculateAuraRate` 签名变更（新增2参数）→ 所有调用点需同步更新。改动量可控（≤5处）。 |
| 需修改 ≥20% 核心代码？ | ❌ 不需要。Data Layer 新增为主，Engine 新增2文件+修改2文件。 |
| Story AC 能否在当前架构实现？ | ✅ 全部可实现，无架构阻断。 |

---

## 5. 关键设计决策备忘

### 5.1 `calculateAuraRate` 签名变更策略

**方案**：新增可选参数 `auraDensity=1.0`, `boostMultiplier=1.0`，保持向后兼容。

```typescript
export function calculateAuraRate(
  realm: number,
  subRealm: number,
  daoFoundation: number,
  auraDensity: number = 1.0,      // 灵脉密度（仅影响灵气）
  boostMultiplier: number = 1.0,  // 修速丹倍率（仅影响灵气）
): number
```

> `calculateComprehensionRate` 和 `calculateSpiritStoneRate` **不传**灵脉/修速丹参数（Fix B 约束）。

### 5.2 `BreakthroughResult` 新接口

```typescript
export type BreakthroughBlockReason =
  | 'tribulation-required'
  | 'max-realm'
  | 'aura-insufficient';

export interface BreakthroughResult {
  canAttempt: boolean;
  blockReason: BreakthroughBlockReason | null;
  successRate: number;
  success: boolean;             // 仅 canAttempt=true 时有意义
  auraCost: number;
  failurePenalty: number;       // 失败时扣的灵气
  newRealm: number;
  newSubRealm: number;
  newBaseAuraRate: number;
}
```

### 5.3 pill-consumer 自动触发时序

引擎 tick 内部执行顺序：
1. 修速丹 buff 倒计时（先扣时间）
2. 自动服修速丹（无buff时）
3. 自动服破镜丹（基础率≤85%，未满3颗）
4. 自动突破检测（成功率≥80%）
5. 灵气产出（含灵脉密度+修速丹加速）
6. 其他 tick 逻辑...

---

## 6. 实施预估

| 阶段 | 预估时间 |
|------|----------|
| D1~D4 Data Layer | ~30 min |
| E1~E4 Engine Layer | ~60 min |
| P1 Presentation | ~20 min |
| 手动验证 | ~10 min |
| **合计** | ~2 小时 |
