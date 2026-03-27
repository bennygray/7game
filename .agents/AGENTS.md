# 7game-lite — AI 助手全局执行规范

> **此文件是所有 AI 助手在本项目中的行为准则。** 每次新会话自动生效。
> **版本**: v1.0 | **更新日期**: 2026-03-27
> **项目定位**: 从 7waygame 衍生的最简验证版。核心玩法：文字 MUD + AI 灵智弟子经营模拟。

---

## 一、会话启动协议（Session Bootstrap）

### 1.1 何时需要执行启动协议

| 任务规模 | 是否需要 Bootstrap | 说明 |
|---------|:---:|------|
| 代码变更 / 需求变更 / 项目规划 | ✅ 必须 | 先读文档再动手 |
| 简单问答（技术概念、语法等） | ❌ 跳过 | 直接回答 |
| Bug 修复 / 代码审查 | ✅ 必须 | 需要了解当前进度 |

### 1.2 启动协议步骤

```
1. docs/features/7game-lite-analysis.md   ← SGPA 分析进度（临时 handoff）
2. docs/design/specs/7game-lite-user-stories-phaseA.md ← 当前 Phase 的 User Stories
3. 根据任务类型，按需阅读对应文档（见下方 §二）
```

> [!NOTE]
> 本项目尚处于 SGPA 分析阶段。当 SGPA Step 10 交付后，将创建正式的
> `docs/project/handoff.md` 和 `docs/project/task-tracker.md`，届时启动协议
> 将更新为优先读取这两个文件。

> [!CAUTION]
> **禁止**未读分析进度文件就开始编码或规划。
> **禁止**凭空猜测项目进度。

---

## 二、任务类型路由

| 任务类型 | 必读文档 |
|----------|---------|
| 编码实现 | 分析进度 → User Stories → 对应 `design/specs/` 文件 |
| 需求变更 | 分析进度 → 涉及的 specs 文件 |
| 架构决策 | 分析进度 → `docs/technical/architecture.md` |
| Bug 修复 | 分析进度 → 对应代码文件 |

---

## 三、代码开发约束

### 3.1 性能红线

#### 前端（浏览器 Tab）

| 指标 | 上限 | 说明 |
|------|------|------|
| CPU 占用（挂机） | ≤ 3% | 引擎 tick 不得占用主线程 |
| 内存占用 | ≤ 200MB | V8 heap，含 DOM + GameState |
| 首屏加载 | < 3 秒 | Vite dev / 生产构建 |
| localStorage 存档 | ≤ 5MB | 单个存档序列化后体积 |
| MUD 日志行数上限 | ≤ 200 行 | 超出自动裁剪最早日志 |

#### 后端（Node.js AI 推理服务）

| 指标 | 上限 | 说明 |
|------|------|------|
| CPU 占用（空闲） | ≤ 5% | 模型待机状态 |
| 内存占用 | ≤ 1GB | 含 Qwen 0.8B GGUF 模型（~800MB） |
| AI 推理延迟 | P95 ≤ 5,000ms | 单次弟子台词生成 |
| 并发推理 | ≤ 1 | 串行队列，禁止并发推理 |

### 3.2 代码规范

- **TypeScript strict 模式**，禁止 `any`（可用 `unknown` + 类型守卫）
- 优先使用 `interface` 而非 `type`（除非需要联合类型）
- 所有导出的函数/类必须有 JSDoc 注释
- **台词和 UI 文案使用中文**，代码注释和变量名使用英文
- **Git 提交** → 遵循 `.agents/workflows/git-workflow.md`
- **文档和代码分开提交**：`docs:` 和 `feat:` 不混在同一个 commit

### 3.3 模块边界（禁止越界）

```
src/shared/    → 类型定义 + 公式 + 数据表（所有层的只读依赖）
src/engine/    → 游戏引擎逻辑（tick / 行为树 / MUD 日志）
src/ai/        → AI 适配层（LLMAdapter / prompt 构建 / 上下文管理）
src/ui/        → DOM 组件（MUD 面板 / 命令输入 / 状态 HUD）
server/        → Node.js 后端（AI 推理端点 + 模型管理）
```

