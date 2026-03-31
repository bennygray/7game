# Phase X 前端代码质量 Review 报告

> **审查范围**: Phase X-α/β/γ 全部前端代码（8 文件，~1900 行 TS + 738 行 CSS）
> **审查日期**: 2026-03-31
> **审查方式**: 逐行人工 Review，对照 CLAUDE.md 编码规范 + AGENTS.md 架构约束
> **结论**: 发现 **23 项问题**（P0×4 / P1×5 / P2×8 / P3×6），整体评级 **C+**

---

## 一、总评

Phase X 的架构拆分方向正确（main.ts 606→139 行，模块职责清晰），但执行质量参差不齐。
核心问题集中在 **command-handler.ts**（最大文件，问题最多）和 **main.ts**（入口文件，类型安全差）。
log-manager / panel-manager 两个小模块质量较高，可作为标杆。

### 逐文件评级

| 文件 | 行数 | 评级 | 主要问题 |
|------|:----:|:----:|----------|
| `src/ui/log-manager.ts` | 69 | **A** | 无明显问题 |
| `src/ui/panel-manager.ts` | 77 | **A-** | ESC 监听器无清理 |
| `src/ui/layout.ts` | 105 | **B+** | 非空断言 `!` 较多 |
| `src/ui/engine-bindings.ts` | 244 | **B+** | UI 层直接写 GameState |
| `src/styles/mud-theme.css` | 738 | **B** | 单文件过大，无拆分 |
| `src/ui/mud-formatter.ts` | 543 | **B-** | 最大文件，HTML 拼接重复 |
| `src/main.ts` | 139 | **B-** | `as any`、无用导入、重复逻辑 |
| `src/ui/command-handler.ts` | 392 | **C+** | 问题最集中（类型/架构/重复） |

---

## 二、问题清单

### P0 — 类型安全违规（4 项）

> CLAUDE.md: "TypeScript strict 模式，禁止 `any`（用 `unknown` + 类型守卫）"

#### P0-01: `as any` 强转 — LLMAdapter 接口不完整

**位置**: `command-handler.ts:357`, `main.ts:105`

```typescript
// command-handler.ts:356-357
if ('tryConnect' in llmAdapter) {
  (llmAdapter as any).tryConnect().then((ok: boolean) => { ... });
}

// main.ts:104-105
if ('tryConnect' in llmAdapter) {
  (llmAdapter as any).tryConnect().then((ok: boolean) => { ... });
}
```

**问题**: `LLMAdapter` 接口缺少 `tryConnect()` 方法定义，导致必须用 `as any` 绕过。两处完全相同的代码还构成了重复（见 P1-05）。

**修复建议**: 在 `LLMAdapter` 接口中声明 `tryConnect(): Promise<boolean>`，或定义独立的 `ConnectableLLMAdapter` 接口。

---

#### P0-02: `as any` 强转 — `window.__mudReset` 无类型声明

**位置**: `command-handler.ts:381-382`, `main.ts:132`

```typescript
// main.ts:132 — 挂载
(window as any).__mudReset = () => { resetting = true; };

// command-handler.ts:381-382 — 使用
if (typeof (window as any).__mudReset === 'function') {
  (window as any).__mudReset();
}
```

**问题**: 通过 `window` 全局变量做跨模块通信，完全绕过了 TypeScript 类型系统。

**修复建议**: 在 `CommandContext` 中注入 `onReset: () => void` 回调，消除全局耦合。

---

#### P0-03: `entry.data?.severity as number` 未经验证的类型断言

**位置**: `engine-bindings.ts:128`

```typescript
severity = entry.data.severity as number;  // R-06
```

**问题**: `entry.data` 类型为 `Record<string, unknown>`，直接 `as number` 跳过了类型守卫。如果上游数据结构变化，此处不会报编译错误。

**修复建议**: 使用类型守卫 `typeof entry.data.severity === 'number'`。

---

#### P0-04: `entry.data?.result === 'chat'` 未经验证的属性访问

**位置**: `engine-bindings.ts:130`

```typescript
severity = entry.data?.result === 'chat' ? EventSeverity.RIPPLE : EventSeverity.SPLASH;
```

**问题**: 同上，`entry.data.result` 类型为 `unknown`，直接与字符串比较虽然运行时不会报错，但语义上跳过了类型检查。

---

### P1 — 架构违规（5 项）

#### P1-01: command-handler 直接操作 DOM，绕过注入的 logManager

**位置**: `command-handler.ts:349-350`, `command-handler.ts:377-378`

```typescript
// 'clear' 命令
const mainLogEl = document.getElementById('main-log');
if (mainLogEl) mainLogEl.innerHTML = '';

// 'reset' 命令（重复）
const mainEl = document.getElementById('main-log');
if (mainEl) mainEl.innerHTML = '';
```

