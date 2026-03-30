# Phase X-β TDD — 命令增强 + 视觉反馈

> **版本**：v1.0 | **创建日期**：2026-03-31
> **Phase**：X-β | **SGA 状态**：GATE 2 待签
> **前置**：GATE 1 ✅ (2026-03-31)

---

## Step 1：全局对齐 + Invariant 验证

### 层级归属

本 Phase 的所有变更位于 **④ Presentation Layer**。

| 变更 | 归属层 | 文件 |
|------|--------|------|
| 命令别名 | ④ Presentation | `src/ui/command-handler.ts` |
| Tab 补全 | ④ Presentation | `src/ui/command-handler.ts` |
| 行为图标 | ④ Presentation | `src/ui/mud-formatter.ts` + `src/ui/engine-bindings.ts` |
| 突破闪烁 | ④ Presentation | `src/styles/mud-theme.css` + `src/ui/engine-bindings.ts` |

### Invariant 交叉验证

| PRD 不变量 | 架构约束 | 冲突？ |
|-----------|---------|:------:|
| I1: 零 Engine/AI/Data 变更 | X-1: 禁止 UI 直接修改 GameState | ❌ 无冲突 |
| I2: GameState v5 不变 | §6.2 扩展协议不触发 | ❌ 无冲突 |
| I3: 回归 64/64 | Pipeline 不变 | ❌ 无冲突 |
| I4: 不引入重框架 | Electron 预期 | ❌ 无冲突 |
| I7: main.ts ≤150 行 | 不修改 main.ts | ❌ 无冲突 |

**结论**：零冲突。所有变更局限在 Presentation 层内部。

### GameState 变更

**无**。零新字段、零存档迁移、v5 不变。

### Pipeline 挂载变更

**无**。13 个 Handler 不变。

---

## Step 2：Interface 设计 + 数据变更

### 2.1 新增数据结构

#### 行为图标映射表（纯数据，mud-formatter.ts 内）

```typescript
/** 行为图标前缀映射（PRD §2.4 B-图标表） */
const BEHAVIOR_ICON: Record<string, string> = {
  idle:     '💤',
  meditate: '🧘',
  explore:  '⚔️',
  rest:     '😴',
  alchemy:  '🔥',
  farm:     '🌿',
  bounty:   '📜',
};

/** 获取行为图标（无匹配返回空串） */
export function getBehaviorIcon(behavior: string): string {
  return BEHAVIOR_ICON[behavior] ?? '';
}
```

#### 命令别名表（command-handler.ts 内）

```typescript
/** 命令别名 → 完整命令（PRD §2.3 A-别名表） */
const COMMAND_ALIASES: Record<string, string> = {
  s: 'status',
  j: 'judge',
  h: 'help',
};
```

> **注意**：`l`→`look`、`i`→`inspect`、`bt`→`breakthrough` 已在现有 if/case 结构中实现，不需要进入别名表。新别名通过在 `handleCommand` 入口处进行展开。

#### Tab 补全状态（command-handler.ts 内）

```typescript
/** Tab 补全运行时状态（不持久化） */
interface TabCompletionState {
  /** 当前匹配的候选列表 */
  candidates: string[];
  /** 当前循环索引 */
  index: number;
  /** 触发补全时的原始输入前缀 */
  prefix: string;
}

let tabState: TabCompletionState | null = null;
```

### 2.2 修改现有文件

#### `src/ui/command-handler.ts` — 新增别名 + Tab 补全

| 变更点 | 描述 |
|--------|------|
| 新增 `COMMAND_ALIASES` 常量 | 3 个新别名映射 |
| `handleCommand` 入口增加别名展开逻辑 | `const resolved = COMMAND_ALIASES[verb] ?? verb;` |
| 新增 `initTabCompletion()` 逻辑 | 监听 Tab/Shift+Tab 键，绑定到 inputEl |
| 新增 `getCompletionCandidates()` 纯函数 | 根据当前输入生成候选列表 |
| 更新 `help` 命令输出 | 展示新别名（如 `status / s`） |

#### `src/ui/engine-bindings.ts` — 图标前缀 + 突破闪烁

| 变更点 | 描述 |
|--------|------|
| `onDiscipleBehaviorChange` 回调 | 行为开始日志添加图标前缀（调用 `getBehaviorIcon`） |
| `onBreakthrough` 回调 | 突破成功/失败后触发闪烁效果（调用 `triggerBreakthroughFlash`） |