> **禁止**在 `src/ui/` 中直接修改 `GameState`（通过 Engine 层的 Action/事件）。
> **禁止**在 `src/ui/` 中直接调用 `server/` API（通过 `src/ai/llm-adapter.ts`）。
> **公式只能写在 `src/shared/formulas/`**，禁止在 Engine 或 UI 层重复实现。

#### 前端 ↔ 后端通信约束

| 规则 | 说明 |
|------|------|
| **接口隔离** | 前端通过 `LLMAdapter` 接口调用后端，UI 层不得直接 `fetch` |
| **端点限制** | 后端仅暴露 `/api/infer` 端点，禁止暴露 GameState 操作端点 |
| **CORS** | 后端仅接受 `localhost` 来源请求 |
| **请求超时** | 前端 fetch 超时 = 10 秒，超时后 fallback 到模板台词 |

### 3.4 安全约束

| 规则 | 当前状态 | 未来演进 |
|------|---------|---------|
| GameState 可见性 | ✅ **接受暴露**（浏览器 DevTools 可查看） | Electron 版可关闭 DevTools |
| 存档保护 | ✅ **无加密**（localStorage 明文存储） | V2 IndexedDB + 签名校验 |
| AI 后端认证 | ✅ **无认证**，仅绑定 `localhost:3001` | Electron 版内嵌后端，无网络暴露 |
| 游戏数值权威 | ✅ **客户端本地计算**（纯单机，无服务端对账） | — |

> [!NOTE]
> 7game-lite V1 是纯本地单机版，客户端就是权威。安全约束以"防无意泄露"为主，
> 不追求防作弊。Electron 移植后自然收窄攻击面。

### 3.5 版本边界

本项目为**单版本验证项目**，范围明确：

| ✅ IN（lite 范围内） | 🚫 OUT（lite 范围外） |
|:---|:---|
| 修炼引擎（炼气 1 → 筑基圆满） | 金丹及以上境界 |
| 弟子行为树（4 人 × 7 态） | 弟子招募 / 扩展至 8~12 人 |
| AI 灵智台词 + 目标生成 | 社交事件 / 夺舍 / 危机 |
| MUD 文字面板 + 命令输入 | 图形渲染 / PixiJS / Canvas |
| 灵田（2 格）+ 炼丹（3 丹方） | 废丹回收 / 丹毒 / 宅邸灵气 |
| 天劫（炼气 → 筑基，3 道雷） | 结丹天劫及以上 |
| 悬赏（D~B 级） | 薪俸 / 忠诚度系统 |
| localStorage 存档 | 云存档 / 多设备同步 |
| 纯 Web 运行 | Electron 壳（Phase C 迁移） |

> 如果不确定某功能是否属于 lite 范围，以本表为准。
> **禁止**实现 OUT 列中的任何功能的实际代码（可保留空目录作为结构预留）。

### 3.6 Git 分支策略

```
main        → 稳定发布版
dev         → 开发主线
feature/*   → 功能分支 (如 feature/mud-panel)
fix/*       → 修复分支
```

### 3.7 数值验证脚本规范（硬性约束）

> [!CAUTION]
> **凡是涉及游戏数值公式的代码变更，必须同步产出可运行的验证脚本。
> 没有验证脚本的数值代码不允许合并。**

| 规则 | 说明 |
|------|------|
| **脚本位置** | `scripts/` 目录下 |
| **脚本命名** | `lite-{系统名}-sim.ts` 或 `lite-{系统名}-verify.ts` |
| **覆盖范围** | `src/shared/formulas/` 下的每个公式文件至少有一个对应验证脚本 |
| **输出要求** | 必须输出可读的验证结果（表格 / 曲线），不能仅返回 pass/fail |
| **蒙特卡罗** | 涉及概率的公式必须跑 ≥ 1,000 次模拟 |
| **回归验证** | 修改已有公式时，必须先运行既有验证脚本确认无回归 |

---

## 四、文档更新联动规则

### 🚨 编码前置条件（硬约束）

> [!CAUTION]
> **任何涉及代码编写或修改的行为，必须先完成以下步骤：**

```
步骤 1：更新文档   → 更新对应的设计文档或 User Story 文件
步骤 2：用户确认   → 获得用户明确确认
步骤 3：编写代码   → 按照已更新的文档进行编码
步骤 4：完成联动   → 更新 7game-lite-analysis.md 进度
```