**问题**:
1. `CommandContext` 已注入 `logManager`，却绕过它直接 `getElementById`
2. 两处完全相同的逻辑（DRY 违规）
3. 硬编码 DOM ID `'main-log'`（脆弱耦合）

**修复建议**: 在 `LogManager` 接口添加 `clearMainLog(): void`。

---

#### P1-02: command-handler 直接操作 localStorage

**位置**: `command-handler.ts:384`

```typescript
localStorage.removeItem('7game-lite-save');
```

**问题**:
1. 硬编码存档 key `'7game-lite-save'`（魔法字符串，与 save-manager 重复定义）
2. UI 层直接调用 `localStorage` API，违反层级隔离

**修复建议**: 在 `CommandContext` 中注入 `clearSave(): void` 或通过 save-manager 导出的函数操作。

---

#### P1-03: `status` 命令格式化逻辑内联在 switch case 中

**位置**: `command-handler.ts:300-326`

```typescript
case 'status':
  addMainLog(`境界：${...}`);
  addMainLog(`灵气：${...}`);
  // ...27 行格式化 + 数据查询逻辑
  break;
```

**问题**: 其他命令（look/inspect/sect/judge）的格式化逻辑都已抽到 `mud-formatter.ts`，唯独 `status` 内联。这导致：
1. 职责不一致 — command-handler 混入了展示逻辑
2. 无法复用 — 如果面板化 status，需要重写
3. 无法测试 — 依赖 `addMainLog` 副作用

**修复建议**: 创建 `formatStatusPanel()` 纯函数，将 status 也面板化输出。

---

#### P1-04: engine-bindings UI 层直接写 GameState

**位置**: `engine-bindings.ts:176-178`, `engine-bindings.ts:194-196`

```typescript
// L176: 创建 AI 上下文
if (!state.aiContexts[evt.disciple.id]) {
  state.aiContexts[evt.disciple.id] = createDefaultAISoulContext();
}

// L194-196: 写入短期记忆 + 时间戳
addShortTermMemory(ctx, `${getBehaviorLabel(evt.newBehavior)}: ${line}`);
ctx.lastInferenceTime = Date.now();
```

**问题**: CLAUDE.md 明确禁止 "UI 层直接修改 GameState"。此处 engine-bindings（属于 `src/ui/`）直接创建和修改 `state.aiContexts`。

**修复建议**: 将 AI 上下文初始化和记忆写入移到 Engine 层的回调内部或专门的 AI 管理模块。

---

#### P1-05: main.ts 与 command-handler 重复 AI 连接逻辑

**位置**: `main.ts:103-121` vs `command-handler.ts:354-373`

两处包含几乎相同的 AI 连接逻辑：
- `llmAdapter.tryConnect()` + 成功/失败日志
- `new SoulEvaluator()` + `tryConnect()` + `initSoulEventEvaluator()`

**问题**: main.ts 启动时自动连接，command-handler 的 `ai` 命令手动连接。逻辑完全重复，且 `new SoulEvaluator()` 每次 `ai` 命令都会创建新实例。

**修复建议**: 抽取 `connectAI()` 函数到独立模块，main.ts 和 ai 命令共用。

---

### P2 — 代码质量（8 项）

#### P2-01: 模块级 mutable 状态无法 reset 和测试

**位置**: `command-handler.ts:56-57`, `command-handler.ts:72`

```typescript
const history: string[] = [];
let historyIndex = -1;
let tabState: TabCompletionState | null = null;
```

**问题**: 模块级变量在整个应用生命周期存在，无法在测试中 reset。如果需要多实例（如未来热重载），会产生状态泄漏。

**修复建议**: 将这些状态封装在 `initCommandSystem` 返回的闭包内（类似 log-manager 的做法）。

---

#### P2-02: 环境呼吸递归 setTimeout 无清理机制

**位置**: `engine-bindings.ts:218-224`

```typescript
function scheduleAmbientBreath(addSystemLog: (html: string) => void): void {
  const delay = (25 + Math.random() * 20) * 1000;
  setTimeout(() => {
    addSystemLog(...);
    scheduleAmbientBreath(addSystemLog);  // 递归，永不停止
  }, delay);
}
```

**问题**: 没有返回 timer ID，无法 `clearTimeout`。引擎 `stop()` 后此定时器仍会继续触发，向已停止的 UI 写入日志。这是 TD-022 技术债务，但至今未解决。

**修复建议**: 返回一个 `dispose()` 函数，在 engine stop 时调用。

---

#### P2-03: 弟子未找到消息格式不一致

**位置**: `command-handler.ts:229`, `:248`, `:250`

```typescript
// look 命令
`[系统] 未找到名为"${escapeHtml(arg)}"的弟子`     // 用 ""

// inspect 命令 (multiple)
`[系统] 找到多位弟子：...请输入更完整的名字。`     // 句号
// inspect 命令 (none)
`[系统] 未找到名为「${escapeHtml(arg)}」的弟子。`  // 用「」+ 句号
```

