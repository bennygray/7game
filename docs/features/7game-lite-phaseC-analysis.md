# 7game-lite Phase C 需求分析进度

> 创建日期：2026-03-28
> 状态：**Phase IV 完成 ✅ — 已交付归档**
> 项目定位：Phase C — 突破机制、灵脉系统与丹药使用
> 前置：Phase B-α（灵田+炼丹核心）已完成

---

## Phase 0: 脚手架检查 — [✅]

目录全部存在，跳过。

---

## Phase I: 需求分析

### Step 1: 价值锚定与体验闭环 — [✅]

#### C1: 突破系统

| 维度 | 内容 |
|------|------|
| **核心体验** | 嗑药冲关→掷骰→境界飞升，「闭关冲击瓶颈」的紧张感 |
| **ROI** | 中成本。新增 breakthrough-engine + 改造 tryBreakthrough |
| **循环挂载** | 消耗→[灵气+破镜丹]；产出→[新境界] |

#### C2: 丹药使用

| 维度 | 内容 |
|------|------|
| **核心体验** | 丹药从「仓库数字」变成「可消费资源」 |
| **ROI** | 低成本。复用 pills[] + QUALITY_MULTIPLIER |
| **循环挂载** | 消耗→[pills[]]；产出→[灵气/加速/突破buff] |

#### C3: 灵脉系统

| 维度 | 内容 |
|------|------|
| **核心体验** | 境界↑→灵脉密度↑→全局灵气永久提速 |
| **ROI** | 极低。仅修改 calculateAuraRate 新增乘区 |
| **循环挂载** | 消耗→[境界]；产出→[全局灵气倍率] |

**USER 决策：**
- Q1: ✅ 小境界突破方案B（丹药损毁+扣50%灵气），大境界待后续定义
- Q2: ✅ 修速丹覆盖机制A（新覆盖旧）
- Q3: ✅ 完全自动化B（系统自动判定）
- Q4: ✅ 自动突破门槛80%，保留手动bt指令兜底
- Q5: ✅ 回灵丹仅突破前补差额时自动使用（方案A）
- Q6: ✅ 大境界突破本版本维持「需天劫，暂不可突破」

---

### Step 2: 实体与数据基石 — [✅]

#### 2.1 实体变更清单

| 操作 | 实体 | 说明 |
|------|------|------|
| **新增** | `BreakthroughBuffState` | 破镜丹buff（品质列表+总加成），上限3颗 |
| **新增** | `CultivateBoostBuff` | 修速丹buff（品质+剩余秒数），覆盖机制 |
| **新增** | `BREAKTHROUGH_BASE_RATE` | 突破基础成功率表 |
| **新增** | `SPIRIT_VEIN_DENSITY` | 灵脉密度倍率表 |
| **修改** | `LiteGameState` | +breakthroughBuff +cultivateBoostBuff |
| **修改** | `calculateAuraRate` | +auraDensity +boostMultiplier 乘区 |
| **修改** | `BreakthroughResult` | 移除requiresTribulation，改概率模型 |

#### 2.2 Interface 草案

```typescript
export interface BreakthroughBuffState {
  pillsConsumed: AlchemyQuality[];  // 最多3颗
  totalBonus: number;               // 缓存加成值
}

export interface CultivateBoostBuff {
  qualityMultiplier: number;  // 品质倍率
  remainingSec: number;       // 剩余秒数
}

// LiteGameState 新增:
// breakthroughBuff: BreakthroughBuffState
// cultivateBoostBuff: CultivateBoostBuff | null
```

#### 2.3 持久化：极小（<100 bytes），存档迁移 v2→v3

---

### Step 3: 规则与数值边界 — [✅]

#### 3.1 突破系统（C1）

**突破基础成功率表 F-C1：**

| 突破 | 基础率 | 3×中品后 | 失败代价 |
|------|--------|---------|---------|
| 炼气1→2 | 95% | 99% | 丹药损毁+扣50%灵气 |
| 炼气2→3 | 90% | 99% | 同上 |
| 炼气3→4 | 85% | 99% | 同上 |
| 炼气4→5 | 80% | 95% | 同上 |
| 炼气5→6 | 75% | 90% | 同上 |
| 炼气6→7 | 70% | 85% | 同上 |
| 炼气7→8 | 60% | 75% | 同上 |
| 炼气8→9 | 50% | 65% | 同上 |
| 炼气9→筑基1 | ❌ 需天劫 | — | 本版本不可突破 |
| 筑基1→2 | 25% | 70% | 丹药损毁+扣50%灵气 |
| 筑基2→3 | 20% | 65% | 同上 |
| 筑基3→4 | ❌ 不可 | — | — |