> 唯一例外：紧急热修复可先修复后补文档，但必须在同一会话内完成文档补齐。

### ✅ 完成任务时的检查清单

1. 在 `docs/features/7game-lite-analysis.md` 中更新对应 Step 状态
2. 如涉及新文件，在项目根目录 `README.md` 中同步
3. 如完成了 User Story，在 Story 文件中标记 ✅

---

## 五、项目结构（黄金路径）

```
d:\7game\
├── .agents/                        ← AI 助手规范
│   ├── AGENTS.md                   ← 你正在读的文件
│   ├── workflows/                  ← 工作流（Git 等）
│   └── skills/                     ← 技能扩展（SGPA 等）
├── src/                            ← 前端（Vite SPA）
│   ├── shared/                     ← 跨层共享
│   │   ├── types/                  ← LiteGameState + AISoulContext
│   │   ├── formulas/               ← 数值公式（复用自 7waygame）
│   │   └── data/                   ← 配置表（境界 / 丹方 / 种子 / 弟子池）
│   ├── engine/                     ← 游戏引擎
│   │   ├── idle-engine.ts          ← 核心 Tick 循环
│   │   ├── disciple-engine.ts      ← 弟子行为驱动
│   │   ├── disciple-behavior.ts    ← 行为树权重决策
│   │   ├── mud-log-engine.ts       ← MUD 文字流生成
│   │   └── save-manager.ts         ← localStorage 存档
│   ├── ai/                         ← AI 适配层
│   │   ├── llm-adapter.ts          ← LLMAdapter 接口（HTTP / 未来 IPC）
│   │   ├── prompt-builder.ts       ← 上下文拼装
│   │   └── prompts/                ← Prompt 模板（版本化管理）
│   ├── ui/                         ← DOM 组件
│   │   ├── MudPanel.ts             ← MUD 滚动面板
│   │   └── CommandInput.ts         ← 命令输入框
│   └── main.ts                     ← 应用入口
├── server/                         ← AI 推理后端
│   └── index.ts                    ← Express + node-llama-cpp
├── scripts/                        ← 数值验证脚本
├── docs/                           ← 文档
│   ├── features/                   ← SGPA 分析进度
│   └── design/specs/               ← User Stories + 设计文档
├── index.html                      ← Vite 入口
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 六、产品方向备忘

> [!IMPORTANT]
> **7game-lite 的核心假设：「纯文字 MUD + AI 灵智弟子」能否独立构成核心乐趣。**
>
> 关键决策：
> - 纯 Web（浏览器），后期移植 Electron
> - AI 灵智为首发核心（非后期接入）
> - 骨架集 6 系统：修炼 + 弟子 + MUD + 灵田 + 炼丹 + 天劫
> - 止步筑基圆满（验证范围最小化）
> - 弟子固定 4 人，AI 事件驱动推理
>
> **AI 助手在做任何决策时，必须以「验证核心乐趣」为最高优先级，
> 拒绝任何增加范围的诱惑。**

---

## 七、AI 层专项约束（lite 独有）

> [!IMPORTANT]
> 7game-lite 以 AI 为首发核心，以下约束确保 AI 层可控、可测试、可迁移。

| 规则 | 说明 |
|------|------|
| **模型规格** | Qwen3.5-0.8B（GGUF Q4_K_M 量化），node-llama-cpp 运行 |
| **推理预算** | 每次推理输出 ≤ 256 tokens，prompt ≤ 512 tokens |
| **上下文管理** | `AISoulContext.shortTermMemory` FIFO 上限 10 条 |
| **Fallback 策略** | 后端不可用时 fallback 到预设模板台词，**不阻塞引擎 tick** |
| **Prompt 版本化** | 所有 prompt 模板存储在 `src/ai/prompts/`，**禁止硬编码字符串** |
| **推理触发** | 事件驱动（弟子行为变更时），**禁止定时轮询** |
| **推理队列** | 串行处理，同一时刻最多 1 个推理请求在飞 |
| **超时处理** | 前端 10 秒未收到响应 → 使用 fallback 台词 → 记录错误日志 |

### Prompt 模板管理规范

```
src/ai/prompts/
├── disciple-speech.md        ← 弟子行为变更时的台词生成 prompt
├── disciple-goal.md          ← 弟子目标生成 prompt
└── system-context.md         ← 系统级上下文模板（角色设定）
```

- 每个 prompt 文件头部标注版本号和最后更新日期
- 修改 prompt 必须通过 Git 提交，禁止运行时动态修改
- 新增 prompt 模板前必须与 USER 确认

---

## 八、跨项目复用约束

| 规则 | 说明 |
|------|------|
| **复用方式** | 从 7waygame **复制**代码文件到 7game，**不做** npm link / monorepo |
| **修改原则** | 复制后可精简（删字段 / 删功能），**禁止添加** 7waygame 不存在的数值公式 |
| **数值一致性** | lite 的公式必须与 7waygame `shared/formulas/` 数值完全一致 |
| **Bug 回馈** | 如 lite 发现来自 7waygame 的公式 bug，应在两个项目同步修复 |
| **命名空间** | 复用的文件保持原文件名，新增的文件加 `lite-` 前缀（如 `lite-save-manager.ts`） |

### 复用文件清单

| 来源文件（7waygame） | 目标文件（7game） | 操作 |
|---------------------|------------------|------|
| `shared/formulas/idle-formulas.ts` | `src/shared/formulas/idle-formulas.ts` | 复制，删除离线推演函数 |
| `shared/formulas/realm-formulas.ts` | `src/shared/formulas/realm-formulas.ts` | 复制，保留炼气+筑基 |
| `shared/formulas/alchemy-formulas.ts` | `src/shared/formulas/alchemy-formulas.ts` | 复制，保留 3 丹方 |
| `shared/formulas/field-formulas.ts` | `src/shared/formulas/field-formulas.ts` | 原样复制 |
| `shared/formulas/tribulation-formulas.ts` | `src/shared/formulas/tribulation-formulas.ts` | 复制，仅保留炼气→筑基 |
| `shared/data/realm-table.ts` | `src/shared/data/realm-table.ts` | 复制，截止筑基圆满 |
| `shared/data/recipe-table.ts` | `src/shared/data/recipe-table.ts` | 复制，仅 3 丹方 |
| `shared/data/seed-table.ts` | `src/shared/data/seed-table.ts` | 原样复制 |
| `shared/data/disciple-pool.ts` | `src/shared/data/disciple-pool.ts` | 复制，删除忠诚度相关 |
| `game/src/disciple-behavior.ts` | `src/engine/disciple-behavior.ts` | 复制，精简行为权重 |
| `game/src/disciple-engine.ts` | `src/engine/disciple-engine.ts` | 复制，删除薪俸逻辑 |
| `game/src/idle-engine.ts` | `src/engine/idle-engine.ts` | 复制，大幅精简 |
| `game/src/mud-log-engine.ts` | `src/engine/mud-log-engine.ts` | 复制，精简模板 |

---

## 九、禁止事项

1. ❌ **禁止**未读分析进度文件就开始编码或规划工作
2. ❌ **禁止**在一个 commit 中混合文档更新和代码变更
3. ❌ **禁止**实现版本边界 OUT 列中的任何功能（§3.5）
4. ❌ **禁止**在 `src/ui/` 中直接调用 AI 后端 API（必须通过 `LLMAdapter`）
5. ❌ **禁止**在 `src/ui/` 中直接修改 `GameState`（通过 Engine 层）
6. ❌ **禁止**在 Engine 或 UI 层重复实现 `src/shared/formulas/` 的公式
7. ❌ **禁止**AI 后端暴露除 `/api/infer` 以外的端点
8. ❌ **禁止**在代码中硬编码 AI prompt 字符串（必须版本化管理在 `src/ai/prompts/`）
9. ❌ **禁止**在 AI 推理中传入完整 GameState（只传必要上下文，控制 token 预算）
10. ❌ **禁止**添加 7waygame 公式库中不存在的数值公式（数值一致性）
11. ❌ **禁止**提交涉及数值公式的代码变更而不附带验证脚本（§3.7）
12. ❌ **禁止**未更新对应文档并获得用户确认就开始编码（§四）