#### `src/ui/mud-formatter.ts` — 图标前缀

| 变更点 | 描述 |
|--------|------|
| 新增 `BEHAVIOR_ICON` 映射 + `getBehaviorIcon()` 导出函数 | 7 个行为的图标 |
| `formatLookOverview` 弟子列表行 | 添加图标前缀 |
| `formatDiscipleProfile` 弟子当前行为行 | 添加图标前缀 |

#### `src/styles/mud-theme.css` — 闪烁动画

| 变更点 | 描述 |
|--------|------|
| 新增 `@keyframes mud-flash-gold` | 突破成功金色闪烁（2s） |
| 新增 `@keyframes mud-flash-red` | 突破失败红色闪烁（1s） |
| 新增 `.mud-flash-overlay` | 闪烁 overlay 样式 |

### 2.3 文件变更矩阵

| # | 文件 | 变更类型 | 变更量估算 |
|---|------|---------|:---------:|
| 1 | `src/ui/command-handler.ts` | MODIFY | +80~100 行 |
| 2 | `src/ui/engine-bindings.ts` | MODIFY | +15~20 行 |
| 3 | `src/ui/mud-formatter.ts` | MODIFY | +20~25 行 |
| 4 | `src/styles/mud-theme.css` | MODIFY | +40~50 行 |

**总计**：0 新文件、4 修改文件、+155~195 行。零 Engine/Data/AI 层变更。

---

## Step 3：依赖矩阵 + 回归影响评估

### 依赖变更

**无新依赖**。所有变更均在 Presentation 层内部：
- `command-handler.ts` 已依赖 `mud-formatter.ts`（不变）
- `engine-bindings.ts` 已依赖 `mud-formatter.ts`（不变）
- `mud-formatter.ts` 已依赖 `game-state.ts`（不变，只读）

### 回归影响评估

| 系统 | 影响 | 风险 |
|------|------|:----:|
| Engine（13 Handler） | ❌ 零影响 | 🟢 |
| GameState v5 | ❌ 零影响 | 🟢 |
| AI 层 | ❌ 零影响 | 🟢 |
| 存档迁移 | ❌ 不触发 | 🟢 |
| 命令系统（10 命令） | ⚠️ Tab 补全逻辑新增，需验证不影响现有键盘事件 | 🟡 |
| 日志显示 | ⚠️ 图标前缀改变了输出格式，需验证 | 🟡 |

### 回归清单

1. `npx tsc --noEmit` — 零编译错误
2. `npx tsx scripts/regression-all.ts` — 64/64
3. 手动测试：10 个命令 + 3 个新别名
4. 手动测试：Tab 补全（命令 + 弟子名）
5. 手动测试：突破闪烁效果

---

## Step 4：ADR 决策日志

### ADR-Xβ-01：Tab 补全内联 vs 独立文件

| 维度 | 方案 A：内联在 command-handler.ts | 方案 B：独立 tab-completion.ts |
|------|:---:|:---:|
| 代码量 | +80 行（总 ~360 行） | +100 行（新文件）+ 10 行集成 |
| 耦合度 | Tab 直接访问 history/inputEl，零额外接口 | 需要定义 CompletionProvider 接口 |
| 可测试性 | 与命令系统共享测试上下文 | 独立可测试 |
| X-α 先例 | X-α 命令历史也内联在 command-handler.ts | — |

**决策**：选择 **方案 A（内联）**。
**理由**：
1. Tab 补全与命令解析高度耦合（需要知道命令列表、弟子名列表、当前输入状态）
2. X-α 先例：命令历史已在同文件内联，保持一致
3. 360 行在合理范围内（X-α 目标 command-handler 不设行数上限）
4. 后续 X-γ 如需拆分可随时重构

### ADR-Xβ-02：突破闪烁触发点

| 维度 | 方案 A：command-handler 的 bt 命令 | 方案 B：engine-bindings 的 onBreakthrough 回调 |
|------|:---:|:---:|
| 覆盖率 | 仅手动突破 | 手动 + 自动突破（auto-breakthrough handler） |
| 代码位置 | 命令处理器（不应有视觉效果逻辑） | 回调绑定器（已有突破日志渲染） |
| 解耦性 | 闪烁逻辑侵入命令层 | 闪烁逻辑与突破事件解耦 |