**F-C1a 成功率**: `min(基础率 + Σ(0.15 × 品质倍率), 0.99)`
**F-C1b 失败代价**: 破镜丹清零 + `灵气 -= 突破灵气门槛 × 0.5`
**F-C1c 自动触发**: 成功率≥80% 且 灵气≥门槛（不足时先用回灵丹补）

#### 3.2 丹药使用（C2）

**回灵丹**: `恢复灵气 = 500 × 品质倍率`，仅突破前自动补差额
**修速丹**: `灵气速率×2`，持续 `60s × 品质倍率`，覆盖机制，无buff时自动服用
**破镜丹**: `+15% × 品质倍率/颗`，最多3颗，自动服用（优先低品质）

#### 3.3 灵脉（C3）

**F-C3 密度表**: 炼气1-3=1.0, 4-6=1.2, 7-9=1.5, 筑基1=2.0, 2=3.0, 3=5.0

**F-C4 总灵气公式**: `基础速率 × 道基倍率 × 灵脉密度 × 修速丹倍率`

#### 3.4 MECE 校验

| 检查项 | 结果 |
|--------|------|
| 破镜丹→突破消耗 | ✅ 闭环 |
| 回灵丹→突破补气 | ✅ 闭环 |
| 修速丹→修炼加速 | ✅ 闭环 |
| 突破→灵脉↑→全局加速 | ✅ 正向循环 |
| 突破失败→无死锁 | ✅ 扣50%灵气可再试 |
| 筑基3修速丹通胀 | ⚠️ 需验证脚本确认 |

---

### Phase I 完成门禁：Self-Review — [✅]

1. **Placeholder 扫描**：✅ 无TBD。大境界突破明确标注「本版本不做」
2. **内部一致性**：✅ 循环拓扑与产源消耗一致
3. **歧义检查**：✅ 覆盖/清零/自动触发条件全部明确
4. **数值完整性**：✅ F-C1a~C1c, F-C3, F-C4 全部有数值

---

## Phase II: 架构拆解

### Step 4: 架构分层与责任剥离 — [✅]

#### Data Layer (`src/shared/`)

| 文件 | 操作 | 说明 |
|------|------|------|
| `types/game-state.ts` | 修改 | +BreakthroughBuffState +CultivateBoostBuff |
| `data/realm-table.ts` | 修改 | +BREAKTHROUGH_BASE_RATE +SPIRIT_VEIN_DENSITY |
| `formulas/idle-formulas.ts` | 修改 | calculateAuraRate +auraDensity +boostMul 乘区 |
| `formulas/realm-formulas.ts` | 修改 | 概率模型，移除requiresTribulation |

#### Engine Layer (`src/engine/`)

| 文件 | 操作 | 说明 |
|------|------|------|
| `breakthrough-engine.ts` | **新增** | 概率突破 + 破镜丹buff 管理 |
| `pill-consumer.ts` | **新增** | 自动丹药消费（3种） |
| `idle-engine.ts` | 修改 | tick +buff倒计时 +自动服丹 +自动突破 |
| `save-manager.ts` | 修改 | v2→v3 迁移 |

#### Presentation (`src/main.ts`)

| 文件 | 操作 | 说明 |
|------|------|------|
| `main.ts` | 修改 | bt命令改概率模型 + status扩展 + 新MUD日志 |

**USER 决策**：✅ pill-consumer.ts 独立文件

---

### Step 5: 分期交付路线图 — [✅]

| # | 里程碑 | 复杂度 | 说明 |
|---|--------|--------|------|
| C1 | GameState v3 + 存档迁移 | S | v2→v3 |
| C2 | 灵脉密度 + calculateAuraRate 扩展 | S | 新增两个乘区 |
| C3 | 丹药消费引擎 pill-consumer | M | 3种自动服丹 |
| C4 | 概率突破引擎 | M | 概率判定+buff管理 |
| C5 | Tick 扩展 + MUD 日志 | S | 集成到引擎 |

**依赖**：C1→C2→C3→C4→C5（线性）| **总预估**：~2 天

---

### Step 6: User Story 映射 — [✅]

**Story 文件**：`docs/design/specs/7game-lite-user-stories-phaseC.md`