**问题**: 三种不同的引号风格（""、「」）和标点（有/无句号），用户体验不一致。

---

#### P2-04: clear 和 reset 重复 DOM 清空逻辑

**位置**: `command-handler.ts:349-350` 和 `:377-378`

同样的 `getElementById + innerHTML = ''` 写了两次。见 P1-01。

---

#### P2-05: `escapeHtml` 从 `disciple-generator` 导入

**位置**: 多处（command-handler, mud-formatter, engine-bindings 共 3 个文件导入）

```typescript
import { escapeHtml } from '../engine/disciple-generator';
```

**问题**: `escapeHtml` 是通用工具函数，却定义在 `disciple-generator`（弟子生成器）中。所有 UI 文件都依赖一个 Engine 层的弟子生成模块，仅为了用它的 HTML 转义函数。

**修复建议**: 将 `escapeHtml` 移到 `src/shared/utils/` 下。

---

#### P2-06: `formatRulingResult` 返回含 `\n` 的多行字符串

**位置**: `mud-formatter.ts:542`

```typescript
return lines.join('\n');
```

**问题**: `LogManager.addMainLog()` 是逐行添加的 API（每次 `appendChild` 一个 `<span class="mud-line">`）。`formatRulingResult` 返回的多行字符串会被当作单个 DOM 节点添加，`\n` 在 `white-space: pre-wrap` 下虽能显示，但与其他日志的单行语义不一致。

---

#### P2-07: main.ts 无用导入 + void 压制

**位置**: `main.ts:26`, `main.ts:135-136`

```typescript
import { getRealmAuraCost, getMaxSubRealm } from './shared/formulas/realm-formulas';
// ...
void getRealmAuraCost;
void getMaxSubRealm;
```

**问题**: 导入了两个函数但完全未使用，用 `void` 压制 unused 警告。这是死代码，应直接删除。

---

#### P2-08: 命令别名实现分裂

**位置**: `command-handler.ts:47-51` vs `:218`, `:238`

```typescript
// 方式一：ALIASES 映射表
const COMMAND_ALIASES: Record<string, string> = { s: 'status', j: 'judge', h: 'help' };
verb = COMMAND_ALIASES[verb] ?? verb;

// 方式二：if 条件中硬编码
if (verb === 'look' || verb === 'l') { ... }
if (verb === 'inspect' || verb === 'i') { ... }
```

**问题**: 一半别名走 ALIASES 映射表（s/j/h），另一半在 if 条件中硬编码（l/i）。`bt/breakthrough` 则在 switch case 中。三种方式并存，维护者必须检查三个地方才能了解完整别名表。

**修复建议**: 统一在 ALIASES 表中定义所有别名。

---

### P3 — 可维护性（6 项）

#### P3-01: 魔法数字散布

| 值 | 位置 | 含义 |
|----|------|------|
| `50` | command-handler:55 | 命令历史上限 |
| `200` | log-manager:15 | 主日志行数上限 |
| `5` | log-manager:16 | 系统消息条上限 |
| `25`, `20` | engine-bindings:219 | 环境呼吸延迟范围（秒） |
| `20` | mud-formatter:448-450 | ASCII 仪表盘宽度 |
| `5` | engine-bindings:49 | tick 日志采样间隔 |
| `12` | mud-formatter:361 | 仙历月份换算因子 |
| `300` | main.ts:128 | reset 延迟（ms） |
| `30000` | main.ts:125 | 自动存档间隔（ms） |

建议将游戏相关的魔法数字集中到 `src/shared/constants/` 或各文件头部具名常量。

---

#### P3-02: HTML 字符串拼接模式

`mud-formatter.ts` 全文 120+ 处 `html +=` 拼接。虽然所有用户数据都经过 `escapeHtml()`，但：
1. 难以阅读（缩进混乱，字符串中嵌套 HTML 标签和 CSS class）
2. 没有编译时 HTML 结构校验
3. 性能影响微小但存在（大量临时字符串）

当前阶段可接受，但如果面板内容继续增长，建议引入轻量模板方案。

---

#### P3-03: 面板 body 全量 innerHTML 赋值

**位置**: `panel-manager.ts:43`

```typescript
bodyEl.innerHTML = contentHtml;
```

**问题**: 每次打开面板都全量替换 innerHTML。对于 look 命令（8 弟子 × 多属性），会创建大量 DOM 节点。虽然面板不像日志那样高频更新，但如果用户频繁切换弟子查看，会产生不必要的 GC 压力。

**严重度**: 低。面板打开频率远低于日志流，当前 8 弟子规模下无实际性能问题。

---

#### P3-04: CSS 738 行单文件