**决策**：选择 **方案 B（engine-bindings 的 onBreakthrough 回调）**。
**理由**：
1. 覆盖自动突破场景（PRD AC3-5）
2. 职责分离：engine-bindings 已负责突破事件的 UI 响应
3. command-handler 的 `bt` 命令仍保留现有的突破日志输出（向后兼容），但将 `engine.setOnBreakthrough` 回调中的闪烁作为统一入口

> **注意**：command-handler 中 `bt` 命令会调用 `engine.tryBreakthrough()`，该方法内部会触发 `onBreakthrough` 回调，因此闪烁效果自动覆盖。无需在两处都触发。

---

## SGA Party Review

### L0：Content Traceability Pre-Check

SGA 审查对象为 TDD（架构设计），L0 跳过（仅适用于 User Story + Data Anchor）。

### L1：维度穷举签字

#### R4 项目经理（必选）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| R4-D1 | 工期合理性 | ✅ | 4 文件修改、+155~195 行，1 个工作日可完成 |
| R4-D2 | 跨版本影响 | ✅ | 零 GameState/存档变更，零跨版本风险 |
| R4-D3 | 依赖变更 | ✅ | 零新依赖 |
| R4-D4 | 路线图对齐 | ✅ | FB-016 清偿，X-β→X-γ 依赖链清晰 |
| R4-D5 | 自动化验证 | ✅ | tsc + regression 覆盖，手动测试 4 项 |

#### R5 偏执架构师（必选）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| R5-D1 | 层级违反 | ✅ | 100% Presentation 层内部，零跨层 |
| R5-D2 | 依赖方向 | ✅ | 无新依赖方向 |
| R5-D3 | 耦合度 | ✅ | Tab 补全内联 command-handler（ADR-Xβ-01 合理） |
| R5-D4 | 可扩展性 | ✅ | 别名表/图标表均为 Record 查找，O(1) 扩展 |
| R5-D5 | Electron 兼容 | ✅ | 纯 CSS animation + vanilla TS |

#### R6 找茬QA（必选）

| # | 维度 | 判定 | 说明 |
|---|------|:----:|------|
| R6-D1 | 边界 case | ✅ | Tab 空输入/无匹配/单匹配/多匹配均有 AC 覆盖 |
| R6-D2 | 竞态风险 | ✅ | Tab 补全是纯同步操作，无竞态 |
| R6-D3 | 内存泄漏 | ✅ | 闪烁 overlay animationend 自动清理（PRD V-04） |
| R6-D4 | 回归测试 | ✅ | tsc + 64/64 regression + 5 项手动测试 |
| R6-D5 | 文档同步 | ⚠️ | command-handler.ts 新增行数后需确认 help 命令输出与 PRD 一致 |

### L2：CoVe 证据验证

#### R6-D5 WARN — help 命令输出同步

**验证问题**：
1. help 命令的输出文本在哪里维护？
2. 新增别名后需要更新几处？

**独立回答**：
1. `command-handler.ts` 的 `case 'help':` 分支中硬编码
2. 仅 1 处 — help 输出文本。PRD 中已列出新格式（AC0-5）

**CoVe 结论**：维持 **WARN** — 实施时在 help 输出中增加新别名展示即可（不需要设计变更）。

---

### 汇总

| # | 角色 | 维度 | 判定 | 说明 | CoVe 结果 |
|---|------|------|:----:|------|-----------| 
| 1 | R4 项目经理 | 全 5 维度 | ✅ | 无问题 | — |
| 2 | R5 偏执架构师 | 全 5 维度 | ✅ | 无问题 | — |
| 3 | R6 找茬QA | D1~D4 | ✅ | 无问题 | — |
| 4 | R6 找茬QA | D5 文档同步 | ⚠️ | help 输出需同步 | 维持 WARN: 实施时同步 |

### 最终判定

**⚠️ CONDITIONAL PASS** — 1 个 WARN（R6-D5 help 输出同步），无 BLOCK。

**WARN 处理**：R6-D5 在 SGE 实施 Story #0 时直接在 help 输出中包含新别名，不需要额外设计。

---

## GATE 2 签章

```
## SGA Signoff

- [x] Interface 设计完整（无新 GameState 字段）
- [x] 迁移策略完整（无迁移需求 — v5 不变）
- [x] Pipeline 挂载方案确认（无挂载变更 — 13 Handler 不变）
- [x] 依赖矩阵已更新（无新依赖）
- [x] Party Review 无 BLOCK 项 ✅
- [x] 技术债务已登记（Review WARN 项为实施期同步，无新技术债务）

签章：[x] GATE 2 PASSED — 2026-03-31
```