| Story | 复杂度 | 标题 | 依赖 |
|-------|--------|------|------|
| #1 | S | GameState v3 + 存档迁移 v2→v3 | 无 |
| #2 | S | 灵脉密度 + 灵气速率扩展 | #1 |
| #3 | M | 丹药消费引擎（自动服丹） | #1 |
| #4 | M | 概率突破引擎 | #1, #3 |
| #5 | S | Tick 扩展 + MUD 日志集成 | #1~#4 |

---

### Phase II 完成门禁：Self-Review — [✅]

1. **Story 覆盖度**：✅ C1~C5 里程碑全部有对应 Story
2. **AC 质量扫描**：✅ 全部 Given-When-Then，无模糊动词，含边界 AC（满药/空库存/大境界阻断）
3. **依赖完整性**：✅ 线性拓扑无循环
4. **Anti-pattern 对照**：✅ 已核对五大类反模式

---

## Phase III: 执行指导

### Step 7: 文档先行与代码实施 — [✅]

**实施计划文件**：[7game-lite-impl-plan-phaseC.md](file:///d:/7game/docs/design/specs/7game-lite-impl-plan-phaseC.md)

#### 执行清单摘要

| # | 层级 | 新建/修改文件 | Story |
|---|------|--------------|-------|
| D1 | Data | `types/game-state.ts` 修改 | #1 |
| D2 | Data | `data/realm-table.ts` 修改 | #2, #4 |
| D3 | Data | `formulas/realm-formulas.ts` 修改 | #4 |
| D4 | Data | `formulas/idle-formulas.ts` 修改 | #2 |
| E1 | Engine | `pill-consumer.ts` **新增** | #3 |
| E2 | Engine | `breakthrough-engine.ts` **新增** | #4 |
| E3 | Engine | `idle-engine.ts` 修改 | #5 |
| E4 | Engine | `save-manager.ts` 修改 | #1 |
| P1 | Presentation | `main.ts` 修改 | #5 |

#### 跨系统影响

- `calculateAuraRate` 签名新增 2 个可选参数（默认值兼容）
- `BreakthroughResult` 接口重设计（Fix A）→ 所有使用点需同步
- Blocker: ❌ 无阻断项

---

### Step 8: 验证脚本指引 — [✅]

#### 8.1 验证计划

| 类型 | 位置 | 说明 |
|------|------|------|
| **数值验证脚本** | `scripts/verify-phaseC.ts` | 概率突破 + 灵脉密度 + 丹药消费公式 |
| **功能测试** | 内嵌于验证脚本 | 存档迁移 v2→v3 + 链式 v1→v3 |
| **AI 功能测试** | 本系统无 AI 功能测试需求 | — |

#### 8.2 数值验证脚本覆盖矩阵

| 公式 | 验证方法 | 通过标准 |
|------|---------|---------|
| **F-C1a** 成功率 `min(基础率 + Σ(0.15×品质倍率), 0.99)` | 确定性断言：炼气3→4 无丹 85%、+3中品 →99%（cap） | 精确匹配 |
| **F-C1b** 失败代价 `灵气 -= 门槛×0.5` | 确定性断言：炼气3→4 门槛1500 → 惩罚750 | 精确匹配 |
| **F-C1c** 自动触发 `成功率≥80% 且 灵气≥门槛` | 边界测试：79.9% 不触发，80.0% 触发 | 精确匹配 |
| **F-C3** 灵脉密度 | 查表断言：炼气1=1.0, 4=1.2, 7=1.5, 筑基1=2.0 | 精确匹配 |
| **F-C4** 总灵气 `基础×道基×密度×修速丹` | 确定性计算：炼气5 凡品 密度1.2 修速丹×2 → 10×1.5×1.2×2=36 | 精确匹配 |
| **破镜丹门槛** | Fix C: 基础率85% 吃丹，90% 不吃 | 边界断言 |
| **修速丹覆盖** | 旧buff 30s → 新高品 → buff=90s | 精确匹配 |
| **回灵丹补差额** | 灵气500, 门槛1500, 3×中品回灵丹(500×1.0) → 补1000 → 灵气1500 | 精确匹配 |
| **Monte Carlo 突破** | 10000次炼气7→8 无丹(60%) → 成功率偏差 \<5% | 统计验收 |

#### 8.3 存档迁移验证

| 场景 | 验证方法 |
|------|---------|
| v2 → v3 迁移 | 伪造v2存档对象，调用迁移函数，断言新增字段默认值 |
| v1 → v3 链式迁移 | 伪造v1存档对象，链式执行，断言 v2+v3 字段全部存在 |
| v3 存档不触发迁移 | version=3 直接返回 |

#### 8.4 脚本模板（实施时使用）

```
运行命令：npx tsx scripts/verify-phaseC.ts
通过标准：退出码 0 + "全部测试通过"
失败行为：process.exit(1) + 输出失败项明细
模板参考：scripts/verify-phaseB-alpha.ts（已有 assert 工具函数）
```

#### 8.5 回归验证

| 已有系统 | 验证方式 |
|---------|---------|
| Phase B-α 灵田+炼丹 | `npx tsx scripts/verify-phaseB-alpha.ts`（应不受影响） |
| 弟子行为树 | 目视检查：MEDITATE/FARM/ALCHEMY 行为无异常 |
| 灵气/悟性/灵石产出 | F-C4 验证脚本覆盖（`calculateComprehensionRate`/`calculateSpiritStoneRate` 不含灵脉乘区） |

---

### Phase III 完成门禁：Self-Review — [✅]

1. **Spec 覆盖度**：✅ impl-plan-phaseC.md 覆盖全部 5 条 Story 涉及的文件
2. **数值验证覆盖度**：✅ Step 3 中 F-C1a~C1c、F-C3、F-C4、Fix C 全部有对应验证行

---

## 附录：三方专家审阅修正记录

> 审阅视角：资深游戏架构师 + 资深游戏策划师 + 资深游戏产品经理
> 审阅日期：2026-03-28

### Fix A: BreakthroughResult 重设计 ✅

**问题**：`requiresTribulation: boolean` 是单用途布尔值，不可扩展。
**修正**：改为 `canAttempt` + `blockReason` 联合类型枚举。

```typescript
export type BreakthroughBlockReason =
  | 'tribulation-required'
  | 'max-realm'
  | 'aura-insufficient';

export interface BreakthroughResult {
  canAttempt: boolean;
  blockReason: BreakthroughBlockReason | null;
  successRate: number;
  success: boolean;
  auraCost: number;
  failurePenalty: number;
  newRealm: number;
  newSubRealm: number;
  newBaseAuraRate: number;
}
```

**影响**：`canBreakthrough()` 改为 `return result.canAttempt`。`main.ts` / `idle-engine.ts` 用 `blockReason` 显示文案。

### Fix B: calculateAuraRate 灵脉密度仅影响灵气 ✅

**决策**：灵脉密度 + 修速丹乘区**仅影响灵气**产出。悟性/灵石速率不受影响。
**后续**：灵脉系统后续版本可能整体重构完善。

**实现**：`calculateComprehensionRate` 和 `calculateSpiritStoneRate` 内部仍调用旧版 `calculateAuraRate`（不含灵脉/修速丹），或直接用 `getBaseAuraRate × 道基倍率` 作为基准。

### Fix C: 破镜丹自动服用门槛 85% ✅

**问题**：高成功率突破（如炼气1→2 95%）自动吃破镜丹是浪费。
**修正**：**基础成功率 ≤ 85%** 时才自动服用破镜丹。

**效果**：
- 炼气1→2 (95%)：不吃丹 ✅
- 炼气2→3 (90%)：不吃丹 ✅
- 炼气3→4 (85%)：吃丹（边界值） ✅
- 炼气7→8 (60%)：吃丹 ✅

### Fix D: 修速丹自动服用保持当前设计 ✅

**决策**：无 buff 且有库存即自动吃。
**后续备忘**：后续版本服丹逻辑将与弟子性格体系关联（如懒惰弟子可能不主动吃药）。

### Fix E: UX 日志优化推迟 ✅

**决策**：自动化系统日志的醒目颜色/首次引导文案推迟到独立 UX 优化 Phase。
**记录**：需特殊颜色+边框区分日常弟子日志，首次触发时显示新手引导。

### Fix F: 丹药统计计数写入 Phase C 范围 ✅

**新增**：`lifetimeStats` 新增 `pillsConsumed: number` + `breakthroughFailed: number`。
纳入 Story #1 存档迁移和 Story #5 status 命令显示。

---

## 变更日志

| 日期 | 级别 | 变更内容 | 影响范围 | 回退到 |
|------|------|----------|----------|--------|
| 2026-03-28 | 中度 | BreakthroughResult 重设计（Fix A） | Step 2 实体 + Story #4 | Step 2 |
| 2026-03-28 | 微调 | 灵脉密度仅影响灵气（Fix B） | Step 3 F-C4 + Story #2 | — |
| 2026-03-28 | 微调 | 破镜丹门槛 85%（Fix C） | Step 3 §3.2 + Story #3 | — |
| 2026-03-28 | 微调 | 新增丹药统计字段（Fix F） | Step 2 + Story #1/#5 | — |