`mud-theme.css` 包含：变量定义、全局重置、7 个组件布局、严重度着色、面板排版、动画关键帧。

单文件在当前规模下尚可维护，但已接近拆分阈值。建议按职责拆分为：
- `variables.css` — CSS 变量
- `layout.css` — 容器/状态栏/命令区
- `panel.css` — 面板覆盖层 + 面板内容排版
- `severity.css` — 严重度/语义色/动画

---

#### P3-05: 纯函数无单元测试

`mud-formatter.ts` 全部是纯函数（无 DOM 依赖，输入 GameState → 输出 HTML 字符串），非常适合单元测试，但目前零覆盖。

`matchDisciple()` 的边界行为（空字符串、前缀冲突）、`labelFromTable()` 的阈值边界、`formatSeverityLog()` 的严重度映射都应有测试保障。

---

#### P3-06: `setOnTick` 被注册两次

**位置**: `engine-bindings.ts:47`（路由 R-01）和 `main.ts:70`（状态栏刷新）

```typescript
// engine-bindings.ts
engine.setOnTick(() => { tickCounter++; ... });

// main.ts
engine.setOnTick(() => updateDisplay());
```

**问题**: 如果 `setOnTick` 是 set 语义（覆盖），则第二次调用会覆盖第一次，R-01 路由失效。如果是 add 语义（追加），则无问题但命名误导。

**需确认**: `IdleEngine.setOnTick()` 的实际语义。如果是覆盖语义，这是一个**运行时 bug**，R-01（修炼灵气 tick 日志）将不会触发。

---

## 三、按优先级排列的修复建议

### 第一优先级（类型安全 + 运行时风险）

| # | 问题 | 工作量 | 影响 |
|---|------|:------:|------|
| 1 | P0-01/02: 消除 3 处 `as any`，补全接口 | S | 编译安全 |
| 2 | P3-06: 确认 `setOnTick` 语义，可能是运行时 bug | S | 功能正确性 |
| 3 | P1-04: engine-bindings 不应写 GameState | M | 架构合规 |

### 第二优先级（架构治理）

| # | 问题 | 工作量 | 影响 |
|---|------|:------:|------|
| 4 | P1-01: command-handler DOM 访问→logManager | S | 解耦 |
| 5 | P1-02: localStorage 魔法字符串→注入 | S | 解耦 |
| 6 | P1-03: status 格式化→mud-formatter | M | 职责统一 |
| 7 | P1-05: AI 连接逻辑去重 | S | DRY |
| 8 | P2-08: 命令别名统一 | S | 一致性 |

### 第三优先级（代码质量）

| # | 问题 | 工作量 | 影响 |
|---|------|:------:|------|
| 9 | P2-01: 模块状态→闭包 | M | 可测试性 |
| 10 | P2-02: 环境呼吸定时器清理 | S | 资源泄漏 |
| 11 | P2-05: escapeHtml 迁移到 shared | S | 导入合理性 |
| 12 | P2-07: 删除无用导入 | XS | 死代码 |
| 13 | P2-03: 统一弟子未找到消息 | XS | UX 一致性 |

### 第四优先级（可维护性，可后续批次处理）

| # | 问题 | 工作量 | 影响 |
|---|------|:------:|------|
| 14 | P3-01: 魔法数字具名化 | S | 可读性 |
| 15 | P3-04: CSS 拆分 | M | 可维护性 |
| 16 | P3-05: mud-formatter 单元测试 | M | 质量保障 |

---

## 四、亮点

客观记录做得好的方面，作为后续开发标杆：

1. **log-manager.ts** — BUG-Xγ-01 的增量 DOM 修复方案优雅（appendChild + FIFO removeChild），性能从 O(n) 降到 O(1)
2. **panel-manager.ts** — 接口设计简洁，ESC/overlay/close 三路关闭统一处理
3. **mud-formatter.ts** — 全部纯函数，零副作用，`escapeHtml` 覆盖率 100%（无 XSS 风险）
4. **依赖注入模式** — `CommandContext` 避免全局变量，方向正确
5. **CSS 变量体系** — 12+ 色彩变量 + `mud-` 前缀统一，主题化基础扎实
6. **事件委托** — main.ts 中弟子名点击使用 `closest('[data-disciple-id]')` 单监听器模式

---

## 五、结论

Phase X 的模块拆分方向和信息架构设计都很好，但代码执行层面存在明显的质量落差：

- **好的模块**（log-manager, panel-manager）遵循了闭包封装 + 接口注入模式
- **差的模块**（command-handler）混合了 DOM 直操、全局变量、重复逻辑、类型逃逸

建议以 log-manager 的代码风格为标杆，对 command-handler 和 main.ts 做一轮重构。
预估工作量：第一 + 第二优先级合计约 2-3 小时，建议在下一个 Phase 前完成。
